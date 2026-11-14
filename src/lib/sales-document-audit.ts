export const salesDocumentMetadata = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const isExcludedSalesDocument = (value: unknown) => salesDocumentMetadata(value).excludedFromDeal === true;
export function assessSalesDocument(fields: Record<string, string>, deal: { vin: string | null; stockNumber: string | null; customerName: string }) {
  const normalize = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const checks = [
    { label: "VIN", printed: fields.vin || "", expected: deal.vin || "" },
    { label: "Customer", printed: fields.signer || "", expected: deal.customerName },
    { label: "Stock number", printed: fields.stockNumber || "", expected: deal.stockNumber || "" },
  ].map(item => ({ ...item, status: !item.printed || !item.expected ? "Not confirmed" : normalize(item.printed) === normalize(item.expected) ? "Matches" : "Mismatch — review original" }));
  return { status: checks.some(item => item.status.startsWith("Mismatch")) ? "Possible wrong deal" : checks.filter(item => item.label !== "Stock number").every(item => item.status === "Matches") ? "Matches available identity fields" : "Needs review", checks };
}
