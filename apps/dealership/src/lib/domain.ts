export type Availability = "AVAILABLE" | "COMING_SOON" | "RESERVED" | "SOLD";
export type Listing = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  price: number;
  body: string;
  drivetrain: string;
  transmission: string;
  fuel: string;
  availability: Availability;
  photo: string | null;
  sourceVersion: number;
  priceVersion: number;
  observedAt: string;
  validUntil: string;
};

export type PublicSnapshot = { listings: Listing[]; source: "PREVIEW" | "PUBLISHED" | "UNCONFIGURED" | "UNAVAILABLE"; error?: string };
export type RequestKind = "PURCHASE" | "QUESTION" | "TEST_DRIVE" | "SELL" | "SERVICE";
export type CustomerRequest = {
  kind: RequestKind;
  vehicleId: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  details: Record<string, string>;
};

const statuses = new Set<Availability>(["AVAILABLE", "COMING_SOON", "RESERVED", "SOLD"]);
const kinds = new Set<RequestKind>(["PURCHASE", "QUESTION", "TEST_DRIVE", "SELL", "SERVICE"]);
const allowedDetails = new Set(["year", "make", "model", "vin", "mileage", "intent", "condition", "issues", "loan", "paymentPath", "trade", "date", "window", "flexible", "service"]);

function bounded(value: unknown, limit: number) {
  if (typeof value !== "string" || value.length > limit) throw new Error("A field is missing or too long.");
  return value.trim();
}

export function validateRequest(value: unknown): CustomerRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid request.");
  const input = value as Record<string, unknown>;
  if (!kinds.has(input.kind as RequestKind)) throw new Error("Choose a supported request type.");
  const email = bounded(input.email, 254);
  const phone = bounded(input.phone, 40);
  if (!email && !phone) throw new Error("Provide an email address or phone number. One is enough.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (phone && !/^[+\d ()\-.]{7,40}$/.test(phone)) throw new Error("Enter a valid phone number.");
  const details: Record<string, string> = {};
  if (!input.details || typeof input.details !== "object" || Array.isArray(input.details)) throw new Error("Invalid vehicle details.");
  for (const [key, item] of Object.entries(input.details)) {
    if (allowedDetails.has(key)) details[key] = bounded(item, 1000);
  }
  return {
    kind: input.kind as RequestKind, vehicleId: bounded(input.vehicleId, 100), name: bounded(input.name, 150),
    email, phone, notes: bounded(input.notes, 2500), details
  };
}

export function projectSnapshot(value: unknown, now = new Date()): Listing[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid listing snapshot.");
  const snapshot = value as Record<string, unknown>;
  if (snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.listings) || snapshot.listings.length > 5000) throw new Error("Unsupported listing snapshot.");
  const identifiers = new Set<string>();
  const projected: Listing[] = [];
  for (const item of snapshot.listings) {
    if (!item || typeof item !== "object" || item.publication !== "APPROVED") continue;
    if (!statuses.has(item.availability)) throw new Error("Invalid availability.");
    const observed = Date.parse(item.observedAt);
    const expiry = Date.parse(item.validUntil);
    if (!Number.isFinite(observed) || !Number.isFinite(expiry) || observed > now.getTime() || expiry <= now.getTime() || expiry <= observed) throw new Error("Listing data is out of date. Ask the team to confirm availability.");
    for (const field of ["year", "mileage", "price", "sourceVersion", "priceVersion"]) {
      if (!Number.isSafeInteger(item[field]) || item[field] < 0) throw new Error("Invalid listing facts.");
    }
    if (item.year < 1886 || item.year > now.getUTCFullYear() + 2 || item.sourceVersion < 1 || item.priceVersion < 1) throw new Error("Invalid listing version.");
    const id = bounded(item.id, 100);
    if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(id) || identifiers.has(id)) throw new Error("Invalid listing identity.");
    identifiers.add(id);
    const photo = item.photo === null ? null : bounded(item.photo, 500);
    if (photo && !/^\/listing-media\/[a-zA-Z0-9/_-]+\.(?:png|jpg|jpeg|webp)$/.test(photo)) throw new Error("Only approved public media paths are supported.");
    projected.push({
      id, year: item.year, make: bounded(item.make, 60), model: bounded(item.model, 80), trim: bounded(item.trim, 100),
      mileage: item.mileage, price: item.price, body: bounded(item.body, 40), drivetrain: bounded(item.drivetrain, 40),
      transmission: bounded(item.transmission, 40), fuel: bounded(item.fuel, 40), availability: item.availability,
      photo, sourceVersion: item.sourceVersion, priceVersion: item.priceVersion, observedAt: item.observedAt, validUntil: item.validUntil
    });
  }
  return projected;
}

export function filterListings(listings: Listing[], filters: URLSearchParams) {
  const query = (filters.get("q") ?? "").trim().toLowerCase();
  const min = Number(filters.get("min") || 0);
  const max = Number(filters.get("max") || Number.MAX_SAFE_INTEGER);
  const mileage = Number(filters.get("mileage") || Number.MAX_SAFE_INTEGER);
  const year = Number(filters.get("year") || 0);
  const results = listings.filter(vehicle => vehicle.availability !== "SOLD" &&
    `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim} ${vehicle.body} ${vehicle.drivetrain}`.toLowerCase().includes(query) &&
    vehicle.price >= min && vehicle.price <= max && vehicle.mileage <= mileage && vehicle.year >= year &&
    (!filters.get("body") || filters.get("body") === vehicle.body) &&
    (!filters.get("make") || filters.get("make") === vehicle.make) &&
    (!filters.get("drive") || filters.get("drive") === vehicle.drivetrain));
  return results.sort((first, second) => filters.get("sort") === "price-low" ? first.price - second.price : filters.get("sort") === "price-high" ? second.price - first.price : filters.get("sort") === "mileage" ? first.mileage - second.mileage : Date.parse(second.observedAt) - Date.parse(first.observedAt));
}

export function mayStartPurchase(listing: Listing, now = new Date()) {
  return listing.availability === "AVAILABLE" && Date.parse(listing.validUntil) > now.getTime();
}

export function previewEnabled(environment: Record<string, string | undefined>) {
  return environment.NODE_ENV !== "production" && environment.DEALERSHIP_PREVIEW_DATA === "1";
}

export const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
export const availabilityLabel: Record<Availability, string> = { AVAILABLE: "Available", COMING_SOON: "Coming soon", RESERVED: "Reserved", SOLD: "Sold" };
