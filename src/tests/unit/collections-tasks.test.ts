import { describe, expect, it } from "vitest";

import { chicagoClock, chicagoDateTime } from "@/features/collections/domain/money-dates";
import { DEFAULT_COLLECTIONS_SETTINGS } from "@/features/collections/domain/settings";
import { effectiveInsuranceStatus, isDailyRunDue, summaryMessage, wantedAccountTasks, type AccountTaskFacts } from "@/features/collections/domain/tasks";

const base: AccountTaskFacts = {
  daysPastDue: 0, inactive: false, activeFlags: [], bankruptcyFlaggedAt: null, lastBrokenAt: null, arrangementAfterBroken: false,
  lastNotFoundAt: null, starter: null, lastArrangementAt: null, repo: null, insurance: null,
  belowThresholdSince: { disable: null, twoWeek: null, thirtyDay: null, repo: null }
};
const reasons = (f: Partial<AccountTaskFacts>) => wantedAccountTasks({ ...base, ...f }, DEFAULT_COLLECTIONS_SETTINGS).map(w => w.reason);
const at = (iso: string) => new Date(iso);

describe("which board tasks an account needs", () => {
  it("needs nothing when current", () => {
    expect(reasons({})).toEqual([]);
  });

  it("creates one days-past-due task: the highest threshold reached", () => {
    expect(reasons({ daysPastDue: 6 })).toEqual([]);
    expect(reasons({ daysPastDue: 7 })).toEqual(["DISABLE_REVIEW"]);
    expect(reasons({ daysPastDue: 14 })).toEqual(["TWO_WEEK_FOLLOW_UP"]);
    expect(reasons({ daysPastDue: 30 })).toEqual(["THIRTY_DAY_REVIEW"]);
    expect(reasons({ daysPastDue: 75 })).toEqual(["REPO_REVIEW"]);
  });

  it("skips the disable review when the starter is already disabled, and asks to re-enable after a payment", () => {
    const starter = { action: "DISABLE" as const, at: at("2026-11-10T15:00:00Z") };
    expect(reasons({ daysPastDue: 9, starter })).toEqual([]);
    expect(reasons({ daysPastDue: 9, starter, lastArrangementAt: at("2026-11-12T15:00:00Z") })).toEqual(["RE_ENABLE_STARTER"]);
    expect(reasons({ daysPastDue: 0, starter })).toEqual(["RE_ENABLE_STARTER"]);
    expect(reasons({ daysPastDue: 9, starter: { action: "ENABLE", at: at("2026-11-12T15:00:00Z") } })).toEqual(["DISABLE_REVIEW"]);
  });

  it("respects the repo hold and an active repo case", () => {
    expect(reasons({ daysPastDue: 70, activeFlags: ["DO_NOT_REPO_REVIEW_HOLD"] })).toEqual(["THIRTY_DAY_REVIEW"]);
    expect(reasons({ daysPastDue: 70, repo: { status: "ASSIGNED", since: at("2026-11-01T00:00:00Z") } })).toEqual(["REPO_TLC"]);
  });

  it("freezes everything except the attorney review for bankruptcy", () => {
    expect(reasons({ daysPastDue: 70, activeFlags: ["BANKRUPTCY"], lastBrokenAt: at("2026-11-01T00:00:00Z") })).toEqual(["BANKRUPTCY_ATTORNEY_REVIEW"]);
  });

  it("pauses all tasks for deceased and closed accounts", () => {
    expect(reasons({ daysPastDue: 70, activeFlags: ["DECEASED"] })).toEqual([]);
    expect(reasons({ daysPastDue: 70, inactive: true })).toEqual([]);
  });

  it("calls about a broken promise until a new arrangement is made", () => {
    const lastBrokenAt = at("2026-11-10T00:00:00Z");
    expect(reasons({ daysPastDue: 3, lastBrokenAt })).toEqual(["BROKEN_PROMISE"]);
    expect(reasons({ daysPastDue: 3, lastBrokenAt, arrangementAfterBroken: true })).toEqual([]);
    expect(reasons({ daysPastDue: 0, lastBrokenAt })).toEqual([]);
  });

  it("checks a reported payment that never showed and insurance problems", () => {
    expect(reasons({ daysPastDue: 3, lastNotFoundAt: at("2026-11-10T00:00:00Z") })).toEqual(["REPORTED_PAYMENT_NOT_FOUND"]);
    expect(reasons({ insurance: { status: "EXPIRED", since: at("2026-10-01T00:00:00Z") } })).toEqual(["INSURANCE_NEEDED"]);
    expect(reasons({ insurance: { status: "EXPIRING_SOON", since: at("2026-10-01T00:00:00Z") } })).toEqual([]);
  });

  it("carries the moment the reason started, so a finished task isn't re-created", () => {
    const since = at("2026-11-05T00:00:00Z");
    expect(wantedAccountTasks({ ...base, daysPastDue: 8, belowThresholdSince: { ...base.belowThresholdSince, disable: since } }, DEFAULT_COLLECTIONS_SETTINGS)[0].since).toEqual(since);
  });
});

