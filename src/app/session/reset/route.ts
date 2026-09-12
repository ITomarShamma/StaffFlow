// Deletes a login cookie whose session no longer exists (bug 2026-09-12), then shows the
// login form. requireRole sends a browser here when its cookie is validly signed but the
// database has no session for it: after `npm run db:reset`, a password change or a
// disabled account. A session that is still valid is sent home untouched, so this address
// can never be used to sign someone out.

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/session";
import { SESSION_COOKIE, homeFor } from "@/server/session-cookie";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const me = await getCurrentUser();
  if (me) return NextResponse.redirect(new URL(homeFor(me.user.role), request.url));
  const res = NextResponse.redirect(new URL("/login", request.url));
  // Same path and flags as when it was set, so the browser really drops it.
  res.cookies.set(SESSION_COOKIE, "", { path: "/", expires: new Date(0), httpOnly: true, sameSite: "lax" });
  return res;
}
