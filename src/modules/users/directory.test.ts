import { describe, expect, it } from "vitest";
import { activeOnlyDirectory, isInactiveUserStatus } from "./directory";

describe("inactive directory helpers", () => {
  it("treats INACTIVE as inactive regardless of case", () => {
    expect(isInactiveUserStatus("INACTIVE")).toBe(true);
    expect(isInactiveUserStatus("inactive")).toBe(true);
    expect(isInactiveUserStatus("ACTIVE")).toBe(false);
  });

  it("keeps only active users for owner selects", () => {
    expect(
      activeOnlyDirectory([
        { id: "a", name: "Ana", status: "ACTIVE" },
        { id: "b", name: "Bruno", status: "INACTIVE" },
      ]).map((user) => user.id),
    ).toEqual(["a"]);
  });
});
