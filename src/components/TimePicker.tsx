"use client";

// A time field with a clock face instead of a bare text box (decision 2026-09-10).
// The text input stays real and typable — HH:mm, Western digits, LTR — and the clock
// button opens two wheels, hours and minutes, bounded by the branch's work hours so an
// impossible time cannot be picked at all. No UI kit (CLAUDE.md stack rule).

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { hmToMinutes, isHm, minutesToHm, pad2 } from "@/domain/tz";
import { ar } from "@/i18n/ar";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  /** Earliest selectable time, "HH:mm" — the branch work start. */
  min: string;
  /** Latest selectable time, "HH:mm" — the branch work end. */
  max: string;
  name: string;
  invalid?: boolean;
  /** Minute granularity on the wheel; typing is not restricted to it. */
  step?: number;
  testId?: string;
}

const ROW = 32; // px per wheel row, kept in sync with the row height class below

export function TimePicker({ value, onChange, min, max, name, invalid = false, step = 5, testId }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const hourCol = useRef<HTMLDivElement>(null);
  const minuteCol = useRef<HTMLDivElement>(null);

  const minMin = hmToMinutes(min);
  const maxMin = hmToMinutes(max);
  const selected = isHm(value) ? hmToMinutes(value) : null;
  const selHour = selected == null ? null : Math.floor(selected / 60);
  const selMinute = selected == null ? null : selected % 60;

  const hours: number[] = [];
  for (let h = Math.floor(minMin / 60); h <= Math.floor(maxMin / 60); h++) hours.push(h);

  /** Minutes selectable for an hour, given the work-hour bounds. */
  const minutesFor = useCallback(
    (hour: number): number[] => {
      const out: number[] = [];
      for (let m = 0; m < 60; m += step) {
        const total = hour * 60 + m;
        if (total >= minMin && total <= maxMin) out.push(m);
      }
      return out;
    },
    [minMin, maxMin, step],
  );

  const pickHour = (hour: number) => {
    const allowed = minutesFor(hour);
    if (allowed.length === 0) return;
    const minute = selMinute != null && allowed.includes(selMinute) ? selMinute : allowed[0]!;
    onChange(minutesToHm(hour * 60 + minute));
  };

  const pickMinute = (minute: number) => {
    const hour = selHour ?? Math.floor(minMin / 60);
    onChange(minutesToHm(hour * 60 + minute));
  };

  // Close on an outside click or Escape, the way a native picker behaves.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Bring the current selection into view as the wheels appear.
  useLayoutEffect(() => {
    if (!open) return;
    if (hourCol.current && selHour != null) hourCol.current.scrollTop = Math.max(0, (hours.indexOf(selHour) - 1) * ROW);
    if (minuteCol.current && selMinute != null) {
      const list = minutesFor(selHour ?? Math.floor(minMin / 60));
      minuteCol.current.scrollTop = Math.max(0, (list.indexOf(selMinute) - 1) * ROW);
    }
  }, [open, selHour, selMinute, hours, minutesFor, minMin]);

  const cell = (active: boolean) =>
    `h-8 min-w-11 px-3 rounded font-semibold tabular-nums cursor-pointer border-0 leading-8 text-center ${
      active ? "bg-indigo-600 text-white" : "bg-transparent text-ink hover:bg-indigo-050"
    }`;

  return (
    <div ref={wrap} className="relative">
      <div
        className={`flex items-center h-10 border rounded bg-surface-0 box-border ${invalid ? "border-indigo-600" : "border-line"}`}
      >
        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          placeholder={ar.todo.timePicker.placeholder}
          maxLength={5}
          value={value}
          name={name}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 h-full px-3 bg-transparent border-0 outline-none text-ink tabular-nums text-start"
          data-testid={testId}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={ar.todo.timePicker.open}
          aria-expanded={open}
          className="shrink-0 w-9 h-full inline-flex items-center justify-center bg-transparent border-0 cursor-pointer text-muted hover:text-indigo-600"
          data-testid={testId ? `${testId}-open` : undefined}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="absolute top-[calc(100%+4px)] start-0 z-30 bg-surface-0 border border-line rounded-lg shadow-lg p-2 flex flex-col gap-2"
          data-testid={testId ? `${testId}-popover` : undefined}
        >
          <div className="flex gap-2" dir="ltr">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-medium text-muted">{ar.todo.timePicker.hour}</span>
              <div ref={hourCol} className="h-40 overflow-y-auto flex flex-col gap-0.5 px-0.5">
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => pickHour(h)}
                    disabled={minutesFor(h).length === 0}
                    aria-pressed={selHour === h}
                    className={cell(selHour === h)}
                    data-testid={testId ? `${testId}-h-${pad2(h)}` : undefined}
                  >
                    {pad2(h)}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-px bg-line self-stretch" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-[11px] font-medium text-muted">{ar.todo.timePicker.minute}</span>
              <div ref={minuteCol} className="h-40 overflow-y-auto flex flex-col gap-0.5 px-0.5">
                {minutesFor(selHour ?? Math.floor(minMin / 60)).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => pickMinute(m)}
                    aria-pressed={selMinute === m}
                    className={cell(selMinute === m)}
                    data-testid={testId ? `${testId}-m-${pad2(m)}` : undefined}
                  >
                    {pad2(m)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-8 rounded-md bg-indigo-050 text-indigo-700 font-semibold border-0 cursor-pointer hover:bg-indigo-600 hover:text-white"
            data-testid={testId ? `${testId}-done` : undefined}
          >
            {ar.todo.timePicker.done}
          </button>
        </div>
      )}
    </div>
  );
}
