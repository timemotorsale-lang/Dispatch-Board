import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const SERVICE_ADVISOR_HOME_HREF = "/appointments";

export function BackToServiceAdvisorWorkspace({ className = "advisor-return-link" }: { className?: string }) {
  return (
    <Link className={className} href={SERVICE_ADVISOR_HOME_HREF}>
      <ArrowLeft size={16} />
      Back to My Workspace
    </Link>
  );
}
