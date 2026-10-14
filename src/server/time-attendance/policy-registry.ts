export type TimePolicySource = {
  id: string;
  title: string;
  authority: "FEDERAL_AGENCY" | "MINNESOTA_AGENCY" | "MINNESOTA_STATUTE" | "MINNESOTA_RULE";
  url: string;
  verifiedOn: string;
};

export type OvertimeCoverage =
  | "US_FLSA_NONEXEMPT"
  | "MN_MFLSA_ONLY_NONEXEMPT"
  | "EXEMPT"
  | "UNRESOLVED";

export type TimePolicyVersion = {
  id: string;
  jurisdiction: "US_FEDERAL" | "MINNESOTA";
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceIds: string[];
  rules: {
    overtimeThresholdMinutes?: number;
    paidRestMinimumMinutes?: number;
    paidRestWithinConsecutiveWorkMinutes?: number;
    mealMinimumMinutes?: number;
    mealRequiredAtShiftMinutes?: number;
    esstWorkMinutesPerAccrualHour?: number;
    esstAnnualAccrualCapMinutes?: number;
    esstBankCapMinutes?: number;
    roundingPolicy: "EXACT_TIME";
  };
};

export type TimePolicyProfileTemplate = {
  id: string;
  name: string;
  description: string;
  jurisdiction: "MINNESOTA";
  scheduledMealPolicy: {
    expectedMealMinutes: number;
    paid: boolean;
  };
  policyVersionIds: string[];
  payrollReadyByDefault: boolean;
};

export const TIME_POLICY_SOURCES: readonly TimePolicySource[] = [
  {
    id: "US-FLSA-HOURS",
    title: "U.S. DOL Fact Sheet 22 — Hours Worked Under the FLSA",
    authority: "FEDERAL_AGENCY",
    url: "https://www.dol.gov/agencies/whd/fact-sheets/22-flsa-hours-worked",
    verifiedOn: "2026-07-23"
  },
  {
    id: "US-FLSA-OT",
    title: "U.S. DOL — Wages and the Fair Labor Standards Act",
    authority: "FEDERAL_AGENCY",
    url: "https://www.dol.gov/agencies/whd/flsa",
    verifiedOn: "2026-07-23"
  },
  {
    id: "MN-HOURS-WORKED",
    title: "Minnesota Rule 5200.0120 — Hours Worked",
    authority: "MINNESOTA_RULE",
    url: "https://www.revisor.mn.gov/rules/5200.0120/",
    verifiedOn: "2026-07-23"
  },
  {
    id: "MN-OT",
    title: "Minnesota DLI — Overtime Laws",
    authority: "MINNESOTA_AGENCY",
    url: "https://www.dli.mn.gov/overtime",
    verifiedOn: "2026-07-23"
  },
  {
    id: "MN-BREAKS",
    title: "Minnesota DLI — Work Breaks and Rest Periods",
    authority: "MINNESOTA_AGENCY",
    url: "https://www.dli.mn.gov/breaks",
    verifiedOn: "2026-07-23"
  },
  {
    id: "MN-REST-STATUTE",
    title: "Minnesota Statute 177.253 — Mandatory Work Breaks",
    authority: "MINNESOTA_STATUTE",
    url: "https://www.revisor.mn.gov/statutes/cite/177.253",
    verifiedOn: "2026-07-23"
  },
  {
    id: "MN-MEAL-STATUTE",
    title: "Minnesota Statute 177.254 — Mandatory Meal Break",
    authority: "MINNESOTA_STATUTE",
    url: "https://www.revisor.mn.gov/statutes/cite/177.254",
    verifiedOn: "2026-07-23"
  },
  {
    id: "MN-ESST",
    title: "Minnesota DLI — Earned Sick and Safe Time",
    authority: "MINNESOTA_AGENCY",
    url: "https://www.dli.mn.gov/sick-leave",
    verifiedOn: "2026-07-23"
  },
  {
    id: "MN-ESST-STATUTE",
    title: "Minnesota Statute 181.9446 — Accrual of Earned Sick and Safe Time",
    authority: "MINNESOTA_STATUTE",
    url: "https://www.revisor.mn.gov/statutes/cite/181.9446",
    verifiedOn: "2026-07-23"
  }
] as const;

