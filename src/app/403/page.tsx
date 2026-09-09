import { AppShell } from "@/components/AppShell";
import { Forbidden } from "@/components/Forbidden";
import { NAV } from "@/components/RoleShell";
import { clockInfo } from "@/server/clock";
import { getCurrentUser } from "@/server/session";
import { homeFor } from "@/server/session-cookie";

export const dynamic = "force-dynamic";

export default async function ForbiddenPage() {
  const me = await getCurrentUser();
  if (!me) return <Forbidden homeHref="/login" />;
  const clock = await clockInfo();
  return (
    <AppShell user={me.user} nav={NAV[me.user.role]} clock={clock}>
      <Forbidden homeHref={homeFor(me.user.role)} />
    </AppShell>
  );
}
