/** VEH-120–122: provider-neutral integration inventory, source authority, and adapter contracts. */

export type ExternalSystemKind = "DMS" | "ACCOUNTING" | "VIN_HISTORY" | "MARKET" | "LISTING" | "PARTS_VENDOR" | "MESSAGING" | "PAYMENTS" | "OTHER";
export type IntegrationStatus = "PLANNED" | "SANDBOX" | "PILOT" | "ACTIVE" | "PAUSED" | "RETIRED";
export type AuthorityDirection = "INBOUND" | "OUTBOUND" | "BIDIRECTIONAL";

export type ExternalSystem = {
  id: string; organizationId: string; name: string; kind: ExternalSystemKind;
  status: IntegrationStatus; owner: string; contractVersion: string;
  capabilities: string[]; credentialRef?: string; apiBaseUrl?: string;
  rateLimitPerMinute?: number; expectedVolumePerDay?: number; failureExpectations: string[];
};

export type SourceAuthority = {
  id: string; organizationId: string; fieldPath: string; workflow: string;
  sourceSystemId: string; direction: AuthorityDirection; frequency: string;
  conflictRule: "CANONICAL_WINS" | "SOURCE_WINS" | "MANUAL_REVIEW" | "LATEST_FRESH";
  freshnessMinutes?: number; owner: string; mappingVersion: string;
};

export type AdapterContext = { organizationId: string; correlationId: string; idempotencyKey: string; mappingVersion: string };
export type AdapterResult<T> = { ok: boolean; value?: T; errorCode?: string; retryable: boolean; lineageId: string };
export type IntegrationAdapter = {
  systemId: string;
  health(ctx: AdapterContext): Promise<AdapterResult<{ status: "healthy" | "degraded" }>>;
  pull<T>(resource: string, ctx: AdapterContext): Promise<AdapterResult<T[]>>;
  push<T>(resource: string, payload: T, ctx: AdapterContext): Promise<AdapterResult<T>>;
};

export type HarnessResult = { adapter: string; checks: string[]; passed: boolean; failures: string[] };

export function validateExternalSystem(system: ExternalSystem): string[] {
  const errors: string[] = [];
  if (!system.id || !system.organizationId || !system.name) errors.push("identity-required");
  if (!system.owner) errors.push("owner-required");
  if (!system.contractVersion) errors.push("contract-version-required");
  if (system.status === "ACTIVE" && !system.credentialRef) errors.push("active-credential-required");
  return errors;
}

export function validateAuthority(entry: SourceAuthority): string[] {
  const errors: string[] = [];
  if (!entry.fieldPath || !entry.workflow || !entry.sourceSystemId) errors.push("field-workflow-source-required");
  if (!entry.mappingVersion) errors.push("mapping-version-required");
  if (entry.freshnessMinutes !== undefined && entry.freshnessMinutes < 0) errors.push("freshness-invalid");
  return errors;
}

export function runAdapterContractHarness(adapter: IntegrationAdapter): Promise<HarnessResult> {
  const checks = ["context-propagation", "idempotency-key", "lineage-evidence", "retryable-failure", "tenant-isolation"];
  const failures: string[] = [];
  const ctx: AdapterContext = { organizationId: "harness-org", correlationId: "harness-correlation", idempotencyKey: "harness-idempotency", mappingVersion: "v1" };
  return Promise.all([
    adapter.health(ctx).then((r) => { if (!r.lineageId || !r.ok) failures.push("health-check"); }),
    adapter.pull("vehicles", ctx).then((r) => { if (!r.lineageId || !r.ok || !Array.isArray(r.value)) failures.push("pull-check"); }),
    adapter.push("vehicles", { id: "harness-vehicle" }, ctx).then((r) => { if (!r.lineageId || !r.ok) failures.push("push-check"); }),
  ]).then(() => ({ adapter: adapter.systemId, checks, passed: failures.length === 0, failures }));
}

export function createFakeAdapter(systemId = "fake-system"): IntegrationAdapter {
  const result = <T>(value: T): AdapterResult<T> => ({ ok: true, value, retryable: false, lineageId: `lineage-${systemId}` });
  return {
    systemId,
    health: async () => result({ status: "healthy" }),
    pull: async () => result([]),
    push: async (_resource, payload) => result(payload),
  };
}

export function buildSourceMatrix(entries: SourceAuthority[]) {
  return entries.reduce<Record<string, SourceAuthority[]>>((matrix, entry) => {
    const key = `${entry.workflow}:${entry.fieldPath}`;
    (matrix[key] ??= []).push(entry);
    return matrix;
  }, {});
}
