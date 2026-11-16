/**
 * TEST (fake) implementations of every integration. Deterministic, no network, no real
 * vendor. Used in TEST mode and by the automated tests. Special test inputs trigger the
 * unhappy paths so the screens can be tried end to end:
 *   - payments: an amount ending in 13 cents is declined;
 *   - bankruptcy: a name containing "BKTEST" is reported as a match;
 *   - reassigned numbers: a number ending in 0000 is reported as reassigned;
 *   - insurance: a policy number containing "LAPSED" is lapsed, "NONE" is not found;
 *   - mail: an address containing "UNDELIVERABLE" fails verification.
 */
import { createHash } from "node:crypto";

import type { AdapterMap } from "./types";

const id = (prefix: string, ...parts: unknown[]) => `${prefix}_test_${createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 12)}`;
const now = () => new Date().toISOString();

export function createFakeAdapters(): AdapterMap {
  let portfolio: Array<{ accountId: string; name: string }> = [];
  return {
    PAYMENTS: {
      chargeCard: async (_ctx, i) => ({ id: id("ch", i), status: i.amountCents % 100 === 13 ? "DECLINED" : "SUCCEEDED", message: i.amountCents % 100 === 13 ? "Test card declined" : "Test charge (no money moved)" }),
      achDebit: async (_ctx, i) => ({ id: id("ach", i), status: "PENDING", message: "Test ACH debit (no money moved)" }),
      textToPayLink: async (_ctx, i) => ({ url: `https://pay.example.test/${id("link", i)}`, expiresAt: new Date(Date.now() + 3 * 86_400_000).toISOString() }),
      refund: async (_ctx, i) => ({ id: id("rf", i), status: "SUCCEEDED", message: "Test refund (no money moved)" })
    },
    BANKRUPTCY: {
      submitPortfolio: async (_ctx, i) => { portfolio = i.accounts.map(a => ({ accountId: a.accountId, name: a.name })); return { submitted: portfolio.length }; },
      dailyMatches: async () => portfolio.filter(a => a.name.toUpperCase().includes("BKTEST")).map(a => ({ accountId: a.accountId, caseNumber: id("bk", a.accountId), chapter: "7", filedOn: now().slice(0, 10), court: "D. Minn. (test)" }))
    },
    REASSIGNED_NUMBERS: {
      check: async (_ctx, i) => ({ reassigned: i.phoneE164.endsWith("0000"), checkedAt: now() })
    },
    INSURANCE: {
      verify: async (_ctx, i) => i.policyNumber.toUpperCase().includes("NONE") ? { status: "NOT_FOUND", expirationDate: null, lienholderListed: null }
        : i.policyNumber.toUpperCase().includes("LAPSED") ? { status: "LAPSED", expirationDate: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10), lienholderListed: true }
          : { status: "ACTIVE", expirationDate: new Date(Date.now() + 180 * 86_400_000).toISOString().slice(0, 10), lienholderListed: true }
    },
    GPS: {
      locate: async () => ({ latitude: 44.9483, longitude: -93.2566, at: now() }),
      disable: async (_ctx, i) => ({ done: true, reference: id("gps", "disable", i) }),
      enable: async (_ctx, i) => ({ done: true, reference: id("gps", "enable", i) }),
      status: async () => ({ starter: "UNKNOWN", tamper: false })
    },
    MAIL: {
      verifyAddress: async (_ctx, i) => ({ deliverable: !i.address.toUpperCase().includes("UNDELIVERABLE"), normalized: i.address.trim().toUpperCase() }),
      sendCertified: async (_ctx, i) => ({ trackingNumber: `9400TEST${createHash("sha256").update(i.letterId).digest("hex").replace(/\D/g, "").slice(0, 14).padEnd(14, "0")}` })
    },
    REPO_NETWORK: {
      sendAssignment: async (_ctx, i) => ({ assignmentId: id("rdn", i) }),
      statusUpdates: async () => [{ status: "ASSIGNED", at: now(), note: "Test assignment received" }]
    },
    PHONE: { clickToCall: async (_ctx, i) => ({ callId: id("call", i, Date.now()) }) },
    ESIGN: { sendForSignature: async (_ctx, i) => ({ envelopeId: id("env", i) }) },
    SKIP_TRACE: { search: async () => ({ phones: ["+16125550199"], addresses: ["1 Test Street, Minneapolis, MN 55401"] }) },
    DMS: { fetchActiveAccounts: async () => ({ rows: [], asOfDate: now().slice(0, 10) }) }
  };
}
