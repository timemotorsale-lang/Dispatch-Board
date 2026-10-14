"use client";

import { AlertTriangle, CheckCircle2, Clock3, FileText, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { claimEndOfDayReminder, endOfDayReminderKey, getEndOfDayReminderSlot } from "@/lib/end-of-day-reminder-schedule";

type OperatingRhythmModel = {
  boardDate: string;
  operatingRhythm: {
    startTheDay: {
      complete: boolean;
      explanationCount: number;
      latestExplanation: string;
      message: string;
      remainingReminders: number;
      reminderCount: number;
      reminderLimit: number;
      state: "COMPLETE" | "LOCKED_UNTIL_REASON" | "REASON_ACCEPTED" | "REMIND";
    };
    endTheDay: {
      blockers: string[];
      closeWindowOpen: boolean;
      message: string;
      readinessScore: number;
      state: "ACTIVE" | "CLOSED" | "PREP_NOTICE" | "QUIET" | "START_REQUIRED";
    };
  };
  workbookId: string;
  workbookLabel: string;
  workbookScope: string;
  workspaceKey: string;
};

const criticalPrefixes = [
  "/appointments",
  "/diagnostics",
  "/vehicles/repair-workbench",
  "/vehicles/repair-orders",
  "/vehicles/shop",
  "/vehicles/quality-control"
];
const startReminderSnoozeMs = 15 * 60 * 1000;

function isCriticalWorkflow(pathname: string) {
  return criticalPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function postRhythmEvent(payload: Record<string, unknown>) {
  return fetch("/api/coo-workbook/rhythm", {
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
    method: "POST"
  });
}

function readStoredSnoozeUntil(key: string) {
  if (!key || typeof window === "undefined") return 0;
  try {
    const localValue = Number(window.localStorage.getItem(key) ?? 0);
    if (Number.isFinite(localValue)) return localValue;
  } catch {
    try {
      const sessionValue = Number(window.sessionStorage.getItem(key) ?? 0);
      if (Number.isFinite(sessionValue)) return sessionValue;
    } catch {
      return 0;
    }
  }
  return 0;
}

export function OperatingRhythmReminder() {
  const pathname = usePathname();
  const [model, setModel] = useState<OperatingRhythmModel | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const [visibleEndKey, setVisibleEndKey] = useState<string | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [manualSnooze, setManualSnooze] = useState<{ key: string; until: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const insideWorkbook = pathname === "/vehicles/coo-workbook" || pathname.startsWith("/vehicles/coo-workbook/");
  const criticalWorkflow = isCriticalWorkflow(pathname);
  const startState = model?.operatingRhythm.startTheDay.state ?? "COMPLETE";
  const startSnoozeKey = useMemo(() => model ? `operating-rhythm:start-snooze:${model.boardDate}:${model.workbookId}` : "", [model]);
  const storedSnoozeUntil = useMemo(() => readStoredSnoozeUntil(startSnoozeKey), [startSnoozeKey]);
  const snoozedUntil = manualSnooze?.key === startSnoozeKey ? manualSnooze.until : storedSnoozeUntil;
  const startSnoozed = snoozedUntil > clock.getTime();
  const startDismissed = dismissed && startSnoozed;
  const showStartReminder = Boolean(model && !model.operatingRhythm.startTheDay.complete && !startDismissed && (!startSnoozed || startState === "LOCKED_UNTIL_REASON"));
  const schedule = getEndOfDayReminderSlot(clock);
  const eligibleEndKey = model && model.boardDate === schedule.boardDate && schedule.slot &&
    ["PREP_NOTICE", "ACTIVE"].includes(model.operatingRhythm.endTheDay.state)
    ? endOfDayReminderKey(model.boardDate, model.workbookId, schedule.slot) : null;
  const showEndReminder = Boolean(eligibleEndKey && visibleEndKey === eligibleEndKey && !showStartReminder);
  const locked = showStartReminder && startState === "LOCKED_UNTIL_REASON" && !insideWorkbook && !criticalWorkflow;
  const storageKey = useMemo(() => model ? `operating-rhythm:${model.boardDate}:${model.workbookId}:${startState}:${pathname}` : "", [model, pathname, startState]);

  async function refresh() {
    const response = await fetch("/api/coo-workbook/rhythm", { cache: "no-store" });
    if (!response.ok) return;
    setModel(await response.json());
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/coo-workbook/rhythm", { cache: "no-store", signal: controller.signal })
      .then(async response => { if (response.ok) { const next = await response.json(); if (!controller.signal.aborted) setModel(next); } })
      .catch(() => { /* Retry at the next scheduled slot. */ });
    return () => controller.abort();
  }, [schedule.boardDate, schedule.slot]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    const onFocus = () => setClock(new Date());
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, []);

  useEffect(() => {
    if (!model || !showStartReminder || !storageKey) return;
    if (startState === "LOCKED_UNTIL_REASON") return;
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, "shown");
    void postRhythmEvent({
      action: "START_REMINDER_SHOWN",
      sourcePath: pathname,
      workbookId: model.workbookId
    }).then(() => refresh());
  }, [model, pathname, showStartReminder, startState, storageKey]);

  useEffect(() => {
    if (!model || !eligibleEndKey || showStartReminder) return;
    // Persist on display, not just dismissal: navigation, reloads, and other tabs
    // must not create another popup for the same scheduled slot.
    try {
      if (!claimEndOfDayReminder(window.localStorage, eligibleEndKey)) return;
    } catch {
      // Session storage retains deduplication when persistent storage is blocked.
      try {
        if (!claimEndOfDayReminder(window.sessionStorage, eligibleEndKey)) return;
      } catch { return; }
    }
    // Synchronize the visible popup with the external storage claim above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleEndKey(eligibleEndKey);
    void postRhythmEvent({
      action: "END_PREP_REMINDER_SHOWN",
      sourcePath: pathname,
      workbookId: model.workbookId
    }).catch(() => { /* Logging failures must not replay the popup. */ });
  }, [model, pathname, eligibleEndKey, showStartReminder]);

  async function explainDelay() {
    if (!model) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await postRhythmEvent({
        action: "START_DELAY_EXPLAINED",
        reason,
        sourcePath: pathname,
        workbookId: model.workbookId
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to save reason.");
      setReason("");
      setReasonOpen(false);
      setMessage("Reason saved. You have another reminder cycle.");
      snoozeStartReminder(startReminderSnoozeMs);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save reason.");
    } finally {
      setBusy(false);
    }
  }

  function snoozeStartReminder(durationMs = startReminderSnoozeMs) {
    const until = Date.now() + durationMs;
    setDismissed(true);
    setManualSnooze({ key: startSnoozeKey, until });
    if (!startSnoozeKey) return;
    try {
      window.localStorage.setItem(startSnoozeKey, String(until));
    } catch {
      try { window.sessionStorage.setItem(startSnoozeKey, String(until)); } catch { /* Ignore storage failures. */ }
    }
  }

  function dismissReminder() {
    if (showStartReminder) snoozeStartReminder();
    setVisibleEndKey(null);
  }

  async function continueForUrgentCustomer() {
    if (!model) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await postRhythmEvent({
        action: "START_DELAY_EXPLAINED",
        reason: "Urgent customer or critical workflow needed attention before Start The Day.",
        sourcePath: pathname,
        workbookId: model.workbookId
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to save urgent-work reason.");
      setMessage("Urgent work noted. Start The Day will stay quiet for a short window.");
      snoozeStartReminder(startReminderSnoozeMs);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save urgent-work reason.");
    } finally {
      setBusy(false);
    }
  }

  if (!model || (!showStartReminder && !showEndReminder)) return null;

  const start = model.operatingRhythm.startTheDay;
  const end = model.operatingRhythm.endTheDay;

  return (
    <section className={locked ? "operating-rhythm-lock" : "operating-rhythm-toast"} aria-label="Operating rhythm reminder" role={locked ? "dialog" : "status"} aria-modal={locked ? true : undefined}>
      <div className="operating-rhythm-card">
        <header>
          <span>{showStartReminder ? <ShieldCheck /> : <Clock3 />}</span>
          <div>
            <strong>{showStartReminder ? "Start The Day needed" : "End The Day preparation"}</strong>
            <p>{showStartReminder ? start.message : end.message}</p>
          </div>
          {!locked ? <button aria-label="Dismiss reminder" onClick={dismissReminder} type="button"><X /></button> : null}
        </header>

        {showEndReminder ? (
          <div className="operating-rhythm-meter">
            <span><b style={{ width: `${Math.max(0, Math.min(100, end.readinessScore))}%` }} /></span>
            <small>{end.readinessScore}/100 ready</small>
          </div>
        ) : null}

        {reasonOpen || locked ? (
          <label className="operating-rhythm-reason">
            <span>Reason Start The Day cannot happen yet</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Example: urgent customer issue, manager direction, system issue, or already handling critical carryover." />
          </label>
        ) : null}

        {message ? <p className="operating-rhythm-message">{message}</p> : null}

        <footer>
          {showStartReminder ? (
            <>
              <Link href="/vehicles/coo-workbook/effectiveness-pilot#start-the-day">Start now</Link>
              {!locked ? <button disabled={busy} onClick={() => snoozeStartReminder()} type="button">Remind me in 15</button> : null}
              {!locked ? <button disabled={busy} onClick={() => void continueForUrgentCustomer()} type="button">Urgent customer first</button> : null}
              {reasonOpen || locked ? (
                <button disabled={busy || !reason.trim()} onClick={explainDelay} type="button">Save reason</button>
              ) : (
                <button onClick={() => setReasonOpen(true)} type="button">Explain delay</button>
              )}
            </>
          ) : null}
          {showEndReminder ? (
            <>
              <Link href="/vehicles/coo-workbook#close-report"><FileText /> Review readiness</Link>
              <Link href="/vehicles/coo-workbook/carryover">Prepare carryover</Link>
            </>
          ) : null}
          {criticalWorkflow && startState === "LOCKED_UNTIL_REASON" ? <span><AlertTriangle /> Critical work stays available.</span> : null}
          {showStartReminder && !locked && !criticalWorkflow ? <span><Clock3 /> You can keep light work moving.</span> : null}
          {start.complete ? <span><CheckCircle2 /> {model.workbookLabel}</span> : null}
        </footer>
      </div>
    </section>
  );
}
