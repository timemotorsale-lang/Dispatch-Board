"use client";

import { AlertTriangle, CheckCircle2, Clock3, FileText, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
      state: "ACTIVE" | "CLOSED" | "PREP_NOTICE" | "QUIET";
    };
  };
  workbookId: string;
  workbookLabel: string;
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

export function OperatingRhythmReminder() {
  const pathname = usePathname();
  const [model, setModel] = useState<OperatingRhythmModel | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const insideWorkbook = pathname === "/vehicles/coo-workbook" || pathname.startsWith("/vehicles/coo-workbook/");
  const criticalWorkflow = isCriticalWorkflow(pathname);
  const startState = model?.operatingRhythm.startTheDay.state ?? "COMPLETE";
  const showStartReminder = Boolean(model && !model.operatingRhythm.startTheDay.complete && !dismissed);
  const showEndReminder = Boolean(model && !dismissed && ["PREP_NOTICE", "ACTIVE"].includes(model.operatingRhythm.endTheDay.state));
  const locked = showStartReminder && startState === "LOCKED_UNTIL_REASON" && !insideWorkbook && !criticalWorkflow;
  const storageKey = useMemo(() => model ? `operating-rhythm:${model.boardDate}:${model.workbookId}:${startState}:${pathname}` : "", [model, pathname, startState]);

  async function refresh() {
    const response = await fetch("/api/coo-workbook/rhythm", { cache: "no-store" });
    if (!response.ok) return;
    setModel(await response.json());
  }

  useEffect(() => {
    void refresh();
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
    if (!model || !showEndReminder || model.operatingRhythm.endTheDay.state !== "PREP_NOTICE") return;
    const key = `operating-rhythm:${model.boardDate}:${model.workbookId}:end-prep`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "shown");
    void postRhythmEvent({
      action: "END_PREP_REMINDER_SHOWN",
      sourcePath: pathname,
      workbookId: model.workbookId
    });
  }, [model, pathname, showEndReminder]);

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
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save reason.");
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
          {!locked ? <button aria-label="Dismiss reminder" onClick={() => setDismissed(true)} type="button"><X /></button> : null}
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
              <Link href="/vehicles/coo-workbook">Start now</Link>
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
          {start.complete ? <span><CheckCircle2 /> {model.workbookLabel}</span> : null}
        </footer>
      </div>
    </section>
  );
}
