import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const VEHICLE_OPERATIONS_LEAD_HOME_HREF = "/vehicles?workspace=vehicle-operations-lead";

export function BackToVehicleOperationsWorkspace({ className = "workspace-return-link" }: { className?: string }) {
  return (
    <Link className={className} href={VEHICLE_OPERATIONS_LEAD_HOME_HREF}>
      <ArrowLeft size={16} />
      Back to My Workspace
    </Link>
  );
}
