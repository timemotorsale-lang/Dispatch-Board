import { describe, expect, it } from "vitest";

import {
  createGuardedEvidenceRecord,
  salesEvidenceMaxFileSizeBytes,
  validateSalesEvidenceUpload
} from "@/features/sales/sales-console-m55-evidence-upload-foundation";
import type { SalesConsoleAuditMetadata } from "@/features/sales/sales-console-m50-record-command-contract";

const audit: SalesConsoleAuditMetadata = {
  actorId: "USER-1",
  actorRole: "Salesperson",
  storeId: "TMS-001",
  occurredAt: "2026-07-30T15:00:00.000Z",
  commandId: "CMD-55",
  correlationId: "CORR-55",
  idempotencyKey: "IDEMP-55",
  sourceLink: "/sales"
};

describe("Sales Console M55 evidence upload foundation", () => {
  it("accepts guarded evidence intents with allowed file type, size, subject, and audit", () => {
    const validation = validateSalesEvidenceUpload({
      fileName: "pay-stub.pdf",
      fileType: "application/pdf",
      sizeBytes: 500_000,
      attachedSubjectType: "revenue-lane-checklist",
      attachedSubjectId: "CHECK-1",
      category: "income",
      uploadedByRole: "Salesperson",
      audit
    });

    expect(validation.allowed).toBe(true);
    expect(validation.reasons).toEqual([]);
  });

  it("blocks unsupported or unlinked evidence", () => {
    const validation = validateSalesEvidenceUpload({
      fileName: "script.exe",
      fileType: "application/octet-stream",
      sizeBytes: salesEvidenceMaxFileSizeBytes + 1,
      attachedSubjectType: "customer",
      attachedSubjectId: "",
      category: "general",
      uploadedByRole: "Salesperson",
      audit: { ...audit, idempotencyKey: "" }
    });

    expect(validation.allowed).toBe(false);
    expect(validation.reasons).toEqual(
      expect.arrayContaining([
        "unsupported file type",
        "file size outside allowed range",
        "evidence must be linked to an allowed Sales Console subject",
        "audit and idempotency metadata required"
      ])
    );
  });

  it("creates only guarded Sales Console evidence records", () => {
    const evidence = createGuardedEvidenceRecord(
      {
        fileName: "vehicle-photo.jpg",
        fileType: "image/jpeg",
        sizeBytes: 300_000,
        attachedSubjectType: "sales-opportunity",
        attachedSubjectId: "SO-1",
        category: "vehicle",
        uploadedByRole: "Sales Manager",
        audit
      },
      "EVD-1"
    );

    expect(evidence?.id).toBe("EVD-1");
    expect(evidence?.status).toBe("pending");
  });
});
