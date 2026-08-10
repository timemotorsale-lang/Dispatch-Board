import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const SERVICE_ADVISOR_HOME_HREF = "/vehicles/advisor";

export function BackToServiceAdvisorWorkspace({ className = "advisor-return-link", href = SERVICE_ADVISOR_HOME_HREF, label = "Back to My Workspace" }: { className?: string; href?: string; label?: string }) {
  return (
    <Link className={className} href={href}>
      <ArrowLeft size={16} />
      {label}
    </Link>
  );
}
