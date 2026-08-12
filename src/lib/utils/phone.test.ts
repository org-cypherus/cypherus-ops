import { describe, expect, it } from "vitest";
import { formatPhone, isValidPhone } from "./phone";

describe("formatPhone", () => {
  it("masks landline and mobile progressively", () => {
    expect(formatPhone("11")).toBe("(11");
    expect(formatPhone("119888")).toBe("(11) 9888");
    expect(formatPhone("1198888")).toBe("(11) 9888-8");
    expect(formatPhone("11988887777")).toBe("(11) 98888-7777");
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
  });
});

describe("isValidPhone", () => {
  it("accepts 10 or 11 digits", () => {
    expect(isValidPhone("(11) 3333-4444")).toBe(true);
    expect(isValidPhone("(11) 98888-7777")).toBe(true);
    expect(isValidPhone("119")).toBe(false);
  });
});
