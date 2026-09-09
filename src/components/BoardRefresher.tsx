"use client";

// Spec §7.3 / §11 — the board polls every 5 s (board_refresh_s); every poll runs the sweep on the server.

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function BoardRefresher({ everyMs }: { everyMs: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), everyMs);
    return () => clearInterval(t);
  }, [router, everyMs]);
  return null;
}
