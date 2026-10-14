import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IntegrationEcosystemWorkspace } from "@/features/inventory/integration-ecosystem-workspace";
import { authorizePartner, enforceRateLimit, idempotent, paginate, registerWebhook } from "@/server/integrations/partner-api";
import { R11_INTEGRATION_CATALOG, R11_SOURCE_AUTHORITY } from "@/server/integrations/r11-catalog";
import { assertIntegrationPayloadSafe, detectR11Conflict, normalizeSandboxAcknowledgement, normalizeSandboxExchange } from "@/server/integrations/r11-domain";

const base = { idempotencyKey: "r11-idempotency", occurredAt: "2026-07-18T15:00:00.000Z", reason: "Exercise the approved provider-neutral sandbox contract." };

describe("R11 integration ecosystem", () => {
  it("registers all approved provider boundaries without claiming a live adapter", () => {
    expect(R11_INTEGRATION_CATALOG).toHaveLength(8);
    expect(R11_INTEGRATION_CATALOG.every(item => item.environment === "SANDBOX" && item.status === "CONTRACT_READY")).toBe(true);
    expect(R11_SOURCE_AUTHORITY.some(item => item.systemCode === "TRANSPORT")).toBe(true);
  });
  it("accepts only provider-neutral sandbox exchanges and rejects secret/card fields", () => {
    expect(normalizeSandboxExchange({ ...base, systemCode: "DMS_ACCOUNTING", adapterVersion: "dms/v1", mappingVersion: "map/v1", environment: "SANDBOX", direction: "OUTBOUND", resourceType: "sale", payload: { amountCents: 100 }, internalSnapshot: {}, externalSnapshot: {} }).environment).toBe("SANDBOX");
    expect(() => normalizeSandboxExchange({ ...base, systemCode: "DMS_ACCOUNTING", adapterVersion: "dms/v1", mappingVersion: "map/v1", environment: "PRODUCTION", direction: "OUTBOUND", resourceType: "sale", payload: {}, internalSnapshot: {}, externalSnapshot: {} })).toThrow("limited to SANDBOX");
    expect(() => assertIntegrationPayloadSafe({ cardNumber: "4111111111111111" })).toThrow("prohibited");
    expect(() => assertIntegrationPayloadSafe({ nested: { api_secret: "never-store" } })).toThrow("prohibited");
  });
  it("classifies acknowledgement mismatches without overwriting either side", () => {
    expect(detectR11Conflict({ expected: { amount: 100 }, actual: { amount: 90 } })).toMatchObject({ kind: "MISMATCHED" });
    expect(detectR11Conflict({ expected: {}, actual: {}, outOfBalance: true })).toMatchObject({ kind: "OUT_OF_BALANCE" });
    expect(detectR11Conflict({ expected: { amount: 100 }, actual: { amount: 100 } })).toBeNull();
    expect(normalizeSandboxAcknowledgement({ ...base, expectedVersion: 2, acknowledgementCode: "ack", status: "ACKNOWLEDGED", expected: {}, actual: {} }).expectedVersion).toBe(2);
  });
  it("enforces partner scope, bounded pagination, rate limit, idempotency, and HTTPS webhook contracts", () => {
    expect(() => authorizePartner({ partnerId: "p", organizationId: "o", active: true, scopes: ["vehicle:read"] }, "parts:write")).toThrow("scope required");
    expect(paginate(["a", "b", "c"], { limit: 2 }).hasMore).toBe(true);
    expect(enforceRateLimit("r11-test-partner", 2, 1).remaining).toBe(1);
    expect(idempotent("p", "key", "hash", () => ({ ok: true }))).toEqual({ ok: true });
    expect(idempotent("p", "key", "hash", () => ({ ok: false }))).toEqual({ ok: true });
    expect(() => registerWebhook({ id: "w", partnerId: "p", organizationId: "o", url: "http://unsafe", eventTypes: ["vehicle.updated"], apiVersion: "v1", active: true, secretRef: "vault-ref" })).toThrow("HTTPS");
  });
  it("renders registry, authority, reconciliation, pilots, partner API, and health destinations with truthful capability labels", () => {
    const model = { contractVersion: "integration-ecosystem/r11.0.0", generatedAt: "2026-07-18T15:00:00.000Z", capability: { adapters: "SANDBOX_HARNESS_ONLY", credentials: "REFERENCE_BOUNDARY_NO_SECRETS", partnerApi: "CONTRACT_ONLY_NOT_ISSUED", production: "DISABLED" }, registry: R11_INTEGRATION_CATALOG.map(item => ({ ...item, metrics: { exchanges: 0, conflicts: 0 } })), sourceAuthority: R11_SOURCE_AUTHORITY, exchanges: [], conflicts: [], health: { outbox: [], projections: [] }, totals: { systems: 8, sandboxExchanges: 0, awaitingAcknowledgement: 0, openConflicts: 0, deadLetters: 0 } };
    const markup = renderToStaticMarkup(<IntegrationEcosystemWorkspace initial={model as never} />);
    for (const token of ["Systems registry", "Source authority", "Reconciliation", "Sandbox pilots", "Partner API", "Health", "Production adapters disabled", "SANDBOX_HARNESS_ONLY"]) expect(markup).toContain(token);
  });
  it("defines persistent exchange/conflict aggregates and a source-controlled migration", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8"), migration = readFileSync("prisma/migrations/20260718193000_inventory_console_r11_integration_ecosystem/migration.sql", "utf8"), api = readFileSync("src/app/api/integrations/route.ts", "utf8");
    for (const token of ["model EnterpriseIntegrationExchange", "model EnterpriseIntegrationConflict", "EnterpriseIntegrationExchangeState", "acknowledgementSnapshot", "lineageSnapshot"]) expect(schema).toContain(token);
    expect(migration).toContain('CREATE TABLE "EnterpriseIntegrationExchange"');
    expect(api).toContain("executeR11IntegrationCommand");
  });
});
