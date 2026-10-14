export const SALES_DOCUMENT_PATHWAYS = {
  "retail-sale": "Retail Cash / One Pay",
  "outside-finance-one-pay": "Retail Outside Finance",
  finance: "Dealer Finance",
  bhph: "BHPH",
  "lease-to-own": "Lease-to-Own",
  wholesale: "Wholesale",
  "daily-rental": "Daily Rental",
  "vehicle-loaner": "Vehicle Loaner",
  "test-drive": "Test Drive",
  repairs: "Repairs",
  "warranty-products": "Warranty Products",
  "financing-products": "Financing Products"
} as const;

export type SalesDocumentPathway = keyof typeof SALES_DOCUMENT_PATHWAYS;
export type PacketPhase = "CLOSING" | "CHECKOUT" | "RETURN";
export type SalesDocumentRequirement = {
  id: string;
  label: string;
  phase: PacketPhase;
  required: boolean;
  signed: boolean;
  waiver?: { by: string; at: string; reason: string };
};

export function isSalesDocumentPathway(value: string): value is SalesDocumentPathway {
  return Object.hasOwn(SALES_DOCUMENT_PATHWAYS, value);
}

export function salesDocumentRequirements(pathway: SalesDocumentPathway): SalesDocumentRequirement[] {
  const returning = ["daily-rental", "vehicle-loaner", "test-drive"].includes(pathway);
  const phase: PacketPhase = returning ? "CHECKOUT" : "CLOSING";
  const item = (id: string, label: string, signed = false, required = true, itemPhase: PacketPhase = phase): SalesDocumentRequirement => ({ id, label, signed, required, phase: itemPhase });
  if (returning) return [
    item("signed-agreement", pathway === "test-drive" ? "Signed test-drive agreement" : pathway === "vehicle-loaner" ? "Signed loaner agreement" : "Signed rental agreement", true),
    item("driver-license", "Driver license"),
    item("insurance-proof", "Coverage / insurance proof"),
    item("release-condition", "Checkout condition record"),
    item("return-condition", "Return condition record", false, true, "RETURN"),
    item("return-receipt", "Return receipt / final charges", false, true, "RETURN")
  ];
  if (pathway === "repairs") return [item("repair-authorization", "Signed repair authorization", true), item("repair-invoice", "Final repair invoice"), item("payment-proof", "Payment / settlement proof")];
  if (["warranty-products", "financing-products"].includes(pathway)) return [item("product-agreement", "Signed product agreement", true), item("product-disclosure", "Signed product disclosure", true), item("payment-proof", "Payment / funding proof")];
  const base = [
    item("sales-agreement", "Signed purchase agreement", true),
    item("odometer-disclosure", "Odometer disclosure", true),
    item("title-assignment", "Title transfer documents"),
    item("funding-proof", "Payment / funding proof"),
    item("delivery-documents", "Signed delivery record", true),
    item("trade-documents", "Trade-in documents", false, false)
  ];
  if (pathway !== "wholesale") base.push(item("tax-fee-receipt", "Taxes and fees receipt"), item("buyers-guide", "Buyer's Guide", true), item("binding-contract-disclosure", "Binding contract disclosure", true));
  if (["outside-finance-one-pay", "finance"].includes(pathway)) base.push(item("lender-approval", "Lender approval / stipulations"), item("lienholder", "Lienholder confirmation"));
  if (pathway === "bhph") base.push(item("retail-installment-contract", "Signed installment contract", true), item("payment-schedule", "Payment schedule"), item("insurance-proof", "Insurance proof"));
  if (pathway === "lease-to-own") base.push(item("lease-agreement", "Signed lease agreement", true), item("payment-schedule", "Payment schedule"), item("insurance-proof", "Insurance proof"));
  return base;
}

export function normalizeSalesDocumentType(id: string) {
  const aliases: Record<string, string> = {
    "td-signed-release": "signed-agreement", "test-drive-agreement": "signed-agreement", "td-license": "driver-license", "td-insurance": "insurance-proof",
    "daily-rental-agreement": "signed-agreement", "courtesy-loaner-agreement": "signed-agreement",
    "bhph-retail-installment-contract": "retail-installment-contract", "bhph-installment-contract": "retail-installment-contract",
    "bhph-payment-schedule-servicing": "payment-schedule", "lease-to-own-agreement": "lease-agreement", "w2-lease": "lease-agreement"
  };
  return aliases[id] ?? id;
}
