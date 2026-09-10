// Spec §7.2 — remaining balance, new request, my requests. Shared by the agent and the
// Team Lead (decision 2026-09-10: the Team Lead requests leave too).

import { ar } from "@/i18n/ar";
import { myLeave } from "@/server/queries";
import { LeaveForm } from "./LeaveForm";
import { MyRequestsTable } from "./LeaveTables";

export async function LeaveScreen({ userId }: { userId: string }) {
  const mine = await myLeave(userId);
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
          <LeaveForm />
        </div>
        <MyRequestsTable rows={mine.rows} />
      </div>
    </div>
  );
}
