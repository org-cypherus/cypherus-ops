import { NextRequest, NextResponse } from "next/server";
import {
  correlationFromBody,
  correlationFromHeaders,
  firstNonEmpty,
  isGatewayUpstreamTimeout,
  parseApiError,
} from "@/lib/api/errors";
import { GATEWAY_UPSTREAM_RETRY_DELAY_MS } from "@/lib/api/config";
import {
  clearAuthCookies,
  GatewayConfigError,
  GatewayRequestError,
  describeGatewayFetchError,
  gatewayConfig,
  getGatewayAccessToken,
  gatewayFetch,
  newRequestId,
  readCrmTokens,
  setAuthCookies,
} from "@/lib/server/gateway";
import { needsUpstreamAuth } from "@/lib/server/bff-public-path";
import { isNullBodyStatus } from "@/lib/server/null-body-status";

export const dynamic = "force-dynamic";

const TOKEN_RESPONSE_PATHS = new Set([
  "v1/auth/login",
  "v1/auth/refresh",
  "v1/auth/invitations/accept",
]);

const TRACE_PASS_HEADERS = [
  "content-type",
  "content-disposition",
  "x-request-id",
  "x-trace-id",
  "x-correlation-id",
  "traceparent",
  "tracestate",
];

function joinPath(parts: string[] | undefined) {
  return (parts ?? []).join("/");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function copyRequestBody(body: ArrayBuffer | string | undefined) {
  if (body instanceof ArrayBuffer) return body.slice(0);
  return body;
}

function shouldRetryAfterGatewayTimeout(method: string, path: string) {
  return method === "POST" && path === "v1/companies";
}

function decodeErrorBody(buffer: ArrayBuffer): unknown {
  const text = new TextDecoder().decode(buffer);
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text.slice(0, 4000);
  }
}

function bffError(
  status: number,
  code: string,
  message: string,
  ids: { requestId: string; traceId?: string },
  details?: unknown,
) {
  const headers = new Headers();
  headers.set("x-request-id", ids.requestId);
  if (ids.traceId) headers.set("x-trace-id", ids.traceId);
  return NextResponse.json(
    {
      error: { code, message, details: details ?? undefined },
      request_id: ids.requestId,
      trace_id: ids.traceId,
    },
    { status, headers },
  );
}

function idsFromUpstream(upstream: Response, fallbackRequestId: string, body?: unknown) {
  const fromHeaders = correlationFromHeaders(upstream.headers);
  const fromBody = correlationFromBody(body);
  return {
    requestId: firstNonEmpty(fromBody.requestId, fromHeaders.requestId, fallbackRequestId) ?? fallbackRequestId,
    traceId: firstNonEmpty(fromBody.traceId, fromHeaders.traceId),
  };
}

function copyUpstreamHeaders(upstream: Headers, fallbackRequestId: string) {
  const responseHeaders = new Headers();
  for (const name of TRACE_PASS_HEADERS) {
    const value = upstream.get(name);
    if (value) responseHeaders.set(name, value);
  }
  if (!responseHeaders.has("x-request-id")) responseHeaders.set("x-request-id", fallbackRequestId);
  return responseHeaders;
}

