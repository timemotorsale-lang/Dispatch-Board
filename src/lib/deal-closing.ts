export const closingPathways = [
  { id: "cash", code: "P01", label: "Cash retail purchase", detail: "Purchase packet, accepted funds, title and customer-copy checks.", decision: "Approve the retail forms and funds-verification process." },
  { id: "outside-finance", code: "P02", label: "Outside bank / credit union", detail: "Retail purchase plus verified lender instructions, lienholder and funding evidence.", decision: "Confirm whether the bank or dealership is the original creditor." },
  { id: "dealer-finance", code: "P03", label: "Dealer-arranged financing", detail: "Approved credit disclosures, installment contract, lender stipulations and funding reconciliation.", decision: "Approve the actual creditor, finance platform and lender-supported contracts." },
  { id: "dealer-retained", code: "P04", label: "Dealer-retained financing / BHPH", detail: "Separate credit, licensing, servicing, notices and collections responsibilities.", decision: "Deferred public offering; legal and servicing approval required." },
  { id: "closed-end-lease", code: "P05", label: "Closed-end lease", detail: "Approved lease packet with return, mileage, wear and purchase-option terms.", decision: "Not automatically lease-to-own. Approve lessor, tax treatment and end-of-term operations." },
  { id: "open-end-lease", code: "P06", label: "Open-end lease", detail: "Separate residual-value liability, disclosures and end-of-term reconciliation.", decision: "Approve residual-risk rules and consumer/commercial applicability." },
  { id: "lease-purchase", code: "P07", label: "Lease-to-own proposal", detail: "A marketing label cannot determine the legal contract or tax pathway.", decision: "Blocked pending counsel's written classification of the actual transaction." },
  { id: "lease-buyout", code: "P08", label: "Lease buyout purchase", detail: "Linked purchase with current lessor authorization, payoff, title and funding route.", decision: "Approve the buyout as a distinct purchase, not a relabeled lease." }
] as const;

export type ClosingPathway = typeof closingPathways[number]["id"];
export const closingReviewStates = ["PENDING", "REVIEWED", "BLOCKED", "NOT_APPLICABLE"] as const;
export type ClosingReviewState = typeof closingReviewStates[number];
export const closingStateLabels: Record<ClosingReviewState, string> = { PENDING: "Not reviewed", REVIEWED: "Evidence reviewed", BLOCKED: "Blocked / needs follow-up", NOT_APPLICABLE: "Not applicable — reason recorded" };

const commonChecks = [
  { id: "classification", label: "Deal classification & approved rules", owner: "Finance / compliance reviewer", detail: "Verify parties, jurisdiction, product classification, approved form versions and the applicable legal deadlines.", canExclude: false },
  { id: "identity", label: "Participants & authority", owner: "Sales / authorized reviewer", detail: "Verify identity, signer authority and co-buyer access boundaries. Do not paste identity numbers here.", canExclude: false },
  { id: "packet", label: "Current document packet", owner: "Finance / title reviewer", detail: "Reconcile final terms, disclosures, signatures, odometer requirements, originals and document-specific signing acceptance.", canExclude: false },
  { id: "copies", label: "Customer copies & signing evidence", owner: "Documents reviewer", detail: "Record timely delivery evidence, consent where applicable and the exact completed document versions. A sent email alone is not delivery evidence.", canExclude: false },
  { id: "funds", label: "Funds verification", owner: "Accounting / finance", detail: "Reference the controlled bank or lender evidence and reconciliation. A screenshot or payment redirect is not sufficient.", canExclude: false },
  { id: "title", label: "Title, lien & registration arrangements", owner: "Title specialist", detail: "Verify ownership, liens, accepted originals, submission requirements and lawful operating arrangements.", canExclude: false },
  { id: "insurance", label: "Insurance requirements", owner: "Finance / delivery reviewer", detail: "Determine the actual legal and lender requirements; reference verification or the approved non-applicability reason.", canExclude: true },
  { id: "trade", label: "Trade-in / payoff / optional products", owner: "Finance / title reviewer", detail: "Review actual selected products, trade ownership, current payoff, permissions and associated documents, or record why none apply.", canExclude: true },
  { id: "handoff", label: "Vehicle readiness & recipient", owner: "Delivery coordinator", detail: "Verify current VIN, availability, condition, mileage, keys, authorized recipient or carrier and open promises. This review does not transfer custody.", canExclude: false },
  { id: "follow-up", label: "Post-handoff ownership", owner: "Closing manager", detail: "Reference the accountable owners, deadlines and escalation for title, lender funding, payoffs, customer copies and open commitments.", canExclude: false }
] as const;

export function closingChecks(pathway: ClosingPathway) {
  const checks: Array<{ id: string; label: string; owner: string; detail: string; canExclude: boolean }> = [...commonChecks];
  if (["outside-finance", "dealer-finance", "dealer-retained"].includes(pathway)) checks.push({ id: "credit", label: "Creditor, lender & servicing requirements", owner: "Finance manager", detail: "Reference approved creditor classification, disclosures, lender conditions and servicing ownership. Approval is not funding.", canExclude: false });
  if (["closed-end-lease", "open-end-lease", "lease-purchase"].includes(pathway)) checks.push({ id: "lease", label: "Lease classification & lifecycle", owner: "Lessor / legal / finance", detail: "Reference written classification, approved lease disclosures and tax rules, residual treatment and ownership of return, renewal or buyout tasks.", canExclude: false });
  if (pathway === "lease-buyout") checks.push({ id: "buyout", label: "Lessor authorization & linked purchase", owner: "Finance / title reviewer", detail: "Reference the original lease, permitted buyer, current buyout amount and expiration, and new purchase funding classification.", canExclude: false });
  return checks;
}

export type ClosingCheckReview = { id: string; state: ClosingReviewState; evidence: string; reviewedBy: string; reviewedAt: string };
export type ClosingReview = { version: 1; pathway: ClosingPathway; classificationNote: string; jacketRevision: number; savedBy: string; savedByName?: string; savedAt: string; checks: ClosingCheckReview[] };

export function isClosingPathway(value: unknown): value is ClosingPathway {
  return closingPathways.some(pathway => pathway.id === value);
}

export function suggestedClosingPathway(legacyPathway: string): ClosingPathway | null {
  return ({ "retail-sale": "cash", "outside-finance-one-pay": "outside-finance", finance: "dealer-finance", bhph: "dealer-retained", "lease-to-own": "lease-purchase" } as Record<string, ClosingPathway>)[legacyPathway] ?? null;
}

export function closingReviewSummary(review: ClosingReview | null, jacketRevision: number) {
  const stale = Boolean(review && review.jacketRevision !== jacketRevision);
  const checks = review ? closingChecks(review.pathway) : [];
  const resolved = review && !stale ? checks.filter(check => review.checks.some(item => item.id === check.id && (item.state === "REVIEWED" || (item.state === "NOT_APPLICABLE" && check.canExclude)))).length : 0;
  return { stale, resolved, total: checks.length, releaseAllowed: false as const, signingAllowed: false as const, label: !review ? "Preparation not started" : stale ? "Deal changed — re-review required" : resolved === checks.length ? "Preparation reviewed — live completion still blocked" : "Preparation review in progress" };
}
