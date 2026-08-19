import { describe, expect, it } from "vitest";
import { parseApiError, featureKeyFromError, isGatewayUpstreamTimeout } from "./errors";

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

  it("reads the gateway ServiceUnavailable envelope", () => {
    const parsed = parseApiError(503, {
      error: "ServiceUnavailable",
      message: "Unable to reach upstream service",
      status_code: 503,
      request_id: "43343a9e-0ac1-4255-8a42-3d138ae7a93a",
    });
    expect(parsed.code).toBe("ServiceUnavailable");
    expect(parsed.message).toBe("Unable to reach upstream service");
    expect(isGatewayUpstreamTimeout(parsed)).toBe(true);
  });
});
