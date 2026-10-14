"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, Clock3, Coffee, LogIn, LogOut, RefreshCw, ShieldCheck } from "lucide-react";

import type {
  TimeAttendanceCaptureAction,
  TimeAttendanceCaptureState
} from "@/server/time-attendance/capture-state";

type CaptureResult = {
  duplicate: boolean;
  event: { eventType: TimeAttendanceCaptureAction; occurredAt: string } | null;
  version: number;
};

const actionCopy: Record<TimeAttendanceCaptureAction, { label: string; reason: string }> = {
  CLOCK_IN: {
    label: "Clock In & Open My Work",
    reason: "Technician clocked in from the Technician Workspace."
  },
  START_MEAL: {
    label: "Start Meal",
    reason: "Technician started a meal break from the Technician Workspace."
  },
  END_MEAL: {
    label: "End Meal & Return to Work",
    reason: "Technician ended a meal break from the Technician Workspace."
  },
  START_PAID_REST: {
    label: "Start Paid Rest",
    reason: "Technician started paid rest from the Technician Workspace."
  },
  END_PAID_REST: {
    label: "End Paid Rest & Return to Work",
    reason: "Technician ended paid rest from the Technician Workspace."
  },
  CLOCK_OUT: {
    label: "Clock Out",
    reason: "Technician clocked out from the Technician Workspace."
  }
};

function newIdempotencyKey(action: TimeAttendanceCaptureAction) {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `technician-shift-${action.toLowerCase()}-${suffix}`;
}

async function parseResponse<T>(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
      ? body.error
      : "The shift action could not be recorded.";
    throw new Error(message);
  }
  return body as T;
}

export function TechnicianShiftControl({
  hasRunningRepair,
  initialState
}: {
  hasRunningRepair: boolean;
  initialState: TimeAttendanceCaptureState;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const unavailable = Boolean(state.unavailableReason);
  const gateActive = !unavailable && (state.state !== "OPEN" || state.paidRestActive);

  async function refreshState() {
    const next = await parseResponse<TimeAttendanceCaptureState>(
      await fetch("/api/time-attendance/capture", { cache: "no-store" })
    );
    setState(next);
    router.refresh();
  }

  function submit(action: TimeAttendanceCaptureAction) {
    setError(null);
    startTransition(async () => {
      try {
        await parseResponse<CaptureResult>(
          await fetch("/api/time-attendance/capture", {
            body: JSON.stringify({
              commandType: action,
              completelyRelieved: action === "END_MEAL" || action === "END_PAID_REST" ? true : undefined,
              expectedVersion: state.expectedVersion,
              idempotencyKey: newIdempotencyKey(action),
              locationId: state.locationId,
              occurredAt: new Date().toISOString(),
              paid: action === "START_MEAL" ? false : undefined,
              reason: actionCopy[action].reason,
              timezone: state.timezone
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST"
          })
        );
        await refreshState();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "The shift action could not be recorded.");
      }
    });
  }

  if (unavailable) {
    return (
      <section className="technician-shift-unavailable" aria-label="Shift status unavailable">
        <AlertTriangle aria-hidden="true" size={20} />
        <div>
          <strong>Shift clock is temporarily unavailable</strong>
          <p>My Work remains available. Notify the shop manager so today&apos;s time can be reconciled without delaying assigned repairs.</p>
        </div>
        <button disabled={isPending} onClick={() => startTransition(() => { void refreshState(); })} type="button">
          <RefreshCw aria-hidden="true" size={16} /> Retry
        </button>
      </section>
    );
  }

  if (gateActive) {
    const onMeal = state.state === "ON_MEAL";
    const onPaidRest = state.paidRestActive;
    const action: TimeAttendanceCaptureAction = onMeal ? "END_MEAL" : onPaidRest ? "END_PAID_REST" : "CLOCK_IN";
    return (
      <main className="technician-shift-gate">
        <section aria-label="Technician shift start">
          <div className="technician-shift-gate-icon">
            {onMeal ? <Coffee aria-hidden="true" size={32} /> : <Clock3 aria-hidden="true" size={32} />}
          </div>
          <span className="eyebrow">Technician Workspace</span>
          <h1>{onMeal ? "Meal break in progress" : onPaidRest ? "Paid rest in progress" : "Start your shift"}</h1>
          <p>
            {onMeal || onPaidRest
              ? `End your ${onMeal ? "meal break" : "paid rest"} before returning to assigned repairs.`
              : "Record your attendance once, then continue directly to My Work."}
          </p>
          <button className="pill pill-primary technician-shift-primary" disabled={isPending} onClick={() => submit(action)} type="button">
            {onMeal || onPaidRest ? <Coffee aria-hidden="true" size={19} /> : <LogIn aria-hidden="true" size={19} />}
            {isPending ? "Recording…" : actionCopy[action].label}
          </button>
          <div className="technician-shift-separation">
            <ShieldCheck aria-hidden="true" size={18} />
            <span><b>Shift time is separate from repair labor.</b> Open a repair from My Work to start its job clock.</span>
          </div>
          {error ? <p className="technician-shift-error"><AlertTriangle aria-hidden="true" size={17} />{error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <section className="technician-shift-status" aria-label="Current shift status">
      <div>
        <span><Clock3 aria-hidden="true" size={16} /> Shift status</span>
        <strong>Clocked in</strong>
        {state.session ? <small>Since {new Date(state.session.openedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small> : null}
      </div>
      <div className="technician-shift-status-actions">
        <button disabled={isPending} onClick={() => submit("START_MEAL")} type="button">
          <Coffee aria-hidden="true" size={16} /> Start Meal
        </button>
        <button disabled={isPending} onClick={() => submit("START_PAID_REST")} type="button">
          <Clock3 aria-hidden="true" size={16} /> Start Paid Rest
        </button>
        <button
          disabled={isPending || hasRunningRepair}
          onClick={() => submit("CLOCK_OUT")}
          title={hasRunningRepair ? "Pause or finish the active repair before clocking out." : undefined}
          type="button"
        >
          <LogOut aria-hidden="true" size={16} /> Clock Out
        </button>
      </div>
      {hasRunningRepair ? <p>Pause or finish the active repair labor clock before clocking out.</p> : null}
      {error ? <p className="technician-shift-error"><AlertTriangle aria-hidden="true" size={17} />{error}</p> : null}
    </section>
  );
}
