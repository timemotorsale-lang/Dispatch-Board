import { describe, expect, it } from "vitest";

import { classifyInbound } from "@/features/collections/domain/messaging";
import { applyPlaybook, parsePlaybookRules, playbookByStage, standardPlaybook, validatePlaybook } from "@/features/collections/domain/playbook";
import { computeRiskScore, nextBestAction, type NextActionInput, type RiskInput } from "@/features/collections/domain/risk";
import { DEFAULT_COLLECTIONS_SETTINGS } from "@/features/collections/domain/settings";
import { wantedAccountTasks, type AccountTaskFacts } from "@/features/collections/domain/tasks";
import { adjustmentNeedsApproval, adjustmentShowsInImport, checkExtensionEligibility, deficiencyCents, skipSignals } from "@/features/collections/domain/upgrades";
import { rollRates } from "@/features/collections/server/dashboard-service";

const S = DEFAULT_COLLECTIONS_SETTINGS;
const standard = standardPlaybook(S);

describe("playbooks (22.1)", () => {
  it("the Standard playbook reproduces today's rules exactly", () => {
    const applied = applyPlaybook(S, standard);
    expect(applied.thresholds).toEqual(S.thresholds);
    expect(applied.messageRules).toEqual(S.messageRules);
    expect(validatePlaybook(standard)).toEqual([]);
  });
  it("never lets the disable warning become automatic", () => {
    const rules = parsePlaybookRules({ messages: { DISABLE_WARNING: { enabled: true, dayOffset: 1 } } }, standard);
    expect(applyPlaybook(S, rules).messageRules.DISABLE_WARNING.enabled).toBe(false);
  });
  it("rejects review days that don't go up, and texts on the wrong side of the date", () => {
    const bad = structuredClone(standard);
    bad.tasks.TWO_WEEK_FOLLOW_UP.atDays = 5;
    bad.messages.DUE_SOON.dayOffset = 3;
    expect(validatePlaybook(bad).join(" ")).toMatch(/must go up.*due-soon/s);
  });
  it("switching a task off falls back to the next lower review", () => {
    const off = structuredClone(standard);
    off.tasks.REPO_REVIEW.enabled = false;
    const settings = applyPlaybook(S, off);
    const facts: AccountTaskFacts = { daysPastDue: 75, inactive: false, activeFlags: [], bankruptcyFlaggedAt: null, lastBrokenAt: null, arrangementAfterBroken: false, lastNotFoundAt: null, starter: null, lastArrangementAt: null, repo: null, insurance: null, belowThresholdSince: { disable: null, twoWeek: null, thirtyDay: null, repo: null } };
    expect(wantedAccountTasks(facts, settings).map(w => w.reason)).toEqual(["THIRTY_DAY_REVIEW"]);
    const later = structuredClone(standard); later.tasks.DISABLE_REVIEW.atDays = 10;
    expect(wantedAccountTasks({ ...facts, daysPastDue: 8 }, applyPlaybook(S, later))).toEqual([]);
  });
  it("lays the steps out by stage", () => {
    const stages = playbookByStage(standard, 5);
    expect(stages.find(s => s.bucket === "CURRENT")!.steps.map(s => s.key)).toContain("DUE_SOON");
    expect(stages.find(s => s.bucket === "LATE_6_14")!.steps.map(s => s.key)).toEqual(["PAST_DUE_LATE_FEE", "DISABLE_REVIEW", "TWO_WEEK_FOLLOW_UP"]);
    expect(stages.find(s => s.bucket === "D31_60")!.steps.map(s => s.key)).toEqual(["REPO_REVIEW"]); // day 60 is in the 31–60 stage
  });
});

