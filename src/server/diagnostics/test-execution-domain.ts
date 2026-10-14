import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const DIAGNOSTIC_TEST_EXECUTION_STATES = ["PLANNED", "READY", "BLOCKED", "RUNNING", "PAUSED", "COMPLETED", "INVALIDATED", "CANCELLED"] as const;
export type DiagnosticTestExecutionState = (typeof DIAGNOSTIC_TEST_EXECUTION_STATES)[number];

const TEST_RISK_TIERS = ["R0", "R1", "R2", "R3", "R4"] as const;
const LIFECYCLE_REASONS: Record<string, readonly string[]> = {
  START: ["TEST_STARTED", "TEST_REPEATED"],
  PAUSE: ["TEST_PAUSED_TOOL", "TEST_PAUSED_VEHICLE", "TEST_PAUSED_INFORMATION", "TEST_PAUSED_SAFETY", "TEST_CONNECTION_LOST"],
  RESUME: ["TEST_RESUMED", "TEST_CONNECTION_RECOVERED"],
  COMPLETE: ["TEST_COMPLETED", "TEST_COMPLETED_WITH_DEVIATION"],
  INVALIDATE: ["TEST_INVALID_RESULT", "TEST_PREREQUISITE_CHANGED", "TEST_SETUP_INVALID", "TEST_EVIDENCE_CORRUPT"],
  CANCEL: ["TEST_CANCELLED_PLAN_CHANGED", "TEST_CANCELLED_NOT_APPLICABLE", "TEST_CANCELLED_SAFETY"]
};

function record(value: unknown, label: string, maximum = 40_000) {
  if (value == null) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  if (JSON.stringify(value).length > maximum) throw new Error(`${label} exceeds the ${maximum}-character limit.`);
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string, maximum = 100) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > maximum) throw new Error(`${label} must be an array with at most ${maximum} items.`);
  return value;
}

function text(value: unknown, label: string, maximum: number, minimum = 1) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length < minimum || normalized.length > maximum) throw new Error(`${label} must be ${minimum} through ${maximum} characters.`);
  return normalized;
}

function optionalText(value: unknown, label: string, maximum: number) {
  return value == null || value === "" ? null : text(value, label, maximum);
}

function integer(value: unknown, label: string, minimum = 1, maximum = 100_000) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < minimum || normalized > maximum) throw new Error(`${label} must be an integer from ${minimum} through ${maximum}.`);
  return normalized;
}

function optionalMoney(value: unknown) {
  if (value == null || value === "") return null;
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 10_000_000) throw new Error("Estimated test cost must be a non-negative finite amount.");
  return normalized.toFixed(2);
}

function expectedVersion(value: unknown) { return integer(value, "Expected diagnostic-case version"); }

function timestamp(value: unknown, label: string, fallback?: Date) {
  if ((value == null || value === "") && fallback) return fallback;
  const result = new Date(String(value));
  if (Number.isNaN(result.getTime())) throw new Error(`${label} must be a valid timestamp.`);
  return result;
}

function oneOf<T extends readonly string[]>(value: unknown, values: T, label: string): T[number] {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!(values as readonly string[]).includes(normalized)) throw new Error(`${label} is invalid.`);
  return normalized as T[number];
}

function commandIdentity(raw: Record<string, unknown>) {
  return { idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 200), reason: text(raw.reason, "Command reason", 500, 10) };
}

function commandFields(raw: Record<string, unknown>) {
  return { expectedVersion: expectedVersion(raw.expectedVersion), ...commandIdentity(raw) };
}

function checksum(value: unknown) { return hashEnterpriseCommand(value); }

