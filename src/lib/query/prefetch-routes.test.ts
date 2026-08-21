import { describe, expect, it, vi } from "vitest";
import { prefetchNavHref } from "./prefetch-routes";

describe("prefetchNavHref", () => {
  it("prefetches known nav targets and no-ops unknown ones", async () => {
    const prefetchQuery = vi.fn().mockResolvedValue(undefined);
    const queryClient = { prefetchQuery } as never;

    await prefetchNavHref(queryClient, "/leads");
    expect(prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["kanban"] }),
    );

    prefetchQuery.mockClear();
    await prefetchNavHref(queryClient, "/contracts");
    expect(prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["contracts", "list", undefined] }),
    );

    prefetchQuery.mockClear();
    await prefetchNavHref(queryClient, "/admin");
    expect(prefetchQuery).not.toHaveBeenCalled();
  });
});
