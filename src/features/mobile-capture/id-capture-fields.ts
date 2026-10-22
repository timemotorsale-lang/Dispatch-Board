export const idFieldLabels = {
  fullName: "Full name", licenseNumber: "ID / license number", issuingState: "Issuing state",
  dateOfBirth: "Date of birth", expirationDate: "Expiration date", address: "Address"
} as const;
export type IdFieldKey = keyof typeof idFieldLabels;
export type FrontIdFields = Record<IdFieldKey, string>;

export function emptyIdFields(): FrontIdFields {
  return { fullName: "", licenseNumber: "", issuingState: "", dateOfBirth: "", expirationDate: "", address: "" };
}

export function frontIdFieldsFromText(text: string): FrontIdFields {
  const normalized = text.replace(/\r/g, "\n").replace(/[\x00-\x09\x0b-\x1f]/g, " ").slice(0, 30000);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const match = (pattern: RegExp) => normalized.match(pattern)?.[1]?.trim() ?? "";
  const date = (labels: string) => match(new RegExp(`\\b(?:${labels})\\s*[:#-]?\\s*(\\d{1,2}[/-]\\d{1,2}[/-](?:\\d{4}|\\d{2}))\\b`, "i"));
  const named = match(/(?:^|\n)\s*(?:full name|name)\s*[:#-]\s*([^\n]+)/i);
  const first = match(/(?:^|\n)\s*(?:2\s+|first name\s*[:#-]\s*)([^\n]+)/i);
  const last = match(/(?:^|\n)\s*(?:1\s+|last name\s*[:#-]\s*)([^\n]+)/i);
  const number = match(/\b(?:ID\s*(?:\/\s*license)?\s*(?:number|no\.?|#)|license\s*(?:number|no\.?|#)|DL\s*(?:number|no\.?|#)|4d)\s*[:#-]?\s*([A-Z0-9-]{4,30})\b/i);
  return {
    fullName: (named || [first, last].filter(Boolean).join(" ") || lines.find((line) => /^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3}$/.test(line) && !/driver|license|identification|department|secretary|united states|organ donor/i.test(line)) || "").slice(0, 160),
    licenseNumber: number.toUpperCase(),
    issuingState: match(/\b(?:issuing state|state)\s*[:#-]\s*([A-Z]{2})\b/i).toUpperCase(),
    dateOfBirth: date("date of birth|dob|birth"),
    expirationDate: date("expiration date|expiration|expires|exp"),
    address: (match(/(?:^|\n)\s*address\s*[:#-]\s*([^\n]+)/i) || lines.find((line) => /^\d{1,6}\s+.+\b(?:street|st|avenue|ave|road|rd|blvd|drive|dr|lane|ln|court|ct)\b/i.test(line)) || "").slice(0, 180)
  };
}

export function compareIdSides(front: FrontIdFields, back: { name: string; number: string; state: string }) {
  const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const sameName = (first: string, second: string) => first.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ") === second.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
  return ([
    ["fullName", back.name], ["licenseNumber", back.number], ["issuingState", back.state]
  ] as const).map(([key, value]) => ({ key, label: idFieldLabels[key], status: !front[key] || !value ? "NOT_READ" as const : (key === "fullName" ? sameName(front[key], value) : normalize(front[key]) === normalize(value)) ? "MATCH" as const : "MISMATCH" as const }));
}
