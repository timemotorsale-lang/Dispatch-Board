import { type SalesConsoleEnterpriseRole } from "./sales-console-m9-enterprise-permissions";

export type SalesConsoleForecastMetric = "finance-reserve" | "gross-profit" | "units";

export type SalesConsoleForecastConfidence = "high" | "low" | "medium";

export type SalesConsoleForecastRow = {
  confidence: SalesConsoleForecastConfidence;
  freshness: "current" | "stale" | "verify-first";
  inputSummary: string;
  metric: SalesConsoleForecastMetric;
  restricted: boolean;
  value: string;
  visibleTo: SalesConsoleEnterpriseRole[];
};

export type SalesConsoleForecastReadModel = {
  forecastRows: SalesConsoleForecastRow[];
  guardrails: string[];
  readOnly: true;
};

export const salesConsoleForecastReadModel = {
  forecastRows: [
    {
      confidence: "high",
      freshness: "current",
      inputSummary: "Active DMS deals, appointments, and stage aging.",
      metric: "units",
      restricted: false,
      value: "148",
      visibleTo: ["salesperson", "sales-manager", "admin-owner"]
    },
    {
      confidence: "medium",
      freshness: "verify-first",
      inputSummary: "Deal desk visibility rows with placeholder gross source labels.",
      metric: "gross-profit",
      restricted: true,
      value: "$165,420",
      visibleTo: ["sales-manager", "admin-owner"]
    },
    {
      confidence: "low",
      freshness: "stale",
      inputSummary: "Finance source remains placeholder-only; verify before management use.",
      metric: "finance-reserve",
      restricted: true,
      value: "$32,810",
      visibleTo: ["admin-owner"]
    }
  ],
  guardrails: [
    "Forecasting is read-only and cannot change deal, finance, or inventory records.",
    "Every forecast row must show confidence, freshness, and source input summary.",
    "Gross and finance forecast metrics stay restricted from unauthorized roles.",
    "Stale or verify-first inputs lower confidence and require manager/admin review."
  ],
  readOnly: true
} as const satisfies SalesConsoleForecastReadModel;

export function forecastRowsHaveConfidenceAndFreshness(readModel = salesConsoleForecastReadModel) {
  return readModel.forecastRows.every((row) => row.confidence && row.freshness && row.inputSummary.length > 0);
}

export function restrictedForecastMetricsAreRoleLimited(readModel = salesConsoleForecastReadModel) {
  return readModel.forecastRows
    .filter((row) => row.restricted)
    .every((row) => {
      const visibleTo: readonly SalesConsoleEnterpriseRole[] = row.visibleTo;
      return !visibleTo.includes("salesperson") && !visibleTo.includes("bdc-lead-coordinator");
    });
}

export function staleForecastInputsLowerConfidence(readModel = salesConsoleForecastReadModel) {
  return readModel.forecastRows
    .filter((row) => row.freshness === "stale")
    .every((row) => row.confidence === "low");
}
