/**
 * One entry point for every account action. Later stages add their actions to HANDLERS
 * (promises, plans, messages, insurance, starter, repo) without changing the API route.
 */
import type { AuthenticatedUser } from "@/server/auth/store";

import { accountAction } from "./account-service";

export type AccountActionHandler = (actor: AuthenticatedUser | null, accountId: string, input: Record<string, unknown>) => Promise<unknown>;

const HANDLERS: Record<string, AccountActionHandler> = {};

export async function runAccountAction(actor: AuthenticatedUser | null, accountId: string, input: Record<string, unknown>) {
  const action = typeof input.action === "string" ? input.action : "";
  const handler = HANDLERS[action];
  return handler ? handler(actor, accountId, input) : accountAction(actor, accountId, input);
}
