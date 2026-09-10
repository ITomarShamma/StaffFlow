"use client";

import { useRouter } from "next/navigation";
import { ar } from "@/i18n/ar";

/** Calendar picker; navigates to ?date=YYYY-MM-DD when a date is chosen. */
export function SummaryDatePicker({ date }: { date: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2">
      <span className="text-[13px] font-medium text-muted">{ar.leave.date}</span>
      <input
        type="date"
        dir="ltr"
        value={date}
        onChange={(e) => {
          if (e.target.value && e.target.value !== date) router.push(`/manager/summary?date=${e.target.value}`);
        }}
        className="h-9 px-3 border border-line rounded bg-surface-0 text-ink tabular-nums"
        data-testid="summary-date"
      />
    </label>
  );
}
