"use client";

import { FormEvent, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, FileCheck2, ShieldCheck } from "lucide-react";

import type { TimeAttendanceConsoleModel } from "@/server/time-attendance/console-read-model";

import styles from "./time-attendance-console.module.css";

type AttestationResult = {
  duplicate: boolean;
  attestation: {
    decision: "ATTEST" | "DISPUTE";
    id: string;
    statement: string;
  };
};

type TimeCardAttestationPanelProps = {
  card: TimeAttendanceConsoleModel["employeeCard"];
};

function idempotencyKey() {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `time-card-attestation-${random}`;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : "The attestation could not be recorded.";
    throw new Error(message);
  }

  return body as T;
}

export function TimeCardAttestationPanel({ card }: TimeCardAttestationPanelProps) {
  const [decision, setDecision] = useState<"ATTEST" | "DISPUTE">("ATTEST");
  const [disputeExplanation, setDisputeExplanation] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const cardUnavailable = !card.available;
  const statement = decision === "DISPUTE"
    ? "I dispute this time card and request manager review before payroll."
    : "I reviewed this time card and confirm it is accurate to the best of my knowledge. This does not waive wage, legal, correction, or payroll review rights.";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await parseJsonResponse<AttestationResult>(
          await fetch("/api/time-attendance/attestations", {
            body: JSON.stringify({
              cardChecksum: card.cardChecksum,
              decision,
              disputeExplanation: decision === "DISPUTE" ? disputeExplanation : null,
              idempotencyKey: idempotencyKey(),
              timeCardId: card.cardId,
              timeCardVersion: card.timeCardVersion
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST"
          })
        );
        setNotice(`${result.attestation.decision === "DISPUTE" ? "Dispute" : "Attestation"} recorded for manager review.`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The attestation could not be recorded.");
      }
    });
  }

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Employee attestation</span>
          <h2>Confirm or dispute this card</h2>
          <p>Attestation binds to a specific card version and checksum. Corrections after attestation reopen review.</p>
        </div>
        <span className={cardUnavailable ? styles.chipWarning : styles.chipGood}>
          {cardUnavailable ? "Awaiting live card" : "Versioned card"}
        </span>
      </div>

      <div className={styles.attestationCardFacts}>
        <div><span>Card version</span><strong>{card.timeCardVersion}</strong></div>
        <div><span>Checksum</span><strong>{card.cardChecksum.slice(0, 18)}…</strong></div>
      </div>

      <form className={styles.attestationForm} onSubmit={submit}>
        <label>
          <input
            checked={decision === "ATTEST"}
            disabled={isPending || cardUnavailable}
            name="time-card-attestation"
            onChange={() => setDecision("ATTEST")}
            type="radio"
          />
          <span><ShieldCheck size={16} aria-hidden="true" />Confirm this card</span>
        </label>
        <label>
          <input
            checked={decision === "DISPUTE"}
            disabled={isPending || cardUnavailable}
            name="time-card-attestation"
            onChange={() => setDecision("DISPUTE")}
            type="radio"
          />
          <span><AlertTriangle size={16} aria-hidden="true" />Dispute / needs review</span>
        </label>
        {decision === "DISPUTE" ? (
          <textarea
            disabled={isPending || cardUnavailable}
            minLength={15}
            onChange={(event) => setDisputeExplanation(event.target.value)}
            placeholder="Explain what needs review before this card can be approved."
            required
            rows={3}
            value={disputeExplanation}
          />
        ) : null}
        <p className={styles.attestationStatement}>{statement}</p>
        {cardUnavailable ? (
          <p className={styles.captureError}>
            <AlertTriangle size={16} aria-hidden="true" />
            Attestation will activate when the page is backed by a persisted time-card version.
          </p>
        ) : null}
        <button disabled={isPending || cardUnavailable} type="submit">
          <FileCheck2 size={16} aria-hidden="true" />
          Record attestation
        </button>
      </form>

      {notice ? <p className={styles.captureNotice}><CheckCircle2 size={16} aria-hidden="true" />{notice}</p> : null}
      {error ? <p className={styles.captureError}><AlertTriangle size={16} aria-hidden="true" />{error}</p> : null}
    </article>
  );
}
