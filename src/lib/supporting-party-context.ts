export const supportingPartyTypes = [
  "vendor",
  "government_agency",
  "lender",
  "warranty_company",
  "insurance_company",
  "towing_company",
  "auction",
  "parts_supplier",
  "contractor",
  "other",
] as const;

export type SupportingPartyType = (typeof supportingPartyTypes)[number];
export type SupportingPartySubjectType = "CUSTOMER" | "VEHICLE" | "TASK" | "REPAIR_ORDER" | "WORKBOOK_ITEM";

export type SupportingParty = {
  contactName?: string | null;
  email?: string | null;
  id: string;
  name: string;
  phoneNumber?: string | null;
  type: SupportingPartyType;
};

export type SupportingPartyAssociation = {
  active?: boolean;
  href?: string | null;
  partyId: string;
  relationship: string;
  subjectId: string;
  subjectTitle?: string | null;
  subjectType: SupportingPartySubjectType;
};

export type SupportingPartyInteraction = {
  channel: "EMAIL" | "IN_PERSON" | "PHONE" | "SMS" | "SYSTEM" | "OTHER";
  direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
  followUpAt?: string | null;
  id: string;
  occurredAt: string;
  ownerUserId?: string | null;
  partyId: string;
  reportWorthy?: boolean;
  sourceHref?: string | null;
  summary: string;
};

export type SupportingPartyContext = {
  associations: Array<SupportingPartyAssociation & { label: string }>;
  openFollowUps: SupportingPartyInteraction[];
  party: SupportingParty & { typeLabel: string };
  reportSeeds: Array<{ id: string; sourceHref: string | null; text: string }>;
  timeline: Array<{ detail: string; href: string | null; id: string; occurredAt: string; title: string }>;
  workbookCandidates: Array<{ dueAt: string; sourceHref: string | null; title: string }>;
};

const labels: Record<SupportingPartyType, string> = {
  auction: "Auction",
  contractor: "Contractor",
  government_agency: "Government agency",
  insurance_company: "Insurance company",
  lender: "Lender",
  other: "Other supporting party",
  parts_supplier: "Parts supplier",
  towing_company: "Towing company",
  vendor: "Vendor",
  warranty_company: "Warranty company",
};

export function supportingPartyTypeLabel(type: SupportingPartyType) {
  return labels[type] ?? labels.other;
}

export function normalizeSupportingPartyType(value: string | null | undefined): SupportingPartyType {
  const normalized = String(value ?? "").trim().toLowerCase().replaceAll(/[\s-]+/g, "_");
  return supportingPartyTypes.includes(normalized as SupportingPartyType) ? normalized as SupportingPartyType : "other";
}

export function supportingPartyTypeForVendorType(value: string | null | undefined): SupportingPartyType {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (["TRANSPORT", "TOWING"].includes(normalized)) return "towing_company";
  if (["PARTS", "PARTS_SUPPLIER"].includes(normalized)) return "parts_supplier";
  if (["WARRANTY", "WARRANTY_COMPANY"].includes(normalized)) return "warranty_company";
  if (["AUCTION"].includes(normalized)) return "auction";
  if (["CONTRACTOR"].includes(normalized)) return "contractor";
  return "vendor";
}

function associationLabel(association: SupportingPartyAssociation) {
  const title = association.subjectTitle ?? `${association.subjectType} ${association.subjectId}`;
  return `${association.relationship} - ${title}`;
}

export function buildSupportingPartyContext(input: {
  associations?: SupportingPartyAssociation[];
  interactions?: SupportingPartyInteraction[];
  party: SupportingParty;
}): SupportingPartyContext {
  const associations = (input.associations ?? [])
    .filter((association) => association.partyId === input.party.id)
    .map((association) => ({ ...association, label: associationLabel(association) }));
  const interactions = (input.interactions ?? []).filter((interaction) => interaction.partyId === input.party.id);
  const openFollowUps = interactions
    .filter((interaction) => Boolean(interaction.followUpAt))
    .sort((left, right) => String(left.followUpAt).localeCompare(String(right.followUpAt)) || left.occurredAt.localeCompare(right.occurredAt));

  return {
    associations,
    openFollowUps,
    party: { ...input.party, typeLabel: supportingPartyTypeLabel(input.party.type) },
    reportSeeds: interactions
      .filter((interaction) => interaction.reportWorthy)
      .map((interaction) => ({ id: interaction.id, sourceHref: interaction.sourceHref ?? null, text: `${input.party.name}: ${interaction.summary}` })),
    timeline: interactions
      .map((interaction) => ({
        detail: `${supportingPartyTypeLabel(input.party.type)} - ${interaction.channel.toLowerCase().replaceAll("_", " ")}`,
        href: interaction.sourceHref ?? null,
        id: interaction.id,
        occurredAt: interaction.occurredAt,
        title: interaction.summary,
      }))
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || left.id.localeCompare(right.id)),
    workbookCandidates: openFollowUps.map((interaction) => ({
      dueAt: interaction.followUpAt!,
      sourceHref: interaction.sourceHref ?? null,
      title: `Follow up with ${input.party.name}: ${interaction.summary}`,
    })),
  };
}
