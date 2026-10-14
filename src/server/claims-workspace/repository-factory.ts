import type { ClaimsWorkspaceRepository } from "./service";
import { createPrismaClaimsWorkspaceRepository } from "./prisma-repository";

let repositoryOverride: ClaimsWorkspaceRepository | null = null;

export function setClaimsWorkspaceRepositoryForTesting(repository: ClaimsWorkspaceRepository | null) {
  repositoryOverride = repository;
}

export async function claimsWorkspaceDependencies() {
  if (repositoryOverride) return { repository: repositoryOverride };

  const [{ INITIAL_ORGANIZATION }, { prisma }] = await Promise.all([
    import("@/server/appointments/location-foundation"),
    import("@/server/db/client")
  ]);

  return {
    repository: createPrismaClaimsWorkspaceRepository({
      organizationId: INITIAL_ORGANIZATION.id,
      prisma: prisma as never
    })
  };
}
