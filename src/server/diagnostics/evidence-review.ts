type Observation = { id: string; statement: string; qualityStatus: string; qualityReasonCode: string; source: string; reliability: string; observedAt: string; correctsId: string | null; correctedById: string | null; rawSource: unknown };
type Measurement = { id: string; quantity: string; value: string; unit: string; normalizedValue: string; normalizedUnit: string; referenceMinimum: string | null; referenceMaximum: string | null; normalizedReferenceMin: string | null; normalizedReferenceMax: string | null; qualityStatus: string; qualityReasonCode: string; plausibilityStatus: string; plausibilityReasonCode: string; reliability: string; measuredAt: string; supersedesId: string | null; supersededById: string | null; rawSource: unknown };
type EvidenceLink = { id: string; subjectType: string; subjectId: string; purpose: string; relationship: string; createdAt: string; evidence: { fileName: string; status: string; malwareStatus: string; checksumSha256: string; createdAt: string } };
type TestExecution = { id: string; executionKey: string; revision: number; state: string; occurredAt: string; previousEventId: string | null; repeatOfExecutionKey: string | null; planNode: { id: string; nodeKey: string; title: string }; reasonCode: string; results: unknown; deviations: unknown; actualConditions: unknown };
type TestPlan = { id: string; version: number; status: string; createdAt: string; nodes: Array<{ id: string; nodeKey: string; title: string; definition: { definitionKey: string; version: number; checksum: string; effectiveAt: string; expiresAt: string | null; requiredEvidence: unknown; sourceVersions?: unknown } }> };

function number(value: string | null) { const parsed = value == null ? null : Number(value); return parsed != null && Number.isFinite(parsed) ? parsed : null; }
function timestamp(value: string) { const parsed = new Date(value).getTime(); return Number.isFinite(parsed) ? parsed : 0; }

