"use client";

import { useState, type FormEvent } from "react";
import type { staffCompanyAccess } from "@/server/money-resources/staff-access";

export function StaffCompanyAccess({ model }: { model: Awaited<ReturnType<typeof staffCompanyAccess>> }) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/settings/team/company-access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to assign staff company access.");
      setNotice(body.message); setSaved(true);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to save. Your form has not been cleared."); }
    finally { setBusy(false); }
  }
  return <section className="panel-card page-stack">
    <form method="get" className="form-stack">
      <label className="field"><span>Staff member</span><select name="userId" defaultValue={model.userId} required><option value="">Choose staff</option>{model.users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
      <button className="pill pill-secondary" type="submit">Review company access</button>
    </form>
    {model.status === "ASSIGNED" ? <p role="status">Active company access: {model.assignedLocations.join(", ")}. No changes are needed here.</p> : null}
    {model.status === "OTHER_COMPANY" ? <p role="alert">This account has another company assignment. No access can be added here; review the existing assignments separately.</p> : null}
    {model.status === "MISSING" ? <form onSubmit={save} className="form-stack">
      <h2>{model.users.find(user => user.id === model.userId)?.name}: company assignment missing</h2>
      <p>This establishes company membership used by spending and other company-scoped tools. Existing roles still control access. It does not grant manager powers, other staff spending visibility or appointment permissions.</p>
      <input type="hidden" name="userId" value={model.userId} />
      <label className="field"><span>Company location</span><select name="locationId" defaultValue={model.locations.length === 1 ? model.locations[0].id : ""} required><option value="">Choose location</option>{model.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
      <label className="field"><span>Reason</span><textarea name="reason" required minLength={10} maxLength={1000} /></label>
      <button className="pill" type="submit" disabled={busy || saved}>{busy ? "Saving…" : saved ? "Company access saved" : "Grant staff company access"}</button>
    </form> : null}
    {notice ? <p role={saved ? "status" : "alert"}>{notice}</p> : null}
  </section>;
}
