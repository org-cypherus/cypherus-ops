import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "./concurrency";

describe("mapWithConcurrency", () => {
  it("keeps order with a concurrency cap", async () => {
    const inFlight: number[] = [];
    let peak = 0;
    const result = await mapWithConcurrency([1, 2, 3, 4], 2, async (item) => {
      inFlight.push(item);
      peak = Math.max(peak, inFlight.length);
      await Promise.resolve();
      inFlight.splice(inFlight.indexOf(item), 1);
      return item * 10;
    });
    expect(result).toEqual([10, 20, 30, 40]);
    expect(peak).toBeLessThanOrEqual(2);
  });
});
