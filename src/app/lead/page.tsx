// Spec §7.3 / §7.4 — the Team Lead's live board; a tile opens that agent's corrections (?agent=id).

import { Board } from "@/components/Board";
import { CorrectionsDialog } from "@/components/CorrectionsDialog";
import { clockFrom } from "@/server/clock";
import { boardFor, correctionRowsFor, loadTeamContext } from "@/server/queries";
import { requireRole } from "@/server/session";

export default async function LeadBoardPage({ searchParams }: { searchParams: Promise<{ agent?: string }> }) {
  await requireRole("team_lead");
  const { agent } = await searchParams;
  const ctx = await loadTeamContext();
  const board = boardFor(ctx);
  const clock = clockFrom(ctx.now);
  const target = agent ? ctx.agents.find((a) => a.id === agent) : undefined;
  const corr = target ? correctionRowsFor(ctx, target.id) : null;
  return (
    <>
      <Board board={board} clock={clock} lead refreshMs={ctx.cfg.boardRefreshS * 1000} />
      {target && corr && (
        <CorrectionsDialog
          agentName={target.nameAr}
          rows={corr.rows}
          budgetUsed={corr.budgetUsed}
          budget={ctx.cfg.dailyBudgetMin}
          nowMs={clock.nowMs}
          multiplier={clock.multiplier}
          closeHref="/lead"
        />
      )}
    </>
  );
}