export function normalizeDiagnosticTestDefinition(value: unknown, now = new Date()) {
  const raw = record(value, "Diagnostic test definition");
  const effectiveAt = timestamp(raw.effectiveAt, "Effective at", now);
  const expiresAt = raw.expiresAt == null || raw.expiresAt === "" ? null : timestamp(raw.expiresAt, "Expires at");
  if (expiresAt && expiresAt <= effectiveAt) throw new Error("Test-definition expiry must be after its effective time.");
  const sourceVersions = array(raw.sourceVersions, "Source versions").map((item, index) => {
    const source = record(item, `Source version ${index + 1}`);
    const validUntil = source.validUntil == null || source.validUntil === "" ? null : timestamp(source.validUntil, "Source valid until");
    if (String(source.rightsStatus ?? "").toUpperCase() !== "AUTHORIZED") throw new Error("Every diagnostic test source must have AUTHORIZED rights status.");
    if (validUntil && validUntil <= now) throw new Error("Expired diagnostic test sources cannot be registered.");
    return { ...source, sourceId: text(source.sourceId, "Source ID", 100), version: text(source.version, "Source version", 100), rightsStatus: "AUTHORIZED", validUntil: validUntil?.toISOString() ?? null };
  });
  const semantic = {
    name: text(raw.name, "Test name", 200), purpose: text(raw.purpose, "Test purpose", 2000, 10),
    ontologyLinks: array(raw.ontologyLinks, "Ontology links"), applicability: record(raw.applicability, "Applicability"),
    qualifications: array(raw.qualifications, "Qualifications"), hazards: array(raw.hazards, "Hazards"),
    prerequisites: array(raw.prerequisites, "Prerequisites"), tools: array(raw.tools, "Tools"), vehicleState: record(raw.vehicleState, "Vehicle state"),
    procedure: array(raw.procedure, "Procedure", 200), branches: array(raw.branches, "Branches", 200), interpretations: array(raw.interpretations, "Interpretations", 200),
    requiredEvidence: array(raw.requiredEvidence, "Required evidence"), sourceVersions
  };
  if (!semantic.procedure.length) throw new Error("A test definition requires at least one procedure step.");
  if (!semantic.sourceVersions.length) throw new Error("A test definition requires at least one governed source version.");
  return { ...commandIdentity(raw), expectedVersion: integer(raw.expectedVersion, "Expected test-definition aggregate version", 0), definitionKey: text(raw.definitionKey, "Definition key", 100).toUpperCase(), definitionVersion: integer(raw.definitionVersion, "Definition version"),
    ...semantic, estimatedMinutes: integer(raw.estimatedMinutes, "Estimated minutes", 1, 10_000), estimatedCostDecimal: optionalMoney(raw.estimatedCostDecimal),
    riskTier: oneOf(raw.riskTier ?? "R1", TEST_RISK_TIERS, "Risk tier"), effectiveAt, expiresAt, supersedesId: optionalText(raw.supersedesId, "Superseded definition ID", 100), checksum: checksum(semantic) };
}

type NormalizedNode = { branchRules: unknown[]; definitionVersionId: string; dependencyNodeKeys: string[]; nodeKey: string; requiredEvidenceOverride: unknown[] | null; sequence: number; title: string };

function normalizePlanNodes(value: unknown): NormalizedNode[] {
  const nodes = array(value, "Test-plan nodes", 200).map((item, index) => {
    const raw = record(item, `Test-plan node ${index + 1}`);
    return { nodeKey: text(raw.nodeKey, "Node key", 100).toUpperCase(), definitionVersionId: text(raw.definitionVersionId, "Definition-version ID", 100), title: text(raw.title, "Node title", 200), sequence: integer(raw.sequence ?? index + 1, "Node sequence"),
      dependencyNodeKeys: array(raw.dependencyNodeKeys, "Dependency node keys").map((key) => text(key, "Dependency node key", 100).toUpperCase()), branchRules: array(raw.branchRules, "Branch rules"),
      requiredEvidenceOverride: raw.requiredEvidenceOverride == null ? null : array(raw.requiredEvidenceOverride, "Required-evidence override") };
  });
  if (!nodes.length) throw new Error("A diagnostic test plan requires at least one node.");
  const keys = new Set(nodes.map((node) => node.nodeKey));
  if (keys.size !== nodes.length) throw new Error("Diagnostic test-plan node keys must be unique.");
  for (const node of nodes) {
    if (node.dependencyNodeKeys.includes(node.nodeKey)) throw new Error(`Test-plan node ${node.nodeKey} cannot depend on itself.`);
    for (const dependency of node.dependencyNodeKeys) if (!keys.has(dependency)) throw new Error(`Test-plan node ${node.nodeKey} references missing dependency ${dependency}.`);
    for (const [index, item] of node.branchRules.entries()) {
      const branch = record(item, `Branch rule ${index + 1} for ${node.nodeKey}`);
      const targetNodeKey = text(branch.targetNodeKey, "Branch target node key", 100).toUpperCase();
      if (!keys.has(targetNodeKey)) throw new Error(`Test-plan node ${node.nodeKey} references missing branch target ${targetNodeKey}.`);
    }
  }
  const visiting = new Set<string>(); const visited = new Set<string>();
  const visit = (key: string) => { if (visiting.has(key)) throw new Error("Diagnostic test-plan graph cannot contain a cycle."); if (visited.has(key)) return; visiting.add(key); const node = nodes.find((candidate) => candidate.nodeKey === key)!; node.dependencyNodeKeys.forEach(visit); visiting.delete(key); visited.add(key); };
  nodes.forEach((node) => visit(node.nodeKey));
  return nodes;
}

