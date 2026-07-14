"use client";

import { useState } from "react";

type Foundation = Awaited<ReturnType<typeof import("@/server/enterprise-command/service").getVehicleOperationsFoundation>>;

export function VehicleOperationsFoundationPanel({ initialModel }: { initialModel: Foundation }) {
  const [model, setModel] = useState(initialModel);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState("");
  async function changeFlag(flag: Foundation["flags"][number], mode: Foundation["flags"][number]["mode"], rolloutPercent = mode === "GENERAL" ? 100 : 0) {
    setSaving(flag.code); setNotice("");
    const response = await fetch("/api/settings/vehicle-operations", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: flag.code, mode, rolloutPercent, allowedUserIds: [], expectedVersion: flag.version, reason: `Manager changed ${flag.code} to ${mode}.` }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 409) {
        const refreshed = await fetch("/api/settings/vehicle-operations").then((item) => item.json());
        setModel(refreshed);
        setNotice("This control changed elsewhere. The latest version has been loaded; review it and try again.");
      } else setNotice(body.error ?? "Unable to update rollout control.");
    }
    else { const refreshed = await fetch("/api/settings/vehicle-operations").then((item) => item.json()); setModel(refreshed); setNotice(`${flag.code} is now ${mode}.`); }
    setSaving("");
  }
  return <div className="page-stack">
    <section className="settings-overview-grid">
      <article className="panel-card settings-callout-card"><strong>Foundation state</strong><h2>{model.state}</h2><p>Evaluated {new Date(model.evaluatedAt).toLocaleString()}.</p></article>
      <article className="panel-card settings-callout-card"><strong>Commands (24h)</strong><h2>{model.health.commands24h}</h2><p>{model.health.failedCommands24h} failed commands.</p></article>
      <article className="panel-card settings-callout-card"><strong>Outbox</strong><h2>{model.health.pendingOutbox}</h2><p>{model.health.deadLetters} dead letters; oldest {model.health.oldestPendingAgeSeconds}s.</p></article>
      <article className="panel-card settings-callout-card"><strong>Projections</strong><h2>{model.health.maxProjectionLagSeconds}s</h2><p>{model.health.projectionFailures} failed projections.</p></article>
    </section>
    <section className="panel-card"><div className="page-copy"><span className="eyebrow">Controlled rollout</span><h2>Vehicle Operations features</h2><p>OFF, shadow, pilot, and general modes remain versioned and manager-controlled.</p></div>
      <div className="settings-overview-grid">{model.flags.map((flag) => <article className="panel-card settings-callout-card" key={flag.id}><strong>{flag.code}</strong><h3>{flag.mode}</h3><p>Version {flag.version} · {flag.rolloutPercent}% rollout</p><div className="form-actions"><button className="pill pill-secondary" disabled={saving === flag.code || flag.mode === "OFF"} onClick={() => changeFlag(flag, "OFF")} type="button">OFF</button><button className="pill pill-secondary" disabled={saving === flag.code || flag.mode === "SHADOW"} onClick={() => changeFlag(flag, "SHADOW")} type="button">SHADOW</button><button className="pill pill-secondary" disabled={saving === flag.code || (flag.mode === "PILOT" && flag.rolloutPercent === 10)} onClick={() => changeFlag(flag, "PILOT", 10)} type="button">PILOT 10%</button><button className="pill pill-secondary" disabled={saving === flag.code || flag.mode === "GENERAL"} onClick={() => changeFlag(flag, "GENERAL", 100)} type="button">GENERAL</button></div></article>)}</div>
    </section>
    {notice ? <div className={notice.startsWith("Unable") || notice.includes("required") ? "notice notice-danger" : "notice notice-success"}><p>{notice}</p></div> : null}
  </div>;
}
