// The Team Lead's own leave (decision 2026-09-10): the same screen as the agent's.

import { LeaveScreen } from "@/components/LeaveScreen";
import { requireRole } from "@/server/session";

export default async function LeadLeavePage() {
  const me = await requireRole("team_lead");
  return <LeaveScreen userId={me.user.id} />;
}
