// Formatted Excel export of the daily summary (decision 2026-09-12). The CSV route stays for
// spec §7.8 and the acceptance test; this is the one a manager opens and prints.

import { isIsoDate, localParts } from "@/domain/tz";
import { serverNow } from "@/server/clock";
import { summaryFor } from "@/server/queries";
import { dailyWorkbook } from "@/server/reportSheets";
import { requireRole } from "@/server/session";

export const dynamic = "force-dynamic";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(request: Request): Promise<Response> {
  await requireRole("branch_manager");
  const now = await serverNow();
  const raw = new URL(request.url).searchParams.get("date");
  const date = raw && isIsoDate(raw) ? raw : localParts(now).date;
  const body = await dailyWorkbook(date, await summaryFor(date), now);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": XLSX,
      "Content-Disposition": `attachment; filename="staffflow-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
