// Spec §7.3 / §7.6 — the live board: header card with pool meters (+ cap control for the
// Team Lead), then 12 tiles in a 4×3 grid. Polls every board_refresh_s.

import { ar } from "@/i18n/ar";
import type { ClockInfo } from "@/server/clock";
import type { BoardVM } from "@/server/queries";
import { AgentTile } from "./AgentTile";
import { BoardRefresher } from "./BoardRefresher";
import { CapControl } from "./CapControl";
import { PoolMeter } from "./PoolMeter";

export function Board({ board, clock, lead, refreshMs }: { board: BoardVM; clock: ClockInfo; lead: boolean; refreshMs: number }) {
  return (
    <div className="flex-1 min-h-0 h-[calc(100vh-56px)] flex flex-col gap-4 px-8 py-6 box-border">
      <BoardRefresher everyMs={refreshMs} />
      <div className="shrink-0 flex items-center gap-7 bg-surface-0 border border-line rounded-lg px-5 h-[72px] box-border relative">
        <h1 className="m-0 me-2 text-2xl font-semibold whitespace-nowrap">{ar.nav.board}</h1>
        <PoolMeter label={ar.breaks.generalPool} active={board.pools.general.active} cap={board.pools.general.cap} testId="pool-general" />
        <PoolMeter label={ar.breaks.toiletWomen} active={board.pools.toilet_female.active} cap={board.pools.toilet_female.cap} testId="pool-toilet-f" />
        <PoolMeter label={ar.breaks.toiletMen} active={board.pools.toilet_male.active} cap={board.pools.toilet_male.cap} testId="pool-toilet-m" />
        {lead && <CapControl cap={board.capGeneral} />}
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-4 grid-rows-3 gap-4">
        {board.tiles.map((t) => (
          <AgentTile key={t.userId} tile={t} nowMs={clock.nowMs} multiplier={clock.multiplier} href={lead ? `/lead?agent=${t.userId}` : undefined} />
        ))}
      </div>
    </div>
  );
}
