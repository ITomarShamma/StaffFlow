// Role gate in front of /agent, /lead and /manager (CLAUDE.md rule 5, spec §7 screen 10).
// The signed cookie decides here so a wrong role gets a real 403; every page and server
// action re-checks the session against the database as well.

import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/server/env";
import { SESSION_COOKIE, homeFor, parseSessionCookie, roleForPath } from "@/server/session-cookie";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await parseSessionCookie(request.cookies.get(SESSION_COOKIE)?.value, env.sessionSecret);
  const needed = roleForPath(pathname);

  if (needed) {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    if (session.role !== needed) return NextResponse.rewrite(new URL("/403", request.url), { status: 403 });
    return NextResponse.next();
  }

  if (pathname === "/login" && session && request.method === "GET") {
    return NextResponse.redirect(new URL(homeFor(session.role), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/agent/:path*", "/lead/:path*", "/manager/:path*", "/login"],
};
