"use client";

// Spec §5.6 — General cap 1 / 2 / 3. Picking a new number opens a confirm ("من 2 إلى 3",
// حفظ / إلغاء) so the audit-logged change is deliberate (design decision).

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ar } from "@/i18n/ar";
import { setGeneralCap } from "@/server/actions/cap";

export function CapControl({ cap }: { cap: number }) {
  const [pending, setPending] = useState<number | null>(null);
  const [busy, start] = useTransition();
  const router = useRouter();

  const confirm = () => {
    if (pending == null) return;
    const n = pending;
    start(async () => {
      await setGeneralCap(n);
      setPending(null);
      router.refresh();
    });
  };

  return (
    <div className="ms-auto flex items-center gap-3 relative whitespace-nowrap">
      <span className="text-muted">{ar.breaks.generalCap}</span>
      <div className="flex gap-0.5 border border-line rounded-lg p-0.5 bg-surface-0" role="group" aria-label={ar.breaks.generalCap}>
        {[1, 2, 3].map((n) => {
          const cls = n === cap ? "bg-indigo-600 text-white" : n === pending ? "bg-indigo-050 text-indigo-700" : "bg-transparent text-ink";
          return (
            <button
              key={n}
              type="button"
              onClick={() => setPending(n === cap ? null : n)}
              className={`w-10 h-8 rounded-md text-[15px] font-semibold tabular-nums cursor-pointer ${cls}`}
              aria-pressed={n === cap}
              data-testid={`cap-${n}`}
            >
              {n}
            </button>
          );
        })}
      </div>
      {pending != null && (
        <div className="absolute top-[calc(100%+12px)] end-0 w-[300px] bg-surface-0 text-ink border border-line rounded-lg shadow-[0_8px_24px_rgba(14,16,36,.16)] p-4 flex flex-col gap-3 z-10 whitespace-normal">
          <div className="text-[13px] text-muted">{ar.breaks.generalCap}</div>
          <div className="text-lg font-semibold">
            {ar.leave.from} <span dir="ltr">{cap}</span> {ar.leave.to} <span dir="ltr">{pending}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={busy}
              className="h-9 px-[18px] rounded-lg bg-indigo-600 text-white font-semibold cursor-pointer hover:bg-indigo-700"
              data-testid="cap-save"
            >
              {ar.breaks.save}
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="h-9 px-3.5 border border-line rounded-lg bg-surface-0 font-medium cursor-pointer hover:border-indigo-400"
            >
              {ar.breaks.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
