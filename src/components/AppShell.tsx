// The navy app bar (design: 56 px, mark + wordmark, nav, demo badge + clock, user, logout)
// and the light content area below it.

import { ar } from "@/i18n/ar";
import { logout } from "@/server/actions/auth";
import type { ClockInfo } from "@/server/clock";
import type { AppUser } from "@/server/mappers";
import { BrandMark } from "./BrandMark";
import { DemoControl } from "./DemoControl";
import { LiveClock } from "./LiveClock";
import { NavLinks, type NavItem } from "./NavLinks";

export function AppShell({ user, nav, clock, children }: { user: AppUser; nav: NavItem[]; clock: ClockInfo; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 shrink-0 bg-navy-900 flex items-center px-8 gap-7 box-border">
        <div className="flex items-center gap-2.5">
          <BrandMark size={28} />
          <span dir="ltr" className="text-white text-lg font-semibold tracking-[.02em]">
            {ar.brand}
          </span>
        </div>
        <NavLinks items={nav} />
        <div className="ms-auto flex items-center gap-5">
          <div className="flex items-center gap-2 text-disabled text-[13px]">
            {clock.demo && <DemoControl canJump={user.role !== "agent"} />}
            <LiveClock nowMs={clock.nowMs} multiplier={clock.multiplier} />
          </div>
          <div className="flex flex-col items-start leading-[1.2]">
            <span className="text-white font-medium">{user.nameAr}</span>
            {user.role === "agent" && <span className="text-disabled text-xs">{ar.roles[user.role]}</span>}
          </div>
          <form action={logout}>
            <button type="submit" className="text-disabled text-[13px] cursor-pointer hover:text-white">
              {ar.nav.logout}
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 min-h-0 flex flex-col">{children}</main>
    </div>
  );
}
