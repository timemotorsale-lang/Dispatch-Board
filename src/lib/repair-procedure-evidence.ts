export function repairProcedureEvidenceRequirements(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.flatMap(item => typeof item === "string" && item.trim() ? [item.trim()] : []))] : [];
}

export function repairEvidenceNeedsPhoto(requirement: string) {
  return /\b(?:photo(?:s|graphs?)?|images?|pictures?)\b/i.test(requirement);
}

export function normalizeRepairProcedureEvidence(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Enter a reference for each required procedure item.");
  const entries = Object.entries(value);
  if (entries.length > 100 || entries.some(([name, reference]) => !name.trim() || name.length > 1000 || typeof reference !== "string" || reference.length > 500)) {
    throw new Error("Check the required procedure evidence references.");
  }
  return Object.fromEntries(entries.map(([name, reference]) => [name, (reference as string).trim()]));
}

export async function validateRepairProcedureEvidence(
  requirements: unknown, references: Record<string, string>, validPhoto: (reference: string, requirement: string) => Promise<boolean>,
) {
  const required = repairProcedureEvidenceRequirements(requirements);
  const missing = required.filter(name => !Object.hasOwn(references, name) || references[name].trim().length < 3);
  if (missing.length) throw new Error(`Record required procedure evidence: ${missing.join(", ")}.`);
  for (const name of required.filter(repairEvidenceNeedsPhoto)) {
    if (!await validPhoto(references[name], name)) throw new Error(`Attach a current photo for this repair job: ${name}.`);
  }
  return required.map(name => `${name}: ${references[name]}`);
}
