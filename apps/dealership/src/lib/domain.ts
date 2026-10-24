import { catalogValue } from "./industry-options";
import { appraisalDetailKeys, validateAppraisal } from "./appraisal";
import { paymentPaths, tradeChoices } from "./buying-plan";
import { samplePolicy } from "../../config/sample-policy.mjs";

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
  features?: string[];
  exteriorColor?: string;
  interiorColor?: string;
  mpgCombined?: number;
  seatingCapacity?: number;
  cylinders?: number;
  previousPrice?: number;
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
    if (allowedDetails.has(key) || input.kind === "SELL" && appraisalDetailKeys.includes(key)) details[key] = bounded(item, 1000);
  }
  if (input.kind === "SELL" && details.appraisalVersion) {
    validateAppraisal(details);
    if (details.contactMethod === "Email" && !email || details.contactMethod === "Phone call" && !phone) throw new Error("Provide the contact detail for your preferred response method.");
  }
  if (input.kind === "PURCHASE") {
    if (typeof input.vehicleId !== "string" || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(input.vehicleId)) throw new Error("Choose a published vehicle before preparing a purchase request.");
    if (details.paymentPath !== undefined && !(paymentPaths as readonly string[]).includes(details.paymentPath)) throw new Error("Choose a supported payment approach.");
    if (details.trade !== undefined && !(tradeChoices as readonly string[]).includes(details.trade)) throw new Error("Choose a supported trade preference.");
  }
  return {
    kind: input.kind as RequestKind, vehicleId: bounded(input.vehicleId, 100), name: bounded(input.name, 150),
    email, phone, notes: bounded(input.notes, 2500), details
  };
}

export function projectSnapshot(value: unknown, now = new Date(), options: { allowSamples?: boolean; requireLive?: boolean } = {}): Listing[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid listing snapshot.");
  const snapshot = value as Record<string, unknown>;
  if (options.requireLive && snapshot.dataMode !== "LIVE") throw new Error("Published inventory requires explicit LIVE provenance.");
  if (snapshot.dataMode !== undefined && !["LIVE", "SAMPLE"].includes(String(snapshot.dataMode))) throw new Error("Invalid inventory provenance.");
  if (!options.allowSamples && snapshot.dataMode === "SAMPLE") throw new Error("Sample inventory cannot be published.");
  if (snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.listings) || snapshot.listings.length > 5000) throw new Error("Unsupported listing snapshot.");
  const identifiers = new Set<string>();
  const projected: Listing[] = [];
  for (const item of snapshot.listings) {
    if (!options.allowSamples && item && (item.sample === true || item.isSample === true || item.dataMode === "SAMPLE" || /^(sample|demo|fixture)-/i.test(String(item.id)) || /\/(?:sample|demo|fixture)[-_/]/i.test(String(item.photo)) || String(item.photo).startsWith("/api/sample-media/"))) throw new Error("Sample inventory cannot be published.");
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
    if (photo && !/^\/listing-media\/[a-zA-Z0-9/_-]+\.(?:png|jpg|jpeg|webp)$/.test(photo) && !(options.allowSamples && photo === "/api/sample-media/rav4")) throw new Error("Only approved public media paths are supported.");
    const specifications: Partial<Listing> = {};
    for (const field of ["exteriorColor", "interiorColor"] as const) {
      if (item[field] != null) specifications[field] = bounded(item[field], 60);
    }
    if (item.features != null) {
      if (!Array.isArray(item.features) || item.features.length > 100) throw new Error("Invalid published features.");
      specifications.features = Array.from(new Set(item.features.map((feature: unknown) => bounded(feature, 100)).filter(Boolean)));
    }
    for (const [field, maximum] of [["mpgCombined", 300], ["seatingCapacity", 30], ["cylinders", 24], ["previousPrice", Number.MAX_SAFE_INTEGER]] as const) {
      if (item[field] == null) continue;
      if (typeof item[field] !== "number" || !Number.isFinite(item[field]) || item[field] < 0 || item[field] > maximum || (field !== "mpgCombined" && !Number.isSafeInteger(item[field]))) throw new Error("Invalid published specifications.");
      specifications[field] = item[field];
    }
    projected.push({
      id, year: item.year, make: bounded(item.make, 60), model: bounded(item.model, 80), trim: bounded(item.trim, 100),
      mileage: item.mileage, price: item.price, body: bounded(item.body, 40), drivetrain: bounded(item.drivetrain, 40),
      transmission: bounded(item.transmission, 40), fuel: bounded(item.fuel, 40), availability: item.availability,
      photo, sourceVersion: item.sourceVersion, priceVersion: item.priceVersion, observedAt: item.observedAt, validUntil: item.validUntil, ...specifications
    });
  }
  return projected;
}

