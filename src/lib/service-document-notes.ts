export const CUSTOMER_ESTIMATE_APPROVAL_NOTE = "Work begins after your approval. Any additional work or charges require your approval before proceeding.";

const LEGACY_ESTIMATE_NOTES = new Set([
  "Labor hours are provisional planning allowances, not validated vehicle-specific standards.",
  "Only separately recorded exact-version customer authorization permits repair execution.",
]);

// Preserve saved document records while simplifying their customer-facing copy.
export function customerDocumentNotes(notes: string[]): string[] {
  let approvalIncluded = notes.includes(CUSTOMER_ESTIMATE_APPROVAL_NOTE);
  return notes.flatMap(note => {
    if (!LEGACY_ESTIMATE_NOTES.has(note)) return [note];
    if (approvalIncluded) return [];
    approvalIncluded = true;
    return [CUSTOMER_ESTIMATE_APPROVAL_NOTE];
  });
}
