import { describe, expect, it } from "vitest";
import { parseApiError, featureKeyFromError } from "./errors";

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
});
