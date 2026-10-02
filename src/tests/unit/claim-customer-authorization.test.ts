import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { CLAIM_AUTHORIZATION_VERSION, claimPermissionStatus, validateClaimAuthorizationUpload } from "@/lib/claim-customer-authorization";
import { createClaimCustomerAuthorizationPdf } from "@/server/claims-workspace/customer-authorization-pdf";
import { attachClaimEvidence, createInMemoryClaimsWorkspaceRepository, getClaimWorkspaceReadModel } from "@/server/claims-workspace/service";
const signed = { version: CLAIM_AUTHORIZATION_VERSION, signer: "Review Customer", signedDate: "2026-10-01", signatureVerified: true, copyProvided: true, directPaySelected: true };
const record = { category: "CLAIM_COMMUNICATION", status: "RECEIVED", documentLibraryId: "signed-pdf", notes: JSON.stringify(signed), createdAt: "2026-10-01T14:00:00Z" };
function form() {
  const data = new FormData(); for (const [key, value] of Object.entries({ signer: "Review Customer", signedDate: "2026-10-01", capacity: "OWNER", signatureVerified: "true", copyProvided: "true", communicationSelected: "true" })) data.set(key, value); return data;
}
const actor = { id: "advisor", name: "Review Advisor", email: "review@example.com", isActive: true, roles: ["Service Advisor"], duties: { all: [], direct: [], roleDefaults: [] } };
describe("claim customer authorization", () => {
  it("does not infer communication or direct payment from legacy repair authorization", () => {
    expect(claimPermissionStatus([{ ...record, category: "AUTHORIZATION" }], "CLAIM_COMMUNICATION")).toBe("Missing");
    expect(claimPermissionStatus([{ ...record, category: "AUTHORIZATION" }], "CLAIM_DIRECT_PAY")).toBe("Missing");
  });
  it("requires a stored signed copy, verification, and customer copy confirmation", () => {
    expect(claimPermissionStatus([record], "CLAIM_COMMUNICATION")).toBe("Verified signed copy");
    for (const notes of ["Unsigned document", JSON.stringify({ ...signed, signatureVerified: false }), JSON.stringify({ ...signed, copyProvided: false })]) expect(claimPermissionStatus([{ ...record, notes }], "CLAIM_COMMUNICATION")).toBe("Needs verification");
    expect(claimPermissionStatus([{ ...record, documentLibraryId: undefined }], "CLAIM_COMMUNICATION")).toBe("Needs verification");
  });
  it("tracks an optional payment election and separate withdrawal chronologically", () => {
    expect(claimPermissionStatus([record], "CLAIM_DIRECT_PAY")).toBe("Verified signed copy");
    expect(claimPermissionStatus([{ ...record, notes: JSON.stringify({ ...signed, directPaySelected: undefined }) }], "CLAIM_DIRECT_PAY")).toBe("Needs verification");
    expect(claimPermissionStatus([{ ...record, notes: JSON.stringify({ ...signed, directPaySelected: false }) }], "CLAIM_DIRECT_PAY")).toBe("Not selected");
    const withdrawal = { ...record, category: "CLAIM_DIRECT_PAY", status: "BLOCKED", createdAt: "2026-10-02T15:00:00Z" };
    expect(claimPermissionStatus([withdrawal, record], "CLAIM_DIRECT_PAY")).toBe("Withdrawn");
    expect(claimPermissionStatus([record, withdrawal], "CLAIM_COMMUNICATION")).toBe("Verified signed copy");
  });
  it("validates signature dates, capacity, and required attestations", () => {
    expect(validateClaimAuthorizationUpload(form(), new Date("2026-10-02"))).toMatchObject({ directPaySelected: false, capacity: "OWNER" });
    for (const [key, value] of [["signedDate", "2026-02-30"], ["signedDate", "2026-10-03"], ["capacity", "OTHER"], ["signatureVerified", "false"], ["copyProvided", "false"]]) { const data = form(); data.set(key, value); expect(() => validateClaimAuthorizationUpload(data, new Date("2026-10-02"))).toThrow(); }
    const data = form(); data.set("capacity", "AUTHORIZED_REPRESENTATIVE"); expect(() => validateClaimAuthorizationUpload(data)).toThrow("authority");
  });
  it("stores claim permissions without reclassifying them as an estimate or repair approval", async () => {
    const repository = createInMemoryClaimsWorkspaceRepository();
    const result = await attachClaimEvidence(actor, "claim-demo-1", { category: "CLAIM_COMMUNICATION", title: "Signed authorization with estimate and payment terms", notes: JSON.stringify(signed), documentLibraryId: "signed-pdf", status: "RECEIVED", relationshipTargets: ["CLAIM", "CUSTOMER"] }, { repository });
    expect(result.evidence.at(-1)?.category).toBe("CLAIM_COMMUNICATION");
    expect(result.checklist.find((item) => item.category === "AUTHORIZATION")?.state).not.toBe("RECEIVED");
    expect(result.claim.approvedAmountCents).toBeUndefined();
  });
  it("generates an unsigned branded PDF with an unchecked optional payment field", async () => {
    const model = await getClaimWorkspaceReadModel(actor, "claim-demo-1", { repository: createInMemoryClaimsWorkspaceRepository() });
    const before = model.evidence.length;
    const pdf = await PDFDocument.load(await createClaimCustomerAuthorizationPdf(model.claim));
    expect(pdf.getAuthor()).toBe("Time Motor Sales, Inc.");
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getForm().getCheckBox("direction_to_pay").isChecked()).toBe(false);
    expect(model.evidence).toHaveLength(before);
  });
});
