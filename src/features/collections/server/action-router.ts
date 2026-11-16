/**
 * One entry point for every account action. Later stages add their actions to HANDLERS
 * (promises, plans, messages, insurance, starter, repo) without changing the API route.
 */
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { collectionsAccess } from "./access";
import { accountAction } from "./account-service";
import { INSURANCE_ACTIONS, insuranceAction } from "./insurance-service";
import { MESSAGE_ACTIONS, messageAction } from "./messaging-service";
import { PROMISE_ACTIONS, promiseAction } from "./promise-service";
import { RECOVERY_ACTIONS, recoveryAction } from "./recovery-service";
import { loadCollectionsSettings } from "./settings-store";
import { syncCollectionTasks } from "./task-sync";

export type AccountActionHandler = (actor: AuthenticatedUser | null, accountId: string, input: Record<string, unknown>) => Promise<unknown>;

const HANDLERS: Record<string, AccountActionHandler> = {
  ...Object.fromEntries(PROMISE_ACTIONS.map(action => [action, promiseAction])),
  ...Object.fromEntries(MESSAGE_ACTIONS.map(action => [action, messageAction])),
  ...Object.fromEntries(INSURANCE_ACTIONS.map(action => [action, insuranceAction])),
  ...Object.fromEntries(RECOVERY_ACTIONS.map(action => [action, recoveryAction]))
};

/**
 * Actions after which the account's board tasks are brought up to date right away
 * (for example a bankruptcy flag closes collection tasks and adds the attorney review,
 * and a new promise closes the broken-promise task).
 */
const SYNC_TASKS_AFTER = new Set<string>([...PROMISE_ACTIONS, ...INSURANCE_ACTIONS, ...RECOVERY_ACTIONS, "SET_FLAG", "CLEAR_FLAG", "CONFIRM_MISSING"]);

export async function syncAccountTasks(actor: AuthenticatedUser | null, accountId: string) {
  const access = await collectionsAccess(actor, "VIEW");
  const settings = await loadCollectionsSettings(access.organizationId);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`collections-automation:${access.organizationId}`}))`;
    return syncCollectionTasks(tx, access.organizationId, settings, { accountIds: [accountId] });
  });
}

export async function runAccountAction(actor: AuthenticatedUser | null, accountId: string, input: Record<string, unknown>) {
  const action = typeof input.action === "string" ? input.action : "";
  const handler = HANDLERS[action];
  const result = await (handler ? handler(actor, accountId, input) : accountAction(actor, accountId, input));
  if (SYNC_TASKS_AFTER.has(action)) {
    try {
      await syncAccountTasks(actor, accountId);
    } catch (error) {
      // The action itself is saved; the next automation run will catch the tasks up.
      console.error("[collections] task sync after action failed", error instanceof Error ? error.message : error);
    }
  }
  return result;
}
