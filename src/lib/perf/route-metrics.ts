import type { Query } from "@tanstack/react-query";

export type PrimaryQueryTarget = {
  /** Rótulo curto na UI / console */
  label: string;
  match: (queryKey: readonly unknown[]) => boolean;
};

/** Query principal da rota — o que o paint sozinho não captura. */
export function primaryQueryForPath(pathname: string): PrimaryQueryTarget | null {
  if (pathname === "/leads") {
    return {
      label: "kanban/lista",
      match: (key) => key[0] === "kanban" || (key[0] === "leads" && key[1] === "list"),
    };
  }

  const leadDetail = /^\/leads\/([^/]+)$/.exec(pathname);
  if (leadDetail) {
    const id = leadDetail[1];
    return {
      label: "lead",
      match: (key) => key[0] === "leads" && key[1] === "detail" && key[2] === id,
    };
  }

  if (pathname === "/contracts") {
    return {
      label: "contracts",
      match: (key) => key[0] === "contracts" && key[1] === "list",
    };
  }

  if (pathname === "/contracts/templates") {
    return {
      label: "templates",
      match: (key) => key[0] === "contracts" && key[1] === "templates",
    };
  }

  if (pathname === "/contracts/new") {
    return {
      label: "templates",
      match: (key) => key[0] === "contracts" && key[1] === "templates",
    };
  }

  const contractDetail = /^\/contracts\/([^/]+)$/.exec(pathname);
  if (contractDetail) {
    const id = contractDetail[1];
    return {
      label: "contract",
      match: (key) => key[0] === "contracts" && key[1] === "detail" && key[2] === id,
    };
  }

  if (pathname === "/dashboard") {
    return {
      label: "dashboard",
      match: (key) => key[0] === "dashboard" && key[1] === "me",
    };
  }

  if (pathname === "/dashboard/admin") {
    return {
      label: "dashboard-admin",
      match: (key) => key[0] === "dashboard" && key[1] === "admin",
    };
  }

  if (pathname === "/financial") {
    return {
      label: "payments",
      match: (key) => key[0] === "payments" && key[1] === "list",
    };
  }

  return null;
}

export function queryMatchesPrimary(query: Query, target: PrimaryQueryTarget) {
  return target.match(query.queryKey);
}

export function formatLoadMs(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** Último responseEnd de resources iniciados após t0 (Performance API). */
export function resourcesElapsedMs(t0: number): number | null {
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") {
    return null;
  }
  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  let maxEnd = 0;
  for (const entry of entries) {
    if (entry.startTime < t0) continue;
    const end = entry.responseEnd || entry.startTime + entry.duration;
    if (end > maxEnd) maxEnd = end;
  }
  if (maxEnd <= 0) return null;
  return Math.round(maxEnd - t0);
}

export type RouteLoadSnapshot = {
  pathname: string;
  paintMs: number | null;
  sessionMs: number | null;
  primaryMs: number | null;
  primaryLabel: string | null;
  /** Tempo até sessão + query principal + fila de fetch/resources quieta. */
  totalMs: number | null;
  /** Último resource (rede) observado após a navegação. */
  resourcesMs: number | null;
};

export function reportRouteLoad(snapshot: RouteLoadSnapshot) {
  const { pathname, paintMs, sessionMs, primaryMs, primaryLabel, totalMs, resourcesMs } = snapshot;
  if (paintMs == null && sessionMs == null && primaryMs == null && totalMs == null) return;

  if (process.env.NODE_ENV === "development") {
    console.info("[perf]", pathname, {
      total_ms: totalMs,
      resources_ms: resourcesMs,
      paint_ms: paintMs,
      session_ms: sessionMs,
      primary_ms: primaryMs,
      primary: primaryLabel,
    });
  }
}
