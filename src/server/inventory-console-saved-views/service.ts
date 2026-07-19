import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { createInventoryConsoleSavedViewRepository, type InventoryConsoleSavedViewRecord, type InventoryConsoleSavedViewRepository } from "./repository";

export const INVENTORY_CONSOLE_WORK_VIEWS = ["ALL", "ATTENTION", "BLOCKED", "OVERDUE", "MY", "TEAM", "EXCEPTIONS"] as const;
export type InventoryConsoleWorkView = (typeof INVENTORY_CONSOLE_WORK_VIEWS)[number];
export type InventoryConsoleSavedViewConfig = { locationId: string | null; workView: InventoryConsoleWorkView };
export type InventoryConsoleSavedViewModel = InventoryConsoleSavedViewConfig & { id: string; name: string; visibility: "PERSONAL" | "TEAM"; version: number; createdAt: string; updatedAt: string; createdByUser: { id: string; name: string }; canDelete: boolean; recoveryNotice: string | null };

type Dependencies = { organizationId?: string; repository?: InventoryConsoleSavedViewRepository };
function context(input: Dependencies) { return { organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createInventoryConsoleSavedViewRepository() }; }
function object(value: unknown) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Saved view payload must be an object."); return value as Record<string, unknown>; }
function text(value: unknown, label: string, max: number) { const result = typeof value === "string" ? value.trim() : ""; if (!result) throw new Error(`${label} is required.`); if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`); return result; }

export function normalizeInventoryConsoleSavedViewConfig(value: unknown): InventoryConsoleSavedViewConfig {
  const raw = object(value);
  const workView = String(raw.workView ?? "ALL").toUpperCase() as InventoryConsoleWorkView;
  if (!INVENTORY_CONSOLE_WORK_VIEWS.includes(workView)) throw new Error("Saved view work view is invalid.");
  const locationId = typeof raw.locationId === "string" && raw.locationId.trim() ? raw.locationId.trim() : null;
  if (locationId && locationId.length > 100) throw new Error("Saved view location is invalid.");
  return { locationId, workView };
}

function map(record: InventoryConsoleSavedViewRecord, actor: AuthenticatedUser): InventoryConsoleSavedViewModel {
  let config: InventoryConsoleSavedViewConfig = { locationId: null, workView: "ALL" }, recoveryNotice: string | null = null;
  try { config = normalizeInventoryConsoleSavedViewConfig(record.config); } catch { recoveryNotice = "A retired or invalid filter was removed; this view now opens with safe defaults."; }
  return { ...config, id: record.id, name: record.name, visibility: record.visibility, version: record.version, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(), createdByUser: record.createdByUser, canDelete: record.createdByUser.id === actor.id || (record.visibility === "TEAM" && isManager(actor)), recoveryNotice };
}

export async function listInventoryConsoleSavedViews(actor: AuthenticatedUser | null, input: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor), deps = context(input);
  return (await deps.repository.list(deps.organizationId, user.id)).map((record) => map(record, user));
}

export async function getInventoryConsoleSavedView(actor: AuthenticatedUser | null, id: string, input: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor), deps = context(input), savedViewId = text(id, "Saved view id", 100);
  const record = await deps.repository.find(deps.organizationId, savedViewId, user.id);
  return record ? map(record, user) : null;
}

export async function createInventoryConsoleSavedView(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor), deps = context(input), raw = object(value), visibility = String(raw.visibility ?? "PERSONAL").toUpperCase() as "PERSONAL" | "TEAM";
  if (visibility !== "PERSONAL" && visibility !== "TEAM") throw new Error("Saved view visibility is invalid.");
  if (visibility === "TEAM" && !isManager(user)) throw new Error("Manager access is required to share a team view.");
  const record = await deps.repository.create({ organizationId: deps.organizationId, createdByUserId: user.id, name: text(raw.name, "Saved view name", 80), visibility, config: normalizeInventoryConsoleSavedViewConfig(raw.config) as unknown as Prisma.InputJsonObject });
  return map(record, user);
}

export async function deleteInventoryConsoleSavedView(actor: AuthenticatedUser | null, id: string, input: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor), deps = context(input), record = await deps.repository.find(deps.organizationId, text(id, "Saved view id", 100), user.id);
  if (!record) throw new Error("Saved view was not found.");
  if (record.createdByUser.id !== user.id && !(record.visibility === "TEAM" && isManager(user))) throw new Error("You do not have permission to delete this saved view.");
  await deps.repository.remove(deps.organizationId, record.id);
}
