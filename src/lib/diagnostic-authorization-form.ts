export const maxDiagnosticFeeCents = 2_147_483_647;

export const diagnosticAuthorizationScope = "I authorize Time Motor Sales to inspect and diagnose the concern shown above and prepare a repair estimate. I agree to the flat diagnostic fee shown. Repairs require my separate approval.";

export const diagnosticFeeError = "Enter a valid flat diagnostic fee, including 0 for no charge.";

export function parseDiagnosticFee(value: string) {
  const amount = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) return null;
  const [dollars, cents = ""] = amount.split(".");
  const feeCents = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
  return feeCents <= maxDiagnosticFeeCents ? feeCents : null;
}

export function formatDiagnosticFee(feeCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(feeCents / 100);
}

export function diagnosticAuthorizationPrintHref(repairOrderId: string) {
  return `/repair-orders/${encodeURIComponent(repairOrderId)}/diagnostic-authorization/print`;
}
