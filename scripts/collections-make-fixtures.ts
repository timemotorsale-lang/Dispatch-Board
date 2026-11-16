/**
 * Generates the FAKE DealerCenter "Active Accounts" fixtures used by tests (spec section 18).
 * Every name, number and vehicle here is made up. Column names keep DealerCenter's leading spaces.
 *
 *   npx tsx scripts/collections-make-fixtures.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import ExcelJS from "exceljs";

export const FIXTURE_HEADERS = [
  " AccountId", " DealDate", " DealNumber", " BuyerName", " VehicleYearMakeModel", " VehicleStockNumber", " RepoStatus",
  " AccountStatus", " InsuranceStatus", " AutopayStatus", " CollectorName", " LenderType", " LenderName",
  " BalanceDownAmount", " BalancePrincipalAmount", " BalanceInterestAmount", " BalanceOtherAmount", " BalanceLateAmount",
  " BalanceSideNoteAmount", " BalanceCreditAmount", " TotalBalanceAmount", " PaymentDueDate", " PromiseDate", " DaysPastDue",
  " PaymentAmount", " TotalPaymentDueAmount", " RemainingPayment", " SomeFutureColumn"
];

const FIRST = ["Alex", "Bailey", "Casey", "Devon", "Emery", "Finley", "Harper", "Jordan", "Kai", "Logan", "Morgan", "Quinn", "Riley", "Rowan", "Sage"];
const LAST = ["Testerson", "Sample", "Fixture", "Example", "Demo"];
const CARS = ["2012 Fakeco Sedan", "2014 Mockmotors Hatch", "2015 Placeholder SUV", "2011 Sample Truck", "2016 Demo Wagon"];
// daysPastDue values that cover every bucket: current, grace, 6-14, 15-30, 31-60, 61+.
const DPD = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 7, 10, 14, 16, 22, 30, 31, 45, 60, 61, 75, 90, 120, 0, 0, 5, 18, 65];

function money(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fixtureRows(): string[][] {
  return DPD.map((dpd, i) => {
    const n = i + 1;
    // Two pairs of duplicate buyer names on purpose (rows 4/19 and 7/22).
    const name = `${LAST[i % LAST.length]}, ${FIRST[i % FIRST.length]}`;
    const payment = 15000 + (i % 4) * 2500;
    const principal = 400000 + i * 13_337;
    const late = dpd > 5 ? 1000 : 0;
    const total = principal + late;
    const due = dpd > 0 ? Math.max(1, Math.ceil(dpd / 14)) * payment + late : payment;
    const dueDate = new Date(Date.UTC(2026, 10, 15) - dpd * 86_400_000);
    const ymd = `${dueDate.getUTCMonth() + 1}/${dueDate.getUTCDate()}/${dueDate.getUTCFullYear()}`;
    return [
      `FAKE-${String(1000 + n)}`,
      `${(i % 12) + 1}/15/2025`,
      `D-${String(5000 + n)}`,
      name,
      CARS[i % CARS.length],
      `TST${String(100 + n)}`,
      n === 24 ? "REPOSSESSED" : "",
      "ACTIVE",
      n % 9 === 0 ? "EXPIRED" : n % 7 === 0 ? "" : "VERIFIED",
      n % 5 === 0 ? "ON" : "OFF",
      "",
      "BHPH",
      "Time Motor Sales",
      "$0.00",
      money(principal),
      "$0.00",
      "$0.00",
      money(late),
      "$0.00",
      "$0.00",
      money(total),
      ymd,
      n === 16 ? "11/10/2026" : "",
      String(dpd),
      money(payment),
      money(due),
      String(40 - (i % 30)),
      "ignored"
    ];
  });
}

function csvEscape(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

async function main() {
  const dir = join(process.cwd(), "src", "features", "collections", "tests", "fixtures");
  mkdirSync(dir, { recursive: true });
  const rows = fixtureRows();
  writeFileSync(join(dir, "active-accounts.sample.csv"), [FIXTURE_HEADERS, ...rows].map(row => row.map(csvEscape).join(",")).join("\n") + "\n");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Active Accounts");
  sheet.addRow(FIXTURE_HEADERS);
  for (const row of rows) sheet.addRow(row);
  // Fixed dates so the file is byte-for-byte stable.
  workbook.created = new Date(Date.UTC(2026, 10, 15));
  workbook.modified = new Date(Date.UTC(2026, 10, 15));
  await workbook.xlsx.writeFile(join(dir, "active-accounts.sample.xlsx"));
  console.log(`Wrote ${rows.length} fake accounts to ${dir}`);
}

if (process.argv[1]?.includes("collections-make-fixtures")) void main();
