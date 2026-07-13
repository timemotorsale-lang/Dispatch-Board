"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CarFront,
  Check,
  CirclePlus,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Gauge,
  Megaphone,
  RotateCcw,
  Save,
  Sparkles,
  UserRound,
  UsersRound,
  Wrench
} from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { ActiveUserSummary } from "@/server/services/user-summary";

type IntakeMode = "quick" | "guided";
type IntakeStage = "Capture" | "Shape" | "Outcome" | "Ownership" | "Controls" | "Preview" | "Review";
type IntakeType =
  | "Quick Task"
  | "Vehicle / Service"
  | "Customer Issue"
  | "Sales Lead / Appointment"
  | "Inventory Movement"
  | "Marketing / Listing"
  | "Admin / Documentation"
  | "Collections"
  | "Manager Decision";

type IntakeDraft = {
  assignedUserId: string;
  channel: string;
  customerReference: string;
  dueDate: string;
  dueTime: string;
  expectedOutcome: string;
  intakeType: IntakeType;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  requiredUpdates: string[];
  requiresManagerApproval: boolean;
  collaboratorIds: string[];
  title: string;
  brief: string;
  vehicleReference: string;
  workflowArea: string;
};

const fallbackCollaboratorOptions = [
  { id: "eli-manager", initials: "EM", name: "Eli Manager", role: "General Manager" },
  { id: "ancilla-ops", initials: "AO", name: "Ancilla Ops", role: "Administration" },
  { id: "brock-inventory", initials: "BI", name: "Brock Inventory", role: "Inventory" },
  { id: "walter-mechanic", initials: "WM", name: "Walter Mechanic", role: "Service / Recon" },
  { id: "baraka-sales", initials: "BS", name: "Baraka Sales", role: "Sales" }
];

const stages: IntakeStage[] = ["Capture", "Shape", "Outcome", "Ownership", "Controls", "Preview", "Review"];
const updateOptions = ["Next step", "ETA", "Finding / result", "Customer contacted", "Photo evidence", "Final note"];
const typeOptions: Array<{ icon: typeof ClipboardCheck; label: IntakeType; workflow: string; outcome: string }> = [
  { icon: ClipboardCheck, label: "Quick Task", workflow: "GENERAL_MANAGER", outcome: "The requested work is completed and the next operational step is recorded." },
  { icon: Wrench, label: "Vehicle / Service", workflow: "SHOP", outcome: "The vehicle condition, work performed, blockers, parts, ETA, and QC readiness are documented." },
  { icon: UserRound, label: "Customer Issue", workflow: "ADMIN", outcome: "The customer receives a clear resolution or a documented next step with ownership and follow-up timing." },
  { icon: UsersRound, label: "Sales Lead / Appointment", workflow: "SALES", outcome: "The lead receives timely follow-up and the next sales or appointment action is recorded." },
  { icon: CarFront, label: "Inventory Movement", workflow: "INVENTORY", outcome: "The vehicle reaches its target stage or the movement blocker and ETA are visible." },
  { icon: Megaphone, label: "Marketing / Listing", workflow: "ADVERTISING", outcome: "The listing or campaign is complete, accurate, and ready for customer visibility." },
  { icon: FileText, label: "Admin / Documentation", workflow: "ADMIN", outcome: "The required document is obtained, processed, or escalated with a clear deadline." },
  { icon: CircleDollarSign, label: "Collections", workflow: "COLLECTIONS", outcome: "The payment outcome, promise, follow-up date, and escalation status are documented." },
  { icon: BadgeCheck, label: "Manager Decision", workflow: "GENERAL_MANAGER", outcome: "A manager decision is recorded and the affected work has an executable next step." }
];

function createEmptyDraft(assignedUserId = "", dueDate = new Date().toISOString().slice(0, 10)): IntakeDraft {
  return {
  assignedUserId,
  channel: "Internal observation",
  customerReference: "",
  dueDate,
  dueTime: "16:30",
  expectedOutcome: "",
  intakeType: "Quick Task",
  priority: "MEDIUM",
  requiredUpdates: ["Next step", "Final note"],
  requiresManagerApproval: false,
  collaboratorIds: [],
  title: "",
  brief: "",
  vehicleReference: "",
  workflowArea: "GENERAL_MANAGER"
  };
}

