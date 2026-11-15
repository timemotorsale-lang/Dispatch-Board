import { repairReviewHref, type RepairWorkflowStep } from "./repair-workflow-review";
import { invoiceHoldLabel } from "./service-billing-workflow";

export type RepairCloseGuidance = { label: string; actionLabel: string; href: string };

type Requirement = {
  code: string;
  step?: RepairWorkflowStep;
  actionLabel: string;
  label?: string;
};

// Stable workflow order, independent of the order returned by invoice readiness.
const requirements: readonly Requirement[] = [
  { code: "EXECUTABLE_SCOPE_MISSING", step: "estimate", actionLabel: "Review estimate scope", label: "Review the approved repair scope before preparing the invoice." },
  { code: "FROZEN_ESTIMATE_DOCUMENT_MISSING", step: "estimate", actionLabel: "Review estimate documents", label: "Review the missing saved estimate document before invoicing." },
  { code: "AUTHORIZED_AMOUNT_NEEDS_REVIEW", step: "authorization", actionLabel: "Review approved charges", label: "Review the difference between approved charges and the invoice total." },
  { code: "AUTHORIZATION_REQUIRED", step: "authorization", actionLabel: "Open approval" },
  { code: "INSTALL_QUANTITY_MISMATCH", step: "parts", actionLabel: "Review installed parts" },
  { code: "INSTALL_EVIDENCE_MISSING", step: "parts", actionLabel: "Review installed parts" },
  { code: "PART_RETURN_NEEDS_REVIEW", step: "parts", actionLabel: "Review parts returns", label: "Review returned parts and their installation records before invoicing." },
  { code: "MEASURED_CLOCK_INCOMPLETE", step: "repair", actionLabel: "Open repair progress" },
  { code: "JOB_QC_INCOMPLETE", step: "qc", actionLabel: "Open QC" },
  { code: "QC_EVIDENCE_INCOMPLETE", step: "qc", actionLabel: "Review QC evidence" },
  { code: "VENDOR_RETURN_REVIEW_REQUIRED", step: "qc", actionLabel: "Review vendor return QC", label: "Review and accept the returned vendor work before invoicing." },
  { code: "PART_IDENTITY_MISSING", actionLabel: "Recheck invoice readiness" },
  { code: "SOURCE_CHANGED", actionLabel: "Review invoice requirements" },
];

/** Display guidance only: readiness and authorization remain server-controlled. */
export function repairCloseGuidance(repairOrderId: string, codes: readonly string[]): RepairCloseGuidance[] {
  const remaining = new Set(codes.map(code => code.replace(/^INVOICE_/, "")));
  const billingHref = `/vehicles/service-billing?${new URLSearchParams({ repairOrderId })}`;
  const result: RepairCloseGuidance[] = [];
  for (const requirement of requirements) {
    if (!remaining.delete(requirement.code)) continue;
    result.push({
      label: requirement.label ?? invoiceHoldLabel(`INVOICE_${requirement.code}`),
      actionLabel: requirement.actionLabel,
      href: requirement.step ? repairReviewHref(repairOrderId, requirement.step) : billingHref,
    });
  }
  if (remaining.size) result.push({
    label: "Review the remaining invoice requirements before closing this repair order.",
    actionLabel: "Review invoice requirements",
    href: billingHref,
  });
  return result;
}
