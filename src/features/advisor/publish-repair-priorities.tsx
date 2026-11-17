"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { repairPrioritySources } from "@/lib/repair-priority-source";

export function PublishRepairPriorities({ item, disabled }: {
  item: { id: string; text: string; update: string };
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [boardDate, setBoardDate] = useState("");

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sources = new FormData(event.currentTarget).getAll("repair");
    if (!sources.length) return setNotice("Select at least one repair to share.");
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/dispatch/repair-priorities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", itemId: item.id, sources })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setBoardDate(result.date);
      setNotice(result.count ? `Published ${result.count} repair priorities.` : "The selected repairs are already published.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not publish repairs.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button aria-expanded={open} disabled={disabled} onClick={() => setOpen(!open)} type="button">Publish to Dispatch Board</button>
      {open && (
        <form onSubmit={publish}>
          <fieldset disabled={disabled || saving}>
            <legend>Select repairs to share with the location team</legend>
            <p>Selected text will be visible to the team. Leave out private notes.</p>
            {repairPrioritySources(item).map(({ source, text }, index) => (
              <label key={`${index}:${source}`} style={{ display: "block" }}>
                <input name="repair" type="checkbox" value={source} /> {text}
              </label>
            ))}
            <button type="submit">{saving ? "Publishing…" : "Publish selected repairs"}</button>
          </fieldset>
          <p role="status">{notice}</p>
          {boardDate && <Link href={`/board/repair-priorities?date=${boardDate}`}>Open shared repair priorities</Link>}
        </form>
      )}
    </div>
  );
}
