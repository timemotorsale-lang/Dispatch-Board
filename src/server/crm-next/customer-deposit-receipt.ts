import { createHash } from "node:crypto";
import { depositCurrency, depositDate, depositDisclosure, depositMethods, depositNumber, type DepositMethod } from "@/lib/customer-sales-deposits";
import { dealDeskLogoHtml } from "@/server/services/deal-desk-document-brand";
import type { DepositReceipt } from "./customer-sales-deposits";

const escape = (value: string) => value.replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character] ?? character);

const printScript = "document.getElementById('print-receipt').addEventListener('click',function(){window.print()})";
export const depositReceiptCsp = `default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'sha256-${createHash("sha256").update(printScript).digest("base64")}'; frame-ancestors 'none'; base-uri 'none'`;

export function renderCustomerDepositReceipt(receipt: DepositReceipt) {
  const number = depositNumber(receipt.id);
  const fields: Array<[string, string]> = [
    ["Receipt number", number],
    ["Received (Central)", depositDate(receipt.receivedAt)],
    ["Customer", receipt.customerName],
    ["Amount received", depositCurrency(receipt.amountCents)],
    ["Payment method", depositMethods[receipt.method as DepositMethod]],
    ["Vehicle", receipt.vehicleLabel ?? "Not linked"],
    ...(receipt.vin ? [["VIN", receipt.vin] as [string, string]] : []),
    ["Received by", receipt.receivedByName]
  ];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Deposit receipt ${escape(number)}</title><style>
body{margin:2rem auto;padding:0 1rem;max-width:48rem;color:#15233c;font:16px/1.45 system-ui,sans-serif}
h1{margin:.4rem 0}h2{font-size:1.1rem}.fields{display:grid;grid-template-columns:1fr 2fr;gap:.4rem 1rem;border-block:1px solid #aeb9cb;padding:1rem 0}
dt{font-weight:650}dd{margin:0;overflow-wrap:anywhere}.notice{font-size:10pt;font-weight:700}.signatures{margin-block:1.8rem 0}.office{color:#4e5971}.refund{border:1px solid;padding:.6rem}
@media print{body{margin:0;max-width:none;padding:0;color:#000}.office{display:none}section{break-inside:avoid}}
</style></head><body>
<div class="office"><button type="button" id="print-receipt">Print receipt</button><p>Use the browser Print command to print or save a PDF copy.</p></div><script>${printScript}</script>
<header>${dealDeskLogoHtml()}<h1>Deposit receipt</h1><p>${escape(receipt.companyName)}</p></header>
<dl class="fields">${fields.map(([name,value]) => `<dt>${escape(name)}</dt><dd>${escape(value)}</dd>`).join("")}</dl>
${receipt.refundedAt ? `<p class="refund"><strong>Full refund recorded</strong> · ${escape(depositCurrency(receipt.amountCents))} · ${escape(depositDate(receipt.refundedAt))} Central${receipt.vehicleId ? " · Deposit hold released" : ""}</p>` : ""}
<section aria-label="Deposit agreement"><h2>Deposit agreement</h2>${receipt.terms.split("\n").map(line => `<p>${escape(line)}</p>`).join("")}
<p class="notice">${escape(depositDisclosure)}</p>
<p class="signatures">Purchaser signature _________________________ Date ___________</p>
<p class="signatures">Dealership representative ____________________ Date ___________</p></section></body></html>`;
}
