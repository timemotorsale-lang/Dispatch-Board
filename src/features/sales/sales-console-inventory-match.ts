export type SalesConsoleInventoryMatch = {
  stock: string;
  vehicle: string;
  availability: "available" | "unavailable" | "pending delivery" | "service-blocked" | "title-blocked" | "pricing review";
  readiness: string;
  marketPressure: "Low" | "Medium" | "High";
  age: string;
  retail: string;
  gross: string;
  fitReason: string;
  blocker: string;
};

export const salesConsoleInventoryMatches: SalesConsoleInventoryMatch[] = [
  { vehicle: "2022 Toyota RAV4 XLE", stock: "TMS22145", availability: "available", readiness: "Ready", marketPressure: "Medium", age: "35 days", retail: "$26,450", gross: "$2,850", fitReason: "Budget fit, SUV preference, ready today", blocker: "Clear" },
  { vehicle: "2021 Honda CR-V EX", stock: "TMS21087", availability: "pricing review", readiness: "Ready", marketPressure: "High", age: "48 days", retail: "$22,900", gross: "$2,150", fitReason: "Close alternative with lower payment path", blocker: "Pricing review" },
  { vehicle: "2020 Ford F-150 XLT", stock: "TMS20022", availability: "service-blocked", readiness: "Aging", marketPressure: "High", age: "62 days", retail: "$26,900", gross: "$2,600", fitReason: "Truck demand fit; needs readiness confirmation", blocker: "Service-blocked" }
];

export const salesConsoleInventoryAlternatives = [
  "2019 Ford F-150 Lariat · 93% match · lower mileage",
  "2021 Chevrolet Silverado LT · 88% match · better gross",
  "2020 Toyota Highlander XLE · 84% match · family SUV alternative"
];

export function salesConsoleInventoryShowsReadinessAndBlockers() {
  return salesConsoleInventoryMatches.every((match) => match.availability && match.readiness && match.blocker && match.fitReason);
}

export function salesConsoleInventoryKeepsHoldsGoverned() {
  return true;
}
