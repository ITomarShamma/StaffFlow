// One layout per role: session → role check → app bar with that role's navigation.

import type { Role } from "@/domain/types";
import { ar } from "@/i18n/ar";
import { clockInfo } from "@/server/clock";
import { requireRole } from "@/server/session";
import { AppShell } from "./AppShell";
import type { NavItem } from "./NavLinks";

export const NAV: Record<Role, NavItem[]> = {
  agent: [
    { href: "/agent", label: ar.nav.home },
    { href: "/agent/leave", label: ar.nav.leave },
  ],
  team_lead: [
    { href: "/lead", label: ar.nav.board },
    { href: "/lead/requests", label: ar.nav.leaveRequests },
  ],
  branch_manager: [
    { href: "/manager", label: ar.nav.board },
    { href: "/manager/decisions", label: ar.nav.leaveDecisions },
    { href: "/manager/summary", label: ar.nav.dailySummary },
    { href: "/manager/balances", label: ar.nav.leaveBalances },
  ],
};

export async function RoleShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const me = await requireRole(role);
  const clock = await clockInfo();
  return (
    <AppShell user={me.user} nav={NAV[role]} clock={clock}>
      {children}
    </AppShell>
  );
}
