import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { VehiclePortalWorkspace } from "@/features/inventory/vehicle-portal-workspace";
import { getVehiclePortalView } from "@/server/customer-lifecycle/service";

export const dynamic = "force-dynamic";
export default async function VehiclePortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let initial: Awaited<ReturnType<typeof getVehiclePortalView>>;
  try {
    initial = await getVehiclePortalView(token, createHash("sha256").update(`page:${token}`).digest("hex"));
  } catch {
    notFound();
  }
  return <VehiclePortalWorkspace initial={JSON.parse(JSON.stringify(initial))} token={token} />;
}
