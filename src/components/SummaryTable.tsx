// Spec §7.8 / §9 — per agent, per day.

import { formatHours } from "@/domain/format";
import type { SummaryRow } from "@/domain/summary";
import { ar } from "@/i18n/ar";

const th = "text-start px-3 py-2.5 text-[13px] text-muted bg-surface-2 border-b border-line align-top";
const group = "border-s border-line";
const td = "px-3 py-[11px] border-b border-line tabular-nums";

function Two({ a, b }: { a: string; b: string }) {
  return (
    <>
      <div className="font-semibold">{a}</div>
      <div className="font-normal">{b}</div>
    </>
  );
}

export function SummaryTable({ rows }: { rows: SummaryRow[] }) {
  const s = ar.design.summary;
  return (
    <div className="bg-surface-0 border border-line rounded-lg overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={`${th} px-5 font-semibold`}>{ar.table.agent}</th>
            <th className={`${th} font-semibold`}>{ar.breaks.budgetUsed}</th>
            <th className={`${th} ${group}`}>
              <Two a={s.smoke} b={ar.table.count} />
            </th>
            <th className={th}>
              <Two a={s.smoke} b={ar.table.minutes} />
            </th>
            <th className={`${th} ${group}`}>
              <Two a={s.prayer} b={ar.table.count} />
            </th>
            <th className={th}>
              <Two a={s.prayer} b={ar.table.minutes} />
            </th>
            <th className={`${th} ${group}`}>
              <Two a={s.meal} b={ar.table.count} />
            </th>
            <th className={th}>
              <Two a={s.meal} b={ar.table.minutes} />
            </th>
            <th className={`${th} ${group}`}>
              <Two a={s.toilet} b={ar.table.count} />
            </th>
            <th className={`${th} ${group}`}>
              <Two a={s.call} b={ar.table.count} />
            </th>
            <th className={`${th} ${group} font-semibold`}>{ar.table.overruns}</th>
            <th className={`${th} font-semibold`}>{ar.breaks.autoEnded}</th>
            <th className={`${th} font-semibold`}>{ar.breaks.edited}</th>
            <th className={`${th} ${group}`}>
              <Two a={s.leave} b={ar.leave.hours} />
            </th>
            <th className={`${th} pe-5`}>
              <Two a={s.leave} b={ar.table.day} />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} data-testid="summary-row" data-agent={r.name}>
              <td className={`${td} px-5 font-semibold whitespace-nowrap`}>{r.name}</td>
              <td dir="ltr" className={`${td} text-right font-semibold`} data-col="budget">
                {r.budgetUsed} / {r.budget}
              </td>
              <td className={`${td} ${group}`} data-col="smoke-n">{r.smoke.count}</td>
              <td className={td} data-col="smoke-min">{r.smoke.minutes}</td>
              <td className={`${td} ${group}`} data-col="prayer-n">{r.prayer.count}</td>
              <td className={td} data-col="prayer-min">{r.prayer.minutes}</td>
              <td className={`${td} ${group}`} data-col="meal-n">{r.meal.count}</td>
              <td className={td} data-col="meal-min">{r.meal.minutes}</td>
              <td className={`${td} ${group}`} data-col="toilet-n">{r.toiletCount}</td>
              <td className={`${td} ${group}`} data-col="call-n">{r.callCount}</td>
              <td className={`${td} ${group}`} data-col="overruns">{r.overruns}</td>
              <td className={td} data-col="auto">{r.autoEnded}</td>
              <td className={td} data-col="edited">{r.edited}</td>
              <td className={`${td} ${group}`} data-col="leave-h">{formatHours(r.leaveMinutes)}</td>
              <td className={`${td} pe-5`} data-col="leave-d">{r.leaveDay}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
