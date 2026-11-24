export function rentalLifecycle(booking: { status: string; expectedReturnAt: Date | string } | null | undefined, now = new Date()) {
  if (!booking) return "Rental Draft";
  if (booking.status === "RETURNED") return "Rental Returned";
  if (booking.status === "CANCELLED") return "Rental Cancelled";
  if (booking.status !== "CHECKED_OUT") return "Ready for Checkout";
  const remaining = new Date(booking.expectedReturnAt).getTime() - now.getTime();
  return remaining <= 0 ? "Rental Overdue" : remaining <= 86400000 ? "Rental Due Soon" : "Rental Active";
}

export function validateRentalCoverage(raw: Record<string, unknown>, occurredAt: Date, dueAt: Date) {
  const coverage = new Date(String(raw.insuranceValidUntil ?? ""));
  if (!raw.insuranceValidUntil) throw new Error("Enter the coverage end time shown on the accepted insurance proof.");
  if (!/T.*(Z|[+-]\d{2}:\d{2})$/.test(String(raw.insuranceValidUntil ?? "")) || !Number.isFinite(coverage.getTime()) || coverage < dueAt || coverage < occurredAt) throw new Error("Verified insurance must cover the expected return time.");
}

export function validateRentalHandover<Document extends { id?: string; documentType: string; status: string; source: string; classificationSnapshot: unknown }>(raw: Record<string, unknown>, documents: Document[], occurredAt: Date, dueAt: Date) {
  if (raw.physicalHandover !== true || raw.insuranceVerified !== true) throw new Error("Confirm physical handover and verified insurance before activating this rental.");
  const accepted = documents.filter(document => document.status === "ACCEPTED" && document.source !== "GENERATED");
  const signed = accepted.find(document => document.documentType === "signed-agreement" && (document.classificationSnapshot as { signed?: boolean } | null)?.signed === true);
  if (!signed) throw new Error("An accepted, signed rental agreement is required.");
  const insuranceProofs = accepted.filter(document => document.documentType === "insurance-proof");
  if (!insuranceProofs.length) throw new Error("Accepted insurance proof is required.");
  const selectedProof = typeof raw.insuranceDocumentId === "string" ? raw.insuranceDocumentId.trim() : "";
  const insurance = selectedProof ? insuranceProofs.find(document => document.id === selectedProof) : insuranceProofs.length === 1 ? insuranceProofs[0] : undefined;
  if (!insurance) throw new Error("Choose the accepted insurance proof you verified for this checkout.");
  validateRentalCoverage(raw, occurredAt, dueAt);
  const timezone = String(raw.timezone ?? "");
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(); } catch { throw new Error("Select a valid handover timezone."); }
  if (!timezone) throw new Error("Record the handover timezone.");
  return [signed, insurance, ...accepted.filter(document => document.documentType === "release-condition")];
}
