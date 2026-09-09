"use client";

// Client-side display clock. The server sends its `now` (real or demo) with every
// render; the client only extrapolates between polls at the same multiplier. Before
// hydration it shows exactly the server value so markup matches.

import { useEffect, useRef, useState } from "react";

export function useLiveNow(serverNowMs: number, multiplier: number, tickMs = 250): number {
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);
  const base = useRef({ serverNowMs, receivedAt: 0 });

  useEffect(() => {
    base.current = { serverNowMs, receivedAt: Date.now() };
  }, [serverNowMs]);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setTick((x) => x + 1), tickMs);
    return () => clearInterval(t);
  }, [tickMs]);

  if (!mounted || base.current.receivedAt === 0) return serverNowMs;
  return base.current.serverNowMs + (Date.now() - base.current.receivedAt) * multiplier;
}
