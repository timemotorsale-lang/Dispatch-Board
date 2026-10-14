"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Settings2 } from "lucide-react";

import styles from "./time-attendance-console.module.css";

type PolicyAdminModel = {
  generatedAt: string;
  profiles: { id: string; name: string; version: number; status: string; code: string }[];
  assignments: { id: string; staffName: string; profileName: string; profileVersion: number; effectiveFrom: string; approvedBy: string }[];
  payPeriods: { id: string; name: string; code: string; version: number; status: string; periodLengthDays: number }[];
  users: { id: string; name: string; email: string }[];
  rollout: { id: string; code: string; mode: string; version: number }[];
};

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body && typeof body.error === "string" ? body.error : "Policy administration request failed.");
  }
  return body as T;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function PolicyAdministrationPanel() {
  const [model, setModel] = useState<PolicyAdminModel | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("Configured for controlled Time Attendance workspace review.");
  const [templateId, setTemplateId] = useState("MN-HOURLY-60-MIN-UNPAID-MEAL");
  const [profileId, setProfileId] = useState("");
  const [staffUserId, setStaffUserId] = useState("");
  const [payPeriodId, setPayPeriodId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [anchorDate, setAnchorDate] = useState(today);
  const [rolloutMode, setRolloutMode] = useState("SHADOW");

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const next = await responseJson<PolicyAdminModel>(await fetch("/api/time-attendance/policies", { cache: "no-store" }));
      setModel(next);
      setProfileId((current) => current || next.profiles[0]?.id || "");
      setStaffUserId((current) => current || next.users[0]?.id || "");
      setPayPeriodId((current) => current || next.payPeriods[0]?.id || "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Policy administration is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function run(command: string, payload: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await responseJson(await fetch("/api/time-attendance/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, reason, ...payload })
      }));
      setMessage(`${command.replaceAll("_", " ").toLowerCase()} recorded with governance evidence.`);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Policy administration command failed.");
      setBusy(false);
    }
  }

  function submit(event: FormEvent, command: string, payload: Record<string, unknown>) {
    event.preventDefault();
    void run(command, payload);
  }

  const drafts = model?.profiles.filter((profile) => profile.status === "DRAFT") ?? [];
  const activeProfiles = model?.profiles.filter((profile) => profile.status === "ACTIVE") ?? [];
  const draftPeriods = model?.payPeriods.filter((period) => period.status === "DRAFT") ?? [];

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Governed administration</span>
          <h2>Policies, pay periods, assignments, and rollout</h2>
          <p>Create drafts first, then activate and assign with explicit evidence. External legal and payroll approval are never inferred.</p>
        </div>
        <button className={styles.captureRefresh} disabled={busy} onClick={() => void refresh()} type="button"><RefreshCw size={16} />Refresh</button>
      </div>

      <div className={styles.managerReviewMetrics}>
        <div><span>Profiles</span><strong>{model?.profiles.length ?? 0}</strong></div>
        <div><span>Active</span><strong>{activeProfiles.length}</strong></div>
        <div><span>Assignments</span><strong>{model?.assignments.length ?? 0}</strong></div>
        <div><span>Pay periods</span><strong>{model?.payPeriods.length ?? 0}</strong></div>
      </div>

      <label className={styles.correctionWide}>
        <span>Governance reason used for the next action</span>
        <input disabled={busy} minLength={15} onChange={(event) => setReason(event.target.value)} value={reason} />
      </label>

      <div className={styles.policyList}>
        <details className={styles.policyCard} open>
          <summary><Settings2 size={16} /> Create policy draft</summary>
          <form className={styles.correctionForm} onSubmit={(event) => submit(event, "CREATE_PROFILE_DRAFT", { templateId, effectiveFrom, payrollMappingVersion: "PILOT-REVIEW-V1" })}>
            <label><span>Approved calculation template</span><select disabled={busy} onChange={(event) => setTemplateId(event.target.value)} value={templateId}><option value="MN-HOURLY-60-MIN-UNPAID-MEAL">60-minute unpaid meal</option><option value="MN-HOURLY-30-MIN-PAID-MEAL">30-minute paid meal</option></select></label>
            <label><span>Effective date</span><input disabled={busy} onChange={(event) => setEffectiveFrom(event.target.value)} type="date" value={effectiveFrom} /></label>
            <button disabled={busy || reason.trim().length < 15} type="submit">Create draft</button>
          </form>
        </details>

        <details className={styles.policyCard}>
          <summary>Activate a reviewed draft</summary>
          <form className={styles.correctionForm} onSubmit={(event) => submit(event, "ACTIVATE_PROFILE", { profileId, sourceReviewedOn: today() })}>
            <label><span>Draft profile</span><select disabled={busy} onChange={(event) => setProfileId(event.target.value)} value={profileId}>{drafts.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · v{profile.version}</option>)}</select></label>
            <button disabled={busy || !drafts.some((profile) => profile.id === profileId) || reason.trim().length < 15} type="submit">Activate reviewed profile</button>
          </form>
        </details>

        <details className={styles.policyCard}>
          <summary>Assign an active profile</summary>
          <form className={styles.correctionForm} onSubmit={(event) => submit(event, "ASSIGN_PROFILE", { profileId, staffUserId, effectiveFrom })}>
            <label><span>Employee</span><select disabled={busy} onChange={(event) => setStaffUserId(event.target.value)} value={staffUserId}>{model?.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <label><span>Active profile</span><select disabled={busy} onChange={(event) => setProfileId(event.target.value)} value={profileId}>{activeProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · v{profile.version}</option>)}</select></label>
            <label><span>Effective date</span><input disabled={busy} onChange={(event) => setEffectiveFrom(event.target.value)} type="date" value={effectiveFrom} /></label>
            <button disabled={busy || !activeProfiles.some((profile) => profile.id === profileId) || !staffUserId || reason.trim().length < 15} type="submit">Assign profile</button>
          </form>
        </details>

        <details className={styles.policyCard}>
          <summary>Configure pay period</summary>
          <form className={styles.correctionForm} onSubmit={(event) => submit(event, "CREATE_PAY_PERIOD_DRAFT", { code: "WEEKLY", name: "Weekly payroll review", frequency: "WEEKLY", periodLengthDays: 7, anchorDate, effectiveFrom, payrollMappingVersion: "PILOT-REVIEW-V1" })}>
            <label><span>Anchor date</span><input disabled={busy} onChange={(event) => setAnchorDate(event.target.value)} type="date" value={anchorDate} /></label>
            <label><span>Effective date</span><input disabled={busy} onChange={(event) => setEffectiveFrom(event.target.value)} type="date" value={effectiveFrom} /></label>
            <button disabled={busy || reason.trim().length < 15} type="submit">Create weekly draft</button>
          </form>
          <form className={styles.correctionForm} onSubmit={(event) => submit(event, "ACTIVATE_PAY_PERIOD", { payPeriodId })}>
            <label><span>Draft pay period</span><select disabled={busy} onChange={(event) => setPayPeriodId(event.target.value)} value={payPeriodId}>{draftPeriods.map((period) => <option key={period.id} value={period.id}>{period.name} · v{period.version}</option>)}</select></label>
            <button disabled={busy || !draftPeriods.some((period) => period.id === payPeriodId) || reason.trim().length < 15} type="submit">Activate pay period</button>
          </form>
        </details>

        <details className={styles.policyCard}>
          <summary>Feature activation and rollback</summary>
          <form className={styles.correctionForm} onSubmit={(event) => submit(event, "UPDATE_ROLLOUT", { code: "TIME_ATTENDANCE_MASTER", mode: rolloutMode, allowedUserIds: model?.users.map((user) => user.id) ?? [] })}>
            <label><span>Safe review mode</span><select disabled={busy} onChange={(event) => setRolloutMode(event.target.value)} value={rolloutMode}><option value="SHADOW">Shadow review</option><option value="OFF">Off</option></select></label>
            <button disabled={busy || reason.trim().length < 15} type="submit">Update controlled mode</button>
            <button disabled={busy || reason.trim().length < 15} onClick={() => void run("ROLLBACK_ROLLOUT", { code: "TIME_ATTENDANCE_MASTER" })} type="button">Rollback to off</button>
          </form>
          <p>Pilot and General activation remain blocked until real external evidence and approvals are supplied.</p>
        </details>
      </div>

      {message ? <p className={styles.captureNotice}><CheckCircle2 size={16} />{message}</p> : null}
      {error ? <p className={styles.captureError}><AlertTriangle size={16} />{error}</p> : null}
    </article>
  );
}
