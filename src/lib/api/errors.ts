export type ApiErrorBody = {
  error?:
    | string
    | {
        code?: string;
        message?: string;
        details?: unknown;
        request_id?: string;
        trace_id?: string;
      };
  request_id?: string;
  requestId?: string;
  trace_id?: string;
  traceId?: string;
  detail?: unknown;
  statusCode?: number;
  status_code?: number;
  message?: string;
};

export type HeaderGetter = {
  get(name: string): unknown;
};

export type ParsedApiError = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
  traceId?: string;
  method?: string;
  path?: string;
};

export function firstNonEmpty(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function traceIdFromTraceparent(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const parts = value.trim().split("-");
  if (parts.length >= 2 && /^[0-9a-f]{32}$/i.test(parts[1])) return parts[1];
  return value.trim() || undefined;
}

function headerToString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value) && value.length > 0) return headerToString(value[0]);
  return undefined;
}

export function readHeader(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  if (typeof (headers as HeaderGetter).get === "function") {
    return headerToString((headers as HeaderGetter).get(name));
  }
  const rec = headers as Record<string, unknown>;
  return headerToString(rec[name] ?? rec[name.toLowerCase()]);
}

export function correlationFromHeaders(headers?: unknown) {
  if (!headers) return { requestId: undefined as string | undefined, traceId: undefined as string | undefined };
  return {
    requestId: firstNonEmpty(readHeader(headers, "x-request-id"), readHeader(headers, "x-correlation-id")),
    traceId: firstNonEmpty(readHeader(headers, "x-trace-id"), traceIdFromTraceparent(readHeader(headers, "traceparent"))),
  };
}

export function correlationFromBody(body: unknown) {
  const payload = (body ?? {}) as ApiErrorBody;
  const nested = typeof payload.error === "object" ? payload.error : undefined;
  return {
    requestId: firstNonEmpty(payload.request_id, payload.requestId, nested?.request_id),
    traceId: firstNonEmpty(payload.trace_id, payload.traceId, nested?.trace_id),
  };
}

function nestedError(payload: ApiErrorBody) {
  return typeof payload.error === "object" ? payload.error : undefined;
}

function messageFromBody(payload: ApiErrorBody, status: number): { message: string; details?: unknown } {
  const detail = payload.detail;
  const nested = nestedError(payload);
  if (nested?.message) {
    return { message: nested.message, details: nested.details ?? detail };
  }
  if (typeof payload.message === "string" && payload.message.trim()) {
    return { message: payload.message, details: nested?.details ?? detail };
  }
  if (typeof detail === "string" && detail.trim()) {
    return { message: detail };
  }
  if (Array.isArray(detail)) {
    const first = detail.find((item) => item && typeof item === "object" && "msg" in item) as
      | { msg?: string }
      | undefined;
    return {
      message: first?.msg || defaultMessageForStatus(status),
      details: detail,
    };
  }
  return { message: defaultMessageForStatus(status), details: nested?.details ?? detail };
}

export function parseApiError(status: number, body: unknown, headers?: unknown): ParsedApiError {
  const payload = (body ?? {}) as ApiErrorBody;
  const { message, details } = messageFromBody(payload, status);
  const fromBody = correlationFromBody(payload);
  const fromHeaders = correlationFromHeaders(headers);
  const nested = nestedError(payload);
  const code =
    (typeof payload.error === "string" ? payload.error : nested?.code) ||
    (status === 401 ? "AUTHENTICATION_FAILED" : "UNKNOWN");
  return {
    status,
    code,
    message,
    details,
    requestId: firstNonEmpty(fromBody.requestId, fromHeaders.requestId),
    traceId: firstNonEmpty(fromBody.traceId, fromHeaders.traceId),
  };
}

export function isGatewayUpstreamTimeout(error: Pick<ParsedApiError, "status" | "code" | "message">) {
  if (error.status !== 503 && error.status !== 504) return false;
  return (
    error.code === "ServiceUnavailable" ||
    /unable to reach upstream/i.test(error.message) ||
    /service unavailable/i.test(error.message)
  );
}

function defaultMessageForStatus(status: number) {
  switch (status) {
    case 401:
      return "Sessão expirada. Entre novamente.";
    case 402:
      return "Este recurso não está disponível no plano contratado.";
    case 403:
      return "Você não tem permissão para esta ação.";
    case 404:
      return "Recurso não encontrado.";
    case 409:
      return "Conflito com um registro existente.";
    case 422:
      return "Dados da requisição inválidos.";
    case 429:
      return "Limite do plano atingido.";
    default:
      return "Não foi possível concluir a operação.";
  }
}

export function featureKeyFromError(error: ParsedApiError): string | undefined {
  const details = error.details;
  if (details && typeof details === "object" && !Array.isArray(details) && "feature_key" in details) {
    const key = (details as { feature_key?: unknown }).feature_key;
    return typeof key === "string" ? key : undefined;
  }
  return undefined;
}

/** 403 HTTP ou código CRM `PERMISSION_DENIED`. */
export function isPermissionDenied(error: Pick<ParsedApiError, "status" | "code">): boolean {
  return error.status === 403 || error.code === "PERMISSION_DENIED";
}

export function permissionKeyFromError(error: ParsedApiError): string | undefined {
  const details = error.details;
  if (details && typeof details === "object" && !Array.isArray(details) && "permission_key" in details) {
    const key = (details as { permission_key?: unknown }).permission_key;
    return typeof key === "string" ? key : undefined;
  }
  return undefined;
}

const PERMISSION_KEY_LABELS: Record<string, string> = {
  "users.view": "a lista de usuários da empresa",
  "users.invite": "convidar usuários",
  "roles.view": "cargos e papéis",
  "leads.view": "os leads",
  "contracts.view": "os contratos",
  "invoices.view": "os pagamentos",
  "commissions.view": "as comissões",
  "dashboard.view": "o dashboard",
  "dashboard.advanced.view": "o dashboard administrativo",
};

/** Mensagem amigável a partir de `details.permission_key` do CRM. */
export function permissionDeniedDescription(error: ParsedApiError, fallbackResource?: string): string {
  const key = permissionKeyFromError(error);
  const resource = (key && PERMISSION_KEY_LABELS[key]) || fallbackResource || "este conteúdo";
  return `Seu perfil não tem permissão para ver ${resource}. Peça ao administrador da empresa para liberar o acesso no seu cargo.`;
}
