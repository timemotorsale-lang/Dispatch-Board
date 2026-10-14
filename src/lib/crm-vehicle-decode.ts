export type DecodeCandidate = { id: string; vin: string | null; stockNumber: string | null; vehicleNumber: string; year: number | null; make: string | null; model: string | null };
export type DecodeProposal = { field: string; label: string; value: string; source: "Inventory" | "NHTSA vPIC" | "VIN suffix" | "Entered VIN" };
export type CrmVehicleDecodeResult = {
  vin: string | null;
  candidates: DecodeCandidate[];
  totalMatches: number;
  proposals: DecodeProposal[];
  specifications: Record<string, string | number | null | undefined>;
  warnings: string[];
  retrievedAt: string;
  provider: "NHTSA_VPIC" | "INVENTORY_ONLY" | null;
};

export const VIN_SPECIFICATION_GROUPS = [
  { label: "Identity and build", fields: { modelYear: "Model year", make: "Make", model: "Model", trim: "Trim", series: "Series", manufacturer: "Manufacturer", vehicleType: "Vehicle type", bodyClass: "Body class", cabType: "Cab type", doors: "Doors", seats: "Seats", seatRows: "Seat rows", gvwr: "GVWR", plantCountry: "Plant country", plantCity: "Plant city", plantState: "Plant state" } },
  { label: "Powertrain", fields: { engineModel: "Engine model", displacementLiters: "Displacement (L)", engineCylinders: "Cylinders", engineConfiguration: "Engine configuration", horsepower: "Horsepower", driveType: "Drive type", transmissionStyle: "Transmission", transmissionSpeeds: "Transmission speeds", fuelTypePrimary: "Primary fuel", fuelTypeSecondary: "Secondary fuel", electrificationLevel: "Electrification", batteryKWh: "Battery (kWh)" } },
  { label: "Safety equipment", fields: { abs: "ABS", electronicStabilityControl: "Stability control", airbagsFront: "Front airbags", airbagsSide: "Side airbags", airbagsCurtain: "Curtain airbags" } }
];

export function applicableDecodeProposals(proposals: DecodeProposal[], fields: Record<string, string>) {
  return proposals.filter((proposal) => proposal.field in fields && proposal.value && fields[proposal.field] !== proposal.value);
}

export function emptyFieldDecodeProposals(proposals: DecodeProposal[], fields: Record<string, string>) {
  return applicableDecodeProposals(proposals, fields).filter((proposal) => canAutoFill(proposal.field, fields));
}

export function fillEmptyDecodeFields<T extends Record<string, string>>(fields: T, values: Record<string, string>): T {
  const next = { ...fields };
  for (const [field, value] of Object.entries(values)) {
    if (field in next && canAutoFill(field, next)) next[field as keyof T] = value as T[keyof T];
  }
  return next;
}

function canAutoFill(field: string, fields: Record<string, string>) {
  const current = fields[field]?.trim();
  return !current || field === "stockNumber" && /^[A-HJ-NPR-Z0-9]{17}$/.test(fields.vin ?? "") && current === fields.vin.slice(-6);
}
