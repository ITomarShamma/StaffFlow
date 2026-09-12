// Role gate in front of /agent, /lead and /manager (CLAUDE.md rule 5, spec §7 screen 10).
// The signed cookie decides here so a wrong role gets a real 403; every page and server
// action re-checks the session against the database as well.
//
// The proxy never redirects *away* from /login on the cookie alone (bug 2026-09-12). After
// `npm run db:reset` a browser's cookie is still validly signed but its session is gone:
// the proxy sent /login to the home page, the home page (checking the database) sent it
// back to /login, and every desktop looped until its cookies were deleted by hand. Whether
// a visitor is really signed in is now decided against the database, by the login page.

import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/server/env";
import { SESSION_COOKIE, parseSessionCookie, roleForPath } from "@/server/session-cookie";

export async function proxy(request: NextRequest) {
  const needed = roleForPath(request.nextUrl.pathname);
  if (!needed) return NextResponse.next();
  const session = await parseSessionCookie(request.cookies.get(SESSION_COOKIE)?.value, env.sessionSecret);
  if (!session) return NextResponse.redirect(new URL("/login", request.url));
  if (session.role !== needed) return NextResponse.rewrite(new URL("/403", request.url), { status: 403 });
  return NextResponse.next();
}

export const config = {
  matcher: ["/agent/:path*", "/lead/:path*", "/manager/:path*"],
};