export const TIME_POLICY_VERSIONS: readonly TimePolicyVersion[] = [
  {
    id: "US-FLSA-NONEXEMPT-2026-BASELINE",
    jurisdiction: "US_FEDERAL",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    sourceIds: ["US-FLSA-HOURS", "US-FLSA-OT"],
    rules: { overtimeThresholdMinutes: 40 * 60, roundingPolicy: "EXACT_TIME" }
  },
  {
    id: "MN-MFLSA-ONLY-2026-BASELINE",
    jurisdiction: "MINNESOTA",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    sourceIds: ["MN-HOURS-WORKED", "MN-OT"],
    rules: { overtimeThresholdMinutes: 48 * 60, roundingPolicy: "EXACT_TIME" }
  },
  {
    id: "MN-BREAKS-2026-01-01",
    jurisdiction: "MINNESOTA",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    sourceIds: ["MN-HOURS-WORKED", "MN-BREAKS", "MN-REST-STATUTE", "MN-MEAL-STATUTE"],
    rules: {
      paidRestMinimumMinutes: 15,
      paidRestWithinConsecutiveWorkMinutes: 4 * 60,
      mealMinimumMinutes: 30,
      mealRequiredAtShiftMinutes: 6 * 60,
      roundingPolicy: "EXACT_TIME"
    }
  },
  {
    id: "MN-ESST-STANDARD-ACCRUAL-2026-07-06",
    jurisdiction: "MINNESOTA",
    effectiveFrom: "2026-07-06",
    effectiveTo: null,
    sourceIds: ["MN-HOURS-WORKED", "MN-ESST", "MN-ESST-STATUTE"],
    rules: {
      esstWorkMinutesPerAccrualHour: 30 * 60,
      esstAnnualAccrualCapMinutes: 48 * 60,
      esstBankCapMinutes: 80 * 60,
      roundingPolicy: "EXACT_TIME"
    }
  }
] as const;

export const TIME_POLICY_PROFILE_TEMPLATES: readonly TimePolicyProfileTemplate[] = [
  {
    id: "MN-HOURLY-60-MIN-UNPAID-MEAL",
    name: "MN Hourly - 60 Minute Unpaid Meal",
    description: "For staff scheduled across a 9-hour span with a planned 1-hour unpaid meal, producing 8 scheduled paid hours.",
    jurisdiction: "MINNESOTA",
    scheduledMealPolicy: { expectedMealMinutes: 60, paid: false },
    policyVersionIds: [
      "US-FLSA-NONEXEMPT-2026-BASELINE",
      "MN-BREAKS-2026-01-01",
      "MN-ESST-STANDARD-ACCRUAL-2026-07-06"
    ],
    payrollReadyByDefault: false
  },
  {
    id: "MN-HOURLY-30-MIN-PAID-MEAL",
    name: "MN Hourly - 30 Minute Paid Meal",
    description: "For staff whose 30-minute meal is paid by company policy and therefore is not deducted from scheduled paid time.",
    jurisdiction: "MINNESOTA",
    scheduledMealPolicy: { expectedMealMinutes: 30, paid: true },
    policyVersionIds: [
      "US-FLSA-NONEXEMPT-2026-BASELINE",
      "MN-BREAKS-2026-01-01",
      "MN-ESST-STANDARD-ACCRUAL-2026-07-06"
    ],
    payrollReadyByDefault: false
  }
] as const;

export function getTimePolicyVersion(versionId: string) {
  return TIME_POLICY_VERSIONS.find((version) => version.id === versionId) ?? null;
}

export function getTimePolicyProfileTemplate(templateId: string) {
  return TIME_POLICY_PROFILE_TEMPLATES.find((template) => template.id === templateId) ?? null;
}

export function resolveOvertimePolicyVersion(coverage: OvertimeCoverage) {
  if (coverage === "US_FLSA_NONEXEMPT") {
    return getTimePolicyVersion("US-FLSA-NONEXEMPT-2026-BASELINE");
  }
  if (coverage === "MN_MFLSA_ONLY_NONEXEMPT") {
    return getTimePolicyVersion("MN-MFLSA-ONLY-2026-BASELINE");
  }
  return null;
}
