/** Staff-facing identifier. Never shorten or derive a number from an internal record ID. */
export function formatDealNumber(value: number | string | null | undefined): string {
  const parsed=typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(parsed) && parsed>0 ? String(parsed).padStart(4,"0") : "";
}
