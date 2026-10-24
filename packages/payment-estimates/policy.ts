export type PaymentPolicy = {
  version: string;
  status: "DRAFT";
  annualInterestBasisPoints: number;
  terms: readonly number[];
  salesTaxPartsPerMillion: number;
  documentationFeeCents: number;
  baseFees: readonly { label: string; cents: number }[];
  lienFeeCents: number;
};

export const proposedPaymentPolicy: PaymentPolicy = {
  version: "mn-estimate-draft-1",
  status: "DRAFT",
  annualInterestBasisPoints: 800,
  terms: [24, 36, 48, 66, 72],
  salesTaxPartsPerMillion: 68750,
  documentationFeeCents: 35000,
  baseFees: [
    { label: "Title fee", cents: 825 },
    { label: "Transfer tax", cents: 1000 },
    { label: "Public safety vehicle fee", cents: 350 },
    { label: "Title technology surcharge", cents: 225 },
    { label: "Filing fee", cents: 1200 }
  ],
  lienFeeCents: 200
};

export const paymentReferences = [
  { title: "MN Revenue — motor vehicle sales tax and document-fee treatment", href: "https://www.revenue.state.mn.us/guide/motor-vehicle-sales" },
  { title: "MN DVS — typical title-transfer fees (March 2025 reference)", href: "https://assets.dps.mn.gov/files/dvs/BuyingorSellingMotorVehicle_Just_the_Facts.pdf" },
  { title: "MN Statutes §168.27, subdivision 31 — documentary fee cap", href: "https://www.revisor.mn.gov/statutes/cite/168.27#stat.168.27.31" }
];

export const paymentReleaseGates = [
  "Owner approval of the final version is not recorded.",
  "Designated finance manager approval of the same final version is not recorded.",
  "Vehicle-specific DVS, registration, plate and local-charge rules need validation.",
  "Customer disclosures and lending-program eligibility need review.",
  "Audited approval storage and public activation are not connected."
] as const;

export function paymentActivationStatus() {
  return { enabled: false as const, reasons: paymentReleaseGates };
}
