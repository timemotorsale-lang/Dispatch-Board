/**
 * Runs the automations (spec section 7) right after an import is committed.
 * The import itself is already saved. If an automation step fails, the error is
 * reported back and the scheduled job retries later, so nothing is lost.
 */
import type { AuthenticatedUser } from "@/server/auth/store";

import { collectionsAccess } from "./access";
import { runCollectionsAutomations } from "./automations";
import type { CommitResult } from "./import-service";

export async function afterImportCommitted(actor: AuthenticatedUser | null, result: CommitResult) {
  const access = await collectionsAccess(actor, "IMPORT");
  try {
    const automation = await runCollectionsAutomations(access.organizationId, { trigger: "IMPORT", actorId: access.actor.id, importRunId: result.runId });
    return { ran: true as const, ...automation };
  } catch (error) {
    console.error("[collections] automations after import failed; the scheduled job will retry", error instanceof Error ? error.message : error);
    return { ran: false as const, error: "The import was saved, but follow-up tasks couldn't be created yet. They'll be created on the next scheduled run." };
  }
}
