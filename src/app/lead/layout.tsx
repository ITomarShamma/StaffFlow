import { RoleShell } from "@/components/RoleShell";

export const dynamic = "force-dynamic";

export default function LeadLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="team_lead">{children}</RoleShell>;
}
