import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const DIAGNOSTIC_KNOWLEDGE_CONTRACT_VERSION = "DGN-020/1.0.0";
export const DIAGNOSTIC_KNOWLEDGE_RIGHTS = ["HOLD", "AUTHORIZED", "WITHDRAWN", "EXPIRED", "PROHIBITED"] as const;
export const DIAGNOSTIC_RELEASE_STATES = ["DRAFT", "REVIEW", "APPROVED", "SHADOW", "ACTIVE", "SUSPENDED", "RETIRED"] as const;
export const DIAGNOSTIC_KNOWLEDGE_SOURCE_CLASSES = ["ENGINEERING", "SHOP_PROCEDURE", "OEM_LICENSED", "REGULATORY", "STANDARD", "COMMERCIAL", "TOOL_EVIDENCE", "VERIFIED_CASE", "COMMUNITY_ADVISORY"] as const;
const DIAGNOSTIC_GRAPH_NODE_KINDS = ["SYSTEM", "FUNCTION", "COMPONENT", "PATH", "FAILURE_MODE", "TEST", "VERIFICATION", "ESCALATION"] as const;
const DIAGNOSTIC_GRAPH_EDGE_KINDS = ["DEPENDS_ON", "ENABLES", "CONTAINS", "CAN_FAIL_AS", "DETECTED_BY", "VERIFIED_BY", "ESCALATES_TO"] as const;

export type DiagnosticKnowledgeRights = (typeof DIAGNOSTIC_KNOWLEDGE_RIGHTS)[number];
export type DiagnosticReleaseState = (typeof DIAGNOSTIC_RELEASE_STATES)[number];
export type DiagnosticGraphNodeKind = "SYSTEM" | "FUNCTION" | "COMPONENT" | "PATH" | "FAILURE_MODE" | "TEST" | "VERIFICATION" | "ESCALATION";
export type DiagnosticGraphEdgeKind = "DEPENDS_ON" | "ENABLES" | "CONTAINS" | "CAN_FAIL_AS" | "DETECTED_BY" | "VERIFIED_BY" | "ESCALATES_TO";

export type DiagnosticGraphNode = { key: string; kind: DiagnosticGraphNodeKind; label: string; sourceKeys: string[] };
export type DiagnosticGraphEdge = { from: string; to: string; kind: DiagnosticGraphEdgeKind; sourceKeys: string[] };
export type DiagnosticKnowledgeSource = {
  sourceKey: string; version: number; rightsStatus: DiagnosticKnowledgeRights; sourceClass: string; ownerName: string; sourceReference: string;
  revision: string; usageRights: Record<string, boolean>; applicability: Record<string, unknown>; retrievedAt: string; effectiveAt: string;
  expiresAt: string | null; withdrawnAt: string | null; withdrawalReasonCode: string | null; authoredByUserId: string;
  technicalReviewedByUserId: string | null; rightsReviewedByUserId: string | null; approvedAt: string | null; supersedesId: string | null; checksum?: string;
};
export type DiagnosticKnowledgePackage = {
  contractVersion: string; ruleSetKey: string; version: number; releaseState: DiagnosticReleaseState; purpose: string;
  applicability: Record<string, unknown>; nodes: DiagnosticGraphNode[]; edges: DiagnosticGraphEdge[]; rules: Array<Record<string, unknown>>;
  testDefinitionKeys: string[]; calculationVersions: string[]; sources: DiagnosticKnowledgeSource[];
  sourceCitations: Array<{ sourceKey: string; purpose: string; locator: Record<string, unknown> }>; authoredByUserId: string;
  reviewedByUserId: string | null; approvedAt: string | null; effectiveAt: string; expiresAt: string | null; supersedesId: string | null;
  rollbackPredecessorId: string | null; checksum?: string;
};

function requiredText(value: unknown, label: string, minimum = 1, maximum = 500) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length < minimum || normalized.length > maximum) throw new Error(`${label} must be ${minimum} through ${maximum} characters.`);
  return normalized;
}

function timestamp(value: unknown, label: string) {
  const result = new Date(String(value ?? ""));
  if (Number.isNaN(result.getTime())) throw new Error(`${label} must be a valid timestamp.`);
  return result.toISOString();
}

