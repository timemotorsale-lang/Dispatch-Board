"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import type { ClaimChecklistItem, ClaimReadModel } from "@/server/claims-workspace/service";

import styles from "./claims-workspace-review.module.css";

const snapshot = [
  ["Customer", "Deqo Roble"],
  ["Vehicle", "2018 Toyota Camry"],
  ["VIN", "4T1B11HK9JU128441"],
  ["Owner", "Eli Manager"],
  ["Carrier", "State Farm"],
  ["Adjuster", "Needed"],
  ["Loss date", "Sep 15, 2026"],
  ["Deductible", "$500 confirmed"],
];

const needs = [
  { label: "Claim number", detail: "Captured from customer", state: "done" },
  { label: "Customer authorization", detail: "Signature required before repair handoff", state: "blocked" },
  { label: "Carrier and policy", detail: "Insurance card attached", state: "done" },
  { label: "Adjuster contact", detail: "Call carrier or customer", state: "warning" },
  { label: "Damage photos", detail: "Need left-front and VIN photo", state: "blocked" },
  { label: "Deductible", detail: "$500 confirmed", state: "done" },
] as const;

const evidence = [
  { title: "Initial damage photos", detail: "3 attached. Missing left-front closeup and VIN photo.", status: "Partial", tone: "warning", thumbs: 3 },
  { title: "Insurance card", detail: "Stored in document library and linked to customer and claim.", status: "Complete", tone: "good", thumbs: 1 },
  { title: "Repair authorization", detail: "Prepared but not signed. E-sign can be added later.", status: "Needed", tone: "danger", thumbs: 1 },
] as const;

const readiness = [
  { label: "Estimate readiness", percent: 88, status: "Ready", tone: "good" },
  { label: "Repair order handoff", percent: 56, status: "Blocked", tone: "warning" },
  { label: "Payment follow-up", percent: 32, status: "Later", tone: "info" },
  { label: "Closeout", percent: 18, status: "Not yet", tone: "info" },
] as const;

const tools = [
  { title: "Adjuster details", detail: "Visible because carrier claim is active.", active: true },
  { title: "Estimate", detail: "Ready to upload or link appraisal.", active: true },
  { title: "Supplement", detail: "Hidden until estimate exists.", active: false },
  { title: "Payment recovery", detail: "Hidden until repair or payment issue.", active: false },
] as const;

const fallbackDocuments = [
  { label: "Claim identity record", detail: "Claim number and carrier confirmation.", state: "RECEIVED", requiredBefore: "Intake", libraryTarget: "Claim jacket" },
  { label: "Customer repair authorization", detail: "Signed authorization before repair handoff.", state: "MISSING", requiredBefore: "Repair handoff", libraryTarget: "Claim jacket" },
  { label: "Estimate and supplement packet", detail: "Carrier estimate or internal appraisal.", state: "MISSING", requiredBefore: "Repair handoff", libraryTarget: "Repair order" }
] as const;

const fallbackPhotos = [
  { label: "Damage overview and closeups", state: "MISSING", uploadTarget: "Claim evidence" },
  { label: "VIN plate or verified VIN", state: "RECEIVED", uploadTarget: "Vehicle evidence" },
  { label: "Odometer photo", state: "MISSING", uploadTarget: "Vehicle evidence" },
  { label: "Repair handoff / release condition", state: "MISSING", uploadTarget: "Repair handoff" }
] as const;

const fallbackTasks = [
  { actionLabel: "Record carrier call", detail: "Call the carrier, capture adjuster name, phone, email, and approval status.", dueLabel: "Today", ownerRole: "Service advisor", status: "ready", title: "Find adjuster contact" },
  { actionLabel: "Send authorization", detail: "Repair handoff is blocked until authorization is complete.", dueLabel: "Today", ownerRole: "Service advisor", status: "ready", title: "Get customer authorization" },
  { actionLabel: "Upload photos", detail: "Visible damage photos and closeups.", dueLabel: "Today", ownerRole: "Intake staff", status: "ready", title: "Take damage photos" }
] as const;

