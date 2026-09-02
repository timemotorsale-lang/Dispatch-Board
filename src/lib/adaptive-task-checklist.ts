export type AdaptiveChecklistItem = { key: string; label: string };
export type AdaptiveSubtaskItem = AdaptiveChecklistItem & { completedWhen?: "started" | "commented" | "closed" };

const workflowAreaBlueprints: Record<string, { items: string[]; code: string }> = {
  SHOP: {
    code: "shop_recon",
    items: [
      "Confirm the repair concern, vehicle condition, and current recon stage",
      "Select the right repair path: internal repair, outside vendor, bodywork, detail/prep, or inspection only",
      "Confirm required parts, labor, vendor, owner, and ETA",
      "Record customer or inventory impact before work continues",
      "Complete the repair or recon action and document the result",
      "Verify final QC, readiness, and release or delivery handoff"
    ]
  },
  INVENTORY: {
    code: "inventory",
    items: [
      "Verify the vehicle, stock record, and current location",
      "Confirm missing inventory, title, keys, photos, parts, or recon requirements",
      "Assign the next owner and operational movement",
      "Update the inventory record with current evidence",
      "Record blocker, ETA, or readiness decision",
      "Confirm the vehicle is ready for its next stage"
    ]
  },
  SALES: {
    code: "sales",
    items: [
      "Verify the customer, vehicle interest, and sales stage",
      "Confirm the required customer follow-up",
      "Document customer needs, objections, or decision",
      "Complete the next sales action",
      "Record the outcome and next commitment",
      "Confirm ownership of the next step"
    ]
  },
  SERVICE_ADVISOR: {
    code: "service_advisor",
    items: [
      "Verify the customer, vehicle, repair order, and current service promise",
      "Confirm the customer concern, authorization need, or requested update",
      "Check shop, parts, appointment, and customer communication context",
      "Complete the advisor action: contact customer, collect decision, set promise, or route support",
      "Record the customer-facing outcome and internal handoff notes",
      "Confirm the next advisor follow-up, owner, and due time before closing"
    ]
  },
  COLLECTIONS: {
    code: "collections",
    items: [
      "Verify the account, balance, and payment history",
      "Confirm the customer contact information",
      "Document the collection contact attempt",
      "Record the payment commitment, dispute, or blocker",
      "Schedule the next account follow-up",
      "Document the final account disposition"
    ]
  },
  ADMIN: {
    code: "admin",
    items: [
      "Identify the customer, vehicle, document, payment, or operational record involved",
      "Verify the missing requirement, proof, signature, or handoff need",
      "Check the canonical record for current status and owner",
      "Complete the safe admin step or route protected work to the authorized owner",
      "Attach or record evidence on the canonical record",
      "Set the next owner, due time, and follow-up action before closing"
    ]
  },
  GENERAL_MANAGER: {
    code: "manager",
    items: [
      "Clarify the operating issue and expected outcome",
      "Confirm owner, urgency, risk, and due time",
      "Decide whether support, reassignment, or escalation is required",
      "Record the management decision and next action",
      "Verify the accountable owner can execute",
      "Confirm no unresolved blocker remains before close"
    ]
  }
};

