// Monthly report (decision 2026-09-12): the daily summaries of every working day of a month,
// added up per person, with a team total and a formatted Excel export.

import { MonthPicker } from "@/components/MonthPicker";
import { MonthlyTable } from "@/components/MonthlyTable";
import { fmtDate } from "@/domain/format";
import { isIsoMonth, localParts, monthOf } from "@/domain/tz";
import { ar } from "@/i18n/ar";
import { serverNow } from "@/server/clock";
import { monthlySummaryFor } from "@/server/reports";
import { requireRole } from "@/server/session";

export default async function MonthlyPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireRole("branch_manager");
  const { month: raw } = await searchParams;
  const current = monthOf(localParts(await serverNow()).date);
  // A future month has no working days yet; fall back to the current one.
  const month = raw && isIsoMonth(raw) && raw <= current ? raw : current;
  const report = await monthlySummaryFor(month);
  const r = ar.todo.reports;
  const d = report.dates;

  return (
    <div className="flex-1 min-h-0 px-8 py-6 flex flex-col gap-4 overflow-auto box-border">
      <div className="flex items-center gap-5 flex-wrap">
        <h1 className="m-0 text-2xl font-semibold">{ar.nav.monthlyReport}</h1>
        <MonthPicker month={month} max={current} />
        <span className="text-[13px] text-muted" data-testid="report-coverage">
          {d.length > 0 ? r.coverage(fmtDate(d[0]!), fmtDate(d[d.length - 1]!), d.length) : r.noDays}
        </span>
        <a
          href={`/manager/monthly/xlsx?month=${month}`}
          className="ms-auto h-10 px-5 inline-flex items-center rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
          data-testid="export-xlsx"
        >
          {r.exportExcel}
        </a>
      </div>
      <MonthlyTable rows={report.rows} />
    </div>
  );
}
