/**
 * Runs after an import is committed. Stage 6 adds the automations here
 * (promise resolution, board tasks, messages, daily metrics).
 */
import type { AuthenticatedUser } from "@/server/auth/store";

import type { CommitResult } from "./import-service";

export async function afterImportCommitted(actor: AuthenticatedUser | null, result: CommitResult) {
  void actor;
  void result;
  return { ran: false as const, note: "Automations arrive in stage 6." };
}
