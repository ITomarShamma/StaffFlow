// Spec §7.1 — Agent home: status card + four break buttons. No counts, no minutes remaining.

import { BoardRefresher } from "@/components/BoardRefresher";
import { BreakButtons } from "@/components/BreakButtons";
import { StatusCard } from "@/components/StatusCard";
import { clockFrom } from "@/server/clock";
import { agentHomeFor, loadTeamContext } from "@/server/queries";
import { requireRole } from "@/server/session";

export default async function AgentHomePage() {
  const me = await requireRole("agent");
  const ctx = await loadTeamContext();
  const vm = agentHomeFor(ctx, me.user);
  const clock = clockFrom(ctx.now);
  return (
    <div className="flex-1 flex justify-center px-8 py-12 overflow-auto">
      <BoardRefresher everyMs={ctx.cfg.boardRefreshS * 1000} />
      <div className="w-[720px] flex flex-col gap-6">
        <StatusCard vm={vm} multiplier={clock.multiplier} />
        <BreakButtons states={vm.buttons} />
      </div>
    </div>
  );
}
