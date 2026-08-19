import { cookies } from "next/headers";
import { createRequire } from "node:module";
import { API_REQUEST_TIMEOUT_MS } from "@/lib/api/config";

export const CRM_ACCESS_COOKIE = "cypher_crm_access";
export const CRM_REFRESH_COOKIE = "cypher_crm_refresh";
export const GW_ACCESS_COOKIE = "cypher_gw_access";

const CRM_ACCESS_MAX_AGE = 60 * 14;
const CRM_REFRESH_MAX_AGE = 60 * 60 * 24 * 14;
const GW_ACCESS_MAX_AGE = 60 * 9;

type FetchInit = RequestInit & { dispatcher?: unknown };

let gatewayDispatcher: unknown;

async function getGatewayDispatcher() {
  if (gatewayDispatcher !== undefined) return gatewayDispatcher;
  try {
    const require = createRequire(import.meta.url);
    const { Agent } = require("undici") as {
      Agent: new (options?: Record<string, unknown>) => unknown;
    };
    gatewayDispatcher = new Agent({
      connectTimeout: API_REQUEST_TIMEOUT_MS,
      headersTimeout: API_REQUEST_TIMEOUT_MS,
      bodyTimeout: API_REQUEST_TIMEOUT_MS,
      connect: { timeout: API_REQUEST_TIMEOUT_MS },
    });
  } catch {
    gatewayDispatcher = null;
  }
  return gatewayDispatcher;
}

export async function gatewayFetch(url: string, init: RequestInit = {}) {
  const dispatcher = await getGatewayDispatcher();
  const options: FetchInit = {
    ...init,
    cache: init.cache ?? "no-store",
    signal: init.signal ?? AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
  };
  if (dispatcher) options.dispatcher = dispatcher;
  return fetch(url, options);
}

export function gatewayConfig() {
  const url = (process.env.GATEWAY_URL || "").replace(/\/$/, "");
  return {
    url,
    clientId: process.env.GATEWAY_CLIENT_ID || "",
    clientSecret: process.env.GATEWAY_CLIENT_SECRET || "",
    targetService: process.env.GATEWAY_TARGET_SERVICE || "saas-crm",
  };
}

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  };
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const store = await cookies();
  store.set(CRM_ACCESS_COOKIE, accessToken, { ...cookieBase(), maxAge: CRM_ACCESS_MAX_AGE });
  store.set(CRM_REFRESH_COOKIE, refreshToken, { ...cookieBase(), maxAge: CRM_REFRESH_MAX_AGE });
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete(CRM_ACCESS_COOKIE);
  store.delete(CRM_REFRESH_COOKIE);
  store.delete(GW_ACCESS_COOKIE);
}

export async function readCrmTokens() {
  const store = await cookies();
  return {
    access: store.get(CRM_ACCESS_COOKIE)?.value ?? null,
    refresh: store.get(CRM_REFRESH_COOKIE)?.value ?? null,
  };
}

function jwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function isFresh(token: string, skewSeconds = 30) {
  const exp = jwtExp(token);
  if (!exp) return false;
  return exp * 1000 > Date.now() + skewSeconds * 1000;
}

type GatewayTokenEnvelope = {
  data?: { access_token?: string; expires_in?: number };
  access_token?: string;
};

export async function getGatewayAccessToken(): Promise<string> {
  const store = await cookies();
  const cached = store.get(GW_ACCESS_COOKIE)?.value;
  if (cached && isFresh(cached)) return cached;

  const config = gatewayConfig();
  if (!config.url || !config.clientId || !config.clientSecret) {
    throw new GatewayConfigError("Gateway não configurado (GATEWAY_URL / CLIENT_ID / CLIENT_SECRET).");
  }

  const tokenUrl = `${config.url}/api/auth/token`;
  let response: Response;
  try {
    response = await gatewayFetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        target_service: config.targetService,
      }),
    });
  } catch (error) {
    throw new GatewayRequestError(502, describeGatewayFetchError(error, tokenUrl), null);
  }

  const body = (await response.json().catch(() => ({}))) as GatewayTokenEnvelope;
  const token = body.data?.access_token || body.access_token;
  if (!response.ok || !token) {
    throw new GatewayRequestError(
      response.status || 502,
      "Não foi possível emitir o token do gateway.",
      body,
    );
  }

  store.set(GW_ACCESS_COOKIE, token, { ...cookieBase(), maxAge: GW_ACCESS_MAX_AGE });
  return token;
}

export class GatewayConfigError extends Error {
  status = 503;
}

export class GatewayRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: unknown,
  ) {
    super(message);
  }
}

export function newRequestId() {
  return crypto.randomUUID();
}

export function describeGatewayFetchError(error: unknown, url: string): string {
  const err = error instanceof Error ? error : new Error("Falha ao falar com o gateway.");
  const cause = "cause" in err ? err.cause : undefined;
  const causeCode =
    cause && typeof cause === "object" && "code" in cause ? String((cause as { code?: string }).code) : "";
  let host = url;
  try {
    host = new URL(url).host;
  } catch {
    /* keep raw url */
  }
  if (
    err.name === "TimeoutError" ||
    err.name === "AbortError" ||
    err.message.includes("aborted") ||
    causeCode === "UND_ERR_CONNECT_TIMEOUT" ||
    err.message === "fetch failed"
  ) {
    return `Timeout ao conectar em ${host} (${API_REQUEST_TIMEOUT_MS / 1000}s). Verifique VPN/firewall e a allowlist de IP do gateway.`;
  }
  return cause instanceof Error ? `${err.message}: ${cause.message}` : err.message;
}
