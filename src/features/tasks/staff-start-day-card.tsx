"use client";

import { CheckCircle2, CircleAlert, ClipboardCheck } from "lucide-react";
import { useState, useTransition } from "react";

import type { StaffDayReadModel } from "@/server/services/staff-day";

export function StaffStartDayCard({ boardDate, initialStaffDay }: { boardDate: string; initialStaffDay: StaffDayReadModel }) {
  const [staffDay, setStaffDay] = useState(initialStaffDay);
  const [reviewed, setReviewed] = useState(Boolean(initialStaffDay.startAcknowledgedAt));
  const [hasBlocker, setHasBlocker] = useState(Boolean(initialStaffDay.startingBlockerCode));
  const [blockerCode, setBlockerCode] = useState(initialStaffDay.startingBlockerCode ?? "");
  const [blockerNote, setBlockerNote] = useState(initialStaffDay.startingBlockerNote ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startDay() {
    startTransition(async () => {
      const response = await fetch(`/api/my-day?date=${encodeURIComponent(boardDate)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewedPriorities: reviewed, hasBlocker, blockerCode, blockerNote })
      });
      const result = await response.json().catch(() => null) as { error?: string; staffDay?: StaffDayReadModel } | null;
      if (!response.ok || !result?.staffDay) return setMessage(result?.error ?? "Unable to start your day.");
      setStaffDay(result.staffDay);
      setMessage("Priorities reviewed. Your day is ready.");
    });
  }

  function toggleDuty(itemId: string, completed: boolean) {
    setStaffDay((current) => ({
      ...current,
      dutyItems: current.dutyItems.map((item) =>
        item.id === itemId ? { ...item, completed } : item
      )
    }));
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/my-day/duties/${encodeURIComponent(itemId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed })
      });
      if (!response.ok) {
        setStaffDay((current) => ({
          ...current,
          dutyItems: current.dutyItems.map((item) =>
            item.id === itemId ? { ...item, completed: !completed } : item
          )
        }));
        setMessage("Unable to update this daily responsibility.");
        return;
      }
      setMessage("Daily responsibility saved.");
    });
  }

  const started = Boolean(staffDay.startAcknowledgedAt);

  return (
    <section className="staff-start-day-card" aria-label="Start Day accountability">
      <header><div><span className="eyebrow">Daily responsibilities</span><h2>{started ? "Today is active" : "Start Day"}</h2><p>Review priorities, identify blockers, and keep your role responsibilities visible.</p></div><span className={started ? "status-pill status-success" : "status-pill status-warning"}>{started ? "Ready" : "Review required"}</span></header>
      <div className="staff-start-day-grid">
        <div><h3><ClipboardCheck size={16} /> Role checklist</h3><div className="staff-day-duty-list">{staffDay.dutyItems.map((item) => <label key={item.id}><input checked={item.completed} disabled={pending || !started} onChange={(event) => toggleDuty(item.id, event.target.checked)} type="checkbox" /><span>{item.label}</span><small>{item.workflowArea.replaceAll("_", " ")}</small></label>)}</div></div>
        <div className="staff-start-day-confirm"><h3><CircleAlert size={16} /> Start confirmation</h3><label><input checked={reviewed} disabled={started} onChange={(event) => setReviewed(event.target.checked)} type="checkbox" /> I reviewed today&apos;s tasks and top priorities.</label><label><input checked={hasBlocker} disabled={started} onChange={(event) => setHasBlocker(event.target.checked)} type="checkbox" /> I have a starting blocker.</label>{hasBlocker ? <><select aria-label="Starting blocker category" disabled={started} value={blockerCode} onChange={(event) => setBlockerCode(event.target.value)}><option value="">Select category</option><option value="MISSING_INFORMATION">Missing information</option><option value="WAITING_ON_MANAGER">Waiting on manager</option><option value="SYSTEM_OR_EQUIPMENT">System or equipment</option><option value="OTHER">Other</option></select><textarea aria-label="Starting blocker note" disabled={started} placeholder="Explain what is needed to move forward." rows={2} value={blockerNote} onChange={(event) => setBlockerNote(event.target.value)} /></> : null}{!started ? <button className="pill pill-primary" disabled={pending || !reviewed || hasBlocker && (!blockerCode || !blockerNote.trim())} onClick={startDay} type="button">{pending ? "Starting..." : "Confirm Start Day"}</button> : <p className="staff-day-ready-copy"><CheckCircle2 size={16} /> Priorities acknowledged.</p>}{message ? <p role="status">{message}</p> : null}</div>
      </div>
    </section>
  );
}