export function calculateTaskIntakeReadiness(draft: IntakeDraft) {
  const checks = [
    { label: "Executable title", ready: draft.title.trim().length >= 8, weight: 15 },
    { label: "Clear one-line brief", ready: draft.brief.trim().length >= 16, weight: 10 },
    { label: "Workflow selected", ready: Boolean(draft.workflowArea), weight: 10 },
    { label: "Due date and time", ready: Boolean(draft.dueDate && draft.dueTime), weight: 10 },
    { label: "Expected outcome", ready: draft.expectedOutcome.trim().length >= 20, weight: 15 },
    { label: "Required updates", ready: draft.requiredUpdates.length > 0, weight: 10 },
    { label: "Accountable owner", ready: Boolean(draft.assignedUserId), weight: 15 },
    { label: "Manager control aligned", ready: (draft.priority !== "CRITICAL" && draft.intakeType !== "Manager Decision") || draft.requiresManagerApproval, weight: 5 },
    { label: "Context linked or intentionally omitted", ready: draft.intakeType === "Quick Task" || Boolean(draft.customerReference.trim() || draft.vehicleReference.trim()), weight: 10 }
  ];
  const score = checks.reduce((total, check) => total + (check.ready ? check.weight : 0), 0);
  return { checks, score };
}

function acquisitionPolicy(draft: IntakeDraft) {
  if (draft.intakeType === "Manager Decision") return "Manager assign only";
  if (draft.priority === "CRITICAL") return "Approval required";
  if (draft.workflowArea === "GENERAL_MANAGER") return "Direct assignment";
  return "Available for claim";
}

type TaskIntakeProps = {
  canAssignOthers?: boolean;
  currentUserId?: string;
  defaultDueDate?: string;
  returnTo?: string;
  staff?: ActiveUserSummary[];
};

const draftStorageKey = "dispatch-board.task-intake-draft.v1";

