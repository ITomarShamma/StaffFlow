// The login cookie: `<token>.<role>.<hmac>`. Signed with SESSION_SECRET so proxy.ts can
// gate /agent, /lead and /manager without a database round trip; every page and server
// action still re-checks the session and role in the database (defense in depth).
// Web Crypto only, so this file runs in proxy.ts and in the app alike.

import type { Role } from "@/domain/types";
import { ROLES } from "@/domain/types";

export const SESSION_COOKIE = "sf_session";

const enc = new TextEncoder();

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Buffer.from(sig).toString("base64url");
}

export async function signSessionCookie(token: string, role: Role, secret: string): Promise<string> {
  return `${token}.${role}.${await hmac(secret, `${token}.${role}`)}`;
}

export async function parseSessionCookie(value: string | undefined, secret: string): Promise<{ token: string; role: Role } | null> {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [token, role, sig] = parts as [string, string, string];
  if (!/^[a-f0-9]{48}$/.test(token) || !(ROLES as string[]).includes(role)) return null;
  const expected = await hmac(secret, `${token}.${role}`);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  return { token, role: role as Role };
}

export function homeFor(role: Role): string {
  switch (role) {
    case "agent":
      return "/agent";
    case "team_lead":
      return "/lead";
    case "branch_manager":
      return "/manager";
  }
}

export function roleForPath(pathname: string): Role | null {
  if (pathname === "/agent" || pathname.startsWith("/agent/")) return "agent";
  if (pathname === "/lead" || pathname.startsWith("/lead/")) return "team_lead";
  if (pathname === "/manager" || pathname.startsWith("/manager/")) return "branch_manager";
  return null;
}
