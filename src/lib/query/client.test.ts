import { describe, expect, it } from "vitest";
import { shouldRetryQuery } from "./client";

describe("shouldRetryQuery", () => {
  it("retries a network drop once and never 5xx or timeouts", () => {
    expect(shouldRetryQuery(0, { apiError: { status: 0, code: "UNKNOWN", message: "fail" } })).toBe(true);
    expect(shouldRetryQuery(0, { code: "ECONNABORTED", apiError: { status: 0, code: "UNKNOWN", message: "timeout of 90000ms exceeded" } })).toBe(
      false,
    );
    expect(shouldRetryQuery(0, { apiError: { status: 408, code: "UNKNOWN", message: "timeout" } })).toBe(false);
    expect(shouldRetryQuery(1, { apiError: { status: 0, code: "UNKNOWN", message: "fail" } })).toBe(false);
    expect(shouldRetryQuery(0, { apiError: { status: 503, code: "ServiceUnavailable", message: "gateway" } })).toBe(
      false,
    );
    expect(shouldRetryQuery(0, { apiError: { status: 502, code: "BFF_PROXY_ERROR", message: "bad gateway" } })).toBe(
      false,
    );
  });
});
