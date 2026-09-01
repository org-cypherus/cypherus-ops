import { describe, expect, it } from "vitest";
import { formatLoadMs, primaryQueryForPath, resourcesElapsedMs } from "./route-metrics";

describe("primaryQueryForPath", () => {
  it("maps leads hub to kanban or list", () => {
    const target = primaryQueryForPath("/leads");
    expect(target?.label).toBe("kanban/lista");
    expect(target?.match(["kanban"])).toBe(true);
    expect(target?.match(["leads", "list", {}])).toBe(true);
    expect(target?.match(["leads", "detail", "x"])).toBe(false);
  });

  it("maps lead detail", () => {
    const target = primaryQueryForPath("/leads/abc");
    expect(target?.label).toBe("lead");
    expect(target?.match(["leads", "detail", "abc"])).toBe(true);
    expect(target?.match(["leads", "detail", "other"])).toBe(false);
  });

  it("maps contracts list and detail", () => {
    expect(primaryQueryForPath("/contracts")?.match(["contracts", "list", undefined])).toBe(true);
    expect(primaryQueryForPath("/contracts/c1")?.match(["contracts", "detail", "c1"])).toBe(true);
  });

  it("returns null for unknown routes", () => {
    expect(primaryQueryForPath("/admin/users")).toBeNull();
  });
});

describe("formatLoadMs", () => {
  it("formats ms and seconds", () => {
    expect(formatLoadMs(420)).toBe("420 ms");
    expect(formatLoadMs(1500)).toBe("1.50 s");
  });
});

describe("resourcesElapsedMs", () => {
  it("returns null when there are no matching resources", () => {
    expect(resourcesElapsedMs(performance.now() + 10_000)).toBeNull();
  });
});
