import { LeaveScreen } from "@/components/LeaveScreen";
import { requireRole } from "@/server/session";

export default async function AgentLeavePage() {
  const me = await requireRole("agent");
  return <LeaveScreen userId={me.user.id} />;
}
