import { normalizeInvoiceNumber, parseVendorInvoice, type InvoiceJob, type InvoiceScan } from "./vendor-invoice-scan";

export const MAX_INVOICE_BATCH_PAGES = 24;
export type InvoicePage = { page: number; text: string; readable: boolean };
export type InvoicePageGroup = { pages: number[]; scan: InvoiceScan };
export function invoiceGroups(pages: InvoicePage[], vendorName: string, jobs: InvoiceJob[]): InvoicePageGroup[] {
  const groups: number[][] = [];
  let previous = "";
  for (const page of pages) {
    const scan = parseVendorInvoice(page.text, vendorName, jobs);
    const number = normalizeInvoiceNumber(scan.number);
    if (!groups.length || (number && number !== previous)) groups.push([]);
    groups[groups.length - 1].push(page.page);
    if (number) previous = number;
  }
  return groups.map(group => ({ pages: group, scan: scanPageGroup(pages,group,vendorName,jobs) }));
}
export function scanPageGroup(pages: InvoicePage[], selected: number[], vendorName: string, jobs: InvoiceJob[]) {
  const chosen = pages.filter(p => selected.includes(p.page));
  const scan = parseVendorInvoice(chosen.map(p => p.text).join("\n"),vendorName,jobs);
  if(chosen.some(p=>!p.readable))scan.warnings.push("Some pages could not be read. Check the original pages and complete missing fields.");
  scan.warnings.push(`Original pages: ${selected.join(", ")}. Confirm that all these pages belong to this invoice.`);
  return scan;
}
// A complete partition prevents silently omitted, overlapping, or reordered pages.
export function parseInvoiceRanges(value: string, count: number): number[][] {
  if(!Number.isInteger(count)||count<1||count>MAX_INVOICE_BATCH_PAGES)throw new Error("This batch supports 1–24 pages.");
  const groups=value.split(";").map(part=>{
    const match=/^\s*(\d+)(?:\s*-\s*(\d+))?\s*$/.exec(part);
    if(!match)throw new Error("Use page groups such as 1-2; 3; 4-5.");
    const start=Number(match[1]),end=Number(match[2]||match[1]);
    if(start<1||end<start||end>count)throw new Error("Check each page group's start and end.");
    return Array.from({length:end-start+1},(_,i)=>start+i);
  });
  if(groups.flat().join(",")!==Array.from({length:count},(_,i)=>i+1).join(","))throw new Error("Include every page exactly once, in original order.");
  return groups;
}
export const formatInvoiceRanges=(groups:number[][])=>groups.map(p=>p.length===1?`${p[0]}`:`${p[0]}-${p[p.length-1]}`).join("; ");
export const invoiceBatchMarker=(id:string)=>`[Batch:${id}]`;
