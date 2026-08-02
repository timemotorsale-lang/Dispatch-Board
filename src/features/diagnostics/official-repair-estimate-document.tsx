"use client";

import { ArrowLeft, Printer, Send } from "lucide-react";
import Link from "next/link";

import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";

import styles from "./official-repair-estimate-document.module.css";

type EstimateLine = {
  amountLabel: string;
  detail: string;
  kind: "Labor" | "Part";
  quantityLabel: string;
  title: string;
};

type SummaryItem = {
  label: string;
  value: string;
};

function formatDocumentDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function OfficialRepairEstimateDocument({
  concern,
  createdAt,
  customer,
  estimateNumber,
  lines,
  repairOrderId,
  repairOrderNumber,
  returnTo,
  summary,
  vehicle,
}: {
  concern: string;
  createdAt: string;
  customer: string;
  estimateNumber: string;
  lines: EstimateLine[];
  repairOrderId?: string;
  repairOrderNumber: string;
  returnTo: string;
  summary: SummaryItem[];
  vehicle: string;
}) {
  const workbenchHref = repairOrderId ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(repairOrderId)}&returnTo=${encodeURIComponent(returnTo)}` : returnTo;

  return <section className={styles.documentShell} aria-label="Official repair estimate document">
    <div className={styles.commandBar}>
      <Link className={styles.commandLink} href={returnTo}><ArrowLeft size={15} />Return to labor guide</Link>
      <button className={styles.commandPrimary} onClick={() => window.print()} type="button"><Printer size={15} />Print official estimate</button>
      <Link className={styles.commandLink} href={workbenchHref}><Send size={15} />Send to repair workbench</Link>
    </div>

    <article className={styles.document}>
      <header className={styles.estimateHeader}>
        <div className={styles.brandBlock}>
          <TimeMotorSalesLogo className={`${styles.logo} ${styles.screenLogo}`} priority variant="horizontal-reversed" />
          <TimeMotorSalesLogo className={`${styles.logo} ${styles.printLogo}`} priority variant="horizontal" />
          <div>
            <strong>Official Repair Estimate</strong>
            <span>Time Motor Sales · Store ID TMS-001</span>
            <span>1101 E. Lake Street, Minneapolis MN 55407 · (612) 724-3631</span>
            <small>Prepared for internal service planning, technician handoff, customer-safe estimate review, and governed work-order execution.</small>
          </div>
        </div>
        <div className={styles.estimateMeta}>
          <div><span>Estimate #</span><strong>{estimateNumber}</strong></div>
          <div><span>Repair order</span><strong>{repairOrderNumber}</strong></div>
          <div><span>Created</span><strong>{formatDocumentDate(createdAt)}</strong></div>
        </div>
      </header>

      <section className={styles.identityGrid}>
        <article>
          <span>Customer</span>
          <strong>{customer}</strong>
        </article>
        <article>
          <span>Vehicle</span>
          <strong>{vehicle}</strong>
        </article>
        <article>
          <span>Concern</span>
          <strong>{concern}</strong>
        </article>
      </section>

      <section className={styles.lineSection}>
        <header>
          <h2>Approved estimate lines</h2>
          <p>Structured labor and parts prepared from the diagnostics labor guide.</p>
        </header>
        <div className={styles.lineHead}>
          <span>Type</span>
          <span>Description</span>
          <span>Qty / Time</span>
          <span>Amount</span>
        </div>
        <div className={styles.lineList}>
          {lines.map((line, index) => <article key={`${line.kind}-${line.title}-${index}`}>
            <span>{line.kind}</span>
            <div>
              <strong>{line.title}</strong>
              <small>{line.detail}</small>
            </div>
            <span>{line.quantityLabel}</span>
            <strong>{line.amountLabel}</strong>
          </article>)}
        </div>
      </section>

      <section className={styles.summarySection}>
        <div className={styles.summaryCard}>
          <h2>Estimate summary</h2>
          <dl>
            {summary.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
          </dl>
        </div>
        <div className={styles.footerCard}>
          <h2>Operational release notes</h2>
          <ul>
            <li>This document is the official estimate package for printing or digital technician handoff.</li>
            <li>Parts sourcing, supplement control, and receiving match continue in the governed parts workflow.</li>
            <li>Repair workbench execution should use this estimate package as its current scope reference.</li>
          </ul>
        </div>
      </section>
    </article>
  </section>;
}
