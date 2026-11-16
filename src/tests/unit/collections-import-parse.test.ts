import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { dateFromFileName, parseBusinessDate, parseMoneyToCents, parseWholeNumber } from "@/features/collections/domain/money-dates";
import { bucketFor, deriveAccountStatus } from "@/features/collections/domain/status";
import { parseTable, readTable } from "@/features/collections/import/parse";
import { buildPreview, nameKey, toImportRecord, type ExistingAccount } from "@/features/collections/import/preview";
import { DEALERCENTER_ACTIVE_ACCOUNTS } from "@/features/collections/import/profiles";

const FIXTURES = join(process.cwd(), "src", "features", "collections", "tests", "fixtures");
const bytes = (name: string) => new Uint8Array(readFileSync(join(FIXTURES, name)));

describe("money and dates", () => {
  it("converts dollars to integer cents", () => {
    expect(parseMoneyToCents("$1,234.56")).toBe(123456);
    expect(parseMoneyToCents("(12.00)")).toBe(-1200);
    expect(parseMoneyToCents("-5")).toBe(-500);
    expect(parseMoneyToCents("0.07")).toBe(7);
    expect(parseMoneyToCents(19.99)).toBe(1999);
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents("abc")).toBeUndefined();
  });

  it("reads DealerCenter dates", () => {
    expect(parseBusinessDate("11/5/2026")).toBe("2026-11-05");
    expect(parseBusinessDate("1/2/26")).toBe("2026-01-02");
    expect(parseBusinessDate("2026-11-15")).toBe("2026-11-15");
    expect(parseBusinessDate(new Date(Date.UTC(2026, 0, 31)))).toBe("2026-01-31");
    expect(parseBusinessDate(46341)).toBe("2026-11-15");
    expect(parseBusinessDate("2/30/2026")).toBeUndefined();
    expect(parseBusinessDate("")).toBeNull();
  });

  it("reads whole numbers and file-name dates", () => {
    expect(parseWholeNumber("1,200")).toBe(1200);
    expect(parseWholeNumber("3.5")).toBeUndefined();
    expect(dateFromFileName("Active Accounts 11-15-2026.xlsx")).toBe("2026-11-15");
    expect(dateFromFileName("accounts_2026-11-14.csv")).toBe("2026-11-14");
    expect(dateFromFileName("accounts.csv")).toBeNull();
  });
});

describe("buckets and status precedence", () => {
  it("puts days past due into the right bucket", () => {
    expect([0, 1, 5, 6, 14, 15, 30, 31, 60, 61].map(d => bucketFor(d, 5))).toEqual([
      "CURRENT", "GRACE_1_5", "GRACE_1_5", "LATE_6_14", "LATE_6_14", "D15_30", "D15_30", "D31_60", "D31_60", "D61_PLUS"
    ]);
    expect(bucketFor(6, 7)).toBe("GRACE_1_5");
  });

  const base = { daysPastDue: 0, graceDays: 5, disableThreshold: 7, repoThreshold: 60, bankruptcyActive: false, starterDisabled: false, hasActivePlan: false, hasOpenPromise: false };
  it("applies the precedence order", () => {
    expect(deriveAccountStatus({ ...base, daysPastDue: 90, bankruptcyActive: true })).toBe("BANKRUPTCY_FROZEN");
    expect(deriveAccountStatus({ ...base, daysPastDue: 0, dmsRepoStatus: "REPOSSESSED" })).toBe("REPOSSESSED");
    expect(deriveAccountStatus({ ...base, daysPastDue: 70, repoCaseStatus: "ASSIGNED" })).toBe("REPO_ASSIGNED");
    expect(deriveAccountStatus({ ...base, daysPastDue: 61 })).toBe("REPO_REVIEW");
    expect(deriveAccountStatus({ ...base, daysPastDue: 61, repoReviewHold: true })).toBe("DISABLE_ELIGIBLE");
    expect(deriveAccountStatus({ ...base, daysPastDue: 20, starterDisabled: true })).toBe("STARTER_DISABLED");
    expect(deriveAccountStatus({ ...base, daysPastDue: 8, hasActivePlan: true })).toBe("DISABLE_ELIGIBLE");
    expect(deriveAccountStatus({ ...base, daysPastDue: 6, hasActivePlan: true })).toBe("PLAN_ACTIVE");
    expect(deriveAccountStatus({ ...base, daysPastDue: 6, hasOpenPromise: true })).toBe("PROMISE_ACTIVE");
    expect(deriveAccountStatus({ ...base, daysPastDue: 6 })).toBe("PAST_DUE");
    expect(deriveAccountStatus({ ...base, daysPastDue: 3 })).toBe("GRACE");
    expect(deriveAccountStatus(base)).toBe("CURRENT");
    expect(deriveAccountStatus({ ...base, daysPastDue: 90, closedStatus: "PAID_OFF" })).toBe("PAID_OFF");
    expect(deriveAccountStatus({ ...base, daysPastDue: 3, repoCaseStatus: "REDEEMED" })).toBe("GRACE");
  });
});

