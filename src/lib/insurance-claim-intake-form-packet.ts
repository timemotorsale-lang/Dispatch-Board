export type InsuranceClaimIntakeFormCategory = "Required" | "Conditional";

export type InsuranceClaimIntakeFormItem = {
  basis: string;
  category: InsuranceClaimIntakeFormCategory;
  description: string;
  id: string;
  label: string;
  trigger: string;
};

export type InsuranceClaimIntakePacketInput = {
  adjusterEmail?: string;
  adjusterName?: string;
  adjusterPhone?: string;
  carrierName?: string;
  claimNumber?: string;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  deductible?: string;
  generatedAt?: string;
  lossDate?: string;
  lossLocation?: string;
  policyNumber?: string;
  repairOrderNumber?: string;
  vehicleColor?: string;
  vehicleMake?: string;
  vehicleMileage?: string;
  vehicleModel?: string;
  vehiclePlate?: string;
  vehicleStockNumber?: string;
  vehicleVin?: string;
  vehicleYear?: string;
};

export type GeneratedInsuranceClaimIntakeDocument = {
  category: InsuranceClaimIntakeFormCategory;
  contentType: "text/html";
  downloadFileName: string;
  formId: string;
  html: string;
  label: string;
  sourceBasis: string;
  trigger: string;
  version: number;
};

export const INSURANCE_CLAIM_INTAKE_FORM_PACKET: InsuranceClaimIntakeFormItem[] = [
  {
    basis: "Claim intake source record and duplicate-prevention control",
    category: "Required",
    description: "First-contact claim intake covering customer, vehicle, loss date, claim number, carrier, adjuster, driveability, tow/storage status, and incident summary.",
    id: "insurance-claim-intake",
    label: "Insurance claim intake form",
    trigger: "Every insurance claim start or controlled draft"
  },
  {
    basis: "Customer authorization, direction to inspect, and insurer communication authority",
    category: "Required",
    description: "Customer authorization allowing the dealership to inspect the vehicle, communicate with insurer/adjuster, prepare estimates, collect claim documents, and coordinate repair/payment handling.",
    id: "customer-authorization-direction-to-repair",
    label: "Customer authorization and direction to repair",
    trigger: "Before estimate, insurer communication, repair handoff, or payment coordination"
  },
  {
    basis: "Vehicle condition and damage evidence control",
    category: "Required",
    description: "Photo and condition checklist for VIN, odometer, all four corners, damaged areas, closeups, pre-existing damage, interior, keys, tow arrival, and storage condition.",
    id: "vehicle-damage-photo-checklist",
    label: "Vehicle condition and damage photo checklist",
    trigger: "Vehicle intake, tow-in, estimate preparation, supplement, and repair handoff"
  },
  {
    basis: "Carrier, policy, adjuster, deductible, and payment-contact capture",
    category: "Required",
    description: "Insurance contact sheet for carrier, policyholder, claim number, adjuster, supervisor, email, phone, deductible, coverage status, payment method, and follow-up log.",
    id: "insurance-carrier-contact",
    label: "Insurance carrier and adjuster contact form",
    trigger: "When carrier or claim information is known or needs follow-up"
  },
  {
    basis: "Tow, storage, release, and possession evidence",
    category: "Conditional",
    description: "Tow/storage record capturing source location, tower, release authority, fees, storage start, responsibility, and pickup/drop-off evidence.",
    id: "tow-storage-release",
    label: "Tow, storage, and release form",
    trigger: "Vehicle was towed, stored, impounded, released from another location, or charges may be recovered"
  },
  {
    basis: "Claim stage handoff and readiness gate",
    category: "Required",
    description: "Checklist for moving claim work to estimate, supplement, repair order, accounting, customer follow-up, manager review, or closeout.",
    id: "claim-handoff-checklist",
    label: "Claim handoff checklist",
    trigger: "Before estimate handoff, repair-order creation, accounting recovery, manager review, or closeout"
  }
];

export function requiredInsuranceClaimIntakeFormIds() {
  return INSURANCE_CLAIM_INTAKE_FORM_PACKET.filter((form) => form.category === "Required").map((form) => form.id);
}

export function generateInsuranceClaimIntakeDocuments(input: InsuranceClaimIntakePacketInput = {}) {
  const generatedAt = value(input.generatedAt, new Date().toISOString());
  return INSURANCE_CLAIM_INTAKE_FORM_PACKET.map((form) => ({
    category: form.category,
    contentType: "text/html" as const,
    downloadFileName: `${form.id}.html`,
    formId: form.id,
    html: buildInsuranceClaimDocumentHtml(form, input, generatedAt),
    label: form.label,
    sourceBasis: form.basis,
    trigger: form.trigger,
    version: 1
  }));
}

