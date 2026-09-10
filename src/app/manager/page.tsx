// Spec §7.6 — the Branch Manager's board: read-only, no cap control, no click-through.

import { Board } from "@/components/Board";
import { clockFrom } from "@/server/clock";
import { boardFor, loadTeamContext } from "@/server/queries";
import { requireRole } from "@/server/session";

export default async function ManagerBoardPage() {
  await requireRole("branch_manager");
  const ctx = await loadTeamContext();
  // The Team Lead appears here as a tile too (decision 2026-09-10).
  return <Board board={boardFor(ctx, { includeLead: true })} clock={clockFrom(ctx.now)} lead={false} refreshMs={ctx.cfg.boardRefreshS * 1000} />;
}
