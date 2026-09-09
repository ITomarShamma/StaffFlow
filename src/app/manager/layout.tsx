import { RoleShell } from "@/components/RoleShell";

export const dynamic = "force-dynamic";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="branch_manager">{children}</RoleShell>;
}
