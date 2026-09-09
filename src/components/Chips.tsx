import type { AgentStatus, LeaveStatus } from "@/domain/types";
import { ar } from "@/i18n/ar";
import { statusTheme } from "./statusTheme";

export function StatusChip({ status }: { status: AgentStatus }) {
  return (
    <span className={`shrink-0 inline-flex items-center h-6 px-2 rounded text-[13px] font-semibold text-white whitespace-nowrap ${statusTheme[status].chip}`}>
      {ar.status[status]}
    </span>
  );
}

export function FlagChip({ label }: { label: string }) {
  return <span className="inline-flex items-center h-[22px] px-1.5 rounded text-xs font-medium border border-line text-muted bg-surface-0 whitespace-nowrap">{label}</span>;
}

/** Leave-status chips are neutral (design): indigo tint = pending, navy fill = approved, outlined grey = the rest. */
export function LeaveStatusChip({ status }: { status: LeaveStatus }) {
  const cls =
    status === "pending"
      ? "bg-indigo-050 text-indigo-700 border-indigo-050"
      : status === "approved"
        ? "bg-ink text-white border-ink"
        : "bg-transparent text-muted border-line";
  return <span className={`inline-flex items-center h-6 px-2 rounded text-[13px] font-semibold whitespace-nowrap border ${cls}`}>{ar.leave[status]}</span>;
}
