export type MobileIdCaptureDraft = {
  address?: string | null;
  displayName?: string | null;
  email?: string | null;
  licenseNumber?: string | null;
  licenseState?: string | null;
  phoneNumber?: string | null;
  photoProvided?: boolean;
  reviewedWithCustomer?: boolean;
};

export type CaptureHubPurpose =
  | "CUSTOMER_ID"
  | "VEHICLE_IDENTITY"
  | "ODOMETER"
  | "CONDITION"
  | "REPAIR_PROOF"
  | "PARTS"
  | "DOCUMENT"
  | "SIGNATURE";

export type CaptureHubWorkflow = {
  attachTargets: string[];
  nextActions: string[];
  privacyMode: "MASK_SENSITIVE" | "STANDARD_EVIDENCE" | "APPROVAL_REVIEW";
  purpose: CaptureHubPurpose;
  reviewFields: string[];
  staffLabel: string;
};

export type MobileIdCaptureRequirement = {
  key: "NAME" | "CONTACT" | "HUMAN_REVIEW" | "DUPLICATE_CHECK" | "IMAGE_RETENTION" | "LICENSE_MASKING";
  label: string;
  state: "READY" | "NEEDS_REVIEW";
};

export const CAPTURE_HUB_WORKFLOWS: CaptureHubWorkflow[] = [
  {
    attachTargets: ["Customer record"],
    nextActions: ["Create customer", "Update customer", "Open duplicate review"],
    privacyMode: "MASK_SENSITIVE",
    purpose: "CUSTOMER_ID",
    reviewFields: ["Name", "Address", "Phone or email", "License state", "License ending"],
    staffLabel: "Add customer"
  },
  {
    attachTargets: ["Vehicle record", "Inventory unit", "Customer vehicle"],
    nextActions: ["Find vehicle", "Create vehicle", "Open duplicate vehicle review"],
    privacyMode: "STANDARD_EVIDENCE",
    purpose: "VEHICLE_IDENTITY",
    reviewFields: ["VIN or plate", "Year/make/model", "Ownership", "Stock or key tag"],
    staffLabel: "Add vehicle"
  },
  {
    attachTargets: ["Vehicle record", "Repair order", "Inventory unit", "Transport", "Delivery"],
    nextActions: ["Record mileage", "Flag mismatch", "Continue handoff"],
    privacyMode: "STANDARD_EVIDENCE",
    purpose: "ODOMETER",
    reviewFields: ["Mileage", "Event type", "Vehicle", "Timestamp"],
    staffLabel: "Record mileage"
  },
  {
    attachTargets: ["Vehicle record", "Inventory unit", "Repair order", "Deal"],
    nextActions: ["Attach condition proof", "Create repair task", "Request manager review"],
    privacyMode: "STANDARD_EVIDENCE",
    purpose: "CONDITION",
    reviewFields: ["Area", "Severity", "Photo set", "Next action"],
    staffLabel: "Show condition"
  },
  {
    attachTargets: ["Repair order", "Repair job", "Diagnostic case", "Estimate", "QC"],
    nextActions: ["Attach finding proof", "Create estimate line", "Move to authorization", "Record verification"],
    privacyMode: "STANDARD_EVIDENCE",
    purpose: "REPAIR_PROOF",
    reviewFields: ["Finding", "Proof type", "RO or job", "Next action"],
    staffLabel: "Repair proof"
  },
  {
    attachTargets: ["Repair order", "Repair job", "Parts request", "Return", "Warranty claim"],
    nextActions: ["Order part", "Receive part", "Return part", "Hold for review"],
    privacyMode: "STANDARD_EVIDENCE",
    purpose: "PARTS",
    reviewFields: ["Part number", "Quantity", "Vendor", "Condition", "Next action"],
    staffLabel: "Add part"
  },
  {
    attachTargets: ["Customer", "Vehicle", "Repair order", "Deal", "Invoice", "Vendor"],
    nextActions: ["Route document", "Request approval", "Send to accounting", "Attach to title packet"],
    privacyMode: "MASK_SENSITIVE",
    purpose: "DOCUMENT",
    reviewFields: ["Document type", "Owner record", "Effective date", "Review destination"],
    staffLabel: "Add document"
  },
  {
    attachTargets: ["Estimate", "Authorization", "Delivery", "Privacy consent", "Trade-in"],
    nextActions: ["Hold for manager review", "Attach approval proof", "Continue delivery"],
    privacyMode: "APPROVAL_REVIEW",
    purpose: "SIGNATURE",
    reviewFields: ["Signer", "Purpose", "Timestamp", "Authorization status"],
    staffLabel: "Capture approval"
  }
];

export function getCaptureHubWorkflow(purpose: CaptureHubPurpose) {
  return CAPTURE_HUB_WORKFLOWS.find((workflow) => workflow.purpose === purpose) ?? CAPTURE_HUB_WORKFLOWS[0];
}

export type MobileIdCaptureReview = {
  canCreateCustomer: boolean;
  customerPatch: {
    address: string | null;
    displayName: string | null;
    email: string | null;
    licenseLast4: string | null;
    licenseState: string | null;
    phoneNumber: string | null;
  };
  privacy: {
    retainFullLicenseNumber: false;
    storeIdPhoto: false;
  };
  requirements: MobileIdCaptureRequirement[];
  staffGuidance: string;
};

function clean(value?: string | null) {
  const text = value?.trim();
  return text ? text.replace(/\s+/g, " ") : null;
}

function licenseLast4(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function hasContact(input: MobileIdCaptureDraft) {
  return Boolean(clean(input.phoneNumber) || clean(input.email));
}

export function buildMobileIdCaptureReview(input: MobileIdCaptureDraft): MobileIdCaptureReview {
  const displayName = clean(input.displayName);
  const contactReady = hasContact(input);
  const reviewed = input.reviewedWithCustomer === true;

  const requirements: MobileIdCaptureRequirement[] = [
    { key: "NAME", label: "Customer name confirmed", state: displayName ? "READY" : "NEEDS_REVIEW" },
    { key: "CONTACT", label: "Phone or email added", state: contactReady ? "READY" : "NEEDS_REVIEW" },
    { key: "HUMAN_REVIEW", label: "Staff confirmed ID details with customer", state: reviewed ? "READY" : "NEEDS_REVIEW" },
    { key: "DUPLICATE_CHECK", label: "Search existing customers before saving", state: "NEEDS_REVIEW" },
    { key: "IMAGE_RETENTION", label: "ID photo is not saved in review mode", state: "READY" },
    { key: "LICENSE_MASKING", label: "Only license ending is shown", state: "READY" }
  ];

  return {
    canCreateCustomer: Boolean(displayName && contactReady && reviewed),
    customerPatch: {
      address: clean(input.address),
      displayName,
      email: clean(input.email),
      licenseLast4: licenseLast4(input.licenseNumber),
      licenseState: clean(input.licenseState)?.toUpperCase() ?? null,
      phoneNumber: clean(input.phoneNumber)
    },
    privacy: {
      retainFullLicenseNumber: false,
      storeIdPhoto: false
    },
    requirements,
    staffGuidance: "Capture the ID only to speed up intake, confirm the useful fields with the customer, then save the customer after duplicate review."
  };
}
