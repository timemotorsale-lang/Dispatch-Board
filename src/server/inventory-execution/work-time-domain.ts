export const WORK_SESSION_ACTIONS = ["PAUSE", "RESUME", "CHECKPOINT", "COMPLETE"] as const;
export const WORK_SESSION_CHECKPOINT_CODES = ["ON_TRACK", "NEEDS_HELP", "FURTHER_DIAGNOSIS", "PARTS_ISSUE", "SCOPE_CHANGE", "SAFETY_STOP", "OTHER"] as const;

type WorkSessionAction = (typeof WORK_SESSION_ACTIONS)[number];
type RecordValue = Record<string, unknown>;

function object(value: unknown) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Work-time command must be an object."); return value as RecordValue; }
function text(value: unknown, label: string, max = 500) { if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is required.`); if (value.trim().length > max) throw new Error(`${label} cannot exceed ${max} characters.`); return value.trim(); }

export function normalizeWorkSessionStart(value: unknown) {
  const raw = object(value);
  return { idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 200), reason: text(raw.reason, "Business reason", 500) };
}

export function normalizeWorkSessionCommand(value: unknown) {
  const raw = object(value), action = String(raw.action ?? "").toUpperCase() as WorkSessionAction;
  if (!WORK_SESSION_ACTIONS.includes(action)) throw new Error("Work-session action is invalid.");
  const expectedVersion = Number(raw.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("Expected version must be a positive whole number.");
  const checkpointCode = raw.checkpointCode == null || raw.checkpointCode === "" ? null : String(raw.checkpointCode).toUpperCase();
  if ((action === "PAUSE" || action === "CHECKPOINT") && (!checkpointCode || !WORK_SESSION_CHECKPOINT_CODES.includes(checkpointCode as (typeof WORK_SESSION_CHECKPOINT_CODES)[number]))) throw new Error(`${action === "PAUSE" ? "Pause" : "Checkpoint"} requires a valid structured reason.`);
  const checkpointNote = typeof raw.checkpointNote === "string" && raw.checkpointNote.trim() ? text(raw.checkpointNote, "Checkpoint note", 1_000) : null;
  if (checkpointCode === "OTHER" && !checkpointNote) throw new Error("Other checkpoint reason requires a brief note.");
  return { action, checkpointCode, checkpointNote, expectedVersion, idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 200), reason: text(raw.reason, "Business reason", 500) };
}

export function activeSeconds(input: { accumulatedSeconds: number; activeSince: Date | null; status: "ACTIVE" | "PAUSED" | "COMPLETED" }, now: Date) {
  return input.accumulatedSeconds + (input.status === "ACTIVE" && input.activeSince ? Math.max(0, Math.floor((now.getTime() - input.activeSince.getTime()) / 1_000)) : 0);
}

export function buildWorkTimeGuidance(input: { activeSeconds: number; estimateMinutes: number | null }) {
  if (!input.estimateMinutes) return { code: "NO_ESTIMATE" as const, level: "INFO" as const, message: "No approved estimate is available. Ask the manager for time guidance before extended work.", progressPercent: null };
  const estimateSeconds = input.estimateMinutes * 60, progressPercent = Math.max(0, Math.round(input.activeSeconds / estimateSeconds * 100));
  if (progressPercent >= 150) return { code: "STOP_AND_REASSESS" as const, level: "CRITICAL" as const, message: "Pause safely and request manager direction before additional work.", progressPercent };
  if (progressPercent >= 125) return { code: "OVERRUN_REVIEW" as const, level: "WARNING" as const, message: "Document the reason and request manager review before the overrun grows.", progressPercent };
  if (progressPercent >= 100) return { code: "ESTIMATE_REACHED" as const, level: "WARNING" as const, message: "The approved estimate is reached. Complete, pause, or record a structured checkpoint.", progressPercent };
  if (progressPercent >= 75) return { code: "CHECKPOINT_DUE" as const, level: "NOTICE" as const, message: "A quick progress checkpoint is due before the estimate is reached.", progressPercent };
  return { code: "ON_TRACK" as const, level: "INFO" as const, message: "Work is within the approved time guidance.", progressPercent };
}
