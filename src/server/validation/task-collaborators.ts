export type NormalizedTaskCollaboratorRequest = {
  userId: string;
  collaborationScope: string;
  capacityRequested?: string;
};

export type NormalizedTaskCollaboratorInput = {
  collaboratorIds: string[];
  collaboratorRequests: NormalizedTaskCollaboratorRequest[];
};

function normalizeRequiredText(value: unknown, errorMessage: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(errorMessage);
  return value.trim();
}

function normalizeOptionalText(value: unknown, fieldName: string) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error(`Task collaborator update requires ${fieldName} to be a string when provided.`);
  return value.trim() || undefined;
}

function normalizeCollaboratorIds(value: unknown) {
  if (!Array.isArray(value)) throw new Error("Task collaborator update requires collaboratorIds to be an array.");
  return value.map((item) => normalizeRequiredText(item, "Every collaborator id must be a non-empty string."));
}

function normalizeCollaboratorRequests(value: unknown) {
  if (!Array.isArray(value)) throw new Error("Task collaborator update requires collaboratorRequests to be an array when provided.");
  return value.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Every collaborator request must be an object.");
    }
    const request = entry as Record<string, unknown>;
    const unknownKeys = Object.keys(request).filter((key) => !["userId", "collaborationScope", "capacityRequested"].includes(key));
    if (unknownKeys.length) throw new Error(`Task collaborator request contains an unsupported field: "${unknownKeys[0]}".`);
    const collaborationScope = normalizeRequiredText(request.collaborationScope, "Every collaborator request needs a collaboration scope.");
    if (collaborationScope.length > 600) throw new Error("Collaboration scope must be 600 characters or fewer.");
    const capacityRequested = normalizeOptionalText(request.capacityRequested, "capacityRequested");
    if (capacityRequested && capacityRequested.length > 240) throw new Error("Collaboration capacity must be 240 characters or fewer.");
    return {
      userId: normalizeRequiredText(request.userId, "Every collaborator id must be a non-empty string."),
      collaborationScope,
      ...(capacityRequested ? { capacityRequested } : {})
    };
  });
}

export function normalizeTaskCollaboratorInput(value: unknown): NormalizedTaskCollaboratorInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Task collaborator payload must be an object.");
  }

  const input = value as Record<string, unknown>;
  const unknownKeys = Object.keys(input).filter((key) => key !== "collaboratorIds" && key !== "collaboratorRequests");
  if (unknownKeys.length) throw new Error(`Task collaborator update contains an unsupported field: "${unknownKeys[0]}".`);

  const collaboratorRequests = input.collaboratorRequests === undefined
    ? normalizeCollaboratorIds(input.collaboratorIds).map((userId) => ({ userId, collaborationScope: "" }))
    : normalizeCollaboratorRequests(input.collaboratorRequests);
  const collaboratorIds = collaboratorRequests.map((request) => request.userId);
  if (collaboratorIds.length > 25) throw new Error("A task can have at most 25 collaborators.");
  if (new Set(collaboratorIds).size !== collaboratorIds.length) throw new Error("Task collaborators cannot contain duplicates.");
  return { collaboratorIds, collaboratorRequests };
}
