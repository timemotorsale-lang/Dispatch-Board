import type { GrowthAudienceContact, GrowthChannel } from "./domain-engine";

export type GrowthAudienceDecisionStatus = "Included" | "Excluded" | "Suppressed" | "Needs cleanup";

export type GrowthAudienceReasonCode =
  | "CONSENT_OK"
  | "DUPLICATE_CAMPAIGN"
  | "ESCALATION_REVIEW"
  | "INVALID_CHANNEL"
  | "LIFECYCLE_FIT"
  | "MISSING_CONTACT_METHOD"
  | "NO_LIFECYCLE_FIT"
  | "OPT_OUT"
  | "QUIET_WINDOW"
  | "SOURCE_STALE"
  | "UNAVAILABLE_INVENTORY";

export type GrowthAudienceBuilderContact = GrowthAudienceContact & {
  duplicateCampaign?: boolean;
  hasContactMethod?: boolean;
  sourceFresh?: boolean;
  vehicleAvailable?: boolean;
};

export type GrowthAudienceBuilderDecision = {
  contactId: string;
  included: boolean;
  name: string;
  reasonCodes: GrowthAudienceReasonCode[];
  reasons: string[];
  status: GrowthAudienceDecisionStatus;
};

export type GrowthAudienceBuilderSummary = {
  decisions: GrowthAudienceBuilderDecision[];
  counts: Record<GrowthAudienceDecisionStatus, number>;
  readOnly: true;
};

const reasonText: Record<GrowthAudienceReasonCode, string> = {
  CONSENT_OK: "Approved consent exists for this channel.",
  DUPLICATE_CAMPAIGN: "Customer is already in a similar campaign.",
  ESCALATION_REVIEW: "Unresolved escalation needs manager review.",
  INVALID_CHANNEL: "Selected channel is not permitted for this customer.",
  LIFECYCLE_FIT: "Customer has a relevant growth trigger.",
  MISSING_CONTACT_METHOD: "Customer is missing a usable contact method.",
  NO_LIFECYCLE_FIT: "No current lifecycle trigger matches this campaign.",
  OPT_OUT: "Customer opted out.",
  QUIET_WINDOW: "Customer is inside the quiet contact window.",
  SOURCE_STALE: "Source record is stale and needs review.",
  UNAVAILABLE_INVENTORY: "Related inventory is unavailable or stale."
};

export function buildGrowthAudience(
  contacts: GrowthAudienceBuilderContact[],
  channel: GrowthChannel,
  now = new Date("2026-09-07T12:00:00-05:00"),
  quietWindowDays = 7
): GrowthAudienceBuilderSummary {
  const decisions = contacts.map((contact) => decideAudienceContact(contact, channel, now, quietWindowDays));
  const counts = {
    Excluded: 0,
    Included: 0,
    "Needs cleanup": 0,
    Suppressed: 0
  };

  decisions.forEach((decision) => {
    counts[decision.status] += 1;
  });

  return { counts, decisions, readOnly: true };
}

function decideAudienceContact(
  contact: GrowthAudienceBuilderContact,
  channel: GrowthChannel,
  now: Date,
  quietWindowDays: number
): GrowthAudienceBuilderDecision {
  const codes: GrowthAudienceReasonCode[] = [];
  const hasContactMethod = contact.hasContactMethod ?? true;
  const sourceFresh = contact.sourceFresh ?? true;
  const vehicleAvailable = contact.vehicleAvailable ?? true;

  if (contact.optOut) codes.push("OPT_OUT");
  if (!contact.consent[channel]) codes.push("INVALID_CHANNEL");
  if (!hasContactMethod) codes.push("MISSING_CONTACT_METHOD");
  if (contact.lastContactedAt && daysBetween(new Date(contact.lastContactedAt), now) < quietWindowDays) codes.push("QUIET_WINDOW");
  if (contact.duplicateCampaign) codes.push("DUPLICATE_CAMPAIGN");
  if (!sourceFresh) codes.push("SOURCE_STALE");
  if (!vehicleAvailable) codes.push("UNAVAILABLE_INVENTORY");
  if (!contact.lifecycleFit) codes.push("NO_LIFECYCLE_FIT");
  if (contact.hasEscalation) codes.push("ESCALATION_REVIEW");
  if (contact.lifecycleFit && contact.consent[channel] && !contact.optOut) codes.push("CONSENT_OK", "LIFECYCLE_FIT");

  const status = chooseStatus(codes);

  return {
    contactId: contact.customerId,
    included: status === "Included",
    name: contact.name,
    reasonCodes: codes,
    reasons: codes.map((code) => reasonText[code]),
    status
  };
}

function chooseStatus(codes: GrowthAudienceReasonCode[]): GrowthAudienceDecisionStatus {
  if (codes.some((code) => ["DUPLICATE_CAMPAIGN", "INVALID_CHANNEL", "MISSING_CONTACT_METHOD", "OPT_OUT", "QUIET_WINDOW"].includes(code))) {
    return "Suppressed";
  }
  if (codes.some((code) => ["ESCALATION_REVIEW", "SOURCE_STALE", "UNAVAILABLE_INVENTORY"].includes(code))) return "Needs cleanup";
  if (codes.includes("NO_LIFECYCLE_FIT")) return "Excluded";
  return "Included";
}

function daysBetween(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / 86400000;
}
