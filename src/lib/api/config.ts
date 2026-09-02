export const BFF_BASE_PATH = "/api/bff";

/** Timeout do hop gateway → CRM (`proxy_timeout_seconds`). */
export const GATEWAY_PROXY_TIMEOUT_SECONDS = 150;

/** BFF → gateway: alinhado ao timeout de upstream do gateway, para não abortar e deixar request zumbi no CRM. */
export const API_REQUEST_TIMEOUT_MS = GATEWAY_PROXY_TIMEOUT_SECONDS * 1000;

/** Browser → BFF. Não subir para esconder fila no pool do CRM. */
export const API_CLIENT_TIMEOUT_MS = 90_000;

/** Espera após 503 do gateway no POST /v1/companies (provisionamento). */
export const GATEWAY_UPSTREAM_RETRY_DELAY_MS = 8_000;

export function isMockMode() {
  return process.env.NEXT_PUBLIC_USE_MOCKS === "true";
}
