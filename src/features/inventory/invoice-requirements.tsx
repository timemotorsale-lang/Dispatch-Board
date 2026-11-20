"use client";


import Link from "next/link";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { invoiceHoldLabel } from "@/lib/service-billing-workflow";
import styles from "./service-billing-workspace.module.css";

export function InvoiceRequirements({ repairOrderId, codes, billingMode, repairJobsMissing }: { repairOrderId: string; codes: readonly string[]; billingMode?: string; repairJobsMissing?: boolean }) {
  const missingQC = codes.includes("INVOICE_JOB_QC_INCOMPLETE") || codes.includes("INVOICE_QC_EVIDENCE_INCOMPLETE");
  const missingPass = codes.includes("INVOICE_JOB_QC_INCOMPLETE");
  const needsTime = codes.includes("INVOICE_MEASURED_CLOCK_INCOMPLETE");
  const needsParts = codes.some(code => code.includes("INSTALL") || code.includes("PART_RETURN"));
  const next = repairJobsMissing && missingPass ? { step: "parts", label: "Create approved repair jobs" } as const
    : needsParts ? { step: "parts", label: "Review parts records" } as const
    : needsTime ? { step: "repair", label: "Open repair progress" } as const
    : missingQC ? { step: "qc", label: "Open QC" } as const : null;
  if (!codes.length && (!billingMode || billingMode === "NATIVE")) return null;
  return <section role="alert" className={styles.requirements} aria-label="Missing invoice requirements">
    <h3>{repairJobsMissing && missingPass ? "Approved repair jobs haven’t been created" : missingPass ? "Passed QC record missing" : missingQC ? "QC evidence needs review" : "Invoice requirements"}</h3>
    {missingQC && <p>{repairJobsMissing && missingPass ? "Start at Parts & release. Create jobs from the approved estimate, record the completed work, then pass QC." : missingPass ? "Complete the approved repair jobs and record a passing quality check for each." : "Review the required QC evidence, including any peer verification or road test."}</p>}
    {next && <Link className={styles.qcButton} href={repairReviewHref(repairOrderId, next.step)}>{next.label}</Link>}
    {missingQC && next?.step !== "qc" && <p>After recording the outstanding work, <Link href={repairReviewHref(repairOrderId, "qc")}>complete QC</Link>.</p>}
    <ul>{codes.filter(code => !missingQC || !["INVOICE_JOB_QC_INCOMPLETE", "INVOICE_QC_EVIDENCE_INCOMPLETE"].includes(code)).map(code => {
      const action = code === "INVOICE_AUTHORIZATION_REQUIRED" ? { step: "authorization", label: "Open approval" } as const
        : code === "INVOICE_PART_IDENTITY_MISSING" ? null
        : code === "INVOICE_MEASURED_CLOCK_INCOMPLETE" ? { step: "repair", label: "Open repair progress" } as const
        : code.includes("INSTALL") || code.includes("PART_RETURN") ? { step: "parts", label: "Review parts records" } as const
        : null;
      return <li key={code}>{invoiceHoldLabel(code)}{action && <> <Link href={repairReviewHref(repairOrderId, action.step)}>{action.label}</Link></>}</li>;
    })}</ul>
    {billingMode === "INTERNAL_COST" && <p>The saved package records internal costs.</p>}
    {billingMode === "LEGACY_REVIEW_REQUIRED" && <p>The older package needs to be refreshed. Prepare a new invoice preview from the current approved work.</p>}
  </section>;
}
