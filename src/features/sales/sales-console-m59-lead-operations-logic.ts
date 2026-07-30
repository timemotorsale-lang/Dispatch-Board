export type SalesLeadChannel = "website" | "phone" | "walk-in" | "marketplace" | "service" | "rental" | "referral";

export type SalesLeadOperationsInput = {
  leadId: string;
  channel: SalesLeadChannel;
  leadAgeMinutes: number;
  lastResponseMinutes?: number;
  duplicateSignals: Array<"same-phone" | "same-email" | "same-vin" | "same-name">;
  requestedLane?: "inventory" | "service" | "rental" | "warranty" | "finance";
  appointmentSet: boolean;
  appointmentCompleted: boolean;
  ownerAvailable: boolean;
  customerIntent: "low" | "medium" | "high";
};

export type SalesLeadOperationsDecision = {
  leadId: string;
  slaRisk: "green" | "yellow" | "red";
  dedupeRisk: "none" | "review" | "likely-duplicate";
  routingRecommendation: "salesperson" | "bdc" | "service" | "rental" | "finance" | "manager-review";
  assignmentRecommendation: string;
  appointmentConversion: "not-set" | "set" | "shown" | "missed";
  escalationTriggers: string[];
  assignmentWriteEnabled: false;
};

export function evaluateSalesLeadOperations(input: SalesLeadOperationsInput): SalesLeadOperationsDecision {
  const responseAge = input.lastResponseMinutes ?? input.leadAgeMinutes;
  const slaRisk = responseAge > 60 ? "red" : responseAge > 30 ? "yellow" : "green";
  const dedupeRisk =
    input.duplicateSignals.length >= 2 ? "likely-duplicate" : input.duplicateSignals.length === 1 ? "review" : "none";
  const escalationTriggers: string[] = [];

  if (slaRisk === "red") escalationTriggers.push("first response SLA breach");
  if (dedupeRisk === "likely-duplicate") escalationTriggers.push("likely duplicate lead");
  if (!input.ownerAvailable && input.customerIntent === "high") escalationTriggers.push("high intent lead needs available owner");

  const routingRecommendation =
    dedupeRisk === "likely-duplicate"
      ? "manager-review"
      : input.requestedLane === "service"
        ? "service"
        : input.requestedLane === "rental"
          ? "rental"
          : input.requestedLane === "finance"
            ? "finance"
            : input.channel === "website" || input.channel === "marketplace"
              ? "bdc"
              : "salesperson";

  const appointmentConversion = input.appointmentCompleted
    ? "shown"
    : input.appointmentSet
      ? "set"
      : input.leadAgeMinutes > 240
        ? "missed"
        : "not-set";

  return {
    leadId: input.leadId,
    slaRisk,
    dedupeRisk,
    routingRecommendation,
    assignmentRecommendation: input.ownerAvailable ? `Route to ${routingRecommendation}` : "Find available owner before assignment",
    appointmentConversion,
    escalationTriggers,
    assignmentWriteEnabled: false
  };
}
