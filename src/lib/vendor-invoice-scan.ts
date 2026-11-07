import { billingCents } from "./vendor-billing";

export type InvoiceJob = { id: string; number: string; batch: string; batchId: string | null; vehicle: string; description: string; status: string };
export type InvoiceScan = {
  number: string; issueDate: string; dueDate: string; total: string; tax: string; title: string;
  category: string; batchId: string; vendorDetected: boolean; multipleInvoices: boolean;
  lines: Array<{ description: string; amount: string; workJobId: string }>;
  warnings: string[]; text: string;
  vehicleReference?:string;
  workTicketProposal?:{vehicleReference:string;workType:string;workDescription:string;serviceDate:string;amount:string};
  lineItemsMode?:"DETAIL"|"SUBTOTAL";
  dueDateSource?:"DOCUMENT"|"REVIEW_POLICY"|"STAFF";
  taxProposal?:{amount:string;basis:"TOTAL_MINUS_SUBTOTAL"};
  taxBasis?:"DOCUMENT_OR_STAFF"|"CALCULATED_REVIEW";
};
export const normalizeInvoiceNumber = (value: string) => value.normalize("NFKC").replace(/\s+/g, "").toUpperCase();
const money = (value: string) => { try { return (billingCents(value, true) / 100).toFixed(2); } catch { return ""; } };
function date(value: string) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  const result = m ? `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}` : value;
  return /^\d{4}-\d{2}-\d{2}$/.test(result) && Number.isFinite(Date.parse(result)) && new Date(result).toISOString().slice(0,10) === result ? result : "";
}
function includesReference(text: string, reference: string) {
  if (reference.length < 4) return false;
  const escaped = reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i").test(text);
}
export function parseVendorInvoice(text: string, vendorName: string, jobs: InvoiceJob[] = []): InvoiceScan {
  text = text.slice(0,60000).replace(/\r/g,"\n");
  const warnings: string[] = [];
  const numbers = [...text.matchAll(/\bInvoice\s*(?:Number|No\.?|#)\s*[:#-]?\s*([A-Z0-9][A-Z0-9_./-]{0,99})(?=\s|$)/gi)].map(m=>m[1]);
  const unique = [...new Set(numbers.map(normalizeInvoiceNumber))];
  const readDate = (label: string) => {
    const values=[...text.matchAll(new RegExp(`^\\s*(?:${label})\\s*:?\\s*(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{4})(?=\\s|$)`,"gim"))].map(m=>date(m[1])).filter(Boolean);
    return new Set(values).size===1?values[0]:"";
  };
  const readMoney = (label: string) => {
    const values = [...text.matchAll(new RegExp(`^\\s*(?:${label})\\s*:?\\s*\\$?([\\d,]+\\.\\d{2})\\s*$`,"gim"))].map(m=>money(m[1])).filter(Boolean);
    return new Set(values).size === 1 ? values[0] : "";
  };
  const total = readMoney("Grand Total|Invoice Total|Total Amount|Total"), tax = readMoney("Sales Tax|Tax");
  const headerDates=[...text.slice(0,1800).matchAll(/^\s*(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})(?=\s|$)/gm)].map(m=>date(m[1])).filter(Boolean);
  const explicitIssue=readDate("Invoice Date|Date");
  const issueDate = explicitIssue || (new Set(headerDates).size===1?headerDates[0]:""), dueDate = readDate("Due Date|Payment Due");
  const category = /\b(?:collision|repair|labor|reconditioning|body shop)\b/i.test(text) ? "Vehicle repair / recon" : /\b(?:rent|lease premises)\b/i.test(text) ? "Rent" : /\b(?:supplies|parts)\b/i.test(text) ? "Parts / supplies" : "Other / review";
  const jobMatches=(value:string,job:InvoiceJob)=>includesReference(value,job.number)||(job.vehicle.match(/\b[A-HJ-NPR-Z0-9]{17}\b/gi)||[]).some(vin=>includesReference(value,vin));
  const matches = jobs.filter(j=>j.status!=="CANCELLED" && jobMatches(text,j));
  const batches = [...new Set(jobs.filter(j=>j.status!=="CANCELLED" && j.batchId && includesReference(text,j.batch)).map(j=>j.batchId!))];
  const lines = text.split("\n").flatMap(line=>{
    const match = /^\s*(.{3,300}?)\s+\$?([\d,]+\.\d{2})\s*$/.exec(line);
    if (!match || /\b(?:total|tax|balance|amount due|paid|discount|deposit)\b/i.test(match[1])) return [];
    const amount = money(match[2]); if (!amount || amount==="0.00") return [];
    const linked = matches.filter(j=>jobMatches(line,j));
    return [{description:match[1].trim(),amount,workJobId:linked.length===1?linked[0].id:""}];
  }).slice(0,100);
  const reconciled = Boolean(total && tax && lines.length && lines.reduce((sum,l)=>sum+billingCents(l.amount),0)+billingCents(tax,true)===billingCents(total,true));
  const subtotal=readMoney("Subtotal|Sub Total");
  const taxRegion=/^\s*(?:Subtotal|Sub Total)\s*:?\s*\$?[\d,]+\.\d{2}\s*\n([\s\S]*?)^\s*(?:Grand Total|Invoice Total|Total Amount|Total)\s*:?/im.exec(text)?.[1]||"";
  const taxDelta=!tax&&subtotal&&total?billingCents(total,true)-billingCents(subtotal,true):-1;
  const validTaxAmounts=[...taxRegion.matchAll(/^\s*(?:Tax|Sales Tax)\s*:?\s*\$?([\d,]+\.\d{2})\s*$/gim)];
  const taxProposal=taxDelta>=0&&/\bTax\b/i.test(taxRegion)&&!/shipping|freight|tip|credit|discount|deposit|rounding|balance|fee|charge/i.test(taxRegion)&&!validTaxAmounts.length?{amount:(taxDelta/100).toFixed(2),basis:"TOTAL_MINUS_SUBTOTAL" as const}:undefined;
  const subtotalReconciled=Boolean(subtotal&&total&&tax&&billingCents(subtotal,true)+billingCents(tax,true)===billingCents(total,true)&&billingCents(subtotal,true)>0);
  const descriptions=text.split("\n").filter(line=>/\b(?:R\s*&\s*R|repair|labor|replacement|install|engine|timing|windshield|tire|brake)\b/i.test(line)&&!/responsible|lien|understood|upon signing|secure|amount of repairs|description of.*work/i.test(line)).slice(0,4).join("; ").slice(0,300);
  let finalLines=reconciled?lines:subtotalReconciled?[{description:descriptions||category,amount:subtotal,workJobId:""}]:[];
  if (!reconciled&&!subtotalReconciled) warnings.push("Line items need review. No work amounts have been copied from estimates.");
  if(!reconciled&&subtotalReconciled)warnings.push("Used the printed subtotal as one invoice line because detailed rows did not reconcile. Item details remain in the original invoice.");
  if (!tax) warnings.push("Tax was not read reliably. Confirm the separately stated tax, including zero.");
  if (!total) warnings.push("Invoice total was not read reliably. Check the original total, not a remaining balance.");
  if (!issueDate || !dueDate) warnings.push("Confirm missing dates. Payment terms and today's date are not assumed.");
  if (unique.length>1) warnings.push("Several invoice numbers were found. Split this file into one invoice per file before saving.");
  const vendorWords=vendorName.toLowerCase().match(/[a-z0-9]+/g)?.filter(w=>w.length>2&&!['inc','llc','glass','and','the','company','ltd','corp'].includes(w))||[];
  const vendorDetected = text.toLowerCase().includes(vendorName.toLowerCase()) || (vendorWords.length>=2&&vendorWords.every(w=>new RegExp(`\\b${w}\\b`,"i").test(text)));
  if (!vendorDetected) warnings.push("The selected vendor name was not found. Confirm that this invoice belongs to this vendor.");
  const vins=[...new Set((text.match(/\b[A-HJ-NPR-Z0-9]{17}\b/gi)||[]).filter(v=>/\d/.test(v)).map(v=>v.toUpperCase()))];
  const vehicles=[...new Set([...text.matchAll(/\b((?:19|20)\d{2}\s+[A-Z][A-Z0-9-]{1,20}\s+[A-Z0-9][A-Z0-9 .-]{0,45})\s*$/gim)].map(m=>m[1].trim().replace(/\s+/g," ")))];
  const vehicleReference=vins.length===1?vins[0]:vehicles.length===1?vehicles[0]:"";
  if(matches.length===1&&finalLines.every(l=>!l.workJobId||l.workJobId===matches[0].id)){
    finalLines=finalLines.map(l=>({...l,workJobId:matches[0].id}));warnings.push("Work lines were suggested for the single exact ticket/VIN identified in this invoice. Confirm the match.");
  }
  const similar=vehicleReference?jobs.filter(j=>j.status!=="CANCELLED"&&j.vehicle.toUpperCase().replace(/\W/g,"")===vehicleReference.toUpperCase().replace(/\W/g,"")):[];
  const workTicketProposal=vehicleReference&&issueDate&&finalLines.length&&finalLines.every(l=>!l.workJobId)&&!similar.length?{vehicleReference,workType:category,workDescription:descriptions||category,serviceDate:issueDate,amount:(finalLines.reduce((sum,l)=>sum+billingCents(l.amount),0)/100).toFixed(2)}:undefined;
  if(workTicketProposal)warnings.push("A new vendor work ticket is prepared from the printed vehicle and invoice. Confirm its vehicle reference and service date; this does not verify inventory identity or approve work/QC.");
  if(similar.length&&!matches.length)warnings.push("An existing ticket has a similar vehicle reference. Select the correct ticket instead of creating a duplicate.");
  return {number:unique.length===1?numbers[0]:"",issueDate,dueDate,total,tax,title:descriptions||category,category,batchId:batches.length===1?batches[0]:"",vendorDetected,multipleInvoices:unique.length>1,lines:finalLines,warnings,text,vehicleReference,workTicketProposal,taxProposal,lineItemsMode:reconciled?"DETAIL":subtotalReconciled?"SUBTOTAL":undefined};
}
