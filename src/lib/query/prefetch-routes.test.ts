import { describe, expect, it, vi } from "vitest";
import { Role } from "@/lib/auth/permissions";
import { prefetchNavHref, prefetchWarmQueries } from "./prefetch-routes";

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

describe("prefetchWarmQueries", () => {
  const session = {
    id: "u1",
    name: "Ana",
    email: "ana@x.com",
    role: Role.Administrador,
    permissions: ["crm:visualizar"],
    companyId: "c1",
    company: { id: "c1", name: "X", status: "active" },
    subscription: { planCode: "PROFESSIONAL", status: "active" },
    features: [],
  };

  it("skips kanban prefetch on the leads home", async () => {
    const prefetchQuery = vi.fn().mockResolvedValue(undefined);
    const queryClient = { prefetchQuery } as never;
    await prefetchWarmQueries(queryClient, session as never, { pathname: "/leads" });
    expect(prefetchQuery).not.toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["kanban"] }),
    );
  });

  it("prefetches kanban off the leads home", async () => {
    const prefetchQuery = vi.fn().mockResolvedValue(undefined);
    const queryClient = { prefetchQuery } as never;
    await prefetchWarmQueries(queryClient, session as never, { pathname: "/dashboard" });
    expect(prefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["kanban"] }),
    );
  });
});

