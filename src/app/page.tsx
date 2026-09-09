import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/session";
import { homeFor } from "@/server/session-cookie";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const me = await getCurrentUser();
  redirect(me ? homeFor(me.user.role) : "/login");
}
