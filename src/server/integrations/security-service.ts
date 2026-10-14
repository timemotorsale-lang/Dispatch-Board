import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { assertIntegrationPayloadSafe } from "./r11-domain";
import { integrationSecurityHash, normalizeCredentialReference, normalizePartnerRequest, normalizeWebhookSubscription, verifyWebhookSignature } from "./security-domain";
import { createIntegrationSecurityRepository, type CredentialReferenceRow, type IntegrationSecurityRepository } from "./security-repository";

export type IntegrationSecretResolver = (reference: string) => Promise<string>;
type Dependencies = { now?: () => Date; organizationId?: string; repository?: IntegrationSecurityRepository; secretResolver?: IntegrationSecretResolver };
const dependencies = (input: Dependencies) => ({ now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createIntegrationSecurityRepository(), secretResolver: input.secretResolver ?? resolveExternalSecret });
const list = (value: unknown) => Array.isArray(value) ? value.map(String) : [];
const safeCredential = (row: CredentialReferenceRow) => ({ id: row.id, partnerId: row.partnerId, systemCode: row.systemCode, keyId: row.keyId, secretProvider: row.secretRef.split("://")[0]?.toUpperCase() ?? "EXTERNAL", secretState: "REFERENCE_ONLY" as const, status: row.status, scopes: list(row.scopes), allowedOrigins: list(row.allowedOrigins), rateLimit: row.rateLimit, ownerUserId: row.ownerUserId, version: row.version, expiresAt: row.expiresAt.toISOString(), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
function authorizeManager(actor: AuthenticatedUser | null) { const user = assertAuthenticatedUser(actor); if (!isManager(user)) throw new Error("Integration security access requires manager privileges."); return user; }

export async function resolveExternalSecret(reference: string) {
  const match = reference.match(/^env:\/\/([A-Za-z_][A-Za-z0-9_]*)$/);
  if (!match) throw new Error("Configured secret provider is unavailable in this environment.");
  const value = process.env[match[1]];
  if (!value) throw new Error("Referenced webhook secret is unavailable.");
  return value;
}

export async function getIntegrationSecurityConsole(actor: AuthenticatedUser | null, input: Dependencies = {}) {
  const user = authorizeManager(actor); const context = dependencies(input), overview = await context.repository.overview(context.organizationId);
  return {
    contractVersion: "integration-security/wave5.0.0", generatedAt: context.now().toISOString(), operator: { id: user.id, name: user.name },
    capability: { credentialValues: "EXTERNAL_ONLY", credentialReferences: "DURABLE_SANDBOX", partnerAuthorization: "DURABLE_SCOPE_RATE_IDEMPOTENCY", production: "DISABLED", webhookIngress: "SIGNED_REPLAY_PROTECTED" },
    credentials: overview.credentials.map(safeCredential),
    subscriptions: overview.subscriptions.map(row => ({ id: row.id, credentialReferenceId: row.credentialReferenceId, url: row.url, eventTypes: list(row.eventTypes), apiVersion: row.apiVersion, secretProvider: row.secretRef.split("://")[0]?.toUpperCase() ?? "EXTERNAL", secretState: "REFERENCE_ONLY" as const, allowedOrigins: list(row.allowedOrigins), timestampToleranceSec: row.timestampToleranceSec, status: row.status, version: row.version, expiresAt: row.expiresAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
    deliveries: overview.deliveries,
    requests: overview.requests,
    totals: { credentialReferences: overview.credentials.length, activeSubscriptions: overview.subscriptions.filter(row => row.status === "SANDBOX_ACTIVE").length, verifiedDeliveries: overview.deliveries.filter(row => row.status === "VERIFIED").length, authorizedRequests: overview.requests.filter(row => row.status === "AUTHORIZED").length }
  };
}

export async function executeIntegrationSecurityCommand(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const user = authorizeManager(actor), context = dependencies(input);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Integration security command must be an object.");
  const raw = value as Record<string, unknown>, action = String(raw.action ?? "").toUpperCase();
  if (action === "REGISTER_CREDENTIAL_REFERENCE") {
    const normalized = normalizeCredentialReference(raw, context.now()), requestHash = integrationSecurityHash(normalized);
    if (!await context.repository.userExists(normalized.ownerUserId)) throw new Error("Active credential owner was not found.");
    return context.repository.createCredential({ ...normalized, actorUserId: user.id, organizationId: context.organizationId, requestHash });
  }
  if (action === "REGISTER_WEBHOOK_SUBSCRIPTION") {
    const normalized = normalizeWebhookSubscription(raw, context.now()), requestHash = integrationSecurityHash(normalized);
    return context.repository.createSubscription({ ...normalized, actorUserId: user.id, organizationId: context.organizationId, requestHash });
  }
  if (action === "AUTHORIZE_PARTNER_REQUEST") return authorizeDurablePartnerRequest(raw, input);
  throw new Error("Integration security action is not supported.");
}

export async function authorizeDurablePartnerRequest(value: unknown, input: Dependencies = {}) {
  const context = dependencies(input), request = normalizePartnerRequest(value), credential = await context.repository.getCredential(request.credentialReferenceId), now = context.now();
  if (!credential || credential.organizationId !== context.organizationId || credential.status !== "SANDBOX_ACTIVE" || credential.expiresAt <= now || credential.revokedAt) throw new Error("Active sandbox credential reference was not found.");
  if (!list(credential.scopes).includes(request.requiredScope)) throw new Error(`Partner scope required: ${request.requiredScope}.`);
  if (!/^v\d+$/.test(request.apiVersion)) throw new Error("Partner API version is invalid.");
  return context.repository.authorizePartnerRequest({ ...request, correlationId: randomUUID(), credential, now, organizationId: context.organizationId });
}

export type SignedWebhookInput = { apiVersion: string; body: string; deliveryId: string; eventTimestamp: string; eventType: string; origin: string; signature: string };
export async function ingestSignedWebhook(subscriptionId: string, value: SignedWebhookInput, input: Dependencies = {}) {
  const context = dependencies(input), now = context.now();
  if (!subscriptionId) throw new Error("Webhook subscription is required.");
  if (Buffer.byteLength(value.body, "utf8") > 1_048_576) throw new Error("Webhook payload exceeds the one megabyte limit.");
  try { const parsed = JSON.parse(value.body); assertIntegrationPayloadSafe(parsed); } catch (error) { if (error instanceof SyntaxError) throw new Error("Webhook payload must be valid JSON."); throw error; }
  const subscription = await context.repository.getSubscription(subscriptionId);
  if (!subscription || subscription.status !== "SANDBOX_ACTIVE" || subscription.revokedAt || (subscription.expiresAt && subscription.expiresAt <= now)) throw new Error("Active sandbox webhook subscription was not found.");
  const credential = await context.repository.getCredential(subscription.credentialReferenceId);
  if (!credential || credential.organizationId !== subscription.organizationId || credential.status !== "SANDBOX_ACTIVE" || credential.revokedAt || credential.expiresAt <= now) throw new Error("Active sandbox credential reference was not found.");
  const verified = verifyWebhookSignature(await context.secretResolver(subscription.secretRef), { allowedOrigins: list(subscription.allowedOrigins), apiVersion: value.apiVersion, body: value.body, deliveryId: value.deliveryId, eventTimestamp: new Date(value.eventTimestamp), eventType: value.eventType, expectedApiVersion: subscription.apiVersion, expectedEventTypes: list(subscription.eventTypes), keyId: credential.keyId, now, origin: value.origin, signature: value.signature, timestampToleranceSec: subscription.timestampToleranceSec });
  const receipt = await context.repository.recordDelivery({ apiVersion: value.apiVersion, bodyHash: verified.bodyHash, deliveryId: value.deliveryId, eventTimestamp: verified.eventTimestamp, eventType: value.eventType, keyId: verified.keyId, now, organizationId: subscription.organizationId, origin: value.origin, subscriptionId });
  return { accepted: true as const, deliveryId: value.deliveryId, receiptId: receipt.id, status: receipt.status, domainMutation: "NONE_PROVIDER_EVIDENCE_ONLY" as const };
}
