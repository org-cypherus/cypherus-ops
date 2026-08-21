import { describe, expect, it } from "vitest";
import { isNullBodyStatus } from "./null-body-status";

describe("isNullBodyStatus", () => {
  it("marks 204/205/304 as null-body", () => {
    expect(isNullBodyStatus(204)).toBe(true);
    expect(isNullBodyStatus(205)).toBe(true);
    expect(isNullBodyStatus(304)).toBe(true);
    expect(isNullBodyStatus(200)).toBe(false);
    expect(isNullBodyStatus(404)).toBe(false);
  });

  it("documents why BFF must not forward empty ArrayBuffer on 204", () => {
    expect(() => new Response(new ArrayBuffer(0), { status: 204 })).toThrow(/204/);
    expect(() => new Response(null, { status: 204 })).not.toThrow();
  });
});
