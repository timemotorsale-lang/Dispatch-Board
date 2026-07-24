"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, SendHorizonal } from "lucide-react";

import styles from "./time-attendance-console.module.css";

type CorrectionResult = {
  duplicate: boolean;
  request: {
    id: string;
    requestedChangeType: string;
    status: string;
  };
};

const correctionTypes = [
  { label: "Missing clock in", value: "MISSING_CLOCK_IN" },
  { label: "Missing clock out", value: "MISSING_CLOCK_OUT" },
  { label: "Meal time", value: "MEAL_TIME" },
  { label: "Wrong time", value: "WRONG_TIME" },
  { label: "Other", value: "OTHER" }
] as const;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function idempotencyKey() {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `time-card-correction-${random}`;
}

function localTimeToIso(date: string, time: string) {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}:00`);
  if (Number.isNaN(value.getTime())) return null;
  return value.toISOString();
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : "The correction request could not be submitted.";
    throw new Error(message);
  }

  return body as T;
}

export function TimeCardCorrectionPanel() {
  const [changeType, setChangeType] = useState("MEAL_TIME");
  const [date, setDate] = useState(todayKey);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [explanation, setExplanation] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requiresTimeWindow = useMemo(
    () => changeType !== "OTHER",
    [changeType]
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await parseJsonResponse<CorrectionResult>(
          await fetch("/api/time-attendance/corrections", {
            body: JSON.stringify({
              employeeExplanation: explanation,
              idempotencyKey: idempotencyKey(),
              requestedChangeType: changeType,
              requestedDate: date,
              requestedEndAt: localTimeToIso(date, endTime),
              requestedStartAt: localTimeToIso(date, startTime)
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST"
          })
        );
        setNotice(`Correction request ${result.request.id} submitted for manager review.`);
        setExplanation("");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The correction request could not be submitted.");
      }
    });
  }

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Card review & correction</span>
          <h2>Request a time-card correction</h2>
          <p>Submitting this does not change your punches. It creates a review request with the original trail preserved.</p>
        </div>
        <span className={styles.chipNeutral}>Manager review</span>
      </div>

      <form className={styles.correctionForm} onSubmit={submit}>
        <label>
          <span>What needs review?</span>
          <select disabled={isPending} onChange={(event) => setChangeType(event.target.value)} value={changeType}>
            {correctionTypes.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Date</span>
          <input disabled={isPending} onChange={(event) => setDate(event.target.value)} type="date" value={date} />
        </label>
        <label>
          <span>Start time {requiresTimeWindow ? "" : "(optional)"}</span>
          <input disabled={isPending} onChange={(event) => setStartTime(event.target.value)} type="time" value={startTime} />
        </label>
        <label>
          <span>End time {requiresTimeWindow ? "" : "(optional)"}</span>
          <input disabled={isPending} onChange={(event) => setEndTime(event.target.value)} type="time" value={endTime} />
        </label>
        <label className={styles.correctionWide}>
          <span>Explain what happened</span>
          <textarea
            disabled={isPending}
            minLength={15}
            onChange={(event) => setExplanation(event.target.value)}
            placeholder="Example: I returned from lunch at 1:30 PM but forgot to end my meal break until later."
            required
            rows={4}
            value={explanation}
          />
        </label>
        <div className={styles.correctionFooter}>
          <p>Manager approval is required before a correction can affect payroll-ready time.</p>
          <button disabled={isPending} type="submit">
            <SendHorizonal size={16} aria-hidden="true" />
            Submit correction request
          </button>
        </div>
      </form>

      {notice ? (
        <p className={styles.captureNotice}><CheckCircle2 size={16} aria-hidden="true" />{notice}</p>
      ) : null}
      {error ? (
        <p className={styles.captureError}><AlertTriangle size={16} aria-hidden="true" />{error}</p>
      ) : null}
    </article>
  );
}
