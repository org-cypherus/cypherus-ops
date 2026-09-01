import { describe, expect, it } from "vitest";
import {
  formatCurrencyInput,
  formatIntegerInput,
  parseCurrencyInput,
  parseIntegerInput,
} from "./money-input";

describe("integer input", () => {
  it("strips leading zeros", () => {
    expect(parseIntegerInput("048")).toBe(48);
    expect(parseIntegerInput("000")).toBe(0);
    expect(parseIntegerInput("")).toBe(0);
    expect(formatIntegerInput(48)).toBe("48");
  });
});

describe("currency input", () => {
  it("parses digits as cents and formats pt-BR", () => {
    expect(parseCurrencyInput("4800")).toBe(48);
    expect(parseCurrencyInput("1.234,56")).toBe(1234.56);
    expect(formatCurrencyInput(1234.5)).toBe("1.234,50");
    expect(parseCurrencyInput("")).toBe(0);
  });
});