describe("risk score and Do this next (22.2)", () => {
  const base: RiskInput = { daysPastDue: 0, daysPastDue30DaysAgo: 0, paymentsSeen90: 3, paymentsExpected90: 3, brokenPromises90: 0, contactAttempts90: 0, rightPartyContacts90: 0, insuranceStatus: "VERIFIED", possibleSkip: false, accountAgeMonths: 24 };
  it("is 0 for a healthy account and explains every point", () => {
    expect(computeRiskScore(base, S.riskWeights)).toEqual({ score: 0, factors: [] });
    const risky = computeRiskScore({ ...base, daysPastDue: 45, daysPastDue30DaysAgo: 15, paymentsSeen90: 0, brokenPromises90: 2, contactAttempts90: 4, rightPartyContacts90: 1, insuranceStatus: "EXPIRED", possibleSkip: true }, S.riskWeights);
    expect(risky.score).toBeGreaterThan(70);
    expect(risky.score).toBeLessThanOrEqual(100);
    expect(risky.factors.map(f => f.key)).toEqual(expect.arrayContaining(["daysPastDue", "dpdTrend", "missedPayments", "brokenPromises", "lowContactSuccess", "insurance", "possibleSkip"]));
    expect(risky.factors.every(f => f.detail.length > 0)).toBe(true);
  });
  it("uses the weights from settings", () => {
    const heavy = { ...S.riskWeights, daysPastDue: 100 };
    expect(computeRiskScore({ ...base, daysPastDue: 90 }, heavy).score).toBe(100);
  });
  const facts: NextActionInput = { frozen: false, unreadTexts: 0, brokenPromiseDaysAgo: null, answeredOfLast: { answered: 0, tries: 0 }, reportedPaymentNotFound: false, promiseDueToday: false, starterDisabled: false, arrangementSinceDisable: false, disableEligible: false, openPromise: false, insuranceProblem: false, possibleSkip: false, daysPastDue: 0, daysSinceContact: null, repoInProgress: false };
  it("recommends one action with its reason, in a fixed order", () => {
    expect(nextBestAction({ ...facts, brokenPromiseDaysAgo: 1, answeredOfLast: { answered: 3, tries: 4 }, daysPastDue: 9 })).toEqual({ action: "Call today", reason: "Promise broken yesterday, answered 3 of last 4 calls", urgency: "TODAY" });
    expect(nextBestAction({ ...facts, unreadTexts: 1, brokenPromiseDaysAgo: 1 }).action).toBe("Reply to the customer's text");
    expect(nextBestAction({ ...facts, frozen: true, unreadTexts: 2 }).urgency).toBe("NONE");
    expect(nextBestAction({ ...facts, starterDisabled: true, arrangementSinceDisable: true }).action).toBe("Re-enable the starter");
    expect(nextBestAction(facts).action).toBe("Nothing needed today");
  });
});

describe("extensions, skip, charge-off, fees (22.3–22.8)", () => {
  it("checks extension eligibility and explains why not", () => {
    const rules = S.extensionRules;
    expect(checkExtensionEligibility({ contractDate: "2025-01-01", today: "2026-11-16", approvedInLast12Months: 0, openPromise: false }, rules)).toEqual({ eligible: true, notes: [] });
    const no = checkExtensionEligibility({ contractDate: "2026-09-01", today: "2026-11-16", approvedInLast12Months: 2, openPromise: true }, rules);
    expect(no.eligible).toBe(false);
    expect(no.notes).toHaveLength(3);
  });
  it("raises possible-skip reasons", () => {
    expect(skipSignals({ daysPastDue: 20, today: "2026-11-16", lastRightPartyContact: "2026-10-20", firstPastDueDate: "2026-10-27", latestOutcome: "DISCONNECTED", recentSignalSteps: ["MAIL_RETURNED"] }, 14)).toEqual([
      "No conversation with the customer in 27 days while past due", "Phone disconnected", "Mail came back undeliverable"
    ]);
    expect(skipSignals({ daysPastDue: 0, today: "2026-11-16", lastRightPartyContact: null, firstPastDueDate: null, latestOutcome: null, recentSignalSteps: [] }, 14)).toEqual([]);
  });
  it("computes deficiency or surplus", () => {
    expect(deficiencyCents({ balanceAtRepoCents: 500000, salePriceCents: 400000, costsCents: [35000, 10000] })).toBe(145000);
    expect(deficiencyCents({ balanceAtRepoCents: 100000, salePriceCents: 300000, costsCents: [] })).toBe(-200000);
  });
  it("matches fees and credits against later imports", () => {
    const before = { otherCents: 0, lateCents: 2000, creditCents: 0, totalBalanceCents: 100000 };
    expect(adjustmentShowsInImport("REPO_FEE", 35000, before, { ...before, otherCents: 35000, totalBalanceCents: 135000 })).toBe(true);
    expect(adjustmentShowsInImport("REPO_FEE", 35000, before, before)).toBe(false);
    expect(adjustmentShowsInImport("LATE_FEE_WAIVER", 1000, before, { ...before, lateCents: 1000 })).toBe(true);
    expect(adjustmentShowsInImport("GOODWILL_CREDIT", 5000, before, { ...before, creditCents: 5000 })).toBe(true);
    expect(adjustmentNeedsApproval(100, 0)).toBe(true);
    expect(adjustmentNeedsApproval(2000, 2500)).toBe(false);
  });
  it("computes roll rates", () => {
    const r = rollRates([{ then: "GRACE_1_5", now: "D15_30" }, { then: "GRACE_1_5", now: "CURRENT" }, { then: "GRACE_1_5", now: "GRACE_1_5" }]);
    expect(r.find(x => x.bucket === "GRACE_1_5")).toMatchObject({ accounts: 3, rolledWorsePercent: 33.3, improvedPercent: 33.3 });
  });
});

describe("YES and PAID replies (22.7)", () => {
  it("recognizes them in all four languages, and YES no longer means START", () => {
    for (const w of ["YES", "yes", "Si", "Haa", "Ndiyo", "confirm"]) expect(classifyInbound(w)).toBe("YES");
    for (const w of ["PAID", "paid", "Pagado", "Nimelipa"]) expect(classifyInbound(w)).toBe("PAID");
    expect(classifyInbound("START")).toBe("START");
    expect(classifyInbound("Yes I will pay friday")).toBeNull();
  });
});
