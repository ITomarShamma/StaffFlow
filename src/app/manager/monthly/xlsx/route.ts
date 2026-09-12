// Formatted Excel export of the monthly report (decision 2026-09-12).

import { isIsoMonth, localParts, monthOf } from "@/domain/tz";
import { serverNow } from "@/server/clock";
import { monthlySummaryFor } from "@/server/reports";
import { monthlyWorkbook } from "@/server/reportSheets";
import { requireRole } from "@/server/session";

export const dynamic = "force-dynamic";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(request: Request): Promise<Response> {
  await requireRole("branch_manager");
  const current = monthOf(localParts(await serverNow()).date);
  const raw = new URL(request.url).searchParams.get("month");
  const month = raw && isIsoMonth(raw) && raw <= current ? raw : current;
  const body = await monthlyWorkbook(await monthlySummaryFor(month));
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": XLSX,
      "Content-Disposition": `attachment; filename="staffflow-${month}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