describe("insurance status, schedule and summary helpers", () => {
  it("computes the insurance status from the latest record", () => {
    expect(effectiveInsuranceStatus(null, "2026-11-15", 14)).toBe("UNKNOWN");
    expect(effectiveInsuranceStatus({ status: "VERIFIED", expirationDate: "2026-11-14" }, "2026-11-15", 14)).toBe("EXPIRED");
    expect(effectiveInsuranceStatus({ status: "VERIFIED", expirationDate: "2026-11-29" }, "2026-11-15", 14)).toBe("EXPIRING_SOON");
    expect(effectiveInsuranceStatus({ status: "VERIFIED", expirationDate: "2027-01-01" }, "2026-11-15", 14)).toBe("VERIFIED");
    expect(effectiveInsuranceStatus({ status: "MISSING", expirationDate: null }, "2026-11-15", 14)).toBe("MISSING");
  });

  it("runs Monday to Saturday after the set time, in Chicago time", () => {
    expect(isDailyRunDue({ weekday: 1, minutes: 9 * 60 + 15 }, 9 * 60 + 15)).toBe(true);
    expect(isDailyRunDue({ weekday: 6, minutes: 9 * 60 + 14 }, 9 * 60 + 15)).toBe(false);
    expect(isDailyRunDue({ weekday: 0, minutes: 12 * 60 }, 9 * 60 + 15)).toBe(false);
    // 2026-11-16 15:15 UTC is Monday 9:15 am in Chicago (standard time).
    expect(chicagoClock(new Date("2026-11-16T15:15:00Z"))).toEqual({ ymd: "2026-11-16", weekday: 1, minutes: 9 * 60 + 15 });
  });

  it("turns a Chicago date and time into the right instant, in summer and winter", () => {
    expect(chicagoDateTime("2026-11-16", "17:00").toISOString()).toBe("2026-11-16T23:00:00.000Z");
    expect(chicagoDateTime("2026-07-01", "17:00").toISOString()).toBe("2026-07-01T22:00:00.000Z");
    expect(chicagoDateTime("2026-11-16", "00:00").toISOString()).toBe("2026-11-16T06:00:00.000Z");
  });

  it("writes a plain-English summary", () => {
    expect(summaryMessage({ DISABLE_REVIEW: 3, REPO_REVIEW: 1 }, { promisesBroken: 12, promisesKept: 0, reportedNotFound: 0 })).toBe("Collections: 12 broken promises, 3 disable reviews, 1 repo review.");
    expect(summaryMessage({}, { promisesBroken: 0, promisesKept: 0, reportedNotFound: 0 })).toBe("Collections: no new follow-ups today.");
  });
});
