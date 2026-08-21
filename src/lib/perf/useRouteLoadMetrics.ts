"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/modules/auth/hooks";
import {
  primaryQueryForPath,
  queryMatchesPrimary,
  reportRouteLoad,
  type RouteLoadSnapshot,
} from "./route-metrics";

let navSeq = 0;

type NavSample = {
  id: number;
  pathname: string;
  t0: number;
  startMark: string;
  targetLabel: string | null;
  reported: boolean;
};

/**
 * Tempo desde a troca de rota até:
 * - paint (double rAF)
 * - useSession success (hydrate real, não placeholder)
 * - query principal da página (kanban / lead / contracts / …)
 *
 * Emite `performance.measure` (`cypher:paint|session|primary`) e `console.info("[perf]", …)` em dev.
 */
export function useRouteLoadMetrics(): RouteLoadSnapshot {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const session = useSession();
  const navRef = useRef<NavSample | null>(null);
  const [snapshot, setSnapshot] = useState<RouteLoadSnapshot>({
    pathname,
    paintMs: null,
    sessionMs: null,
    primaryMs: null,
    primaryLabel: null,
  });

  useEffect(() => {
    const id = ++navSeq;
    const t0 = performance.now();
    const startMark = `cypher:nav-${id}:start`;
    const target = primaryQueryForPath(pathname);
    const sample: NavSample = {
      id,
      pathname,
      t0,
      startMark,
      targetLabel: target?.label ?? null,
      reported: false,
    };
    navRef.current = sample;

    performance.mark(startMark);
    setSnapshot({
      pathname,
      paintMs: null,
      sessionMs: null,
      primaryMs: null,
      primaryLabel: target?.label ?? null,
    });

    let cancelled = false;
    let paintFrame = 0;
    let paintFrame2 = 0;

    function maybeReport(current: RouteLoadSnapshot) {
      const nav = navRef.current;
      if (!nav || nav.id !== id || nav.reported) return;
      const sessionDone = current.sessionMs != null;
      const primaryDone = !target || current.primaryMs != null;
      const paintDone = current.paintMs != null;
      if (!(sessionDone && primaryDone && paintDone)) return;
      nav.reported = true;
      reportRouteLoad(current);
    }

    function patch(partial: Partial<RouteLoadSnapshot>) {
      setSnapshot((prev) => {
        if (prev.pathname !== pathname) return prev;
        const next = { ...prev, ...partial };
        maybeReport(next);
        return next;
      });
    }

    paintFrame = requestAnimationFrame(() => {
      paintFrame2 = requestAnimationFrame(() => {
        if (cancelled || navRef.current?.id !== id) return;
        const paintMs = Math.round(performance.now() - t0);
        const paintMark = `cypher:nav-${id}:paint`;
        performance.mark(paintMark);
        try {
          performance.measure("cypher:paint", startMark, paintMark);
        } catch {
          /* ignore */
        }
        patch({ paintMs });
      });
    });

    let unsubscribe: (() => void) | undefined;
    if (target) {
      const cache = queryClient.getQueryCache();
      const ready = cache
        .getAll()
        .some((q) => queryMatchesPrimary(q, target) && q.state.status === "success");
      if (ready) {
        const primaryMs = Math.round(performance.now() - t0);
        const primaryMark = `cypher:nav-${id}:primary`;
        performance.mark(primaryMark);
        try {
          performance.measure("cypher:primary", startMark, primaryMark);
        } catch {
          /* ignore */
        }
        patch({ primaryMs, primaryLabel: target.label });
      } else {
        unsubscribe = cache.subscribe((event) => {
          if (cancelled || navRef.current?.id !== id || !event?.query) return;
          if (
            queryMatchesPrimary(event.query, target) &&
            event.query.state.status === "success"
          ) {
            const primaryMs = Math.round(performance.now() - t0);
            const primaryMark = `cypher:nav-${id}:primary`;
            performance.mark(primaryMark);
            try {
              performance.measure("cypher:primary", startMark, primaryMark);
            } catch {
              /* ignore */
            }
            patch({ primaryMs, primaryLabel: target.label });
            unsubscribe?.();
          }
        });
      }
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(paintFrame);
      cancelAnimationFrame(paintFrame2);
      unsubscribe?.();
    };
  }, [pathname, queryClient]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || nav.pathname !== pathname) return;
    if (!session.isSuccess || session.isPlaceholderData) return;

    setSnapshot((prev) => {
      if (prev.pathname !== pathname || prev.sessionMs != null) return prev;
      const sessionMs = Math.round(performance.now() - nav.t0);
      const sessionMark = `cypher:nav-${nav.id}:session`;
      performance.mark(sessionMark);
      try {
        performance.measure("cypher:session", nav.startMark, sessionMark);
      } catch {
        /* ignore */
      }
      const next = { ...prev, sessionMs };
      if (
        !nav.reported &&
        next.paintMs != null &&
        (!nav.targetLabel || next.primaryMs != null)
      ) {
        nav.reported = true;
        reportRouteLoad(next);
      }
      return next;
    });
  }, [pathname, session.isSuccess, session.isPlaceholderData, session.dataUpdatedAt]);

  return snapshot;
}
