"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { InventoryConsoleSavedViewModel, InventoryConsoleWorkView } from "@/server/inventory-console-saved-views";

const systemViews: Array<{ code: InventoryConsoleWorkView; label: string }> = [
  { code: "ALL", label: "All inventory" }, { code: "ATTENTION", label: "Attention" }, { code: "MY", label: "My work" },
  { code: "TEAM", label: "Team work" }, { code: "EXCEPTIONS", label: "Exceptions" }, { code: "BLOCKED", label: "Blocked" }, { code: "OVERDUE", label: "Overdue" }
];
function systemHref(view: InventoryConsoleWorkView, locationId: string | null) { return `/vehicles?view=${view}${locationId ? `&locationId=${encodeURIComponent(locationId)}` : ""}`; }

export function InventoryConsoleSavedViews({ activeId, activeView, canShare, locationId, savedViews }: { activeId: string | null; activeView: InventoryConsoleWorkView; canShare: boolean; locationId: string | null; savedViews: InventoryConsoleSavedViewModel[] }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState(""), [name, setName] = useState(""), [visibility, setVisibility] = useState<"PERSONAL" | "TEAM">("PERSONAL");
  async function save(event: FormEvent) { event.preventDefault(); setBusy(true); setNotice(""); try { const response = await fetch("/api/inventory-console/saved-views", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, visibility, config: { locationId, workView: activeView } }) }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error ?? "Unable to save view."); setName(""); setOpen(false); setNotice("View saved. Refreshing…"); window.location.reload(); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save view."); } finally { setBusy(false); } }
  async function remove(id: string) { setBusy(true); setNotice(""); try { const response = await fetch(`/api/inventory-console/saved-views/${encodeURIComponent(id)}`, { method: "DELETE" }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error ?? "Unable to delete view."); if (activeId === id) window.location.assign("/vehicles"); else window.location.reload(); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to delete view."); } finally { setBusy(false); } }
  return <section className="ich-view-manager" aria-label="Inventory Home views">
    <nav className="ich-saved-views" aria-label="System views">{systemViews.map((view) => <Link aria-current={!activeId && activeView === view.code ? "page" : undefined} className={!activeId && activeView === view.code ? "active" : ""} href={systemHref(view.code, locationId)} key={view.code}>{view.label}</Link>)}<button onClick={() => setOpen((value) => !value)} type="button">{open ? "Cancel" : "Save current view"}</button></nav>
    {savedViews.length ? <nav className="ich-saved-views ich-user-views" aria-label="Saved views"><strong>Saved</strong>{savedViews.map((view) => <span className="ich-saved-view" key={view.id}><Link aria-current={activeId === view.id ? "page" : undefined} className={activeId === view.id ? "active" : ""} href={`/vehicles?savedViewId=${encodeURIComponent(view.id)}`}>{view.name}<small>{view.recoveryNotice ?? (view.visibility === "TEAM" ? `Team · ${view.createdByUser.name}` : "Personal")}</small></Link>{view.canDelete ? <button aria-label={`Delete ${view.name}`} disabled={busy} onClick={() => remove(view.id)} type="button">×</button> : null}</span>)}</nav> : null}
    {open ? <form className="ich-save-form" onSubmit={save}><label>View name<input maxLength={80} onChange={(event) => setName(event.target.value)} required value={name} /></label><label>Visibility<select disabled={!canShare} onChange={(event) => setVisibility(event.target.value as "PERSONAL" | "TEAM")} value={visibility}><option value="PERSONAL">Only me</option>{canShare ? <option value="TEAM">Team</option> : null}</select></label><button disabled={busy} type="submit">{busy ? "Saving…" : "Save view"}</button><span>Stored filters never grant access; scope is checked again whenever this view opens.</span></form> : null}
    {notice ? <p className="ich-view-notice" role="status">{notice}</p> : null}
  </section>;
}