const blueprints: Array<{ match: RegExp; items: string[]; code: string }> = [
  {
    code: "sales_paperwork",
    match: /sales paperwork|deal packet|buyer'?s order|finance packet|insurance proof|delivery paperwork|selling paperwork/i,
    items: [
      "Link the customer, vehicle, and sales packet before changing paperwork",
      "Verify required buyer, insurance, finance, payment, and delivery documents",
      "Identify missing signatures, proof, approvals, or customer information",
      "Upload or attach the completed paperwork to the canonical sales record",
      "Route financing, accounting, or manager-only decisions to the proper authority",
      "Record what is complete, what is missing, the owner, and the next handoff"
    ]
  },
  {
    code: "front_desk",
    match: /office|admin(?:\/|\s|-)?support|front.?desk|coordinator|support task|paperwork center|clerical/i,
    items: [
      "Identify the exact work lane: customer, vehicle, appointment, repair, parts, sales, payment, or document",
      "Search and link the canonical record before creating or updating anything",
      "Verify the missing document, signature, proof, payment, photo, or handoff requirement",
      "Complete the safe coordinator step or prepare the workflow for the authorized owner",
      "Attach the evidence or note to the canonical record, not a duplicate task trail",
      "Record the blocker, responsible owner, due time, and next handoff"
    ]
  },
  {
    code: "repair",
    match: /brake|vibrat|shake|repair|mechanic|diagnos|inspection|engine|transmission|tire|noise|service/i,
    items: [
      "Confirm the reported symptom and operating conditions",
      "Inspect the affected safety or mechanical system",
      "Document diagnostic findings and root cause",
      "Identify required parts, labor, or outside service",
      "Record the repair plan and customer impact",
      "Verify the completed repair and final outcome"
    ]
  },
  {
    code: "title",
    match: /title|registration|dmv|document|paperwork|lien|odometer/i,
    items: [
      "Verify the customer, vehicle, and sale record",
      "Review the internal paperwork file",
      "Confirm submission or rejection status",
      "Contact the processor, DMV, or responsible vendor",
      "Record the customer update and next follow-up time",
      "Document resolution evidence and manager review"
    ]
  },
  {
    code: "customer",
    match: /customer|call|contact|complaint|follow.?up|message|email/i,
    items: [
      "Verify the customer and preferred contact method",
      "Confirm the concern and expected outcome",
      "Complete the required customer contact",
      "Document the customer response",
      "Assign the next action and follow-up time",
      "Confirm the customer received the final update"
    ]
  },
  {
    code: "collections",
    match: /payment|past due|collection|balance|promise to pay|account/i,
    items: [
      "Verify the account, balance, and payment history",
      "Confirm the customer contact information",
      "Document the collection contact attempt",
      "Record the payment commitment or dispute",
      "Schedule the next account follow-up",
      "Document the final account disposition"
    ]
  },
  {
    code: "inventory",
    match: /inventory|stock|lot|vehicle photo|listing|recon/i,
    items: [
      "Verify the vehicle and stock record",
      "Inspect the vehicle's current operational status",
      "Identify missing inventory requirements",
      "Assign required reconditioning or merchandising work",
      "Update the inventory record with evidence",
      "Confirm the vehicle is ready for its next stage"
    ]
  },
  {
    code: "sales",
    match: /lead|deal|sale|test drive|proposal|financ|delivery/i,
    items: [
      "Verify the customer, vehicle interest, and deal stage",
      "Confirm the required sales follow-up",
      "Document customer needs and objections",
      "Complete the next sales action",
      "Record the outcome and next commitment",
      "Confirm ownership of the next step"
    ]
  }
];

const legacyGenericItems = [
  "Clarify the required outcome and supporting context",
  "Confirm the responsible owner and due time",
  "Complete the primary operational action",
  "Document evidence of the work performed",
  "Notify the affected stakeholder of the outcome",
  "Confirm no required follow-up remains open"
];

const generalItems = [
  "Identify the customer, vehicle, account, document, or operational record involved",
  "Confirm the specific missing requirement, blocker, or requested outcome",
  "Check the canonical record for existing notes, status, attachments, and owner",
  "Complete the safe next step or route protected work to the authorized role",
  "Document the evidence, customer/staff update, or reason work cannot continue",
  "Set the next owner, due time, and follow-up action before closing the task"
];

