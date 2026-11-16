/**
 * Collections permissions (spec section 2).
 *
 * Reuses the app's existing roles and duties; no new user system.
 * - Collections Admin: the General Manager (owner), the "Collections Manager"
 *   role, or anyone with the "Collections admin" duty.
 * - Collector: the "Collections" role, or a duty containing "collections".
 *
 * The module switch (COLLECTIONS_MODULE) is checked here too, so a page or API
 * that asks "can this user do X?" gets "no" whenever the module is OFF.
 */
import type { AuthenticatedUser } from "@/server/auth/store";
import { GENERAL_MANAGER_ROLE_NAME } from "@/server/policies/access";
import { resolveCollectionsMode, resolvePilotUserIds, type CollectionsMode } from "./flags";

export const COLLECTIONS_ADMIN_ROLE_NAMES = [GENERAL_MANAGER_ROLE_NAME, "Collections Manager"] as const;
export const COLLECTIONS_COLLECTOR_ROLE_NAMES = ["Collections"] as const;
export const COLLECTIONS_ADMIN_DUTY = "collections admin";
export const COLLECTIONS_COLLECTOR_DUTY_TERM = "collections";

export const COLLECTIONS_PERMISSIONS = [
  "VIEW",
  "LOG_ACTIVITY",
  "SEND_MANUAL_MESSAGE",
  "CHANGE_ACCOUNT_TYPE",
  "SET_FLAG",
  "CLEAR_FLAG",
  "REQUEST_DISABLE_OR_REPO",
  "APPROVE_DISABLE_OR_REPO",
  "IMPORT",
  "EDIT_SETTINGS",
  "VIEW_DASHBOARD",
  "APPROVE_MONEY"
] as const;
export type CollectionsPermission = (typeof COLLECTIONS_PERMISSIONS)[number];

export type CollectionsRole = "ADMIN" | "COLLECTOR" | null;

const COLLECTOR_PERMISSIONS: ReadonlySet<CollectionsPermission> = new Set([
  "VIEW",
  "LOG_ACTIVITY",
  "SEND_MANUAL_MESSAGE",
  "SET_FLAG",
  "REQUEST_DISABLE_OR_REPO",
  "VIEW_DASHBOARD"
]);

export function resolveCollectionsRole(user: AuthenticatedUser | null): CollectionsRole {
  if (!user?.isActive) return null;
  const duties = user.duties.all.map(duty => duty.toLowerCase());
  if (COLLECTIONS_ADMIN_ROLE_NAMES.some(role => user.roles.includes(role)) || duties.some(duty => duty.includes(COLLECTIONS_ADMIN_DUTY))) {
    return "ADMIN";
  }
  if (COLLECTIONS_COLLECTOR_ROLE_NAMES.some(role => user.roles.includes(role)) || duties.some(duty => duty.includes(COLLECTIONS_COLLECTOR_DUTY_TERM))) {
    return "COLLECTOR";
  }
  return null;
}

/** Is the module visible to this user in the current mode? */
export function canOpenCollections(user: AuthenticatedUser | null, mode: CollectionsMode = resolveCollectionsMode(), pilotUserIds: string[] = resolvePilotUserIds()) {
  const role = resolveCollectionsRole(user);
  if (!user || !role || mode === "OFF") return false;
  if (mode === "REVIEW") return role === "ADMIN";
  if (mode === "PILOT") return role === "ADMIN" || pilotUserIds.includes(user.id);
  return true;
}

export function hasCollectionsPermission(
  user: AuthenticatedUser | null,
  permission: CollectionsPermission,
  mode: CollectionsMode = resolveCollectionsMode(),
  pilotUserIds: string[] = resolvePilotUserIds()
) {
  if (!canOpenCollections(user, mode, pilotUserIds)) return false;
  const role = resolveCollectionsRole(user);
  if (role === "ADMIN") return true;
  return role === "COLLECTOR" && COLLECTOR_PERMISSIONS.has(permission);
}

export class CollectionsError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "CollectionsError";
  }
}

/** Throw a plain-English error if the user can't do this. Use on every server action. */
export function assertCollectionsPermission(user: AuthenticatedUser | null, permission: CollectionsPermission) {
  if (!user?.isActive) throw new CollectionsError("Sign in with an active staff account.", 401);
  if (resolveCollectionsMode() === "OFF") throw new CollectionsError("The Collections module is turned off.", 404);
  if (!hasCollectionsPermission(user, permission)) {
    throw new CollectionsError("Your account doesn't have permission for this Collections action. Ask the owner if you need it.", 403);
  }
  return user;
}
