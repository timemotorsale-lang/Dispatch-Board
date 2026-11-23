export function repairBillingHref(
  repairOrderId: string,
  options: { mode?: "invoice" | "deposit" | "payment"; returnTo?: string; estimateId?: string; invoiceId?: string } = {}
) {
  const query = new URLSearchParams({ repairOrderId });
  if (options.mode) query.set("mode", options.mode);
  if (options.returnTo) query.set("returnTo", options.returnTo);
  if (options.estimateId) query.set("estimateId", options.estimateId);
  if (options.invoiceId) query.set("invoiceId", options.invoiceId);
  return `/vehicles/service-billing?${query}`;
}

export type EstimateDocumentReference = { documentId: string; documentHash: string };

export function matchesEstimateDocument(expected: EstimateDocumentReference, current?: EstimateDocumentReference | null) {
  return Boolean(current && expected.documentId === current.documentId && expected.documentHash === current.documentHash);
}

export function laborGuideInvoiceHref(repairOrderId: string, options: { returnTo?: string; estimateId?: string; estimateDocument?: EstimateDocumentReference } = {}) {
  const query = new URLSearchParams({ repairOrderId, mode: "invoice" });
  if (options.returnTo) query.set("returnTo", options.returnTo);
  if (options.estimateId !== undefined) query.set("estimateId", options.estimateId);
  if (options.estimateDocument) {
    query.set("documentId", options.estimateDocument.documentId);
    query.set("documentHash", options.estimateDocument.documentHash);
  }
  return `/diagnostics/labor-guide?${query}`;
}

export function issuedInvoiceDocumentHref(repairOrderId: string, sourceId: string, options: { documentId?: string; returnTo?: string } = {}) {
  const query = new URLSearchParams({
    repairOrderId, workspace: "1", sourceKind: "INVOICE",
    ...(options.documentId ? { documentId: options.documentId } : { sourceId }),
    ...(options.returnTo ? { returnTo: options.returnTo } : {}),
  });
  return `/service-documents?${query}`;
}

type BillingContext = {
  readiness?: { mismatchCodes: readonly string[] };
  packages: readonly { id: string; billingMode: string; mismatchCodes: readonly string[]; preview?: { lines: readonly unknown[]; totalCents: number } | null }[];
  invoices: readonly { id: string; status: string }[];
};

export function invoicePackageMismatchCodes(codes: unknown, snapshot: unknown, currentFingerprint?: string, currentDocument?: EstimateDocumentReference) {
  const result = Array.isArray(codes) ? codes.filter((code): code is string => typeof code === "string") : [];
  const prior = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot as { fingerprint?: unknown; estimateDocument?: EstimateDocumentReference } : undefined;
  const sourceChanged = currentFingerprint && (prior?.fingerprint !== currentFingerprint ||
    (prior?.estimateDocument && !matchesEstimateDocument(prior.estimateDocument, currentDocument)));
  return sourceChanged ? [...new Set([...result, "INVOICE_SOURCE_CHANGED"])] : result;
}

export function nextBillingTask(billing: BillingContext) {
  const posted = billing.invoices.find(invoice => invoice.status === "POSTED");
  if (posted) return { action: "PAYMENT", subjectId: posted.id };
  if (billing.readiness?.mismatchCodes.length) return { action: "PREPARE_INVOICE", subjectId: "" };
  const latest = billing.packages[0];
  if (latest?.billingMode === "NATIVE" && latest.preview && Array.isArray(latest.preview.lines) && latest.preview.lines.length > 0 && Number.isSafeInteger(latest.preview.totalCents) && latest.preview.totalCents >= 0 && !latest.mismatchCodes.length && !billing.invoices.some(invoice => invoice.id === latest.id)) return { action: "POST_INVOICE", subjectId: latest.id };
  return { action: "PREPARE_INVOICE", subjectId: "" };
}

export function invoiceHoldLabel(code: string) {
  const labels: Record<string, string> = {
    INVOICE_AUTHORIZATION_REQUIRED: "Record customer approval of the current estimate before invoicing.",
    INVOICE_SOURCE_CHANGED: "Document details changed. Prepare a fresh invoice package.",
    INVOICE_JOB_QC_INCOMPLETE: "Record completed repair work and a passed quality check.",
    INVOICE_PART_IDENTITY_MISSING: "Recheck invoice readiness to refresh this older package. A part number is optional.",
    INVOICE_INSTALL_QUANTITY_MISMATCH: "Match installed part quantities to the approved estimate.",
    INVOICE_INSTALL_EVIDENCE_MISSING: "Record the installed parts for this repair.",
    INVOICE_MEASURED_CLOCK_INCOMPLETE: "Finish the recorded technician time for this repair.",
    INVOICE_QC_EVIDENCE_INCOMPLETE: "Complete the required quality-check evidence.",
  };
  if (labels[code]) return labels[code];
  return code.replace(/^INVOICE_/, "").toLowerCase().replaceAll("_", " ");
}
