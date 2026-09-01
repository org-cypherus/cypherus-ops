import { describe, expect, it } from "vitest";
import { clampOrgZoom, fitOrgZoom, formatOrgZoom, stepOrgZoom } from "./org-zoom";

describe("clampOrgZoom", () => {
  it("keeps zoom inside 40%–200%", () => {
    expect(clampOrgZoom(0.1)).toBe(0.4);
    expect(clampOrgZoom(3)).toBe(2);
    expect(clampOrgZoom(1)).toBe(1);
    expect(clampOrgZoom(Number.NaN)).toBe(1);
  });
});

describe("stepOrgZoom", () => {
  it("steps up and down", () => {
    expect(stepOrgZoom(1, 1)).toBe(1.15);
    expect(stepOrgZoom(0.4, -1)).toBe(0.4);
  });
});

describe("fitOrgZoom", () => {
  it("shrinks wide content to the viewport and never zooms in past 100%", () => {
    expect(fitOrgZoom({ width: 400, height: 300 }, { width: 800, height: 200 })).toBe(0.44);
    expect(fitOrgZoom({ width: 800, height: 600 }, { width: 200, height: 100 })).toBe(1);
  });
});

describe("formatOrgZoom", () => {
  it("renders a percent label", () => {
    expect(formatOrgZoom(1)).toBe("100%");
    expect(formatOrgZoom(0.4)).toBe("40%");
  });
});
