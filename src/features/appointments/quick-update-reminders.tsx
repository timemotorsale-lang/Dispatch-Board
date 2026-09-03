"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CategoryBadge, categoryRowStyle } from "./category-badge";

type Reminder = { id: string; text: string; category?: string; person: string; company: string; convertedTaskId: string | null };

export function QuickUpdateReminders({ date }: { date: string }) {
  const [result, setResult] = useState<{ date: string; reminders: Reminder[]; error?: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/appointments/reminders?date=${encodeURIComponent(date)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load reminders");
        const data = await response.json();
        if (!controller.signal.aborted) setResult({ date, reminders: data.reminders });
      } catch {
        if (!controller.signal.aborted) setResult({ date, reminders: [], error: true });
      }
    }
    void load();
    window.addEventListener("focus", load);
    return () => { controller.abort(); window.removeEventListener("focus", load); };
  }, [date]);
  const current = result?.date === date ? result : null;
  return <section className="appointment-panel" aria-label="Quick Update reminders">
    <header><strong>My reminders · {date}</strong><small>Quick Updates and checklist · no appointment time reserved</small></header>
    {!current ? <p role="status">Loading reminders…</p> : current.error ? <p role="alert">Reminders could not load. Reopen this schedule to retry.</p> : current.reminders.length ? <div className="appointment-flow-group blue"><table>
      <thead><tr><th>Reminder</th><th>Person / company</th><th>Action</th></tr></thead>
      <tbody>{current.reminders.map(item => <tr key={item.id} style={categoryRowStyle(item.category)}><td><CategoryBadge category={item.category} /><br />{item.text}</td><td>{[item.person, item.company].filter(Boolean).join(" · ") || "—"}</td><td>{item.convertedTaskId ? <Link href={`/tasks/${encodeURIComponent(item.convertedTaskId)}`}>Open task</Link> : <span>Follow-up needed</span>}</td></tr>)}</tbody>
    </table></div> : <p>No reminders for this date.</p>}
  </section>;
}
