export const captureKinds = ["PHOTO", "DOCUMENT", "ID", "BUSINESS_CARD"] as const;
export type ArchiveKind = typeof captureKinds[number];
export const captureMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const captureBatchLimit = 12;
export const captureByteLimit = 25 * 1024 * 1024;
export const archiveDestinationTypes = ["CUSTOMER", "VEHICLE", "QUICK_UPDATE"] as const;
export type ArchiveDestinationType = typeof archiveDestinationTypes[number];
export type ArchiveTarget = { type: ArchiveDestinationType; id: string; label: string };
export const archiveKindLabel: Record<ArchiveKind, string> = { PHOTO: "Photo", DOCUMENT: "Document", ID: "ID", BUSINESS_CARD: "Business card" };
export const businessCategories = ["Auto sales", "Repair & service", "Parts & supplies", "Towing & transport", "Insurance", "Finance", "Professional services", "Other"] as const;
export type CaptureArchiveRow = {
  id: string; kind: ArchiveKind; fileName: string; contentType: string; description: string; category: string | null;
  businessDetails: { label: string; value: string }[]; destination: ArchiveTarget | null; createdAt: string; revision: number; canEdit: boolean; originalAvailable: boolean;
};

export function categoryFromDescription(description: string) {
  const rules: [typeof businessCategories[number], RegExp][] = [
    ["Towing & transport", /\b(tow(?:ing)?|transport(?:ation)?|hauling|logistics)\b/i],
    ["Parts & supplies", /\b(parts?|supplies|wholesale tires?|equipment)\b/i],
    ["Repair & service", /\b(repair|mechanic|body\s*shop|collision|detailing|recalibration|service center|auto service)\b/i],
    ["Insurance", /\b(insurance|underwriting|adjuster)\b/i],
    ["Finance", /\b(financ\w*|lender|credit union|bank|loans?)\b/i],
    ["Auto sales", /\b(dealer(?:ship)?|auto sales|motors|car sales|auto auction)\b/i],
    ["Professional services", /\b(attorney|law firm|account\w*|consult\w*|real estate|tax|marketing)\b/i],
  ];
  return rules.find(([, pattern]) => pattern.test(description))?.[0] ?? null;
}

export const archiveFileHref = (id: string) => `/api/capture-archive/file?id=${encodeURIComponent(id)}`;
export function captureFileError(file: Pick<File, "size" | "type">) {
  if (!(captureMimeTypes as readonly string[]).includes(file.type)) return "Choose a PDF, JPEG, PNG, or WebP file.";
  if (!file.size || file.size > captureByteLimit) return "Files must be nonempty and the batch must be under 25 MB.";
  return "";
}
