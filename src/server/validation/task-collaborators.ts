export type NormalizedTaskCollaboratorInput = { collaboratorIds: string[] };

export function normalizeTaskCollaboratorInput(value: unknown): NormalizedTaskCollaboratorInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Task collaborator payload must be an object.");
  }

  const input = value as Record<string, unknown>;
  const unknownKeys = Object.keys(input).filter((key) => key !== "collaboratorIds");
  if (unknownKeys.length) throw new Error(`Task collaborator update contains an unsupported field: "${unknownKeys[0]}".`);
  if (!Array.isArray(input.collaboratorIds)) throw new Error("Task collaborator update requires collaboratorIds to be an array.");

  const collaboratorIds = input.collaboratorIds.map((value) => {
    if (typeof value !== "string" || !value.trim()) throw new Error("Every collaborator id must be a non-empty string.");
    return value.trim();
  });
  if (collaboratorIds.length > 25) throw new Error("A task can have at most 25 collaborators.");
  if (new Set(collaboratorIds).size !== collaboratorIds.length) throw new Error("Task collaborators cannot contain duplicates.");
  return { collaboratorIds };
}