async function proxy(request: NextRequest, path: string, requestId: string) {
  const crm = await readCrmTokens();
  if (needsUpstreamAuth(path, request.method) && !crm.access) {
    return bffError(401, "AUTHENTICATION_FAILED", "Sessão ausente.", { requestId });
  }

  const config = gatewayConfig();
  if (!config.url) {
    return bffError(503, "GATEWAY_NOT_CONFIGURED", "GATEWAY_URL não configurado.", { requestId });
  }

  let gatewayToken: string;
  try {
    gatewayToken = await getGatewayAccessToken(requestId);
  } catch (error) {
    if (error instanceof GatewayConfigError) {
      return bffError(503, "GATEWAY_NOT_CONFIGURED", error.message, { requestId });
    }
    if (error instanceof GatewayRequestError) {
      const ids = {
        requestId: error.requestId || requestId,
        traceId: error.traceId,
      };
      return bffError(error.status, "GATEWAY_TOKEN_FAILED", error.message, ids, error.body);
    }
    throw error;
  }

  const search = request.nextUrl.search;
  const upstreamUrl = `${config.url}/api/${path}${search}`;
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${gatewayToken}`);
  headers.set("Accept", request.headers.get("accept") || "application/json");
  headers.set("X-Request-ID", requestId);

  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  if (needsUpstreamAuth(path, request.method) && crm.access) {
    headers.set("X-Upstream-Authorization", `Bearer ${crm.access}`);
  }

  let body: ArrayBuffer | string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    if (path === "v1/auth/refresh") {
      const incoming = await request.text();
      let refresh = crm.refresh;
      if (incoming) {
        try {
          const parsed = JSON.parse(incoming) as { refresh_token?: string };
          refresh = parsed.refresh_token || refresh;
        } catch {
          refresh = crm.refresh;
        }
      }
      if (!refresh) {
        return bffError(401, "AUTHENTICATION_FAILED", "Refresh token ausente.", { requestId });
      }
      headers.set("Content-Type", "application/json");
      body = JSON.stringify({ refresh_token: refresh });
    } else if (path === "v1/auth/logout") {
      const incoming = await request.text();
      let refresh = crm.refresh;
      if (incoming) {
        try {
          const parsed = JSON.parse(incoming) as { refresh_token?: string };
          refresh = parsed.refresh_token || refresh;
        } catch {
          refresh = crm.refresh;
        }
      }
      headers.set("Content-Type", "application/json");
      body = JSON.stringify({ refresh_token: refresh || "" });
    } else {
      body = await request.arrayBuffer();
    }
  }

  let upstream: Response;
  try {
    upstream = await gatewayFetch(upstreamUrl, {
      method: request.method,
      headers,
      body: copyRequestBody(body),
      redirect: "manual",
    });
  } catch (error) {
    throw new GatewayRequestError(
      502,
      describeGatewayFetchError(error, upstreamUrl),
      null,
      requestId,
    );
  }

  if (!upstream.ok && shouldRetryAfterGatewayTimeout(request.method, path)) {
    const timeoutBody = decodeErrorBody(await upstream.clone().arrayBuffer());
    if (isGatewayUpstreamTimeout(parseApiError(upstream.status, timeoutBody))) {
      const delayMs = GATEWAY_UPSTREAM_RETRY_DELAY_MS;
      await sleep(delayMs);
      try {
        upstream = await gatewayFetch(upstreamUrl, {
          method: request.method,
          headers,
          body: copyRequestBody(body),
          redirect: "manual",
        });
      } catch (error) {
        throw new GatewayRequestError(
          502,
          describeGatewayFetchError(error, upstreamUrl),
          null,
          requestId,
        );
      }
    }
  }

  if (path === "v1/auth/logout") {
    await clearAuthCookies();
    return new NextResponse(null, { status: upstream.status === 204 ? 204 : upstream.status });
  }

  const responseHeaders = copyUpstreamHeaders(upstream.headers, requestId);

  if (TOKEN_RESPONSE_PATHS.has(path) && upstream.ok) {
    const payload = (await upstream.json()) as {
      access_token?: string;
      refresh_token?: string;
      token_type?: string;
      expires_in?: number;
      user?: unknown;
    };
    if (payload.access_token && payload.refresh_token) {
      await setAuthCookies(payload.access_token, payload.refresh_token);
    }
    return NextResponse.json(
      {
        token_type: payload.token_type ?? "bearer",
        expires_in: payload.expires_in,
        user: payload.user,
      },
      { status: upstream.status, headers: responseHeaders },
    );
  }

  const buffer = await upstream.arrayBuffer();
  if (!upstream.ok) {
    const parsedBody = decodeErrorBody(buffer);
    const ids = idsFromUpstream(upstream, requestId, parsedBody);
    if (ids.traceId && !responseHeaders.has("x-trace-id")) {
      responseHeaders.set("x-trace-id", ids.traceId);
    }
  }
  // Fetch/NextResponse forbid any body on 204/205/304 — even an empty ArrayBuffer throws
  // TypeError, which the catch below turns into 502 while the CRM already applied the write
  // (e.g. DELETE attachment → CRM 204, UI “falha ao excluir”).
  if (isNullBodyStatus(upstream.status)) {
    responseHeaders.delete("content-type");
    return new NextResponse(null, { status: upstream.status, headers: responseHeaders });
  }
  return new NextResponse(buffer, { status: upstream.status, headers: responseHeaders });
}

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path } = await context.params;
  const joined = joinPath(path);
  const requestId = request.headers.get("x-request-id") || newRequestId();
  if (!joined) {
    return bffError(404, "NOT_FOUND", "Rota BFF inválida.", { requestId });
  }
  try {
    return await proxy(request, joined, requestId);
  } catch (error) {
    if (error instanceof GatewayRequestError) {
      const ids = {
        requestId: error.requestId || requestId,
        traceId: error.traceId,
      };
      return bffError(error.status, "BFF_PROXY_ERROR", error.message, ids, error.body);
    }
    const config = gatewayConfig();
    const message = describeGatewayFetchError(error, config.url || "GATEWAY_URL");
    return bffError(502, "BFF_PROXY_ERROR", message, { requestId });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
