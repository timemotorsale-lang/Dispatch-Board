"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, Coffee, LogIn, LogOut, RefreshCw } from "lucide-react";

import type {
  TimeAttendanceCaptureAction,
  TimeAttendanceCaptureState
} from "@/server/time-attendance/capture-state";

import styles from "./time-attendance-console.module.css";

type CapturePanelProps = {
  initialState: TimeAttendanceCaptureState;
  initialClock: string;
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
type PunchRequest = {
  commandType: TimeAttendanceCaptureAction;
  completelyRelieved?: boolean;
  expectedVersion: number;
  idempotencyKey: string;
  locationId: string;
  occurredAt: string;
  reason: string;
  timezone: string;
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
    throw Object.assign(new Error(message), { status: response.status });
  }

  return body as T;
}

export function TimeAttendanceCapturePanel({ initialState, initialClock }: CapturePanelProps) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.parse(initialClock));
  const [breakEnding, setBreakEnding] = useState<{ action: "END_MEAL" | "END_PAID_REST"; occurredAt: string } | null>(null);
  const [retry, setRetry] = useState<PunchRequest | null>(null);
  const [statusOutdated, setStatusOutdated] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!state.session) return;
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, [state.session]);

  const primaryAction = useMemo(
    () => state.allowedActions.includes(state.nextPrimaryAction)
      ? state.nextPrimaryAction
      : state.allowedActions[0],
    [state.allowedActions, state.nextPrimaryAction]
  );
  const punchActions = state.allowedActions.filter((action) => action === "CLOCK_IN" || action === "CLOCK_OUT");
  const topActions = punchActions.length ? punchActions : primaryAction ? [primaryAction] : [];
  const secondaryActions = state.allowedActions.filter((action) => !topActions.includes(action));
  const unavailable = Boolean(state.unavailableReason);
  const elapsedMinutes = state.session ? Math.max(0, Math.floor((now - new Date(state.session.openedAt).getTime()) / 60_000)) : 0;

  async function refreshState() {
    const next = await parseJsonResponse<TimeAttendanceCaptureState>(
      await fetch("/api/time-attendance/capture", { cache: "no-store" })
    );
    setState(next);
    if (next.lastAcceptedPunch) {
      const acceptedAt = Date.parse(next.lastAcceptedPunch.occurredAt);
      setNow(value => Math.max(value, acceptedAt));
    }
    setStatusOutdated(false);
    return next;
  }

  function recordPunch(request: PunchRequest) {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await parseJsonResponse<CaptureResult>(
          await fetch("/api/time-attendance/capture", {
            body: JSON.stringify(request),
            headers: { "Content-Type": "application/json" },
            method: "POST"
          })
        );
        setBreakEnding(null);
        setNotice(`${actionLabels[request.commandType]} recorded.${result.projection.state === "BLOCKED" && result.projection.reason ? ` Card update: ${result.projection.reason}` : ""}`);
        try {
          setRetry(null);
          await refreshState();
        } catch {
          setStatusOutdated(true);
          setError("Your punch was recorded. Refresh your status before making another punch.");
        }
        router.refresh();
      } catch (caught) {
        const status = caught instanceof Error && "status" in caught ? Number(caught.status) : null;
        if (status && status < 500) {
          setRetry(null);
          setBreakEnding(null);
          setError(caught instanceof Error ? caught.message : "The time action could not be recorded.");
          if (status === 409) await refreshState().catch(() => setStatusOutdated(true));
        } else {
          setRetry(request);
          setBreakEnding(null);
          setError("We could not confirm this punch. Retry the same punch to check or finish recording it.");
        }
      } finally {
        inFlight.current = false;
      }
    });
  }

  function submitAction(action: TimeAttendanceCaptureAction, completelyRelieved?: boolean) {
    if (retry || statusOutdated || inFlight.current) return;
    if ((action === "END_MEAL" || action === "END_PAID_REST") && completelyRelieved === undefined) {
      setBreakEnding({ action, occurredAt: new Date().toISOString() });
      return;
    }
    recordPunch({
      commandType: action,
      completelyRelieved,
      expectedVersion: state.expectedVersion,
      idempotencyKey: newIdempotencyKey(action),
      locationId: state.locationId,
      occurredAt: breakEnding?.action === action ? breakEnding.occurredAt : new Date().toISOString(),
      reason: actionReasons[action],
      timezone: state.timezone
    });
  }

  const disabled = isPending || Boolean(retry) || Boolean(breakEnding) || statusOutdated;
  const statusLabel = state.paidRestActive ? "On paid break" : state.statusLabel;

  return (
    <article className={`${styles.panel} ${styles.captureHeroPanel}`}>
      <div className={styles.captureHeader}>
        <h2>Clock in / clock out</h2>
        <span className={state.state === "NONE" ? styles.chipNeutral : state.state === "ON_MEAL" ? styles.chipWarning : styles.chipGood}>
          {statusLabel}
        </span>
      </div>

      <dl className={styles.captureStatus}>
        <div>
          <dt>Elapsed shift</dt>
          <dd>{state.session ? `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m` : "—"}</dd>
        </div>
        <div>
          <dt>Last punch</dt>
          <dd>{state.lastAcceptedPunch ? `${actionLabels[state.lastAcceptedPunch.eventType as TimeAttendanceCaptureAction] ?? state.lastAcceptedPunch.eventType.replaceAll("_", " ")} · ${new Date(state.lastAcceptedPunch.occurredAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: state.timezone })}` : "None yet"}</dd>
        </div>
      </dl>

      <div className={styles.captureCommand} aria-label="Time capture actions">
        {topActions.length ? (
          <div className={styles.capturePunchActions}>
            {topActions.map((action) => (
              <button
                className={action === "CLOCK_OUT" ? styles.captureClockOut : styles.capturePrimary}
                disabled={disabled}
                key={action}
                onClick={() => submitAction(action)}
                type="button"
              >
                {iconFor(action)}
                {actionLabels[action]}
              </button>
            ))}
          </div>
        ) : (
          <p className={styles.captureError}>
            <AlertTriangle size={16} aria-hidden="true" />
            No time action is currently available.
          </p>
        )}
        {secondaryActions.length ? (
          <div className={styles.captureActions} role="group" aria-label="Meal and break actions">
            {secondaryActions.map((action) => (
              <button
                className={styles.captureSecondary}
                disabled={disabled}
                key={action}
                onClick={() => submitAction(action)}
                type="button"
              >
                {iconFor(action)}
                {actionLabels[action]}
              </button>
            ))}
          </div>
        ) : null}
        <button className={styles.captureRefresh} disabled={isPending || Boolean(retry) || Boolean(breakEnding)} onClick={() => startTransition(async () => {
          setError(null);
          try { await refreshState(); router.refresh(); }
          catch { setStatusOutdated(true); setError("Time status could not be refreshed. Try again before punching."); }
        })} type="button">
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {breakEnding && <fieldset className={styles.breakReview} disabled={isPending}>
        <legend>Were you fully relieved of duties for this {breakEnding.action === "END_MEAL" ? "meal" : "break"}?</legend>
        <button className={styles.capturePrimary} type="button" onClick={() => submitAction(breakEnding.action, true)}>Yes, I was fully relieved</button>
        <button className={styles.captureSecondary} type="button" onClick={() => submitAction(breakEnding.action, false)}>No, I worked or was interrupted</button>
        <button className={styles.captureRefresh} type="button" onClick={() => setBreakEnding(null)}>Cancel</button>
      </fieldset>}

      {retry && <button className={styles.capturePrimary} type="button" disabled={isPending} onClick={() => recordPunch(retry)}>Retry same punch</button>}

      {unavailable ? (
        <p className={styles.captureError}>
          <AlertTriangle size={16} aria-hidden="true" />
          Time capture is temporarily unavailable. Refresh to check your status.
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
