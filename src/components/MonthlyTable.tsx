// Monthly report table (decision 2026-09-12): one row per person, summed over the working
// days of the month, with a team total row at the foot.

import { formatHours } from "@/domain/format";
import { averagePerDay, type MonthlyRow } from "@/domain/summary";
import { ar } from "@/i18n/ar";

const th = "text-start px-3 py-2.5 text-[13px] text-muted bg-surface-2 border-b border-line align-top";
const group = "border-s border-line";
const td = "px-3 py-[11px] border-b border-line tabular-nums";
const tf = "px-3 py-[11px] tabular-nums font-semibold text-indigo-700 bg-indigo-050 border-t-2 border-indigo-600";

function Two({ a, b }: { a: string; b: string }) {
  return (
    <>
      <div className="font-semibold">{a}</div>
      <div className="font-normal">{b}</div>
    </>
  );
}

export function MonthlyTable({ rows }: { rows: MonthlyRow[] }) {
  const s = ar.design.summary;
  const r = ar.todo.reports;
  const sum = (f: (x: MonthlyRow) => number) => rows.reduce((n, x) => n + f(x), 0);
  const budget = sum((x) => x.budgetUsed);
  const days = sum((x) => x.daysAtWork);

  return (
    <div className="bg-surface-0 border border-line rounded-lg overflow-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={`${th} px-5 font-semibold`}>{ar.table.agent}</th>
            <th className={`${th} font-semibold`}>{r.daysAtWork}</th>
            <th className={`${th} font-semibold`}>{r.budgetMinutes}</th>
            <th className={`${th} font-semibold`}>{r.avgPerDay}</th>
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
              <Two a={s.leave} b={r.leaveDays} />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.userId} data-testid="monthly-row" data-agent={x.name}>
              <td className={`${td} px-5 font-semibold whitespace-nowrap`}>{x.name}</td>
              <td className={td} data-col="days">{x.daysAtWork}</td>
              <td className={`${td} font-semibold`} data-col="budget">{x.budgetUsed}</td>
              <td className={td} data-col="avg">{x.avgPerDay}</td>
              <td className={`${td} ${group}`} data-col="smoke-n">{x.smoke.count}</td>
              <td className={td} data-col="smoke-min">{x.smoke.minutes}</td>
              <td className={`${td} ${group}`} data-col="prayer-n">{x.prayer.count}</td>
              <td className={td} data-col="prayer-min">{x.prayer.minutes}</td>
              <td className={`${td} ${group}`} data-col="meal-n">{x.meal.count}</td>
              <td className={td} data-col="meal-min">{x.meal.minutes}</td>
              <td className={`${td} ${group}`} data-col="toilet-n">{x.toiletCount}</td>
              <td className={`${td} ${group}`} data-col="call-n">{x.callCount}</td>
              <td className={`${td} ${group}`} data-col="overruns">{x.overruns}</td>
              <td className={td} data-col="auto">{x.autoEnded}</td>
              <td className={td} data-col="edited">{x.edited}</td>
              <td className={`${td} ${group}`} data-col="leave-h">{formatHours(x.leaveMinutes)}</td>
              <td className={`${td} pe-5`} data-col="leave-d">{x.leaveDays}</td>
            </tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr data-testid="monthly-total">
              <td className={`${tf} px-5`}>{r.total}</td>
              <td className={tf}>{days}</td>
              <td className={tf}>{budget}</td>
              <td className={tf}>{averagePerDay(budget, days)}</td>
              <td className={tf}>{sum((x) => x.smoke.count)}</td>
              <td className={tf}>{sum((x) => x.smoke.minutes)}</td>
              <td className={tf}>{sum((x) => x.prayer.count)}</td>
              <td className={tf}>{sum((x) => x.prayer.minutes)}</td>
              <td className={tf}>{sum((x) => x.meal.count)}</td>
              <td className={tf}>{sum((x) => x.meal.minutes)}</td>
              <td className={tf}>{sum((x) => x.toiletCount)}</td>
              <td className={tf}>{sum((x) => x.callCount)}</td>
              <td className={tf}>{sum((x) => x.overruns)}</td>
              <td className={tf}>{sum((x) => x.autoEnded)}</td>
              <td className={tf}>{sum((x) => x.edited)}</td>
              <td className={tf}>{formatHours(sum((x) => x.leaveMinutes))}</td>
              <td className={`${tf} pe-5`}>{sum((x) => x.leaveDays)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
