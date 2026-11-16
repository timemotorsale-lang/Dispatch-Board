/**
 * Collections settings (spec section 15). Stored as one JSON row per
 * organization (CollectionsSetting.values). Every value has a safe default, and
 * anything missing or invalid falls back to that default.
 */

export type DayHours = { open: string; close: string } | null;
export type BusinessHours = { mon: DayHours; tue: DayHours; wed: DayHours; thu: DayHours; fri: DayHours; sat: DayHours; sun: DayHours };

export const MESSAGE_RULE_KEYS = ["DUE_SOON", "PAST_DUE_DAY1", "PAST_DUE_LATE_FEE", "PROMISE_REMINDER", "INSURANCE_NEEDED", "DISABLE_WARNING"] as const;
export type MessageRuleKey = (typeof MESSAGE_RULE_KEYS)[number];

export type MessageRuleSetting = { enabled: boolean; dayOffset: number };

export type CollectionsSettings = {
  dealership: {
    name: string;
    phone: string;
    address: string;
    advantageGpsPortalUrl: string;
    payOnlineUrl: string;
    zelleRecipient: string;
    cashAtStoreInstructions: string;
  };
  timeZone: string;
  businessHours: BusinessHours;
  /** Customer-local quiet hours for automatic messages (8am to 9pm). */
  customerContactWindow: { start: string; end: string };
  graceDays: number;
  lateFeeDisplayCents: number;
  thresholds: { disableReview: number; followUp: number; review30: number; repoReview: number };
  promiseGraceDays: number;
  reportedPaymentConfirmationDays: number;
  insuranceExpiringSoonDays: number;
  messageRules: Record<MessageRuleKey, MessageRuleSetting>;
  weeklyAutomaticMessageCap: number;
  languagesEnabled: Array<"EN" | "ES" | "SO" | "SW">;
  collectorVisibility: "ALL_ACCOUNTS" | "ASSIGNED_ONLY";
  importReminderTime: string;
  automationRunTime: string;
  /** Attorney-approved letter wording. Empty = letters print with a DRAFT banner and placeholder text. */
  letterWording: { PRE_REPO_NOTICE: string; POST_REPO_NOTICE: string };
  /** Board tasks switched off by the active playbook (missing = on). Filled from the playbook, not edited here. */
  taskEnabled: Record<string, boolean>;
  /** Points each risk factor can add (spec 22.2). The score is capped at 100. */
  riskWeights: RiskWeights;
  /** Extension eligibility (spec 22.3). Ineligible requests can still be approved with a reason. */
  extensionRules: { minAccountAgeMonths: number; maxPer12Months: number; blockWhileOpenPromise: boolean };
  /** Raise a "possible skip" alert after this many days without reaching the customer while past due (22.5). */
  skipNoContactDays: number;
  /** Charge-off can be requested without an override from this many days past due (22.6). */
  chargeOffMinDaysPastDue: number;
  /** Fees and credits at or below this amount don't need approval. 0 = all need approval (22.8). */
  adjustmentApprovalThresholdCents: number;
  /** Days after "posted in DealerCenter" before an unmatched fee/credit is flagged. */
  adjustmentConfirmationDays: number;
  /** Default amounts offered when entering a fee (cents). Attorney to confirm Minnesota limits. */
  feeDefaults: Record<"REPO_FEE" | "STORAGE_FEE" | "RETURNED_PAYMENT_FEE", number>;
  /** Servicing ledger (spec 25.3): payment split order and the weekend/holiday due-date rule. */
  ledger: { allocationOrder: Array<"FEE" | "LATE_FEE" | "PAST_DUE" | "CURRENT" | "PRINCIPAL">; weekendRule: "NONE" | "NEXT_BUSINESS_DAY"; holidays: string[] };
};

export type RiskWeights = {
  daysPastDue: number; dpdTrend: number; missedPayments: number; brokenPromises: number;
  lowContactSuccess: number; insurance: number; possibleSkip: number; newAccount: number;
};

