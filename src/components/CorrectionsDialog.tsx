"use client";

// Spec §7.4 — the Team Lead's corrections dialog for one agent: today's sessions with
// flags; edit end time or void, each with a required note. Voided rows stay, struck through.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { hhmm, mmss } from "@/domain/format";
import { ar } from "@/i18n/ar";
import { editSessionEnd, voidBreakSession, type CorrectionError } from "@/server/actions/corrections";
import type { CorrectionRowVM } from "@/server/queries";
import { FlagChip } from "./Chips";
import { TimePicker } from "./TimePicker";
import { useLiveNow } from "./useLiveNow";

const flagLabel: Record<CorrectionRowVM["flags"][number], string> = {
  overrun: ar.status.overrun,
  autoEnded: ar.breaks.autoEnded,
  stale: ar.breaks.stale,
  endOfDay: ar.breaks.endOfDay,
  edited: ar.breaks.edited,
};

const grid = "grid grid-cols-[minmax(150px,1.1fr)_76px_76px_76px_minmax(0,2fr)] gap-3";

function errorText(e: CorrectionError): string {
  switch (e) {
    case "note_required":
      return ar.breaks.noteRequired;
    case "too_old":
      return ar.todo.correctionTooOld;
    case "open":
      return ar.todo.correctionOpen;
    case "voided":
      return ar.todo.correctionVoided;
    case "end_before_start":
    case "end_in_future":
      return ar.todo.invalidEndTime;
    default:
      return ar.todo.checkFields;
  }
}