export function normalizeDiagnosticTestPlan(value: unknown) {
  const raw = record(value, "Diagnostic test plan");
  const nodes = normalizePlanNodes(raw.nodes);
  return { ...commandFields(raw), applicability: record(raw.applicability, "Plan applicability"), nodes, rationale: text(raw.rationale, "Plan rationale", 2000, 10), supersedesId: optionalText(raw.supersedesId, "Superseded plan ID", 100), graphChecksum: checksum(nodes) };
}

export type DiagnosticTestLifecycleAction = "START" | "PAUSE" | "RESUME" | "COMPLETE" | "INVALIDATE" | "CANCEL";

export function normalizeDiagnosticTestLifecycle(value: unknown, action: DiagnosticTestLifecycleAction, now = new Date()) {
  const raw = record(value, `Diagnostic test ${action.toLowerCase()}`);
  const reasonCode = text(raw.reasonCode, "Test reason code", 100).toUpperCase();
  if (!LIFECYCLE_REASONS[action].includes(reasonCode)) throw new Error(`Reason code ${reasonCode} is not valid for ${action.toLowerCase()}.`);
  const deviations = array(raw.deviations, "Test deviations", 100);
  const results = record(raw.results, "Test results");
  if (action === "COMPLETE" && reasonCode === "TEST_COMPLETED_WITH_DEVIATION" && !deviations.length) throw new Error("Completion with deviation requires at least one deviation.");
  if (action === "COMPLETE" && !Object.keys(results).length) throw new Error("Completing a diagnostic test requires structured results.");
  return { ...commandFields(raw), action, reasonCode, executionKey: optionalText(raw.executionKey, "Execution key", 100), planNodeId: optionalText(raw.planNodeId, "Plan-node ID", 100), repeatOfExecutionKey: optionalText(raw.repeatOfExecutionKey, "Repeated execution key", 100),
    actualConditions: record(raw.actualConditions, "Actual conditions"), deviations, inputs: record(raw.inputs, "Test inputs"), results, evidenceSummary: record(raw.evidenceSummary, "Evidence summary"), prerequisiteSnapshot: record(raw.prerequisiteSnapshot, "Prerequisite snapshot"), occurredAt: timestamp(raw.occurredAt, "Occurred at", now) };
}

export function nextTestExecutionState(current: DiagnosticTestExecutionState | null, action: DiagnosticTestLifecycleAction) {
  const transitions: Record<DiagnosticTestLifecycleAction, readonly (DiagnosticTestExecutionState | null)[]> = {
    START: [null], PAUSE: ["RUNNING"], RESUME: ["PAUSED"], COMPLETE: ["RUNNING"], INVALIDATE: ["RUNNING", "PAUSED", "COMPLETED"], CANCEL: ["READY", "BLOCKED", "RUNNING", "PAUSED"]
  };
  if (!transitions[action].includes(current)) throw new Error(`Diagnostic test cannot ${action.toLowerCase()} from ${current ?? "no execution"}.`);
  return ({ START: "RUNNING", PAUSE: "PAUSED", RESUME: "RUNNING", COMPLETE: "COMPLETED", INVALIDATE: "INVALIDATED", CANCEL: "CANCELLED" } as const)[action];
}

export function diagnosticTestId(prefix: "dtd" | "dtp" | "dtn" | "dte", organizationId: string, subjectId: string, key: string) {
  return `${prefix}_${hashEnterpriseCommand({ organizationId, subjectId, key }).slice(0, 24)}`;
}
