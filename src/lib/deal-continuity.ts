export type DealCustomerChoice = {
  id: string; name: string; customerNumber: string; phone: string; email: string;
  dealPrefill?: { address?: string; dateOfBirth?: string; idLast4?: string; idState?: string; idType?: string; ssnLast4?: string };
};
export type DealVehicleChoice = {
  id: string; label: string; vin: string; stockNumber: string; inventoryUnitId: string | null;
  year: string; make: string; model: string; color: string; licensePlate: string; locationId: string | null;
  availability: string; eligibleForUse: boolean;
};
export type DealIdentity = { customerId: string; vehicleId: string; inventoryUnitId: string | null; sourceDraftId?: string; sourceJacketId?: string; sourceVehicleId?: string; vehicle?: DealVehicleChoice | null };
export const emptyDealIdentity: DealIdentity = { customerId: "", vehicleId: "", inventoryUnitId: null, sourceDraftId: "", sourceJacketId: "", sourceVehicleId: "", vehicle: null };
export function vehicleUseOverlaps(existing: { status: string; startsAt: Date; expectedReturnAt: Date }, startsAt: Date, endsAt: Date) {
  return existing.status === "CHECKED_OUT" || (existing.status === "RESERVED" && existing.startsAt < endsAt && existing.expectedReturnAt > startsAt);
}
export function normalizeVehicleUseCommand(raw: Record<string, unknown>) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Enter a valid vehicle-use request.");
  const action = String(raw.action ?? "");
  if (!["RESERVE", "HANDOFF", "RETURN", "EXTEND", "CANCEL"].includes(action)) throw new Error("Choose a supported vehicle-use action.");
  const operationKey = String(raw.operationKey ?? "").trim();
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(operationKey)) throw new Error("A stable request reference is required.");
  const reason = String(raw.reason ?? "").trim();
  if (!reason || reason.length > 500) throw new Error("Enter a brief reason, up to 500 characters.");
  const parse = (value: unknown, label: string) => { const result = new Date(String(value ?? "")); if (Number.isNaN(result.getTime())) throw new Error(`Enter a valid ${label}.`); return result; };
  const startsAt = action === "RESERVE" ? parse(raw.startsAt, "pickup time") : null;
  const expectedReturnAt = ["RESERVE", "EXTEND"].includes(action) ? parse(raw.expectedReturnAt, "expected return time") : null;
  if (startsAt && expectedReturnAt && expectedReturnAt <= startsAt) throw new Error("Expected return must follow pickup.");
  const occurredAt = ["HANDOFF", "RETURN"].includes(action) ? parse(raw.occurredAt, "handoff / return time") : null;
  if (occurredAt && occurredAt.getTime() > Date.now() + 60000) throw new Error("Actual handoff / return cannot be in the future.");
  const evidence = Array.isArray(raw.evidence) ? raw.evidence.filter((value): value is string => typeof value === "string").map(value => value.trim()).filter(Boolean).slice(0, 20) : [];
  const odometer = raw.odometer === "" || raw.odometer == null ? null : Number(raw.odometer);
  if (occurredAt && (raw.keysVerified !== true || !evidence.length || odometer == null || !Number.isSafeInteger(odometer) || odometer < 0 || !String(raw.condition ?? "").trim() || !String(raw.fuel ?? "").trim() || !String(raw.recipient ?? "").trim())) throw new Error("Record actual mileage, fuel, condition, recipient, verified keys and evidence.");
  if (action === "HANDOFF" && raw.driverVerified !== true) throw new Error("Verify the current driver and applicable coverage before handoff.");
  if (action !== "RESERVE" && (!String(raw.bookingId ?? "").trim() || !Number.isSafeInteger(Number(raw.expectedVersion)) || Number(raw.expectedVersion) < 1)) throw new Error("Reload the assignment before recording this action.");
  return { action, operationKey, reason, startsAt, expectedReturnAt, occurredAt, bookingId: String(raw.bookingId ?? ""), expectedVersion: action === "RESERVE" ? 0 : Number(raw.expectedVersion), agreementJacketId: String(raw.agreementJacketId ?? ""), evidence, odometer, fuel: String(raw.fuel ?? "").trim().slice(0, 100), condition: String(raw.condition ?? "").trim().slice(0, 1000), recipient: String(raw.recipient ?? "").trim().slice(0, 200), keysVerified: raw.keysVerified === true, driverVerified: raw.driverVerified === true };
}
