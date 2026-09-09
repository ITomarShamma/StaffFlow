// Spec §7.7 — pending list with approve / reject; approved tab with revoke.

import Link from "next/link";
import { ApprovedDecisions, PendingDecisions } from "@/components/DecisionsTable";
import { ar } from "@/i18n/ar";
import { leaveByStatus, pendingCounts } from "@/server/queries";
import { requireRole } from "@/server/session";

export default async function DecisionsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireRole("branch_manager");
  const { tab } = await searchParams;
  const approvedTab = tab === "approved";
  const [rows, counts] = await Promise.all([leaveByStatus(approvedTab ? "approved" : "pending"), pendingCounts()]);
  const tabCls = (active: boolean) =>
    `h-8 px-3.5 rounded-md font-medium inline-flex items-center gap-1 ${active ? "bg-indigo-600 text-white" : "bg-transparent text-ink"}`;
  return (
    <div className="flex-1 min-h-0 px-8 py-6 flex flex-col gap-4 overflow-auto box-border">
      <div className="flex items-center gap-6">
        <h1 className="m-0 text-2xl font-semibold">{ar.nav.leaveDecisions}</h1>
        <div className="flex gap-0.5 border border-line rounded-lg p-0.5 bg-surface-0">
          <Link href="/manager/decisions" className={tabCls(!approvedTab)} data-testid="tab-pending">
            {ar.leave.pending}{" "}
            <span dir="ltr" className="tabular-nums">
              {counts.pending}
            </span>
          </Link>
          <Link href="/manager/decisions?tab=approved" className={tabCls(approvedTab)} data-testid="tab-approved">
            {ar.leave.approved}{" "}
            <span dir="ltr" className="tabular-nums">
              {counts.approved}
            </span>
          </Link>
        </div>
      </div>
      <div className="bg-surface-0 border border-line rounded-lg overflow-hidden">
        {approvedTab ? <ApprovedDecisions rows={rows} /> : <PendingDecisions rows={rows} />}
      </div>
    </div>
  );
}
