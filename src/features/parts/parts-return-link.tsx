import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const PARTS_STAFF_HOME_HREF = "/vehicles/parts-operations";

export function BackToPartsWorkspace({ className = "parts-return-link" }: { className?: string }) {
  return (
    <Link className={className} href={PARTS_STAFF_HOME_HREF}>
      <ArrowLeft size={16} />
      Back to My Workspace
    </Link>
  );
}
