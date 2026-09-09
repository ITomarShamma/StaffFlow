// Spec §7.5 — read-only leave requests with status and remaining balance.

import { RequestsTable } from "@/components/LeaveTables";
import { ar } from "@/i18n/ar";
import { allLeave } from "@/server/queries";
import { requireRole } from "@/server/session";

export default async function LeadRequestsPage() {
  await requireRole("team_lead");
  const rows = await allLeave();
  return (
    <div className="flex-1 min-h-0 px-8 py-6 flex flex-col gap-4 overflow-auto box-border">
      <h1 className="m-0 text-2xl font-semibold">{ar.nav.leaveRequests}</h1>
      <RequestsTable rows={rows} />
    </div>
  );
}
