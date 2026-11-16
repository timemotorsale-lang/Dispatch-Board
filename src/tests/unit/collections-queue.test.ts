import { describe, expect, it } from "vitest";

import { buildQueue, compareQueue, inTab, matchesSearch, type QueueFacts } from "@/features/collections/domain/queue";
import { csvCell } from "@/features/collections/server/account-service";

function facts(overrides: Partial<QueueFacts>): QueueFacts {
  return {
    id: "a", buyerName: "Sample, Alex", dealNumber: "D-1", stockNumber: "TST1", vehicleDescription: "2014 Fake", phone: "+16125550101",
    accountType: "LEASE_TO_OWN", status: "PAST_DUE", bucket: "LATE_6_14", daysPastDue: 10, amountDueCents: 10000, assignedCollectorUserId: "owner",
    lastContactAt: null, nextActionAt: null, customerLinked: true, vehicleLinked: true, missingFromImport: false, activeFlags: [],
    brokenPromise: false, promiseDueToday: false, reportedNotFound: false, insuranceProblem: false, unreadInbound: 0, ...overrides
  };
}

describe("collections queue", () => {
  it("sorts broken promises, then payments not found, then days late, then amount due", () => {
    const rows = [
      facts({ id: "dpd90", daysPastDue: 90 }),
      facts({ id: "notFound", reportedNotFound: true, daysPastDue: 2 }),
      facts({ id: "broken", brokenPromise: true, daysPastDue: 1 }),
      facts({ id: "dpd90big", daysPastDue: 90, amountDueCents: 99999 })
    ].sort(compareQueue);
    expect(rows.map(r => r.id)).toEqual(["broken", "notFound", "dpd90big", "dpd90"]);
  });

  it("puts accounts with an unread customer text on top", () => {
    const rows = [facts({ id: "broken", brokenPromise: true }), facts({ id: "texted", unreadInbound: 1, daysPastDue: 0 })].sort(compareQueue);
    expect(rows[0].id).toBe("texted");
  });

  it("keeps frozen accounts out of every tab except Frozen/flagged", () => {
    const frozen = facts({ status: "BANKRUPTCY_FROZEN", activeFlags: ["BANKRUPTCY"], brokenPromise: true });
    expect(inTab(frozen, "PAST_DUE")).toBe(false);
    expect(inTab(frozen, "BROKEN")).toBe(false);
    expect(inTab(frozen, "FLAGGED")).toBe(true);
  });

  it("fills each tab from the right facts", () => {
    expect(inTab(facts({ status: "DISABLE_ELIGIBLE" }), "DISABLE")).toBe(true);
    expect(inTab(facts({ status: "REPO_REVIEW" }), "REPO")).toBe(true);
    expect(inTab(facts({ customerLinked: false }), "NEEDS_REVIEW")).toBe(true);
    expect(inTab(facts({ missingFromImport: true }), "MISSING")).toBe(true);
    expect(inTab(facts({ insuranceProblem: true }), "INSURANCE")).toBe(true);
    expect(inTab(facts({ daysPastDue: 0, status: "CURRENT" }), "PAST_DUE")).toBe(false);
    expect(inTab(facts({ status: "REPOSSESSED" }), "PAST_DUE")).toBe(false);
  });

  it("searches by name, deal, stock and phone digits", () => {
    const row = facts({});
    expect(matchesSearch(row, "alex")).toBe(true);
    expect(matchesSearch(row, "d-1")).toBe(true);
    expect(matchesSearch(row, "tst1")).toBe(true);
    expect(matchesSearch(row, "555-0101")).toBe(true);
    expect(matchesSearch(row, "nobody")).toBe(false);
  });

  it("filters and counts", () => {
    const all = [facts({ id: "1", accountType: "BHPH" }), facts({ id: "2" }), facts({ id: "3", status: "DISABLE_ELIGIBLE" })];
    const result = buildQueue(all, { tab: "PAST_DUE", type: "BHPH" });
    expect(result.rows.map(r => r.id)).toEqual(["1"]);
    expect(result.counts.PAST_DUE).toBe(3);
    expect(result.counts.DISABLE).toBe(1);
  });
});

describe("CSV export safety", () => {
  it("escapes commas and quotes and blocks spreadsheet formulas", () => {
    expect(csvCell("Doe, Pat")).toBe('"Doe, Pat"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(null)).toBe("");
  });
});
