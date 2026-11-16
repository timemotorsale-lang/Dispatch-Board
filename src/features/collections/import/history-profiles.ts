/**
 * Column profiles for the one-time (re-runnable) DealerCenter history import (spec 26).
 *
 * The exact DealerCenter export isn't confirmed yet, so each field lists several likely
 * column names, and the person importing can point any field at a different column
 * (the column map). Nothing about the file format is hard-coded elsewhere.
 */
import type { Frequency, CalcMethod, LedgerTxType } from "../domain/ledger";
import type { ImportProfile } from "./profiles";

export const HISTORY_CONTRACTS: ImportProfile = {
  key: "DEALERCENTER_HISTORY_CONTRACTS",
  label: "DealerCenter contracts (for the servicing ledger)",
  matchFields: ["externalAccountId"],
  fields: [
    { field: "externalAccountId", columns: ["AccountId", "Account Id", "Account Number", "AcctId", "Account"], kind: "text", required: true },
    { field: "contractDate", columns: ["DealDate", "ContractDate", "Contract Date", "SaleDate", "Sale Date"], kind: "date" },
    { field: "firstDueDate", columns: ["FirstPaymentDate", "First Payment Date", "FirstDueDate", "First Due Date"], kind: "date", required: true },
    { field: "paymentAmount", columns: ["PaymentAmount", "Payment Amount", "RegularPayment", "Regular Payment"], kind: "money", required: true },
    { field: "frequency", columns: ["PaymentFrequency", "Payment Frequency", "PaymentSchedule", "Frequency", "PayFrequency"], kind: "text", required: true },
    { field: "numberOfPayments", columns: ["NumberOfPayments", "Number Of Payments", "TermPayments", "Term", "NumPayments"], kind: "int", required: true },
    { field: "totalOfPayments", columns: ["TotalOfPayments", "Total Of Payments", "TotalPayments"], kind: "money" },
    { field: "amountFinanced", columns: ["AmountFinanced", "Amount Financed", "PrincipalAmount", "Principal"], kind: "money" },
    { field: "apr", columns: ["APR", "InterestRate", "Interest Rate", "Rate"], kind: "text" },
    { field: "calcMethod", columns: ["CalculationMethod", "Calculation Method", "LoanType", "InterestType", "Interest Type"], kind: "text" },
    { field: "sideNote", columns: ["SideNoteAmount", "SideNote", "Side Note"], kind: "money" },
    { field: "cashPrice", columns: ["CashPrice", "Cash Price", "SalePrice"], kind: "money" },
    { field: "downPayment", columns: ["DownPayment", "Down Payment", "CashDown"], kind: "money" }
  ]
};

export const HISTORY_PAYMENTS: ImportProfile = {
  key: "DEALERCENTER_HISTORY_PAYMENTS",
  label: "DealerCenter payment history",
  matchFields: ["externalAccountId"],
  allowRepeatedMatch: true,
  fields: [
    { field: "externalAccountId", columns: ["AccountId", "Account Id", "Account Number", "AcctId", "Account"], kind: "text", required: true },
    { field: "date", columns: ["PaymentDate", "Payment Date", "TransactionDate", "Transaction Date", "PostDate", "Date"], kind: "date", required: true },
    { field: "amount", columns: ["Amount", "PaymentAmount", "Payment Amount", "TransactionAmount"], kind: "money", required: true },
    { field: "type", columns: ["Type", "TransactionType", "Transaction Type", "PaymentType", "Description"], kind: "text" },
    { field: "reference", columns: ["Reference", "ReceiptNumber", "Receipt Number", "Receipt", "CheckNumber"], kind: "text" },
    { field: "method", columns: ["Method", "PaymentMethod", "Payment Method", "TenderType"], kind: "text" }
  ]
};

export const HISTORY_PROFILES = { CONTRACTS: HISTORY_CONTRACTS, PAYMENTS: HISTORY_PAYMENTS } as const;
export type HistoryKind = keyof typeof HISTORY_PROFILES;

/** Put the person's chosen column first for each field they mapped (the configurable part). */
export function withColumnMap(profile: ImportProfile, columnMap: Record<string, string>): ImportProfile {
  return { ...profile, fields: profile.fields.map(f => (columnMap[f.field]?.trim() ? { ...f, columns: [columnMap[f.field].trim(), ...f.columns] } : f)) };
}

export function parseFrequency(value: unknown): Frequency | null {
  const s = String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s) return null;
  if (s.includes("SEMI") || s.includes("TWICE") || s === "SM" || s.includes("24")) return "SEMIMONTHLY";
  if (s.includes("BI") || s.includes("EVERY2") || s.includes("EVERYOTHER") || s === "BW" || s.includes("26")) return "BIWEEKLY";
  if (s.includes("WEEK") || s === "W" || s.includes("52")) return "WEEKLY";
  if (s.includes("MONTH") || s === "M" || s === "MO" || s.includes("12")) return "MONTHLY";
  return null;
}

export function parseCalcMethod(value: unknown): CalcMethod {
  const s = String(value ?? "").toUpperCase();
  return s.includes("SIMPLE") || (s.includes("INTEREST") && !s.includes("PRE")) ? "SIMPLE_INTEREST" : "FIXED_PAYMENT";
}

/** "18", "18%", "0.18" -> 1800 basis points. */
export function parseAprBasisPoints(value: unknown): number | null {
  const n = Number(String(value ?? "").replace(/[%\s]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round((n < 1 ? n * 100 : n) * 100);
}

/** Map a DealerCenter transaction description to a ledger entry type. */
export function historyTxType(value: unknown, amountCents: number): LedgerTxType {
  const s = String(value ?? "").toUpperCase();
  // Fees first: "Returned Check Fee" is a fee, not a returned payment.
  if (/WAIV/.test(s)) return "LATE_FEE_WAIVER";
  if (/LATE/.test(s)) return "LATE_FEE";
  if (/FEE|CHARGE/.test(s)) return "FEE";
  if (/NSF|RETURN|BOUNCE|REVERS|VOID/.test(s)) return "RETURNED_PAYMENT";
  if (/PAYOFF|PAY OFF/.test(s)) return "PAYOFF";
  if (/CREDIT/.test(s)) return "CREDIT";
  if (/SIDE ?NOTE/.test(s)) return "SIDE_NOTE_PAYMENT";
  return amountCents < 0 ? "RETURNED_PAYMENT" : "PAYMENT";
}
