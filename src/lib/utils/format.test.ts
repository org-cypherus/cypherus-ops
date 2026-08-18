import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatDateTime, formatPercent } from "./format";

describe("format utils", () => {
  it("formats BRL currency", () => {
    expect(formatCurrency(1500)).toContain("1.500");
  });

  it("formats percent values", () => {
    expect(formatPercent(18.4)).toContain("18");
  });

  it("formats dates and empty values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
    expect(formatDate("2026-08-12T12:00:00.000Z")).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
