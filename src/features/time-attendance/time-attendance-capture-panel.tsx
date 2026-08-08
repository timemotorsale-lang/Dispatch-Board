"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Coffee, LogIn, LogOut, RefreshCw } from "lucide-react";

import type {
  TimeAttendanceCaptureAction,
  TimeAttendanceCaptureState
} from "@/server/time-attendance/capture-state";

import styles from "./time-attendance-console.module.css";

type CapturePanelProps = {
  initialState: TimeAttendanceCaptureState;
};

type CaptureResult = {
  duplicate: boolean;
  event: {
    eventType: TimeAttendanceCaptureAction;
    occurredAt: string;
  } | null;
  version: number;
  projection: { state: "CREATED" | "CURRENT" | "BLOCKED"; reason: string | null };
};

const actionLabels: Record<TimeAttendanceCaptureAction, string> = {
  CLOCK_IN: "Clock in",
  START_MEAL: "Start meal",
  END_MEAL: "End meal",
  START_PAID_REST: "Start paid rest",
  END_PAID_REST: "End paid rest",
  CLOCK_OUT: "Clock out"
};

const actionReasons: Record<TimeAttendanceCaptureAction, string> = {
  CLOCK_IN: "Employee clocked in from the Time Attendance console.",
  START_MEAL: "Employee started meal break from the Time Attendance console.",
  END_MEAL: "Employee ended meal break from the Time Attendance console.",
  START_PAID_REST: "Employee started paid rest from the Time Attendance console.",
  END_PAID_REST: "Employee ended paid rest from the Time Attendance console.",
  CLOCK_OUT: "Employee clocked out from the Time Attendance console."
};

function iconFor(action: TimeAttendanceCaptureAction) {
  if (action === "CLOCK_IN") return <LogIn size={16} aria-hidden="true" />;
  if (action === "CLOCK_OUT") return <LogOut size={16} aria-hidden="true" />;
  if (action === "START_MEAL" || action === "END_MEAL") return <Coffee size={16} aria-hidden="true" />;
  if (action === "START_PAID_REST" || action === "END_PAID_REST") return <Clock3 size={16} aria-hidden="true" />;
  return <Clock3 size={16} aria-hidden="true" />;
}

function newIdempotencyKey(action: TimeAttendanceCaptureAction) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `time-attendance-${action.toLowerCase()}-${random}`;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : "The time action could not be recorded.";
    throw new Error(message);
  }

  return body as T;
}

export function TimeAttendanceCapturePanel({ initialState }: CapturePanelProps) {
  const [state, setState] = useState(initialState);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!state.session) return;
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [state.session]);

  const primaryAction = useMemo(
    () => state.allowedActions.includes(state.nextPrimaryAction)
      ? state.nextPrimaryAction
      : state.allowedActions[0],
    [state.allowedActions, state.nextPrimaryAction]
  );
  const unavailable = Boolean(state.unavailableReason);
  const elapsedMinutes = state.session ? Math.max(0, Math.floor((now - new Date(state.session.openedAt).getTime()) / 60_000)) : 0;

  async function refreshState() {
    const next = await parseJsonResponse<TimeAttendanceCaptureState>(
      await fetch("/api/time-attendance/capture", { cache: "no-store" })
    );
    setState(next);
    return next;
  }

  function submitAction(action: TimeAttendanceCaptureAction) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await parseJsonResponse<CaptureResult>(
          await fetch("/api/time-attendance/capture", {
            body: JSON.stringify({
              commandType: action,
              completelyRelieved: action === "END_MEAL" || action === "END_PAID_REST" ? true : undefined,
              expectedVersion: state.expectedVersion,
              idempotencyKey: newIdempotencyKey(action),
              locationId: state.locationId,
              occurredAt: new Date().toISOString(),
              paid: action === "START_MEAL" ? false : undefined,
              reason: actionReasons[action],
              timezone: state.timezone
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST"
          })
        );
        const next = await refreshState();
        setNotice(`${actionLabels[action]} recorded${result.duplicate ? " as an existing safe retry" : ""}. Current status: ${next.statusLabel}.${result.projection.state === "BLOCKED" && result.projection.reason ? ` Card update: ${result.projection.reason}` : ""}`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The time action could not be recorded.");
      }
    });
  }

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.sectionEyebrow}>My time actions</span>
          <h2>Record today’s time</h2>
          <p>Use exact time. Corrections are handled separately so the original punch trail stays intact.</p>
        </div>
        <span className={state.state === "NONE" ? styles.chipNeutral : state.state === "ON_MEAL" ? styles.chipWarning : styles.chipGood}>
          {state.statusLabel}
        </span>
      </div>

      <div className={styles.captureStatus}>
        <div>
          <span>Elapsed shift</span>
          <strong>{state.session ? `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m` : "No open session"}</strong>
        </div>
        <div>
          <span>Last accepted punch</span>
          <strong>{state.lastAcceptedPunch ? `${actionLabels[state.lastAcceptedPunch.eventType as TimeAttendanceCaptureAction]} · ${new Date(state.lastAcceptedPunch.occurredAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "None yet"}</strong>
        </div>
      </div>

      <div className={styles.captureActions} aria-label="Time capture actions">
        {state.allowedActions.map((action) => (
          <button
            className={action === primaryAction ? styles.capturePrimary : styles.captureSecondary}
            disabled={isPending}
            key={action}
            onClick={() => submitAction(action)}
            type="button"
          >
            {iconFor(action)}
            {actionLabels[action]}
          </button>
        ))}
        <button className={styles.captureRefresh} disabled={isPending} onClick={() => startTransition(() => { void refreshState(); })} type="button">
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {unavailable ? (
        <p className={styles.captureError}>
          <AlertTriangle size={16} aria-hidden="true" />
          Capture is temporarily unavailable because the live Time & Attendance tables are not ready in this database. No time has been changed.
        </p>
      ) : null}
      {notice ? (
        <p className={styles.captureNotice}><CheckCircle2 size={16} aria-hidden="true" />{notice}</p>
      ) : null}
      {error ? (
        <p className={styles.captureError}><AlertTriangle size={16} aria-hidden="true" />{error}</p>
      ) : null}
    </article>
  );
}
