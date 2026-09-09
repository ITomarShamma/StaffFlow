// Spec §7.8 — «تصدير CSV»: UTF-8 with BOM so Excel opens Arabic names correctly.

import { formatHours } from "@/domain/format";
import { summaryCsv } from "@/domain/summary";
import { isIsoDate, localParts } from "@/domain/tz";
import { ar } from "@/i18n/ar";
import { serverNow } from "@/server/clock";
import { summaryFor } from "@/server/queries";
import { requireRole } from "@/server/session";

export const dynamic = "force-dynamic";

const UTF8_BOM = String.fromCharCode(0xfeff);

export async function GET(request: Request): Promise<Response> {
  await requireRole("branch_manager");
  const raw = new URL(request.url).searchParams.get("date");
  const date = raw && isIsoDate(raw) ? raw : localParts(await serverNow()).date;
  const rows = await summaryFor(date);
  const csv = UTF8_BOM + summaryCsv(ar.design.csvHeaders, rows, formatHours);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="staffflow-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
