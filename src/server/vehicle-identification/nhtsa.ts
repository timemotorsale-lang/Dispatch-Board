import { normalizeCanonicalVin } from "@/server/vehicle-registry/domain";

export type VehicleDecode = {
  bodyClass: string | null;
  cabType: string | null;
  displacementLiters: string | null;
  doors: string | null;
  driveType: string | null;
  engineConfiguration: string | null;
  engineCylinders: string | null;
  fuelTypePrimary: string | null;
  fuelTypeSecondary: string | null;
  gvwr: string | null;
  make: string;
  manufacturer: string | null;
  model: string;
  modelYear: number;
  plantCountry: string | null;
  series: string | null;
  transmissionStyle: string | null;
  trim: string | null;
  vehicleType: string | null;
};

export type NhtsaDecodeResult = {
  decoded: VehicleDecode;
  mappingVersion: number;
  provider: "NHTSA_VPIC";
  retrievedAt: string;
  vin: string;
  warnings: string[];
};

type Fetcher = typeof fetch;
type NhtsaRow = Record<string, unknown>;

function value(row: NhtsaRow, key: string) {
  const candidate = row[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

export async function decodeVinWithNhtsa(vinValue: unknown, options: { fetcher?: Fetcher; now?: () => Date } = {}): Promise<NhtsaDecodeResult> {
  const vin = normalizeCanonicalVin({ vin: vinValue }).normalized!;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  try {
    const response = await (options.fetcher ?? fetch)(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`, { headers: { accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new Error(`NHTSA returned HTTP ${response.status}.`);
    const payload = await response.json() as { Results?: NhtsaRow[] };
    const row = payload.Results?.[0];
    if (!row) throw new Error("NHTSA returned no decoded vehicle record.");
    const errorCode = value(row, "ErrorCode") ?? "";
    if (errorCode.split(",").some((code) => !["0", "14"].includes(code.trim()))) throw new Error(value(row, "ErrorText") ?? "NHTSA could not decode this VIN.");
    const make = value(row, "Make"); const model = value(row, "Model"); const modelYear = Number(value(row, "ModelYear"));
    if (!make || !model || !Number.isInteger(modelYear)) throw new Error("NHTSA could not determine the required year, make, and model for this VIN.");
    const warningText = value(row, "AdditionalErrorText");
    return {
      decoded: {
        bodyClass: value(row, "BodyClass"), cabType: value(row, "CabType"), displacementLiters: value(row, "DisplacementL"), doors: value(row, "Doors"), driveType: value(row, "DriveType"),
        engineConfiguration: value(row, "EngineConfiguration"), engineCylinders: value(row, "EngineCylinders"), fuelTypePrimary: value(row, "FuelTypePrimary"), fuelTypeSecondary: value(row, "FuelTypeSecondary"),
        gvwr: value(row, "GrossVehicleWeightRatingFrom"), make, manufacturer: value(row, "Manufacturer"), model, modelYear, plantCountry: value(row, "PlantCountry"), series: value(row, "Series"),
        transmissionStyle: value(row, "TransmissionStyle"), trim: value(row, "Trim"), vehicleType: value(row, "VehicleType")
      },
      mappingVersion: 1, provider: "NHTSA_VPIC", retrievedAt: (options.now ?? (() => new Date()))().toISOString(), vin, warnings: warningText ? [warningText] : []
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("NHTSA VIN decoding timed out. Confirm vehicle details manually or try again.");
    throw error;
  } finally { clearTimeout(timeout); }
}
