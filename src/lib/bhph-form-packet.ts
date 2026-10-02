export type BhphFormCategory = "Required" | "Conditional";

export type BhphFormItem = {
  basis: string;
  category: BhphFormCategory;
  description: string;
  id: string;
  label: string;
  trigger: string;
};

export const BHPH_FORM_PACKET: BhphFormItem[] = [
  {
    basis: "BHPH retail installment account setup and dealership risk-control record",
    category: "Required",
    description: "Customer-facing support document for the final retail installment sale contract, payment terms, security interest, no oral changes, and account setup acknowledgements.",
    id: "bhph-installment-contract",
    label: "BHPH retail installment contract support",
    trigger: "Every BHPH financed sale"
  },
  {
    basis: "Payment schedule, servicing, late-charge, returned-payment, and receipt controls",
    category: "Required",
    description: "Payment schedule and servicing agreement covering payment method, due date, application of payments, late fees, returned payments, receipts, address updates, and servicing contact expectations.",
    id: "bhph-payment-schedule-servicing",
    label: "Payment schedule and servicing agreement",
    trigger: "Every BHPH account"
  },
  {
    basis: "Insurance, maintenance, care, loss, and claim-cooperation controls",
    category: "Required",
    description: "Customer acknowledgement of insurance responsibility, required coverage, repair and maintenance duties, loss reporting, claim cooperation, and no unauthorized transfer or concealment.",
    id: "bhph-insurance-maintenance",
    label: "Insurance and maintenance agreement",
    trigger: "Every BHPH vehicle delivery"
  },
  {
    basis: "Default, cure, repossession, recovery, and personal-property handling controls",
    category: "Required",
    description: "Default and recovery notice covering missed payments, insurance lapse, false information, prohibited transfers, cure rights, peaceful recovery, customer property, and deficiency/surplus handling subject to law.",
    id: "bhph-default-cure-recovery",
    label: "Default, right to cure, and recovery notice",
    trigger: "Every BHPH account"
  },
  {
    basis: "GPS, telematics, and starter-interrupt device disclosure controls",
    category: "Required",
    description: "Disclosure and acknowledgement for any installed tracking, telematics, or starter-interrupt device, including device purpose, data handling, emergency/safety limits, and separate consent requirements.",
    id: "bhph-gps-starter-disclosure",
    label: "GPS / starter-interrupt disclosure",
    trigger: "BHPH vehicle with GPS, telematics, or starter-interrupt capability"
  },
  {
    basis: "References, employer, residence, communications, and lawful contact authorization",
    category: "Required",
    description: "BHPH-specific five-reference list and contact authorization record for verification, account servicing, skip-trace prevention, communications consent, and lawful contact limitations.",
    id: "bhph-references-contact-authorization",
    label: "References and contact authorization",
    trigger: "Every BHPH buyer"
  },
  {
    basis: "Delivery condition, equipment, odometer, keys, title, and disclosure acknowledgement",
    category: "Required",
    description: "Delivery condition acknowledgement tying the buyer, unit, odometer, keys, equipment, title status, warranty/as-is posture, and signed disclosure packet together.",
    id: "bhph-delivery-condition",
    label: "Delivery and condition acknowledgement",
    trigger: "Vehicle delivery"
  },
  {
    basis: "Privacy, consumer report, Safeguards Rule, electronic communications, and servicing notices",
    category: "Required",
    description: "Privacy and communications acknowledgement covering credit/consumer-report permission when applicable, privacy notice delivery, electronic communications, SMS/call/email consent, and dealership data-protection practices.",
    id: "bhph-privacy-communications",
    label: "Privacy and communications acknowledgement",
    trigger: "Every BHPH account"
  },
  {
    basis: "Internal BHPH deal-jacket checklist and manager delivery control",
    category: "Required",
    description: "Internal checklist confirming proof, insurance, title, payment schedule, references, signed documents, down payment, delivery photos, account setup, and manager exceptions.",
    id: "bhph-deal-jacket-checklist",
    label: "BHPH deal jacket checklist",
    trigger: "Before BHPH delivery completion"
  },
  {
    basis: "Dealer voluntary warranty and optional return policy; Minnesota statutory rights preserved",
    category: "Required",
    description: "Engine/transmission coverage for 30 days or 1,000 miles, plus a 24-hour optional return with an $875 restocking fee.",
    id: "bhph-engine-transmission-warranty-return",
    label: "Engine / transmission warranty and one-day return",
    trigger: "Every BHPH delivery"
  }
];

export function requiredBhphFormIds() {
  return BHPH_FORM_PACKET.filter((form) => form.category === "Required").map((form) => form.id);
}
