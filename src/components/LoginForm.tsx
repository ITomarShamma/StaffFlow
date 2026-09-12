"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ar } from "@/i18n/ar";
import { login, type LoginState } from "@/server/actions/auth";

const input = "h-10 px-3 border border-line rounded bg-surface-0 text-ink w-full box-border";

export function LoginForm({ changed = false }: { changed?: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: false });
  return (
    <form action={action} className="w-full box-border bg-surface-0 rounded-lg p-8 flex flex-col gap-4 shadow-[0_8px_32px_rgba(0,0,0,.35)]" data-testid="login-form">
      <div className="text-lg font-semibold mb-1">{ar.nav.login}</div>
      {changed && !state.error && (
        <div className="text-[13px] font-semibold text-indigo-700 bg-indigo-050 rounded px-2.5 py-2" role="status" data-testid="password-changed">
          {ar.todo.password.changed}
        </div>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted">{ar.nav.username}</span>
        <input name="username" type="text" autoComplete="username" className={input} required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted">{ar.nav.password}</span>
        <input name="password" type="password" autoComplete="current-password" className={input} required />
      </label>
      {state.error && (
        <div className="flex items-center gap-2 text-[13px] font-semibold text-indigo-700 bg-indigo-050 rounded px-2.5 py-2" role="alert">
          <span className="shrink-0 w-4 h-4 rounded-full bg-indigo-600 text-white text-[11px] inline-flex items-center justify-center">!</span>
          <span>{ar.nav.wrongCredentials}</span>
        </div>
      )}
      <button type="submit" disabled={pending} className="h-11 rounded-lg bg-indigo-600 text-white font-semibold mt-1 cursor-pointer hover:bg-indigo-700">
        {ar.nav.signIn}
      </button>
      <Link href="/login/password" className="self-center text-[13px] font-medium text-indigo-600 hover:underline" data-testid="change-password-link">
        {ar.todo.password.link}
      </Link>
    </form>
  );
}
