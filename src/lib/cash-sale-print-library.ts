import { CASH_SALE_FORM_IDS, CASH_SALE_LABELS, CASH_SALE_REQUIRED_IDS, type CashSaleFacts } from "./cash-retail-sale";
export const CASH_SIGNING_TEMPLATE_VERSION = "TMS-MN-SIGNING-1.0 / HDR-02";
export const CASH_SIGNING_TEMPLATE_FILES: Record<string, string> = {
  "sales-agreement":"01-motor-vehicle-purchase-agreement.pdf", "title-damage-disclosure":"02-title-and-damage-disclosure.pdf",
  "we-owe":"03-promised-work-we-owe.pdf", "delivery-documents":"04-vehicle-delivery-receipt.pdf",
  "arbitration-agreement":"05-separate-arbitration-agreement.pdf", "power-of-attorney":"06-limited-power-of-attorney.pdf",
  "as-is-acknowledgment":"07-conditional-as-is-acknowledgment.pdf", "warranty-disclosure":"10-limited-used-vehicle-warranty.pdf"
};
export const CASH_PRINT_CATALOG = [...CASH_SALE_FORM_IDS,"trade-documents"].map(id=>({
  id, label:CASH_SALE_LABELS[id], language:"English", category:["sales-agreement","binding-contract-disclosure","arbitration-agreement"].includes(id) ? "Sale agreements" : ["title-damage-disclosure","odometer-disclosure","title-registration-application","title-assignment","power-of-attorney","trade-documents"].includes(id) ? "Title & DMV" : ["buyers-guide","warranty-disclosure","as-is-acknowledgment"].includes(id) ? "Warranty" : "Payment & delivery",
  version:CASH_SIGNING_TEMPLATE_FILES[id] ? CASH_SIGNING_TEMPLATE_VERSION : "Current workflow", finalTemplate:Boolean(CASH_SIGNING_TEMPLATE_FILES[id]), baseline:CASH_SALE_REQUIRED_IDS.includes(id)
}));
export function cashFormUnavailable(id:string,facts:CashSaleFacts) {
  if(id==="as-is-acknowledgment" && facts.warrantyType!=="No dealer warranty - eligibility reviewed")return "Choose reviewed no-dealer-warranty terms before using this conditional form.";
  if(id==="warranty-disclosure" && facts.warrantyType==="No dealer warranty - eligibility reviewed")return "Not used with the no-dealer-warranty election.";
  if(id==="trade-documents" && !facts.tradeVin)return "Enter a trade-in VIN to use this form.";
  return "";
}
export function cashDefaultFormIds(facts:CashSaleFacts) {
  return CASH_SALE_FORM_IDS.filter(id=>id!=="arbitration-agreement" && id!=="as-is-acknowledgment" && !cashFormUnavailable(id,facts));
}
export const CASH_PRINT_PACKS = [
  {id:"cash-signing",label:"Cash sale signing pack",detail:"Purchase agreement, disclosures, Buyers Guide and applicable warranty.",ids:[...CASH_SALE_REQUIRED_IDS,"title-damage-disclosure","buyers-guide","warranty-disclosure","as-is-acknowledgment"]},
  {id:"title-dmv",label:"Title & DMV pack",detail:"Title worksheet, odometer, tax itemization, title checklist and limited POA.",ids:["title-registration-application","odometer-disclosure","title-damage-disclosure","tax-fee-receipt","title-assignment","power-of-attorney"]},
  {id:"delivery",label:"Delivery & promises pack",detail:"Delivery receipt, We Owe, insurance and payment records.",ids:["delivery-documents","we-owe","insurance-proof","funding-proof"]},
  {id:"full",label:"Full applicable cash packet",detail:"All applicable cash-sale forms. Arbitration remains a separate optional selection.",ids:CASH_SALE_FORM_IDS.filter(id=>id!=="arbitration-agreement")}
];
export type CashPrintPack = { id: string; label: string; detail: string; ids: string[]; updatedAt?: string; canEdit?: boolean };
export function cashPrintPackIds(packIds:string[],facts:CashSaleFacts, custom: CashPrintPack[] = []) {
  return [...new Set([...CASH_PRINT_PACKS, ...custom].filter(pack=>packIds.includes(pack.id)).flatMap(pack=>pack.ids))].filter(id=>CASH_PRINT_CATALOG.some(form=>form.id===id) && !cashFormUnavailable(id,facts));
}
export function validateCashPrintPack(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Enter the print pack name and choose its forms.");
  const raw = value as Record<string, unknown>;
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  const detail = typeof raw.detail === "string" ? raw.detail.trim() : "";
  if (!label || label.length > 80 || detail.length > 300) throw new Error("Use a pack name of 1–80 characters and an optional description of up to 300 characters.");
  if (!Array.isArray(raw.ids) || !raw.ids.length || raw.ids.length > CASH_PRINT_CATALOG.length || raw.ids.some(id=>typeof id !== "string" || !CASH_PRINT_CATALOG.some(form=>form.id===id))) throw new Error("Choose at least one available form for this print pack.");
  return { label, detail, ids: [...new Set(raw.ids as string[])] };
}
export function cashGenerationIds(selected:string[],facts:CashSaleFacts) {
  return [...new Set([...CASH_SALE_REQUIRED_IDS,...selected,...(facts.tradeVin ? ["trade-documents"] : [])])].filter(id=>CASH_PRINT_CATALOG.some(form=>form.id===id));
}