const workflowAreaSubtaskBlueprints: Record<string, { items: AdaptiveSubtaskItem[]; code: string }> = {
  SHOP: {
    code: "shop_recon_subtask",
    items: [
      { key: "concern", label: "Confirm repair concern and vehicle condition", completedWhen: "started" },
      { key: "path", label: "Choose repair path: internal, outside vendor, bodywork, detail/prep, or inspection only" },
      { key: "resources", label: "Confirm parts, labor, vendor owner, and ETA" },
      { key: "impact", label: "Record customer or inventory impact", completedWhen: "commented" },
      { key: "qc", label: "Complete final QC and release or delivery handoff", completedWhen: "closed" }
    ]
  },
  INVENTORY: {
    code: "inventory_subtask",
    items: [
      { key: "vehicle", label: "Verify vehicle, stock record, and location", completedWhen: "started" },
      { key: "missing", label: "Identify missing inventory, title, keys, parts, photos, or recon items" },
      { key: "owner", label: "Assign owner and next movement" },
      { key: "record", label: "Update the inventory record with evidence", completedWhen: "commented" },
      { key: "ready", label: "Confirm next-stage readiness", completedWhen: "closed" }
    ]
  },
  SALES: {
    code: "sales_subtask",
    items: [
      { key: "customer", label: "Confirm customer, vehicle interest, and sales stage", completedWhen: "started" },
      { key: "contact", label: "Complete the required customer follow-up" },
      { key: "outcome", label: "Record customer outcome and next commitment", completedWhen: "commented" },
      { key: "owner", label: "Confirm owner of the next sales step", completedWhen: "closed" }
    ]
  },
  SERVICE_ADVISOR: {
    code: "service_advisor_subtask",
    items: [
      { key: "context", label: "Confirm customer, vehicle, RO, promise, and advisor context", completedWhen: "started" },
      { key: "need", label: "Identify the customer decision, update, authorization, or handoff needed" },
      { key: "coordinate", label: "Coordinate shop, parts, appointment, or manager support" },
      { key: "customer_update", label: "Record customer-facing update and internal advisor note", completedWhen: "commented" },
      { key: "follow_up", label: "Set the next advisor follow-up, owner, and due time", completedWhen: "closed" }
    ]
  }
};

export function buildAdaptiveTaskChecklist(input: { description?: string | null; title: string; workflowArea?: string | null }): AdaptiveChecklistItem[] {
  const searchable = `${input.title} ${input.description ?? ""} ${input.workflowArea ?? ""}`;
  const workflowBlueprint = input.workflowArea ? workflowAreaBlueprints[input.workflowArea] : undefined;
  const blueprint = workflowBlueprint ?? blueprints.find((candidate) => candidate.match.test(searchable));
  const code = blueprint?.code ?? "general";
  return (blueprint?.items ?? generalItems).map((label, index) => ({ key: `${code}_${index + 1}`, label }));
}

export function buildAdaptiveTaskSubtasks(input: { workflowArea?: string | null }): AdaptiveSubtaskItem[] {
  const blueprint = input.workflowArea ? workflowAreaSubtaskBlueprints[input.workflowArea] : undefined;
  if (!blueprint) return [];

  return blueprint.items.map((item, index) => ({
    ...item,
    key: `${blueprint.code}_${item.key || index + 1}`
  }));
}

export function isLegacyGenericAdaptiveChecklist(labels: string[]) {
  return labels.length === legacyGenericItems.length &&
    labels.every((label, index) => label === legacyGenericItems[index]);
}

export function isKnownAdaptiveChecklist(labels: string[]) {
  const knownItemSets = [
    legacyGenericItems,
    generalItems,
    ...blueprints.map((blueprint) => blueprint.items),
    ...Object.values(workflowAreaBlueprints).map((blueprint) => blueprint.items)
  ];

  return knownItemSets.some((items) =>
    labels.length === items.length &&
    labels.every((label, index) => label === items[index])
  );
}

export function isKnownAdaptiveChecklistLabel(label: string) {
  const knownLabels = [
    ...legacyGenericItems,
    ...generalItems,
    ...blueprints.flatMap((blueprint) => blueprint.items),
    ...Object.values(workflowAreaBlueprints).flatMap((blueprint) => blueprint.items)
  ];

  return knownLabels.includes(label);
}

export function isKnownAdaptiveSubtaskLabel(label: string) {
  const knownLabels = Object.values(workflowAreaSubtaskBlueprints)
    .flatMap((blueprint) => blueprint.items)
    .map((item) => item.label);

  return knownLabels.includes(label);
}