function optionalTimestamp(value: unknown, label: string) { return value == null || value === "" ? null : timestamp(value, label); }
function record(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function oneOf<T extends readonly string[]>(value: unknown, values: T, label: string): T[number] {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!(values as readonly string[]).includes(normalized)) throw new Error(`${label} is invalid.`);
  return normalized as T[number];
}

export function checksumDiagnosticKnowledge(value: unknown) { return hashEnterpriseCommand(value); }

export function normalizeDiagnosticKnowledgeSource(source: DiagnosticKnowledgeSource, now = new Date()): DiagnosticKnowledgeSource & { checksum: string } {
  const rightsStatus = oneOf(source.rightsStatus, DIAGNOSTIC_KNOWLEDGE_RIGHTS, "Knowledge rights status");
  const effectiveAt = timestamp(source.effectiveAt, "Knowledge effective time");
  const expiresAt = optionalTimestamp(source.expiresAt, "Knowledge expiry");
  const withdrawnAt = optionalTimestamp(source.withdrawnAt, "Knowledge withdrawal time");
  if (expiresAt && expiresAt <= effectiveAt) throw new Error("Knowledge expiry must follow its effective time.");
  if (rightsStatus === "AUTHORIZED" && expiresAt && expiresAt <= now.toISOString()) throw new Error("Expired knowledge cannot be authorized.");
  const hasCompleteWithdrawal = Boolean(withdrawnAt && source.withdrawalReasonCode);
  const hasAnyWithdrawal = Boolean(withdrawnAt || source.withdrawalReasonCode);
  if ((rightsStatus === "WITHDRAWN" && !hasCompleteWithdrawal) || (rightsStatus !== "WITHDRAWN" && hasAnyWithdrawal)) throw new Error("Withdrawn knowledge requires a withdrawal time and reason code; other states must not contain them.");
  const author = requiredText(source.authoredByUserId, "Knowledge author", 1, 100);
  const technicalReviewer = source.technicalReviewedByUserId ? requiredText(source.technicalReviewedByUserId, "Technical reviewer", 1, 100) : null;
  const rightsReviewer = source.rightsReviewedByUserId ? requiredText(source.rightsReviewedByUserId, "Rights reviewer", 1, 100) : null;
  const approvedAt = optionalTimestamp(source.approvedAt, "Knowledge approval time");
  if (rightsStatus === "AUTHORIZED" && (!technicalReviewer || !rightsReviewer || !approvedAt)) throw new Error("Authorized knowledge requires technical review, rights review, and approval time.");
  if (rightsStatus === "AUTHORIZED" && (author === technicalReviewer || author === rightsReviewer)) throw new Error("A knowledge author cannot independently approve their own source version.");
  const semantic = {
    sourceKey: requiredText(source.sourceKey, "Source key", 1, 100).toUpperCase(), version: source.version,
    rightsStatus, sourceClass: oneOf(source.sourceClass, DIAGNOSTIC_KNOWLEDGE_SOURCE_CLASSES, "Source class"), ownerName: requiredText(source.ownerName, "Source owner", 1, 200),
    sourceReference: requiredText(source.sourceReference, "Source reference", 1, 500), revision: requiredText(source.revision, "Source revision", 1, 100),
    usageRights: record(source.usageRights, "Knowledge usage rights") as Record<string, boolean>, applicability: record(source.applicability, "Knowledge applicability"), retrievedAt: timestamp(source.retrievedAt, "Knowledge retrieval time"), effectiveAt,
    expiresAt, withdrawnAt, withdrawalReasonCode: source.withdrawalReasonCode ? requiredText(source.withdrawalReasonCode, "Withdrawal reason code", 1, 100).toUpperCase() : null,
    authoredByUserId: author, technicalReviewedByUserId: technicalReviewer, rightsReviewedByUserId: rightsReviewer, approvedAt,
    supersedesId: source.supersedesId ? requiredText(source.supersedesId, "Superseded source ID", 1, 100) : null
  };
  if (!Number.isInteger(semantic.version) || semantic.version < 1) throw new Error("Knowledge source version must be a positive integer.");
  return { ...semantic, checksum: checksumDiagnosticKnowledge(semantic) };
}

