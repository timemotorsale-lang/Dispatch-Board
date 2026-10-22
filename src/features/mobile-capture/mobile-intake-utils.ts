import { idFromBarcode } from "./barcode-review";
import { emptyIdFields, type FrontIdFields } from "./id-capture-fields";

export async function intakeRequest<Result>(url: string, options?: RequestInit): Promise<Result> {
  const response = await fetch(url, { ...options, cache: "no-store" });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(result?.error ?? "Connection interrupted. Your entries are still here. Retry when connected.");
  return result as Result;
}

export function customerDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const american = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/) ?? trimmed.match(/^(\d{2})(\d{2})(\d{4})$/);
  const normalized = iso ? trimmed : american ? `${american[3]}-${american[1].padStart(2, "0")}-${american[2].padStart(2, "0")}` : "";
  const parsed = new Date(`${normalized}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === normalized ? normalized : "";
}

export function customerFieldsFromBarcode(value: string): FrontIdFields | null {
  const identity = idFromBarcode(value);
  if (!identity) return null;
  const normalized = value.replace(/[\x1c-\x1f]/g, "\n");
  const field = (code: string) => normalized.match(new RegExp(`(?:^|[\\r\\n]|DL|ID)${code}([^\\r\\n]*)`))?.[1]?.replace(/[\x00-\x1f\x7f]/g, "").trim() ?? "";
  return {
    ...emptyIdFields(), fullName: identity.name, licenseNumber: identity.number, issuingState: identity.state,
    dateOfBirth: customerDate(field("DBB")), expirationDate: customerDate(field("DBA")),
    address: [field("DAG"), field("DAI"), field("DAJ"), field("DAK")].filter(Boolean).join(", ").slice(0, 500)
  };
}
