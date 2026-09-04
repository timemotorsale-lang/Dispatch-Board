"use client";
import { useState } from "react";
import styles from "./quick-update-editor.module.css";

type Fields = { text: string; category: string; person: string; phoneNumber: string; company: string; followUpNeeded: boolean; dueWindow: string };
export function QuickUpdateEditor({ item, categories, disabled, onSaved }: {
  item: Fields & { id: string; convertedTaskId: string | null };
  categories: Array<{ label: string; value: string }>;
  disabled: boolean;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Fields | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  async function save() {
    if (!draft || saving || disabled) return;
    setSaving(true); setNotice("");
    try {
      const response = await fetch(`/api/coo-workbook/quick-updates/${encodeURIComponent(item.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, text: draft.text.trim(), dueWindow: draft.followUpNeeded ? draft.dueWindow : "" })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save your changes. Please try again.");
      setDraft(null); setNotice("Update saved.");
      try { await onSaved(); } catch { setNotice("Update saved. Refresh this page to see the latest details."); }
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save changes."); }
    finally { setSaving(false); }
  }
  return <div className={styles.editor}>
    {!draft ? <button type="button" disabled={disabled || saving} onClick={() => {
      setDraft({ text: item.text, category: item.category, person: item.person, phoneNumber: item.phoneNumber, company: item.company, followUpNeeded: item.followUpNeeded, dueWindow: item.dueWindow }); setNotice("");
    }}>Edit update</button> : <div role="group" aria-label="Edit saved Quick Update" className={styles.fields}>
      <label className={styles.wide}>Update details<textarea maxLength={1200} disabled={saving || disabled} value={draft.text} onChange={event => setDraft({ ...draft, text: event.target.value })} /></label>
      <label>Category<select disabled={saving || disabled} value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}>{categories.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label>Person<input maxLength={180} disabled={saving || disabled} value={draft.person} onChange={event => setDraft({ ...draft, person: event.target.value })} /></label>
      <label>Phone number<input inputMode="tel" maxLength={50} disabled={saving || disabled} value={draft.phoneNumber} onChange={event => setDraft({ ...draft, phoneNumber: event.target.value })} /></label>
      <label>Company<input maxLength={180} disabled={saving || disabled} value={draft.company} onChange={event => setDraft({ ...draft, company: event.target.value })} /></label>
      <label>Reminder date<input type="date" disabled={saving || disabled || !draft.followUpNeeded} value={/^\d{4}-\d{2}-\d{2}$/.test(draft.dueWindow) ? draft.dueWindow : ""} onChange={event => setDraft({ ...draft, dueWindow: event.target.value })} /></label>
      <label className={styles.check}><input type="checkbox" disabled={saving || disabled} checked={draft.followUpNeeded} onChange={event => setDraft({ ...draft, followUpNeeded: event.target.checked })} /> Follow-up needed</label>
      <small className={styles.wide}>This edits the saved note{item.convertedTaskId ? ", not its linked task" : ""}. Previously generated report drafts are unchanged.</small>
      <div className={styles.actions}><button type="button" disabled={saving || disabled || !draft.text.trim()} onClick={() => void save()}>{saving ? "Saving…" : "Save changes"}</button><button type="button" disabled={saving} onClick={() => { setDraft(null); setNotice(""); }}>Cancel</button></div>
    </div>}
    {notice ? <p role="status">{notice}</p> : null}
  </div>;
}
