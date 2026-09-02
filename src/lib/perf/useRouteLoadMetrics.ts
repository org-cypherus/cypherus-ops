"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/modules/auth/hooks";
import {
  primaryQueryForPath,
  queryMatchesPrimary,
  reportRouteLoad,
  resourcesElapsedMs,
  type RouteLoadSnapshot,
} from "./route-metrics";

let navSeq = 0;
const QUIET_MS = 200;

type NavSample = {
  id: number;
  pathname: string;
  t0: number;
  startMark: string;
  hasPrimaryTarget: boolean;
  reported: boolean;
};

function emptySnapshot(pathname: string, primaryLabel: string | null = null): RouteLoadSnapshot {
  return {
    pathname,
    paintMs: null,
    sessionMs: null,
    primaryMs: null,
    primaryLabel,
    totalMs: null,
    resourcesMs: null,
  };
}

/**
 * Tempo desde a troca de rota até paint, sessão, query principal e
 * total (fila RQ quieta + resources de rede da navegação).
 */
export function useRouteLoadMetrics(): RouteLoadSnapshot {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const session = useSession();
  const navRef = useRef<NavSample | null>(null);
  const snapshotRef = useRef<RouteLoadSnapshot>(emptySnapshot(pathname));
  const [snapshot, setSnapshot] = useState<RouteLoadSnapshot>(() => emptySnapshot(pathname));

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

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
      hasPrimaryTarget: Boolean(target),
      reported: false,
    };
    navRef.current = sample;

    performance.mark(startMark);
    const initial = emptySnapshot(pathname, target?.label ?? null);
    snapshotRef.current = initial;
    setSnapshot(initial);

    let cancelled = false;
    let paintFrame = 0;
    let paintFrame2 = 0;
    let quietTimer: ReturnType<typeof setTimeout> | undefined;
    let unsubPrimary: (() => void) | undefined;

    function commit(partial: Partial<RouteLoadSnapshot>) {
      if (cancelled || navRef.current?.id !== id) return;
      const next = { ...snapshotRef.current, ...partial };
      snapshotRef.current = next;
      setSnapshot(next);
      return next;
    }

    function sealTotal() {
      if (cancelled || navRef.current?.id !== id) return;
      const current = snapshotRef.current;
      if (current.totalMs != null) return;
      if (current.sessionMs == null) return;
      if (sample.hasPrimaryTarget && current.primaryMs == null) return;
      if (queryClient.isFetching() > 0) return;

      const resourcesMs = resourcesElapsedMs(t0);
      const wall = Math.round(performance.now() - t0);
      const totalMs = Math.max(
        wall,
        resourcesMs ?? 0,
        current.sessionMs,
        current.primaryMs ?? 0,
        current.paintMs ?? 0,
      );
      const totalMark = `cypher:nav-${id}:total`;
      performance.mark(totalMark);
      try {
        performance.measure("cypher:total", startMark, totalMark);
      } catch {
        /* ignore */
      }
      const next = commit({ totalMs, resourcesMs });
      if (next && !sample.reported) {
        sample.reported = true;
        reportRouteLoad(next);
      }
    }

    function scheduleSeal() {
      if (quietTimer) clearTimeout(quietTimer);
      quietTimer = setTimeout(sealTotal, QUIET_MS);
    }

    const unsubCache = queryClient.getQueryCache().subscribe(() => {
      scheduleSeal();
    });

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
        commit({ paintMs });
        scheduleSeal();
      });
    });

    if (target) {
      const cache = queryClient.getQueryCache();
      const markPrimary = () => {
        if (snapshotRef.current.primaryMs != null) return;
        const primaryMs = Math.round(performance.now() - t0);
        const primaryMark = `cypher:nav-${id}:primary`;
        performance.mark(primaryMark);
        try {
          performance.measure("cypher:primary", startMark, primaryMark);
        } catch {
          /* ignore */
        }
        commit({ primaryMs, primaryLabel: target.label });
        scheduleSeal();
      };

      if (
        cache.getAll().some((q) => queryMatchesPrimary(q, target) && q.state.status === "success")
      ) {
        markPrimary();
      } else {
        unsubPrimary = cache.subscribe((event) => {
          if (cancelled || navRef.current?.id !== id || !event?.query) return;
          if (
            queryMatchesPrimary(event.query, target) &&
            event.query.state.status === "success"
          ) {
            markPrimary();
            unsubPrimary?.();
          }
        });
      }
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(paintFrame);
      cancelAnimationFrame(paintFrame2);
      if (quietTimer) clearTimeout(quietTimer);
      unsubPrimary?.();
      unsubCache();
    };
  }, [pathname, queryClient]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || nav.pathname !== pathname) return;
    if (!session.isSuccess || session.isPlaceholderData) return;
    if (snapshotRef.current.sessionMs != null) return;

    const sessionMs = Math.round(performance.now() - nav.t0);
    const sessionMark = `cypher:nav-${nav.id}:session`;
    performance.mark(sessionMark);
    try {
      performance.measure("cypher:session", nav.startMark, sessionMark);
    } catch {
      /* ignore */
    }
    const next = { ...snapshotRef.current, sessionMs };
    snapshotRef.current = next;
    setSnapshot(next);

    const timer = setTimeout(() => {
      if (navRef.current?.id !== nav.id) return;
      const current = snapshotRef.current;
      if (current.totalMs != null) return;
      if (nav.hasPrimaryTarget && current.primaryMs == null) return;
      if (queryClient.isFetching() > 0) return;
      const resourcesMs = resourcesElapsedMs(nav.t0);
      const wall = Math.round(performance.now() - nav.t0);
      const totalMs = Math.max(
        wall,
        resourcesMs ?? 0,
        current.sessionMs ?? 0,
        current.primaryMs ?? 0,
        current.paintMs ?? 0,
      );
      const sealed = { ...current, totalMs, resourcesMs };
      snapshotRef.current = sealed;
      setSnapshot(sealed);
      if (!nav.reported) {
        nav.reported = true;
        reportRouteLoad(sealed);
      }
    }, QUIET_MS);

    return () => clearTimeout(timer);
  }, [pathname, queryClient, session.isSuccess, session.isPlaceholderData, session.dataUpdatedAt]);

  return snapshot;
}
