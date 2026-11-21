"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { repairPrioritySources } from "@/lib/repair-priority-source";

export function PublishRepairPriorities({ item, date, disabled, hasUnsavedChanges, onRefine }: {
  item: { id: string; text: string; update: string };
  date: string;
  disabled: boolean;
  hasUnsavedChanges: boolean;
  onRefine: (update: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [boardDate, setBoardDate] = useState("");
  const [revision, setRevision] = useState<{ source: string; text: string } | null>(null);

  async function send(action: "publish" | "refine_source", details: object) {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/dispatch/repair-priorities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, itemId: item.id, date, ...details })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (action === "refine_source") {
        if (typeof result.update === "string") onRefine(result.update);
        setRevision(null);
        setNotice("Checklist update saved. Any previously published priority keeps its original message.");
      } else {
        setBoardDate(result.date);
        setNotice(result.count ? `Published ${result.count} to Daily Priorities.` : "The selected entries are already published.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save your changes.");
    } finally {
      setSaving(false);
    }
  }

  function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sources = new FormData(event.currentTarget).getAll("priority");
    if (!sources.length) return setNotice("Select at least one checklist entry to share.");
    void send("publish", { sources, ...(sources.includes("") ? { expectedTitle: item.text } : {}) });
  }

  return (
    <div>
      <button aria-expanded={open} disabled={disabled} onClick={() => setOpen(!open)} type="button">Publish to Dispatch Board</button>
      {open && (
        <form onSubmit={publish}>
          <fieldset disabled={disabled || saving || hasUnsavedChanges}>
            <legend>Select checklist entries to share in Daily Priorities</legend>
            <p>The location team can see selected text. Leave out private notes.</p>
            {repairPrioritySources(item).map(({ source, text }) => (
              <div key={source ? `update:${source}` : `title:${text}`}>
                <label><input name="priority" type="checkbox" value={source} /> {text}</label>
                {source && <button type="button" onClick={() => setRevision({ source, text })}>Edit saved update</button>}
              </div>
            ))}
            {revision && <div>
              <label>Revised checklist update <input maxLength={5000} value={revision.text} onChange={(event) =>
                setRevision({ ...revision, text: event.target.value })} /></label>
              <button type="button" disabled={!revision.text.trim()} onClick={() => void send("refine_source", revision)}>Save checklist update</button>
              <button type="button" onClick={() => setRevision(null)}>Cancel edit</button>
            </div>}
            <button disabled={Boolean(revision)} type="submit">{saving ? "Saving…" : "Publish selected priorities"}</button>
          </fieldset>
          {hasUnsavedChanges && <p>Save your checklist changes before publishing.</p>}
          <p role="status">{notice}</p>
          {boardDate && <Link href={`/board/repair-priorities?date=${boardDate}`}>Open Daily Priorities</Link>}
        </form>
      )}
    </div>
  );
}
