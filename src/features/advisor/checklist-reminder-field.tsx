"use client";
import Link from "next/link";
import { useState } from "react";

export function ChecklistReminderField({ value, disabled, title, onSave }: { value: string; disabled: boolean; title: string; onSave: (date: string) => Promise<void> }) {
  const [date, setDate] = useState(value);
  const [saving, setSaving] = useState(false);
  return <div style={{ gridColumn: "2 / -1", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
    <label style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>Due / reminder date
      <input aria-label={`Due / reminder date for ${title}`} type="date" value={date} disabled={disabled || saving} onChange={event => setDate(event.target.value)} />
    </label>
    <button type="button" disabled={disabled || saving || date === value} onClick={async () => { setSaving(true); try { await onSave(date); } finally { setSaving(false); } }}>{saving ? "Saving…" : "Save date"}</button>
    {value ? <Link href={`/appointments?section=today&localDate=${encodeURIComponent(value)}`}>Open daily schedule</Link> : null}
  </div>;
}
