import {
  VENDOR_CATEGORY_VALUES,
  VENDOR_STATUS_VALUES,
  type VendorCategory,
  type VendorStatus
} from "@/server/vendors/vendor-domain";

const vendorCategoryValues = new Set<string>(VENDOR_CATEGORY_VALUES);
const vendorStatusValues = new Set<string>(VENDOR_STATUS_VALUES);

export type NormalizedVendorListQuery = {
  q?: string;
  category?: VendorCategory;
  status?: VendorStatus;
};

export type NormalizedVendorInput = {
  name: string;
  category: VendorCategory;
  status: VendorStatus;
  primaryContactName?: string;
  primaryPhone?: string;
  primaryEmail?: string;
  addressSummary?: string;
  websiteOrPortalUrl?: string;
  accountReference?: string;
  ownerUserId?: string;
  notes?: string;
};

export type NormalizedVendorNoteInput = {
  body: string;
};

export type NormalizedVendorTaskInput = {
  title: string;
  description: string;
  boardDate: string;
  dueAt: Date;
};

export type NormalizedVendorWorkJobInput = {
  vehicleReference: string;
  additionalVehicleReferences: string[];
  workType: string;
  workDescription?: string;
  serviceDate: string;
  amount?: string;
  notes?: string;
};

export type NormalizedVendorInvoiceBatchInput = {
  title?: string;
  notes?: string;
};

export type NormalizedVendorInvoiceBatchCloseInput = {
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: string;
  notes?: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRequiredText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    throw new Error(`${label} is required.`);
  }
  if (normalizedValue.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }

  return normalizedValue;
}

function normalizeOptionalText(value: unknown, label: string, maxLength: number) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new Error(`${label} must be text when provided.`);
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) return undefined;
  if (normalizedValue.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }

  return normalizedValue;
}

function normalizeCategory(value: unknown) {
  if (typeof value !== "string" || !vendorCategoryValues.has(value as VendorCategory)) {
    throw new Error("Vendor category is required.");
  }

  return value as VendorCategory;
}

function normalizeStatus(value: unknown) {
  if (value === undefined) return "ACTIVE" as VendorStatus;
  if (typeof value !== "string" || !vendorStatusValues.has(value as VendorStatus)) {
    throw new Error("Vendor status is invalid.");
  }

  return value as VendorStatus;
}

export function normalizeVendorName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function normalizeVendorListQuery(searchParams: URLSearchParams): NormalizedVendorListQuery {
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category")?.trim();
  const status = searchParams.get("status")?.trim();

  return {
    ...(q ? { q: q.slice(0, 120) } : {}),
    ...(category && vendorCategoryValues.has(category as VendorCategory)
      ? { category: category as VendorCategory }
      : {}),
    ...(status && vendorStatusValues.has(status as VendorStatus) ? { status: status as VendorStatus } : {})
  };
}

export function normalizeVendorInput(value: unknown): NormalizedVendorInput {
  if (!isPlainObject(value)) {
    throw new Error("Vendor payload must be an object.");
  }

  return {
    name: normalizeRequiredText(value.name, "Vendor name", 160),
    category: normalizeCategory(value.category),
    status: normalizeStatus(value.status),
    primaryContactName: normalizeOptionalText(value.primaryContactName, "Primary contact", 120),
    primaryPhone: normalizeOptionalText(value.primaryPhone, "Primary phone", 60),
    primaryEmail: normalizeOptionalText(value.primaryEmail, "Primary email", 120),
    addressSummary: normalizeOptionalText(value.addressSummary, "Address", 240),
    websiteOrPortalUrl: normalizeOptionalText(value.websiteOrPortalUrl, "Portal URL", 240),
    accountReference: normalizeOptionalText(value.accountReference, "Account reference", 120),
    ownerUserId: normalizeOptionalText(value.ownerUserId, "Owner", 120),
    notes: normalizeOptionalText(value.notes, "Notes", 2000)
  };
}

export function normalizeVendorNoteInput(value: unknown): NormalizedVendorNoteInput {
  if (!isPlainObject(value)) {
    throw new Error("Vendor note payload must be an object.");
  }

  return {
    body: normalizeRequiredText(value.body, "Update/comment", 2000)
  };
}

function normalizeBoardDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new Error("Task date is required.");
  }

  return value.trim();
}

function normalizeDueAt(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Task due time is required.");
  }

  const dueAt = new Date(value);
  if (Number.isNaN(dueAt.getTime())) {
    throw new Error("Task due time is invalid.");
  }

  return dueAt;
}

function normalizeDateOnly(value: unknown, label: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function normalizeOptionalMoney(value: unknown, label: string) {
  if (value === undefined || value === null || value === "") return undefined;
  const normalizedValue = String(value).trim().replace(/[$,]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    throw new Error(`${label} must be a valid amount.`);
  }
  return Number(normalizedValue).toFixed(2);
}

function normalizeAdditionalVehicleReferences(value: unknown) {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 50);
  }
  if (typeof value !== "string") {
    throw new Error("Additional vehicles must be text when provided.");
  }

  return value
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50);
}

export function normalizeVendorTaskInput(value: unknown): NormalizedVendorTaskInput {
  if (!isPlainObject(value)) {
    throw new Error("Vendor task payload must be an object.");
  }

  return {
    title: normalizeRequiredText(value.title, "Task title", 160),
    description: normalizeOptionalText(value.description, "Task details", 1200) ?? "",
    boardDate: normalizeBoardDate(value.boardDate),
    dueAt: normalizeDueAt(value.dueAt)
  };
}

export function normalizeVendorWorkJobInput(value: unknown): NormalizedVendorWorkJobInput {
  if (!isPlainObject(value)) {
    throw new Error("Vendor job payload must be an object.");
  }

  return {
    vehicleReference: normalizeRequiredText(value.vehicleReference, "Vehicle / stock / RO", 160),
    additionalVehicleReferences: normalizeAdditionalVehicleReferences(value.additionalVehicleReferences),
    workType: normalizeRequiredText(value.workType, "Work type", 80),
    workDescription: normalizeOptionalText(value.workDescription, "Work description", 500),
    serviceDate: normalizeDateOnly(value.serviceDate, "Service date"),
    amount: normalizeOptionalMoney(value.amount, "Job amount"),
    notes: normalizeOptionalText(value.notes, "Job notes", 1200)
  };
}

export function normalizeVendorInvoiceBatchInput(value: unknown): NormalizedVendorInvoiceBatchInput {
  if (!isPlainObject(value)) {
    throw new Error("Vendor batch payload must be an object.");
  }

  return {
    title: normalizeOptionalText(value.title, "Batch title", 160),
    notes: normalizeOptionalText(value.notes, "Batch notes", 1200)
  };
}

export function normalizeVendorInvoiceBatchCloseInput(value: unknown): NormalizedVendorInvoiceBatchCloseInput {
  if (!isPlainObject(value)) {
    throw new Error("Vendor batch close payload must be an object.");
  }

  return {
    invoiceNumber: normalizeOptionalText(value.invoiceNumber, "Invoice number", 80),
    invoiceDate: value.invoiceDate ? normalizeDateOnly(value.invoiceDate, "Invoice date") : undefined,
    totalAmount: normalizeOptionalMoney(value.totalAmount, "Invoice total"),
    notes: normalizeOptionalText(value.notes, "Close notes", 1200)
  };
}
