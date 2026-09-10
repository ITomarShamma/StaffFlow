"use client";

// Spec §7.2 — new leave request. Dates use the browser's calendar picker and times the
// hour/minute wheels (decisions 2026-09-10). Validation is the server's: the domain names
// one cause per refusal, and this form shows that message under the field that caused it,
// so a refused request is never a silent no-op.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ar } from "@/i18n/ar";
import { submitLeave, type SubmitLeaveError } from "@/server/actions/leave";
import { TimePicker } from "./TimePicker";

type Field = "date" | "time" | "startDate" | "endDate" | "range" | "reason" | "form";

/** Which field a refusal belongs to, and the Arabic message for it. */
function explain(error: SubmitLeaveError, workStart: string, workEnd: string): { field: Field; message: string } {
  const e = ar.todo.leaveErrors;
  switch (error) {
    case "date_invalid":
      return { field: "date", message: e.dateInvalid };
    case "time_invalid":
      return { field: "time", message: e.timeInvalid };
    case "time_order":
      return { field: "time", message: e.timeOrder };
    case "outside_work_hours":
      return { field: "time", message: e.outsideWorkHours(workStart, workEnd) };
    case "start_date_invalid":
      return { field: "startDate", message: e.startDateInvalid };
    case "end_date_invalid":
      return { field: "endDate", message: e.endDateInvalid };
    case "date_order":
      return { field: "endDate", message: e.dateOrder };
    case "date_past":
      return { field: "date", message: e.datePast };
    case "start_date_past":
      return { field: "startDate", message: e.startDatePast };
    case "crosses_year":
      return { field: "range", message: e.crossesYear };
    case "reason_required":
      return { field: "reason", message: e.reasonRequired };
    case "reason_too_long":
      return { field: "reason", message: e.reasonTooLong };
    case "exceeds_balance":
      return { field: "form", message: ar.leave.exceedsBalance };
    case "overlaps":
      return { field: "form", message: ar.leave.overlaps };
    case "server_error":
      return { field: "form", message: e.serverError };
  }
}

const labelCls = "text-[13px] font-medium text-muted";
const inputCls = (bad: boolean) =>
  `h-10 px-3 border rounded bg-surface-0 text-ink w-full box-border ${bad ? "border-indigo-600" : "border-line"}`;

function FieldError({ message }: { message: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-indigo-700" role="alert">
      <span className="shrink-0 w-4 h-4 rounded-full bg-indigo-600 text-white text-[11px] inline-flex items-center justify-center">!</span>
      {message}
    </span>
  );
}

export function LeaveForm({ workStart, workEnd, today }: { workStart: string; workEnd: string; today: string }) {
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

  const shown = error ? explain(error, workStart, workEnd) : null;
  const at = (field: Field) => (shown?.field === field ? shown.message : null);

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

  // Switching type clears a message that belonged to the other set of fields.
  const switchKind = (k: "hourly" | "daily") => {
    setKind(k);
    setError(null);
  };

  // The form is `noValidate`: the browser's own constraint bubble would block the submit
  // silently and speak the browser's language. Every refusal comes from the server, in Arabic.
  return (
    <form onSubmit={submit} noValidate className="bg-surface-0 border border-line rounded-lg px-6 py-5 flex flex-col gap-4" data-testid="leave-form">
      <div className="text-lg font-semibold">{ar.leave.newRequest}</div>
      <div className="flex gap-0.5 border border-line rounded-lg p-0.5 self-start" role="group">
        {(["hourly", "daily"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => switchKind(k)}
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
            <input
              type="date"
              dir="ltr"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputCls(at("date") !== null)} tabular-nums`}
              name="date"
            />
            {at("date") && <FieldError message={at("date")!} />}
          </label>
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>{ar.leave.from}</span>
                <TimePicker value={from} onChange={setFrom} min={workStart} max={workEnd} name="from" invalid={at("time") !== null} testId="from" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>{ar.leave.to}</span>
                <TimePicker value={to} onChange={setTo} min={workStart} max={workEnd} name="to" invalid={at("time") !== null} testId="to" />
              </label>
            </div>
            {at("time") && <FieldError message={at("time")!} />}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>{ar.leave.startDate}</span>
              <input
                type="date"
                dir="ltr"
                value={startDate}
                min={today}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${inputCls(at("startDate") !== null || at("range") !== null)} tabular-nums`}
                name="startDate"
              />
              {at("startDate") && <FieldError message={at("startDate")!} />}
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={labelCls}>{ar.leave.endDate}</span>
              <input
                type="date"
                dir="ltr"
                value={endDate}
                min={startDate || today}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${inputCls(at("endDate") !== null || at("range") !== null)} tabular-nums`}
                name="endDate"
              />
              {at("endDate") && <FieldError message={at("endDate")!} />}
            </label>
          </div>
          {at("range") && <FieldError message={at("range")!} />}
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className={labelCls}>{ar.leave.reason}</span>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={inputCls(at("reason") !== null)}
          name="reason"
          maxLength={200}
        />
        {at("reason") && <FieldError message={at("reason")!} />}
      </label>

      {at("form") && (
        <div className="flex items-center gap-2 text-[13px] font-semibold text-indigo-700 bg-indigo-050 rounded px-2.5 py-2" role="alert">
          <span className="shrink-0 w-4 h-4 rounded-full bg-indigo-600 text-white text-[11px] inline-flex items-center justify-center">!</span>
          <span>{at("form")}</span>
        </div>
      )}

      <button type="submit" disabled={busy} className="self-start h-10 px-6 rounded-lg bg-indigo-600 text-white font-semibold cursor-pointer hover:bg-indigo-700">
        {ar.leave.submit}
      </button>
    </form>
  );
}