function validateGraph(nodes: DiagnosticGraphNode[], edges: DiagnosticGraphEdge[], sourceKeys: Set<string>) {
  if (!nodes.length) throw new Error("A diagnostic knowledge package requires graph nodes.");
  const nodeKeys = new Set<string>();
  for (const node of nodes) {
    node.key = requiredText(node.key, "Graph node key", 1, 120).toUpperCase();
    node.label = requiredText(node.label, `Graph node ${node.key} label`, 1, 200);
    node.kind = oneOf(node.kind, DIAGNOSTIC_GRAPH_NODE_KINDS, `Graph node ${node.key} kind`);
    if (nodeKeys.has(node.key)) throw new Error(`Duplicate graph node ${node.key}.`);
    nodeKeys.add(node.key);
    for (const sourceKey of node.sourceKeys) if (!sourceKeys.has(sourceKey)) throw new Error(`Graph node ${node.key} cites unknown source ${sourceKey}.`);
  }
  for (const edge of edges) {
    edge.from = requiredText(edge.from, "Graph edge source", 1, 120).toUpperCase();
    edge.to = requiredText(edge.to, "Graph edge target", 1, 120).toUpperCase();
    if (!nodeKeys.has(edge.from) || !nodeKeys.has(edge.to)) throw new Error(`Graph edge ${edge.from} -> ${edge.to} references an unknown node.`);
    if (edge.from === edge.to) throw new Error("Diagnostic graph self-edges are prohibited.");
    edge.kind = oneOf(edge.kind, DIAGNOSTIC_GRAPH_EDGE_KINDS, `Graph edge ${edge.from} -> ${edge.to} kind`);
    for (const sourceKey of edge.sourceKeys) if (!sourceKeys.has(sourceKey)) throw new Error(`Graph edge ${edge.from} -> ${edge.to} cites unknown source ${sourceKey}.`);
  }
}

export function normalizeDiagnosticKnowledgePackage(input: DiagnosticKnowledgePackage, now = new Date()): DiagnosticKnowledgePackage & { checksum: string; sources: Array<DiagnosticKnowledgeSource & { checksum: string }> } {
  const releaseState = oneOf(input.releaseState, DIAGNOSTIC_RELEASE_STATES, "Knowledge release state");
  const sources = input.sources.map((source) => normalizeDiagnosticKnowledgeSource(source, now));
  if (!sources.length) throw new Error("A diagnostic knowledge package requires at least one governed source.");
  const sourceKeys = new Set(sources.map((source) => source.sourceKey));
  if (sourceKeys.size !== sources.length) throw new Error("Knowledge source keys must be unique within a release package.");
  validateGraph(input.nodes, input.edges, sourceKeys);
  if (!input.edges.length || !input.rules.length || !input.testDefinitionKeys.length || !input.calculationVersions.length) throw new Error("A diagnostic knowledge package requires edges, rules, test definitions, and calculation versions.");
  const sourceCitations = input.sourceCitations.map((citation) => ({
    sourceKey: requiredText(citation.sourceKey, "Citation source key", 1, 100).toUpperCase(), purpose: requiredText(citation.purpose, "Citation purpose", 1, 500),
    locator: record(citation.locator, "Citation locator")
  }));
  if (!sourceCitations.length) throw new Error("A diagnostic knowledge package requires explicit source citations.");
  for (const citation of sourceCitations) if (!sourceKeys.has(citation.sourceKey)) throw new Error(`Citation references unknown source ${citation.sourceKey}.`);
  for (const source of sources) if (!sourceCitations.some((citation) => citation.sourceKey === source.sourceKey)) throw new Error(`Knowledge source ${source.sourceKey} requires a citation.`);
  const author = requiredText(input.authoredByUserId, "Rule-set author", 1, 100);
  const reviewer = input.reviewedByUserId ? requiredText(input.reviewedByUserId, "Rule-set reviewer", 1, 100) : null;
  const approvedAt = optionalTimestamp(input.approvedAt, "Rule-set approval time");
  if (["APPROVED", "SHADOW", "ACTIVE"].includes(releaseState) && (!reviewer || !approvedAt || reviewer === author)) throw new Error("Approved, shadow, and active rule sets require independent review and approval.");
  if (["SHADOW", "ACTIVE"].includes(releaseState) && sources.some((source) => source.rightsStatus !== "AUTHORIZED")) throw new Error("Shadow and active rule sets may use only authorized source versions.");
  if (releaseState === "ACTIVE" && sources.some((source) => ["OEM_LICENSED", "COMMERCIAL"].includes(source.sourceClass) && Object.keys(source.applicability).length === 0)) throw new Error("Vehicle-specific active sources require explicit applicability.");
  const effectiveAt = timestamp(input.effectiveAt, "Rule-set effective time");
  const expiresAt = optionalTimestamp(input.expiresAt, "Rule-set expiry");
  if (expiresAt && expiresAt <= effectiveAt) throw new Error("Rule-set expiry must follow its effective time.");
  const semantic = {
    contractVersion: DIAGNOSTIC_KNOWLEDGE_CONTRACT_VERSION, ruleSetKey: requiredText(input.ruleSetKey, "Rule-set key", 1, 100).toUpperCase(), version: input.version,
    releaseState, purpose: requiredText(input.purpose, "Rule-set purpose", 10, 1000), applicability: input.applicability,
    nodes: input.nodes, edges: input.edges, rules: input.rules, testDefinitionKeys: input.testDefinitionKeys.map((key) => requiredText(key, "Test-definition key", 1, 100).toUpperCase()),
    calculationVersions: input.calculationVersions.map((version) => requiredText(version, "Calculation version", 1, 100)), sources, sourceCitations,
    authoredByUserId: author, reviewedByUserId: reviewer, approvedAt, effectiveAt, expiresAt,
    supersedesId: input.supersedesId ? requiredText(input.supersedesId, "Superseded rule-set ID", 1, 100) : null,
    rollbackPredecessorId: input.rollbackPredecessorId ? requiredText(input.rollbackPredecessorId, "Rollback predecessor ID", 1, 100) : null
  };
  if (!Number.isInteger(semantic.version) || semantic.version < 1) throw new Error("Rule-set version must be a positive integer.");
  return { ...semantic, checksum: checksumDiagnosticKnowledge(semantic) };
}

