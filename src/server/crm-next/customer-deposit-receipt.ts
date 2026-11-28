import { createHash } from "node:crypto";
import { CLAIM_AUTHORIZATION_HEADER as company } from "@/lib/claim-customer-authorization";
import { depositCurrency, depositDate, depositDisclosure, depositKinds, depositMethods, depositNumber, type DepositMethod } from "@/lib/customer-sales-deposits";
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

export function depositReceiptSummary(receipt: DepositReceipt): Array<[string, string]> {
  return [["Receipt number", depositNumber(receipt.id)], ["Received (Central)", depositDate(receipt.receivedAt)], ["Amount received", depositCurrency(receipt.amountCents)]];
}

export function depositReceiptCustomerDetails(receipt: DepositReceipt) {
  return [receipt.customerNumber ? `Customer # ${receipt.customerNumber}` : null,
    receipt.customerPhone, receipt.customerEmail, receipt.customerAddress].filter((value): value is string => Boolean(value));
}

export function depositReceiptFields(receipt: DepositReceipt): Array<[string, string]> {
  return [
    ...(receipt.kind === "RESERVATION" || receipt.kind === "ORDER" ? [["Deposit type", depositKinds[receipt.kind]] as [string, string]] : []),
    ["Payment method", depositMethods[receipt.method as DepositMethod]],
    ["Vehicle", receipt.vehicleLabel ?? "Not linked"],
    ...(receipt.vin ? [["VIN", receipt.vin] as [string, string]] : []),
    ["Received by", receipt.receivedByName]
  ];
}

export function depositReceiptDealer(receipt: DepositReceipt) {
  return receipt.organizationId === INITIAL_ORGANIZATION.id
    ? { branded: true, name: company.name, details: [company.address, company.website, `${company.phone} · ${company.email}`] }
    : { branded: false, name: receipt.companyName, details: [] };
}

export function renderDepositReceiptBody(receipt: DepositReceipt) {
  const dealer = depositReceiptDealer(receipt);
  const detailLines = (details: string[]) => details.map(value => `<p class="party-detail">${escape(value)}</p>`).join("");
  const pairs = (fields: Array<[string, string]>) => fields.map(([name,value]) => `<dt>${escape(name)}</dt><dd>${escape(value)}</dd>`).join("");
  return `<header class="receipt-letterhead">
<div class="receipt-party receipt-dealer">${dealer.branded ? dealDeskLogoHtml() : ""}<p class="party-name">${escape(dealer.name)}</p>${detailLines(dealer.details)}</div>
<div class="receipt-party receipt-customer"><p class="party-label">Customer</p><p class="party-name">${escape(receipt.customerName)}</p>${detailLines(depositReceiptCustomerDetails(receipt))}</div>
</header>
<h1>Deposit agreement and receipt</h1>
<dl class="receipt-summary">${depositReceiptSummary(receipt).map(([label,value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join("")}</dl>
<dl class="fields">${pairs(depositReceiptFields(receipt))}</dl>
${receipt.refundedAt ? `<p class="refund"><strong>Full refund recorded</strong> · ${escape(depositCurrency(receipt.amountCents))} · ${escape(depositDate(receipt.refundedAt))} Central${receipt.vehicleId || receipt.kind === "RESERVATION" ? " · Deposit hold released" : ""}</p>` : ""}
<section aria-label="Deposit agreement"><h2>Deposit agreement</h2>${receipt.terms.split("\n").map(line => `<p>${escape(line)}</p>`).join("")}
<p class="notice">${escape(depositDisclosure)}</p>
<p class="signatures">Purchaser signature _________________________ Date ___________</p>
<p class="signatures">Dealership representative ____________________ Date ___________</p></section>`;
}

export function renderCustomerDepositReceipt(receipt: DepositReceipt, printOnLoad = false, portable = false) {
  const number = depositNumber(receipt.id);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Deposit agreement and receipt ${escape(number)}</title><style>
body{margin:2rem auto;padding:0 1rem;max-width:48rem;color:#15233c;font:16px/1.45 system-ui,sans-serif}
h1{margin:.4rem 0}h2{font-size:1.1rem}.fields{display:grid;grid-template-columns:1fr 2fr;gap:.4rem 1rem;border-block:1px solid #aeb9cb;padding:1rem 0}
dt{font-weight:650}dd{margin:0;overflow-wrap:anywhere;white-space:pre-line}.receipt-letterhead{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);border-bottom:3px solid #15233c;padding-bottom:.7rem;margin-bottom:.65rem}
.receipt-party{min-width:0;padding-right:1rem}.receipt-customer{border-left:1px solid #8b97ad;padding:0 0 0 1rem}
.receipt-party img{max-width:150px!important;margin-bottom:4px!important}.party-name{font-weight:750;margin:0 0 .2rem}
.party-label{color:#4e5971;font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin:0 0 .35rem}
.party-detail{margin:.05rem 0;font-size:12px;line-height:1.35;overflow-wrap:anywhere;white-space:pre-line}
.receipt-summary{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) minmax(0,.8fr);gap:.55rem;background:#f0f3f8;padding:.55rem;margin:.45rem 0}
.receipt-summary div{min-width:0}.receipt-summary dt{font-size:11px;color:#4e5971}.receipt-summary dd{font-size:12px;font-weight:700}
@media screen and (max-width:520px){.receipt-letterhead,.receipt-summary{grid-template-columns:1fr}.receipt-party{padding:0}.receipt-customer{border-left:0;border-top:1px solid #8b97ad;padding-top:.65rem;margin-top:.65rem}}.notice{font-size:10pt;font-weight:700}.signatures{margin-block:1.8rem 0}.office{color:#4e5971}.refund{border:1px solid;padding:.6rem}
@media print{body{margin:0;max-width:none;padding:0;color:#000}.office{display:none}.party-detail{font-size:9pt}.receipt-letterhead{break-inside:avoid}section{break-inside:avoid}}
</style></head><body>
${portable ? "" : `<div class="office"><a href="/crm-next/customers/${encodeURIComponent(receipt.customerId)}?depositReceipt=${encodeURIComponent(receipt.id)}#deals">Back to deposits</a> <button type="button" id="print-receipt"${printOnLoad ? " data-print-on-load" : ""}>Print agreement and receipt</button><p>Use the browser Print command to print or save a PDF copy.</p></div><script>${printScript}</script>`}
${renderDepositReceiptBody(receipt)}</body></html>`;
}
