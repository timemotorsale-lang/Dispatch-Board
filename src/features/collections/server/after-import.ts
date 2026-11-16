/**
 * Runs after an import is committed. Stage 6 adds the rest of the automations here
 * (board tasks, messages, daily metrics).
 */
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { collectionsAccess } from "./access";
import type { CommitResult } from "./import-service";
import { resolveOutcomes } from "./promise-service";
import { loadCollectionsSettings } from "./settings-store";

export async function afterImportCommitted(actor: AuthenticatedUser | null, result: CommitResult) {
  void result;
  const access = await collectionsAccess(actor, "IMPORT");
  const settings = await loadCollectionsSettings(access.organizationId);
  const resolution = await prisma.$transaction(tx => resolveOutcomes(tx, access.organizationId, settings), { timeout: 120_000 });
  return { ran: true as const, resolution };
}
