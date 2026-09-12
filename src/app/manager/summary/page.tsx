// Spec §7.8 / §9 — daily summary with date picker and CSV export.

import { SummaryDatePicker } from "@/components/SummaryDatePicker";
import { SummaryTable } from "@/components/SummaryTable";
import { isIsoDate, localParts } from "@/domain/tz";
import { ar } from "@/i18n/ar";
import { serverNow } from "@/server/clock";
import { summaryFor } from "@/server/queries";
import { requireRole } from "@/server/session";

export default async function SummaryPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireRole("branch_manager");
  const { date: raw } = await searchParams;
  const today = localParts(await serverNow()).date;
  const date = raw && isIsoDate(raw) ? raw : today;
  const rows = await summaryFor(date);
  return (
    <div className="flex-1 min-h-0 px-8 py-6 flex flex-col gap-4 overflow-auto box-border">
      <div className="flex items-center gap-5">
        <h1 className="m-0 text-2xl font-semibold">{ar.nav.dailySummary}</h1>
        <SummaryDatePicker date={date} />
        <a
          href={`/manager/summary/xlsx?date=${date}`}
          className="ms-auto h-10 px-5 inline-flex items-center rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
          data-testid="export-xlsx"
        >
          {ar.todo.reports.exportExcel}
        </a>
        <a
          href={`/manager/summary/csv?date=${date}`}
          className="h-10 px-5 inline-flex items-center border border-line rounded-lg bg-surface-0 text-ink font-medium hover:border-indigo-400"
          data-testid="export-csv"
        >
          {ar.table.exportCsv}
        </a>
      </div>
      <SummaryTable rows={rows} />
    </div>
  );
}
