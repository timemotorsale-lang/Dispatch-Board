import { describe, expect, it } from "vitest";
import { repairCloseGuidance } from "@/lib/repair-close-guidance";
import { invoiceHoldLabel } from "@/lib/service-billing-workflow";

describe("repair close guidance", () => {
  it("orders the reported blockers by workflow rather than package or input order", () => {
    const codes = ["INVOICE_JOB_QC_INCOMPLETE", "INVOICE_MEASURED_CLOCK_INCOMPLETE", "INVOICE_INSTALL_QUANTITY_MISMATCH"];
    const result = repairCloseGuidance("ro-1", codes);
    expect(result.map(item => item.actionLabel)).toEqual(["Review installed parts", "Open repair progress", "Open QC"]);
    expect(result.map(item => item.label)).toEqual([codes[2], codes[1], codes[0]].map(invoiceHoldLabel));
    expect(result.map(item => new URL(item.href, "https://local.test").searchParams.get("step"))).toEqual(["parts", "repair", "qc"]);
    expect(codes).toEqual(["INVOICE_JOB_QC_INCOMPLETE", "INVOICE_MEASURED_CLOCK_INCOMPLETE", "INVOICE_INSTALL_QUANTITY_MISMATCH"]);
  });

  it.each([
    ["EXECUTABLE_SCOPE_MISSING", "estimate"],
    ["FROZEN_ESTIMATE_DOCUMENT_MISSING", "estimate"],
    ["AUTHORIZED_AMOUNT_NEEDS_REVIEW", "authorization"],
    ["AUTHORIZATION_REQUIRED", "authorization"],
    ["INSTALL_QUANTITY_MISMATCH", "parts"],
    ["INSTALL_EVIDENCE_MISSING", "parts"],
    ["PART_RETURN_NEEDS_REVIEW", "parts"],
    ["MEASURED_CLOCK_INCOMPLETE", "repair"],
    ["JOB_QC_INCOMPLETE", "qc"],
    ["QC_EVIDENCE_INCOMPLETE", "qc"],
    ["VENDOR_RETURN_REVIEW_REQUIRED", "qc"],
    ["PART_IDENTITY_MISSING", null],
    ["SOURCE_CHANGED", null],
  ])("routes %s to this exact repair order", (code, step) => {
    const repairOrderId = "ro /?&other=secret#ü";
    const [item] = repairCloseGuidance(repairOrderId, [`INVOICE_${code}`]);
    const url = new URL(item.href, "https://local.test");
    expect(url.pathname).toBe(step ? "/vehicles/repair-workbench" : "/vehicles/service-billing");
    expect(url.searchParams.get("repairOrderId")).toBe(repairOrderId);
    expect(url.searchParams.get("step")).toBe(step);
    expect([...url.searchParams.keys()].sort()).toEqual(step ? ["repairOrderId", "step"] : ["repairOrderId"]);
    expect(item.label).not.toContain(code);
    expect(item.actionLabel).not.toContain("INVOICE_");
  });

  it("deduplicates prefixed and historical unprefixed codes", () => {
    expect(repairCloseGuidance("ro-1", ["JOB_QC_INCOMPLETE", "INVOICE_JOB_QC_INCOMPLETE", "JOB_QC_INCOMPLETE"])).toHaveLength(1);
  });

  it("uses one plain review fallback after known actions without exposing unknown values", () => {
    const result = repairCloseGuidance("ro-1", ["INVOICE_PRIVATE_INTERNAL_DETAIL", "unknown diagnostic", "INVOICE_JOB_QC_INCOMPLETE"]);
    expect(result).toHaveLength(2);
    expect(result[0].actionLabel).toBe("Open QC");
    expect(result[1]).toEqual({
      label: "Review the remaining invoice requirements before closing this repair order.",
      actionLabel: "Review invoice requirements",
      href: "/vehicles/service-billing?repairOrderId=ro-1",
    });
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|diagnostic|INVOICE_/);
  });

  it("does not infer invoice readiness or invent actions when no mismatches are supplied", () => {
    expect(repairCloseGuidance("ro-1", [])).toEqual([]);
  });
});
