import { describe, expect, it } from "vitest";
import { formatCnpj, isValidCnpj, onlyDigits } from "./document";

describe("onlyDigits", () => {
  it("strips non-digits", () => {
    expect(onlyDigits("04.252.011/0001-10")).toBe("04252011000110");
  });
});

describe("formatCnpj", () => {
  it("applies progressive mask", () => {
    expect(formatCnpj("04252011000110")).toBe("04.252.011/0001-10");
    expect(formatCnpj("04")).toBe("04");
    expect(formatCnpj("04252")).toBe("04.252");
  });

  it("limits to 14 digits", () => {
    expect(onlyDigits(formatCnpj("042520110001109999")).length).toBe(14);
  });
});

describe("isValidCnpj", () => {
  it("accepts known valid CNPJ", () => {
    expect(isValidCnpj("04.252.011/0001-10")).toBe(true);
  });

  it("rejects invalid sequences", () => {
    expect(isValidCnpj("00000000000000")).toBe(false);
    expect(isValidCnpj("123")).toBe(false);
  });
});
