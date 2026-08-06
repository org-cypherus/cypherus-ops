import { describe, expect, it } from "vitest";
import { defaultPasswordFromName } from "./password";

describe("defaultPasswordFromName", () => {
  it("uses last surname + year", () => {
    expect(defaultPasswordFromName("Ana Souza", 2026)).toBe("Souza2026");
  });

  it("strips accents", () => {
    expect(defaultPasswordFromName("João Gonçalves", 2026)).toBe("Goncalves2026");
  });
});
