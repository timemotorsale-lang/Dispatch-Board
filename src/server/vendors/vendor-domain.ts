export const VENDOR_CATEGORY_VALUES = [
  "LENDER_BANK",
  "BUSINESS_BANKING",
  "WARRANTY_COMPANY",
  "INSURANCE_AGENCY",
  "TRANSPORT_PROVIDER",
  "TOWING_ROADSIDE",
  "PARTS_SUPPLIER",
  "TIRE_VENDOR",
  "GLASS_VENDOR",
  "RECON_REPAIR_VENDOR",
  "BODY_PAINT_VENDOR",
  "DETAIL_VENDOR",
  "INSPECTION_EMISSIONS",
  "KEY_LOCKSMITH",
  "AUCTION_WHOLESALE_PARTNER",
  "DMV_TITLE_REGISTRATION",
  "GOVERNMENT_AGENCY",
  "UTILITY_TELECOM",
  "SOFTWARE_TECHNOLOGY",
  "MARKETING_ADVERTISING",
  "PAYMENT_PROCESSOR",
  "ACCOUNTING_TAX",
  "LEGAL_COMPLIANCE",
  "PAYROLL_HR",
  "OFFICE_SUPPLIES",
  "FACILITY_LANDLORD",
  "FACILITY_MAINTENANCE",
  "SECURITY_PROVIDER",
  "WASTE_RECYCLING",
  "FUEL_ENERGY",
  "COLLECTIONS_REPOSSESSION",
  "PROFESSIONAL_SERVICES",
  "INTERNAL_CONTACT",
  "OTHER"
] as const;

export const VENDOR_STATUS_VALUES = [
  "PREFERRED",
  "ACTIVE",
  "PENDING_REVIEW",
  "INACTIVE",
  "DO_NOT_USE"
] as const;

export const VENDOR_ACTIVITY_TYPE_VALUES = [
  "VENDOR_CREATED",
  "VENDOR_UPDATED",
  "STATUS_CHANGED",
  "NOTE_ADDED",
  "PROTECTED_NOTE_ADDED",
  "TASK_CREATED",
  "RECORD_LINKED",
  "DOCUMENT_UPLOADED",
  "JOB_RECORDED",
  "BATCH_OPENED",
  "BATCH_CLOSED"
] as const;

export const VENDOR_WORK_JOB_STATUS_VALUES = [
  "OPEN",
  "READY_FOR_BATCH",
  "BATCHED",
  "INVOICED",
  "CANCELLED"
] as const;

export const VENDOR_INVOICE_BATCH_STATUS_VALUES = [
  "OPEN",
  "CLOSED",
  "INVOICED",
  "PAID",
  "VOID"
] as const;

export type VendorCategory = (typeof VENDOR_CATEGORY_VALUES)[number];
export type VendorStatus = (typeof VENDOR_STATUS_VALUES)[number];
export type VendorActivityType = (typeof VENDOR_ACTIVITY_TYPE_VALUES)[number];
export type VendorWorkJobStatus = (typeof VENDOR_WORK_JOB_STATUS_VALUES)[number];
export type VendorInvoiceBatchStatus = (typeof VENDOR_INVOICE_BATCH_STATUS_VALUES)[number];

export const VENDOR_CATEGORY_LABELS: Record<VendorCategory, string> = {
  LENDER_BANK: "Lender / bank",
  BUSINESS_BANKING: "Business banking",
  WARRANTY_COMPANY: "Warranty company",
  INSURANCE_AGENCY: "Insurance agency",
  TRANSPORT_PROVIDER: "Transport provider",
  TOWING_ROADSIDE: "Towing / roadside",
  PARTS_SUPPLIER: "Parts supplier",
  TIRE_VENDOR: "Tire vendor",
  GLASS_VENDOR: "Glass vendor",
  RECON_REPAIR_VENDOR: "Recon / repair vendor",
  BODY_PAINT_VENDOR: "Body / paint vendor",
  DETAIL_VENDOR: "Detail vendor",
  INSPECTION_EMISSIONS: "Inspection / emissions",
  KEY_LOCKSMITH: "Key / locksmith",
  AUCTION_WHOLESALE_PARTNER: "Auction / wholesale partner",
  DMV_TITLE_REGISTRATION: "DMV / title / registration",
  GOVERNMENT_AGENCY: "Government agency",
  UTILITY_TELECOM: "Phone / internet / utility",
  SOFTWARE_TECHNOLOGY: "Software / technology",
  MARKETING_ADVERTISING: "Marketing / advertising",
  PAYMENT_PROCESSOR: "Payment processor",
  ACCOUNTING_TAX: "Accounting / tax",
  LEGAL_COMPLIANCE: "Legal / compliance",
  PAYROLL_HR: "Payroll / HR",
  OFFICE_SUPPLIES: "Office supplies",
  FACILITY_LANDLORD: "Facility / landlord",
  FACILITY_MAINTENANCE: "Facility maintenance",
  SECURITY_PROVIDER: "Security provider",
  WASTE_RECYCLING: "Waste / recycling",
  FUEL_ENERGY: "Fuel / energy",
  COLLECTIONS_REPOSSESSION: "Collections / repossession",
  PROFESSIONAL_SERVICES: "Professional services",
  INTERNAL_CONTACT: "Internal contact",
  OTHER: "Other"
};

export const VENDOR_STATUS_LABELS: Record<VendorStatus, string> = {
  PREFERRED: "Preferred",
  ACTIVE: "Active",
  PENDING_REVIEW: "Pending review",
  INACTIVE: "Inactive",
  DO_NOT_USE: "Do not use"
};

export const VENDOR_CATEGORY_OPTIONS = Object.entries(VENDOR_CATEGORY_LABELS).map(([value, label]) => ({
  label,
  value: value as VendorCategory
}));

export const VENDOR_STATUS_OPTIONS = Object.entries(VENDOR_STATUS_LABELS).map(([value, label]) => ({
  label,
  value: value as VendorStatus
}));

export function isVendorWarningStatus(status: VendorStatus) {
  return status === "PENDING_REVIEW" || status === "DO_NOT_USE";
}
