// Leave tables: the agent's «طلباتي» (with cancel on pending rows) and the Team Lead's
// read-only «طلبات الإجازة».

import { fmtDate, formatHours } from "@/domain/format";
import { ar } from "@/i18n/ar";
import type { LeaveRowVM } from "@/server/queries";
import { CancelLeaveButton } from "./CancelLeaveButton";
import { LeaveStatusChip } from "./Chips";

export const th = "text-start px-4 py-2.5 text-[13px] font-semibold text-muted bg-surface-2 border-b border-line";
export const thEdge = "text-start px-5 py-2.5 text-[13px] font-semibold text-muted bg-surface-2 border-b border-line";
export const td = "px-4 py-3 border-b border-line align-middle";
export const tdEdge = "px-5 py-3 border-b border-line align-middle";

export function whenText(r: LeaveRowVM): string {
  if (r.kind === "hourly") return `${fmtDate(r.date ?? "")} · ${ar.leave.from} ${r.fromTime} ${ar.leave.to} ${r.toTime}`;
  const s = r.startDate ?? "";
  const e = r.endDate ?? "";
  return s === e ? fmtDate(s) : `${ar.leave.from} ${fmtDate(s)} ${ar.leave.to} ${fmtDate(e)}`;
}

export function WhenCell({ r }: { r: LeaveRowVM }) {
  return (
    <>
      <div className="font-semibold">{ar.leave[r.kind]}</div>
      <div className="text-[13px] text-muted tabular-nums">{whenText(r)}</div>
    </>
  );
}

export function MyRequestsTable({ rows }: { rows: LeaveRowVM[] }) {
  return (
    <div className="bg-surface-0 border border-line rounded-lg overflow-hidden">
      <div className="text-lg font-semibold px-5 pt-4 pb-3">{ar.leave.myRequests}</div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thEdge}>{ar.leave.date}</th>
            <th className={th}>{ar.leave.hours}</th>
            <th className={th}>{ar.leave.reason}</th>
            <th className={th} />
            <th className={th} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-testid="my-request" data-status={r.status}>
              <td className={tdEdge}>
                <WhenCell r={r} />
              </td>
              <td className={`${td} tabular-nums`}>{formatHours(r.minutes)}</td>
              <td className={`${td} text-muted`}>{r.reason}</td>
              <td className={td}>
                <LeaveStatusChip status={r.status} />
              </td>
              <td className={`${td} text-end`}>{r.status === "pending" && <CancelLeaveButton id={r.id} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RequestsTable({ rows }: { rows: LeaveRowVM[] }) {
  return (
    <div className="bg-surface-0 border border-line rounded-lg overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thEdge}>{ar.leave.requestedBy}</th>
            <th className={th}>{ar.leave.date}</th>
            <th className={th}>{ar.leave.hours}</th>
            <th className={th}>{ar.leave.reason}</th>
            <th className={th}>{ar.todo.requestedAt}</th>
            <th className={th} />
            <th className={thEdge}>{ar.leave.remainingBalance}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-testid="request-row" data-status={r.status}>
              <td className={`${tdEdge} font-semibold`}>{r.agentName}</td>
              <td className={td}>
                <WhenCell r={r} />
              </td>
              <td className={`${td} tabular-nums`}>{formatHours(r.minutes)}</td>
              <td className={`${td} text-muted`}>{r.reason}</td>
              <td className={`${td} text-[13px] text-muted tabular-nums whitespace-nowrap`} data-col="requested-at">
                <span dir="ltr">{r.requestedAt}</span>
              </td>
              <td className={td}>
                <LeaveStatusChip status={r.status} />
              </td>
              <td className={`${tdEdge} tabular-nums`}>
                <span dir="ltr">{r.remainingDays}</span> {ar.table.day}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
