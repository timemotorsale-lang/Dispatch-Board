"use client";

import { useState, type FormEvent } from "react";

type StaffAccess = { id: string; name: string; dealsRestricted?: boolean; calendarRestricted?: boolean };

export function StaffWorkflowAccess({ staff }: { staff: StaffAccess[] }) {
  const [people, setPeople] = useState(staff);
  const [selected, setSelected] = useState("");
  const [deals, setDeals] = useState(true);
  const [calendar, setCalendar] = useState(true);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !selected) return;
    setSaving(true); setNotice(""); setError("");
    const restrictions = { dealsRestricted: !deals, calendarRestricted: !calendar };
    try {
      const response = await fetch("/api/settings/team/workflow-access", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected, reason, ...restrictions })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update staff access.");
      setPeople(current => current.map(person => person.id === selected ? { ...person, ...restrictions } : person));
      setReason("");
      setNotice("Staff workflow access updated.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to update staff access.");
    } finally { setSaving(false); }
  }

  return <section className="page-stack" aria-labelledby="staff-workflow-access">
    <h2 id="staff-workflow-access">Deals and Calendar access</h2>
    <p>Staff access is on by default. Turning access off does not delete or reassign existing work.</p>
    <form onSubmit={save}>
      <fieldset disabled={saving}>
        <label className="field"><span>Staff member</span><select required value={selected} onChange={event => {
          const person = people.find(item => item.id === event.target.value);
          setSelected(person?.id ?? ""); setDeals(!person?.dealsRestricted); setCalendar(!person?.calendarRestricted);
          setReason(""); setNotice(""); setError("");
        }}><option value="">Choose staff</option>{people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
        {selected && <>
          <label><input type="checkbox" checked={deals} onChange={event => setDeals(event.target.checked)} /> Allow Deals</label>{" "}
          <label><input type="checkbox" checked={calendar} onChange={event => setCalendar(event.target.checked)} /> Allow Calendar</label>
          <label className="field"><span>Reason</span><input value={reason} onChange={event => setReason(event.target.value)} minLength={10} maxLength={500} required /></label>
          <button type="submit">{saving ? "Saving…" : "Save access"}</button>
        </>}
      </fieldset>
    </form>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
