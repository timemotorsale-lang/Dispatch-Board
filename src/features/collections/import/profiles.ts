/**
 * Column-mapping profiles for imports (spec section 4).
 *
 * A profile is plain configuration: which file columns map to which fields and
 * how to read them. A second profile ("Contact & details") can be added here
 * later without any database change.
 */

export type FieldKind = "text" | "money" | "date" | "int";

export type ProfileField = {
  /** Internal field name. */
  field: string;
  /** Column names in the file (matched trimmed and case-insensitive). */
  columns: string[];
  kind: FieldKind;
  required?: boolean;
};

export type ImportProfile = {
  key: string;
  label: string;
  /** Field used to match rows to accounts. */
  matchFields: string[];
  fields: ProfileField[];
};

export const DEALERCENTER_ACTIVE_ACCOUNTS: ImportProfile = {
  key: "DEALERCENTER_ACTIVE_ACCOUNTS",
  label: "DealerCenter Active Accounts",
  matchFields: ["externalAccountId"],
  fields: [
    { field: "externalAccountId", columns: ["AccountId"], kind: "text", required: true },
    { field: "contractDate", columns: ["DealDate"], kind: "date" },
    { field: "dealNumber", columns: ["DealNumber"], kind: "text" },
    { field: "buyerName", columns: ["BuyerName"], kind: "text", required: true },
    { field: "vehicleDescription", columns: ["VehicleYearMakeModel"], kind: "text" },
    { field: "stockNumber", columns: ["VehicleStockNumber"], kind: "text" },
    { field: "dmsRepoStatus", columns: ["RepoStatus"], kind: "text" },
    { field: "dmsAccountStatus", columns: ["AccountStatus"], kind: "text" },
    { field: "dmsInsuranceStatus", columns: ["InsuranceStatus"], kind: "text" },
    { field: "dmsAutopayStatus", columns: ["AutopayStatus"], kind: "text" },
    { field: "dmsCollectorName", columns: ["CollectorName"], kind: "text" },
    { field: "dmsLenderType", columns: ["LenderType"], kind: "text" },
    { field: "dmsLenderName", columns: ["LenderName"], kind: "text" },
    { field: "downCents", columns: ["BalanceDownAmount"], kind: "money" },
    { field: "principalCents", columns: ["BalancePrincipalAmount"], kind: "money" },
    { field: "interestCents", columns: ["BalanceInterestAmount"], kind: "money" },
    { field: "otherCents", columns: ["BalanceOtherAmount"], kind: "money" },
    { field: "lateCents", columns: ["BalanceLateAmount"], kind: "money" },
    { field: "sideNoteCents", columns: ["BalanceSideNoteAmount"], kind: "money" },
    { field: "creditCents", columns: ["BalanceCreditAmount"], kind: "money" },
    { field: "totalBalanceCents", columns: ["TotalBalanceAmount"], kind: "money", required: true },
    { field: "paymentDueDate", columns: ["PaymentDueDate"], kind: "date" },
    { field: "promiseDate", columns: ["PromiseDate"], kind: "date" },
    { field: "daysPastDue", columns: ["DaysPastDue"], kind: "int", required: true },
    { field: "paymentAmountCents", columns: ["PaymentAmount"], kind: "money" },
    { field: "amountDueCents", columns: ["TotalPaymentDueAmount"], kind: "money", required: true },
    { field: "paymentsRemaining", columns: ["RemainingPayment"], kind: "int" }
  ]
};

/**
 * Second import (Release 1 builds the slot; columns to be confirmed when the owner
 * finds the DealerCenter report). Matched on AccountId or DealNumber.
 */
export const DEALERCENTER_CONTACT_DETAILS: ImportProfile = {
  key: "DEALERCENTER_CONTACT_DETAILS",
  label: "DealerCenter Contact & details (columns to be confirmed)",
  matchFields: ["externalAccountId", "dealNumber"],
  fields: [
    { field: "externalAccountId", columns: ["AccountId"], kind: "text" },
    { field: "dealNumber", columns: ["DealNumber"], kind: "text" },
    { field: "primaryPhone", columns: ["Phone", "CellPhone", "HomePhone"], kind: "text" },
    { field: "primaryEmail", columns: ["Email"], kind: "text" },
    { field: "mailingAddress", columns: ["Address"], kind: "text" },
    { field: "preferredLanguage", columns: ["Language"], kind: "text" },
    { field: "vin", columns: ["VIN", "Vin"], kind: "text" },
    { field: "paymentFrequency", columns: ["PaymentFrequency", "PaymentSchedule"], kind: "text" },
    { field: "lastPaymentDate", columns: ["LastPaymentDate"], kind: "date" },
    { field: "lastPaymentCents", columns: ["LastPaymentAmount"], kind: "money" },
    { field: "gpsDeviceSerial", columns: ["GpsSerial", "GPSSerial"], kind: "text" }
  ]
};

export const IMPORT_PROFILES: Record<string, ImportProfile> = {
  [DEALERCENTER_ACTIVE_ACCOUNTS.key]: DEALERCENTER_ACTIVE_ACCOUNTS,
  [DEALERCENTER_CONTACT_DETAILS.key]: DEALERCENTER_CONTACT_DETAILS
};
