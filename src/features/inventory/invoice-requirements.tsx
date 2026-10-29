"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { invoiceHoldLabel } from "@/lib/service-billing-workflow";
import styles from "./service-billing-workspace.module.css";

export function InvoiceRequirements({ repairOrderId, codes, billingMode }: { repairOrderId: string; codes: readonly string[]; billingMode?: string }) {
  const notice = useRef<HTMLElement>(null);
  const missingQC = codes.some(code => code === "INVOICE_JOB_QC_INCOMPLETE" || code === "INVOICE_QC_EVIDENCE_INCOMPLETE");
  const signature = codes.join(",");
  useEffect(() => {
    if (!missingQC) return;
    notice.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    notice.current?.focus({ preventScroll: true });
  }, [missingQC, signature]);
  if (!codes.length && (!billingMode || billingMode === "NATIVE")) return null;
  return <section ref={notice} tabIndex={-1} role="alert" className={styles.requirements} aria-label="Missing invoice requirements">
    <h3>{missingQC ? "Passed QC record missing" : "Invoice requirements"}</h3>
    {missingQC && <><p>A passed QC document is missing. Complete and record quality checks before creating the invoice.</p><Link className={styles.qcButton} href={repairReviewHref(repairOrderId, "qc")}>Open QC</Link></>}
    <ul>{codes.filter(code => !missingQC || !["INVOICE_JOB_QC_INCOMPLETE", "INVOICE_QC_EVIDENCE_INCOMPLETE"].includes(code)).map(code => <li key={code}>{invoiceHoldLabel(code)}{" "}<Link href={repairReviewHref(repairOrderId, code === "INVOICE_AUTHORIZATION_REQUIRED" ? "authorization" : code.includes("PART_IDENTITY") ? "estimate" : "parts")}>{code === "INVOICE_AUTHORIZATION_REQUIRED" ? "Open approval" : code.includes("PART_IDENTITY") ? "Update estimate" : "Open repair checklist"}</Link></li>)}</ul>
    {billingMode && billingMode !== "NATIVE" && <p>This repair order uses an internal cost package rather than a customer invoice.</p>}
  </section>;
}
