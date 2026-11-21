"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./time-attendance-console.module.css";

const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type Card = { id: string; name: string };

export function EsstPayrollPanel({ start, end }: { start: string; end: string }) {
  const router = useRouter();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [cardId, setCardId] = useState("");
  const [action, setAction] = useState<"SETUP" | "POST">("POST");
  const [exempt, setExempt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();

  async function loadCards() {
    setBusy(true);
    setMessage(undefined);
    try {
      const response = await fetch(`/api/time-attendance/esst-payroll?${new URLSearchParams({ start, end })}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      const choices = body as Card[];
      setCards(choices);
      setCardId(choices[0]?.id ?? "");
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Could not load payroll cards.", error: true });
    } finally {
      setBusy(false);
    }
  }

  async function save(form: FormData) {
    setBusy(true);
    setMessage(undefined);
    try {
      const response = await fetch("/api/time-attendance/esst-payroll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardId, action, reason: form.get("reason"), confirmedNoWorkGap: form.has("noWorkGap"),
          ...(action === "SETUP" ? {
            availableMinutes: Number(form.get("opening")), accruedMinutes: Number(form.get("accrued")),
            remainder: Number(form.get("remainder")), eligibleFrom: form.get("eligibleFrom"),
            calendarYearConfirmed: form.has("calendar"), standardAccrualConfirmed: form.has("standardAccrual"), eligibleConfirmed: form.has("eligibility"),
            weekdayMinutes: exempt ? weekdayNames.map(day => Number(form.get(day))) : null
          } : {})
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setMessage({ text: body.action === "SETUP" ? "Opening ESST balance verified." :
        body.duplicate ? "This pay period was already credited." : `${body.creditedMinutes} minutes of ESST credited.` });
      if (body.action === "SETUP") setAction("POST");
      router.refresh();
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Could not record ESST.", error: true });
    } finally {
      setBusy(false);
    }
  }

  return <details className={styles.workflowDisclosure} id="esst-payroll">
    <summary><span>Post Minnesota ESST</span></summary>
    <section className={styles.panel} aria-label="Post Minnesota ESST">
      <p className={styles.cardReadinessNote}>{start} – {end} · Post verified credit by the regular payday.</p>
      <button className={styles.ghostAction} type="button" onClick={() => void loadCards()} disabled={busy}>Load finalized cards</button>
      {cards?.length === 0 && <p>No locked or exported time cards for this period.</p>}
      {Boolean(cards?.length) && <form className={styles.timeOffWorkspaceForm} onSubmit={event => { event.preventDefault(); void save(new FormData(event.currentTarget)); }}>
        <label>Employee <select value={cardId} onChange={event => setCardId(event.target.value)} disabled={busy}>
          {cards?.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
        </select></label>
        <label>Action <select value={action} onChange={event => setAction(event.target.value === "SETUP" ? "SETUP" : "POST")} disabled={busy}>
          <option value="POST">Credit this period</option><option value="SETUP">Verify opening balance</option>
        </select></label>
        {action === "SETUP" && <>
          <p className={styles.cardReadinessNote}>Use payroll balances through the day before this period begins. Enter amounts in minutes.</p>
          <label><span><input name="calendar" type="checkbox" required /> Verified January–December ESST accrual year</span></label>
          <label><span><input name="standardAccrual" type="checkbox" required /> Verified standard accrual of 1 hour per 30 hours worked</span></label>
          <label><span><input name="eligibility" type="checkbox" required /> Verified ESST eligibility</span></label>
          <div className={styles.timeOffDay}>
            <label>First eligible date <input name="eligibleFrom" type="date" required /></label>
            <label>Available balance <input name="opening" type="number" min="0" max="4800" required /></label>
            <label>Accrued this year <input name="accrued" type="number" min="0" max="2880" required /></label>
            <label>Worked-minute remainder <input name="remainder" type="number" min="0" max="1799" required /></label>
          </div>
          <label>Work basis <select value={exempt ? "exempt" : "actual"} onChange={event => setExempt(event.target.value === "exempt")}>
            <option value="actual">Nonexempt · actual hours worked</option>
            <option value="exempt">Exempt from federal overtime · deemed hours</option>
          </select></label>
          {exempt && <>
            <p className={styles.cardReadinessNote}>Enter the verified weekly distribution of 40 hours, or the employee’s shorter normal workweek.</p>
            <div className={styles.timeOffDay}>{weekdayNames.map(day => <label key={day}>{day} minutes <input name={day} type="number" min="0" max="1440" required /></label>)}</div>
          </>}
        </>}
        {action === "POST" && <label><span><input name="noWorkGap" type="checkbox" /> Verified no work during any gap since the last credit (nonexempt only)</span></label>}
        <label>Payroll reference or reason <input name="reason" minLength={15} maxLength={500} required /></label>
        <button type="submit" className={styles.capturePrimary} disabled={busy || !cardId}>{action === "SETUP" ? "Verify opening" : "Credit ESST"}</button>
      </form>}
      {message && <p className={message.error ? styles.captureError : styles.captureNotice} role={message.error ? "alert" : "status"}>{message.text}</p>}
    </section>
  </details>;
}
