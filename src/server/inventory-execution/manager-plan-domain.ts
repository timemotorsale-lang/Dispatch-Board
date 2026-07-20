import { normalizeInventoryWorkPacketCreate } from "./work-packet-domain";

const DECISIONS = ["APPROVE_COMPLETE", "RETURN_FOR_REWORK", "REQUIRE_DIAGNOSIS", "HOLD", "CANCEL"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const WORKFLOW_AREAS = ["INVENTORY", "ADVERTISING", "MARKETING", "SALES", "ADMIN", "COLLECTIONS", "SHOP", "GENERAL_MANAGER"] as const;
type ObjectValue = Record<string, unknown>;
function object(value: unknown, label: string) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`); return value as ObjectValue; }
function text(value: unknown, label: string, max = 2_000) { if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`); if (value.trim().length > max) throw new Error(`${label} cannot exceed ${max} characters.`); return value.trim(); }
function optional(value: unknown, label: string, max = 4_000) { return value == null || value === "" ? null : text(value, label, max); }
function choice<T extends readonly string[]>(value: unknown, values: T, label: string): T[number] { const normalized = String(value ?? "").toUpperCase(); if (!values.includes(normalized)) throw new Error(`${label} is invalid.`); return normalized as T[number]; }

export function normalizeManagerPlan(value: unknown) {
  const raw = object(value, "Manager next plan"), expectedVersion = Number(raw.expectedVersion); if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("Expected version must be a positive whole number.");
  const publishNextWork = raw.publishNextWork === true, nested = publishNextWork ? object(raw.nextWork, "Next work preview") : null;
  const packet = nested ? normalizeInventoryWorkPacketCreate({ ...nested, taskId: "pending-task", vehicleId: "pending-vehicle", state: "STAGED", idempotencyKey: "manager-plan-preview", reason: "Validate structured manager next-work preview." }) : null;
  const dueAt = nested ? new Date(text(nested.dueAt ?? nested.targetAt, "Next task due time", 100)) : null; if (dueAt && Number.isNaN(dueAt.getTime())) throw new Error("Next task due time must be valid.");
  const nextWork = nested && packet && dueAt ? { assignedUserId: text(nested.assignedUserId, "Next owner", 100), description: text(nested.description ?? packet.purpose, "Next task description", 2_000), dueAt, priority: choice(nested.priority ?? "MEDIUM", PRIORITIES, "Task priority"), requiresManagerApproval: nested.requiresManagerApproval !== false, title: text(nested.title, "Next task title", 240), workflowArea: choice(nested.workflowArea ?? "INVENTORY", WORKFLOW_AREAS, "Workflow area"), packet: { ...packet, taskId: undefined, vehicleId: undefined, idempotencyKey: undefined, reason: undefined } } : null;
  return { decision: choice(raw.decision, DECISIONS, "Manager decision"), direction: text(raw.direction, "Manager next-step direction", 2_000), expectedVersion, idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 200), internalNote: optional(raw.internalNote, "Private manager note"), nextWork, publishNextWork, reason: text(raw.reason, "Business reason", 500) };
}
