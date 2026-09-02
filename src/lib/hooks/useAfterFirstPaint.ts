"use client";

import { useEffect, useState } from "react";

/**
 * Fica true após o primeiro paint (double rAF) + idle curto.
 * Para adiar queries secundárias até o conteúdo principal estar na tela.
 */
export function useAfterFirstPaint(resetKey?: string | number) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let outer = 0;
    let inner = 0;

    outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (cancelled) return;
        const markReady = () => {
          if (!cancelled) setReady(true);
        };
        if (typeof requestIdleCallback === "function") {
          idleId = requestIdleCallback(markReady, { timeout: 400 });
        } else {
          timeoutId = setTimeout(markReady, 0);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      if (idleId != null && typeof cancelIdleCallback === "function") {
        cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [resetKey]);

  return ready;
}
