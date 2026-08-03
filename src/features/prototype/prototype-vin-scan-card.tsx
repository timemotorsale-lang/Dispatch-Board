"use client";

import { Camera, Check, CircleAlert, ScanLine } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";
import { parseVinScanEvidence, vinMatchesExpected } from "./vin-scan-foundation";

export type PrototypeVinScanEvidence = {
  auctionDetected: boolean;
  auctionLocation: string | null;
  auctionSource: string | null;
  lotNumber: string | null;
  mode: string;
  runNumber: string | null;
  stockNumber: string | null;
  vinCaptured: boolean;
  vinMatched: boolean;
  vinValue: string | null;
};

export function PrototypeVinScanCard({
  expectedVin,
  helperText,
  intakeHref = "/vehicles/workflows/add-vehicle?returnTo=%2Fvehicles%2Finventory",
  onEvidenceChange,
  stageLabel,
}: {
  expectedVin: string;
  helperText: string;
  intakeHref?: string;
  onEvidenceChange: (evidence: PrototypeVinScanEvidence) => void;
  stageLabel: string;
}) {
  const [captureText, setCaptureText] = useState("");
  const parsed = useMemo(() => parseVinScanEvidence(captureText), [captureText]);
  const matched = vinMatchesExpected(parsed.vin, expectedVin);

  function processCapture() {
    onEvidenceChange({
      auctionDetected: parsed.auctionSource !== "Unknown",
      auctionLocation: parsed.auctionLocation,
      auctionSource: parsed.auctionSource === "Unknown" ? null : parsed.auctionSource,
      lotNumber: parsed.lotNumber,
      mode: parsed.mode,
      runNumber: parsed.runNumber,
      stockNumber: parsed.stockNumber,
      vinCaptured: Boolean(parsed.vin),
      vinMatched: matched,
      vinValue: parsed.vin,
    });
  }

  return <section className={styles.vinScanCard} aria-label={`${stageLabel} VIN scan workspace`}>
    <header>
      <div>
        <span><ScanLine size={14} />VIN capture</span>
        <strong>{stageLabel} identity capture</strong>
      </div>
      <em className={matched ? styles.vinScanSuccess : ""}>{parsed.mode} / {parsed.confidence}</em>
    </header>
    <p>{helperText}</p>
    <label className={styles.vinScanInput}>
      <span className="sr-only">VIN or windshield capture text</span>
      <textarea
        onChange={(event) => setCaptureText(event.target.value)}
        placeholder="Paste VIN barcode text or Manheim / ADESA windshield details here"
        rows={4}
        value={captureText}
      />
    </label>
    <div className={styles.vinScanSummary}>
      <article><span>Expected VIN</span><strong>{expectedVin}</strong></article>
      <article><span>Captured VIN</span><strong>{parsed.vin ?? "Not found yet"}</strong></article>
      <article><span>Stock</span><strong>{parsed.stockNumber ?? "—"}</strong></article>
      <article><span>Auction source</span><strong>{parsed.auctionLocation ?? parsed.auctionSource}</strong></article>
      <article><span>Run / lot</span><strong>{[parsed.runNumber, parsed.lotNumber].filter(Boolean).join(" / ") || "—"}</strong></article>
      <article><span>Match</span><strong>{matched ? "Expected VIN matched" : parsed.vin ? "Review mismatch" : "No VIN captured"}</strong></article>
    </div>
    <div className={styles.vinScanNotes}>
      {parsed.notes.map((item) => <span key={item}>{item.includes("No 17-character VIN") ? <CircleAlert size={13} /> : <Check size={13} />}{item}</span>)}
    </div>
    <div className={styles.vinScanActions}>
      <button className={styles.vinScanAction} disabled={!captureText.trim().length} onClick={processCapture} type="button">
        {parsed.mode === "Auction windshield" ? <Camera size={14} /> : <ScanLine size={14} />}Use captured identity
      </button>
      <Link className={styles.vinScanLink} href={intakeHref}>Open Vehicle Intake form</Link>
    </div>
  </section>;
}
