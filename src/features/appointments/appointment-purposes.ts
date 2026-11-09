export type AppointmentPurpose = {
  value: string;
  label: string;
  duration: number;
  category: string;
};

type PurposeEntry = [value: string, label: string, duration: number, category?: string];

function purposeGroup(id: string, label: string, category: string, entries: PurposeEntry[]) {
  const options = entries.map(([value, title, duration, savedCategory = category]) => ({
    value, label: title, duration, category: savedCategory
  }));
  options.push({ value: `OTHER_${id.toUpperCase()}`, label: "Other", duration: 30, category });
  return { id, label, category, options };
}

// Keep legacy purpose codes and stored categories so existing records and integrations retain their meaning.
export const appointmentPurposeGroups = [
  purposeGroup("sales", "Sales & Test Drives", "sales", [
    ["SALES_CONSULTATION", "Sales Consultation", 60],
    ["TEST_DRIVE", "Test Drive", 45],
    ["TRADE_APPRAISAL", "Trade Appraisal", 45],
    ["BUSINESS_SALES_APPOINTMENT", "Business Sales Appointment", 60, "business"],
    ["VEHICLE_SHOWING", "Vehicle showing", 30],
    ["VEHICLE_SOURCING", "Vehicle sourcing consultation", 45],
    ["SALES_FOLLOW_UP", "Sales follow-up", 30],
  ]),
  purposeGroup("signing", "Financing, Leasing & Signing", "finance", [
    ["CREDIT_APPLICATION", "Credit Application / Approval", 45],
    ["FINANCE_PAPERWORK", "Finance Paperwork", 60],
    ["DEAL_REVIEW", "Deal Review / Closing", 60, "sales"],
    ["LEASE_REVIEW", "Lease Review / Renewal", 60, "leasing"],
    ["FINANCING_CONSULTATION", "Financing consultation", 45],
    ["LEASE_TO_OWN_CONSULTATION", "Lease-to-own consultation", 60, "leasing"],
    ["SIGNING", "Paperwork signing", 60],
    ["FUNDING_FOLLOW_UP", "Funding follow-up", 30],
    ["LEASE_BUYOUT", "Lease buyout", 45, "leasing"],
  ]),
  purposeGroup("delivery", "Delivery, Pickup & Returns", "delivery", [
    ["VEHICLE_DELIVERY", "Vehicle Delivery / Selling Paperwork", 60],
    ["CUSTOMER_PICKUP", "Customer vehicle pickup", 45],
    ["HOME_DELIVERY", "Home delivery", 60],
    ["VEHICLE_EXCHANGE", "Vehicle exchange", 60],
    ["LEASE_RETURN", "Lease return", 45],
    ["POST_DELIVERY_WALKTHROUGH", "Post-delivery walkthrough", 30],
  ]),
  purposeGroup("service", "Service & Warranty", "service", [
    ["SERVICE_REPAIR", "Service / Repair Appointment", 60],
    ["WARRANTY_REVIEW", "Warranty Review / Claim", 45, "warranty"],
    ["INSPECTION_DIAGNOSTIC", "Inspection / Diagnostic", 60],
    ["REPAIR_DROP_OFF", "Repair drop-off", 15],
    ["MAINTENANCE", "Maintenance", 60],
    ["WARRANTY_INSPECTION", "Warranty inspection", 45, "warranty"],
    ["REPAIR_PICKUP", "Repair pickup", 15],
    ["COMEBACK_INSPECTION", "Comeback inspection", 45],
  ]),
  purposeGroup("collision", "Body Shop & Collision", "collision", [
    ["COLLISION_ESTIMATE", "Damage estimate", 45],
    ["COLLISION_INSURANCE_INSPECTION", "Insurance inspection", 45],
    ["COLLISION_TEARDOWN", "Teardown", 60],
    ["COLLISION_DROP_OFF", "Collision repair drop-off", 30],
    ["COLLISION_FINAL_INSPECTION", "Final collision inspection", 45],
    ["COLLISION_PICKUP", "Collision repair pickup", 30],
  ]),
  purposeGroup("rental", "Rental & Loaner", "rental", [
    ["DAILY_RENTAL", "Daily Rental / Loaner", 30],
    ["RENTAL_RESERVATION", "Rental reservation", 15],
    ["RENTAL_CHECKOUT", "Rental or loaner checkout", 30],
    ["RENTAL_EXTENSION", "Rental extension", 15],
    ["RENTAL_SWAP", "Rental vehicle swap", 30],
    ["RENTAL_RETURN", "Rental return inspection", 30],
  ]),
  purposeGroup("title", "Title, Registration & Compliance", "dmv", [
    ["TITLE_DOCUMENTATION", "Title / Documentation Issue", 45],
    ["DMV_TITLE", "DMV / Title Follow-up", 45],
    ["REGISTRATION_PLATES", "Registration / Plates", 45],
    ["LICENSING_PERMIT", "Licensing / Permit Appointment", 45, "licensing"],
    ["LEGAL_COMPLIANCE", "Legal / Compliance Appointment", 60, "compliance"],
    ["TITLE_TRANSFER", "Title transfer", 45],
    ["LIEN_RELEASE", "Lien release", 30],
    ["TITLE_CORRECTION", "Title correction", 45],
    ["COMPLIANCE_INSPECTION", "Compliance inspection", 60, "compliance"],
  ]),
  purposeGroup("payments", "Payments & Account Support", "collections", [
    ["PAYMENT_COLLECTION", "Payment / Collections", 30],
    ["ACCOUNTING_RECONCILIATION", "Accounting / Reconciliation", 45, "finance"],
    ["PAYMENT_ARRANGEMENT", "Payment arrangement", 30],
    ["PAST_DUE_ACCOUNT", "Past-due account meeting", 30],
    ["PAYOFF_REVIEW", "Payoff review", 30],
    ["BILLING_DISPUTE", "Billing dispute", 45],
    ["ACCOUNT_RESOLUTION", "Account resolution", 45],
  ]),
  purposeGroup("care", "Customer Care", "customer", [
    ["CUSTOMER_ISSUE", "Customer Issue / Resolution", 60],
    ["CUSTOMER_FOLLOW_UP", "Customer Follow-up", 30],
    ["GENERAL_FOLLOW_UP", "General Follow-up", 30, "general"],
    ["COMPLAINT_RESOLUTION", "Complaint / Concern Resolution", 60],
    ["OTHER_APPOINTMENT", "Other Appointment", 30, "general"],
    ["OWNERSHIP_SUPPORT", "Ownership support", 30],
    ["DOCUMENT_PICKUP", "Customer document pickup", 15],
  ]),
  purposeGroup("inventory", "Inventory, Recon & Transport", "inventory", [
    ["INVENTORY_OPERATION", "Inventory / Lot / Vehicle Operation", 45],
    ["PARTS_ACCESSORY", "Parts / Accessory Appointment", 45],
    ["TRANSPORTATION_LOGISTICS", "Transportation / Logistics", 45, "delivery"],
    ["AUCTION_PICKUP", "Auction pickup", 60],
    ["ACQUISITION_INSPECTION", "Acquisition inspection", 45],
    ["RECON_INTAKE", "Recon intake", 45],
    ["DETAILING", "Detailing", 60],
    ["INVENTORY_PHOTOGRAPHY", "Inventory photography", 45],
    ["LOT_TRANSFER", "Lot transfer", 45],
    ["TOW_HANDOFF", "Tow or carrier handoff", 30],
  ]),
  purposeGroup("partners", "Vendors, Banking & Insurance", "vendor", [
    ["VENDOR_APPOINTMENT", "Vendor / Partner Appointment", 45],
    ["BANKER_APPOINTMENT", "Banker / Lender Appointment", 60, "banking"],
    ["INSURANCE_VERIFICATION", "Insurance Verification", 30, "insurance"],
    ["INSURANCE_BINDER", "Insurance Binder / Coverage Review", 45, "insurance"],
    ["PHONE_COMPANY_MANAGERIAL", "Phone Company / Utility Appointment", 45, "utilities"],
    ["PARTS_DELIVERY", "Parts delivery", 15],
    ["VENDOR_FACILITY_SERVICE", "Vendor facility service", 60],
    ["INSURANCE_REVIEW", "Insurance review", 45, "insurance"],
  ]),
  purposeGroup("marketing", "Marketing & Community", "marketing", [
    ["PHOTO_MARKETING", "Photos / Marketing / Advertising", 45],
    ["MARKETING_VIDEO", "Photo or video shoot", 60],
    ["CAMPAIGN_PLANNING", "Campaign planning", 45],
    ["PARTNERSHIP_MEETING", "Partnership meeting", 45],
    ["COMMUNITY_EVENT", "Community event", 60],
    ["PROMOTIONAL_EVENT", "Promotional event", 60],
  ]),
  purposeGroup("operations", "Staff & Dealership Operations", "staff", [
    ["ADMINISTRATIVE_APPOINTMENT", "Administrative Appointment", 45, "administration"],
    ["MANAGERIAL_APPOINTMENT", "Managerial Appointment", 45, "administration"],
    ["STAFF_TRAINING", "Staff / Training Appointment", 45],
    ["BUSINESS_APPOINTMENT", "Business Appointment", 60, "business"],
    ["FACILITY_APPOINTMENT", "Facility / Property Appointment", 45, "facility"],
    ["STAFF_INTERVIEW", "Interview", 45],
    ["STAFF_ONBOARDING", "Onboarding", 60],
    ["TEAM_MEETING", "Team meeting", 30],
    ["PERFORMANCE_REVIEW", "Performance review", 45],
    ["SAFETY_INSPECTION", "Safety inspection", 45],
    ["FACILITY_MAINTENANCE", "Facility maintenance", 60, "facility"],
  ]),
];

export const appointmentPurposes = appointmentPurposeGroups.flatMap(group => group.options);
export const defaultAppointmentPurpose = appointmentPurposes.find(purpose => purpose.value === "CUSTOMER_ISSUE")!;

const groupByPurpose = new Map(appointmentPurposeGroups.flatMap(group =>
  group.options.map(purpose => [purpose.value, group] as const)
));
const groupByTitle = new Map(appointmentPurposeGroups.flatMap(group =>
  group.options.filter(purpose => purpose.label !== "Other").map(purpose => [purpose.label.toLowerCase(), group] as const)
));
const groupByCategory = new Map([
  ...appointmentPurposeGroups.flatMap(group => group.options.map(purpose => [purpose.category, group] as const)),
  ...appointmentPurposeGroups.map(group => [group.category, group] as const)
]);

export function appointmentPurposeGroup(category?: string | null, purposeCode?: string | null, title?: string | null) {
  return groupByPurpose.get(purposeCode ?? "")
    ?? groupByTitle.get(title?.trim().toLowerCase() ?? "")
    ?? groupByCategory.get(category?.trim().toLowerCase() ?? "")
    ?? groupByPurpose.get(defaultAppointmentPurpose.value)!;
}
