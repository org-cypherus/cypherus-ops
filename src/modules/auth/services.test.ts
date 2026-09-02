import { describe, expect, it } from "vitest";
import { shouldTryPlatformLogin } from "./services";

describe("shouldTryPlatformLogin", () => {
  it("falls back only on 401 that is not ACCOUNT_LOCKED", () => {
    expect(
      shouldTryPlatformLogin({
        apiError: { status: 401, code: "AUTHENTICATION_FAILED", message: "Credenciais inválidas." },
      }),
    ).toBe(true);
    expect(
      shouldTryPlatformLogin({
        apiError: { status: 401, code: "ACCOUNT_LOCKED", message: "Conta bloqueada." },
      }),
    ).toBe(false);
    expect(
      shouldTryPlatformLogin({
        apiError: { status: 403, code: "PERMISSION_DENIED", message: "Negado." },
      }),
    ).toBe(false);
    expect(
      shouldTryPlatformLogin({
        apiError: { status: 500, code: "UNKNOWN", message: "Falha." },
      }),
    ).toBe(false);
  });
});
