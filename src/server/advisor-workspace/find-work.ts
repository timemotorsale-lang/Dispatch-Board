import { repairReviewHref } from "@/lib/repair-workflow-review";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getRepairOrderCreateOptions, listRepairOrders } from "@/server/repair-order/service";
import { getVehicleIntake } from "@/server/inventory-unit/intake-service";
import { isValidVin } from "@/server/vehicle-registry/domain";

type Dependencies = {
  reviewWorkflow?: boolean;
  options?: typeof getRepairOrderCreateOptions;
  orders?: typeof listRepairOrders;
  intake?: typeof getVehicleIntake;
};
export type AdvisorWorkMatch = { label: string; href: string };
const home = "/vehicles/recon-repair-advisor";
const planning = (vehicleId: string, repairOrderId?: string) => repairOrderId
  ? `/vehicles/shop-planning?${new URLSearchParams({ repairOrderId, returnTo: home })}`
  : `/vehicles/${encodeURIComponent(vehicleId)}/inventory-planning`;

export async function findAdvisorWork(actor: AuthenticatedUser, value: string, input: Dependencies = {}) {
  const search = value.trim().slice(0, 120);
  if (!search) return { matches: [] as AdvisorWorkMatch[], message: "Enter a VIN, stock number, vehicle or RO to find work." };
  const options = await (input.options ?? getRepairOrderCreateOptions)(actor);
  const normalized = search.toUpperCase();
  const vehicleLabel = (vehicle: typeof options.vehicles[number]) => [vehicle.year, vehicle.make, vehicle.model, vehicle.stockNumber ?? vehicle.vehicleNumber, vehicle.vin].filter(Boolean).join(" · ");
  const identifiers = (vehicle: typeof options.vehicles[number]) => [vehicle.vin, vehicle.stockNumber, vehicle.vehicleNumber, ...options.inventoryUnits.filter(unit => unit.vehicle.id === vehicle.id).map(unit => unit.inventoryNumber)].filter(Boolean).map(value => value!.toUpperCase());
  const exact = options.vehicles.filter(vehicle => identifiers(vehicle).includes(normalized));
  const vehicles = exact.length ? exact : options.vehicles.filter(vehicle => `${vehicleLabel(vehicle)} ${identifiers(vehicle).join(" ")}`.toUpperCase().includes(normalized));
  if (vehicles.length) {
    const matches: AdvisorWorkMatch[] = [];
    for (const vehicle of vehicles.slice(0, 20)) {
      const orders = await (input.orders ?? listRepairOrders)(actor, { vehicleId: vehicle.id, page: 1, pageSize: 100 });
      const open = orders.items.filter(order => !order.closedAt);
      if (open.length) {
        matches.push(...open.map(order => ({ label: `${order.repairOrderNumber} · ${vehicleLabel(vehicle)}`, href: input.reviewWorkflow ? repairReviewHref(order.id) : planning(vehicle.id, order.id) })));
      } else {
        try {
          const intake = await (input.intake ?? getVehicleIntake)(actor, vehicle.id);
          matches.push({ label: vehicleLabel(vehicle), href: input.reviewWorkflow ? `/prototype/inventory-intake?${new URLSearchParams({ vehicleId: vehicle.id, advisor: "1", reviewWorkbench: "1" })}` : intake.unit ? planning(vehicle.id) : `/prototype/inventory-intake?${new URLSearchParams({ vehicleId: vehicle.id, advisor: "1" })}` });
        } catch {
          continue;
        }
      }
    }
    return { matches, message: matches.length ? "Choose the vehicle or open repair order." : "No accessible planning or intake record was found. Check your location access." };
  }
  const orders = await (input.orders ?? listRepairOrders)(actor, { query: search, page: 1, pageSize: 25 });
  const matches = orders.items.filter(order => !order.closedAt).map(order => ({ label: `${order.repairOrderNumber} · ${vehicleLabel(order.vehicle)}`, href: input.reviewWorkflow ? repairReviewHref(order.id) : planning(order.vehicle.id, order.id) }));
  if (!matches.length && isValidVin(normalized)) return { matches: [{ label: `Intake · ${normalized}`, href: `/prototype/inventory-intake?${new URLSearchParams({ vin: normalized, advisor: "1", ...(input.reviewWorkflow ? { reviewWorkbench: "1" } : {}) })}` }], message: "Review this VIN in compact intake." };
  return { matches, message: matches.length ? "Choose the open repair order." : "No matching work found. Check the VIN or stock number, or start vehicle intake." };
}
