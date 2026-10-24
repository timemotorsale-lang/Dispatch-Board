import { closingChecks, closingReviewStates, isClosingPathway, type ClosingReview, type ClosingReviewState } from "@/lib/deal-closing";
import { SalesDocumentsError } from "./domain";

function boundedText(value: unknown, limit: number) {
  if (typeof value !== "string" || value.trim().length > limit) throw new SalesDocumentsError("Enter a valid closing-review note within the stated limit.");
  return value.trim();
}

export function prepareClosingReview(raw: Record<string, unknown>, actorId: string, nextJacketRevision: number, now = new Date()): ClosingReview {
  if (!isClosingPathway(raw.pathway)) throw new SalesDocumentsError("Choose a supported closing pathway.");
  const pathway = raw.pathway;
  const classificationNote = boundedText(raw.classificationNote, 1000);
  if (classificationNote.length < 15) throw new SalesDocumentsError("Record the facts and review needed for this proposed pathway (15–1000 characters).");
  const definitions = closingChecks(pathway);
  if (!Array.isArray(raw.checks) || raw.checks.length !== definitions.length) throw new SalesDocumentsError("Submit every closing check for the selected pathway.");
  const submitted: Array<Record<string, unknown>> = raw.checks.map(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new SalesDocumentsError("Invalid closing check.");
    return value as Record<string, unknown>;
  });
  if (new Set(submitted.map(check => check.id)).size !== submitted.length || submitted.some(check => !definitions.some(definition => definition.id === check.id))) throw new SalesDocumentsError("Closing checks contain duplicate or unsupported items.");
  const savedAt = now.toISOString();
  const checks = definitions.map(definition => {
    const check = submitted.find(item => item.id === definition.id)!;
    if (!closingReviewStates.includes(check.state as ClosingReviewState)) throw new SalesDocumentsError("Choose a valid review state.");
    const state = check.state as ClosingReviewState;
    if (state === "NOT_APPLICABLE" && !definition.canExclude) throw new SalesDocumentsError(`${definition.label} cannot be excluded.`);
    const evidence = boundedText(check.evidence, 1000);
    if (state !== "PENDING" && evidence.length < 15) throw new SalesDocumentsError(`Record evidence or a follow-up reason for ${definition.label} (15–1000 characters).`);
    return { id: definition.id, state, evidence, reviewedBy: actorId, reviewedAt: savedAt };
  });
  return { version: 1, pathway, classificationNote, jacketRevision: nextJacketRevision, savedBy: actorId, savedAt, checks };
}
