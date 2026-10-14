"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Camera,
  CarFront,
  Check,
  CirclePlus,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Gauge,
  Megaphone,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
  UserRound,
  UsersRound,
  Wrench
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";
import type { ActiveUserSummary } from "@/server/services/user-summary";
import type { UnifiedCrmTaskIntakeDefaults } from "@/lib/unified-crm-task-intake-handoff";

type EnterpriseTool = "intake-type" | "ownership" | "context" | "workflow" | "controls" | "uploads" | "checklist" | "subtasks" | "requirements" | "review";
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
  contextOmitted: boolean;
  customerReference: string;
  dueDate: string;
  dueTime: string;
  escalationPath: string;
  evidenceRequirement: string;
  expectedOutcome: string;
  intakeType: IntakeType;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  checklistItems: string[];
  requiredUpdates: string[];
  reviewCadence: string;
  requiresManagerApproval: boolean;
  slaPolicy: string;
  subtaskTemplates: string[];
  collaboratorIds: string[];
  title: string;
  brief: string;
  uploadedEvidence: string[];
  uploadRequirements: string[];
  vehicleReference: string;
  visibility: string;
  workflowArea: string;
};

const fallbackCollaboratorOptions = [
  { id: "eli-manager", initials: "EM", name: "Eli Manager", role: "General Manager" },
  { id: "ancilla-ops", initials: "AO", name: "Ancilla Ops", role: "Administration" },
  { id: "brock-inventory", initials: "BI", name: "Brock Inventory", role: "Inventory" },
  { id: "walter-mechanic", initials: "WM", name: "Walter Mechanic", role: "Service / Recon" },
  { id: "baraka-sales", initials: "BS", name: "Baraka Sales", role: "Sales" }
];

const updateOptions = ["Next step", "ETA", "Finding / result", "Customer contacted", "Photo evidence", "Final note"];
const uploadOptions = ["Customer authorization", "Vehicle photos", "Diagnostic scan", "Estimate / invoice", "Signed document", "Before / after evidence"];
const checklistOptions = ["Confirm owner", "Validate context", "Document next step", "Capture evidence", "Notify affected staff", "Manager review if blocked"];
const subtaskOptions = ["Customer follow-up", "Parts / document request", "Vehicle inspection", "Manager decision", "Vendor coordination", "Final QA review"];
const enterpriseTools: Array<{ label: string; value: EnterpriseTool }> = [
  { label: "Intake type", value: "intake-type" },
  { label: "Assignee and collaborators", value: "ownership" },
  { label: "Task context", value: "context" },
  { label: "Workflow and priority", value: "workflow" },
  { label: "Controls", value: "controls" },
  { label: "Uploads", value: "uploads" },
  { label: "Checklist", value: "checklist" },
  { label: "Subtasks", value: "subtasks" },
  { label: "Completion requirements", value: "requirements" },
  { label: "Review status", value: "review" }
];
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

const workflowCapabilities: Record<string, string[]> = {
  ADMIN: ["Document control", "Customer follow-up", "Manager visibility"],
  ADVERTISING: ["Listing checklist", "Photo evidence", "Campaign handoff"],
  COLLECTIONS: ["Promise tracking", "Escalation timing", "Payment follow-up"],
  GENERAL_MANAGER: ["Decision record", "Approval control", "Audit-ready handoff"],
  INVENTORY: ["Stage movement", "Vehicle context", "Exception visibility"],
  SALES: ["Lead follow-up", "Appointment path", "Customer context"],
  SHOP: ["Service evidence", "ETA updates", "QC readiness"]
};

function createEmptyDraft(assignedUserId = "", dueDate = new Date().toISOString().slice(0, 10)): IntakeDraft {
  return {
  assignedUserId,
  channel: "Internal observation",
  contextOmitted: false,
  customerReference: "",
  dueDate,
  dueTime: "16:30",
  escalationPath: "Manager if blocked",
  evidenceRequirement: "Final note",
  expectedOutcome: "",
  intakeType: "Quick Task",
  priority: "MEDIUM",
  checklistItems: ["Document next step"],
  requiredUpdates: ["Next step", "Final note"],
  reviewCadence: "At completion",
  requiresManagerApproval: false,
  slaPolicy: "Standard same-day",
  subtaskTemplates: [],
  collaboratorIds: [],
  title: "",
  brief: "",
  uploadedEvidence: [],
  uploadRequirements: [],
  vehicleReference: "",
  visibility: "Owner and collaborators",
  workflowArea: "GENERAL_MANAGER"
  };
}

