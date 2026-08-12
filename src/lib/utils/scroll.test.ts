import { describe, expect, it, vi } from "vitest";
import { scrollToHash } from "./scroll";

describe("scrollToHash", () => {
  it("returns false for empty hash", () => {
    expect(scrollToHash("#")).toBe(false);
    expect(scrollToHash("")).toBe(false);
  });

  it("scrolls to matching element with smooth behavior by default", () => {
    const target = document.createElement("section");
    target.id = "pricing";
    document.body.appendChild(target);

    const scrollIntoView = vi.fn();
    const ok = scrollToHash("#pricing", {
      root: document,
      reduceMotion: false,
      scrollIntoView,
    });

    expect(ok).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith(target, {
      behavior: "smooth",
      block: "start",
    });

    target.remove();
  });

  it("uses auto behavior when reduceMotion is true", () => {
    const target = document.createElement("section");
    target.id = "features";
    document.body.appendChild(target);

    const scrollIntoView = vi.fn();
    scrollToHash("features", {
      root: document,
      reduceMotion: true,
      scrollIntoView,
    });

    expect(scrollIntoView).toHaveBeenCalledWith(target, {
      behavior: "auto",
      block: "start",
    });

    target.remove();
  });
});
