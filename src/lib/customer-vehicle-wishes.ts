export const vehicleWishFields = [
  { key: "year", label: "Year", placeholder: "2022", inputMode: "numeric", maxLength: 4 },
  { key: "make", label: "Make", placeholder: "Toyota", maxLength: 60 },
  { key: "model", label: "Model", placeholder: "Camry", maxLength: 60 },
  { key: "color", label: "Color", placeholder: "Blue", maxLength: 60 },
  { key: "maxPrice", label: "Max price ($)", placeholder: "25000", inputMode: "decimal", maxLength: 12 },
  { key: "monthlyPayment", label: "Target monthly payment ($)", placeholder: "400", inputMode: "decimal", maxLength: 12 }
] as const;

export type VehicleWishDraft = Record<(typeof vehicleWishFields)[number]["key"], string>;
export const emptyVehicleWish: VehicleWishDraft = { year: "", make: "", model: "", color: "", maxPrice: "", monthlyPayment: "" };

function parseMoney(value: string) {
  if (!value) return null;
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new Error("Enter prices and payments in dollars with up to two decimal places, without commas.");
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (cents <= 0) throw new Error("Price and monthly payment must be greater than zero.");
  return cents;
}

export function parseVehicleWish(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Enter a vehicle preference.");
  const data = input as Record<string, unknown>;
  const draft = { ...emptyVehicleWish };
  for (const { key, label, maxLength } of vehicleWishFields) {
    const raw = data[key];
    if (raw === undefined) continue;
    if (typeof raw !== "string" || raw.trim().length > maxLength) throw new Error(`Enter a valid ${label.toLowerCase()}.`);
    draft[key] = raw.trim();
  }
  if (!Object.values(draft).some(Boolean)) throw new Error("Enter at least one vehicle preference.");
  const year = draft.year ? Number(draft.year) : null;
  if (year !== null && (!/^\d{4}$/.test(draft.year) || year < 1886 || year > 2100)) {
    throw new Error("Enter a four-digit model year between 1886 and 2100.");
  }
  return { year, make: draft.make || null, model: draft.model || null, color: draft.color || null,
    maxPriceCents: parseMoney(draft.maxPrice), monthlyPaymentCents: parseMoney(draft.monthlyPayment) };
}

export type VehicleWishValues = ReturnType<typeof parseVehicleWish>;
export type VehicleWish = VehicleWishValues & { id: string; version: number };
