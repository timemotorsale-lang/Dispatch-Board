"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useRef, useState } from "react";

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

const readiness = [
  { label: "Estimate readiness", percent: 88, status: "Ready", tone: "good" },
  { label: "Repair order handoff", percent: 56, status: "Blocked", tone: "warning" },
  { label: "Payment follow-up", percent: 32, status: "Later", tone: "info" },
  { label: "Closeout", percent: 18, status: "Not yet", tone: "info" },
] as const;

const fallbackTasks = [
  { actionLabel: "Record carrier call", detail: "Call the carrier, capture adjuster name, phone, email, and approval status.", dueLabel: "Today", ownerRole: "Service advisor", status: "ready", title: "Find adjuster contact" },
  { actionLabel: "Send authorization", detail: "Repair handoff is blocked until authorization is complete.", dueLabel: "Today", ownerRole: "Service advisor", status: "ready", title: "Get customer authorization" },
  { actionLabel: "Upload photos", detail: "Visible damage photos and closeups.", dueLabel: "Today", ownerRole: "Intake staff", status: "ready", title: "Take damage photos" }
] as const;

type ExtraActionTool = "text" | "call" | "email" | "appointment" | "file" | "repair";

const extraActionTools: Array<{ id: ExtraActionTool; label: string; detail: string }> = [
  { id: "text", label: "Text", detail: "Send a customer or carrier text update." },
  { id: "call", label: "Call", detail: "Log a phone call and capture the promise or result." },
  { id: "email", label: "Email", detail: "Send or document an email follow-up." },
  { id: "appointment", label: "Appointment", detail: "Schedule inspection, reinspect, drop-off, or follow-up." },
  { id: "file", label: "File upload", detail: "Attach authorization, photos, estimates, or payment proof." },
  { id: "repair", label: "Repair workflow", detail: "Move toward handoff, repair order, or exception review." }
];

function toolForTask(task: { actionLabel: string; title: string }): ExtraActionTool {
  const text = `${task.actionLabel} ${task.title}`.toLowerCase();
  if (text.includes("call") || text.includes("adjuster") || text.includes("carrier")) return "call";
  if (text.includes("authorization") || text.includes("photo") || text.includes("upload") || text.includes("odometer") || text.includes("vin")) return "file";
  if (text.includes("handoff") || text.includes("repair order")) return "repair";
  return "text";
}

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

function activityActorName(activity: ClaimReadModel["activities"][number]) {
  if (activity.actorUserName) return activity.actorUserName;
  if (activity.actorUserId === "seed") return "System";
  if (activity.actorUserId === "advisor") return "Eli Manager";
  return "Eli Manager";
}

function claimOwnerName(ownerUserId?: string) {
  if (!ownerUserId) return "Unassigned";
  const knownOwners: Record<string, string> = {
    "advisor-1": "Eli Manager",
    "advisor-2": "Service Advisor",
    advisor: "Eli Manager",
    seed: "System"
  };
  return knownOwners[ownerUserId] ?? "Eli Manager";
}

function todayInputDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function ClaimsWorkspaceReview({ model }: { model?: ClaimReadModel }) {
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [activityDrawerOpen, setActivityDrawerOpen] = useState(false);
  const [activeExtraTool, setActiveExtraTool] = useState<ExtraActionTool>("call");
  const [extraToolsOpen, setExtraToolsOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderPickerOpen, setReminderPickerOpen] = useState(false);
  const [reminderStatus, setReminderStatus] = useState("");
  const reminderDateInputRef = useRef<HTMLInputElement>(null);
  const snapshotRows = model ? [
    ["Customer", model.claim.customerName],
    ["Address", [model.claim.customerAddressLine1, model.claim.customerAddressLine2, model.claim.customerCity, model.claim.customerState, model.claim.customerPostalCode].filter(Boolean).join(", ") || "Pending"],
    ["Vehicle", [model.claim.vehicleYear, model.claim.vehicleMake, model.claim.vehicleModel].filter(Boolean).join(" ") || "Not captured"],
    ["Color / mileage", [model.claim.vehicleColor, model.claim.vehicleMileage].filter(Boolean).join(" / ") || "Pending"],
    ["VIN", model.claim.vehicleVin || "Pending"],
    ["Plate / stock", [model.claim.vehiclePlate, model.claim.vehicleStockNumber].filter(Boolean).join(" / ") || "Pending"],
    ["Owner", claimOwnerName(model.claim.ownerUserId)],
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
  const readinessRows = model ? model.readiness.map((item) => ({
    label: item.title,
    percent: item.percent,
    status: readinessLabel(item.status),
    tone: readinessTone(item.status)
  })) : readiness;
  const completedNeeds = model?.checklist.filter((item) => item.state === "RECEIVED" || item.state === "EXCEPTION_ACCEPTED" || item.state === "NOT_APPLICABLE").length;
  const activityRows = model?.activities.length ? model.activities.slice(0, 5) : [
    { action: "CLAIM_CREATED", actorUserName: "Eli Manager", at: "2026-09-17T14:00:00.000Z", detail: "Insurance claim workspace opened from Claims Desk.", actorUserId: "advisor", id: "fallback-activity" }
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
  const claimReturnHref = claimId ? `/vehicles/claims-workspace?claimId=${encodeURIComponent(claimId)}` : "/vehicles/claims-workspace";
  const appointmentContext = new URLSearchParams({
    action: "new",
    reason: model?.nextAction.reason ?? "Claim follow-up from Claims Workspace.",
    returnTo: claimReturnHref,
    title: "Claim appointment / reminder"
  });
  const appointmentCustomer = model?.claim.customerName;
  const appointmentVehicle = [model?.claim.vehicleYear, model?.claim.vehicleMake, model?.claim.vehicleModel].filter(Boolean).join(" ");
  if (appointmentCustomer) appointmentContext.set("customerReference", appointmentCustomer);
  if (appointmentVehicle) appointmentContext.set("vehicleReference", appointmentVehicle);
  const newAppointmentHref = `/appointments?${appointmentContext.toString()}`;
  const minimumReminderDate = todayInputDate();

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

  async function recordActivityUpdate(formData: FormData) {
    if (!claimId) return;
    const category = String(formData.get("category") ?? "ACTIVITY_ONLY");
    const file = formData.get("file");
    const fileName = file && typeof file === "object" && "name" in file ? String(file.name) : "";
    const title = String(formData.get("title") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    const updateType = String(formData.get("updateType") ?? "").trim();

    if (category !== "ACTIVITY_ONLY" && (title || fileName)) {
      await submitJson(`/api/claims-workspace/claims/${encodeURIComponent(claimId)}/evidence`, {
        category,
        fileName,
        notes: note,
        relationshipTargets: ["CLAIM", "CUSTOMER", "VEHICLE"],
        status: "RECEIVED",
        title: title || fileName || updateType
      });
      return;
    }

    await submitJson(`/api/claims-workspace/claims/${encodeURIComponent(claimId)}`, {
      nextAction: formData.get("nextAction"),
      note,
      updateType
    }, "PATCH");
  }

  async function requestHandoff(formData: FormData) {
    if (!claimId) return;
    await submitJson(`/api/claims-workspace/claims/${encodeURIComponent(claimId)}/handoff`, {
      exceptionReason: formData.get("exceptionReason")
    });
  }

  async function saveClaim() {
    if (!claimId) return;
    await submitJson(`/api/claims-workspace/claims/${encodeURIComponent(claimId)}`, {
      note: "Claim workspace reviewed and saved."
    }, "PATCH");
  }

  function openExtraTool(tool: ExtraActionTool) {
    setActiveExtraTool(tool);
    setExtraToolsOpen(true);
  }

  function openReminderPicker() {
    setReminderPickerOpen(true);
    window.setTimeout(() => {
      const picker = reminderDateInputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
      picker?.focus();
      picker?.showPicker?.();
    }, 0);
  }

  async function createAppointmentReminder(date: string) {
    if (!date) return;
    setActionError("");
    setReminderStatus("Saving reminder...");
    setIsWorking(true);
    const reminderText = [
      "Claim appointment reminder",
      model?.nextAction.label ?? model?.nextAction.reason ?? "Follow up on claim",
      model?.claim.claimNumber ? `Claim # ${model.claim.claimNumber}` : "",
      model?.claim.customerName ? `Customer: ${model.claim.customerName}` : "",
      appointmentVehicle ? `Vehicle: ${appointmentVehicle}` : ""
    ].filter(Boolean).join(" - ");

    try {
      const response = await fetch(`/api/coo-workbook/staff/quick-updates?date=${encodeURIComponent(minimumReminderDate)}`, {
        body: JSON.stringify({
          category: "APPOINTMENT",
          company: model?.claim.carrierName ?? "Claims workspace",
          dueWindow: date,
          followUpNeeded: true,
          person: model?.claim.customerName ?? "",
          phoneNumber: model?.claim.customerPhone ?? "",
          text: reminderText
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "The reminder could not be saved.");
      setActionMessage(`Reminder saved for ${date}.`);
      setReminderStatus(`Reminder saved for ${date}. Opening the Appointment Console reminders now...`);
      window.setTimeout(() => {
        window.location.assign(`/appointments?section=follow-up&localDate=${encodeURIComponent(date)}`);
      }, 350);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The reminder could not be saved.";
      setActionError(message);
      setReminderStatus(message);
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.topbar}>
        <span className={styles.eyebrow}>Service Console / Insurance Claim Assistant</span>
        <div className={styles.topActions}>
          <Link href="/crm-next/customers">Customer 360</Link>
          <Link href="/vehicles/360/demo">Vehicle 360</Link>
          <button disabled={!claimId || isWorking} onClick={saveClaim} type="button">{isWorking ? "Saving..." : "Save claim"}</button>
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
                  <button onClick={() => openExtraTool(toolForTask(task))} type="button">{task.actionLabel}</button>
                </article>
              ))}
            </div>
            <div className={styles.actionForms}>
              <button className={styles.extraToolsButton} onClick={() => setExtraToolsOpen(true)} type="button">Extra Action Tools</button>
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
                <h2>Activity Timeline</h2>
                <p>Keep progress recording and audit history close without crowding the claim workspace.</p>
              </div>
              <StatusBadge>{activityRows.length} update{activityRows.length === 1 ? "" : "s"}</StatusBadge>
            </div>
            <div className={styles.activitySummary}>
              <strong>{activityRows[0]?.action.replaceAll("_", " ") ?? "No activity yet"}</strong>
              <span>{activityRows[0]?.detail ?? "Record the first claim movement when work starts."}</span>
              <button onClick={() => setActivityDrawerOpen(true)} type="button">Add progress note / view timeline</button>
            </div>
            {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
            {actionMessage ? <p className={styles.actionMessage}>{actionMessage}</p> : null}
          </section>
        </aside>
      </div>

      {activityDrawerOpen ? (
        <div className={styles.drawerBackdrop} role="presentation">
          <aside aria-label="Activity Timeline" aria-modal="true" className={styles.timelineDrawer} role="dialog">
            <header>
              <div>
                <span className={styles.cardEyebrow}>Claim audit trail</span>
                <h2>Activity Timeline</h2>
                <p>Record progress here. Every claim movement should leave a lightweight audit trail.</p>
              </div>
              <button aria-label="Close Activity Timeline" onClick={() => setActivityDrawerOpen(false)} type="button">x</button>
            </header>
            <form action={recordActivityUpdate} className={`${styles.executionForm} ${styles.timelineForm}`}>
              <strong>Add progress note</strong>
              <div>
                <select name="updateType" defaultValue="Teardown / reinspection">
                  <option>Teardown / reinspection</option>
                  <option>Inspector visit</option>
                  <option>Carrier call</option>
                  <option>Customer authorization</option>
                  <option>Photos taken</option>
                  <option>Estimate / supplement</option>
                  <option>Payment follow-up</option>
                  <option>General note</option>
                </select>
                <select name="category" defaultValue="ACTIVITY_ONLY">
                  <option value="ACTIVITY_ONLY">Activity only</option>
                  <option value="DAMAGE_PHOTO">Attach damage photos</option>
                  <option value="AUTHORIZATION">Attach authorization</option>
                  <option value="ESTIMATE">Attach estimate / supplement</option>
                  <option value="REPAIR_HANDOFF">Attach handoff evidence</option>
                  <option value="PAYMENT">Attach payment proof</option>
                </select>
                <input name="title" placeholder="Optional evidence title" />
                <input name="nextAction" placeholder="Next action, e.g. Reinspection by Spencer" />
                <input name="file" type="file" />
              </div>
              <label className={styles.noteField}>
                <span>Progress note</span>
                <textarea name="note" placeholder="Example: Vehicle torn down today and ready for reinspection by Spencer. Estimate remains pending reinspect after teardown." rows={4} />
              </label>
              <button disabled={!claimId || isWorking} type="submit">Record progress</button>
            </form>
            <section className={styles.timelineReport} aria-label="Progress reports">
              <header>
                <div>
                  <span className={styles.cardEyebrow}>Progress reports</span>
                  <h3>Activity updates</h3>
                </div>
                <span>{activityRows.length} total</span>
              </header>
            <div className={styles.timeline}>
              {activityRows.map((activity) => (
                <article key={activity.id}>
                  <header>
                    <strong>{activity.action.replaceAll("_", " ")}</strong>
                    <time dateTime={activity.at}>{new Date(activity.at).toLocaleString()}</time>
                  </header>
                  <p>{activity.detail}</p>
                  <small>Recorded by {activityActorName(activity)}</small>
                </article>
              ))}
            </div>
            </section>
            {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
            {actionMessage ? <p className={styles.actionMessage}>{actionMessage}</p> : null}
          </aside>
        </div>
      ) : null}

      {extraToolsOpen ? (
        <div className={styles.drawerBackdrop} role="presentation">
          <aside aria-label="Extra Action Tools" aria-modal="true" className={`${styles.timelineDrawer} ${styles.extraToolsDrawer}`} role="dialog">
            <header>
              <div>
                <span className={styles.cardEyebrow}>Execution support</span>
                <h2>Extra Action Tools</h2>
                <p>Pick the tool that matches the task, complete the action, then record the result back to the claim.</p>
              </div>
              <button aria-label="Close Extra Action Tools" onClick={() => setExtraToolsOpen(false)} type="button">x</button>
            </header>
            <section className={styles.toolWorkbench} aria-label="Extra action tools workbench">
              <nav className={styles.toolGridPanel} aria-label="Communication and execution tools">
                {extraActionTools.map((tool) => (
                  <button aria-pressed={activeExtraTool === tool.id} key={tool.id} onClick={() => setActiveExtraTool(tool.id)} type="button">
                    <strong>{tool.label}</strong>
                    <span>{tool.detail}</span>
                  </button>
                ))}
              </nav>
              <div className={styles.toolWorkArea}>
                {activeExtraTool === "text" ? (
                  <form action={recordActivityUpdate} className={`${styles.executionForm} ${styles.timelineForm}`}>
                    <strong>Text update</strong>
                    <input name="updateType" type="hidden" value="Text update" />
                    <input name="category" type="hidden" value="ACTIVITY_ONLY" />
                    <input name="nextAction" placeholder="Next action after text, if any" />
                    <label className={styles.noteField}>
                      <span>Message / outcome</span>
                      <textarea name="note" placeholder="Example: Texted customer for authorization signature. Waiting on reply before repair handoff." rows={5} />
                    </label>
                    <button disabled={!claimId || isWorking} type="submit">Record text update</button>
                  </form>
                ) : null}
                {activeExtraTool === "call" ? (
                  <form action={recordCarrierCall} className={`${styles.executionForm} ${styles.timelineForm}`}>
                    <strong>Call / carrier follow-up</strong>
                    <div>
                      <input name="carrierName" placeholder="Carrier" defaultValue={model?.claim.carrierName ?? ""} />
                      <input name="claimNumber" placeholder="Claim #" defaultValue={model?.claim.claimNumber ?? ""} />
                      <input name="policyNumber" placeholder="Policy #" defaultValue={model?.claim.policyNumber ?? ""} />
                      <input name="adjusterName" placeholder="Adjuster name" defaultValue={model?.claim.adjusterName ?? ""} />
                      <input name="adjusterPhone" placeholder="Adjuster phone" defaultValue={model?.claim.adjusterPhone ?? ""} />
                      <input name="adjusterEmail" placeholder="Adjuster email" defaultValue={model?.claim.adjusterEmail ?? ""} />
                    </div>
                    <label className={styles.noteField}>
                      <span>Call result</span>
                      <textarea name="note" placeholder="Short call note, carrier promise, estimate status, or next follow-up." rows={5} />
                    </label>
                    <button disabled={!claimId || isWorking} type="submit">Record call result</button>
                  </form>
                ) : null}
                {activeExtraTool === "email" ? (
                  <form action={recordActivityUpdate} className={`${styles.executionForm} ${styles.timelineForm}`}>
                    <strong>Email follow-up</strong>
                    <input name="updateType" type="hidden" value="Email follow-up" />
                    <input name="category" type="hidden" value="ACTIVITY_ONLY" />
                    <input name="title" placeholder="Email subject or reference" />
                    <input name="nextAction" placeholder="Next action after email, if any" />
                    <label className={styles.noteField}>
                      <span>Email summary</span>
                      <textarea name="note" placeholder="Example: Emailed Progressive for supplement approval and requested adjuster ETA." rows={5} />
                    </label>
                    <button disabled={!claimId || isWorking} type="submit">Record email follow-up</button>
                  </form>
                ) : null}
                {activeExtraTool === "appointment" ? (
                  <form action={recordActivityUpdate} className={`${styles.executionForm} ${styles.timelineForm}`}>
                    <div className={styles.appointmentToolHeader}>
                      <Link href={newAppointmentHref}>Appointment / inspection scheduling</Link>
                      <span>Create appointments in the Appointment Console, or pick a reminder date here and open the saved reminder in the Appointment Console.</span>
                    </div>
                    <div className={styles.appointmentToolActions}>
                      <Link href={newAppointmentHref}>Create appointment</Link>
                      <button onClick={openReminderPicker} type="button">Pick reminder date</button>
                    </div>
                    {reminderPickerOpen ? (
                      <div className={styles.reminderPicker}>
                        <label>
                          <span>Reminder date</span>
                          <input
                            ref={reminderDateInputRef}
                            min={minimumReminderDate}
                            onChange={(event) => {
                              const selectedDate = event.target.value;
                              setReminderDate(selectedDate);
                              void createAppointmentReminder(selectedDate);
                            }}
                            type="date"
                            value={reminderDate}
                          />
                        </label>
                        <p aria-live="polite">{reminderStatus || "Pick a date to create the reminder."}</p>
                      </div>
                    ) : null}
                    <input name="updateType" type="hidden" value="Appointment scheduled" />
                    <input name="category" type="hidden" value="ACTIVITY_ONLY" />
                    <input name="title" placeholder="Appointment type, e.g. Reinspection" />
                    <input name="nextAction" placeholder="Next action after appointment" />
                    <label className={styles.noteField}>
                      <span>Appointment details</span>
                      <textarea name="note" placeholder="Example: Scheduled Spencer for Friday reinspect. Staff should call if he has not arrived by noon." rows={5} />
                    </label>
                    <button disabled={!claimId || isWorking} type="submit">Record appointment plan</button>
                  </form>
                ) : null}
                {activeExtraTool === "file" ? (
                  <form action={recordActivityUpdate} className={`${styles.executionForm} ${styles.timelineForm}`}>
                    <strong>File upload / evidence</strong>
                    <div>
                      <select name="category" defaultValue="AUTHORIZATION">
                        <option value="AUTHORIZATION">Authorization</option>
                        <option value="DAMAGE_PHOTO">Damage photos</option>
                        <option value="VIN_PHOTO">VIN photo</option>
                        <option value="ODOMETER_PHOTO">Odometer photo</option>
                        <option value="ESTIMATE">Estimate / supplement</option>
                        <option value="REPAIR_HANDOFF">Repair handoff evidence</option>
                        <option value="PAYMENT">Payment proof</option>
                      </select>
                      <input name="title" placeholder="Evidence title" />
                      <input name="nextAction" placeholder="Next action after upload" />
                      <input name="file" type="file" />
                    </div>
                    <label className={styles.noteField}>
                      <span>Evidence note</span>
                      <textarea name="note" placeholder="Explain what was uploaded and how it moves the claim forward." rows={5} />
                    </label>
                    <button disabled={!claimId || isWorking} type="submit">Attach / record file</button>
                  </form>
                ) : null}
                {activeExtraTool === "repair" ? (
                  <form action={requestHandoff} className={`${styles.executionForm} ${styles.timelineForm}`}>
                    <strong>Repair workflow</strong>
                    <label className={styles.noteField}>
                      <span>Handoff or exception reason</span>
                      <textarea name="exceptionReason" placeholder="Optional manager exception reason if repair handoff is blocked" rows={5} />
                    </label>
                    <button disabled={!claimId || isWorking} type="submit">{model?.handoff.allowed ? "Open repair handoff" : "Request exception handoff"}</button>
                  </form>
                ) : null}
                <p className={styles.toolHint}>This workbench records the action against the claim so the Activity Timeline stays clear and complete.</p>
              </div>
            </section>
            {actionError ? <p className={styles.actionError}>{actionError}</p> : null}
            {actionMessage ? <p className={styles.actionMessage}>{actionMessage}</p> : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