export function EnterpriseTaskIntakePrototype({ canAssignOthers = false, currentUserId = "", defaultDueDate, returnTo = "/tasks", staff = [] }: TaskIntakeProps) {
  const collaboratorOptions = staff.length ? staff.map((user) => ({
    id: user.id,
    initials: user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    name: user.name,
    role: user.roles[0] ?? user.dutyPreview[0] ?? "Staff"
  })) : fallbackCollaboratorOptions;
  const [mode, setMode] = useState<IntakeMode>("guided");
  const [activeStage, setActiveStage] = useState<IntakeStage>("Capture");
  const [draft, setDraft] = useState<IntakeDraft>(() => createEmptyDraft(currentUserId, defaultDueDate));
  const [collaboratorCandidate, setCollaboratorCandidate] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const readiness = calculateTaskIntakeReadiness(draft);
  const policy = acquisitionPolicy(draft);

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(draftStorageKey);
    if (!savedDraft) return;
    try {
      const parsed = JSON.parse(savedDraft) as Partial<IntakeDraft>;
      const restoreTimer = window.setTimeout(() => {
        setDraft((current) => ({
          ...current,
          ...parsed,
          assignedUserId: canAssignOthers ? (parsed.assignedUserId ?? current.assignedUserId) : currentUserId,
          intakeType: !canAssignOthers && parsed.intakeType === "Manager Decision" ? "Quick Task" : (parsed.intakeType ?? current.intakeType),
          priority: !canAssignOthers && parsed.priority === "CRITICAL" ? "HIGH" : (parsed.priority ?? current.priority),
          requiresManagerApproval: canAssignOthers ? (parsed.requiresManagerApproval ?? current.requiresManagerApproval) : false
        }));
        setDraftMessage("Saved draft restored.");
      }, 0);
      return () => window.clearTimeout(restoreTimer);
    } catch {
      window.localStorage.removeItem(draftStorageKey);
    }
  }, [canAssignOthers, currentUserId]);

  function saveDraft() {
    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    setDraftMessage("Draft saved on this device.");
    setSubmitError("");
  }

  async function createTask() {
    if (readiness.score !== 100 || submitLock.current) {
      setSubmitError("Complete every creation-gate requirement before creating the task.");
      return;
    }
    submitLock.current = true;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedUserId: draft.assignedUserId,
          boardDate: draft.dueDate,
          collaboratorIds: draft.collaboratorIds,
          customerReference: draft.customerReference || undefined,
          description: draft.brief,
          dueAt: new Date(`${draft.dueDate}T${draft.dueTime}:00`).toISOString(),
          intakeMetadata: {
            channel: draft.channel,
            expectedOutcome: draft.expectedOutcome,
            intakeType: draft.intakeType,
            requiredUpdates: draft.requiredUpdates
          },
          priority: draft.priority,
          requiresManagerApproval: draft.requiresManagerApproval,
          status: "NOT_STARTED",
          title: draft.title,
          vehicleReference: draft.vehicleReference || undefined,
          workflowArea: draft.workflowArea
        })
      });
      const payload = await response.json().catch(() => null) as { error?: string; task?: { id: string } } | null;
      if (!response.ok || !payload?.task?.id) throw new Error(payload?.error ?? "Unable to create the task right now.");
      window.localStorage.removeItem(draftStorageKey);
      window.location.assign(`/tasks/${encodeURIComponent(payload.task.id)}?returnTo=${encodeURIComponent(returnTo)}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create the task right now.");
      submitLock.current = false;
      setIsSubmitting(false);
    }
  }

  function selectType(nextType: IntakeType) {
    const definition = typeOptions.find((item) => item.label === nextType)!;
    setDraft((current) => ({
      ...current,
      intakeType: nextType,
      requiresManagerApproval: nextType === "Manager Decision" ? true : current.requiresManagerApproval,
      workflowArea: definition.workflow,
      expectedOutcome: current.expectedOutcome || definition.outcome
    }));
  }

  function toggleRequiredUpdate(label: string) {
    setDraft((current) => ({
      ...current,
      requiredUpdates: current.requiredUpdates.includes(label)
        ? current.requiredUpdates.filter((item) => item !== label)
        : [...current.requiredUpdates, label]
    }));
  }

  function addCollaborator() {
    if (!collaboratorCandidate || draft.collaboratorIds.includes(collaboratorCandidate)) return;
    setDraft((current) => ({ ...current, collaboratorIds: [...current.collaboratorIds, collaboratorCandidate] }));
    setCollaboratorCandidate("");
  }

  function removeCollaborator(collaboratorId: string) {
    setDraft((current) => ({
      ...current,
      collaboratorIds: current.collaboratorIds.filter((id) => id !== collaboratorId)
    }));
  }

  return (
    <section className="task-intake-prototype" aria-label="Enterprise task intake">
      <header className="task-intake-header">
        <div>
          <Link href={returnTo}><ArrowLeft size={15} />Return to {returnTo === "/tasks" ? "Tasks Console" : "source console"}</Link>
          <p>Production intake · Tasks and collaborators save to the shared board</p>
          <h1>Enterprise Task Intake</h1>
          <span>Shape new work before it enters the Dispatch Board.</span>
        </div>
        <div className="task-intake-header-actions">
          <div className="task-intake-mode-switch" aria-label="Intake mode">
            <button className={mode === "quick" ? "active" : undefined} onClick={() => setMode("quick")} type="button">Quick Intake</button>
            <button className={mode === "guided" ? "active" : undefined} onClick={() => setMode("guided")} type="button">Guided Intake</button>
          </div>
          <button className="task-intake-reset" onClick={() => { setDraft(createEmptyDraft(currentUserId, defaultDueDate)); setActiveStage("Capture"); setDraftMessage(""); setSubmitError(""); window.localStorage.removeItem(draftStorageKey); }} type="button"><RotateCcw size={14} />Reset</button>
        </div>
      </header>

      {mode === "guided" ? (
        <nav className="task-intake-stages" aria-label="Guided intake stages">
          {stages.map((stage, index) => (
            <button className={activeStage === stage ? "active" : undefined} key={stage} onClick={() => setActiveStage(stage)} type="button">
              <span>{index + 1}</span>{stage}
            </button>
          ))}
        </nav>
      ) : null}

      <div className={mode === "quick" ? "task-intake-layout task-intake-layout-quick" : "task-intake-layout"}>
        {mode === "guided" ? (
          <aside className="task-intake-type-rail">
            <div><p>Intake Type</p><span>Choose the work pattern. Fields and defaults adapt automatically.</span></div>
            <nav>
              {typeOptions.map((option) => {
                const Icon = option.icon;
                return <button className={draft.intakeType === option.label ? "active" : undefined} disabled={!canAssignOthers && option.label === "Manager Decision"} key={option.label} onClick={() => selectType(option.label)} type="button"><Icon size={15} /><span>{option.label}</span><ChevronRight size={13} /></button>;
              })}
            </nav>
          </aside>
        ) : null}

        <main className="task-intake-form-panel">
          <div className="task-intake-section-heading">
            <div><p>{mode === "quick" ? "Quick capture" : activeStage}</p><h2>{draft.intakeType}</h2></div>
            <span><Sparkles size={13} />Shared draft contract</span>
          </div>

          <div className="task-intake-form-grid">
            <label className="task-intake-span-2"><span>Task title *</span><input onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Example: Diagnose 2014 Acura MDX A/C issue" value={draft.title} /></label>
            <label className="task-intake-span-2"><span>One-line brief *</span><textarea onChange={(event) => setDraft((current) => ({ ...current, brief: event.target.value }))} placeholder="Describe the action, evidence, and next step expected from the owner." rows={2} value={draft.brief} /></label>
            <label><span>Workflow area *</span><select onChange={(event) => setDraft((current) => ({ ...current, workflowArea: event.target.value }))} value={draft.workflowArea}><option value="INVENTORY">Inventory</option><option value="SHOP">Service / Recon</option><option value="SALES">Sales</option><option value="ADVERTISING">Marketing / Advertising</option><option value="ADMIN">Admin / Documentation</option><option value="COLLECTIONS">Collections</option><option value="GENERAL_MANAGER">Management</option></select></label>
            <label><span>Priority *</span><select onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as IntakeDraft["priority"], requiresManagerApproval: event.target.value === "CRITICAL" ? true : current.requiresManagerApproval }))} value={draft.priority}><option value="LOW">Low</option><option value="MEDIUM">Normal</option><option value="HIGH">High</option><option disabled={!canAssignOthers} value="CRITICAL">Critical</option></select></label>
            <label><span>Accountable owner *</span><select disabled={!canAssignOthers} onChange={(event) => setDraft((current) => ({ ...current, assignedUserId: event.target.value, collaboratorIds: current.collaboratorIds.filter((id) => id !== event.target.value) }))} value={draft.assignedUserId}><option value="">Choose task owner</option>{collaboratorOptions.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.role}</option>)}</select></label>
            <label className="task-intake-approval"><span>Manager control</span><span><input checked={draft.requiresManagerApproval} disabled={!canAssignOthers} onChange={(event) => setDraft((current) => ({ ...current, requiresManagerApproval: event.target.checked }))} type="checkbox" />Require approval before completion</span></label>
            <label><span>Due date *</span><input onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} type="date" value={draft.dueDate} /></label>
            <label><span>Due time *</span><input onChange={(event) => setDraft((current) => ({ ...current, dueTime: event.target.value }))} type="time" value={draft.dueTime} /></label>
            <label><span>Intake channel</span><select onChange={(event) => setDraft((current) => ({ ...current, channel: event.target.value }))} value={draft.channel}><option>Internal observation</option><option>Phone</option><option>Text / message</option><option>Email</option><option>Walk-in</option><option>Inspection</option><option>Vendor update</option></select></label>
            <label><span>Customer / concern</span><input onChange={(event) => setDraft((current) => ({ ...current, customerReference: event.target.value }))} placeholder="Customer name, case, or concern" value={draft.customerReference} /></label>
            <label><span>Vehicle / stock</span><input onChange={(event) => setDraft((current) => ({ ...current, vehicleReference: event.target.value }))} placeholder="Vehicle, VIN, or stock number" value={draft.vehicleReference} /></label>
            <div className="task-intake-collaborators task-intake-span-2">
              <span>Collaborators</span>
              <p>Add staff who should contribute, receive updates, and retain visibility without becoming the owner.</p>
              <div className="task-intake-collaborator-picker">
                <select aria-label="Choose collaborator" onChange={(event) => setCollaboratorCandidate(event.target.value)} value={collaboratorCandidate}>
                  <option value="">Choose a staff member</option>
                  {collaboratorOptions.filter((option) => option.id !== draft.assignedUserId && !draft.collaboratorIds.includes(option.id)).map((option) => <option key={option.id} value={option.id}>{option.name} · {option.role}</option>)}
                </select>
                <button disabled={!collaboratorCandidate} onClick={addCollaborator} type="button"><CirclePlus size={14} />Add collaborator</button>
              </div>
              <div className="task-intake-collaborator-list">
                {draft.collaboratorIds.length ? draft.collaboratorIds.map((id) => {
                  const collaborator = collaboratorOptions.find((option) => option.id === id)!;
                  return <div key={id}><span>{collaborator.initials}</span><p><strong>{collaborator.name}</strong><small>{collaborator.role}</small></p><button aria-label={`Remove ${collaborator.name}`} onClick={() => removeCollaborator(id)} type="button">×</button></div>;
                }) : <em>No collaborators added. The task will begin with owner-only visibility.</em>}
              </div>
            </div>
            <label className="task-intake-span-2"><span>Expected outcome *</span><textarea onChange={(event) => setDraft((current) => ({ ...current, expectedOutcome: event.target.value }))} placeholder="What must be true when this work is finished?" rows={3} value={draft.expectedOutcome} /></label>
          </div>

          <fieldset className="task-intake-required-updates"><legend>Required updates</legend><p>The owner must submit these before completion.</p><div>{updateOptions.map((option) => <label key={option}><input checked={draft.requiredUpdates.includes(option)} onChange={() => toggleRequiredUpdate(option)} type="checkbox" /><span>{option}</span></label>)}</div></fieldset>

          <footer className="task-intake-form-footer">
            <div className={submitError ? "task-intake-message error" : "task-intake-message"}><Save size={14} /><span>{submitError || draftMessage || "Draft recovery is available on this device."}</span></div>
            <button onClick={saveDraft} type="button">Save Draft</button>
            <button className="primary" disabled={readiness.score !== 100 || isSubmitting} onClick={createTask} type="button">{isSubmitting ? "Creating task…" : "Create Task"}</button>
          </footer>
        </main>

        <aside className="task-intake-preview-rail">
          <section className="task-intake-readiness">
            <div className="task-intake-score" style={{ "--score": `${readiness.score * 3.6}deg` } as CSSProperties}><span><strong>{readiness.score}%</strong><small>Ready</small></span></div>
            <div><p>Task Readiness</p><h2>{readiness.score >= 80 ? "Ready for review" : readiness.score >= 50 ? "Needs refinement" : "Not executable yet"}</h2><span>{readiness.checks.filter((check) => !check.ready).length} improvement{readiness.checks.filter((check) => !check.ready).length === 1 ? "" : "s"} remaining</span></div>
          </section>

          <section className="task-intake-card-preview">
            <header><span>{draft.priority}</span><strong>{draft.dueTime || "No due time"}</strong></header>
            <h3>{draft.title || "Untitled task"}</h3>
            <p>{draft.brief || "The one-line task brief will appear here."}</p>
            <div><span>{draft.workflowArea.replaceAll("_", " ")}</span><span>Not Started</span></div>
          </section>

          <section className="task-intake-inspector-preview">
            <div><p>Ownership policy</p><strong>{policy}</strong><span>Previewed from workflow, priority, and intake type.</span></div>
            <div><p>Expected outcome</p><strong>{draft.expectedOutcome || "Define the expected outcome."}</strong></div>
            <div><p>Required update</p><ul>{draft.requiredUpdates.map((update) => <li key={update}>{update}</li>)}</ul></div>
            <div><p>Collaborators ({draft.collaboratorIds.length})</p>{draft.collaboratorIds.length ? <ul>{draft.collaboratorIds.map((id) => <li key={id}>{collaboratorOptions.find((option) => option.id === id)?.name}</li>)}</ul> : <span>Owner-only until collaborators are added.</span>}</div>
          </section>

          <section className="task-intake-checks">
            <p>Creation gate</p>
            {readiness.checks.map((check) => <div className={check.ready ? "ready" : "missing"} key={check.label}>{check.ready ? <Check size={13} /> : <AlertTriangle size={13} />}<span>{check.label}</span><small>{check.weight}%</small></div>)}
          </section>

          <div className="task-intake-prototype-note"><Gauge size={15} /><span>Creation is permission checked. The task, adaptive checklist, collaborators, priority, and intake instructions are saved together.</span></div>
        </aside>
      </div>
    </section>
  );
}
