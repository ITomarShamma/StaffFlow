"use client";

// Agent home status card (spec §7.1, design S1): «متواجد», or the break with a live
// countdown «01:12 / 03:00» and «عودة إلى العمل». Turns red on overrun (design decision).

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { mmss } from "@/domain/format";
import { ar } from "@/i18n/ar";
import { endBreak } from "@/server/actions/breaks";
import type { AgentHomeVM } from "@/server/queries";
import { liveStatus } from "./AgentTile";
import { StatusChip } from "./Chips";
import { statusTheme } from "./statusTheme";
import { useLiveNow } from "./useLiveNow";

export function StatusCard({ vm, multiplier }: { vm: AgentHomeVM; multiplier: number }) {
  const live = useLiveNow(vm.nowMs, multiplier);
  const status = liveStatus(vm.status, vm.timer, live);
  const theme = statusTheme[status];
  const [busy, start] = useTransition();
  const router = useRouter();
  const onBreak = vm.timer !== null;
  const elapsedSec = vm.timer ? (live - vm.timer.startedAtMs) / 1000 : 0;
  const maxMin = vm.timer?.effectiveMaxMin ?? null;
  const pct = maxMin != null && maxMin > 0 ? Math.min(100, Math.round((elapsedSec / (maxMin * 60)) * 100)) : 0;

  return (
    <div
      className={`relative overflow-hidden ${theme.tint} border border-line rounded-lg ps-9 pe-8 py-8 min-h-[200px] box-border flex flex-col justify-center gap-4`}
      data-testid="status-card"
      data-status={status}
    >
      <div className={`absolute inset-y-0 start-0 w-1 ${theme.stripe}`} />
      {!onBreak && <div className="text-[32px] font-semibold leading-[1.2]">{ar.status[status]}</div>}
      {onBreak && vm.timer && (
        <>
          <div className="flex items-center gap-3">
            <StatusChip status={status} />
            <span className="text-2xl font-semibold">{ar.breaks[vm.timer.typeCode]}</span>
          </div>
          <div dir="ltr" className="self-end text-5xl font-semibold leading-[1.1] tabular-nums" data-testid="countdown">
            {mmss(elapsedSec)}
            {maxMin != null ? ` / ${mmss(maxMin * 60)}` : ""}
          </div>
          {maxMin != null && (
            <div className="h-1.5 rounded-[3px] bg-ink/[.08] overflow-hidden">
              <div className={`h-full ${theme.stripe}`} style={{ width: `${pct}%` }} />
            </div>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              start(async () => {
                await endBreak();
                router.refresh();
              })
            }
            className="self-start h-12 px-7 rounded-lg bg-indigo-600 text-white text-lg font-semibold cursor-pointer hover:bg-indigo-700"
            data-testid="back-on-floor"
          >
            {ar.breaks.backOnFloor}
          </button>
        </>
      )}
    </div>
  );
}
