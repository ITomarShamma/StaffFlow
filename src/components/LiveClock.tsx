"use client";

import { hhmmss } from "@/domain/format";
import { useLiveNow } from "./useLiveNow";

export function LiveClock({ nowMs, multiplier }: { nowMs: number; multiplier: number }) {
  const live = useLiveNow(nowMs, multiplier);
  return (
    <span dir="ltr" className="tabular-nums text-white text-[15px]">
      {hhmmss(new Date(live))}
    </span>
  );
}
