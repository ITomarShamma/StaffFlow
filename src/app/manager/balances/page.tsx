// Spec §7.9 — leave balances per agent for the year: used, remaining (days).

import { localParts, yearOf } from "@/domain/tz";
import { ar } from "@/i18n/ar";
import { serverNow } from "@/server/clock";
import { balancesFor } from "@/server/queries";
import { requireRole } from "@/server/session";

const th = "text-start px-4 py-2.5 text-[13px] font-semibold text-muted bg-surface-2 border-b border-line";

export default async function BalancesPage() {
  await requireRole("branch_manager");
  const year = yearOf(localParts(await serverNow()).date);
  const rows = await balancesFor(year);
  return (
    <div className="flex-1 min-h-0 px-8 py-6 flex flex-col gap-4 overflow-auto box-border">
      <h1 className="m-0 text-2xl font-semibold">{ar.nav.leaveBalances}</h1>
      <div className="bg-surface-0 border border-line rounded-lg overflow-hidden max-w-[880px]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${th} px-5`}>{ar.table.agent}</th>
              <th className={`${th} w-[140px]`}>{ar.design.balances.usedDays}</th>
              <th className={`${th} w-[140px]`}>{ar.design.balances.remainingDays}</th>
              <th className={`${th} px-5 w-[260px]`} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} data-testid="balance-row" data-agent={r.name}>
                <td className="px-5 py-[11px] border-b border-line font-semibold">{r.name}</td>
                <td dir="ltr" className="px-4 py-[11px] border-b border-line tabular-nums text-right" data-col="used">
                  {r.usedDays}
                </td>
                <td dir="ltr" className="px-4 py-[11px] border-b border-line tabular-nums text-right font-semibold" data-col="remaining">
                  {r.remainingDays}
                </td>
                <td className="px-5 py-[11px] border-b border-line">
                  <div className="h-1.5 rounded-[3px] bg-surface-2 overflow-hidden">
                    <div className="h-full bg-indigo-600" style={{ width: `${r.usedPct}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
