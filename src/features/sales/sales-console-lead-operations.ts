export type SalesConsoleLeadState =
  | "New"
  | "Dedupe Review"
  | "Attempting"
  | "Contacted"
  | "Appointment Set"
  | "Nurture"
  | "Disqualified";

export type SalesConsoleLeadRecord = {
  id: string;
  customer: string;
  state: SalesConsoleLeadState;
  source: string;
  sla: string;
  owner: string;
  preferredChannel: string;
  vehicleInterest: string;
  financingIntent: string;
  nextAction: string;
  duplicateRisk: string;
};

export const salesConsoleLeadStates: SalesConsoleLeadState[] = [
  "New",
  "Dedupe Review",
  "Attempting",
  "Contacted",
  "Appointment Set",
  "Nurture",
  "Disqualified"
];

export const salesConsoleLeadRecords: SalesConsoleLeadRecord[] = [
  {
    id: "LEAD-2401",
    customer: "Maria Garcia",
    state: "Dedupe Review",
    source: "Phone Up",
    sla: "45m at risk",
    owner: "BDC Queue",
    preferredChannel: "Call",
    vehicleInterest: "2019 Honda CR-V EX",
    financingIntent: "Financing product",
    nextAction: "Review possible duplicate before assignment",
    duplicateRisk: "High"
  },
  {
    id: "LEAD-2402",
    customer: "Angela Smith",
    state: "New",
    source: "Website",
    sla: "8m current",
    owner: "Nina P.",
    preferredChannel: "Text opt-in",
    vehicleInterest: "BHPH SUV under $18K",
    financingIntent: "BHPH",
    nextAction: "Acknowledge lead and qualify purchase horizon",
    duplicateRisk: "Low"
  },
  {
    id: "LEAD-2403",
    customer: "Robert King",
    state: "Appointment Set",
    source: "Referral",
    sla: "current",
    owner: "James K.",
    preferredChannel: "Call",
    vehicleInterest: "Cash truck buyer",
    financingIntent: "Cash sale",
    nextAction: "Confirm appointment and vehicle availability",
    duplicateRisk: "None"
  }
];

export function salesConsoleLeadOperationsCoversCoreStates() {
  const represented = new Set(salesConsoleLeadStates);

  return ["New", "Dedupe Review", "Attempting", "Contacted", "Appointment Set", "Nurture", "Disqualified"].every((state) =>
    represented.has(state as SalesConsoleLeadState)
  );
}

export function salesConsoleLeadOperationsRemainControlled() {
  return salesConsoleLeadRecords.every((lead) => lead.id && lead.nextAction && lead.owner);
}
