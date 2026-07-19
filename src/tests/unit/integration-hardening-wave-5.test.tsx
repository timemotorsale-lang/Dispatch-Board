import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { IntegrationSecurityWorkspace } from "@/features/inventory/integration-security-workspace";
import type { AuthenticatedUser } from "@/server/auth/store";
import { normalizeCredentialReference, signWebhook, verifyWebhookSignature } from "@/server/integrations/security-domain";
import { authorizeDurablePartnerRequest, getIntegrationSecurityConsole, ingestSignedWebhook } from "@/server/integrations/security-service";

const now = new Date("2026-07-18T18:00:00.000Z"), manager: AuthenticatedUser = { id: "manager", name: "Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
const credential = { id: "cred-1", organizationId: "org-1", partnerId: "partner-1", systemCode: "DMS_ACCOUNTING", keyId: "key-v1", secretRef: "env://WEBHOOK_TEST_SECRET", idempotencyKey: "credential-request", requestHash: "hash", status: "SANDBOX_ACTIVE", scopes: ["inventory:read", "webhook:manage"], allowedOrigins: ["https://partner.example"], rateLimit: 60, ownerUserId: "owner", createdByUserId: "manager", version: 1, expiresAt: new Date("2026-08-18T00:00:00.000Z"), revokedAt: null, createdAt: now, updatedAt: now };
const subscription = { id: "sub-1", organizationId: "org-1", credentialReferenceId: credential.id, url: "https://partner.example/hook", eventTypes: ["inventory.updated"], apiVersion: "v1", secretRef: credential.secretRef, idempotencyKey: "webhook-request", requestHash: "hash", allowedOrigins: ["https://partner.example"], timestampToleranceSec: 300, status: "SANDBOX_ACTIVE", version: 1, createdByUserId: "manager", expiresAt: null, revokedAt: null, createdAt: now, updatedAt: now };

describe("Wave 5 integration hardening", () => {
  it("accepts only external secret references and bounded sandbox credential policy", () => {
    const base = { partnerId: "partner-1", systemCode: "DMS_ACCOUNTING", keyId: "key-v1", scopes: ["inventory:read"], allowedOrigins: ["https://partner.example"], rateLimit: 60, ownerUserId: "owner", expiresAt: "2026-08-18T00:00:00.000Z", idempotencyKey: "credential-request" };
    expect(normalizeCredentialReference({ ...base, secretRef: "env://WEBHOOK_TEST_SECRET" }, now).secretRef).toBe("env://WEBHOOK_TEST_SECRET");
    expect(() => normalizeCredentialReference({ ...base, secretRef: "literal-super-secret" }, now)).toThrow("vault:// or env://");
    expect(() => normalizeCredentialReference({ ...base, secretRef: "env://WEBHOOK_TEST_SECRET", allowedOrigins: ["http://partner.example"] }, now)).toThrow("exact HTTPS origins");
  });

  it("verifies HMAC, origin, version, and replay-window inputs", () => {
    const input = { allowedOrigins: ["https://partner.example"], apiVersion: "v1", body: '{"vehicleId":"v-1"}', deliveryId: "delivery-1", eventTimestamp: now, eventType: "inventory.updated", expectedApiVersion: "v1", expectedEventTypes: ["inventory.updated"], keyId: "key-v1", now, origin: "https://partner.example", signature: "", timestampToleranceSec: 300 };
    input.signature = `v1=${signWebhook("test-secret", input)}`;
    expect(verifyWebhookSignature("test-secret", input).verified).toBe(true);
    expect(() => verifyWebhookSignature("wrong-secret", input)).toThrow("signature is invalid");
    expect(() => verifyWebhookSignature("test-secret", { ...input, origin: "https://attacker.example" })).toThrow("origin is not allowed");
    expect(() => verifyWebhookSignature("test-secret", { ...input, apiVersion: "v2" })).toThrow("version is not subscribed");
    expect(() => verifyWebhookSignature("test-secret", { ...input, now: new Date(now.getTime() + 301_000) })).toThrow("replay window");
  });

  it("records a hash-only verified receipt after signature checks", async () => {
    const body = '{"vehicleId":"v-1"}', signature = `v1=${signWebhook("test-secret", { body, deliveryId: "delivery-1", eventTimestamp: now })}`, recordDelivery = vi.fn(async () => ({ id: "receipt-1", status: "VERIFIED" as const }));
    const repository = { getSubscription: vi.fn(async () => subscription), getCredential: vi.fn(async () => credential), recordDelivery };
    const result = await ingestSignedWebhook("sub-1", { apiVersion: "v1", body, deliveryId: "delivery-1", eventTimestamp: now.toISOString(), eventType: "inventory.updated", origin: "https://partner.example", signature }, { now: () => now, organizationId: "org-1", repository: repository as never, secretResolver: async () => "test-secret" });
    expect(result).toMatchObject({ accepted: true, status: "VERIFIED", domainMutation: "NONE_PROVIDER_EVIDENCE_ONLY" });
    expect(recordDelivery).toHaveBeenCalledWith(expect.objectContaining({ deliveryId: "delivery-1", bodyHash: expect.stringMatching(/^[a-f0-9]{64}$/) }));
    expect(JSON.stringify(recordDelivery.mock.calls)).not.toContain("test-secret");
  });

  it("authorizes partner requests through durable scope, rate, and idempotency storage", async () => {
    const authorizePartnerRequest = vi.fn(async () => ({ duplicate: false, requestId: "request-1", status: "AUTHORIZED" })), repository = { getCredential: vi.fn(async () => credential), authorizePartnerRequest };
    await expect(authorizeDurablePartnerRequest({ credentialReferenceId: credential.id, requiredScope: "inventory:read", apiVersion: "v1", method: "GET", resource: "/inventory/vehicles", payload: {}, idempotencyKey: "partner-request-1" }, { now: () => now, organizationId: "org-1", repository: repository as never })).resolves.toMatchObject({ status: "AUTHORIZED" });
    expect(authorizePartnerRequest).toHaveBeenCalledWith(expect.objectContaining({ requestHash: expect.stringMatching(/^[a-f0-9]{64}$/), requiredScope: "inventory:read" }));
    await expect(authorizeDurablePartnerRequest({ credentialReferenceId: credential.id, requiredScope: "parts:write", apiVersion: "v1", method: "POST", resource: "/parts", payload: {}, idempotencyKey: "partner-request-2" }, { now: () => now, organizationId: "org-1", repository: repository as never })).rejects.toThrow("Partner scope required");
  });

  it("never returns a secret reference or value to the manager UI", async () => {
    const repository = { overview: vi.fn(async () => ({ credentials: [credential], subscriptions: [subscription], deliveries: [], requests: [] })) };
    const model = await getIntegrationSecurityConsole(manager, { now: () => now, organizationId: "org-1", repository: repository as never });
    expect(model.credentials[0]).toMatchObject({ secretProvider: "ENV", secretState: "REFERENCE_ONLY" });
    expect(JSON.stringify(model)).not.toContain("WEBHOOK_TEST_SECRET");
    const markup = renderToStaticMarkup(<IntegrationSecurityWorkspace initial={model} />);
    for (const token of ["Security &amp; Webhook Operations", "Credential reference registry", "Verified delivery ledger", "Partner request ledger", "Secret values stored", "Sandbox only"]) expect(markup).toContain(token);
  });

  it("defines durable credential, webhook, replay, and partner-request ledgers", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8"), migration = readFileSync("prisma/migrations/20260718234500_inventory_console_gap_closure_wave_5/migration.sql", "utf8"), webhookRoute = readFileSync("src/app/api/integrations/webhooks/[subscriptionId]/route.ts", "utf8");
    for (const token of ["model IntegrationCredentialReference", "model IntegrationWebhookSubscription", "model IntegrationWebhookDelivery", "model IntegrationPartnerRequest"]) expect(schema).toContain(token);
    expect(migration).toContain('IntegrationWebhookDelivery_organizationId_subscriptionId_deliveryId_key');
    for (const token of ["x-delivery-id", "x-event-timestamp", "x-signature", "ingestSignedWebhook"]) expect(webhookRoute).toContain(token);
  });
});