function buildInsuranceClaimDocumentHtml(
  form: InsuranceClaimIntakeFormItem,
  input: InsuranceClaimIntakePacketInput,
  generatedAt: string
) {
  const sections = sectionsForForm(form.id, input);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(form.label)}</title>
  <style>
    body { color: #061735; font-family: Arial, sans-serif; margin: 32px; }
    h1 { font-size: 28px; margin: 0 0 6px; }
    h2 { border-bottom: 1px solid #dbe6f8; font-size: 18px; margin: 24px 0 10px; padding-bottom: 8px; }
    p, li { color: #34445d; line-height: 1.45; }
    .meta { color: #52647d; margin: 0 0 20px; }
    .notice { background: #f6f9ff; border: 1px solid #dbe6f8; border-radius: 10px; margin: 18px 0; padding: 12px; }
    table { border-collapse: collapse; margin-top: 12px; width: 100%; }
    th, td { border: 1px solid #dbe6f8; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #f6f9ff; color: #34445d; width: 34%; }
    .checklist td:first-child { width: 42px; }
    .signature { display: grid; gap: 24px; grid-template-columns: 1fr 1fr; margin-top: 42px; }
    .line { border-top: 1px solid #061735; padding-top: 8px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(form.label)}</h1>
  <p class="meta">Generated ${escapeHtml(generatedAt)} · ${escapeHtml(form.basis)} · ${escapeHtml(form.trigger)}</p>
  <p class="notice">Operational template for Time Motor Sales review. Final customer-facing language should be reviewed by dealership counsel before production use.</p>
  ${sections.map((section) => `
    <h2>${escapeHtml(section.heading)}</h2>
    ${section.rows ? `<table><tbody>${section.rows.map(([label, rowValue]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(rowValue)}</td></tr>`).join("")}</tbody></table>` : ""}
    ${section.checklist ? `<table class="checklist"><tbody>${section.checklist.map((item) => `<tr><td>[ ]</td><td>${escapeHtml(item)}</td></tr>`).join("")}</tbody></table>` : ""}
    ${section.bullets ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
  `).join("")}
  <div class="signature">
    <div class="line">Customer signature / date</div>
    <div class="line">Dealer representative / date</div>
  </div>
</body>
</html>`;
}

function sectionsForForm(formId: string, input: InsuranceClaimIntakePacketInput) {
  const customerRows: Array<[string, string]> = [
    ["Customer", value(input.customerName)],
    ["Phone", value(input.customerPhone)],
    ["Email", value(input.customerEmail)]
  ];
  const vehicleRows: Array<[string, string]> = [
    ["Vehicle", vehicleLine(input)],
    ["VIN", value(input.vehicleVin)],
    ["Plate", value(input.vehiclePlate)],
    ["Stock #", value(input.vehicleStockNumber)],
    ["Mileage", value(input.vehicleMileage)]
  ];
  const claimRows: Array<[string, string]> = [
    ["Claim #", value(input.claimNumber)],
    ["Carrier", value(input.carrierName)],
    ["Policy #", value(input.policyNumber)],
    ["Loss date", value(input.lossDate)],
    ["Loss location", value(input.lossLocation)],
    ["Deductible", value(input.deductible)],
    ["Repair order #", value(input.repairOrderNumber)]
  ];
  const adjusterRows: Array<[string, string]> = [
    ["Adjuster", value(input.adjusterName)],
    ["Adjuster phone", value(input.adjusterPhone)],
    ["Adjuster email", value(input.adjusterEmail)]
  ];

  const forms: Record<string, Array<{ heading: string; rows?: Array<[string, string]>; checklist?: string[]; bullets?: string[] }>> = {
    "insurance-claim-intake": [
      { heading: "Customer", rows: customerRows },
      { heading: "Vehicle", rows: vehicleRows },
      { heading: "Claim facts", rows: claimRows },
      { heading: "Carrier / adjuster", rows: adjusterRows },
      {
        heading: "Intake questions",
        rows: [
          ["Vehicle driveable?", "Yes / No / Unknown"],
          ["Vehicle at dealership?", "Yes / No / Unknown"],
          ["Tow or storage involved?", "Yes / No / Unknown"],
          ["Police report involved?", "Yes / No / Unknown"],
          ["Customer needs rental/loaner?", "Yes / No / Unknown"],
          ["Immediate safety concern?", "Yes / No / Unknown"]
        ]
      },
      {
        heading: "Incident summary",
        rows: [
          ["Customer description", ""],
          ["Visible damage noted by staff", ""],
          ["Immediate next action", ""],
          ["Assigned owner", ""]
        ]
      }
    ],
    "customer-authorization-direction-to-repair": [
      { heading: "Customer and vehicle", rows: [...customerRows, ...vehicleRows] },
      { heading: "Claim", rows: claimRows },
      {
        heading: "Authorization",
        bullets: [
          "Customer authorizes Time Motor Sales to inspect the vehicle and document visible condition and damage.",
          "Customer authorizes Time Motor Sales to communicate with the insurance carrier, adjuster, appraiser, tow provider, storage facility, lienholder, and related claim participants as needed for this claim.",
          "Customer authorizes Time Motor Sales to prepare estimates, supplements, repair-order recommendations, and claim-related documentation.",
          "Customer understands repair work should not begin until the dealership has the required authorization, estimate approval, parts/repair readiness, and any required payment or deductible direction.",
          "Customer agrees to cooperate with claim documentation, signatures, insurer requests, deductible handling, and vehicle pickup or repair decisions."
        ]
      },
      {
        heading: "Payment and communication direction",
        rows: [
          ["Deductible handling", ""],
          ["Insurance payment direction", ""],
          ["Customer preferred contact method", ""],
          ["Special instructions", ""]
        ]
      }
    ],
    "vehicle-damage-photo-checklist": [
      { heading: "Vehicle", rows: vehicleRows },
      {
        heading: "Required intake photos",
        checklist: [
          "VIN plate / VIN label",
          "Odometer",
          "Front exterior",
          "Rear exterior",
          "Driver side exterior",
          "Passenger side exterior",
          "Primary damaged area wide view",
          "Primary damaged area closeup",
          "Secondary damage areas",
          "Pre-existing damage",
          "Interior condition if relevant",
          "Keys, plates, loose parts, and personal-property condition",
          "Tow arrival or storage condition if applicable"
        ]
      },
      {
        heading: "Condition notes",
        rows: [
          ["Driveability", ""],
          ["Warning lights", ""],
          ["Fluid leaks", ""],
          ["Airbag deployment", ""],
          ["Glass / lights / wheel damage", ""],
          ["Staff notes", ""]
        ]
      }
    ],
    "insurance-carrier-contact": [
      { heading: "Claim", rows: claimRows },
      { heading: "Adjuster", rows: adjusterRows },
      {
        heading: "Carrier follow-up log",
        rows: [
          ["Coverage status", "Open / Pending / Denied / Unknown"],
          ["Estimate status", "Needed / Received / Approved / Supplement needed"],
          ["Payment status", "Not discussed / Deductible pending / Insurance payment pending / Short-pay watch"],
          ["Last contact date/time", ""],
          ["Next contact date/time", ""],
          ["Carrier notes", ""]
        ]
      }
    ],
    "tow-storage-release": [
      { heading: "Customer and vehicle", rows: [...customerRows, ...vehicleRows] },
      {
        heading: "Tow / storage details",
        rows: [
          ["Tow company", ""],
          ["Storage location", ""],
          ["Release contact", ""],
          ["Release phone/email", ""],
          ["Storage start date", ""],
          ["Tow bill / storage fees", ""],
          ["Responsible payer", "Customer / Carrier / Dealership / Unknown"],
          ["Pickup or drop-off evidence", ""]
        ]
      },
      {
        heading: "Release authority",
        bullets: [
          "Confirm who is authorized to release the vehicle and personal property.",
          "Attach tow bill, storage invoice, release authorization, and arrival photos when available.",
          "Do not promise insurer reimbursement or customer reimbursement until responsibility is confirmed."
        ]
      }
    ],
    "claim-handoff-checklist": [
      { heading: "Claim", rows: [...customerRows, ...vehicleRows, ...claimRows] },
      {
        heading: "Before estimate handoff",
        checklist: [
          "Customer authorization signed",
          "Claim number or controlled draft reason captured",
          "Carrier and policy information captured or marked pending",
          "Adjuster contact captured or follow-up assigned",
          "VIN, odometer, four-corner, and damage photos attached",
          "Tow/storage status resolved or assigned"
        ]
      },
      {
        heading: "Before repair-order handoff",
        checklist: [
          "Estimate or appraisal attached",
          "Supplement need identified if applicable",
          "Deductible or payment handling documented",
          "Customer communication preference confirmed",
          "Manager review completed when exception is present"
        ]
      },
      {
        heading: "Handoff decision",
        rows: [
          ["Next lane", "Estimate / Supplement / Repair order / Accounting / Customer follow-up / Manager review / Closeout"],
          ["Owner", ""],
          ["Due date/time", ""],
          ["Blocker", ""],
          ["Approved exception", ""]
        ]
      }
    ]
  };

  return forms[formId] ?? [{ heading: "Claim form", rows: [...customerRows, ...vehicleRows, ...claimRows] }];
}

function vehicleLine(input: InsuranceClaimIntakePacketInput) {
  return [input.vehicleYear, input.vehicleMake, input.vehicleModel, input.vehicleColor]
    .filter(Boolean)
    .join(" ") || "Not captured";
}

function value(input: string | undefined, fallback = "") {
  return input?.trim() || fallback;
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
