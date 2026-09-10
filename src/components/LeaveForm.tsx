"use client";

// Spec §7.2 — new leave request. Dates use the browser's calendar picker (decision
// 2026-09-10); times are HH:mm. Validation happens on the server; the two Appendix A
// messages come back as codes. Missing fields only tint the borders (design).

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ar } from "@/i18n/ar";
import { submitLeave, type SubmitLeaveError } from "@/server/actions/leave";

const inputCls = (err: boolean) =>
  `h-10 px-3 border rounded bg-surface-0 text-ink w-full box-border ${err ? "border-indigo-600" : "border-line"}`;
const labelCls = "text-[13px] font-medium text-muted";

export function LeaveForm() {
  const [kind, setKind] = useState<"hourly" | "daily">("hourly");
  const [date, setDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<SubmitLeaveError | null>(null);
  const [busy, start] = useTransition();
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await submitLeave(
        kind === "hourly" ? { kind, date, fromTime: from, toTime: to, reason } : { kind, startDate, endDate, reason },
      );
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setDate("");
      setFrom("");
      setTo("");
      setStartDate("");
      setEndDate("");
      setReason("");
      router.refresh();
    });
  };

  const message = error === "exceeds_balance" ? ar.leave.exceedsBalance : error === "overlaps" ? ar.leave.overlaps : null;
  const tint = error !== null;

  return (
    <form onSubmit={submit} className="bg-surface-0 border border-line rounded-lg px-6 py-5 flex flex-col gap-4" data-testid="leave-form">
      <div className="text-lg font-semibold">{ar.leave.newRequest}</div>
      <div className="flex gap-0.5 border border-line rounded-lg p-0.5 self-start" role="group">
        {(["hourly", "daily"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`h-8 px-4 rounded-md font-medium cursor-pointer ${kind === k ? "bg-indigo-600 text-white" : "bg-transparent text-ink"}`}
            aria-pressed={kind === k}
            data-testid={`kind-${k}`}
          >
            {ar.leave[k]}
          </button>
        ))}
      </div>
      {kind === "hourly" ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>{ar.leave.date}</span>
            <input type="date" dir="ltr" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls(tint)} tabular-nums`} name="date" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>{ar.leave.from}</span>
              <input type="text" inputMode="numeric" placeholder="HH:mm" maxLength={5} dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls(tint)} tabular-nums`} name="from" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>{ar.leave.to}</span>
              <input type="text" inputMode="numeric" placeholder="HH:mm" maxLength={5} dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls(tint)} tabular-nums`} name="to" />
            </label>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>{ar.leave.startDate}</span>
            <input type="date" dir="ltr" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${inputCls(tint)} tabular-nums`} name="startDate" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={labelCls}>{ar.leave.endDate}</span>
            <input type="date" dir="ltr" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={`${inputCls(tint)} tabular-nums`} name="endDate" />
          </label>
        </div>
      )}
      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>{ar.leave.reason}</span>
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls(tint)} name="reason" maxLength={200} />
      </label>
      {message && (
        <div className="flex items-center gap-2 text-[13px] font-semibold text-indigo-700 bg-indigo-050 rounded px-2.5 py-2" role="alert">
          <span className="shrink-0 w-4 h-4 rounded-full bg-indigo-600 text-white text-[11px] inline-flex items-center justify-center">!</span>
          <span>{message}</span>
        </div>
      )}
      <button type="submit" disabled={busy} className="self-start h-10 px-6 rounded-lg bg-indigo-600 text-white font-semibold cursor-pointer hover:bg-indigo-700">
        {ar.leave.submit}
      </button>
    </form>
  );
}
