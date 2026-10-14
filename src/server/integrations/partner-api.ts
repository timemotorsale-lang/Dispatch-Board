/** VEH-129: governed partner API boundary.  This module is deliberately provider-neutral;
 * persistence and credential issuance are supplied by the host application. */

export type PartnerScope =
  | "vehicle:read" | "inventory:read" | "repair-order:read" | "repair-order:write"
  | "parts:read" | "parts:write" | "webhook:manage";

export type PartnerCredential = {
  partnerId: string; organizationId: string; scopes: PartnerScope[];
  active: boolean; expiresAt?: Date;
};

export type Page<T> = { data: T[]; nextCursor?: string; hasMore: boolean };
export type WebhookSubscription = {
  id: string; partnerId: string; organizationId: string; url: string;
  eventTypes: string[]; apiVersion: string; active: boolean; secretRef: string;
};

const MAX_PAGE_SIZE = 100;
const buckets = new Map<string, { count: number; resetAt: number }>();
const idempotency = new Map<string, { requestHash: string; response: unknown }>();
const subscriptions = new Map<string, WebhookSubscription>();

export function authorizePartner(credential: PartnerCredential, scope: PartnerScope, now = new Date()): void {
  if (!credential.active) throw new Error("Partner credential inactive.");
  if (credential.expiresAt && credential.expiresAt <= now) throw new Error("Partner credential expired.");
  if (!credential.scopes.includes(scope)) throw new Error(`Partner scope required: ${scope}`);
}

export function paginate<T>(items: T[], opts: { cursor?: string; limit?: number; key?: (item: T) => string } = {}): Page<T> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), MAX_PAGE_SIZE);
  const key = opts.key ?? ((item) => String(item));
  const start = opts.cursor ? Math.max(items.findIndex((item) => key(item) === opts.cursor) + 1, 0) : 0;
  const data = items.slice(start, start + limit);
  const hasMore = start + data.length < items.length;
  return { data, hasMore, ...(hasMore && data.length ? { nextCursor: key(data[data.length - 1]) } : {}) };
}

export function enforceRateLimit(partnerId: string, limitPerMinute = 60, now = Date.now()): { remaining: number; resetAt: number } {
  const current = buckets.get(partnerId);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + 60_000 }; buckets.set(partnerId, next);
    return { remaining: Math.max(limitPerMinute - 1, 0), resetAt: next.resetAt };
  }
  if (current.count >= limitPerMinute) throw new Error("Partner rate limit exceeded.");
  current.count += 1;
  return { remaining: Math.max(limitPerMinute - current.count, 0), resetAt: current.resetAt };
}

export function idempotent<T>(partnerId: string, key: string, requestHash: string, execute: () => T): T {
  if (!key || key.length > 200) throw new Error("Valid Idempotency-Key header required.");
  const mapKey = `${partnerId}:${key}`;
  const prior = idempotency.get(mapKey);
  if (prior) {
    if (prior.requestHash !== requestHash) throw new Error("Idempotency key reused with a different request.");
    return prior.response as T;
  }
  const response = execute(); idempotency.set(mapKey, { requestHash, response }); return response;
}

export function registerWebhook(subscription: WebhookSubscription): WebhookSubscription {
  if (!/^https:\/\//i.test(subscription.url)) throw new Error("Webhook URL must use HTTPS.");
  if (!subscription.apiVersion || !subscription.secretRef) throw new Error("Webhook version and secret are required.");
  subscriptions.set(subscription.id, subscription); return subscription;
}

export function listWebhooks(organizationId: string, partnerId: string): WebhookSubscription[] {
  return [...subscriptions.values()].filter((s) => s.organizationId === organizationId && s.partnerId === partnerId && s.active);
}

export function deprecateApiVersion(version: string, sunsetAt: Date): { version: string; sunsetAt: string; replacement: string } {
  if (!/^v\d+$/.test(version)) throw new Error("Invalid API version.");
  return { version, sunsetAt: sunsetAt.toISOString(), replacement: `v${Number(version.slice(1)) + 1}` };
}
