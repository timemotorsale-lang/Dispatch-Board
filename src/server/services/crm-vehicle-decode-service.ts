import type { AuthenticatedUser } from "@/server/auth/store";
import { decodeVinWithNhtsa } from "@/server/vehicle-identification/nhtsa";
import { listVehicleRegistry } from "@/server/vehicle-registry/service";
import { normalizeCanonicalVin } from "@/server/vehicle-registry/domain";
import type { CrmVehicleDecodeResult, DecodeProposal } from "@/lib/crm-vehicle-decode";

export class CrmVehicleDecodeError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function decodeCrmVehicle(actor: AuthenticatedUser | null, input: unknown): Promise<CrmVehicleDecodeResult> {
  if (!actor) throw new CrmVehicleDecodeError("Sign in before decoding a vehicle.", 401);
  const raw = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const vinInput = typeof raw.vin === "string" ? raw.vin.trim().toUpperCase() : "";
  const query = typeof raw.query === "string" ? raw.query.trim() : "";
  if (!vinInput && (!query || query.length > 120)) throw new CrmVehicleDecodeError("Enter a complete VIN or an inventory stock number/search of up to 120 characters.");
  let vin = vinInput;
  if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new CrmVehicleDecodeError("VIN must contain exactly 17 characters without I, O, or Q.");
  if (vin) vin = normalizeCanonicalVin({ vin }).normalized!;
  const modelYear = raw.modelYear == null || raw.modelYear === "" ? undefined : Number(raw.modelYear);
  if (modelYear !== undefined && (!Number.isInteger(modelYear) || modelYear < 1980 || modelYear > new Date().getFullYear() + 2)) throw new CrmVehicleDecodeError("Model year must be a whole year from 1980 through the supported current range.");
  const found = await listVehicleRegistry(actor, { query: vin || query, page: 1, pageSize: 100 });
  const matches = vin ? found.items.filter((item) => (item.vin || item.vinRaw)?.toUpperCase() === vin) : found.items;
  const retrievedAt = new Date().toISOString();
  if (!vin && (matches.length !== 1 || found.total > matches.length)) {
    return { vin: null, candidates: matches.map(({ id, vin, vinRaw, stockNumber, vehicleNumber, year, make, model }) => ({ id, vin: vin || vinRaw, stockNumber, vehicleNumber, year, make, model })), totalMatches: found.total,
      proposals: [], specifications: {}, warnings: [found.total ? "Select the vehicle to decode. Refine the search if more than 100 matches exist." : "No inventory match. Enter the complete VIN from the vehicle."], retrievedAt, provider: null };
  }
  const inventory = matches.length === 1 ? matches[0] : null;
  vin ||= inventory?.vin || inventory?.vinRaw || "";
  if (!vin) throw new CrmVehicleDecodeError("This inventory record has no VIN. Capture the complete VIN from the vehicle.");
  vin = normalizeCanonicalVin({ vin }).normalized!;
  const proposals: DecodeProposal[] = [];
  const add = (field: string, label: string, value: unknown, source: DecodeProposal["source"]) => {
    if (value != null && String(value).trim()) proposals.push({ field, label, value: String(value).trim(), source });
  };
  add("vin", "VIN", vin, inventory ? "Inventory" : "Entered VIN");
  add("stockNumber", "Stock number", inventory?.stockNumber || vin.slice(-6), inventory?.stockNumber ? "Inventory" : "VIN suffix");
  const warnings = matches.length > 1 ? ["Multiple inventory records share this VIN. Review duplicate records."] : [];
  let decode;
  try { decode = await decodeVinWithNhtsa(vin, { modelYear }); }
  catch { warnings.push("NHTSA is unavailable or could not establish the vehicle identity. Inventory values remain available; verify the vehicle manually or retry."); }
  const d = decode?.decoded;
  for (const [field, label, local, remote] of [
    ["year", "Year", inventory?.year, d?.modelYear], ["make", "Make", inventory?.make, d?.make], ["model", "Model", inventory?.model, d?.model]
  ] as const) {
    add(field, label, local ?? remote, local != null ? "Inventory" : "NHTSA vPIC");
    if (local != null && remote != null && String(local).toLowerCase() !== String(remote).toLowerCase()) warnings.push(`${label} differs between inventory (${local}) and NHTSA (${remote}); inventory retained for review.`);
  }
  add("trim", "Trim", d?.trim, "NHTSA vPIC");
  add("bodyStyle", "Body style", d?.bodyClass, "NHTSA vPIC");
  add("bodyType", "Body type", d?.bodyClass, "NHTSA vPIC");
  add("driveTrain", "Drivetrain", d?.driveType, "NHTSA vPIC");
  add("engine", "Engine", d ? [d.displacementLiters ? `${d.displacementLiters}L` : "", d.engineCylinders ? `${d.engineCylinders} cylinders` : "", d.engineConfiguration, d.engineModel].filter(Boolean).join(" / ") : null, "NHTSA vPIC");
  add("transmission", "Transmission", d?.transmissionStyle, "NHTSA vPIC");
  add("color", "Color", inventory?.color, "Inventory");
  add("license", "Plate / license", inventory?.licensePlate, "Inventory");
  add("licensePlate", "Plate / license", inventory?.licensePlate, "Inventory");
  return { vin, candidates: [], totalMatches: matches.length, proposals, specifications: d ? { ...d } : {}, warnings: [...warnings, ...(decode?.warnings || [])], retrievedAt: decode?.retrievedAt || retrievedAt, provider: decode ? "NHTSA_VPIC" : inventory ? "INVENTORY_ONLY" : null };
}