export function traverseDiagnosticKnowledgeGraph(graph: Pick<DiagnosticKnowledgePackage, "nodes" | "edges">, startKey: string, options: { direction?: "OUTBOUND" | "INBOUND"; edgeKinds?: DiagnosticGraphEdgeKind[]; maximumDepth?: number } = {}) {
  const direction = options.direction ?? "OUTBOUND"; const maximumDepth = options.maximumDepth ?? 20;
  if (!Number.isInteger(maximumDepth) || maximumDepth < 0 || maximumDepth > 100) throw new Error("Graph traversal depth must be an integer from 0 through 100.");
  const start = startKey.trim().toUpperCase();
  if (!graph.nodes.some((node) => node.key === start)) throw new Error(`Unknown diagnostic graph node ${start}.`);
  const visited = new Set([start]); const queue: Array<{ key: string; depth: number }> = [{ key: start, depth: 0 }];
  while (queue.length) {
    const current = queue.shift()!;
    if (current.depth >= maximumDepth) continue;
    for (const edge of graph.edges) {
      if (options.edgeKinds && !options.edgeKinds.includes(edge.kind)) continue;
      const next = direction === "OUTBOUND" && edge.from === current.key ? edge.to : direction === "INBOUND" && edge.to === current.key ? edge.from : null;
      if (next && !visited.has(next)) { visited.add(next); queue.push({ key: next, depth: current.depth + 1 }); }
    }
  }
  return graph.nodes.filter((node) => visited.has(node.key));
}

export function assertKnowledgePackageUsable(pkg: ReturnType<typeof normalizeDiagnosticKnowledgePackage>, now = new Date()) {
  if (!['SHADOW', 'ACTIVE'].includes(pkg.releaseState)) throw new Error(`Knowledge release ${pkg.ruleSetKey} is not executable in ${pkg.releaseState}.`);
  if (pkg.expiresAt && pkg.expiresAt <= now.toISOString()) throw new Error(`Knowledge release ${pkg.ruleSetKey} is expired.`);
  const unavailable = pkg.sources.find((source) => source.rightsStatus !== "AUTHORIZED" || (source.expiresAt && source.expiresAt <= now.toISOString()));
  if (unavailable) throw new Error(`Knowledge source ${unavailable.sourceKey} is unavailable; dependent reasoning must abstain.`);
}
