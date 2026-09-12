"use client";

// Change password (decision 2026-09-12): username, current password, new password twice.
// Every refusal is named in Arabic; an unknown user and a wrong password share one message.

import Link from "next/link";
import { useActionState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/domain/password";
import { ar } from "@/i18n/ar";
import { changePassword, type ChangePasswordState } from "@/server/actions/password";

const input = "h-10 px-3 border border-line rounded bg-surface-0 text-ink w-full box-border";
const label = "text-[13px] font-medium text-muted";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(changePassword, { error: null });
  const p = ar.todo.password;
  const message =
    state.error === null
      ? null
      : state.error === "too_short"
        ? p.tooShort(MIN_PASSWORD_LENGTH)
        : state.error === "mismatch"
          ? p.mismatch
          : state.error === "same_as_current"
            ? p.sameAsCurrent
            : ar.nav.wrongCredentials;

  return (
    <form action={action} className="w-full box-border bg-surface-0 rounded-lg p-8 flex flex-col gap-4 shadow-[0_8px_32px_rgba(0,0,0,.35)]" data-testid="password-form">
      <div className="text-lg font-semibold mb-1">{p.title}</div>
      <label className="flex flex-col gap-1.5">
        <span className={label}>{ar.nav.username}</span>
        <input name="username" type="text" autoComplete="username" className={input} required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>{p.current}</span>
        <input name="current" type="password" autoComplete="current-password" className={input} required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>{p.next}</span>
        <input name="next" type="password" autoComplete="new-password" className={input} required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>{p.confirm}</span>
        <input name="confirm" type="password" autoComplete="new-password" className={input} required />
      </label>
      {message && (
        <div className="flex items-center gap-2 text-[13px] font-semibold text-indigo-700 bg-indigo-050 rounded px-2.5 py-2" role="alert">
          <span className="shrink-0 w-4 h-4 rounded-full bg-indigo-600 text-white text-[11px] inline-flex items-center justify-center">!</span>
          <span>{message}</span>
        </div>
      )}
      <button type="submit" disabled={pending} className="h-11 rounded-lg bg-indigo-600 text-white font-semibold mt-1 cursor-pointer hover:bg-indigo-700" data-testid="save-password">
        {p.save}
      </button>
      <Link href="/login" className="self-center text-[13px] font-medium text-indigo-600 hover:underline">
        {p.back}
      </Link>
    </form>
  );
}
