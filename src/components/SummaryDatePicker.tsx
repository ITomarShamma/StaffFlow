"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmtDate, parseDmy } from "@/domain/format";
import { ar } from "@/i18n/ar";

/** dd/mm/yyyy text field; navigates to ?date=YYYY-MM-DD on Enter or blur when the date is valid. */
export function SummaryDatePicker({ date }: { date: string }) {
  const [value, setValue] = useState(fmtDate(date));
  const router = useRouter();
  const go = () => {
    const iso = parseDmy(value);
    if (iso && iso !== date) router.push(`/manager/summary?date=${iso}`);
    else if (!iso) setValue(fmtDate(date));
  };
  return (
    <label className="flex items-center gap-2">
      <span className="text-[13px] font-medium text-muted">{ar.leave.date}</span>
      <input
        type="text"
        dir="ltr"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={go}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            go();
          }
        }}
        className="h-9 w-[130px] px-3 border border-line rounded bg-surface-0 text-ink tabular-nums text-center"
        data-testid="summary-date"
      />
    </label>
  );
}
