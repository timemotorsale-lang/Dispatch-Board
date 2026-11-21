"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
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

export function TimeCardCorrectionPanel({ initialDate, punches }: { initialDate?: string; punches: { id: string; eventType: string; label: string }[] }) {
  const router = useRouter();
  const [changeType, setChangeType] = useState("MISSING_CLOCK_IN");
  const [relatedEventId, setRelatedEventId] = useState("");
  const [date, setDate] = useState(() => initialDate ?? todayKey());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [explanation, setExplanation] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requiresPunch = changeType === "MEAL_TIME" || changeType === "WRONG_TIME";
  const eligiblePunches = punches.filter(punch => (changeType === "MEAL_TIME" ? ["START_MEAL", "END_MEAL"] : ["CLOCK_IN", "START_MEAL", "END_MEAL", "CLOCK_OUT"]).includes(punch.eventType));
  const chosenPunch = eligiblePunches.find(punch => punch.id === relatedEventId);
  const isEnd = changeType === "MISSING_CLOCK_OUT" || chosenPunch?.eventType === "CLOCK_OUT" || chosenPunch?.eventType === "END_MEAL";
  const isTimed = changeType !== "OTHER";

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
              relatedEventId: requiresPunch ? relatedEventId : undefined,
              requestedDate: date,
              requestedEndAt: isEnd || !isTimed ? localTimeToIso(endDate || date, endTime) : null,
              requestedStartAt: !isEnd || !isTimed ? localTimeToIso(date, startTime) : null
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST"
          })
        );
        setNotice(`Correction request ${result.request.id} submitted for manager review.`);
        setExplanation("");
        router.refresh();
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
          <p>Enter times using your device’s time zone. A manager will review the correction.</p>
        </div>
        <span className={styles.chipNeutral}>Manager review</span>
      </div>

      <form className={styles.correctionForm} onSubmit={submit}>
        <label>
          <span>What needs review?</span>
          <select disabled={isPending} onChange={(event) => { setChangeType(event.target.value); setRelatedEventId(""); }} value={changeType}>
            {correctionTypes.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </label>
        {requiresPunch && <label className={styles.correctionWide}>
          <span>Original punch</span>
          <select required disabled={isPending} value={relatedEventId} onChange={event => setRelatedEventId(event.target.value)}>
            <option value="">{eligiblePunches.length ? "Choose a recorded punch" : "No matching punches available"}</option>
            {eligiblePunches.map(punch => <option key={punch.id} value={punch.id}>{punch.label}</option>)}
          </select>
        </label>}
        <label>
          <span>Date</span>
          <input disabled={isPending} onChange={(event) => setDate(event.target.value)} required type="date" value={date} />
        </label>
        {!isEnd && <label>
          <span>Start time {isTimed ? "" : "(optional)"}</span>
          <input disabled={isPending} required={isTimed} onChange={(event) => setStartTime(event.target.value)} type="time" value={startTime} />
        </label>}
        {(isEnd || !isTimed) && <label>
          <span>End time {isTimed ? "" : "(optional)"}</span>
          <input disabled={isPending} required={isTimed} onChange={(event) => setEndTime(event.target.value)} type="time" value={endTime} />
        </label>}
        {(isEnd || !isTimed) && endTime && <label><span>End date (for overnight corrections)</span><input disabled={isPending} min={date} onChange={event => setEndDate(event.target.value)} type="date" value={endDate} /></label>}
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
