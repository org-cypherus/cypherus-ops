import { NextRequest, NextResponse } from "next/server";
import { isGatewayUpstreamTimeout, parseApiError } from "@/lib/api/errors";
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

export const dynamic = "force-dynamic";

const PUBLIC_CRM_PREFIXES = [
  "v1/auth/login",
  "v1/auth/refresh",
  "v1/auth/logout",
  "v1/auth/invitations/accept",
  "v1/auth/password-reset",
  "v1/auth/email-verification",
  "v1/health/",
  "v1/plans",
  "v1/features",
  "v1/permissions",
];

const TOKEN_RESPONSE_PATHS = new Set([
  "v1/auth/login",
  "v1/auth/refresh",
  "v1/auth/invitations/accept",
]);

function joinPath(parts: string[] | undefined) {
  return (parts ?? []).join("/");
}

function isPublicCrmPath(path: string, method: string) {
  if (path === "v1/companies" && method === "POST") return true;
  return PUBLIC_CRM_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

function needsUpstreamAuth(path: string, method: string) {
  return !isPublicCrmPath(path, method);
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

async function proxy(request: NextRequest, path: string) {
  const config = gatewayConfig();
  if (!config.url) {
    return NextResponse.json(
      { error: { code: "GATEWAY_NOT_CONFIGURED", message: "GATEWAY_URL não configurado." } },
      { status: 503 },
    );
  }

  let gatewayToken: string;
  try {
    gatewayToken = await getGatewayAccessToken();
  } catch (error) {
    if (error instanceof GatewayConfigError) {
      return NextResponse.json(
        { error: { code: "GATEWAY_NOT_CONFIGURED", message: error.message } },
        { status: 503 },
      );
    }
    if (error instanceof GatewayRequestError) {
      return NextResponse.json(
        { error: { code: "GATEWAY_TOKEN_FAILED", message: error.message } },
        { status: error.status },
      );
    }
    throw error;
  }

  const crm = await readCrmTokens();
  const search = request.nextUrl.search;
  const upstreamUrl = `${config.url}/api/${path}${search}`;
  const requestId = request.headers.get("x-request-id") || newRequestId();
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
        return NextResponse.json(
          { error: { code: "AUTHENTICATION_FAILED", message: "Refresh token ausente." } },
          { status: 401 },
        );
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
    throw new GatewayRequestError(502, describeGatewayFetchError(error, upstreamUrl), null);
  }

  if (!upstream.ok && shouldRetryAfterGatewayTimeout(request.method, path)) {
    const timeoutBody = decodeErrorBody(await upstream.clone().arrayBuffer());
    if (isGatewayUpstreamTimeout(parseApiError(upstream.status, timeoutBody))) {
      await sleep(GATEWAY_UPSTREAM_RETRY_DELAY_MS);
      try {
        upstream = await gatewayFetch(upstreamUrl, {
          method: request.method,
          headers,
          body: copyRequestBody(body),
          redirect: "manual",
        });
      } catch (error) {
        throw new GatewayRequestError(502, describeGatewayFetchError(error, upstreamUrl), null);
      }
    }
  }

  if (path === "v1/auth/logout") {
    await clearAuthCookies();
    return new NextResponse(null, { status: upstream.status === 204 ? 204 : upstream.status });
  }

  const responseHeaders = new Headers();
  const passHeaders = ["content-type", "content-disposition", "x-request-id"];
  for (const name of passHeaders) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  if (!responseHeaders.has("x-request-id")) responseHeaders.set("x-request-id", requestId);

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
  return new NextResponse(buffer, { status: upstream.status, headers: responseHeaders });
}

async function handle(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path } = await context.params;
  const joined = joinPath(path);
  if (!joined) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Rota BFF inválida." } },
      { status: 404 },
    );
  }
  try {
    return await proxy(request, joined);
  } catch (error) {
    if (error instanceof GatewayRequestError) {
      return NextResponse.json(
        { error: { code: "BFF_PROXY_ERROR", message: error.message } },
        { status: error.status },
      );
    }
    const config = gatewayConfig();
    const message = describeGatewayFetchError(error, config.url || "GATEWAY_URL");
    return NextResponse.json(
      { error: { code: "BFF_PROXY_ERROR", message } },
      { status: 502 },
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
