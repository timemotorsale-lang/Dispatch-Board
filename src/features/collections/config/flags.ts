/**
 * Collections module switches (spec section 16).
 *
 * Every switch defaults to the safest value. If a variable is missing, empty or
 * misspelled, the module behaves as if it were OFF. Nothing here ever sends a
 * real message; it only decides which mode the rest of the module runs in.
 */

export const COLLECTIONS_MODES = ["OFF", "REVIEW", "PILOT", "LIVE"] as const;
export type CollectionsMode = (typeof COLLECTIONS_MODES)[number];

export const SENDING_MODES = ["OFF", "DRY_RUN", "LIVE"] as const;
export type SendingMode = (typeof SENDING_MODES)[number];

export const INTEGRATION_MODES = ["OFF", "TEST", "LIVE"] as const;
export type IntegrationMode = (typeof INTEGRATION_MODES)[number];

export const AI_LEVELS = ["OFF", "SUGGEST", "DRAFT", "AUTO"] as const;
export type AiLevel = (typeof AI_LEVELS)[number];

export const SYSTEMS_OF_RECORD = ["DEALERCENTER", "DISPATCH_BOARD"] as const;
export type SystemOfRecord = (typeof SYSTEMS_OF_RECORD)[number];

type Env = Record<string, string | undefined>;

function pick<T extends readonly string[]>(allowed: T, value: unknown, fallback: T[number]): T[number] {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toUpperCase();
  return (allowed as readonly string[]).includes(normalized) ? (normalized as T[number]) : fallback;
}

/** COLLECTIONS_MODULE=OFF|REVIEW|PILOT|LIVE. Anything else means OFF. */
export function resolveCollectionsMode(env: Env = process.env): CollectionsMode {
  return pick(COLLECTIONS_MODES, env.COLLECTIONS_MODULE, "OFF");
}

export function isCollectionsEnabled(env: Env = process.env) {
  return resolveCollectionsMode(env) !== "OFF";
}

/**
 * Effective sending mode for one channel. REVIEW mode always forces DRY_RUN
 * (or OFF if the channel itself is OFF) so nothing real can leave the building
 * while the owner is reviewing the module.
 */
export function resolveSendingMode(channel: "SMS" | "EMAIL", env: Env = process.env): SendingMode {
  const mode = resolveCollectionsMode(env);
  if (mode === "OFF") return "OFF";
  const raw = channel === "SMS" ? env.COLLECTIONS_SMS_SENDING : env.COLLECTIONS_EMAIL_SENDING;
  const requested = pick(SENDING_MODES, raw, "OFF");
  if (mode === "REVIEW" && requested === "LIVE") return "DRY_RUN";
  return requested;
}

/** Comma-separated user ids allowed in PILOT mode (besides admins). */
export function resolvePilotUserIds(env: Env = process.env): string[] {
  return (env.COLLECTIONS_PILOT_USER_IDS ?? "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
}

/**
 * Release 1 rule: the official ledger is always DealerCenter. Even if someone
 * sets SYSTEM_OF_RECORD=DISPATCH_BOARD in .env, Release 1 ignores it.
 */
export const RELEASE_1_SYSTEM_OF_RECORD_LOCKED = true;

export function resolveSystemOfRecord(env: Env = process.env): SystemOfRecord {
  if (RELEASE_1_SYSTEM_OF_RECORD_LOCKED) return "DEALERCENTER";
  return pick(SYSTEMS_OF_RECORD, env.SYSTEM_OF_RECORD, "DEALERCENTER");
}

/** Global AI kill switch (section 23.1). Release 1 builds no agents; default OFF. */
export function resolveAiLevel(env: Env = process.env): AiLevel {
  return pick(AI_LEVELS, env.COLLECTIONS_AI, "OFF");
}

/** The lower of the global switch and an agent's own level wins. */
export function effectiveAiLevel(globalLevel: AiLevel, agentLevel: AiLevel): AiLevel {
  return AI_LEVELS[Math.min(AI_LEVELS.indexOf(globalLevel), AI_LEVELS.indexOf(agentLevel))];
}

/**
 * Integration adapters (section 24): each has its own OFF|TEST|LIVE switch.
 * Release 1 makes no real vendor calls, so LIVE is capped to TEST.
 */
export const RELEASE_1_INTEGRATIONS_CAPPED_AT_TEST = true;

export function resolveIntegrationMode(envVar: string, env: Env = process.env): IntegrationMode {
  if (!isCollectionsEnabled(env)) return "OFF";
  const requested = pick(INTEGRATION_MODES, env[envVar], "OFF");
  if (RELEASE_1_INTEGRATIONS_CAPPED_AT_TEST && requested === "LIVE") return "TEST";
  return requested;
}
