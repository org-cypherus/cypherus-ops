import { describe, expect, it } from "vitest";
import { isPlatformPath } from "./routes";

describe("isPlatformPath", () => {
  it("matches the platform console tree", () => {
    expect(isPlatformPath("/platform")).toBe(true);
    expect(isPlatformPath("/platform/companies/abc")).toBe(true);
    expect(isPlatformPath("/admin")).toBe(false);
    expect(isPlatformPath("/platforms")).toBe(false);
  });
});
