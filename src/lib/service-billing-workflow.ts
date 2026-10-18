type BillingContext = {
  packages: readonly { id: string; billingMode: string; mismatchCodes: readonly string[]; preview?: { lines: readonly unknown[]; totalCents: number } | null }[];
  invoices: readonly { id: string; status: string }[];
};

export function nextBillingTask(billing: BillingContext) {
  const posted = billing.invoices.find(invoice => invoice.status === "POSTED");
  if (posted) return { action: "PAYMENT", subjectId: posted.id };
  const latest = billing.packages[0];
  if (latest?.billingMode === "NATIVE" && latest.preview && Array.isArray(latest.preview.lines) && latest.preview.lines.length > 0 && Number.isSafeInteger(latest.preview.totalCents) && latest.preview.totalCents >= 0 && !latest.mismatchCodes.length && !billing.invoices.some(invoice => invoice.id === latest.id)) return { action: "POST_INVOICE", subjectId: latest.id };
  return { action: "PREPARE_INVOICE", subjectId: "" };
}

export function invoiceHoldLabel(code: string) {
  return code.replace(/^INVOICE_/, "").toLowerCase().replaceAll("_", " ");
}