export const DEFAULT_COLLECTIONS_SETTINGS: CollectionsSettings = {
  dealership: {
    name: "Time Motor Sales, Inc.",
    phone: "612-724-3631",
    address: "1101 E. Lake Street, Minneapolis, MN 55407",
    advantageGpsPortalUrl: "",
    payOnlineUrl: "",
    zelleRecipient: "",
    cashAtStoreInstructions: ""
  },
  timeZone: "America/Chicago",
  businessHours: {
    mon: { open: "09:00", close: "18:00" },
    tue: { open: "09:00", close: "18:00" },
    wed: { open: "09:00", close: "18:00" },
    thu: { open: "09:00", close: "18:00" },
    fri: { open: "09:00", close: "18:00" },
    sat: { open: "10:00", close: "15:00" },
    sun: null
  },
  customerContactWindow: { start: "08:00", end: "21:00" },
  graceDays: 5,
  lateFeeDisplayCents: 1000,
  thresholds: { disableReview: 7, followUp: 14, review30: 30, repoReview: 60 },
  promiseGraceDays: 1,
  reportedPaymentConfirmationDays: 2,
  insuranceExpiringSoonDays: 14,
  messageRules: {
    DUE_SOON: { enabled: true, dayOffset: -2 },
    PAST_DUE_DAY1: { enabled: true, dayOffset: 1 },
    PAST_DUE_LATE_FEE: { enabled: true, dayOffset: 6 },
    PROMISE_REMINDER: { enabled: true, dayOffset: -1 },
    INSURANCE_NEEDED: { enabled: true, dayOffset: 7 },
    // Never automatic: the owner reviews and sends it from the disable dialog.
    DISABLE_WARNING: { enabled: false, dayOffset: 0 }
  },
  weeklyAutomaticMessageCap: 3,
  languagesEnabled: ["EN", "ES", "SO", "SW"],
  collectorVisibility: "ALL_ACCOUNTS",
  importReminderTime: "10:00",
  automationRunTime: "09:15",
  letterWording: { PRE_REPO_NOTICE: "", POST_REPO_NOTICE: "" },
  taskEnabled: {},
  riskWeights: { daysPastDue: 35, dpdTrend: 10, missedPayments: 15, brokenPromises: 15, lowContactSuccess: 10, insurance: 5, possibleSkip: 15, newAccount: 5 },
  extensionRules: { minAccountAgeMonths: 6, maxPer12Months: 2, blockWhileOpenPromise: true },
  skipNoContactDays: 14,
  chargeOffMinDaysPastDue: 120,
  adjustmentApprovalThresholdCents: 0,
  adjustmentConfirmationDays: 2,
  feeDefaults: { REPO_FEE: 0, STORAGE_FEE: 0, RETURNED_PAYMENT_FEE: 0 },
  ledger: { allocationOrder: ["FEE", "LATE_FEE", "PAST_DUE", "CURRENT", "PRINCIPAL"], weekendRule: "NONE", holidays: [] }
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function str(value: unknown, fallback: string, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback;
}
function int(value: unknown, fallback: number, min: number, max: number) {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}
function time(value: unknown, fallback: string) {
  return typeof value === "string" && TIME.test(value) ? value : fallback;
}
function hours(value: unknown, fallback: DayHours): DayHours {
  if (value === null) return null;
  if (!isRecord(value)) return fallback;
  const open = time(value.open, fallback?.open ?? "09:00");
  const close = time(value.close, fallback?.close ?? "17:00");
  return open < close ? { open, close } : fallback;
}

/** Merge stored JSON onto the defaults. Never throws; bad values are ignored. */
export function parseCollectionsSettings(raw: unknown): CollectionsSettings {
  const d = DEFAULT_COLLECTIONS_SETTINGS;
  const v = isRecord(raw) ? raw : {};
  const dealer = isRecord(v.dealership) ? v.dealership : {};
  const bh = isRecord(v.businessHours) ? v.businessHours : {};
  const th = isRecord(v.thresholds) ? v.thresholds : {};
  const rules = isRecord(v.messageRules) ? v.messageRules : {};
  const window = isRecord(v.customerContactWindow) ? v.customerContactWindow : {};
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const languages = Array.isArray(v.languagesEnabled)
    ? v.languagesEnabled.filter((item): item is "EN" | "ES" | "SO" | "SW" => ["EN", "ES", "SO", "SW"].includes(item as string))
    : d.languagesEnabled;
  const thresholds = {
    disableReview: int(th.disableReview, d.thresholds.disableReview, 1, 365),
    followUp: int(th.followUp, d.thresholds.followUp, 1, 365),
    review30: int(th.review30, d.thresholds.review30, 1, 365),
    repoReview: int(th.repoReview, d.thresholds.repoReview, 1, 365)
  };
  return {
    dealership: {
      name: str(dealer.name, d.dealership.name, 120) || d.dealership.name,
      phone: str(dealer.phone, d.dealership.phone, 40),
      address: str(dealer.address, d.dealership.address),
      advantageGpsPortalUrl: safeUrl(dealer.advantageGpsPortalUrl),
      payOnlineUrl: safeUrl(dealer.payOnlineUrl),
      zelleRecipient: str(dealer.zelleRecipient, d.dealership.zelleRecipient, 120),
      cashAtStoreInstructions: str(dealer.cashAtStoreInstructions, d.dealership.cashAtStoreInstructions)
    },
    timeZone: "America/Chicago",
    businessHours: Object.fromEntries(days.map(day => [day, day in bh ? hours(bh[day], d.businessHours[day]) : d.businessHours[day]])) as BusinessHours,
    customerContactWindow: { start: time(window.start, d.customerContactWindow.start), end: time(window.end, d.customerContactWindow.end) },
    graceDays: int(v.graceDays, d.graceDays, 0, 30),
    lateFeeDisplayCents: int(v.lateFeeDisplayCents, d.lateFeeDisplayCents, 0, 100_000),
    thresholds,
    promiseGraceDays: int(v.promiseGraceDays, d.promiseGraceDays, 0, 14),
    reportedPaymentConfirmationDays: int(v.reportedPaymentConfirmationDays, d.reportedPaymentConfirmationDays, 1, 30),
    insuranceExpiringSoonDays: int(v.insuranceExpiringSoonDays, d.insuranceExpiringSoonDays, 1, 90),
    messageRules: Object.fromEntries(MESSAGE_RULE_KEYS.map(key => {
      const rule = isRecord(rules[key]) ? rules[key] as Record<string, unknown> : {};
      const fallback = d.messageRules[key];
      // DISABLE_WARNING can never be switched to automatic.
      const enabled = key === "DISABLE_WARNING" ? false : typeof rule.enabled === "boolean" ? rule.enabled : fallback.enabled;
      return [key, { enabled, dayOffset: int(rule.dayOffset, fallback.dayOffset, -30, 60) }];
    })) as Record<MessageRuleKey, MessageRuleSetting>,
    weeklyAutomaticMessageCap: int(v.weeklyAutomaticMessageCap, d.weeklyAutomaticMessageCap, 0, 20),
    languagesEnabled: languages.includes("EN") ? languages : ["EN", ...languages],
    collectorVisibility: v.collectorVisibility === "ASSIGNED_ONLY" ? "ASSIGNED_ONLY" : "ALL_ACCOUNTS",
    importReminderTime: time(v.importReminderTime, d.importReminderTime),
    automationRunTime: time(v.automationRunTime, d.automationRunTime),
    letterWording: {
      PRE_REPO_NOTICE: str(isRecord(v.letterWording) ? v.letterWording.PRE_REPO_NOTICE : undefined, "", 8000),
      POST_REPO_NOTICE: str(isRecord(v.letterWording) ? v.letterWording.POST_REPO_NOTICE : undefined, "", 8000)
    },
    taskEnabled: isRecord(v.taskEnabled) ? Object.fromEntries(Object.entries(v.taskEnabled).filter(([, on]) => typeof on === "boolean")) as Record<string, boolean> : {},
    riskWeights: Object.fromEntries((Object.keys(d.riskWeights) as Array<keyof RiskWeights>).map(key => [key, int(isRecord(v.riskWeights) ? v.riskWeights[key] : undefined, d.riskWeights[key], 0, 100)])) as RiskWeights,
    extensionRules: {
      minAccountAgeMonths: int(isRecord(v.extensionRules) ? v.extensionRules.minAccountAgeMonths : undefined, d.extensionRules.minAccountAgeMonths, 0, 60),
      maxPer12Months: int(isRecord(v.extensionRules) ? v.extensionRules.maxPer12Months : undefined, d.extensionRules.maxPer12Months, 0, 12),
      blockWhileOpenPromise: isRecord(v.extensionRules) && typeof v.extensionRules.blockWhileOpenPromise === "boolean" ? v.extensionRules.blockWhileOpenPromise : d.extensionRules.blockWhileOpenPromise
    },
    skipNoContactDays: int(v.skipNoContactDays, d.skipNoContactDays, 3, 120),
    chargeOffMinDaysPastDue: int(v.chargeOffMinDaysPastDue, d.chargeOffMinDaysPastDue, 30, 720),
    adjustmentApprovalThresholdCents: int(v.adjustmentApprovalThresholdCents, d.adjustmentApprovalThresholdCents, 0, 1_000_000),
    adjustmentConfirmationDays: int(v.adjustmentConfirmationDays, d.adjustmentConfirmationDays, 1, 14),
    feeDefaults: {
      REPO_FEE: int(isRecord(v.feeDefaults) ? v.feeDefaults.REPO_FEE : undefined, 0, 0, 1_000_000),
      STORAGE_FEE: int(isRecord(v.feeDefaults) ? v.feeDefaults.STORAGE_FEE : undefined, 0, 0, 1_000_000),
      RETURNED_PAYMENT_FEE: int(isRecord(v.feeDefaults) ? v.feeDefaults.RETURNED_PAYMENT_FEE : undefined, 0, 0, 1_000_000)
    },
    ledger: parseLedgerSettings(v.ledger, d.ledger)
  };
}

function safeUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

/** The payment order must contain each step exactly once; otherwise the default is used. */
function parseLedgerSettings(raw: unknown, fallback: CollectionsSettings["ledger"]): CollectionsSettings["ledger"] {
  const v = isRecord(raw) ? raw : {};
  const steps = ["FEE", "LATE_FEE", "PAST_DUE", "CURRENT", "PRINCIPAL"] as const;
  const order = Array.isArray(v.allocationOrder) && v.allocationOrder.length === steps.length && steps.every(step => (v.allocationOrder as unknown[]).includes(step))
    ? (v.allocationOrder as CollectionsSettings["ledger"]["allocationOrder"]) : fallback.allocationOrder;
  const holidays = Array.isArray(v.holidays) ? v.holidays.filter((h): h is string => typeof h === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h)).slice(0, 60) : fallback.holidays;
  return { allocationOrder: order, weekendRule: v.weekendRule === "NEXT_BUSINESS_DAY" ? "NEXT_BUSINESS_DAY" : "NONE", holidays };
}