describe("DealerCenter file parsing", () => {
  it("reads the CSV and XLSX fixtures the same way, with leading-space headers", async () => {
    const csv = parseTable(await readTable(bytes("active-accounts.sample.csv"), "a.csv"), DEALERCENTER_ACTIVE_ACCOUNTS);
    const xlsx = parseTable(await readTable(bytes("active-accounts.sample.xlsx"), "a.xlsx"), DEALERCENTER_ACTIVE_ACCOUNTS);
    expect(csv.errors).toEqual([]);
    expect(csv.rows).toHaveLength(30);
    expect(xlsx.rows.map(r => r.values)).toEqual(csv.rows.map(r => r.values));
    expect(csv.unknownColumns).toEqual(["SomeFutureColumn"]);
    expect(csv.rows[0].values.externalAccountId).toBe("FAKE-1001");
    expect(csv.rows[0].values.totalBalanceCents).toBe(400000);
  });

  it("covers every bucket, a repossessed row and a promise date", async () => {
    const parsed = parseTable(await readTable(bytes("active-accounts.sample.csv"), "a.csv"), DEALERCENTER_ACTIVE_ACCOUNTS);
    const records = parsed.rows.map(r => toImportRecord(r, 5));
    expect(new Set(records.map(r => r.bucket)).size).toBe(6);
    expect(records.some(r => r.dmsRepoStatus === "REPOSSESSED")).toBe(true);
    expect(records.some(r => r.promiseDate === "2026-11-10")).toBe(true);
    expect(new Set(records.map(r => nameKey(r.buyerName))).size).toBeLessThan(records.length);
  });

  it("matches column names case-insensitively and ignores order", () => {
    const table = { headers: ["  daysPASTdue", " accountid", "TotalBalanceAmount ", "BuyerName", "TotalPaymentDueAmount"], rows: [["4", "A1", "$10.00", "Doe, Pat", "$5"]] };
    const parsed = parseTable(table, DEALERCENTER_ACTIVE_ACCOUNTS);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0].values).toMatchObject({ externalAccountId: "A1", daysPastDue: 4, totalBalanceCents: 1000, amountDueCents: 500 });
  });

  it("reports missing required columns", () => {
    const parsed = parseTable({ headers: [" AccountId", " BuyerName"], rows: [["A1", "X"]] }, DEALERCENTER_ACTIVE_ACCOUNTS);
    expect(parsed.rows).toEqual([]);
    expect(parsed.missingColumns).toEqual(expect.arrayContaining(["TotalBalanceAmount", "DaysPastDue", "TotalPaymentDueAmount"]));
    expect(parsed.errors[0].message).toMatch(/missing required column/);
  });

  it("rejects duplicate AccountIds and bad values, row by row", () => {
    const headers = [" AccountId", " BuyerName", " TotalBalanceAmount", " DaysPastDue", " TotalPaymentDueAmount", " PaymentDueDate"];
    const parsed = parseTable({ headers, rows: [
      ["A1", "One", "$1.00", "0", "$1", "11/1/2026"],
      ["A1", "Dup", "$1.00", "0", "$1", "11/1/2026"],
      ["A2", "Bad money", "lots", "0", "$1", "11/1/2026"],
      ["A3", "Bad date", "$1.00", "0", "$1", "13/45/2026"],
      ["", "", "", "", "", ""]
    ] }, DEALERCENTER_ACTIVE_ACCOUNTS);
    expect(parsed.rows.map(r => r.values.externalAccountId)).toEqual(["A1"]);
    expect(parsed.errors.map(e => e.rowNumber)).toEqual([3, 4, 5]);
    expect(parsed.errors[0].message).toMatch(/also appears on row 2/);
  });

  it("refuses other file types", async () => {
    await expect(readTable(new Uint8Array([1, 2]), "accounts.pdf")).rejects.toThrow(/xlsx or .csv/);
  });
});

describe("import preview", () => {
  const record = (id: string, dpd: number, balance = 1000) => toImportRecord({ rowNumber: 2, values: { externalAccountId: id, buyerName: "Doe, Pat", totalBalanceCents: balance, amountDueCents: 100, daysPastDue: dpd } }, 5);

  it("labels new, updated, unchanged, needs review and missing accounts", () => {
    const existing: ExistingAccount[] = [
      { id: "acc-1", externalAccountId: "A1", customerId: "c1", vehicleId: "v1", closed: false, latest: { totalBalanceCents: 1000, amountDueCents: 100, daysPastDue: 0, paymentDueDate: null, dmsRepoStatus: null, dmsAccountStatus: null, lateCents: 0, paymentsRemaining: null, promiseDate: null } },
      { id: "acc-2", externalAccountId: "A2", customerId: "c2", vehicleId: "v2", closed: false, latest: { totalBalanceCents: 1000, amountDueCents: 100, daysPastDue: 0, paymentDueDate: null, dmsRepoStatus: null, dmsAccountStatus: null, lateCents: 0, paymentsRemaining: null, promiseDate: null } },
      { id: "acc-9", externalAccountId: "GONE", customerId: null, vehicleId: null, closed: false, latest: null },
      { id: "acc-8", externalAccountId: "CLOSED", customerId: null, vehicleId: null, closed: true, latest: null }
    ];
    const { rows, summary, missing } = buildPreview({
      records: [record("A1", 0), record("A2", 10), record("NEW1", 3)],
      existing,
      matches: new Map([["NEW1", { vehicleId: "v9", suggestedCustomerId: "c9", suggestionSource: "VEHICLE" as const }]]),
      errorCount: 1
    });
    expect(rows.map(r => r.change)).toEqual(["UNCHANGED", "UPDATED", "NEW"]);
    expect(rows[1].changedFields).toEqual(["daysPastDue"]);
    // A suggested customer is still "needs review": we never link without the owner.
    expect(rows[2].needsReview).toBe(true);
    expect(missing.map(m => m.externalAccountId)).toEqual(["GONE"]);
    expect(summary).toMatchObject({ totalRows: 3, created: 1, updated: 1, unchanged: 1, needsReview: 1, errors: 1, missing: 1, totalBalanceCents: 3000 });
    expect(summary.bucketCounts).toMatchObject({ CURRENT: 1, GRACE_1_5: 1, LATE_6_14: 1 });
  });

  it("matches names regardless of order and case", () => {
    expect(nameKey("Doe, Pat")).toBe(nameKey("pat DOE"));
  });
});
