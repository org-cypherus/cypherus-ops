import { describe, expect, it } from "vitest";
import { parseApiError, featureKeyFromError, fieldFromError, isGatewayUpstreamTimeout, isPermissionDenied, isUserNotFound, permissionDeniedDescription } from "./errors";

describe("parseApiError", () => {
  it("reads the CRM envelope", () => {
    const parsed = parseApiError(402, {
      error: {
        code: "FEATURE_NOT_AVAILABLE",
        message: "A feature 'contracts' não está disponível.",
        details: { feature_key: "contracts" },
      },
      request_id: "abc",
    });
    expect(parsed.code).toBe("FEATURE_NOT_AVAILABLE");
    expect(parsed.requestId).toBe("abc");
    expect(featureKeyFromError(parsed)).toBe("contracts");
  });

  it("falls back when the body is not an envelope", () => {
    const parsed = parseApiError(401, { message: "nope" });
    expect(parsed.code).toBe("AUTHENTICATION_FAILED");
    expect(parsed.message).toBe("nope");
  });

  it("reads FastAPI detail and gateway trace headers", () => {
    const parsed = parseApiError(
      422,
      { detail: [{ loc: ["body", "document"], msg: "CNPJ já cadastrado", type: "value_error" }] },
      {
        get(name: string) {
          if (name === "x-request-id") return "req-99";
          if (name === "traceparent") return "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
          return null;
        },
      },
    );
    expect(parsed.message).toBe("CNPJ já cadastrado");
    expect(parsed.requestId).toBe("req-99");
    expect(parsed.traceId).toBe("4bf92f3577b34da6a3ce929d0e0e4736");
  });

  it("prefers body trace_id over headers", () => {
    const parsed = parseApiError(
      502,
      { error: { code: "BFF_PROXY_ERROR", message: "gateway down" }, request_id: "from-body", trace_id: "trc-body" },
      { get: (name: string) => (name === "x-request-id" ? "from-header" : null) },
    );
    expect(parsed.requestId).toBe("from-body");
    expect(parsed.traceId).toBe("trc-body");
    expect(parsed.code).toBe("BFF_PROXY_ERROR");
  });

  it("reads domain VALIDATION_ERROR with error_message and field", () => {
    const parsed = parseApiError(422, {
      error: {
        code: "VALIDATION_ERROR",
        message: "CPF inválido.",
        details: { field: "cpf" },
      },
      request_id: "bcae744c-9313-4d6c-984b-04af505e3a63",
    });
    expect(parsed.code).toBe("VALIDATION_ERROR");
    expect(parsed.message).toBe("CPF inválido.");
    expect(fieldFromError(parsed)).toBe("cpf");
  });

  it("reads logger-style error_code / error_message bodies", () => {
    const parsed = parseApiError(422, {
      error_code: "VALIDATION_ERROR",
      error_message: "CPF inválido.",
      error_details: { field: "cpf" },
    });
    expect(parsed.code).toBe("VALIDATION_ERROR");
    expect(parsed.message).toBe("CPF inválido.");
    expect(fieldFromError(parsed)).toBe("cpf");
  });

  it("reads the gateway ServiceUnavailable envelope", () => {
    const parsed = parseApiError(503, {
      error: "ServiceUnavailable",
      message: "Unable to reach upstream service",
      status_code: 503,
      request_id: "43343a9e-0ac1-4255-8a42-3d138ae7a93a",
    });
    expect(parsed.code).toBe("ServiceUnavailable");
    expect(parsed.message).toBe("Unable to reach upstream service");
    expect(parsed.requestId).toBe("43343a9e-0ac1-4255-8a42-3d138ae7a93a");
    expect(isGatewayUpstreamTimeout(parsed)).toBe(true);
  });
});

describe("permission denied helpers", () => {
  it("detects PERMISSION_DENIED and maps users.view", () => {
    const parsed = parseApiError(403, {
      error: {
        code: "PERMISSION_DENIED",
        message: "Usuário sem a permissão 'users.view'.",
        details: { permission_key: "users.view" },
      },
      request_id: "e9a6bc35-251d-46d4-8a1d-7ba436351844",
    });
    expect(isPermissionDenied(parsed)).toBe(true);
    expect(permissionDeniedDescription(parsed)).toContain("lista de usuários");
  });

  it("detects USER_NOT_FOUND", () => {
    const parsed = parseApiError(404, {
      error: {
        code: "USER_NOT_FOUND",
        message: "Usuário não encontrado.",
      },
    });
    expect(isUserNotFound(parsed)).toBe(true);
    expect(parsed.message).toBe("Usuário não encontrado.");
  });
});
