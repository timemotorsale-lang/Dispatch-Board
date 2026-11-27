import { createHash } from "node:crypto";
import { CLAIM_AUTHORIZATION_HEADER as company } from "@/lib/claim-customer-authorization";
import { depositCurrency, depositDate, depositDisclosure, depositMethods, depositNumber, type DepositMethod } from "@/lib/customer-sales-deposits";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { dealDeskLogoHtml } from "@/server/services/deal-desk-document-brand";
import type { DepositReceipt } from "./customer-sales-deposits";

const escape = (value: string) => value.replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character] ?? character);

const printScript = [
  "const trigger=document.getElementById('print-receipt');",
  "trigger.addEventListener('click',()=>window.print());",
  "if(trigger.hasAttribute('data-print-on-load'))window.addEventListener('load',()=>{",
  "const url=new URL(location.href);url.searchParams.delete('print');",
  "try{history.replaceState(null,'',url.href);}finally{window.print();}},{once:true});"
].join("");
export const depositReceiptCsp = `default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'sha256-${createHash("sha256").update(printScript).digest("base64")}'; frame-ancestors 'none'; base-uri 'none'`;

export function renderCustomerDepositReceipt(receipt: DepositReceipt, printOnLoad = false) {
  const number = depositNumber(receipt.id);
  const header = receipt.organizationId === INITIAL_ORGANIZATION.id
    ? `${dealDeskLogoHtml()}<div class="company"><strong>${escape(company.name)}</strong><p>${escape(company.address)}</p>
       <p>${escape(company.website)} · ${escape(company.email)} · ${escape(company.phone)}</p></div>`
    : `<div class="company"><strong>${escape(receipt.companyName)}</strong></div>`;
  const fields: Array<[string, string]> = [
    ["Receipt number", number],
    ["Received (Central)", depositDate(receipt.receivedAt)],
    ["Customer", receipt.customerName],
    ...(receipt.customerNumber ? [["Customer number", receipt.customerNumber] as [string, string]] : []),
    ...(receipt.customerPhone ? [["Customer phone", receipt.customerPhone] as [string, string]] : []),
    ...(receipt.customerEmail ? [["Customer email", receipt.customerEmail] as [string, string]] : []),
    ...(receipt.customerAddress ? [["Customer address", receipt.customerAddress] as [string, string]] : []),
    ["Amount received", depositCurrency(receipt.amountCents)],
    ["Payment method", depositMethods[receipt.method as DepositMethod]],
    ["Vehicle", receipt.vehicleLabel ?? "Not linked"],
    ...(receipt.vin ? [["VIN", receipt.vin] as [string, string]] : []),
    ["Received by", receipt.receivedByName]
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Deposit agreement and receipt ${escape(number)}</title><style>
body{margin:2rem auto;padding:0 1rem;max-width:48rem;color:#15233c;font:16px/1.45 system-ui,sans-serif}
h1{margin:.4rem 0}h2{font-size:1.1rem}.fields{display:grid;grid-template-columns:1fr 2fr;gap:.4rem 1rem;border-block:1px solid #aeb9cb;padding:1rem 0}
dt{font-weight:650}dd{margin:0;overflow-wrap:anywhere;white-space:pre-line}.company{margin:.6rem 0 1rem}.company p{margin:.15rem 0}.notice{font-size:10pt;font-weight:700}.signatures{margin-block:1.8rem 0}.office{color:#4e5971}.refund{border:1px solid;padding:.6rem}
@media print{body{margin:0;max-width:none;padding:0;color:#000}.office{display:none}section{break-inside:avoid}}
</style></head><body>
<div class="office"><a href="/crm-next/customers/${encodeURIComponent(receipt.customerId)}#deals">Back to deposits</a> <button type="button" id="print-receipt"${printOnLoad ? " data-print-on-load" : ""}>Print agreement and receipt</button><p>Use the browser Print command to print or save a PDF copy.</p></div><script>${printScript}</script>
<header>${header}<h1>Deposit agreement and receipt</h1></header>
<dl class="fields">${fields.map(([name,value]) => `<dt>${escape(name)}</dt><dd>${escape(value)}</dd>`).join("")}</dl>
${receipt.refundedAt ? `<p class="refund"><strong>Full refund recorded</strong> · ${escape(depositCurrency(receipt.amountCents))} · ${escape(depositDate(receipt.refundedAt))} Central${receipt.vehicleId ? " · Deposit hold released" : ""}</p>` : ""}
<section aria-label="Deposit agreement"><h2>Deposit agreement</h2>${receipt.terms.split("\n").map(line => `<p>${escape(line)}</p>`).join("")}
<p class="notice">${escape(depositDisclosure)}</p>
<p class="signatures">Purchaser signature _________________________ Date ___________</p>
<p class="signatures">Dealership representative ____________________ Date ___________</p></section></body></html>`;
}
