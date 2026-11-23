"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { vehiclePilotFeatureCode } from "@/lib/vehicle-pilot";

type Foundation = Awaited<ReturnType<typeof import("@/server/enterprise-command/service").getVehicleOperationsFoundation>>;

export function VehicleOperationsFoundationPanel({ initialModel, pilotStaff = [] }: {
  initialModel: Foundation;
  pilotStaff?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [model, setModel] = useState(initialModel);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState("");
  const [targetDates, setTargetDates] = useState<Record<string, string>>(() => Object.fromEntries(initialModel.flags.map((flag) => [flag.id, flag.targetAt?.slice(0, 10) ?? ""])));
  const pilotFlag = model.flags.find(flag => flag.code === vehiclePilotFeatureCode && flag.locationId === null);
  const [pilotUsers, setPilotUsers] = useState(pilotFlag?.allowedUserIds ?? []);
  const activePilotUsers = pilotStaff.filter(staff => pilotUsers.includes(staff.id)).map(staff => staff.id);
  async function changeFlag(flag: Foundation["flags"][number], mode: Foundation["flags"][number]["mode"], rolloutPercent = mode === "GENERAL" ? 100 : 0, allowedUserIds = flag.allowedUserIds) {
    setSaving(flag.code);
    setNotice("");
    const targetDate = targetDates[flag.id];
    try {
      const response = await fetch("/api/settings/vehicle-operations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: flag.code, locationId: flag.locationId, mode, rolloutPercent, allowedUserIds,
          expectedVersion: flag.version,
          reason: `Manager selected ${mode} for ${flag.code}.`,
          targetAt: targetDate ? `${targetDate}T12:00:00.000Z` : null
        })
      });
      const stale = response.status === 409;
      if (!response.ok && !stale) {
        const body = await response.json().catch(() => ({}));
        setNotice(body.error ?? "Unable to update rollout control.");
        return;
      }
      const refreshed = await fetch("/api/settings/vehicle-operations");
      if (!refreshed.ok) throw new Error("Rollout settings unavailable");
      const next: Foundation = await refreshed.json();
      setModel(next);
      setTargetDates(Object.fromEntries(next.flags.map(item => [item.id, item.targetAt?.slice(0, 10) ?? ""])));
      if (stale || flag.code === vehiclePilotFeatureCode) {
        setPilotUsers(next.flags.find(item => item.code === vehiclePilotFeatureCode && item.locationId === null)?.allowedUserIds ?? []);
      }
      if (!stale && flag.code === vehiclePilotFeatureCode) router.refresh();
      setNotice(stale ? "This control changed elsewhere. The latest version has been loaded. Review it and try again."
        : flag.code === vehiclePilotFeatureCode ? "Vehicle Pilot settings saved." : `${flag.code} is now ${mode}.`);
    } catch {
      setNotice("Unable to refresh the rollout controls. Reload Settings to confirm the saved mode.");
    } finally {
      setSaving("");
    }
  }
  return <div className="page-stack">
    {model.flags.some(flag => flag.version === 0) ? <p className="notice">Some controls have not been configured. They remain OFF until an authorized manager selects a rollout mode. Version 0 means no setting has been saved yet.</p> : null}
    <section className="settings-overview-grid">
      <article className="panel-card settings-callout-card"><strong>Foundation state</strong><h2>{model.state}</h2><p>Evaluated {new Date(model.evaluatedAt).toLocaleString()}.</p></article>
      <article className="panel-card settings-callout-card"><strong>Commands (24h)</strong><h2>{model.health.commands24h}</h2><p>{model.health.failedCommands24h} failed commands.</p></article>
      <article className="panel-card settings-callout-card"><strong>Outbox</strong><h2>{model.health.pendingOutbox}</h2><p>{model.health.deadLetters} dead letters; oldest {model.health.oldestPendingAgeSeconds}s.</p></article>
      <article className="panel-card settings-callout-card"><strong>Projections</strong><h2>{model.health.maxProjectionLagSeconds}s</h2><p>{model.health.projectionFailures} failed projections.</p></article>
    </section>
    {pilotFlag && <section className="panel-card page-stack" aria-label="Vehicle Pilot rollout">
      <div className="page-copy"><h2>Vehicle Pilot</h2><p>Both workspaces use live vehicle and repair records. Side-by-side access is limited to selected staff.</p></div>
      <strong>Current mode · {pilotFlag.mode === "PILOT" ? "Side-by-side pilot" : pilotFlag.mode === "GENERAL" ? "New workflow only" : "Existing only"}</strong>
      {pilotStaff.length > 0 ? <details><summary>Pilot staff ({activePilotUsers.length} selected)</summary>
        <div className="form-actions">{pilotStaff.map(staff => <label key={staff.id}>
          <input type="checkbox" checked={pilotUsers.includes(staff.id)} onChange={event => setPilotUsers(current => event.target.checked ? [...current, staff.id] : current.filter(id => id !== staff.id))} /> {staff.name}
        </label>)}</div>
      </details> : <p role="status">Staff list unavailable. Reload Settings before changing pilot membership.</p>}
      <div className="form-actions">
        <button className="pill pill-secondary" disabled={Boolean(saving) || pilotFlag.mode === "OFF"} onClick={() => changeFlag(pilotFlag, "OFF")} type="button">Existing only</button>
        <button className="pill pill-secondary" disabled={Boolean(saving) || !activePilotUsers.length} onClick={() => changeFlag(pilotFlag, "PILOT", 0, activePilotUsers)} type="button">Save side-by-side pilot</button>
        <button className="pill pill-secondary" disabled={Boolean(saving) || pilotFlag.mode === "GENERAL"} onClick={() => changeFlag(pilotFlag, "GENERAL")} type="button">New workflow only</button>
      </div>
    </section>}
    <section className="panel-card"><div className="page-copy"><span className="eyebrow">Controlled rollout</span><h2>Vehicle Operations features</h2><p>OFF, shadow, pilot, and general modes remain versioned and manager-controlled.</p></div>
      <div className="settings-overview-grid">{model.flags.filter(flag => flag.code !== vehiclePilotFeatureCode).map((flag) => <article className="panel-card settings-callout-card" key={flag.id}><strong>{flag.code}</strong><h3>{flag.mode}</h3><p>Version {flag.version} · {flag.rolloutPercent}% rollout</p><label className="field"><span>Target date</span><input onChange={(event) => setTargetDates((current) => ({ ...current, [flag.id]: event.target.value }))} type="date" value={targetDates[flag.id] ?? ""} /></label><div className="form-actions"><button className="pill pill-secondary" disabled={saving === flag.code || targetDates[flag.id] === (flag.targetAt?.slice(0, 10) ?? "")} onClick={() => changeFlag(flag, flag.mode, flag.rolloutPercent)} type="button">Save target</button><button className="pill pill-secondary" disabled={saving === flag.code || flag.mode === "OFF"} onClick={() => changeFlag(flag, "OFF")} type="button">OFF</button><button className="pill pill-secondary" disabled={saving === flag.code || flag.mode === "SHADOW"} onClick={() => changeFlag(flag, "SHADOW")} type="button">SHADOW</button><button className="pill pill-secondary" disabled={saving === flag.code || (flag.mode === "PILOT" && flag.rolloutPercent === 10)} onClick={() => changeFlag(flag, "PILOT", 10)} type="button">PILOT 10%</button><button className="pill pill-secondary" disabled={saving === flag.code || flag.mode === "GENERAL"} onClick={() => changeFlag(flag, "GENERAL", 100)} type="button">GENERAL</button></div></article>)}</div>
    </section>
    {notice ? <div className={notice.startsWith("Unable") || notice.includes("required") ? "notice notice-danger" : "notice notice-success"}><p>{notice}</p></div> : null}
  </div>;
}
