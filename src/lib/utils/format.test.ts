import { describe, expect, it } from "vitest";
import { formatCurrency, formatPercent } from "./format";

describe("format utils", () => {
  it("formats BRL currency", () => {
    expect(formatCurrency(1500)).toContain("1.500");
  });

  it("formats percent values", () => {
    expect(formatPercent(18.4)).toContain("18");
  });
});
