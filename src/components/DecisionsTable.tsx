"use client";

// Spec §7.7 — pending rows with «موافقة» / «رفض» and an optional note; approved rows with «سحب الموافقة».

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatHours } from "@/domain/format";
import { ar } from "@/i18n/ar";
import { decideLeave } from "@/server/actions/decisions";
import type { LeaveRowVM } from "@/server/queries";
import { WhenCell, td, tdEdge, th, thEdge } from "./LeaveTables";

export function PendingDecisions({ rows }: { rows: LeaveRowVM[] }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const router = useRouter();

  const decide = (id: string, action: "approve" | "reject") =>
    start(async () => {
      setError(null);
      const r = await decideLeave({ id, action, note: notes[id] ?? "" });
      if (!r.ok) setError(r.error === "exceeds_balance" ? ar.leave.exceedsBalance : ar.todo.notAllowed);
      router.refresh();
    });

  if (rows.length === 0) return <div className="px-6 py-14 text-center text-muted">{ar.leave.noPending}</div>;

  return (
    <>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thEdge}>{ar.leave.requestedBy}</th>
            <th className={th}>{ar.leave.date}</th>
            <th className={th}>{ar.leave.hours}</th>
            <th className={th}>{ar.leave.reason}</th>
            <th className={th}>{ar.leave.remainingBalance}</th>
            <th className={`${th} w-[260px]`}>{ar.leave.decisionNote}</th>
            <th className={thEdge} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-testid="pending-row" data-agent={r.agentName}>
              <td className={`${tdEdge} font-semibold`}>{r.agentName}</td>
              <td className={td}>
                <WhenCell r={r} />
              </td>
              <td className={`${td} tabular-nums`}>{formatHours(r.minutes)}</td>
              <td className={`${td} text-muted`}>{r.reason}</td>
              <td className={`${td} tabular-nums`}>
                <span dir="ltr">{r.remainingDays}</span> {ar.table.day}
              </td>
              <td className={td}>
                <input
                  type="text"
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  placeholder={ar.leave.decisionNote}
                  className="h-9 px-3 border border-line rounded bg-surface-0 text-[13px] w-full box-border"
                  maxLength={500}
                />
              </td>
              <td className={`${tdEdge} whitespace-nowrap text-end`}>
                <div className="inline-flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide(r.id, "approve")}
                    className="h-9 px-4 rounded-lg bg-indigo-600 text-white font-semibold cursor-pointer hover:bg-indigo-700"
                    data-testid="approve"
                  >
                    {ar.leave.approve}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => decide(r.id, "reject")}
                    className="h-9 px-3.5 border border-line rounded-lg bg-surface-0 font-medium cursor-pointer hover:border-indigo-400"
                    data-testid="reject"
                  >
                    {ar.leave.reject}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <div className="px-6 py-3 text-[13px] font-semibold text-indigo-700">{error}</div>}
    </>
  );
}

export function ApprovedDecisions({ rows }: { rows: LeaveRowVM[] }) {
  const [busy, start] = useTransition();
  const router = useRouter();
  const revoke = (id: string) =>
    start(async () => {
      await decideLeave({ id, action: "revoke" });
      router.refresh();
    });

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={thEdge}>{ar.leave.requestedBy}</th>
          <th className={th}>{ar.leave.date}</th>
          <th className={th}>{ar.leave.hours}</th>
          <th className={th}>{ar.leave.reason}</th>
          <th className={th}>{ar.leave.decisionNote}</th>
          <th className={th}>{ar.leave.remainingBalance}</th>
          <th className={thEdge} />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} data-testid="approved-row" data-agent={r.agentName}>
            <td className={`${tdEdge} font-semibold`}>{r.agentName}</td>
            <td className={td}>
              <WhenCell r={r} />
            </td>
            <td className={`${td} tabular-nums`}>{formatHours(r.minutes)}</td>
            <td className={`${td} text-muted`}>{r.reason}</td>
            <td className={`${td} text-muted`}>{r.decisionNote}</td>
            <td className={`${td} tabular-nums`}>
              <span dir="ltr">{r.remainingDays}</span> {ar.table.day}
            </td>
            <td className={`${tdEdge} text-end`}>
              <button
                type="button"
                disabled={busy}
                onClick={() => revoke(r.id)}
                className="h-9 px-3.5 border border-line rounded-lg bg-surface-0 font-medium cursor-pointer hover:border-indigo-400 whitespace-nowrap"
                data-testid="revoke"
              >
                {ar.leave.revoke}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
