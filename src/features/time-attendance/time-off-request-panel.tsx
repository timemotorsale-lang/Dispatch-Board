"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { MyTimeOffWorkspace, TimeOffDay } from "@/server/time-attendance/time-off-workspace";
import styles from "./time-attendance-console.module.css";

type RequestType = "PTO" | "ESST" | "UNPAID" | "MN_PAID_LEAVE" | "PROTECTED_UNPAID_LEAVE";
type SavedRequest = MyTimeOffWorkspace["requests"][number];
type DayRow = TimeOffDay & { id: number };

const timeOffLabels: Record<string, string> = {
  PTO: "PTO", ESST: "Earned sick and safe time", UNPAID: "Unpaid time off",
  MN_PAID_LEAVE: "Minnesota Paid Leave", PROTECTED_UNPAID_LEAVE: "Protected unpaid leave"
};

function hours(minutes: number) {
  const duration = Math.abs(minutes);
  const sign = minutes < 0 ? "−" : "";
  return `${sign}${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}m` : ""}`;
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function requestStatus(request: SavedRequest) {
  if (request.status === "APPROVED" && ["MN_PAID_LEAVE", "PROTECTED_UNPAID_LEAVE", "PROTECTED_REFERRAL"].includes(request.requestType)) return "Referral reviewed";
  if (request.returned && request.status === "DRAFT") return "Returned for revision";
  const labels: Record<string, string> = {
    SUBMITTED: "Waiting for manager", MANAGER_APPROVED: "Coverage approved · awaiting final approval",
    LEAVE_ADMIN_REVIEW: "Waiting for Leave Administration", APPROVED: "Approved",
    DENIED: "Denied", WITHDRAWN: "Withdrawn", CANCELLED: "Cancelled", DRAFT: "Draft"
  };
  return labels[request.status] ?? request.status;
}

export function TimeOffRequestPanel({ workspace }: { workspace: MyTimeOffWorkspace }) {
  const router = useRouter();
  const defaultDay: DayRow = { id: 0, date: workspace.today, start: "", end: "" };
  const [requestType, setRequestType] = useState<RequestType>("PTO");
  const [days, setDays] = useState<DayRow[]>([defaultDay]);
  const [note, setNote] = useState("");
  const [esstQualified, setEsstQualified] = useState(false);
  const [editing, setEditing] = useState<SavedRequest | null>(null);
  const [withdrawing, setWithdrawing] = useState<SavedRequest | null>(null);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const referral = requestType === "MN_PAID_LEAVE" || requestType === "PROTECTED_UNPAID_LEAVE";
  const nextRowId = useRef(1);
  const command = useRef<{ body: string; key: string } | null>(null);
  const editTarget = useRef<HTMLHeadingElement>(null);
  const year = Number(days[0]?.date.slice(0, 4) || workspace.today.slice(0, 4));
  const balance = workspace.balances.find(entry => entry.type === requestType && entry.balanceYear === year);
  const pending = balance?.pending.filter(entry => entry.id !== editing?.id).reduce((total, entry) => total + entry.minutes, 0) ?? 0;
  const validDays = days.every(day => day.date && day.start && day.end && toMinutes(day.end) > toMinutes(day.start));
  const requested = validDays ? days.reduce((total, day) => total + toMinutes(day.end) - toMinutes(day.start), 0) : 0;
  const remaining = balance?.availableMinutes == null ? null : balance.availableMinutes - pending - requested;
  const duplicateDates = new Set(days.map(day => day.date)).size !== days.length;

  function changeDay(id: number, field: keyof TimeOffDay, value: string) {
    setDays(current => current.map(day => day.id === id ? { ...day, [field]: value } : day));
  }

  function resetForm() {
    setEditing(null);
    setDays([defaultDay]);
    setNote("");
    setEsstQualified(false);
    setRequestType("PTO");
  }

  function edit(request: SavedRequest) {
    setEditing(request);
    setWithdrawing(null);
    setRequestType(request.requestType as RequestType);
    setDays(request.days.map(day => ({ ...day, id: nextRowId.current++ })));
    setNote(request.note ?? "");
    setEsstQualified(false);
    setMessage(undefined);
    editTarget.current?.focus();
  }

  async function save(action: "REVISE" | "WITHDRAW" | "SUBMIT") {
    const target = action === "WITHDRAW" ? withdrawing : editing;
    const input = action === "WITHDRAW" ? {} : {
      requestType, days: days.map(({ date, start, end }) => ({ date, start, end })),
      operationalNote: requestType === "ESST" || referral ? "" : note,
      esstQualified
    };
    const body = { ...input, locationId: workspace.locationId, action, requestId: target?.id, expectedUpdatedAt: target?.version };
    const fingerprint = JSON.stringify(body);
    const key = command.current?.body === fingerprint ? command.current.key : crypto.randomUUID();
    command.current = { body: fingerprint, key };
    setBusy(true);
    setMessage(undefined);
    try {
      const response = await fetch("/api/time-attendance/time-off", {
        method: action === "SUBMIT" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, idempotencyKey: key })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "The request could not be saved.");
      command.current = null;
      if (action !== "WITHDRAW" || editing?.id === target?.id) resetForm();
      setWithdrawing(null);
      setMessage({ text: action === "WITHDRAW" ? "Request withdrawn." : action === "REVISE" ? "Revised request sent for review." : "Time-off request submitted." });
      router.refresh();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "The request could not be saved.", error: true });
    } finally {
      setBusy(false);
    }
  }

  if (!workspace.available) return <p className={styles.captureError} role="alert">Time off is temporarily unavailable.</p>;
  const calendarDate = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: workspace.timezone });
  const activeStatuses = ["SUBMITTED", "MANAGER_APPROVED", "LEAVE_ADMIN_REVIEW", "DRAFT"];
  const visible = workspace.requests.filter(request => filter === "all" || (filter === "active" ? activeStatuses.includes(request.status) : !activeStatuses.includes(request.status)));

  return <section className={styles.panel} aria-label="My Time Off">
    <div className={styles.panelHeader}><h2>My Time Off</h2></div>
    <div className={styles.timeSummary}>
      {workspace.balances.filter(entry => entry.balanceYear === year).map(entry => <div key={entry.type}>
        <span>{timeOffLabels[entry.type]} · {year}</span>
        <strong>{entry.availableMinutes === null ? "Balance unavailable" : hours(entry.availableMinutes)}</strong>
        {entry.carriedFromYear !== null && entry.carriedFromYear !== undefined && <small>Carryover from {entry.carriedFromYear}</small>}
        <small>{hours(entry.pending.reduce((total, item) => total + item.minutes, 0))} pending</small>
      </div>)}
    </div>
    <form className={styles.timeOffWorkspaceForm} onSubmit={event => { event.preventDefault(); void save(editing ? "REVISE" : "SUBMIT"); }}>
      <h3 tabIndex={-1} ref={editTarget}>{editing ? "Revise time off" : "New request"}</h3>
      <label>Time-off type <select disabled={busy || Boolean(editing)} value={requestType} onChange={event => setRequestType(event.target.value as RequestType)}>
        <option value="PTO">PTO</option><option value="ESST">Earned sick and safe time</option><option value="UNPAID">Unpaid time off</option>
        <option value="MN_PAID_LEAVE">Minnesota Paid Leave referral</option><option value="PROTECTED_UNPAID_LEAVE">Protected unpaid leave referral</option>
      </select></label>
      <p className={styles.cardReadinessNote}>{referral ? "Enter the first affected workday for Leave Administration." : "Enter the hours you need for each day."} · {workspace.timezone}</p>
      {days.map((day, index) => <div className={styles.timeOffDay} key={day.id}>
        <label>Date <input aria-label={`Date, day ${index + 1}`} required type="date" value={day.date} onChange={event => changeDay(day.id, "date", event.target.value)} disabled={busy} /></label>
        <label>Start <input aria-label={`Start, day ${index + 1}`} required type="time" value={day.start} onChange={event => changeDay(day.id, "start", event.target.value)} disabled={busy} /></label>
        <label>End <input aria-label={`End, day ${index + 1}`} required type="time" value={day.end} onChange={event => changeDay(day.id, "end", event.target.value)} disabled={busy} /></label>
        {days.length > 1 && <button className={styles.ghostAction} type="button" disabled={busy} onClick={() => setDays(current => current.filter(item => item.id !== day.id))}>Remove day {index + 1}</button>}
      </div>)}
      <button type="button" className={styles.ghostAction} disabled={busy || days.length >= 31} onClick={() => {
        const last = days.at(-1)!;
        const next = new Date((last.date || workspace.today) + "T00:00:00Z");
        next.setUTCDate(next.getUTCDate() + 1);
        setDays([...days, { ...last, id: nextRowId.current++, date: next.toISOString().slice(0, 10) }]);
      }}>Add another day</button>
      {requestType === "ESST" ? <label><span><input type="checkbox" checked={esstQualified} disabled={busy} required onChange={event => setEsstQualified(event.target.checked)} /> I’m requesting ESST for a qualifying purpose.</span></label> :
        referral ? <small>Leave Administration will follow up about your request.</small> :
          <label>Scheduling note (optional)<textarea rows={2} disabled={busy} value={note} minLength={8} onChange={event => setNote(event.target.value)} /></label>}
      {duplicateDates && <p className={styles.inlineError}>Enter each date once.</p>}
      {validDays && !referral && <p className={styles.cardReadinessNote}>
        {hours(requested)} estimated{remaining !== null ? ` · ${hours(remaining)} projected after approval of pending requests and this request` : ""}.
        {remaining !== null && remaining < 0 ? " Review the balance before submitting." : ""}
      </p>}
      <div className={styles.cardExecutionRow}>
        <button className={styles.capturePrimary} type="submit" disabled={busy || !validDays || duplicateDates}>{editing ? "Send revision" : "Submit request"}</button>
        {editing && <button className={styles.ghostAction} type="button" disabled={busy} onClick={resetForm}>Cancel edit</button>}
      </div>
    </form>
    {message && <p className={message.error ? styles.captureError : styles.captureNotice} role={message.error ? "alert" : "status"}>{message.text}</p>}
    <div className={styles.timeOffHistory}>
      <div className={styles.panelHeader}><h3>My requests</h3><label>Status <select value={filter} onChange={event => setFilter(event.target.value)}>
        <option value="all">All requests</option><option value="active">In progress</option><option value="closed">Closed</option>
      </select></label></div>
      {!visible.length && <p className={styles.cardReadinessNote}>No matching time-off requests.</p>}
      {visible.map(request => <article className={styles.timeOffHistoryRow} key={request.id}>
        <div className={styles.panelHeader}>
          <strong>{timeOffLabels[request.requestType] ?? request.requestType} · {hours(request.requestedMinutes)}</strong>
          <span className={request.returned ? styles.chipWarning : styles.chipNeutral}>{requestStatus(request)}</span>
        </div>
        <p>{calendarDate.formatRange(new Date(request.startsAt), new Date(request.endsAt))}</p>
        {request.decisionReason && <p>{request.decisionReason}</p>}
        {request.projectionPending && <p className={styles.cardReadinessNote}>Pay-period update is pending. Payroll or Leave Administration can retry it.</p>}
        {request.rebuiltPeriods.length > 0 && <div className={styles.cardExecutionRow}>
          {request.rebuiltPeriods.map(period => <Link key={period.start} href={`/time-attendance?view=my-time&period=${period.start}_${period.end}#pay-periods`}>Time card for {period.start}</Link>)}
        </div>}
        <div className={styles.cardExecutionRow}>
          {request.canRevise && <button className={styles.ghostAction} type="button" disabled={busy} onClick={() => edit(request)}>Revise request</button>}
          {request.canWithdraw && <button className={styles.ghostAction} type="button" disabled={busy} onClick={() => setWithdrawing(request)}>Withdraw request</button>}
          {withdrawing?.id === request.id && <>
            <button className={styles.captureSecondary} type="button" disabled={busy} onClick={() => void save("WITHDRAW")}>Confirm withdrawal</button>
            <button className={styles.ghostAction} type="button" disabled={busy} onClick={() => setWithdrawing(null)}>Keep request</button>
          </>}
        </div>
      </article>)}
    </div>
  </section>;
}
