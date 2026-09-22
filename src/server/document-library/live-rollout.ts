import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";

import type { DocumentLibraryDurableDatabase, DocumentLibraryDurableRepository } from "./durable-repository";
import { createDocumentLibraryDurableRepository, isDocumentLibraryDurableRepositoryEnabled } from "./durable-repository";
import type { DocumentLibraryState } from "./repository";
import { buildDocumentStorageRolloutEvidence } from "./storage-platform";

export type DocumentLibraryLiveRolloutResult =
  | { enabled: false; mode: "IN_MEMORY_REVIEW" }
  | {
      enabled: true;
      gate: { blockerCount: number; readyForRelease: boolean };
      mode: "DATABASE_BACKED";
      snapshot: Awaited<ReturnType<DocumentLibraryDurableRepository["persistSnapshot"]>>;
      templates: { templates: number };
    };

export type DocumentLibraryLiveRolloutDependencies = {
  database?: DocumentLibraryDurableDatabase;
  durableRepositoryEnabled?: boolean;
  locationId?: string | null;
  now?: () => Date;
  organizationId?: string;
  repository?: DocumentLibraryDurableRepository;
};

async function loadDatabase(): Promise<DocumentLibraryDurableDatabase> {
  const { prisma } = await import("@/server/db/client");
  return prisma as unknown as DocumentLibraryDurableDatabase;
}

export async function syncDocumentLibraryDurableRollout(input: {
  actor: AuthenticatedUser;
  dependencies?: DocumentLibraryLiveRolloutDependencies;
  state: DocumentLibraryState;
}): Promise<DocumentLibraryLiveRolloutResult> {
  const enabled = input.dependencies?.durableRepositoryEnabled ?? isDocumentLibraryDurableRepositoryEnabled();
  if (!enabled) return { enabled: false, mode: "IN_MEMORY_REVIEW" };

  const organizationId = input.dependencies?.organizationId ?? INITIAL_ORGANIZATION.id;
  const repository = input.dependencies?.repository ?? createDocumentLibraryDurableRepository({
    database: input.dependencies?.database ?? await loadDatabase(),
    locationId: input.dependencies?.locationId ?? null,
    now: input.dependencies?.now,
    organizationId
  });
  const templates = await repository.seedPacketTemplates({ actorId: input.actor.id });
  const snapshot = await repository.persistSnapshot({ state: input.state });
  const gate = await repository.persistReleaseGate({
    evaluatedByUserId: input.actor.id,
    evidence: buildDocumentStorageRolloutEvidence({
      actor: input.actor,
      durableRepositoryEnabled: true,
      state: input.state
    })
  });

  return {
    enabled: true,
    gate,
    mode: "DATABASE_BACKED",
    snapshot,
    templates
  };
}
