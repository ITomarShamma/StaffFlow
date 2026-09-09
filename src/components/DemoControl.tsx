"use client";

// Demo-mode badge («وضع العرض التجريبي»). For the Team Lead and Branch Manager it opens
// the forward-only clock jump (decision Q1). Absent entirely when the multiplier is 1.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ar } from "@/i18n/ar";
import { jumpClock } from "@/server/actions/demo";

export function DemoControl({ canJump }: { canJump: boolean }) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const run = (input: { time: string } | { nextDay: true }) => {
    setError(null);
    start(async () => {
      const r = await jumpClock(input);
      if (!r.ok) setError(r.error === "backward" ? ar.todo.demoJumpBack : ar.todo.checkFields);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  const badge = <span className="border border-line-dark rounded px-1.5 py-px">{ar.nav.demoMode}</span>;
  if (!canJump) return badge;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="cursor-pointer hover:text-white" aria-expanded={open} data-testid="demo-badge">
        {badge}
      </button>
      {open && (
        <div className="absolute top-[calc(100%+12px)] end-0 w-[300px] bg-surface-0 text-ink border border-line rounded-lg shadow-[0_8px_24px_rgba(14,16,36,.16)] p-4 flex flex-col gap-3 z-20">
          <div className="text-[13px] text-muted">{ar.nav.demoMode}</div>
          <div className="flex items-end gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="HH:mm"
              maxLength={5}
              dir="ltr"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-9 px-2.5 border border-line rounded bg-surface-0 text-ink tabular-nums w-[130px]"
              data-testid="demo-time"
            />
            <button
              type="button"
              disabled={pending || !time}
              onClick={() => run({ time })}
              className="h-9 px-3.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:bg-surface-2 disabled:text-disabled disabled:cursor-not-allowed"
              data-testid="demo-jump"
            >
              {ar.todo.demoJumpTo}
            </button>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => run({ nextDay: true })}
            className="h-9 px-3.5 border border-line rounded-lg bg-surface-0 font-medium hover:border-indigo-400 self-start"
            data-testid="demo-next-day"
          >
            {ar.todo.demoNextDay}
          </button>
          {error && <div className="text-[13px] font-semibold text-indigo-700">{error}</div>}
        </div>
      )}
    </div>
  );
}
