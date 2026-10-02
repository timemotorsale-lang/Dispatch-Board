export const CLAIM_AUTHORIZATION_VERSION = "claim-customer-authorization/v1";
export const CLAIM_PERMISSION_CATEGORIES = ["CLAIM_COMMUNICATION", "CLAIM_DIRECT_PAY"] as const;
export type ClaimPermissionCategory = typeof CLAIM_PERMISSION_CATEGORIES[number];
export const CLAIM_AUTHORIZATION_HEADER = {
  name: "Time Motor Sales, Inc.", address: "1101 E. Lake Street, Minneapolis, MN 55407",
  phone: "612-724-3631", website: "timemotors.net", email: "timemotorsale@gmail.com"
};
export const CLAIM_AUTHORIZATION_CLAUSES = [
  ["1. Limited claim communication", "I authorize Time Motor Sales to exchange information reasonably necessary for this vehicle's property-damage claim with the identified insurer, adjuster, claim administrator, and applicable lienholder. Information may include my contact details, vehicle details, damage photos, estimates, inspection findings, supplements, invoices, and payment status. This permission is limited to this claim; it is not a marketing consent."],
  ["2. Repair coordination, not settlement representation", "The dealership may arrange inspections and explain its documented repair scope and charges, only as permitted by law. It is not appointed as my public adjuster, attorney, or general agent and may not negotiate or accept a settlement on my behalf, release claims, waive rights, select a repair shop for me, transfer ownership, or endorse another person's check. I personally select my repair facility."],
  ["3. Optional direction to pay", "Only if I select the payment option below, I request that the insurer pay Time Motor Sales directly for separately authorized, itemized services on this vehicle, up to the amount lawfully due for those services. This request is not an assignment of my policy or claim and does not guarantee insurer acceptance or coverage, override lienholder or joint-payee rights, or authorize receipt of unrelated claim proceeds. Overpayments must be reconciled and returned to the proper party."],
  ["4. Separate repair approval and customer charges", "This agreement does not authorize teardown, diagnostic fees, repairs, storage fees, or unlimited additional work. Scope, price, fees, and supplements require separate disclosures and authorization as applicable. My deductible and any noncovered services I separately approve remain my responsibility as permitted by law. An insurer's reduction, delay, or denial alone does not establish that I agreed to pay a disputed difference."],
  ["5. Duration, withdrawal, and records", "Permission ends when this claim's authorized services and payment reconciliation are complete, or when the dealership receives my written withdrawal at the address or email above. Withdrawal applies prospectively and does not cancel separately authorized services, accrued lawful obligations, or record retention required by law. I retain my policy rights and statutory protections. I receive a copy of this agreement."],
  ["6. Signer confirmation", "I confirm that I am the vehicle owner or have authority to sign for the owner. My signature authorizes communication under this agreement. Direct payment is authorized only when its separate option is selected. No insurer payment or repair approval is represented by my signature on this form."]
] as const;
type PermissionEvidence = { category: string; status: string; documentLibraryId?: string | null; notes?: string | null; createdAt: string | Date };
export function claimPermissionStatus(records: PermissionEvidence[], category: ClaimPermissionCategory) {
  const latest = records.filter((item) => item.category === category || category === "CLAIM_DIRECT_PAY" && item.category === "CLAIM_COMMUNICATION" && item.status === "RECEIVED").sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).at(-1);
  if (!latest) return "Missing";
  if (latest.status === "BLOCKED") return "Withdrawn";
  try {
    const record = JSON.parse(latest.notes ?? "{}");
    if (category === "CLAIM_DIRECT_PAY" && record.directPaySelected === false) return "Not selected";
    if (category === "CLAIM_DIRECT_PAY" && record.directPaySelected !== true) return "Needs verification";
    return latest.status === "RECEIVED" && latest.documentLibraryId && record.version === CLAIM_AUTHORIZATION_VERSION && record.signatureVerified === true && record.copyProvided === true && record.signer && record.signedDate ? "Verified signed copy" : "Needs verification";
  } catch { return "Needs verification"; }
}
export function validateClaimAuthorizationUpload(form: FormData, now = new Date()) {
  const value = (key: string) => String(form.get(key) ?? "").trim();
  const signer = value("signer"); const signedDate = value("signedDate"); const capacity = value("capacity");
  if (!signer || signer.length > 200 || !["OWNER", "AUTHORIZED_REPRESENTATIVE"].includes(capacity)) throw new Error("Record the signer and their authority to sign.");
  const parsed = new Date(`${signedDate}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(signedDate) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== signedDate || signedDate > now.toISOString().slice(0, 10)) throw new Error("Record a valid signature date that is not in the future.");
  if (value("signatureVerified") !== "true" || value("copyProvided") !== "true" || value("communicationSelected") !== "true") throw new Error("Verify the signed communication permission and confirm that a copy was provided to the customer.");
  if (capacity === "AUTHORIZED_REPRESENTATIVE" && !value("authorityDetails")) throw new Error("Record the representative's authority to sign for the owner.");
  return { version: CLAIM_AUTHORIZATION_VERSION, signer, signedDate, capacity, authorityDetails: value("authorityDetails").slice(0, 500), signatureVerified: true, copyProvided: true, directPaySelected: value("directPaySelected") === "true" };
}
