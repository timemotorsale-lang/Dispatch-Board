"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
type StagedWorkbenchFile = { id: string; name: string; previewUrl: string; size: number; type: string };

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
  customerId,
  customerName,
  dealEvidence,
  doneMeaning,
  documentActionHref
}: {
  currentNeed: string;
  customerId: string;
  customerName: string;
  dealEvidence?: { detail: string; started: boolean; vehicle?: string };
  documentActionHref: string;
  doneMeaning: string;
}) {
  const [activeSection, setActiveSection] = useState<CrmWorkbenchSection>("Lead");
  const [fileNote, setFileNote] = useState("");
  const [fileType, setFileType] = useState("Proof / supporting document");
  const [selectedFiles, setSelectedFiles] = useState<StagedWorkbenchFile[]>([]);
  const section = SECTION_HELP[activeSection];
  const selectedFileSummary = selectedFiles.length
    ? `${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} selected for ${customerName}`
    : "No files selected yet";

  function stageSelectedFiles(files: FileList | null) {
    selectedFiles.forEach((file) => URL.revokeObjectURL(file.previewUrl));
    const nextFiles = Array.from(files ?? []).map((file) => ({
      id: `${file.name}-${file.lastModified}-${file.size}`,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      size: file.size,
      type: file.type || "Unknown"
    }));
    setSelectedFiles(nextFiles);
  }

  useEffect(() => () => {
    selectedFiles.forEach((file) => URL.revokeObjectURL(file.previewUrl));
  }, [selectedFiles]);

  function formatFileSize(size: number) {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

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
            <strong>
              {activeSection === "Lead"
                ? "Ready for staff action"
                : activeSection === "Vehicle" && dealEvidence?.started
                  ? dealEvidence.vehicle || dealEvidence.detail
                  : activeSection === "Deals" && dealEvidence?.started
                    ? dealEvidence.detail
                    : section.primary}
            </strong>
          </div>
          <div>
            <span>How staff works it</span>
            <strong>{section.secondary}</strong>
          </div>
        </div>
        <section className={styles.workbenchFileUpload} aria-label="Customer file upload">
          <header>
            <div>
              <span className={styles.eyebrow}>File upload</span>
              <h4>Attach customer files to this workbench</h4>
              <p>Use this for IDs, insurance, title paperwork, proof, signed forms, photos, or other customer documents.</p>
            </div>
            <Link href={documentActionHref}>Open document workflow</Link>
          </header>
          <div className={styles.workbenchFileControls}>
            <label>
              <span>Document type</span>
              <select value={fileType} onChange={(event) => setFileType(event.target.value)}>
                <option>Proof / supporting document</option>
                <option>Driver license / ID</option>
                <option>Insurance</option>
                <option>Title / registration</option>
                <option>Signed form</option>
                <option>Vehicle photo</option>
                <option>Other customer file</option>
              </select>
            </label>
            <label>
              <span>Choose files</span>
              <input accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.txt" multiple onChange={(event) => stageSelectedFiles(event.currentTarget.files)} type="file" />
            </label>
            <label>
              <span>Staff note</span>
              <input value={fileNote} onChange={(event) => setFileNote(event.target.value)} placeholder="What is this file proving or supporting?" />
            </label>
          </div>
          <div className={styles.workbenchFileSummary}>
            <strong>{selectedFileSummary}</strong>
            <small>{customerId} · {fileType}{fileNote ? ` · ${fileNote}` : ""}</small>
            {selectedFiles.length ? (
              <ul>
                {selectedFiles.map((file) => (
                  <li key={file.id}>
                    <div>
                      <span>{file.name}</span>
                      <small>{formatFileSize(file.size)} · {file.type}</small>
                    </div>
                    <a href={file.previewUrl} rel="noreferrer" target="_blank">View file</a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      </section>
    </section>
  );
}