export function CorrectionsDialog({
  agentName,
  rows,
  budgetUsed,
  budget,
  nowMs,
  multiplier,
  closeHref,
  workStart,
  workEnd,
}: {
  agentName: string;
  rows: CorrectionRowVM[];
  budgetUsed: number;
  budget: number;
  nowMs: number;
  multiplier: number;
  closeHref: string;
  workStart: string;
  workEnd: string;
}) {
  const live = useLiveNow(nowMs, multiplier);
  const [edit, setEdit] = useState<{ id: string; mode: "edit" | "void"; end: string; note: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const router = useRouter();

  const canSave = !!edit && edit.note.trim().length > 0 && (edit.mode === "void" || /^\d{2}:\d{2}$/.test(edit.end));

  const save = () => {
    if (!edit || !canSave) return;
    setError(null);
    start(async () => {
      const r =
        edit.mode === "edit"
          ? await editSessionEnd({ sessionId: edit.id, endTime: edit.end, note: edit.note })
          : await voidBreakSession({ sessionId: edit.id, note: edit.note });
      if (!r.ok) {
        setError(errorText(r.error));
        return;
      }
      setEdit(null);
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 bg-navy-900/45 flex items-center justify-center z-20 text-ink" role="dialog" aria-modal="true" data-testid="corrections-dialog">
      <div className="w-[920px] max-h-[760px] bg-surface-0 rounded-lg shadow-[0_16px_48px_rgba(14,16,36,.3)] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between px-6 pt-5 pb-3 gap-4">
          <div>
            <div className="text-[13px] font-medium text-muted">{ar.nav.corrections}</div>
            <div className="text-2xl font-semibold leading-[1.2]">{agentName}</div>
          </div>
          <button
            type="button"
            aria-label={ar.design.closeDialog}
            onClick={() => router.push(closeHref)}
            className="w-9 h-9 border border-line rounded-lg bg-surface-0 text-muted text-lg leading-none cursor-pointer hover:border-indigo-400"
            data-testid="close-corrections"
          >
            ×
          </button>
        </div>
        <div className="px-6 pb-2 text-lg font-semibold">{ar.breaks.todaySessions}</div>
        {rows.length === 0 ? (
          <div className="px-6 pt-12 pb-14 text-center text-muted">{ar.breaks.noSessionsToday}</div>
        ) : (
          <>
            <div className={`${grid} px-6 py-2 bg-surface-2 border-y border-line text-[13px] font-semibold text-muted`}>
              <span />
              <span>{ar.breaks.start}</span>
              <span>{ar.breaks.end}</span>
              <span>{ar.breaks.duration}</span>
              <span />
            </div>
            <div className="overflow-y-auto overflow-x-hidden flex flex-col">
              {rows.map((s) => {
                const editing = edit?.id === s.id;
                const durationSec = ((s.endMs ?? live) - s.startMs) / 1000;
                return (
                  <div key={s.id} className={`border-b border-line px-6 py-3 flex flex-col gap-3 ${s.voided ? "opacity-50" : ""}`} data-testid="correction-row" data-voided={s.voided}>
                    <div className={`${grid} items-center`}>
                      <span className={`font-semibold ${s.voided ? "line-through" : ""}`}>{ar.breaks[s.typeCode]}</span>
                      <span dir="ltr" className="tabular-nums text-right">
                        {hhmm(new Date(s.startMs))}
                      </span>
                      <span dir="ltr" className="tabular-nums text-right">
                        {s.endMs == null ? "—" : hhmm(new Date(s.endMs))}
                      </span>
                      <span dir="ltr" className="tabular-nums text-right">
                        {mmss(durationSec)}
                      </span>
                      <div className="flex items-center justify-between gap-2 min-w-0 flex-wrap">
                        <div className="flex gap-1.5 flex-wrap">
                          {s.flags.map((f) => (
                            <FlagChip key={f} label={flagLabel[f]} />
                          ))}
                        </div>
                        {s.canAct && !editing && (
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setEdit({ id: s.id, mode: "edit", end: s.endMs ? hhmm(new Date(s.endMs)) : "", note: "" })}
                              className="h-8 px-2.5 border border-line rounded-lg bg-surface-0 text-[13px] font-medium cursor-pointer hover:border-indigo-400 whitespace-nowrap"
                              data-testid="edit-end"
                            >
                              {ar.breaks.editEnd}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEdit({ id: s.id, mode: "void", end: "", note: "" })}
                              className="h-8 px-2.5 border border-line rounded-lg bg-surface-0 text-[13px] font-medium cursor-pointer hover:border-indigo-400 whitespace-nowrap"
                              data-testid="void-session"
                            >
                              {ar.breaks.voidSession}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {editing && edit && (
                      <div className="flex items-end gap-3 bg-surface-1 border border-line rounded-lg px-4 py-3">
                        {edit.mode === "edit" && (
                          <label className="flex flex-col gap-1.5 w-[130px]">
                            <span className="text-[13px] font-medium text-muted">{ar.breaks.end}</span>
                            <TimePicker
                              value={edit.end}
                              onChange={(end) => setEdit({ ...edit, end })}
                              min={workStart}
                              max={workEnd}
                              name="end-time"
                              step={1}
                              testId="end-time"
                            />
                          </label>
                        )}
                        <label className="flex flex-col gap-1.5 flex-1">
                          <span className="text-[13px] font-medium text-muted">{ar.breaks.noteRequired}</span>
                          <input
                            type="text"
                            value={edit.note}
                            onChange={(e) => setEdit({ ...edit, note: e.target.value })}
                            className="h-9 px-3 border border-line rounded bg-surface-0 w-full box-border"
                            maxLength={500}
                            data-testid="note"
                          />
                        </label>
                        <button
                          type="button"
                          disabled={!canSave || busy}
                          onClick={save}
                          className={`h-9 px-[18px] rounded-lg font-semibold ${canSave ? "bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700" : "bg-surface-2 text-disabled cursor-not-allowed"}`}
                          data-testid="save-correction"
                        >
                          {ar.breaks.save}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEdit(null);
                            setError(null);
                          }}
                          className="h-9 px-3.5 border border-line rounded-lg bg-surface-0 font-medium cursor-pointer hover:border-indigo-400"
                        >
                          {ar.breaks.cancel}
                        </button>
                      </div>
                    )}
                    {editing && error && <div className="text-[13px] font-semibold text-indigo-700">{error}</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}
        <div className="px-6 py-3 bg-surface-1 border-t border-line text-[13px] text-muted flex justify-between">
          <span>{ar.breaks.budgetUsed}</span>
          <span dir="ltr" className="tabular-nums font-semibold text-ink" data-testid="correction-budget">
            {budgetUsed} / {budget}
          </span>
        </div>
      </div>
    </div>
  );
}
