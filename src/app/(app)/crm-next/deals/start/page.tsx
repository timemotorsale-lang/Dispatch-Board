import { CrmNextDealStartView, CrmNextUnavailable } from "@/features/crm-next/crm-next-shell";
import { requireCurrentUser } from "@/server/auth/current-user";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { getCrmNextOperationalCommandCenter } from "@/server/crm-next/read-model";
import { getVehicleJourney } from "@/server/inventory-unit/journey-service";
import { searchDealCustomers } from "@/server/deal-continuity/identities";
import type { DealCustomerList } from "@/lib/deal-continuity";
import { notFound } from "next/navigation";
import { canUseOwnDeals } from "@/server/policies/access";

type CrmNextDealStartPageProps = {
  searchParams?: Promise<{ customerId?: string; pathway?: string; vehicleId?: string; review?: string }>;
};

export default async function CrmNextDealStartPage({ searchParams }: CrmNextDealStartPageProps = {}) {
  const user = await requireCurrentUser();
  if (!canUseOwnDeals(user)) return <p role="alert">Deals access is restricted for your account. Contact the General Manager.</p>;
  const access = resolveCrmNextAccess(user, { ownDeals: true });

  if (!access.allowed) {
    return <CrmNextUnavailable fallbackHref={access.fallbackHref} reason={access.reason} />;
  }

  const resolvedSearchParams = await searchParams;
  const vehicleId = resolvedSearchParams?.vehicleId?.trim();
  const journey = vehicleId ? await getVehicleJourney(user, vehicleId) : null;
  if (vehicleId && !journey) notFound();
  const initialVehicleReference = journey ? [journey.vehicle.year, journey.vehicle.make, journey.vehicle.model, journey.vehicle.vin, journey.vehicle.stockNumber].filter(Boolean).join(" / ") : undefined;
  const initialVehicleFacts = journey ? { year: String(journey.vehicle.year ?? ""), make: journey.vehicle.make ?? "", model: journey.vehicle.model ?? "", vin: journey.vehicle.vin ?? "", stockNumber: journey.vehicle.stockNumber ?? "" } : undefined;
  const [model, initialCustomerList] = await Promise.all([
    getCrmNextOperationalCommandCenter(user),
    searchDealCustomers(user, new URLSearchParams()).catch((): DealCustomerList => ({
      items: [], nextCursor: null, error: "The customer list could not be loaded. Choose Find customer to retry; your deal entries are retained."
    }))
  ]);
  return <CrmNextDealStartView initialCustomerList={initialCustomerList} reviewTestDrive={resolvedSearchParams?.review === "test-drive"} initialCustomerId={resolvedSearchParams?.customerId} initialWorkflowId={resolvedSearchParams?.pathway} initialVehicleReference={initialVehicleReference} initialVehicleFacts={initialVehicleFacts} model={model} />;
}
