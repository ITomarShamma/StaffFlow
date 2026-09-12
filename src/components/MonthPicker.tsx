"use client";

import { useRouter } from "next/navigation";
import { ar } from "@/i18n/ar";

/** Month picker for the monthly report; navigates to ?month=YYYY-MM. Future months are greyed. */
export function MonthPicker({ month, max }: { month: string; max: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2">
      <span className="text-[13px] font-medium text-muted">{ar.todo.reports.month}</span>
      <input
        type="month"
        dir="ltr"
        value={month}
        max={max}
        onChange={(e) => {
          if (e.target.value && e.target.value !== month) router.push(`/manager/monthly?month=${e.target.value}`);
        }}
        className="h-9 px-3 border border-line rounded bg-surface-0 text-ink tabular-nums"
        data-testid="report-month"
      />
    </label>
  );
}
