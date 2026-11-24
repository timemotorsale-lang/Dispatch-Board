/**
 * Integration registry (spec section 24): the catalog, each integration's OFF | TEST | LIVE
 * switch, safety checks on every call, and call logging (stored in the append-only
 * CollectionAccountEvent log as INTEGRATION_CALL; inputs are never logged, only the
 * operation, mode, outcome and timing).
 *
 * Release 1: LIVE is capped to TEST, so only the fake adapters run. Nothing contacts a vendor.
 */
import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { resolveIntegrationMode, type IntegrationMode } from "../../config/flags";
import { CollectionsError } from "../../config/permissions";
import { collectionsAccess } from "../access";
import { createFakeAdapters } from "./fakes";
import type { AdapterMap, CallContext, IntegrationKey } from "./types";

type Db = Prisma.TransactionClient;

export type IntegrationInfo = { key: IntegrationKey; name: string; envVar: string; purpose: string; release: string; fallback: string };

export const INTEGRATIONS: IntegrationInfo[] = [
  { key: "PAYMENTS", name: "Payment processing (+ PayNearMe cash)", envVar: "COLLECTIONS_INTEGRATION_PAYMENTS", purpose: "Card and ACH payments, autopay, text-to-pay links, refunds.", release: "Release 2 test, Release 3 live", fallback: "Take payments in DealerCenter as today, then record them there." },
  { key: "BANKRUPTCY", name: "Bankruptcy alerts (Epiq AACER)", envVar: "COLLECTIONS_INTEGRATION_BANKRUPTCY", purpose: "Daily matches against court filings. A match is only a proposal; a person sets the flag.", release: "Release 2", fallback: "When a customer or attorney reports a filing, set the Bankruptcy flag on the account." },
  { key: "REASSIGNED_NUMBERS", name: "FCC Reassigned Numbers Database", envVar: "COLLECTIONS_INTEGRATION_REASSIGNED_NUMBERS", purpose: "Monthly check that a mobile number still belongs to the customer.", release: "Release 2", fallback: "Confirm the number on your next call; record a wrong number in the contact log." },
  { key: "INSURANCE", name: "Insurance verification (Axle)", envVar: "COLLECTIONS_INTEGRATION_INSURANCE", purpose: "Verify policies and get lapse alerts.", release: "Release 2", fallback: "Ask for a card photo and verify it on the account's Insurance panel." },
  { key: "GPS", name: "Advantage GPS API", envVar: "COLLECTIONS_INTEGRATION_GPS", purpose: "Locate, status, and starter disable/enable after the owner approves.", release: "Release 2 (when Advantage grants API access)", fallback: "Use the Advantage portal, then press \"Done in portal\" on the account." },
  { key: "MAIL", name: "Certified mail and address check (Lob)", envVar: "COLLECTIONS_INTEGRATION_MAIL", purpose: "Mail letters by certified mail and track them.", release: "Release 4", fallback: "Print the letter, mail it at the post office, and record the tracking number." },
  { key: "REPO_NETWORK", name: "Repossession network (RDN)", envVar: "COLLECTIONS_INTEGRATION_REPO_NETWORK", purpose: "Send repo assignments and receive status updates.", release: "Release 4 (if TLC uses RDN)", fallback: "Call or email TLC Recovery, then update the repo case by hand." },
  { key: "PHONE", name: "Business phone (click-to-call)", envVar: "COLLECTIONS_INTEGRATION_PHONE", purpose: "Click-to-call and call records into the contact log.", release: "Release 4", fallback: "Tap Call (opens your phone), then log the contact." },
  { key: "ESIGN", name: "E-signature", envVar: "COLLECTIONS_INTEGRATION_ESIGN", purpose: "Send plan or extension agreements for signature.", release: "Release 4", fallback: "Sign on paper and upload the signed copy to the account." },
  { key: "SKIP_TRACE", name: "Skip tracing (TLOxp / Accurint)", envVar: "COLLECTIONS_INTEGRATION_SKIP_TRACE", purpose: "Search for new phone numbers and addresses, with a permissible purpose recorded.", release: "Release 4", fallback: "Work the skip-trace checklist on the account." },
  { key: "DMS", name: "DealerCenter API", envVar: "COLLECTIONS_INTEGRATION_DMS", purpose: "Fetch Active Accounts directly instead of uploading the file.", release: "When DealerCenter grants access", fallback: "Export Active Accounts from DealerCenter and upload it on the Import page." }
];

