import Link from "next/link";
import { ar } from "@/i18n/ar";

export function Forbidden({ homeHref }: { homeHref: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8" data-testid="forbidden">
      <div className="text-2xl font-semibold">{ar.nav.forbidden}</div>
      <Link href={homeHref} className="h-10 px-5 inline-flex items-center border border-line rounded-lg bg-surface-0 text-ink font-medium hover:border-indigo-400">
        {ar.nav.home}
      </Link>
    </div>
  );
}