export function buildDiagnosticEvidenceReview(input: { permitted: boolean; now?: Date; observations: Observation[]; measurements: Measurement[]; evidenceLinks: EvidenceLink[]; testExecutions: TestExecution[]; testPlans: TestPlan[] }) {
  if (!input.permitted) return { state: "RESTRICTED" as const, reconstructionComplete: false, timeline: [], measurementMatrix: [], comparisons: [], conflicts: [], sources: [], lineage: [] };

  const timeline = [
    ...input.observations.map((item) => ({ id: item.id, kind: "OBSERVATION" as const, occurredAt: item.observedAt, title: item.statement, status: item.qualityStatus, subjectId: item.id, detail: `${item.source} · ${item.reliability}` })),
    ...input.measurements.map((item) => ({ id: item.id, kind: "MEASUREMENT" as const, occurredAt: item.measuredAt, title: `${item.quantity}: ${item.value} ${item.unit}`, status: item.qualityStatus, subjectId: item.id, detail: `Normalized ${item.normalizedValue} ${item.normalizedUnit} · ${item.plausibilityStatus}` })),
    ...input.evidenceLinks.map((item) => ({ id: item.id, kind: "ATTACHMENT" as const, occurredAt: item.createdAt, title: item.evidence.status === "DELETED" ? "Deleted evidence object" : item.evidence.fileName, status: item.evidence.status, subjectId: item.subjectId, detail: `${item.subjectType} · ${item.relationship}` })),
    ...input.testExecutions.map((item) => ({ id: item.id, kind: "TEST" as const, occurredAt: item.occurredAt, title: item.planNode.title, status: item.state, subjectId: item.id, detail: `Revision ${item.revision} · ${item.reasonCode}` }))
  ].sort((left, right) => timestamp(right.occurredAt) - timestamp(left.occurredAt));

  const grouped = new Map<string, Measurement[]>();
  for (const item of input.measurements) { const key = `${item.quantity}:${item.normalizedUnit}`; grouped.set(key, [...(grouped.get(key) ?? []), item]); }
  const measurementMatrix = [...grouped.entries()].map(([key, values]) => {
    const ordered = [...values].sort((left, right) => timestamp(right.measuredAt) - timestamp(left.measuredAt));
    const current = ordered.find((item) => !item.supersededById) ?? ordered[0];
    return { key, quantity: current.quantity, normalizedUnit: current.normalizedUnit, currentValue: current.normalizedValue, currentQuality: current.qualityStatus, sampleCount: values.length, validSamples: values.filter((item) => item.qualityStatus === "VALID" && !item.supersededById).length, minimum: Math.min(...values.map((item) => Number(item.normalizedValue))), maximum: Math.max(...values.map((item) => Number(item.normalizedValue))), latestAt: current.measuredAt };
  }).sort((left, right) => left.quantity.localeCompare(right.quantity));

  const comparisons = input.measurements.filter((item) => !item.supersededById).map((item) => {
    const actual = number(item.normalizedValue); const minimum = number(item.normalizedReferenceMin); const maximum = number(item.normalizedReferenceMax);
    const disposition = item.qualityStatus === "INVALID" ? "INVALID" : actual == null || (minimum == null && maximum == null) ? "NO_REFERENCE" : minimum != null && actual < minimum ? "BELOW" : maximum != null && actual > maximum ? "ABOVE" : "WITHIN";
    return { id: item.id, quantity: item.quantity, actual: item.normalizedValue, unit: item.normalizedUnit, minimum: item.normalizedReferenceMin, maximum: item.normalizedReferenceMax, disposition, measuredAt: item.measuredAt };
  });

  const conflicts = [
    ...input.observations.filter((item) => item.correctedById || ["SUSPECT", "INVALID"].includes(item.qualityStatus)).map((item) => ({ id: `observation:${item.id}`, severity: item.qualityStatus === "INVALID" ? "HIGH" : "REVIEW", title: item.correctedById ? "Observation was corrected" : "Observation quality requires review", detail: item.statement, subjectId: item.id })),
    ...input.measurements.filter((item) => item.supersededById || item.qualityStatus !== "VALID" || item.plausibilityStatus === "OUT_OF_RANGE").map((item) => ({ id: `measurement:${item.id}`, severity: item.qualityStatus === "INVALID" ? "HIGH" : "REVIEW", title: item.supersededById ? "Measurement was superseded" : "Measurement quality conflicts with use", detail: `${item.quantity}: ${item.value} ${item.unit} · ${item.qualityReasonCode}`, subjectId: item.id }))
  ];

  const now = (input.now ?? new Date()).getTime();
  type SourceReview = { id: string; planId: string; nodeId: string; name: string; version: string; checksum: string; effectiveAt: string; expiresAt: string | null; rightsStatus: string; freshness: string };
  const sourceCandidates: SourceReview[] = [];
  for (const plan of input.testPlans) for (const node of plan.nodes) {
    const sourceVersions = Array.isArray(node.definition.sourceVersions) ? node.definition.sourceVersions.filter((source): source is Record<string, unknown> => Boolean(source) && typeof source === "object" && !Array.isArray(source)) : [];
    if (!sourceVersions.length) sourceCandidates.push({ id: node.definition.definitionKey, planId: plan.id, nodeId: node.id, name: node.title, version: String(node.definition.version), checksum: node.definition.checksum, effectiveAt: node.definition.effectiveAt, expiresAt: node.definition.expiresAt, rightsStatus: "UNAVAILABLE", freshness: node.definition.expiresAt && timestamp(node.definition.expiresAt) <= now ? "EXPIRED" : timestamp(node.definition.effectiveAt) > now ? "NOT_EFFECTIVE" : "CURRENT" });
    for (const source of sourceVersions) { const validUntil = typeof source.validUntil === "string" ? source.validUntil : null; const rightsStatus = String(source.rightsStatus ?? "UNKNOWN"); sourceCandidates.push({ id: String(source.sourceId ?? node.definition.definitionKey), planId: plan.id, nodeId: node.id, name: `${node.title} · ${String(source.sourceId ?? "source")}`, version: String(source.version ?? node.definition.version), checksum: node.definition.checksum, effectiveAt: node.definition.effectiveAt, expiresAt: validUntil ?? node.definition.expiresAt, rightsStatus, freshness: rightsStatus !== "AUTHORIZED" ? "RIGHTS_HOLD" : validUntil && timestamp(validUntil) <= now ? "EXPIRED" : "CURRENT" }); }
  }
  const sources = sourceCandidates.filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id && candidate.version === item.version) === index);

  const lineage = [
    ...input.observations.map((item) => ({ id: `raw:${item.id}`, kind: "RAW_OBSERVATION_SOURCE", fromId: String((item.rawSource as Record<string, unknown> | null)?.kind ?? "UNKNOWN_SOURCE"), toId: item.id })),
    ...input.measurements.map((item) => ({ id: `raw:${item.id}`, kind: "RAW_MEASUREMENT_SOURCE", fromId: String((item.rawSource as Record<string, unknown> | null)?.kind ?? "UNKNOWN_SOURCE"), toId: item.id })),
    ...input.observations.filter((item) => item.correctsId).map((item) => ({ id: item.id, kind: "OBSERVATION_CORRECTION", fromId: item.correctsId!, toId: item.id })),
    ...input.measurements.filter((item) => item.supersedesId).map((item) => ({ id: item.id, kind: "MEASUREMENT_SUPERSESSION", fromId: item.supersedesId!, toId: item.id })),
    ...input.testExecutions.filter((item) => item.previousEventId).map((item) => ({ id: item.id, kind: "TEST_REVISION", fromId: item.previousEventId!, toId: item.id })),
    ...input.testExecutions.filter((item) => item.repeatOfExecutionKey).map((item) => ({ id: `repeat:${item.id}`, kind: "TEST_REPEAT", fromId: item.repeatOfExecutionKey!, toId: item.executionKey }))
  ];
  return { state: "COMPLETE" as const, reconstructionComplete: timeline.length > 0, timeline, measurementMatrix, comparisons, conflicts, sources, lineage };
}