export function filterListings(listings: Listing[], filters: URLSearchParams) {
  const query = (filters.get("q") ?? "").trim().toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);
  const min = Number(filters.get("min") || 0);
  const max = Number(filters.get("max") || Number.MAX_SAFE_INTEGER);
  const mileage = Number(filters.get("mileage") || Number.MAX_SAFE_INTEGER);
  const year = Number(filters.get("year") || 0);
  const any = (field: string, value: string | number | undefined, partial = false) => {
    const selected = filters.getAll(field).filter(Boolean);
    return selected.length === 0 || value !== undefined && selected.some(choice => Boolean(catalogValue(choice)) && (partial ? catalogValue(String(value)).includes(catalogValue(choice)) : catalogValue(String(value)) === catalogValue(choice)));
  };
  const results = listings.filter(vehicle => vehicle.availability !== "SOLD" &&
    terms.every(term => `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim} ${vehicle.body} ${vehicle.drivetrain} ${vehicle.fuel} ${vehicle.transmission} ${vehicle.exteriorColor || ""} ${vehicle.interiorColor || ""} ${(vehicle.features || []).join(" ")}`.toLowerCase().includes(term)) &&
    vehicle.price >= min && vehicle.price <= max && vehicle.mileage <= mileage && vehicle.year >= year &&
    vehicle.year <= Number(filters.get("yearMax") || Number.MAX_SAFE_INTEGER) && vehicle.mileage >= Number(filters.get("mileageMin") || 0) &&
    any("body", vehicle.body) && any("make", vehicle.make) && any("model", vehicle.model) &&
    any("fuel", vehicle.fuel, true) && any("transmission", vehicle.transmission) && any("drive", vehicle.drivetrain) &&
    any("exterior", vehicle.exteriorColor) && any("interior", vehicle.interiorColor) && any("cylinders", vehicle.cylinders) &&
    filters.getAll("feature").filter(Boolean).every(feature => vehicle.features?.some(value => catalogValue(value) === catalogValue(feature))) &&
    (!filters.get("mpg") || vehicle.mpgCombined !== undefined && vehicle.mpgCombined >= Number(filters.get("mpg"))) &&
    (!filters.get("seats") || vehicle.seatingCapacity !== undefined && vehicle.seatingCapacity >= Number(filters.get("seats"))) &&
    (filters.get("priceDrop") !== "1" || vehicle.previousPrice !== undefined && vehicle.previousPrice > vehicle.price) &&
    (filters.get("available") !== "1" || vehicle.availability === "AVAILABLE"));
  return results.sort((first, second) => filters.get("sort") === "price-low" ? first.price - second.price : filters.get("sort") === "price-high" ? second.price - first.price : filters.get("sort") === "mileage" ? first.mileage - second.mileage : Date.parse(second.observedAt) - Date.parse(first.observedAt));
}

export const listingFilterFields = ["min", "max", "body", "make", "model", "year", "yearMax", "mileage", "mileageMin", "drive", "fuel", "transmission", "available", "mpg", "feature", "exterior", "interior", "seats", "cylinders", "priceDrop"];

export function replaceListingFilters(current: URLSearchParams, entries: Iterable<[string, string]>) {
  const next = new URLSearchParams(current.toString());
  for (const field of listingFilterFields) next.delete(field);
  for (const [field, value] of entries) if (value && listingFilterFields.includes(field)) next.append(field, value);
  return next;
}

export function mayStartPurchase(listing: Listing, now = new Date()) {
  return listing.availability === "AVAILABLE" && Date.parse(listing.validUntil) > now.getTime();
}

export function previewEnabled(environment: Record<string, string | undefined>) {
  return samplePolicy(environment).enabled;
}

export const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
export const availabilityLabel: Record<Availability, string> = { AVAILABLE: "Available", COMING_SOON: "Coming soon", RESERVED: "Reserved", SOLD: "Sold" };