/** Operations that move money, touch the car, or search personal data: a person must be named on every call. */
const NEEDS_PERSON: Partial<Record<IntegrationKey, string[]>> = {
  PAYMENTS: ["chargeCard", "achDebit", "refund"], GPS: ["disable", "enable"], SKIP_TRACE: ["search"], MAIL: ["sendCertified"], REPO_NETWORK: ["sendAssignment"], ESIGN: ["sendForSignature"]
};

export function integrationMode(key: IntegrationKey, env: NodeJS.ProcessEnv = process.env): IntegrationMode {
  return resolveIntegrationMode(INTEGRATIONS.find(i => i.key === key)!.envVar, env);
}

let fakes: AdapterMap | null = null;
const fakeAdapters = () => (fakes ??= createFakeAdapters());

/** Extra rules checked before a call; they throw a plain-English error when not met. */
async function guard(db: Db, key: IntegrationKey, operation: string, ctx: CallContext, input: Record<string, unknown>) {
  if (NEEDS_PERSON[key]?.includes(operation) && !ctx.initiatedByUserId) throw new CollectionsError("This needs a person's decision; automations and AI can't do it.", 403);
  if (key === "PAYMENTS" && NEEDS_PERSON.PAYMENTS!.includes(operation) && !String(input.approvalId ?? "").trim()) throw new CollectionsError("Moving money needs a recorded approval.", 403);
  if (key === "SKIP_TRACE" && String(input.permissiblePurpose ?? "").trim().length === 0) throw new CollectionsError("Record the permissible purpose for this search (for example: collecting on this account).", 400);
  if (key === "GPS" && (operation === "disable" || operation === "enable")) {
    const action = await db.starterDisableAction.findFirst({ where: { id: String(input.approvedActionId ?? ""), organizationId: ctx.organizationId, status: "APPROVED", action: operation === "disable" ? "DISABLE" : "ENABLE" }, select: { accountId: true } });
    if (!action) throw new CollectionsError("A starter disable or enable must be approved by the owner first.", 403);
    if (operation === "disable" && (await db.collectionFlag.findFirst({ where: { accountId: action.accountId, type: "BANKRUPTCY", clearedAt: null }, select: { id: true } }))) throw new CollectionsError("Bankruptcy freeze: no starter disables.", 409);
  }
}

/**
 * The adapter for one integration, with the switch, safety checks and logging wrapped around
 * every method. OFF throws with the manual fallback; TEST (and LIVE, capped) runs the fake.
 */
export function getIntegration<K extends IntegrationKey>(key: K, options: { db?: Db; env?: NodeJS.ProcessEnv } = {}): AdapterMap[K] {
  const db = options.db ?? prisma;
  const info = INTEGRATIONS.find(i => i.key === key)!;
  const target = fakeAdapters()[key] as unknown as Record<string, (ctx: CallContext, input?: unknown) => Promise<unknown>>;
  return new Proxy({}, {
    get(_t, operation: string) {
      return async (ctx: CallContext, input: Record<string, unknown> = {}) => {
        const mode = integrationMode(key, options.env);
        if (mode === "OFF") throw new CollectionsError(`${info.name} is turned off. Do it by hand: ${info.fallback}`, 409);
        const started = Date.now();
        let ok = false, error: string | null = null;
        try {
          await guard(db, key, operation, ctx, input);
          const fn = target[operation];
          if (!fn) throw new CollectionsError(`${info.name} has no "${operation}" operation.`, 400);
          const result = await fn(ctx, input);
          ok = true;
          return result;
        } catch (e) {
          error = e instanceof Error ? e.message.slice(0, 300) : "Unknown error";
          throw e;
        } finally {
          await db.collectionAccountEvent.create({ data: {
            organizationId: ctx.organizationId, accountId: ctx.accountId ?? null, type: "INTEGRATION_CALL", userId: ctx.initiatedByUserId,
            after: { integration: key, operation, mode, ok, ms: Date.now() - started, ...(error ? { error } : {}) }, reason: `${info.name}: ${operation}`
          } }).catch(() => undefined);
        }
      };
    }
  }) as AdapterMap[K];
}