function StatusBadge({ tone = "info", children }: { tone?: "good" | "warning" | "danger" | "info"; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

type NeedState = "done" | "warning" | "blocked";

function NeedIcon({ state }: { state: NeedState }) {
  const symbol = state === "done" ? "✓" : state === "warning" ? "?" : "!";
  return <span className={`${styles.needIcon} ${styles[state]}`}>{symbol}</span>;
}

function checklistState(item: ClaimChecklistItem): NeedState {
  if (item.state === "RECEIVED" || item.state === "EXCEPTION_ACCEPTED" || item.state === "NOT_APPLICABLE") return "done";
  if (item.state === "BLOCKED") return "blocked";
  return "warning";
}

function readinessTone(status: string): "good" | "warning" | "danger" | "info" {
  if (status === "ready" || status === "exception_ready") return "good";
  if (status === "blocked") return "warning";
  return "info";
}

function readinessLabel(status: string) {
  if (status === "ready") return "Ready";
  if (status === "blocked") return "Blocked";
  if (status === "exception_ready") return "Exception ready";
  return "Not yet";
}

function evidenceTone(status: string): "good" | "warning" | "danger" | "info" {
  if (status === "RECEIVED") return "good";
  if (status === "BLOCKED") return "danger";
  if (status === "EXCEPTION_ACCEPTED") return "warning";
  return "info";
}

function evidenceLabel(status: string) {
  if (status === "RECEIVED") return "Ready";
  if (status === "BLOCKED") return "Blocked";
  if (status === "EXCEPTION_ACCEPTED") return "Exception";
  if (status === "NOT_APPLICABLE") return "N/A";
  return "Missing";
}

export function ClaimsWorkspaceReview({ model }: { model?: ClaimReadModel }) {
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const snapshotRows = model ? [
    ["Customer", model.claim.customerName],
    ["Vehicle", [model.claim.vehicleYear, model.claim.vehicleMake, model.claim.vehicleModel].filter(Boolean).join(" ") || "Not captured"],
    ["VIN", model.claim.vehicleVin || "Pending"],
    ["Owner", model.claim.ownerUserId || "Unassigned"],
    ["Carrier", model.claim.carrierName || "Pending"],
    ["Adjuster", model.claim.adjusterName || "Needed"],
    ["Loss date", model.claim.lossDate || "Pending"],
    ["Deductible", model.claim.deductible || "Pending"]
  ] : snapshot;
  const needRows = model ? model.checklist.map((item) => ({
    detail: item.detail,
    label: item.label,
    state: checklistState(item)
  })) : needs;
  const evidenceRows = model ? model.evidence.map((item) => ({
    detail: item.notes || "Stored once and linked to the claim record.",
    status: item.status === "RECEIVED" ? "Complete" : item.status === "BLOCKED" ? "Blocked" : item.status === "EXCEPTION_ACCEPTED" ? "Exception" : "Recorded",
    thumbs: item.category.includes("PHOTO") ? 3 : 1,
    title: item.title,
    tone: evidenceTone(item.status)
  })) : evidence;
  const readinessRows = model ? model.readiness.map((item) => ({
    label: item.title,
    percent: item.percent,
    status: readinessLabel(item.status),
    tone: readinessTone(item.status)
  })) : readiness;
  const completedNeeds = model?.checklist.filter((item) => item.state === "RECEIVED" || item.state === "EXCEPTION_ACCEPTED" || item.state === "NOT_APPLICABLE").length;
  const documentRows = model?.documentPlan ?? fallbackDocuments;
  const photoRows = model?.photoPlan ?? fallbackPhotos;
  const activityRows = model?.activities.length ? model.activities.slice(0, 5) : [
    { action: "CLAIM_CREATED", at: "2026-09-17T14:00:00.000Z", detail: "Insurance claim workspace opened from Claims Desk.", actorUserId: "advisor", id: "fallback-activity" }
  ];
  const taskRows = model?.executionTasks ?? fallbackTasks;
  const carrier = model?.carrierTracker ?? {
    adjuster: "Needed",
    approvalStatus: "needs_adjuster",
    carrier: "State Farm",
    claimNumber: "MN-48291",
    nextContact: "Call carrier for adjuster",
    policyNumber: "Pending",
    statusLabel: "needs adjuster"
  };
  const claimId = model?.claim.id;

  async function submitJson(path: string, body: Record<string, unknown>, method = "POST") {
    setActionError("");
    setActionMessage("");
    setIsWorking(true);
    try {
      const response = await fetch(path, {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
        method
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "The claim action could not be recorded.");
      setActionMessage("Action recorded. Refreshing workspace...");
      window.location.reload();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "The claim action could not be recorded.");
    } finally {
      setIsWorking(false);
    }
  }

  async function recordCarrierCall(formData: FormData) {
    if (!claimId) return;
    await submitJson(`/api/claims-workspace/claims/${encodeURIComponent(claimId)}`, Object.fromEntries(formData.entries()), "PATCH");
  }

  async function recordEvidence(formData: FormData) {
    if (!claimId) return;
    const file = formData.get("file");
    const fileName = file && typeof file === "object" && "name" in file ? String(file.name) : "";
    await submitJson(`/api/claims-workspace/claims/${encodeURIComponent(claimId)}/evidence`, {
      category: formData.get("category"),
      fileName,
      notes: formData.get("notes"),
      relationshipTargets: ["CLAIM", "CUSTOMER", "VEHICLE"],
      status: "RECEIVED",
      title: formData.get("title") || fileName
    });
  }

  async function requestHandoff(formData: FormData) {
    if (!claimId) return;
    await submitJson(`/api/claims-workspace/claims/${encodeURIComponent(claimId)}/handoff`, {
      exceptionReason: formData.get("exceptionReason")
    });
  }

  return (
    <section className={styles.page}>
      <div className={styles.topbar}>
        <span className={styles.eyebrow}>Service Console / Insurance Claim Assistant</span>
        <div className={styles.topActions}>
          <Link href="/crm-next/customers">Customer 360</Link>
          <Link href="/vehicles/360/demo">Vehicle 360</Link>
          <button type="button">Save claim</button>
        </div>
      </div>

      <header className={styles.hero}>
        <div>
          <h1>Claims Workspace</h1>
          <p>A simple execution desk for moving insurance claims from first contact to repair, payment, or follow-up handoff.</p>
        </div>
        <aside className={styles.currentClaim}>
          <span className={styles.cardEyebrow}>Current claim</span>
          <div className={styles.statusLine}>
            <strong>Waiting on adjuster</strong>
            <StatusBadge tone="warning">{model?.primaryBlocker ?? "2 days open"}</StatusBadge>
          </div>
          <p>{model?.nextAction.reason ?? "Next action is assigned to service advisor. Repair handoff is blocked until authorization and damage photos are complete."}</p>
        </aside>
      </header>

      <div className={styles.workspace}>
        <div className={styles.mainStack}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Execute Next Tasks</h2>
                <p>The workspace stays simple: do the next task, record the result, and let the claim unfold only when needed.</p>
              </div>
              <StatusBadge tone={model?.handoff.allowed ? "good" : "warning"}>{model?.handoff.allowed ? "Ready for handoff" : "Execution active"}</StatusBadge>
            </div>
            <div className={styles.taskList}>
              {taskRows.map((task) => (
                <article className={styles.taskItem} key={task.title}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.detail}</span>
                    <small>{task.ownerRole} - {task.dueLabel}</small>
                  </div>
                  <button type="button">{task.actionLabel}</button>
                </article>
              ))}
            </div>
            <div className={styles.actionForms}>
              <form action={recordCarrierCall} className={styles.executionForm}>
                <strong>Record carrier / adjuster call</strong>
                <div>
                  <input name="carrierName" placeholder="Carrier" defaultValue={model?.claim.carrierName ?? ""} />
                  <input name="claimNumber" placeholder="Claim #" defaultValue={model?.claim.claimNumber ?? ""} />
                  <input name="policyNumber" placeholder="Policy #" defaultValue={model?.claim.policyNumber ?? ""} />
                  <input name="adjusterName" placeholder="Adjuster name" defaultValue={model?.claim.adjusterName ?? ""} />
                  <input name="adjusterPhone" placeholder="Adjuster phone" defaultValue={model?.claim.adjusterPhone ?? ""} />
                  <input name="adjusterEmail" placeholder="Adjuster email" defaultValue={model?.claim.adjusterEmail ?? ""} />
                </div>
                <textarea name="note" placeholder="Short call note or promise from carrier" rows={2} />
                <button disabled={!claimId || isWorking} type="submit">Record carrier call</button>
              </form>
              <form action={recordEvidence} className={styles.executionForm}>
                <strong>Record evidence / photo</strong>
                <div>
                  <select name="category" defaultValue="DAMAGE_PHOTO">
                    <option value="AUTHORIZATION">Customer authorization</option>
                    <option value="DAMAGE_PHOTO">Damage photos</option>
                    <option value="VIN_PHOTO">VIN photo</option>
                    <option value="ODOMETER_PHOTO">Odometer photo</option>
                    <option value="INSURANCE_CARD">Insurance card</option>
                    <option value="ESTIMATE">Estimate</option>
                    <option value="PAYMENT">Payment proof</option>
                    <option value="REPAIR_HANDOFF">Repair handoff</option>
                  </select>
                  <input name="title" placeholder="Evidence title" />
                  <input name="file" type="file" />
                </div>
                <textarea name="notes" placeholder="Evidence note" rows={2} />
                <button disabled={!claimId || isWorking} type="submit">Record evidence</button>
              </form>
              <form action={requestHandoff} className={styles.executionForm}>
                <strong>Move to repair handoff</strong>
                <textarea name="exceptionReason" placeholder="Optional manager exception reason if a gate is blocked" rows={2} />
                <button disabled={!claimId || isWorking} type="submit">{model?.handoff.allowed ? "Open repair handoff" : "Request exception handoff"}</button>
              </form>
              {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
              {actionMessage ? <p className={styles.actionMessage}>{actionMessage}</p> : null}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Claim Snapshot</h2>
                <p>Enough context to work the claim without making staff complete every advanced field up front.</p>
              </div>
              <StatusBadge>Claim # {model?.claim.claimNumber ?? "MN-48291"}</StatusBadge>
            </div>
            <div className={styles.snapshotGrid}>
              {snapshotRows.map(([label, value]) => (
                <div className={styles.fact} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
              <div className={`${styles.fact} ${styles.wide}`}>
                <span>Incident summary</span>
                <strong>{model?.claim.description ?? "Front bumper and left fender damage. Customer reports vehicle was driveable after loss."}</strong>
              </div>
              <div className={`${styles.fact} ${styles.wide}`}>
                <span>Current blocker</span>
                <strong>{model?.primaryBlocker ?? "Missing adjuster contact and signed repair authorization."}</strong>
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>What We Need</h2>
                <p>A focused checklist replaces a long intake form. Staff can mark items complete, blocked, or not applicable.</p>
              </div>
              <StatusBadge tone="warning">{completedNeeds ?? 5}/{model?.checklist.length ?? 9} ready</StatusBadge>
            </div>
            <div className={styles.needGrid}>
              {needRows.map((item) => (
                <article className={styles.need} key={item.label}>
                  <NeedIcon state={item.state} />
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Evidence and Documents</h2>
                <p>Documents store once in the library, then link to claim, customer, vehicle, and repair order when available.</p>
              </div>
              <button className={styles.secondaryButton} type="button">Add evidence</button>
            </div>
            <div className={styles.evidenceList}>
              {evidenceRows.map((item) => (
                <article className={styles.evidenceRow} key={item.title}>
                  <div className={styles.thumbs} aria-hidden="true">
                    {Array.from({ length: item.thumbs }).map((_, index) => <span key={index} />)}
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Documents and Forced Photos</h2>
                <p>Required evidence is broken into short execution slots with a clear storage target.</p>
              </div>
              <StatusBadge tone="info">{model?.summary.documentCount ?? 2} docs / {model?.summary.photoCount ?? 3} photos</StatusBadge>
            </div>
            <div className={styles.executionGrid}>
              <div className={styles.miniList}>
                {documentRows.map((item) => (
                  <article className={styles.documentItem} key={item.label}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                      <small>{item.libraryTarget} - before {item.requiredBefore}</small>
                    </div>
                    <StatusBadge tone={evidenceTone(item.state)}>{evidenceLabel(item.state)}</StatusBadge>
                  </article>
                ))}
              </div>
              <div className={styles.miniList}>
                {photoRows.map((item) => (
                  <article className={styles.documentItem} key={item.label}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.uploadTarget}</span>
                    </div>
                    <StatusBadge tone={evidenceTone(item.state)}>{evidenceLabel(item.state)}</StatusBadge>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.sideStack}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Carrier Tracker</h2>
                <p>Claim, policy, adjuster, approval, and next contact stay visible.</p>
              </div>
            </div>
            <div className={styles.carrierGrid}>
              {[
                ["Carrier", carrier.carrier],
                ["Claim", carrier.claimNumber],
                ["Policy", carrier.policyNumber],
                ["Adjuster", carrier.adjuster],
                ["Status", carrier.statusLabel],
                ["Next", carrier.nextContact]
              ].map(([label, value]) => (
                <div className={styles.fact} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Next Action</h2>
                <p>Deterministic workflow logic keeps the desk simple.</p>
              </div>
            </div>
            <div className={styles.nextAction}>
              <span className={styles.cardEyebrow}>Recommended now</span>
              <strong>{model?.nextAction.label ?? "Contact adjuster"}</strong>
              <p>{model?.nextAction.reason ?? "Carrier is captured, but adjuster contact and approval status are missing. Repair handoff remains blocked until authorization and required photos are complete."}</p>
              <button type="button">Record carrier call</button>
              <div className={styles.ownerGrid}>
                <div className={styles.fact}>
                  <span>Owner</span>
                  <strong>{model?.nextAction.ownerRole ?? "Service advisor"}</strong>
                </div>
                <div className={styles.fact}>
                  <span>Due</span>
                  <strong>{model?.nextAction.dueLabel ?? "Today, 4:00 PM"}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Handoff Readiness</h2>
                <p>Clear gates prevent premature handoff while allowing approved exceptions.</p>
              </div>
            </div>
            <div className={styles.gateList}>
              {readinessRows.map((gate) => (
                <article className={styles.gate} key={gate.label}>
                  <div>
                    <strong>{gate.label}</strong>
                    <StatusBadge tone={gate.tone}>{gate.status}</StatusBadge>
                  </div>
                  <span className={styles.progress}><i style={{ width: `${gate.percent}%` }} /></span>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Progressive Tools</h2>
                <p>Advanced panels appear only when claim complexity requires them.</p>
              </div>
            </div>
            <div className={styles.toolGrid}>
              {tools.map((tool) => (
                <article className={tool.active ? styles.tool : `${styles.tool} ${styles.muted}`} key={tool.title}>
                  <strong>{tool.title}</strong>
                  <span>{tool.detail}</span>
                </article>
              ))}
            </div>
            <p className={styles.note}>Review implementation: a short execution workspace, not a long insurance form.</p>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2>Activity Timeline</h2>
                <p>Every claim movement should leave a lightweight audit trail.</p>
              </div>
            </div>
            <div className={styles.timeline}>
              {activityRows.map((activity) => (
                <article key={activity.id}>
                  <strong>{activity.action.replaceAll("_", " ")}</strong>
                  <span>{activity.detail}</span>
                  <small>{new Date(activity.at).toLocaleString()} - {activity.actorUserId}</small>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
