// Spec §7.2 — remaining balance, new request, my requests.

import { LeaveForm } from "@/components/LeaveForm";
import { MyRequestsTable } from "@/components/LeaveTables";
import { fmtDate } from "@/domain/format";
import { localParts } from "@/domain/tz";
import { ar } from "@/i18n/ar";
import { serverNow } from "@/server/clock";
import { myLeave } from "@/server/queries";
import { requireRole } from "@/server/session";

export default async function AgentLeavePage() {
  const me = await requireRole("agent");
  const [now, mine] = await Promise.all([serverNow(), myLeave(me.user.id)]);
  return (
    <div className="flex-1 min-h-0 px-8 py-6 flex flex-col gap-4 overflow-auto box-border">
      <h1 className="m-0 text-2xl font-semibold">{ar.nav.leave}</h1>
      <div className="grid grid-cols-[440px_minmax(0,1fr)] gap-6 items-start">
        <div className="flex flex-col gap-4">
          <div className="bg-surface-0 border border-line rounded-lg px-6 py-5 flex flex-col gap-0.5" data-testid="balance-card">
            <span className="text-[13px] font-medium text-muted">{ar.leave.remainingBalance}</span>
            <span className="text-[32px] font-semibold leading-[1.2] tabular-nums">
              <span dir="ltr" data-testid="balance-days">
                {mine.remainingDays}
              </span>{" "}
              {ar.table.day}
            </span>
          </div>
          <LeaveForm todayDmy={fmtDate(localParts(now).date)} />
        </div>
        <MyRequestsTable rows={mine.rows} />
      </div>
    </div>
  );
}
