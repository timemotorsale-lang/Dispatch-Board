import { extractDocumentText, type DocumentTextExtractionResult } from "./text-extraction";

export const DOCUMENT_SMART_INTAKE_CONTRACT_VERSION = "document-smart-intake/v1";

export type SmartDocumentClassification = "BUSINESS_CARD" | "GOVERNMENT_ID" | "INSURANCE_ESTIMATE" | "UNKNOWN";
export type SmartDocumentReviewStatus = "READY_FOR_REVIEW" | "NEEDS_REVIEW" | "LOW_CONFIDENCE" | "SENSITIVE_REVIEW";

export type SmartDocumentField = {
  confidence: number;
  key: string;
  label: string;
  sensitive: boolean;
  value: string;
};

export type SmartDocumentIntakeDraft = {
  classification: SmartDocumentClassification;
  classificationConfidence: number;
  classificationLabel: string;
  contractVersion: typeof DOCUMENT_SMART_INTAKE_CONTRACT_VERSION;
  extractedFields: SmartDocumentField[];
  extractionMethod: DocumentTextExtractionResult["method"];
  extractedText: string;
  reviewStatus: SmartDocumentReviewStatus;
  routingTarget: "CONTACT_REVIEW" | "CUSTOMER_ID_REVIEW" | "CLAIM_REVIEW" | "DOCUMENT_REVIEW";
  sensitiveFieldKeys: string[];
  warnings: string[];
};

export type SmartDocumentIntakeRecord = SmartDocumentIntakeDraft & {
  contentType: string | null;
  createdAt: string;
  createdByUserId: string | null;
  documentId: string | null;
  fileName: string;
  id: string;
  ownerId: string | null;
  ownerLabel: string | null;
  ownerType: string | null;
  sourceConsole: string | null;
  storageReference: string;
};

type IntakeMetadata = {
  contentType?: string | null;
  createdByUserId?: string | null;
  documentId?: string | null;
  fileName: string;
  organizationId: string;
  ownerId?: string | null;
  ownerLabel?: string | null;
  ownerType?: string | null;
  sourceConsole?: string | null;
  storageReference: string;
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function field(key: string, label: string, value: string | null | undefined, confidence: number, sensitive = false): SmartDocumentField | null {
  const normalized = normalizeText(value ?? "");
  if (!normalized) return null;
  return { confidence, key, label, sensitive, value: normalized };
}

function matchFirst(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.trim();
    if (value) return value;
  }
  return "";
}

function extractEmail(text: string) {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
}

function extractPhone(text: string) {
  return text.match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/)?.[0] ?? "";
}

