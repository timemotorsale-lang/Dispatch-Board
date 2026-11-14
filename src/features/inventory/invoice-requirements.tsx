"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { invoiceHoldLabel } from "@/lib/service-billing-workflow";
import styles from "./service-billing-workspace.module.css";

export function InvoiceRequirements({ repairOrderId, codes, billingMode }: { repairOrderId: string; codes: readonly string[]; billingMode?: string }) {
  const notice = useRef<HTMLElement>(null);
  const missingQC = codes.some(code => code === "INVOICE_JOB_QC_INCOMPLETE" || code === "INVOICE_QC_EVIDENCE_INCOMPLETE");
  const missingPass = codes.includes("INVOICE_JOB_QC_INCOMPLETE");
  const signature = codes.join(",");
  useEffect(() => {
    if (!missingQC) return;
    notice.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    notice.current?.focus({ preventScroll: true });
  }, [missingQC, signature]);
  if (!codes.length && (!billingMode || billingMode === "NATIVE")) return null;
  return <section ref={notice} tabIndex={-1} role="alert" className={styles.requirements} aria-label="Missing invoice requirements">
    <h3>{missingPass ? "Passed QC record missing" : missingQC ? "QC evidence needs review" : "Invoice requirements"}</h3>
    {missingQC && <><p>{missingPass ? "Complete the approved repair jobs and record a passing quality check for each." : "Review the required QC evidence, including any peer verification or road test."}</p><Link className={styles.qcButton} href={repairReviewHref(repairOrderId, "qc")}>Open QC</Link></>}
    <ul>{codes.filter(code => !missingQC || !["INVOICE_JOB_QC_INCOMPLETE", "INVOICE_QC_EVIDENCE_INCOMPLETE"].includes(code)).map(code => {
      const action = code === "INVOICE_AUTHORIZATION_REQUIRED" ? { step: "authorization", label: "Open approval" } as const
        : code === "INVOICE_PART_IDENTITY_MISSING" ? null
        : code === "INVOICE_MEASURED_CLOCK_INCOMPLETE" ? { step: "repair", label: "Open repair progress" } as const
        : code.includes("INSTALL") || code.includes("PART_RETURN") ? { step: "parts", label: "Review parts records" } as const
        : null;
      return <li key={code}>{invoiceHoldLabel(code)}{action && <> <Link href={repairReviewHref(repairOrderId, action.step)}>{action.label}</Link></>}</li>;
    })}</ul>
    {billingMode && billingMode !== "NATIVE" && <p>This repair order uses an internal cost package rather than a customer invoice.</p>}
  </section>;
}
