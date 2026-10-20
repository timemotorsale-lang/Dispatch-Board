import { CrmNextDealStartView, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCrmNextOperationalCommandCenter } from "@/server/crm-next/read-model";
import { getVehicleJourney } from "@/server/inventory-unit/journey-service";
import { notFound } from "next/navigation";

type CrmNextDealStartPageProps = {
  searchParams?: Promise<{ customerId?: string; pathway?: string; vehicleId?: string; review?: string }>;
};

export default async function CrmNextDealStartPage({ searchParams }: CrmNextDealStartPageProps = {}) {
  const user = await requireCurrentUser();
  const access = resolveCrmNextAccess(user);

  if (!access.allowed) {
    return <CrmNextUnavailable fallbackHref={access.fallbackHref} reason={access.reason} />;
  }

  const resolvedSearchParams = await searchParams;
  const vehicleId = resolvedSearchParams?.vehicleId?.trim();
  const journey = vehicleId ? await getVehicleJourney(user, vehicleId) : null;
  if (vehicleId && !journey) notFound();
  const initialVehicleReference = journey ? [journey.vehicle.year, journey.vehicle.make, journey.vehicle.model, journey.vehicle.vin, journey.vehicle.stockNumber].filter(Boolean).join(" / ") : undefined;
  const initialVehicleFacts = journey ? { year: String(journey.vehicle.year ?? ""), make: journey.vehicle.make ?? "", model: journey.vehicle.model ?? "", vin: journey.vehicle.vin ?? "", stockNumber: journey.vehicle.stockNumber ?? "" } : undefined;
  return <CrmNextDealStartView reviewTestDrive={resolvedSearchParams?.review === "test-drive"} initialCustomerId={resolvedSearchParams?.customerId} initialWorkflowId={resolvedSearchParams?.pathway} initialVehicleReference={initialVehicleReference} initialVehicleFacts={initialVehicleFacts} model={await getCrmNextOperationalCommandCenter(user)} />;
}
