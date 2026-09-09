import { RoleShell } from "@/components/RoleShell";

export const dynamic = "force-dynamic";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="agent">{children}</RoleShell>;
}
