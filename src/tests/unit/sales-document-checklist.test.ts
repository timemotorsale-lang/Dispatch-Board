import { describe, expect, it } from "vitest";
import { closingChecklist, type JacketDocument } from "@/server/sales-documents/domain";
import { SALES_DOCUMENT_PATHWAYS, normalizeSalesDocumentType, salesDocumentRequirements } from "@/lib/sales-document-pathways";

const document = (overrides: Partial<JacketDocument> = {}): JacketDocument => ({ id: "doc", type: "signed-agreement", reviewed: true, signed: true, source: "MANUAL_UPLOAD", versionId: "v1", checksum: "checksum", fileName: "agreement.pdf", contentType: "application/pdf", ...overrides });

describe("Sales Documents closing controls", () => {
  it("defines a checklist for every Deal Desk pathway", () => {
    for (const pathway of Object.keys(SALES_DOCUMENT_PATHWAYS) as Array<keyof typeof SALES_DOCUMENT_PATHWAYS>) {
      const requirements = salesDocumentRequirements(pathway);
      expect(requirements.some((item) => item.required)).toBe(true);
      expect(new Set(requirements.map((item) => item.id)).size).toBe(requirements.length);
    }
  });
  it("separates checkout and return for rentals, loaners and test drives", () => {
    for (const pathway of ["daily-rental", "vehicle-loaner", "test-drive"] as const) {
      const requirements = salesDocumentRequirements(pathway);
      expect(closingChecklist(requirements, [], "CHECKOUT").map((item) => item.id)).toContain("signed-agreement");
      expect(closingChecklist(requirements, [], "RETURN").map((item) => item.id)).toEqual(["return-condition", "return-receipt"]);
    }
  });
  it("requires staff review and verified uploaded signatures", () => {
    const requirements = salesDocumentRequirements("daily-rental");
    for (const invalid of [{ reviewed: false }, { signed: false }, { source: "GENERATED" }]) {
      expect(closingChecklist(requirements, [document(invalid)], "CHECKOUT")[0].ready).toBe(false);
    }
    expect(closingChecklist(requirements, [document()], "CHECKOUT")[0].ready).toBe(true);
  });
  it("does not reuse older approval when a replacement is pending review", () => {
    const checklist = closingChecklist(salesDocumentRequirements("daily-rental"), [document({ id: "replacement", reviewed: false }), document({ id: "old" })], "CHECKOUT");
    expect(checklist[0].ready).toBe(false);
    expect(checklist[0].documentId).toBeNull();
  });
  it("prioritizes uploaded copies over generated drafts", () => {
    expect(closingChecklist(salesDocumentRequirements("daily-rental"), [document({ source: "GENERATED", id: "draft" }), document()], "CHECKOUT")[0].documentId).toBe("doc");
  });
  it("retains explicit exception reasons and leaves optional items unblocked", () => {
    const requirements = salesDocumentRequirements("retail-sale");
    requirements[0].waiver = { by: "manager", at: "2026-10-02", reason: "Documented exception" };
    const checklist = closingChecklist(requirements, [], "CLOSING");
    expect(checklist[0].ready).toBe(true);
    expect(checklist[0].waiver?.reason).toBe("Documented exception");
    expect(checklist.find((item) => item.id === "trade-documents")?.blocker).toBeNull();
  });
  it("maps existing BHPH and lease forms into the shared checklist", () => {
    expect(normalizeSalesDocumentType("bhph-installment-contract")).toBe("retail-installment-contract");
    expect(normalizeSalesDocumentType("bhph-payment-schedule-servicing")).toBe("payment-schedule");
    expect(normalizeSalesDocumentType("w2-lease")).toBe("lease-agreement");
  });
});
