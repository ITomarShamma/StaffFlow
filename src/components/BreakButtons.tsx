"use client";

// The four break buttons (spec §5.3 step 3): available, or unavailable with one of the
// two neutral labels. While a break runs they grey out with no label. Never a number.

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ButtonState } from "@/domain/sessions";
import type { BreakTypeCode } from "@/domain/types";
import { BREAK_TYPE_CODES } from "@/domain/types";
import { ar } from "@/i18n/ar";
import { startBreak } from "@/server/actions/breaks";

export function BreakButtons({ states }: { states: Record<BreakTypeCode, ButtonState> }) {
  const [busy, start] = useTransition();
  const router = useRouter();

  const click = (code: BreakTypeCode) =>
    start(async () => {
      await startBreak(code);
      router.refresh();
    });

  return (
    <div className="grid grid-cols-2 gap-4">
      {BREAK_TYPE_CODES.map((code, i) => {
        const state = states[code];
        // An odd number of types would leave the last button alone in its row.
        const spanRow = BREAK_TYPE_CODES.length % 2 === 1 && i === BREAK_TYPE_CODES.length - 1;
        const available = state === "available";
        const sub = state === "busy" ? ar.breaks.busy : state === "unavailable" ? ar.breaks.unavailable : null;
        return (
          <button
            key={code}
            type="button"
            disabled={!available || busy}
            onClick={() => click(code)}
            className={`h-28 bg-surface-0 border border-line rounded-lg flex flex-col items-center justify-center gap-1.5 p-0 ${
              spanRow ? "col-span-2" : ""
            } ${available ? "text-ink cursor-pointer hover:border-indigo-400" : "text-disabled cursor-not-allowed"}`}
            data-testid={`break-${code}`}
            data-state={state}
          >
            <span className="text-lg font-semibold">{ar.breaks[code]}</span>
            {sub && <span className="text-[13px] text-muted">{sub}</span>}
          </button>
        );
      })}
    </div>
  );
}
