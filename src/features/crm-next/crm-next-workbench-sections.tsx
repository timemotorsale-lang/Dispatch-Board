"use client";

import { useState } from "react";

import styles from "./crm-next-shell.module.css";

const CRM_WORKBENCH_SECTIONS = [
  "Lead",
  "Credit App",
  "Pre-Qual",
  "Vehicle",
  "Deals",
  "Files",
  "Compliance",
  "Duplicates",
  "Journal Entries",
  "Logs"
] as const;

type CrmWorkbenchSection = typeof CRM_WORKBENCH_SECTIONS[number];

const SECTION_HELP: Record<CrmWorkbenchSection, { title: string; detail: string; primary: string; secondary: string }> = {
  Lead: {
    title: "Work the customer lead",
    detail: "Review the customer need, source, and next step before choosing a CRM action.",
    primary: "Use the action row below",
    secondary: "Keep phone, task, note, and disposition work on this customer record."
  },
  "Credit App": {
    title: "Credit application",
    detail: "Open this only when the customer is ready to provide credit details.",
    primary: "No credit application started",
    secondary: "Credit workflow will stay connected to this customer record."
  },
  "Pre-Qual": {
    title: "Pre-qualification",
    detail: "Use this when staff needs a lighter finance check before a full application.",
    primary: "No pre-qualification started",
    secondary: "Pre-qual results should become part of the customer timeline."
  },
  Vehicle: {
    title: "Vehicle interest",
    detail: "Track what the customer is looking for and which vehicle staff should show next.",
    primary: "No vehicle selected yet",
    secondary: "Vehicle interest should stay visible before moving into a deal."
  },
  Deals: {
    title: "Deal workspace",
    detail: "Open deal work only when the customer is ready for numbers, desk, or proposal work.",
    primary: "No active deal",
    secondary: "Deal work remains CRM-owned until operations must execute a handoff."
  },
  Files: {
    title: "Customer files",
    detail: "Store documents, IDs, and attachments tied to this customer.",
    primary: "No missing files shown",
    secondary: "Document controls should open only when staff needs them."
  },
  Compliance: {
    title: "Compliance",
    detail: "Review required notices, identity checks, and regulated steps.",
    primary: "No compliance blockers shown",
    secondary: "Compliance should surface as simple next steps, not noise."
  },
  Duplicates: {
    title: "Duplicate review",
    detail: "Check whether this customer already exists before creating extra records.",
    primary: "No duplicate warning shown",
    secondary: "Duplicate handling protects the customer timeline from splitting."
  },
  "Journal Entries": {
    title: "Journal entries",
    detail: "Capture important customer interactions and staff notes.",
    primary: "Use Add Note below",
    secondary: "Journal entries should appear in Activity after saving."
  },
  Logs: {
    title: "Customer logs",
    detail: "Review the chronological record of contact attempts, notes, tasks, and outcomes.",
    primary: "Activity is shown below",
    secondary: "Open the full timeline only when deeper history is needed."
  }
};

export function CrmNextWorkbenchSections({
  currentNeed,
  doneMeaning
}: {
  currentNeed: string;
  doneMeaning: string;
}) {
  const [activeSection, setActiveSection] = useState<CrmWorkbenchSection>("Lead");
  const section = SECTION_HELP[activeSection];

  return (
    <section className={styles.dealerSectionWorkspace} id="customer-sections">
      <nav className={styles.dealerTabs} aria-label="Customer work sections">
        {CRM_WORKBENCH_SECTIONS.map((tab) => (
          <button
            aria-pressed={activeSection === tab}
            key={tab}
            onClick={() => setActiveSection(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className={styles.dealerTabPanel} id="lead">
        <div>
          <span className={styles.eyebrow}>{activeSection}</span>
          <h3>{activeSection === "Lead" ? currentNeed : section.title}</h3>
          <p>{activeSection === "Lead" ? doneMeaning : section.detail}</p>
        </div>
        <div className={styles.dealerSectionGrid}>
          <div>
            <span>Current state</span>
            <strong>{activeSection === "Lead" ? "Ready for staff action" : section.primary}</strong>
          </div>
          <div>
            <span>How staff works it</span>
            <strong>{section.secondary}</strong>
          </div>
        </div>
      </section>
    </section>
  );
}