// ---------------- Integrations health page ----------------

const SAMPLE_CALLS: Record<IntegrationKey, { operation: string; input: Record<string, unknown>; label: string }> = {
  PAYMENTS: { operation: "textToPayLink", input: { amountCents: 100, description: "Test link" }, label: "Create a test pay link" },
  BANKRUPTCY: { operation: "dailyMatches", input: {}, label: "Ask for today's matches" },
  REASSIGNED_NUMBERS: { operation: "check", input: { phoneE164: "+16125550123", consentDate: "2026-01-01" }, label: "Check a test number" },
  INSURANCE: { operation: "verify", input: { policyNumber: "TEST-123", carrier: "Test Carrier" }, label: "Verify a test policy" },
  GPS: { operation: "status", input: { deviceSerial: "TEST-DEVICE" }, label: "Read a test device's status" },
  MAIL: { operation: "verifyAddress", input: { address: "1101 E. Lake Street, Minneapolis, MN 55407" }, label: "Check a test address" },
  REPO_NETWORK: { operation: "statusUpdates", input: { assignmentId: "rdn_test" }, label: "Read test status updates" },
  PHONE: { operation: "clickToCall", input: { toE164: "+16125550123" }, label: "Place a test call" },
  ESIGN: { operation: "sendForSignature", input: { documentId: "test", signerName: "Test", signerEmail: "test@example.test" }, label: "Send a test envelope" },
  SKIP_TRACE: { operation: "search", input: { name: "Test Person", lastKnownAddress: null, permissiblePurpose: "Integration health check (test data only)" }, label: "Run a test search" },
  DMS: { operation: "fetchActiveAccounts", input: {}, label: "Fetch test accounts" }
};

export async function getIntegrationsHealth(actor: AuthenticatedUser | null) {
  const access = await collectionsAccess(actor, "EDIT_SETTINGS");
  const since = new Date(Date.now() - 30 * 86_400_000);
  const calls = await prisma.collectionAccountEvent.findMany({ where: { organizationId: access.organizationId, type: "INTEGRATION_CALL", occurredAt: { gte: since } }, orderBy: { occurredAt: "desc" }, take: 2000, select: { after: true, occurredAt: true } });
  return INTEGRATIONS.map(info => {
    const mine = calls.filter(c => (c.after as { integration?: string } | null)?.integration === info.key);
    const lastOk = mine.find(c => (c.after as { ok?: boolean }).ok);
    const lastFail = mine.find(c => !(c.after as { ok?: boolean }).ok);
    return {
      ...info, mode: integrationMode(info.key), requested: (process.env[info.envVar] ?? "OFF").toUpperCase(), sample: SAMPLE_CALLS[info.key].label,
      calls30: mine.length, failures30: mine.filter(c => !(c.after as { ok?: boolean }).ok).length,
      lastSuccessAt: lastOk?.occurredAt.toISOString() ?? null, lastFailureAt: lastFail?.occurredAt.toISOString() ?? null,
      lastError: lastFail ? (lastFail.after as { error?: string }).error ?? null : null,
      recent: mine.slice(0, 5).map(c => ({ at: c.occurredAt.toISOString(), ...(c.after as { operation: string; ok: boolean; ms: number; mode: string; error?: string }) }))
    };
  });
}

/** "Run a test call" on the health page: admin only, TEST mode only, harmless sample data. */
export async function runIntegrationTestCall(actor: AuthenticatedUser | null, key: string) {
  const access = await collectionsAccess(actor, "EDIT_SETTINGS");
  const info = INTEGRATIONS.find(i => i.key === key);
  if (!info) throw new CollectionsError("Unknown integration.", 404);
  if (integrationMode(info.key) !== "TEST") throw new CollectionsError(`${info.name} isn't in TEST mode. Set ${info.envVar}=TEST in the server's .env to try it.`, 409);
  const sample = SAMPLE_CALLS[info.key];
  const adapter = getIntegration(info.key) as unknown as Record<string, (ctx: CallContext, input: unknown) => Promise<unknown>>;
  const result = await adapter[sample.operation]({ organizationId: access.organizationId, initiatedByUserId: access.actor.id }, sample.input);
  return { ok: true as const, message: `${info.name}: test call worked.`, result };
}
