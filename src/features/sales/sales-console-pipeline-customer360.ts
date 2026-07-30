export type SalesConsolePipelineRecord = {
  id: string;
  customer: string;
  lane: string;
  owner: string;
  stage: string;
  age: string;
  freshness: string;
  blocker: string;
  forecastBand: string;
  source: string;
};

export type SalesConsoleCustomer360View = {
  customer: string;
  identity: string;
  consent: string[];
  activeOpportunities: string[];
  appointments: string[];
  promises: string[];
  documents: string[];
  timeline: string[];
  sourceSystem: string;
};

export const salesConsolePipelineRecords: SalesConsolePipelineRecord[] = [
  { id: "PIPE-1001", customer: "John Smith", lane: "Cash Sale", owner: "James K.", stage: "Proposal", age: "2 days", freshness: "current", blocker: "Trade App", forecastBand: "Commit", source: "CRM + Inventory" },
  { id: "PIPE-1002", customer: "Samantha Lee", lane: "BHPH", owner: "Tasha M.", stage: "Compliance", age: "4 days", freshness: "blocked", blocker: "Pay Stub", forecastBand: "Best Case", source: "CRM + Finance" },
  { id: "PIPE-1003", customer: "David Brown", lane: "Public Repair", owner: "Luis R.", stage: "Estimate", age: "1 day", freshness: "current", blocker: "Clear", forecastBand: "Watch", source: "Service" }
];

export const salesConsoleCustomer360Views: SalesConsoleCustomer360View[] = [
  {
    customer: "John Smith",
    identity: "CUST-1001 · Orlando, FL · verified",
    consent: ["Text opt-in", "Email opt-in", "Calls opt-in"],
    activeOpportunities: ["2022 Toyota RAV4 XLE cash sale", "Extended warranty interest"],
    appointments: ["Test drive today 1:00 PM"],
    promises: ["Confirm trade value", "Send final numbers"],
    documents: ["Buyer order", "Trade appraisal", "Credit app"],
    timeline: ["Lead opened", "Vehicle selected", "Manager review requested"],
    sourceSystem: "CRM"
  }
];

export function salesConsolePipelineHasSelectableCustomerContext() {
  const customerNames = new Set(salesConsoleCustomer360Views.map((customer) => customer.customer));

  return salesConsolePipelineRecords.some((record) => customerNames.has(record.customer));
}

export function salesConsoleCustomer360PreservesCrmSource() {
  return salesConsoleCustomer360Views.every((view) => view.sourceSystem === "CRM" && view.consent.length > 0);
}