export function calculateTaskIntakeReadiness(draft: IntakeDraft) {
  const hasLinkedContext = Boolean(draft.customerReference.trim() || draft.vehicleReference.trim());
  const checks = [
    { label: "Executable title", ready: draft.title.trim().length >= 8, weight: 15 },
    { label: "Clear one-line brief", ready: draft.brief.trim().length >= 16, weight: 10 },
    { label: "Workflow selected", ready: Boolean(draft.workflowArea), weight: 10 },
    { label: "Due date and time", ready: Boolean(draft.dueDate && draft.dueTime), weight: 10 },
    { label: "Expected outcome", ready: (draft.expectedOutcome || draft.brief).trim().length >= 20, weight: 15 },
    { label: "Required updates", ready: draft.requiredUpdates.length > 0, weight: 10 },
    { label: "Accountable owner", ready: Boolean(draft.assignedUserId), weight: 15 },
    { label: "Manager control aligned", ready: (draft.priority !== "CRITICAL" && draft.intakeType !== "Manager Decision") || draft.requiresManagerApproval, weight: 5 },
    { label: "Context linked or intentionally omitted", ready: draft.intakeType === "Quick Task" || draft.contextOmitted || hasLinkedContext, weight: 10 }
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
  initialDraft?: UnifiedCrmTaskIntakeDefaults;
  returnTo?: string;
  staff?: ActiveUserSummary[];
};

const draftStorageKey = "dispatch-board.task-intake-draft.v1";

export function EnterpriseTaskIntakePrototype({ canAssignOthers = false, currentUserId = "", defaultDueDate, initialDraft, returnTo = "/tasks", staff = [] }: TaskIntakeProps) {
  const router = useRouter();
  const collaboratorOptions = staff.length ? staff.map((user) => ({
    id: user.id,
    initials: user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    name: user.name,
    role: user.roles[0] ?? user.dutyPreview[0] ?? "Staff"
  })) : fallbackCollaboratorOptions;
  const [draft, setDraft] = useState<IntakeDraft>(() => {
    const empty = createEmptyDraft(currentUserId, defaultDueDate);
    const intakeType = typeOptions.find((option) => option.label === initialDraft?.intakeType)?.label ?? empty.intakeType;
    return { ...empty, ...initialDraft, intakeType };
  });
  const [selectedTool, setSelectedTool] = useState<EnterpriseTool>("intake-type");
  const [customChecklistItem, setCustomChecklistItem] = useState("");
  const [customSubtaskTemplate, setCustomSubtaskTemplate] = useState("");
  const [collaboratorCandidate, setCollaboratorCandidate] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLock = useRef(false);
  const readiness = calculateTaskIntakeReadiness(draft);
  const policy = acquisitionPolicy(draft);

  useEffect(() => {
    if (initialDraft && Object.keys(initialDraft).length) return;
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
  }, [canAssignOthers, currentUserId, initialDraft]);

  function saveDraft() {
    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    setDraftMessage("Draft saved on this device.");
    setSubmitError("");
  }

  async function createTask() {
    if (readiness.score !== 100 || submitLock.current) {
      const missingRequirements = readiness.checks
        .filter((check) => !check.ready)
        .map((check) => check.label.toLowerCase());
      setSubmitError(`Before creating this task, complete: ${missingRequirements.join(", ")}.`);
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
            contextOmitted: draft.contextOmitted,
            enterpriseControls: {
              escalationPath: draft.escalationPath,
              evidenceRequirement: draft.evidenceRequirement,
              reviewCadence: draft.reviewCadence,
              slaPolicy: draft.slaPolicy,
              visibility: draft.visibility
            },
            taskTools: {
              checklistItems: draft.checklistItems,
              subtaskTemplates: draft.subtaskTemplates,
              uploadedEvidence: draft.uploadedEvidence,
              uploadRequirements: draft.uploadRequirements
            },
            expectedOutcome: draft.expectedOutcome || draft.brief,
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
      router.push(`/tasks/${encodeURIComponent(payload.task.id)}?returnTo=${encodeURIComponent(returnTo)}`);
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
      contextOmitted: nextType === "Quick Task" ? current.contextOmitted : false,
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

  function toggleListItem(field: "checklistItems" | "subtaskTemplates" | "uploadRequirements", label: string) {
    setDraft((current) => ({
      ...current,
      [field]: current[field].includes(label)
        ? current[field].filter((item) => item !== label)
        : [...current[field], label]
    }));
  }

  function addCustomListItem(field: "checklistItems" | "subtaskTemplates", value: string) {
    const normalizedValue = value.trim();
    if (!normalizedValue) return;
    setDraft((current) => current[field].some((item) => item.toLowerCase() === normalizedValue.toLowerCase())
      ? current
      : { ...current, [field]: [...current[field], normalizedValue] });
    if (field === "checklistItems") setCustomChecklistItem("");
    if (field === "subtaskTemplates") setCustomSubtaskTemplate("");
  }

  function addUploadedEvidence(fileList: FileList | null, source: "Document" | "Photo") {
    if (!fileList?.length) return;
    const fileNames = Array.from(fileList).map((file) => `${source}: ${file.name}`);
    setDraft((current) => ({
      ...current,
      uploadedEvidence: Array.from(new Set([...current.uploadedEvidence, ...fileNames])),
      uploadRequirements: source === "Photo" && !current.uploadRequirements.includes("Vehicle photos")
        ? [...current.uploadRequirements, "Vehicle photos"]
        : current.uploadRequirements
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

  function renderEnterpriseTool() {
    if (selectedTool === "intake-type") {
      return (
        <section className="task-intake-enterprise-panel">
          <header><p>Intake Type</p><strong>{draft.intakeType}</strong></header>
          <div className="task-intake-type-grid">
            {typeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button className={draft.intakeType === option.label ? "active" : undefined} disabled={!canAssignOthers && option.label === "Manager Decision"} key={option.label} onClick={() => selectType(option.label)} type="button">
                  <Icon size={15} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      );
    }

    if (selectedTool === "context") {
      return (
        <section className="task-intake-enterprise-panel">
          <header><p>Task Context</p><strong>{draft.customerReference || draft.vehicleReference || draft.contextOmitted || draft.intakeType === "Quick Task" ? "Satisfied" : "Needs decision"}</strong></header>
          <div className="task-intake-context-block">
            <label><span>Customer / concern</span><input disabled={draft.contextOmitted} onChange={(event) => setDraft((current) => ({ ...current, contextOmitted: false, customerReference: event.target.value }))} placeholder="Customer name, case, or concern" value={draft.customerReference} /></label>
            <label><span>Vehicle / stock</span><input disabled={draft.contextOmitted} onChange={(event) => setDraft((current) => ({ ...current, contextOmitted: false, vehicleReference: event.target.value }))} placeholder="Vehicle, VIN, or stock number" value={draft.vehicleReference} /></label>
            <label className="task-intake-context-omit"><input checked={draft.contextOmitted} onChange={(event) => setDraft((current) => ({ ...current, contextOmitted: event.target.checked, customerReference: event.target.checked ? "" : current.customerReference, vehicleReference: event.target.checked ? "" : current.vehicleReference }))} type="checkbox" /><span>No linked customer or vehicle context needed for this task</span></label>
          </div>
        </section>
      );
    }

    if (selectedTool === "ownership") {
      return (
        <section className="task-intake-enterprise-panel">
          <header><p>Assignee and Collaborators</p><strong>{policy}</strong></header>
          <div className="task-intake-tool-grid">
            <label><span>Accountable owner *</span><select disabled={!canAssignOthers} onChange={(event) => setDraft((current) => ({ ...current, assignedUserId: event.target.value, collaboratorIds: current.collaboratorIds.filter((id) => id !== event.target.value) }))} value={draft.assignedUserId}><option value="">Choose task owner</option>{collaboratorOptions.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.role}</option>)}</select></label>
            <label><span>Intake channel</span><select onChange={(event) => setDraft((current) => ({ ...current, channel: event.target.value }))} value={draft.channel}><option>Internal observation</option><option>Phone</option><option>Text / message</option><option>Email</option><option>Walk-in</option><option>Inspection</option><option>Vendor update</option></select></label>
          </div>
          <div className="task-intake-enterprise-summary">
            <span><strong>Assignment policy</strong>{policy}</span>
            <span><strong>Collaborators</strong>{draft.collaboratorIds.length ? `${draft.collaboratorIds.length} staff linked` : "Owner-only"}</span>
          </div>
          <div className="task-intake-collaborators">
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
        </section>
      );
    }

    if (selectedTool === "controls") {
      return (
        <section className="task-intake-enterprise-panel">
          <header><p>Controls</p><strong>{draft.slaPolicy}</strong></header>
          <div className="task-intake-tool-grid">
            <label><span>Visibility</span><select onChange={(event) => setDraft((current) => ({ ...current, visibility: event.target.value }))} value={draft.visibility}><option>Owner and collaborators</option><option>Workflow team visible</option><option>Manager visible</option><option>Leadership visible</option></select></label>
            <label><span>SLA policy</span><select onChange={(event) => setDraft((current) => ({ ...current, slaPolicy: event.target.value }))} value={draft.slaPolicy}><option>Standard same-day</option><option>Customer promise monitored</option><option>End-of-day required</option><option>Critical clock monitored</option></select></label>
            <label><span>Escalation path</span><select onChange={(event) => setDraft((current) => ({ ...current, escalationPath: event.target.value, requiresManagerApproval: event.target.value.includes("Manager") ? true : current.requiresManagerApproval }))} value={draft.escalationPath}><option>Manager if blocked</option><option>Workflow lead first</option><option>Immediate manager escalation</option><option>No escalation needed</option></select></label>
            <label><span>Evidence requirement</span><select onChange={(event) => setDraft((current) => ({ ...current, evidenceRequirement: event.target.value, requiredUpdates: event.target.value.includes("Photo") && !current.requiredUpdates.includes("Photo evidence") ? [...current.requiredUpdates, "Photo evidence"] : current.requiredUpdates }))} value={draft.evidenceRequirement}><option>Final note</option><option>Finding and final note</option><option>Photo evidence and final note</option><option>Manager review packet</option></select></label>
            <label className="task-intake-span-2"><span>Review cadence</span><select onChange={(event) => setDraft((current) => ({ ...current, reviewCadence: event.target.value }))} value={draft.reviewCadence}><option>At completion</option><option>Every status change</option><option>Before customer contact</option><option>Manager checkpoint before close</option></select></label>
          </div>
          <div className="task-intake-enterprise-summary">
            <span><strong>Visibility</strong>{draft.visibility}</span>
            <span><strong>Evidence</strong>{draft.evidenceRequirement}</span>
            <span><strong>Escalation</strong>{draft.escalationPath}</span>
          </div>
        </section>
      );
    }

    if (selectedTool === "workflow") {
      return (
        <section className="task-intake-enterprise-panel">
          <header><p>Workflow and Priority</p><strong>{draft.workflowArea.replaceAll("_", " ")}</strong></header>
          <div className="task-intake-tool-grid">
            <label><span>Workflow area *</span><select onChange={(event) => setDraft((current) => ({ ...current, workflowArea: event.target.value }))} value={draft.workflowArea}><option value="INVENTORY">Inventory</option><option value="SHOP">Service / Recon</option><option value="SALES">Sales</option><option value="ADVERTISING">Marketing / Advertising</option><option value="ADMIN">Admin / Documentation</option><option value="COLLECTIONS">Collections</option><option value="GENERAL_MANAGER">Management</option></select></label>
            <label><span>Priority *</span><select onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as IntakeDraft["priority"], requiresManagerApproval: event.target.value === "CRITICAL" ? true : current.requiresManagerApproval }))} value={draft.priority}><option value="LOW">Low</option><option value="MEDIUM">Normal</option><option value="HIGH">High</option><option disabled={!canAssignOthers} value="CRITICAL">Critical</option></select></label>
          </div>
          <div className="task-intake-capability-list">
            {(workflowCapabilities[draft.workflowArea] ?? workflowCapabilities.GENERAL_MANAGER).map((capability) => <span key={capability}>{capability}</span>)}
          </div>
          <label className="task-intake-approval-control"><input checked={draft.requiresManagerApproval} disabled={!canAssignOthers} onChange={(event) => setDraft((current) => ({ ...current, requiresManagerApproval: event.target.checked }))} type="checkbox" /><span>Require manager approval before completion</span></label>
        </section>
      );
    }

    if (selectedTool === "uploads") {
      return (
        <section className="task-intake-enterprise-panel">
          <header><p>Uploads</p><strong>{draft.uploadedEvidence.length ? `${draft.uploadedEvidence.length} attached` : `${draft.uploadRequirements.length} requested`}</strong></header>
          <div className="task-intake-upload-actions">
            <label><Upload size={15} /><span>Upload document</span><input accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*" multiple onChange={(event) => addUploadedEvidence(event.target.files, "Document")} type="file" /></label>
            <label><Camera size={15} /><span>Take photo</span><input accept="image/*" capture="environment" onChange={(event) => addUploadedEvidence(event.target.files, "Photo")} type="file" /></label>
          </div>
          <fieldset className="task-intake-required-updates"><legend>Upload requirements</legend><p>Set the evidence or documents the owner should attach while completing the task.</p><div>{uploadOptions.map((option) => <label key={option}><input checked={draft.uploadRequirements.includes(option)} onChange={() => toggleListItem("uploadRequirements", option)} type="checkbox" /><span>{option}</span></label>)}</div></fieldset>
          {draft.uploadedEvidence.length ? <div className="task-intake-upload-list">{draft.uploadedEvidence.map((item) => <button aria-label={`Remove upload ${item}`} key={item} onClick={() => setDraft((current) => ({ ...current, uploadedEvidence: current.uploadedEvidence.filter((evidence) => evidence !== item) }))} type="button"><FileText size={13} /><span>{item}</span><b>×</b></button>)}</div> : null}
          <div className="task-intake-enterprise-summary">
            <span><strong>Evidence mode</strong>{draft.uploadedEvidence.length ? "Evidence attached" : draft.uploadRequirements.length ? "Attachments expected" : "No uploads required"}</span>
            <span><strong>Completion link</strong>{draft.uploadRequirements.includes("Before / after evidence") ? "Before / after proof" : draft.evidenceRequirement}</span>
          </div>
        </section>
      );
    }

    if (selectedTool === "checklist") {
      return (
        <section className="task-intake-enterprise-panel">
          <header><p>Checklist</p><strong>{draft.checklistItems.length} items</strong></header>
          <fieldset className="task-intake-required-updates"><legend>Task checklist</legend><p>Pick the operating checklist that should appear with the task.</p><div>{checklistOptions.map((option) => <label key={option}><input checked={draft.checklistItems.includes(option)} onChange={() => toggleListItem("checklistItems", option)} type="checkbox" /><span>{option}</span></label>)}</div></fieldset>
          <div className="task-intake-custom-tool-row">
            <label><span>Add checklist item</span><input onChange={(event) => setCustomChecklistItem(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomListItem("checklistItems", customChecklistItem); } }} placeholder="Example: Confirm title status" value={customChecklistItem} /></label>
            <button disabled={!customChecklistItem.trim()} onClick={() => addCustomListItem("checklistItems", customChecklistItem)} type="button"><CirclePlus size={14} />Add item</button>
          </div>
          {draft.checklistItems.length ? <div className="task-intake-custom-chip-list">{draft.checklistItems.map((item) => <button aria-label={`Remove checklist item ${item}`} key={item} onClick={() => toggleListItem("checklistItems", item)} type="button">{item}<span>×</span></button>)}</div> : null}
          <div className="task-intake-enterprise-summary">
            <span><strong>Quality gate</strong>{draft.checklistItems.includes("Manager review if blocked") ? "Manager-aware" : "Owner managed"}</span>
            <span><strong>Checklist depth</strong>{draft.checklistItems.length >= 4 ? "Full" : "Lightweight"}</span>
          </div>
        </section>
      );
    }

    if (selectedTool === "subtasks") {
      return (
        <section className="task-intake-enterprise-panel">
          <header><p>Subtasks</p><strong>{draft.subtaskTemplates.length} staged</strong></header>
          <fieldset className="task-intake-required-updates"><legend>Subtask templates</legend><p>Stage related follow-up work that can be generated from this task package.</p><div>{subtaskOptions.map((option) => <label key={option}><input checked={draft.subtaskTemplates.includes(option)} onChange={() => toggleListItem("subtaskTemplates", option)} type="checkbox" /><span>{option}</span></label>)}</div></fieldset>
          <div className="task-intake-custom-tool-row">
            <label><span>Add subtask</span><input onChange={(event) => setCustomSubtaskTemplate(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomListItem("subtaskTemplates", customSubtaskTemplate); } }} placeholder="Example: Call vendor for ETA" value={customSubtaskTemplate} /></label>
            <button disabled={!customSubtaskTemplate.trim()} onClick={() => addCustomListItem("subtaskTemplates", customSubtaskTemplate)} type="button"><CirclePlus size={14} />Add subtask</button>
          </div>
          {draft.subtaskTemplates.length ? <div className="task-intake-custom-chip-list">{draft.subtaskTemplates.map((item) => <button aria-label={`Remove subtask ${item}`} key={item} onClick={() => toggleListItem("subtaskTemplates", item)} type="button">{item}<span>×</span></button>)}</div> : null}
          <div className="task-intake-enterprise-summary">
            <span><strong>Work package</strong>{draft.subtaskTemplates.length ? "Multi-step" : "Single task"}</span>
            <span><strong>Handoff model</strong>{draft.subtaskTemplates.some((item) => item.includes("Manager")) ? "Manager linked" : "Owner routed"}</span>
          </div>
        </section>
      );
    }

    if (selectedTool === "requirements") {
      return (
        <section className="task-intake-enterprise-panel">
          <header><p>Completion Requirements</p><strong>{draft.requiredUpdates.length} required</strong></header>
          <label className="task-intake-span-2"><span>Expected outcome</span><textarea onChange={(event) => setDraft((current) => ({ ...current, expectedOutcome: event.target.value }))} placeholder="Optional: override the task description as the completion outcome." rows={3} value={draft.expectedOutcome} /></label>
          <fieldset className="task-intake-required-updates"><legend>Required updates</legend><p>These become completion requirements for the owner.</p><div>{updateOptions.map((option) => <label key={option}><input checked={draft.requiredUpdates.includes(option)} onChange={() => toggleRequiredUpdate(option)} type="checkbox" /><span>{option}</span></label>)}</div></fieldset>
        </section>
      );
    }

    return (
      <section className="task-intake-enterprise-panel">
        <header><p>Review Status</p><strong>{readiness.score}% ready</strong></header>
        <div className="task-intake-review-compact">
          <div className="task-intake-card-preview">
            <header><span>{draft.priority}</span><strong>{draft.dueTime || "No due time"}</strong></header>
            <h3>{draft.title || "Untitled task"}</h3>
            <p>{draft.brief || "The task description will appear here."}</p>
            <div><span>{draft.workflowArea.replaceAll("_", " ")}</span><span>Not Started</span></div>
          </div>
          <div className="task-intake-enterprise-summary">
            <span><strong>Owner</strong>{collaboratorOptions.find((option) => option.id === draft.assignedUserId)?.name ?? "Unassigned"}</span>
            <span><strong>Collaborators</strong>{draft.collaboratorIds.length ? `${draft.collaboratorIds.length} linked` : "None"}</span>
            <span><strong>Controls</strong>{draft.slaPolicy}</span>
            <span><strong>Visibility</strong>{draft.visibility}</span>
            <span><strong>Uploads</strong>{draft.uploadedEvidence.length ? `${draft.uploadedEvidence.length} attached` : draft.uploadRequirements.length ? `${draft.uploadRequirements.length} requested` : "None"}</span>
            <span><strong>Checklist</strong>{draft.checklistItems.length ? `${draft.checklistItems.length} items` : "None"}</span>
            <span><strong>Subtasks</strong>{draft.subtaskTemplates.length ? `${draft.subtaskTemplates.length} staged` : "None"}</span>
          </div>
          <div className="task-intake-checks">
            <p>Readiness</p>
            {readiness.checks.map((check) => <div className={check.ready ? "ready" : "missing"} key={check.label}>{check.ready ? <Check size={13} /> : <AlertTriangle size={13} />}<span>{check.label}</span><small>{check.weight}%</small></div>)}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="task-intake-prototype" aria-label="Task intake">
      <header className="task-intake-header">
        <div>
          <Link href={returnTo}><ArrowLeft size={15} />Return to {returnTo === "/tasks" ? "Tasks Console" : "source console"}</Link>
          <TimeMotorSalesLogo className="task-intake-brand-logo" priority />
          <p>Production intake · Tasks and collaborators save to the shared board</p>
          <h1>Task Intake</h1>
          <span>Shape new work before it enters the Dispatch Board.</span>
        </div>
        <div className="task-intake-header-actions">
          <label className="task-intake-enterprise-select"><span>Task tools</span><select onChange={(event) => setSelectedTool(event.target.value as EnterpriseTool)} value={selectedTool}>{enterpriseTools.map((tool) => <option key={tool.value} value={tool.value}>{tool.label}</option>)}</select></label>
          <button className="task-intake-reset" onClick={() => { setDraft(createEmptyDraft(currentUserId, defaultDueDate)); setDraftMessage(""); setSubmitError(""); window.localStorage.removeItem(draftStorageKey); }} type="button"><RotateCcw size={14} />Reset</button>
        </div>
      </header>

      <div className="task-intake-layout task-intake-layout-simple">
        <main className="task-intake-form-panel">
          <div className="task-intake-section-heading">
            <div><p>Simple capture</p><h2>{draft.intakeType}</h2></div>
            <span><Sparkles size={13} />{readiness.score}% ready</span>
          </div>

          <div className="task-intake-form-grid">
            <label className="task-intake-span-2"><span>Task title *</span><input onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Example: Diagnose 2014 Acura MDX A/C issue" value={draft.title} /></label>
            <label className="task-intake-span-2"><span>Task description *</span><textarea onChange={(event) => setDraft((current) => ({ ...current, brief: event.target.value }))} placeholder="Describe the action, evidence, and next step expected from the owner." rows={4} value={draft.brief} /></label>
            <label className="task-intake-span-2"><span>Assign to staff *</span><select disabled={!canAssignOthers} onChange={(event) => setDraft((current) => ({ ...current, assignedUserId: event.target.value, collaboratorIds: current.collaboratorIds.filter((id) => id !== event.target.value) }))} value={draft.assignedUserId}><option value="">Choose task owner</option>{collaboratorOptions.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.role}</option>)}</select></label>
            <label><span>Due date *</span><input onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} type="date" value={draft.dueDate} /></label>
            <label><span>Due time *</span><input onChange={(event) => setDraft((current) => ({ ...current, dueTime: event.target.value }))} type="time" value={draft.dueTime} /></label>
          </div>

          <footer className="task-intake-form-footer">
            <div className={submitError ? "task-intake-message error" : "task-intake-message"}><Save size={14} /><span>{submitError || draftMessage || "Draft recovery is available on this device."}</span></div>
            <button onClick={saveDraft} type="button">Save Draft</button>
            <button aria-label="Create Task" className="primary" disabled={isSubmitting} onClick={createTask} type="button">{isSubmitting ? "Creating task…" : readiness.score === 100 ? "Create Task" : `Review & Create · ${readiness.score}%`}</button>
          </footer>
        </main>

        <aside className="task-intake-enterprise-column">
          {renderEnterpriseTool()}
          <div className="task-intake-prototype-note"><Gauge size={15} /><span>Creation is permission checked. Task tools are available from the selector without crowding the capture form.</span></div>
        </aside>
      </div>
    </section>
  );
}
