"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { CategoryBadge, categoryRowStyle } from "./category-badge";

type Reminder = { id: string; text: string; category?: string; person: string; phoneNumber?: string; company: string; convertedTaskId: string | null };

const reminderCategoryOptions = [
  ["CUSTOMER", "Customer"],
  ["APPOINTMENT", "Appointment"],
  ["SERVICE_REPAIR", "Service / Repair"],
  ["INSURANCE", "Insurance"],
  ["FINANCE", "Finance"],
  ["TITLE_REGISTRATION", "Title / DMV"],
  ["INVENTORY_PARTS", "Inventory / Parts"],
  ["DELIVERY", "Delivery"],
  ["VENDOR", "Vendor"],
  ["STAFF", "Staff"],
  ["SAFETY", "Safety"],
  ["ADMINISTRATION", "Administration"],
  ["OTHER", "Other / General"]
] as const;

export function QuickUpdateReminders({ date }: { date: string }) {
  const [result, setResult] = useState<{ date: string; reminders: Reminder[]; error?: boolean } | null>(null);
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState({ category: "OTHER", text: "" });
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
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

  function startEdit(item: Reminder) {
    if (item.id.startsWith("checklist:")) return;
    setEditingId(item.id);
    setDraft({ category: item.category ?? "OTHER", text: item.text });
    setSaveMessage("");
  }

  async function saveReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || !current) return;
    setSaving(true);
    setSaveMessage("Saving reminder...");
    try {
      const response = await fetch("/api/appointments/reminders", {
        body: JSON.stringify({ id: editingId, ...draft }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Reminder could not be updated.");
      const updated = payload?.reminder as Reminder | undefined;
      setResult({
        ...current,
        reminders: current.reminders.map((item) => item.id === editingId && updated ? { ...item, ...updated } : item)
      });
      setEditingId("");
      setSaveMessage("Reminder updated.");
    } catch (caught) {
      setSaveMessage(caught instanceof Error ? caught.message : "Reminder could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="appointment-panel" aria-label="Quick Update reminders">
    <header><strong>My reminders · {date}</strong><small>Quick Updates and checklist · no appointment time reserved</small></header>
    {!current ? <p role="status">Loading reminders…</p> : current.error ? <p role="alert">Reminders could not load. Reopen this schedule to retry.</p> : current.reminders.length ? <div className="appointment-flow-group blue"><table>
      <thead><tr><th>Reminder</th><th>Person / company</th><th>Action</th></tr></thead>
      <tbody>{current.reminders.map(item => {
        const editable = !item.id.startsWith("checklist:");
        const isEditing = editingId === item.id;
        return <tr key={item.id} style={categoryRowStyle(item.category)}>
          <td>
            {isEditing ? (
              <form onSubmit={saveReminder} style={{ display: "grid", gap: 8 }}>
                <label>
                  <span>Reason / category</span>
                  <select value={draft.category} disabled={saving} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>
                    {reminderCategoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Reminder reason</span>
                  <textarea value={draft.text} disabled={saving} onChange={(event) => setDraft({ ...draft, text: event.target.value })} rows={4} />
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button disabled={saving} type="submit">{saving ? "Saving..." : "Save reminder"}</button>
                  <button disabled={saving} onClick={() => setEditingId("")} type="button">Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <CategoryBadge category={item.category} /><br />{item.text}
              </>
            )}
          </td>
          <td>{[item.person, item.phoneNumber, item.company].filter(Boolean).join(" · ") || "—"}</td>
          <td>
            {item.convertedTaskId ? <Link href={`/tasks/${encodeURIComponent(item.convertedTaskId)}`}>Open task</Link> : <span>Follow-up needed</span>}
            {editable && !isEditing ? <><br /><button onClick={() => startEdit(item)} type="button">Edit reason</button></> : null}
          </td>
        </tr>;
      })}</tbody>
    </table></div> : <p>No reminders for this date.</p>}
    {saveMessage ? <p aria-live="polite">{saveMessage}</p> : null}
  </section>;
}
