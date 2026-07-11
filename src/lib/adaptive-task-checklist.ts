export type AdaptiveChecklistItem = { key: string; label: string };

const blueprints: Array<{ match: RegExp; items: string[]; code: string }> = [
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

const generalItems = [
  "Clarify the required outcome and supporting context",
  "Confirm the responsible owner and due time",
  "Complete the primary operational action",
  "Document evidence of the work performed",
  "Notify the affected stakeholder of the outcome",
  "Confirm no required follow-up remains open"
];

export function buildAdaptiveTaskChecklist(input: { description?: string | null; title: string; workflowArea?: string | null }): AdaptiveChecklistItem[] {
  const searchable = `${input.title} ${input.description ?? ""} ${input.workflowArea ?? ""}`;
  const blueprint = blueprints.find((candidate) => candidate.match.test(searchable));
  const code = blueprint?.code ?? "general";
  return (blueprint?.items ?? generalItems).map((label, index) => ({ key: `${code}_${index + 1}`, label }));
}
