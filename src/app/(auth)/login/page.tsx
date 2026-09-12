import { redirect } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { LoginBackdrop } from "@/components/LoginBackdrop";
import { LoginForm } from "@/components/LoginForm";
import { ar } from "@/i18n/ar";
import { getCurrentUser } from "@/server/session";
import { homeFor } from "@/server/session-cookie";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ changed?: string }> }) {
  // Someone truly signed in goes straight home. A stale cookie (database reset, password
  // changed) just gets the form: decided against the database, never from the cookie
  // alone, which is what used to loop (bug 2026-09-12).
  const me = await getCurrentUser();
  if (me) redirect(homeFor(me.user.role));
  const { changed } = await searchParams;
  return (
    <div className="fixed inset-0 bg-navy-900 flex items-center justify-center overflow-hidden">
      <LoginBackdrop />
      <div className="relative flex flex-col items-center gap-3.5 w-[400px]">
        <BrandMark size={64} />
        <div dir="ltr" className="text-white text-2xl font-semibold tracking-[.02em] leading-none mb-[18px]">
          {ar.brand}
        </div>
        <LoginForm changed={changed === "1"} />
      </div>
    </div>
  );
}