function extractWebsite(text: string) {
  return text.match(/(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?/i)?.[0] ?? "";
}

function extractNameCandidate(lines: string[]) {
  const reject = /@|www\.|http|llc|inc|corp|company|motors|sales|auto|phone|mobile|email|fax|street|road|ave|blvd|suite|license|driver/i;
  return lines.find((line) => /^[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3}$/.test(line) && !reject.test(line)) ?? "";
}

function extractCompanyCandidate(lines: string[]) {
  const companyLine = lines.find((line) => /\b(?:llc|inc|corp|company|motors|sales|auto|automotive|group|services|collision|repair)\b/i.test(line));
  if (companyLine) return companyLine;
  const name = extractNameCandidate(lines);
  return lines.find((line) => line !== name && line.length >= 3 && line.length <= 70 && !/@|www\.|http|\d{3}[\s.-]?\d{3}/i.test(line)) ?? "";
}

function extractAddressCandidate(lines: string[]) {
  return lines.find((line) => /\b\d{1,6}\s+[A-Za-z0-9.' -]+\s+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|hwy|highway)\b/i.test(line)) ?? "";
}

function extractStateCandidate(text: string) {
  return matchFirst(text, [
    /\b(?:state|issuing state)\s*[:#-]?\s*([A-Z]{2})\b/i,
    /\b([A-Z]{2})\s+(?:driver license|drivers license|operator license|identification card)\b/i
  ]);
}

function extractDateByLabel(text: string, labels: string[]) {
  const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return matchFirst(text, [new RegExp(`\\b(?:${labelPattern})\\b\\s*[:#-]?\\s*([0-1]?\\d[/-][0-3]?\\d[/-](?:\\d{2}|\\d{4}))`, "i")]);
}

function extractLicenseNumber(text: string) {
  return matchFirst(text, [
    /\b(?:driver license|drivers license|license|lic|dl|id no|id number)\b\s*[:#-]?\s*([A-Z0-9-]{5,20})\b/i
  ]);
}

function classifyText(input: { contentType: string; fileName: string; text: string }) {
  const haystack = `${input.fileName} ${input.contentType} ${input.text}`.toLowerCase();
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(input.text);
  const hasPhone = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/.test(input.text);
  const idSignals = [
    /\bdriver'?s?\s+license\b/i,
    /\bidentification\s+card\b/i,
    /\bdate of birth\b|\bdob\b/i,
    /\bexpires?\b|\bexpiration\b/i,
    /\bclass\s+[a-z]\b/i
  ].filter((pattern) => pattern.test(haystack)).length;
  const estimateSignals = [
    /\bestimate\b/i,
    /\bgross total\b/i,
    /\bnet estimate total\b/i,
    /\bclaim\b/i
  ].filter((pattern) => pattern.test(haystack)).length;
  const cardSignals = [
    hasEmail,
    hasPhone,
    /\b(?:llc|inc|corp|company|motors|sales|auto|services)\b/i.test(haystack),
    /\b(?:mobile|phone|email|website|www\.)\b/i.test(haystack)
  ].filter(Boolean).length;

  if (idSignals >= 2) return { classification: "GOVERNMENT_ID" as const, confidence: Math.min(96, 60 + idSignals * 10) };
  if (cardSignals >= 2) return { classification: "BUSINESS_CARD" as const, confidence: Math.min(94, 52 + cardSignals * 11) };
  if (estimateSignals >= 2) return { classification: "INSURANCE_ESTIMATE" as const, confidence: Math.min(92, 58 + estimateSignals * 9) };
  return { classification: "UNKNOWN" as const, confidence: input.text.trim() ? 35 : 10 };
}

function extractBusinessCardFields(text: string, lines: string[]) {
  return [
    field("personName", "Person name", extractNameCandidate(lines), 76),
    field("companyName", "Business name", extractCompanyCandidate(lines), 72),
    field("phone", "Phone", extractPhone(text), 92),
    field("email", "Email", extractEmail(text), 96),
    field("website", "Website", extractWebsite(text), 82),
    field("address", "Address", extractAddressCandidate(lines), 70)
  ].filter(Boolean) as SmartDocumentField[];
}

function extractGovernmentIdFields(text: string, lines: string[]) {
  return [
    field("fullName", "Full name", extractNameCandidate(lines), 68, true),
    field("address", "Address", extractAddressCandidate(lines), 66, true),
    field("dateOfBirth", "Date of birth", extractDateByLabel(text, ["date of birth", "dob", "birth"]), 82, true),
    field("licenseNumber", "ID / license number", extractLicenseNumber(text), 74, true),
    field("issuingState", "Issuing state", extractStateCandidate(text), 62, true),
    field("expirationDate", "Expiration date", extractDateByLabel(text, ["expires", "expiration", "exp"]), 78, true)
  ].filter(Boolean) as SmartDocumentField[];
}

function extractEstimateFields(text: string) {
  const amount = matchFirst(text, [
    /\b(?:gross total|net estimate total|estimate total|grand total|total amount)\b\s*[:$ ]+\$?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i
  ]);
  const claim = matchFirst(text, [/\bclaim\s*(?:number|#|no\.?)\s*[:#-]?\s*([A-Z0-9-]{4,})\b/i]);
  const vin = text.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i)?.[0] ?? "";
  return [
    field("approvedAmount", "Estimate total", amount ? `$${amount}` : "", 78),
    field("claimNumber", "Claim number", claim, 70),
    field("vin", "VIN", vin, 84)
  ].filter(Boolean) as SmartDocumentField[];
}

function reviewStatus(classification: SmartDocumentClassification, confidence: number, fields: SmartDocumentField[]): SmartDocumentReviewStatus {
  if (classification === "GOVERNMENT_ID") return "SENSITIVE_REVIEW";
  if (confidence < 60 || fields.length === 0) return "LOW_CONFIDENCE";
  return "READY_FOR_REVIEW";
}

function routingTarget(classification: SmartDocumentClassification): SmartDocumentIntakeDraft["routingTarget"] {
  if (classification === "BUSINESS_CARD") return "CONTACT_REVIEW";
  if (classification === "GOVERNMENT_ID") return "CUSTOMER_ID_REVIEW";
  if (classification === "INSURANCE_ESTIMATE") return "CLAIM_REVIEW";
  return "DOCUMENT_REVIEW";
}

function classificationLabel(classification: SmartDocumentClassification) {
  if (classification === "BUSINESS_CARD") return "Business card";
  if (classification === "GOVERNMENT_ID") return "Government ID";
  if (classification === "INSURANCE_ESTIMATE") return "Insurance estimate";
  return "Needs review";
}

export async function analyzeSmartDocumentIntake(input: {
  bytes: Uint8Array;
  contentType: string;
  fileName: string;
}): Promise<SmartDocumentIntakeDraft> {
  const extraction = await extractDocumentText(input);
  const text = extraction.text;
  const lines = unique(text.split(/\n| {2,}/).map((line) => normalizeText(line)).filter(Boolean)).slice(0, 80);
  const classified = classifyText({ contentType: input.contentType, fileName: input.fileName, text });
  const extractedFields =
    classified.classification === "BUSINESS_CARD" ? extractBusinessCardFields(text, lines) :
      classified.classification === "GOVERNMENT_ID" ? extractGovernmentIdFields(text, lines) :
        classified.classification === "INSURANCE_ESTIMATE" ? extractEstimateFields(text) :
          [];
  const sensitiveFieldKeys = extractedFields.filter((item) => item.sensitive).map((item) => item.key);
  const warnings = [
    ...extraction.warnings,
    ...(classified.classification === "UNKNOWN" ? ["Document type could not be classified confidently."] : []),
    ...(sensitiveFieldKeys.length > 0 ? ["Sensitive identity fields require staff review before use."] : [])
  ];

  return {
    classification: classified.classification,
    classificationConfidence: classified.confidence,
    classificationLabel: classificationLabel(classified.classification),
    contractVersion: DOCUMENT_SMART_INTAKE_CONTRACT_VERSION,
    extractedFields,
    extractionMethod: extraction.method,
    extractedText: text,
    reviewStatus: reviewStatus(classified.classification, classified.confidence, extractedFields),
    routingTarget: routingTarget(classified.classification),
    sensitiveFieldKeys,
    warnings
  };
}

export async function persistSmartDocumentIntakeRecord(input: {
  draft: SmartDocumentIntakeDraft;
  metadata: IntakeMetadata;
}) {
  const { prisma } = await import("@/server/db/client");
  const { draft, metadata } = input;
  const row = await prisma.documentSmartIntakeRecord.create({
    data: {
      classification: draft.classification,
      classificationConfidence: draft.classificationConfidence,
      classificationLabel: draft.classificationLabel,
      contentType: metadata.contentType ?? null,
      createdByUserId: metadata.createdByUserId ?? null,
      documentId: metadata.documentId ?? null,
      extractedFields: draft.extractedFields,
      extractedText: draft.extractedText || null,
      extractionMethod: draft.extractionMethod,
      fileName: metadata.fileName,
      organizationId: metadata.organizationId,
      ownerId: metadata.ownerId ?? null,
      ownerLabel: metadata.ownerLabel ?? null,
      ownerType: metadata.ownerType ?? null,
      reviewStatus: draft.reviewStatus,
      routingTarget: draft.routingTarget,
      sensitiveFieldKeys: draft.sensitiveFieldKeys,
      sourceConsole: metadata.sourceConsole ?? null,
      storageReference: metadata.storageReference,
      warnings: draft.warnings
    }
  });
  return normalizeSmartIntakeRecord(row);
}

export async function listSmartDocumentIntakeRecords(input: { organizationId: string; take?: number }) {
  const { prisma } = await import("@/server/db/client");
  const rows = await prisma.documentSmartIntakeRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: input.take ?? 25,
    where: { organizationId: input.organizationId }
  });
  return rows.map(normalizeSmartIntakeRecord);
}

function normalizeSmartIntakeRecord(row: {
  classification: string;
  classificationConfidence: number;
  classificationLabel: string;
  contentType: string | null;
  createdAt: Date;
  createdByUserId: string | null;
  documentId: string | null;
  extractedFields: unknown;
  extractedText: string | null;
  extractionMethod: string;
  fileName: string;
  id: string;
  ownerId: string | null;
  ownerLabel: string | null;
  ownerType: string | null;
  reviewStatus: string;
  routingTarget: string;
  sensitiveFieldKeys: unknown;
  sourceConsole: string | null;
  storageReference: string;
  warnings: unknown;
}): SmartDocumentIntakeRecord {
  return {
    classification: row.classification as SmartDocumentClassification,
    classificationConfidence: row.classificationConfidence,
    classificationLabel: row.classificationLabel,
    contentType: row.contentType,
    contractVersion: DOCUMENT_SMART_INTAKE_CONTRACT_VERSION,
    createdAt: row.createdAt.toISOString(),
    createdByUserId: row.createdByUserId,
    documentId: row.documentId,
    extractedFields: Array.isArray(row.extractedFields) ? row.extractedFields as SmartDocumentField[] : [],
    extractedText: row.extractedText ?? "",
    extractionMethod: row.extractionMethod as DocumentTextExtractionResult["method"],
    fileName: row.fileName,
    id: row.id,
    ownerId: row.ownerId,
    ownerLabel: row.ownerLabel,
    ownerType: row.ownerType,
    reviewStatus: row.reviewStatus as SmartDocumentReviewStatus,
    routingTarget: row.routingTarget as SmartDocumentIntakeDraft["routingTarget"],
    sensitiveFieldKeys: Array.isArray(row.sensitiveFieldKeys) ? row.sensitiveFieldKeys as string[] : [],
    sourceConsole: row.sourceConsole,
    storageReference: row.storageReference,
    warnings: Array.isArray(row.warnings) ? row.warnings as string[] : []
  };
}
