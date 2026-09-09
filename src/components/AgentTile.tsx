"use client";

// Live-board tile, design layout 1a: 4 px stripe on the start edge, tinted tile, filled
// chip, 24 px tabular timer, budget as a number, per-type counters, flag chips.

import Link from "next/link";
import { fmtDate, mmss } from "@/domain/format";
import type { AgentStatus } from "@/domain/types";
import { ar } from "@/i18n/ar";
import type { TileVM } from "@/server/queries";
import { FlagChip, StatusChip } from "./Chips";
import { statusTheme } from "./statusTheme";
import { useLiveNow } from "./useLiveNow";

const flagLabel = { autoEnded: ar.breaks.autoEnded, stale: ar.breaks.stale, endOfDay: ar.breaks.endOfDay, edited: ar.breaks.edited } as const;

export function timerText(timer: NonNullable<TileVM["timer"]>, nowMs: number): string {
  const elapsed = mmss((nowMs - timer.startedAtMs) / 1000);
  return timer.effectiveMaxMin == null ? elapsed : `${elapsed} / ${mmss(timer.effectiveMaxMin * 60)}`;
}

/** The server decides the status on every poll; between polls the client only flips on-break → overrun once the mark passes. */
export function liveStatus(status: AgentStatus, timer: TileVM["timer"], nowMs: number): AgentStatus {
  if (status === "on_break" && timer?.overrunAtMs != null && nowMs > timer.overrunAtMs) return "overrun";
  return status;
}

export function AgentTile({ tile, nowMs, multiplier, href }: { tile: TileVM; nowMs: number; multiplier: number; href?: string }) {
  const live = useLiveNow(nowMs, multiplier);
  const status = liveStatus(tile.status, tile.timer, live);
  const theme = statusTheme[status];
  const c = tile.counters;
  const note =
    tile.note?.kind === "away"
      ? `${ar.leave.from} ${tile.note.from} ${ar.leave.to} ${tile.note.to}`
      : tile.note?.kind === "leave"
        ? `${ar.leave.daily} · ${tile.note.start === tile.note.end ? fmtDate(tile.note.start) : `${ar.leave.from} ${fmtDate(tile.note.start)} ${ar.leave.to} ${fmtDate(tile.note.end)}`}`
        : null;

  const body = (
    <>
      <div className={`absolute inset-y-0 start-0 w-1 ${theme.stripe}`} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-semibold leading-[1.3] whitespace-nowrap overflow-hidden text-ellipsis">{tile.name}</span>
        <StatusChip status={status} />
      </div>
      <div className="flex-1 min-h-0 flex flex-col justify-center gap-0.5">
        {tile.timer && (
          <>
            <span className="text-muted">{ar.breaks[tile.timer.typeCode]}</span>
            <span dir="ltr" className="self-end text-2xl font-semibold leading-[1.2] tabular-nums">
              {timerText(tile.timer, live)}
            </span>
          </>
        )}
        {note && <span className="text-muted">{note}</span>}
        {tile.flags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-1">
            {tile.flags.map((f) => (
              <FlagChip key={f} label={flagLabel[f]} />
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col text-[13px] text-muted">
        <div className="flex justify-between items-baseline">
          <span>{ar.breaks.budgetUsed}</span>
          <span dir="ltr" className="text-[15px] font-semibold text-ink tabular-nums">
            {tile.budgetUsed} / {tile.budget}
          </span>
        </div>
        <div className="tabular-nums">
          {ar.breaks.counterSmoke} {c.smoke[0]}/{c.smoke[1]}
          {ar.breaks.counterSeparator}
          {ar.breaks.counterPrayer} {c.prayer[0]}/{c.prayer[1]}
          {ar.breaks.counterSeparator}
          {ar.breaks.counterMeal} {c.meal[0]}/{c.meal[1]}
        </div>
      </div>
    </>
  );

  const cls = `relative overflow-hidden ${theme.tint} border border-line rounded-lg ps-5 pe-4 pt-3.5 pb-3 flex flex-col gap-1.5 min-h-0 box-border`;
  const data = { "data-agent": tile.userId, "data-agent-name": tile.name, "data-status": status, "data-budget": tile.budgetUsed };
  if (href) {
    return (
      <Link href={href} className={`${cls} cursor-pointer`} {...data}>
        {body}
      </Link>
    );
  }
  return (
    <div className={cls} {...data}>
      {body}
    </div>
  );
}
