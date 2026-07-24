"use client";

import { CalendarPlus } from "lucide-react";
import { useMemo, useState } from "react";

import styles from "./time-attendance-console.module.css";

type RequestType = "PTO" | "ESST" | "UNPAID";

type RequestState = {
  busy: boolean;
  message: string | null;
  tone: "good" | "danger" | null;
};

function localInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function TimeOffRequestPanel() {
  const now = useMemo(() => new Date(), []);
  const [requestType, setRequestType] = useState<RequestType>("PTO");
  const [startsAt, setStartsAt] = useState(localInputValue(new Date(now.getTime() + 24 * 60 * 60000)));
  const [endsAt, setEndsAt] = useState(localInputValue(new Date(now.getTime() + 25 * 60 * 60000)));
  const [operationalNote, setOperationalNote] = useState("");
  const [restrictedReason, setRestrictedReason] = useState("");
  const [state, setState] = useState<RequestState>({ busy: false, message: null, tone: null });

  async function submit() {
    setState({ busy: true, message: null, tone: null });
    try {
      const response = await fetch("/api/time-attendance/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endsAt: new Date(endsAt).toISOString(),
          idempotencyKey: `time-off-${requestType}-${Date.now()}`,
          operationalNote,
          requestType,
          restrictedReason,
          startsAt: new Date(startsAt).toISOString()
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "Time-off request failed.");
      }
      setState({
        busy: false,
        message: requestType === "ESST"
          ? "ESST request submitted with protected routing."
          : `Time-off request submitted: ${payload.request?.status ?? "submitted"}.`,
        tone: "good"
      });
      setOperationalNote("");
      setRestrictedReason("");
    } catch (error) {
      setState({
        busy: false,
        message: error instanceof Error ? error.message : "Time-off request failed.",
        tone: "danger"
      });
    }
  }

  const noteRequired = requestType !== "ESST" && operationalNote.trim().length > 0 && operationalNote.trim().length < 8;
  const privateReasonMissing = requestType === "ESST" && restrictedReason.trim().length < 10;
  const invalidWindow = !startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt);

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Time off</span>
          <h2>Request time away</h2>
          <p>PTO, Minnesota ESST, and unpaid requests start here. ESST private reasons are restricted from ordinary manager view.</p>
        </div>
        <CalendarPlus aria-hidden="true" />
      </div>

      <div className={styles.timeOffForm}>
        <label>
          <span>Request type</span>
          <select disabled={state.busy} onChange={(event) => setRequestType(event.target.value as RequestType)} value={requestType}>
            <option value="PTO">PTO</option>
            <option value="ESST">MN ESST</option>
            <option value="UNPAID">Unpaid</option>
          </select>
        </label>
        <label>
          <span>Start</span>
          <input disabled={state.busy} onChange={(event) => setStartsAt(event.target.value)} type="datetime-local" value={startsAt} />
        </label>
        <label>
          <span>End</span>
          <input disabled={state.busy} onChange={(event) => setEndsAt(event.target.value)} type="datetime-local" value={endsAt} />
        </label>
        {requestType === "ESST" ? (
          <label className={styles.correctionWide}>
            <span>Private ESST reason</span>
            <textarea
              disabled={state.busy}
              onChange={(event) => setRestrictedReason(event.target.value)}
              placeholder="This reason is hashed/restricted and not shown in the ordinary manager queue."
              rows={3}
              value={restrictedReason}
            />
          </label>
        ) : (
          <label className={styles.correctionWide}>
            <span>Operational note</span>
            <textarea
              disabled={state.busy}
              onChange={(event) => setOperationalNote(event.target.value)}
              placeholder="Optional scheduling note for manager coverage planning."
              rows={3}
              value={operationalNote}
            />
          </label>
        )}
        <div className={styles.correctionFooter}>
          <p>Submitting a request does not change payroll by itself. Approval/review remains controlled.</p>
          <button disabled={state.busy || invalidWindow || noteRequired || privateReasonMissing} onClick={() => void submit()} type="button">
            Submit request
          </button>
        </div>
      </div>

      {state.message ? (
        <p className={state.tone === "good" ? styles.captureNotice : styles.captureError}>{state.message}</p>
      ) : null}
    </article>
  );
}
