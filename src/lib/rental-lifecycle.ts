export function rentalLifecycle(booking: { status: string; expectedReturnAt: Date | string } | null | undefined, now = new Date()) {
  if (!booking) return "Rental Draft";
  if (booking.status === "RETURNED") return "Rental Returned";
  if (booking.status === "CANCELLED") return "Rental Cancelled";
  if (booking.status !== "CHECKED_OUT") return "Ready for Checkout";
  const remaining = new Date(booking.expectedReturnAt).getTime() - now.getTime();
  return remaining <= 0 ? "Rental Overdue" : remaining <= 86400000 ? "Rental Due Soon" : "Rental Active";
}

export function validateRentalHandover(raw: Record<string, unknown>, documents: { documentType: string; status: string; source: string; classificationSnapshot: unknown }[], occurredAt: Date, dueAt: Date) {
  if (raw.physicalHandover !== true || raw.insuranceVerified !== true) throw new Error("Confirm physical handover and verified insurance before activating this rental.");
  if (!documents.some(document => document.documentType === "signed-agreement" && document.status === "ACCEPTED" && document.source !== "GENERATED" && (document.classificationSnapshot as { signed?: boolean } | null)?.signed === true)) throw new Error("An accepted, signed rental agreement is required.");
  if (!documents.some(document => document.documentType === "insurance-proof" && document.status === "ACCEPTED" && document.source !== "GENERATED")) throw new Error("Accepted insurance proof is required.");
  const coverage = new Date(String(raw.insuranceValidUntil ?? ""));
  if (!/T.*(Z|[+-]\d{2}:\d{2})$/.test(String(raw.insuranceValidUntil ?? "")) || !Number.isFinite(coverage.getTime()) || coverage < dueAt || coverage < occurredAt) throw new Error("Verified insurance must cover the expected return time.");
  const timezone = String(raw.timezone ?? "");
  try { new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(); } catch { throw new Error("Select a valid handover timezone."); }
  if (!timezone) throw new Error("Record the handover timezone.");
}
