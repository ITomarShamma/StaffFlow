"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ar } from "@/i18n/ar";
import { cancelLeave } from "@/server/actions/leave";

export function CancelLeaveButton({ id }: { id: string }) {
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() =>
        start(async () => {
          await cancelLeave(id);
          router.refresh();
        })
      }
      className="h-8 px-3 border border-line rounded-lg bg-surface-0 text-[13px] font-medium cursor-pointer hover:border-indigo-400"
    >
      {ar.breaks.cancel}
    </button>
  );
}
