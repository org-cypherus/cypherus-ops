import type { Query } from "@tanstack/react-query";

export type PrimaryQueryTarget = {
  /** Rótulo curto na topbar / console */
  label: string;
  match: (queryKey: readonly unknown[]) => boolean;
};

/** Query principal da rota — o que o paint da topbar sozinho não captura. */
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

  if (pathname === "/platform" || pathname.startsWith("/platform/")) {
    return {
      label: "platform",
      match: (key) => key[0] === "platform" && (key[1] === "overview" || key[1] === "companies"),
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

export type RouteLoadSnapshot = {
  pathname: string;
  paintMs: number | null;
  sessionMs: number | null;
  primaryMs: number | null;
  primaryLabel: string | null;
};

export function reportRouteLoad(snapshot: RouteLoadSnapshot) {
  const { pathname, paintMs, sessionMs, primaryMs, primaryLabel } = snapshot;
  if (paintMs == null && sessionMs == null && primaryMs == null) return;

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console -- métrica local de diagnóstico
    console.info("[perf]", pathname, {
      paint_ms: paintMs,
      session_ms: sessionMs,
      primary_ms: primaryMs,
      primary: primaryLabel,
    });
  }
}
