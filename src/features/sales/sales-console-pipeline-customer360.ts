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
  leadScore: number;
  funnelSignal: string;
  nextBestCustomerAction: string;
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
  {
    id: "PIPE-1001",
    customer: "John Smith",
    lane: "Cash Sale",
    owner: "James K.",
    stage: "Proposal",
    age: "2 days",
    freshness: "current",
    blocker: "Trade App",
    forecastBand: "Commit",
    source: "CRM + Inventory",
    leadScore: 88,
    funnelSignal: "proposal",
    nextBestCustomerAction: "Confirm trade value and prepare final numbers"
  },
  {
    id: "PIPE-1002",
    customer: "Samantha Lee",
    lane: "BHPH",
    owner: "Tasha M.",
    stage: "Compliance",
    age: "4 days",
    freshness: "blocked",
    blocker: "Pay Stub",
    forecastBand: "Best Case",
    source: "CRM + Finance",
    leadScore: 64,
    funnelSignal: "blocked",
    nextBestCustomerAction: "Resolve pay stub blocker before manager review"
  },
  {
    id: "PIPE-1003",
    customer: "David Brown",
    lane: "Public Repair",
    owner: "Luis R.",
    stage: "Estimate",
    age: "1 day",
    freshness: "current",
    blocker: "Clear",
    forecastBand: "Watch",
    source: "Service",
    leadScore: 59,
    funnelSignal: "qualified",
    nextBestCustomerAction: "Follow up on repair estimate and warranty interest"
  }
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

export function salesConsolePipelineUsesCustomer360Intelligence() {
  return salesConsolePipelineRecords.every(
    (record) =>
      record.leadScore >= 0 &&
      record.leadScore <= 100 &&
      record.funnelSignal.length > 0 &&
      record.nextBestCustomerAction.length > 0
  );
}
