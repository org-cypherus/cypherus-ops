export type ApiErrorBody = {
  error?:
    | string
    | {
        code?: string;
        message?: string;
        details?: unknown;
      };
  request_id?: string;
  statusCode?: number;
  message?: string;
};

export type ParsedApiError = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
};

export function parseApiError(status: number, body: unknown): ParsedApiError {
  const payload = (body ?? {}) as ApiErrorBody;
  const nested = typeof payload.error === "object" ? payload.error : undefined;
  const code =
    (typeof payload.error === "string" ? payload.error : nested?.code) ||
    (status === 401 ? "AUTHENTICATION_FAILED" : "UNKNOWN");
  const message = nested?.message || payload.message || defaultMessageForStatus(status);
  return {
    status,
    code,
    message,
    details: nested?.details,
    requestId: payload.request_id,
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
