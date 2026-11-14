import { inventoryVehicleDetails, type DealVehicleChoice } from "./deal-continuity";

/** Use the selected record, never the free-text vehicle display label, for a saved BHPH packet. */
export function bhphDocumentIdentity(context: Record<string, string>, vehicle: DealVehicleChoice | null, mileage: string, savedDetails?: unknown) {
  if (!context.workflowContextId || !context.customerId || !context.customerName) throw new Error("Select the shared customer and save this deal before generating the BHPH packet. Your entries are retained.");
  if (context.pathway !== "bhph") throw new Error("This saved deal is not on the BHPH pathway. Review Change revenue pathway before generating BHPH documents.");
  if (!vehicle || context.vehicleId !== vehicle.id) throw new Error("Select the shared vehicle for this deal before generating the BHPH packet. Your entries are retained.");
  const vin = vehicle.vin.trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new Error("The linked vehicle needs a complete 17-character VIN. Review the shared vehicle record, then retry generation.");
  const details = savedDetails && typeof savedDetails === "object" ? savedDetails as Record<string, unknown> : {};
  const trim = vehicle.trim || (details.vehicleId === vehicle.id && typeof details.trim === "string" ? details.trim : "");
  return { ...context, vehicle: { ...inventoryVehicleDetails(vehicle), vin, trim, license: vehicle.licensePlate, mileage } };
}
