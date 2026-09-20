"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Boxes,
  Building2,
  CalendarCheck,
  CarFront,
  Check,
  CirclePlus,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  Gauge,
  Handshake,
  KeyRound,
  MapPinned,
  Megaphone,
  MessageSquareWarning,
  PackageCheck,
  RotateCcw,
  Save,
  ShieldCheck,
  Truck,
  UserRound,
  UsersRound,
  Wrench
} from "lucide-react";
import Link from "next/link";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import type { ActiveUserSummary } from "@/server/services/user-summary";

type IntakeMode = "quick" | "guided";
type IntakeStage = "Capture" | "Shape" | "Outcome" | "Ownership" | "Controls" | "Preview" | "Review";
type IntakeType = "Quick Task" | "Manager Decision" | "Sales Lead / Appointment" | "Sales Deal / Delivery" | "Finance / Funding" | "Customer Issue" | "Service Advisor" | "Repair Order / Authorization" | "Diagnostics / Estimate" | "Shop Dispatch / Technician" | "Parts Request / Backorder" | "Sublet / Vendor" | "Quality Control / Comeback" | "Inventory Acquisition" | "Inventory Movement" | "Recon / Detail" | "Photos / Merchandising" | "Marketing / Listing" | "Title / Registration" | "Admin / Documentation" | "Accounting / Payables" | "Collections" | "Compliance / Risk" | "Facilities / Supplies";
type IntakeWorkflowArea = "INVENTORY" | "ADVERTISING" | "MARKETING" | "SALES" | "SERVICE_ADVISOR" | "ADMIN" | "COLLECTIONS" | "SHOP" | "GENERAL_MANAGER";
type IntakeCategoryGroup = "Start Here" | "Sales & Customer" | "Service & Shop" | "Inventory & Merchandising" | "Back Office & Controls";
type IntakeTypeOption = {
  group: IntakeCategoryGroup;
  icon: typeof ClipboardCheck;
  label: IntakeType;
  workflow: IntakeWorkflowArea;
  outcome: string;
};
type ReadinessField = "title" | "brief" | "workflowArea" | "dueDate" | "dueTime" | "expectedOutcome" | "assignedUserId" | "context";

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
  collaboratorRequests: Array<{ userId: string; collaborationScope: string; capacityRequested: string }>;
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
const typeOptions: IntakeTypeOption[] = [
  { group: "Start Here", icon: ClipboardCheck, label: "Quick Task", workflow: "GENERAL_MANAGER", outcome: "The requested work is completed and the next operational step is recorded." },
  { group: "Start Here", icon: BadgeCheck, label: "Manager Decision", workflow: "GENERAL_MANAGER", outcome: "A manager decision is recorded and the affected work has an executable next step." },
  { group: "Sales & Customer", icon: UsersRound, label: "Sales Lead / Appointment", workflow: "SALES", outcome: "The lead receives timely follow-up and the next sales or appointment action is recorded." },
  { group: "Sales & Customer", icon: Handshake, label: "Sales Deal / Delivery", workflow: "SALES", outcome: "The deal, delivery promise, customer handoff, and remaining blockers are ready for execution." },
  { group: "Sales & Customer", icon: CreditCard, label: "Finance / Funding", workflow: "SALES", outcome: "The finance package, stipulations, funding blocker, or lender follow-up is completed or escalated." },
  { group: "Sales & Customer", icon: MessageSquareWarning, label: "Customer Issue", workflow: "ADMIN", outcome: "The customer receives a clear resolution or a documented next step with ownership and follow-up timing." },
  { group: "Service & Shop", icon: UserRound, label: "Service Advisor", workflow: "SERVICE_ADVISOR", outcome: "The customer concern, authorization, promise, and advisor handoff are documented with the next follow-up owned." },
  { group: "Service & Shop", icon: ClipboardList, label: "Repair Order / Authorization", workflow: "SERVICE_ADVISOR", outcome: "The repair order scope, customer authorization, stop rules, and next promise are clear." },
  { group: "Service & Shop", icon: Gauge, label: "Diagnostics / Estimate", workflow: "SHOP", outcome: "The diagnostic finding, estimate need, evidence, and approval path are documented." },
  { group: "Service & Shop", icon: Wrench, label: "Shop Dispatch / Technician", workflow: "SHOP", outcome: "The technician-ready work, blockers, parts, ETA, and completion evidence are visible." },
  { group: "Service & Shop", icon: PackageCheck, label: "Parts Request / Backorder", workflow: "SHOP", outcome: "The part need, source, ETA, backorder risk, and affected work are documented." },
  { group: "Service & Shop", icon: Building2, label: "Sublet / Vendor", workflow: "SHOP", outcome: "The vendor assignment, quote, pickup or delivery timing, and return requirement are clear." },
  { group: "Service & Shop", icon: ShieldCheck, label: "Quality Control / Comeback", workflow: "SHOP", outcome: "The QC result, comeback concern, corrective action, and release decision are recorded." },
  { group: "Inventory & Merchandising", icon: CarFront, label: "Inventory Acquisition", workflow: "INVENTORY", outcome: "The acquisition step, appraisal need, transport, title, or stocking blocker has a clear owner." },
  { group: "Inventory & Merchandising", icon: Truck, label: "Inventory Movement", workflow: "INVENTORY", outcome: "The vehicle reaches its target stage or the movement blocker and ETA are visible." },
  { group: "Inventory & Merchandising", icon: Boxes, label: "Recon / Detail", workflow: "INVENTORY", outcome: "The recon, detail, cleanup, lot-ready, or frontline readiness step is completed or blocked with ETA." },
  { group: "Inventory & Merchandising", icon: MapPinned, label: "Photos / Merchandising", workflow: "MARKETING", outcome: "Photos, merchandising data, vehicle highlights, and listing readiness are complete." },
  { group: "Inventory & Merchandising", icon: Megaphone, label: "Marketing / Listing", workflow: "ADVERTISING", outcome: "The listing or campaign is complete, accurate, and ready for customer visibility." },
  { group: "Back Office & Controls", icon: KeyRound, label: "Title / Registration", workflow: "ADMIN", outcome: "The title, registration, lien, plate, or DMV step is obtained, processed, or escalated." },
  { group: "Back Office & Controls", icon: FileText, label: "Admin / Documentation", workflow: "ADMIN", outcome: "The required document is obtained, processed, or escalated with a clear deadline." },
  { group: "Back Office & Controls", icon: CircleDollarSign, label: "Accounting / Payables", workflow: "ADMIN", outcome: "The invoice, payable, receivable, reconciliation, or posting issue is completed or escalated." },
  { group: "Back Office & Controls", icon: CircleDollarSign, label: "Collections", workflow: "COLLECTIONS", outcome: "The payment outcome, promise, follow-up date, and escalation status are documented." },
  { group: "Back Office & Controls", icon: ShieldCheck, label: "Compliance / Risk", workflow: "GENERAL_MANAGER", outcome: "The policy, audit, legal, safety, or compliance risk has a documented decision and next step." },
  { group: "Back Office & Controls", icon: CalendarCheck, label: "Facilities / Supplies", workflow: "ADMIN", outcome: "The facility, equipment, supply, or internal operating need is assigned and resolved." }
];
const categoryGroups: IntakeCategoryGroup[] = ["Start Here", "Sales & Customer", "Service & Shop", "Inventory & Merchandising", "Back Office & Controls"];
const recommendedCategoryLabels: IntakeType[] = ["Quick Task", "Repair Order / Authorization", "Sales Lead / Appointment", "Inventory Movement", "Marketing / Listing"];

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
  collaboratorRequests: [],
  title: "",
  brief: "",
  vehicleReference: "",
  workflowArea: "GENERAL_MANAGER"
  };
}

export function calculateTaskIntakeReadiness(draft: IntakeDraft) {
  const needsCustomerOrVehicleContext = /advisor|appointment|customer|repair|service|vehicle|vin/.test(draft.intakeType.toLocaleLowerCase());
  const checks = [
    { label: "Executable title", ready: draft.title.trim().length >= 8, weight: 15 },
    { label: "Clear task details", ready: draft.brief.trim().length >= 16, weight: 10 },
    { label: "Workflow selected", ready: Boolean(draft.workflowArea), weight: 10 },
    { label: "Due date and time", ready: Boolean(draft.dueDate && draft.dueTime), weight: 10 },
    { label: "Expected outcome", ready: draft.expectedOutcome.trim().length >= 20, weight: 15 },
    { label: "Required updates", ready: draft.requiredUpdates.length > 0, weight: 10 },
    { label: "Accountable owner", ready: Boolean(draft.assignedUserId), weight: 15 },
    { label: "Manager control optional", ready: true, weight: 5 },
    { label: "Context linked or intentionally omitted", ready: !needsCustomerOrVehicleContext || Boolean(draft.customerReference.trim() || draft.vehicleReference.trim()), weight: 10 }
  ];
  const score = checks.reduce((total, check) => total + (check.ready ? check.weight : 0), 0);
  return { checks, score };
}

function detailsTemplateFor(option: IntakeTypeOption) {
  const common = `Category: ${option.label}\nOutcome: ${option.outcome}\n\n`;
  if (option.group === "Sales & Customer") {
    return `${common}Customer / deal context:\nNext promise:\nBlocker or decision needed:\nFollow-up timing:`;
  }
  if (option.group === "Service & Shop") {
    return `${common}Vehicle / RO context:\nConcern or work requested:\nParts / authorization status:\nETA or release condition:`;
  }
  if (option.group === "Inventory & Merchandising") {
    return `${common}Vehicle / stock context:\nCurrent stage:\nNext location or listing step:\nBlocker / evidence needed:`;
  }
  if (option.group === "Back Office & Controls") {
    return `${common}Record / account context:\nDocument or control needed:\nDeadline / risk:\nEscalation path:`;
  }
  return `${common}Work request:\nOwner instruction:\nCompletion evidence:\nNext update needed:`;
}

function categoryEvidenceFor(option: IntakeTypeOption) {
  if (option.group === "Sales & Customer") return "Customer promise, next contact, and deal blocker.";
  if (option.group === "Service & Shop") return "Vehicle, RO, authorization, ETA, and completion evidence.";
  if (option.group === "Inventory & Merchandising") return "Stock number, current stage, target state, and listing or lot-ready evidence.";
  if (option.group === "Back Office & Controls") return "Document, account, deadline, risk, and escalation note.";
  return "Owner, next action, completion evidence, and final note.";
}

function acquisitionPolicy(draft: IntakeDraft) {
  if (draft.intakeType === "Manager Decision") return "Manager assign only";
  if (draft.priority === "CRITICAL") return "Approval required";
  if (draft.workflowArea === "GENERAL_MANAGER") return "Direct assignment";
  return "Available for claim";
}

function shouldClearStarterTaskDetails(value: string) {
  const normalized = value.trim().toLocaleLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith("source:")) return false;
  return normalized.startsWith("review this daily focus item and record whether")
    || normalized.startsWith("converted from a manually added")
    || normalized === "document the action, evidence, and next step expected from the owner.";
}

type TaskIntakeProps = {
  canAssignOthers?: boolean;
  currentUserId?: string;
  defaultDueDate?: string;
  initialDraft?: Partial<IntakeDraft> & { sourceDetail?: string; sourceTitle?: string };
  returnTo?: string;
  staff?: ActiveUserSummary[];
};

const draftStorageKey = "dispatch-board.task-intake-draft.v1";

export function EnterpriseTaskIntakePrototype({ canAssignOthers = false, currentUserId = "", defaultDueDate, initialDraft, returnTo = "/tasks", staff = [] }: TaskIntakeProps) {
  const collaboratorOptions = staff.length ? staff.map((user) => ({
    id: user.id,
    initials: user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
    name: user.name,
    role: user.roles[0] ?? user.dutyPreview[0] ?? "Staff"
  })) : fallbackCollaboratorOptions;
  const [mode, setMode] = useState<IntakeMode>("guided");
  const [activeStage, setActiveStage] = useState<IntakeStage>("Capture");
  const [draft, setDraft] = useState<IntakeDraft>(() => ({
    ...createEmptyDraft(currentUserId, defaultDueDate),
    ...initialDraft
  }));
  const [collaboratorCandidate, setCollaboratorCandidate] = useState("");
  const [collaboratorScope, setCollaboratorScope] = useState("");
  const [collaboratorCapacity, setCollaboratorCapacity] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [recentCategories, setRecentCategories] = useState<IntakeType[]>([]);
  const detailsAutoClearRef = useRef(false);
  const submitLock = useRef(false);
  const assignedUserRef = useRef<HTMLSelectElement>(null);
  const briefRef = useRef<HTMLTextAreaElement>(null);
  const contextRef = useRef<HTMLInputElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const dueTimeRef = useRef<HTMLInputElement>(null);
  const expectedOutcomeRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const workflowAreaRef = useRef<HTMLSelectElement>(null);
  const readiness = calculateTaskIntakeReadiness(draft);
  const policy = acquisitionPolicy(draft);
  const selectedType = typeOptions.find((item) => item.label === draft.intakeType) ?? typeOptions[0];
  const SelectedTypeIcon = selectedType.icon;
  const needsVehicleContext = Boolean(draft.vehicleReference.trim())
    || selectedType.group === "Service & Shop"
    || selectedType.group === "Inventory & Merchandising"
    || draft.intakeType === "Sales Deal / Delivery";
  const needsCustomerContext = Boolean(draft.customerReference.trim())
    || selectedType.group === "Sales & Customer"
    || draft.intakeType === "Service Advisor"
    || draft.intakeType === "Repair Order / Authorization"
    || draft.intakeType === "Collections";
  const filteredCategoryGroups = useMemo(() => {
    const search = categorySearch.trim().toLocaleLowerCase();
    return categoryGroups.map((group) => ({
      group,
      options: typeOptions.filter((option) => {
        if (option.group !== group) return false;
        if (!search) return true;
        return `${option.label} ${option.workflow} ${option.outcome} ${categoryEvidenceFor(option)}`.toLocaleLowerCase().includes(search);
      })
    })).filter((group) => group.options.length);
  }, [categorySearch]);
  const recentCategoryOptions = recentCategories
    .map((label) => typeOptions.find((option) => option.label === label))
    .filter((option): option is IntakeTypeOption => Boolean(option));
  const recommendedCategoryOptions = recommendedCategoryLabels
    .map((label) => typeOptions.find((option) => option.label === label))
    .filter((option): option is IntakeTypeOption => Boolean(option))
    .filter((option) => !recentCategories.includes(option.label));

  useEffect(() => {
    const hasIncomingSourceDraft = Boolean(
      initialDraft?.sourceDetail?.trim()
      || initialDraft?.sourceTitle?.trim()
      || initialDraft?.title?.trim()
      || initialDraft?.brief?.trim()
      || initialDraft?.expectedOutcome?.trim()
      || initialDraft?.customerReference?.trim()
      || initialDraft?.vehicleReference?.trim()
    );
    if (hasIncomingSourceDraft) return;
    const savedDraft = window.localStorage.getItem(draftStorageKey);
    if (!savedDraft) return;
    try {
      const parsed = JSON.parse(savedDraft) as Partial<IntakeDraft>;
      const restoreTimer = window.setTimeout(() => {
        setDraft((current) => ({
          ...current,
          ...parsed,
          assignedUserId: canAssignOthers ? (parsed.assignedUserId ?? current.assignedUserId) : currentUserId,
          collaboratorRequests: (parsed.collaboratorRequests ?? []).filter((request) => request.userId !== (canAssignOthers ? (parsed.assignedUserId ?? current.assignedUserId) : currentUserId)),
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

  useEffect(() => {
    if (!categoryDrawerOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setCategoryDrawerOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [categoryDrawerOpen]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("dispatch-board.task-intake-recent-categories.v1");
      if (!saved) return;
      const parsed = JSON.parse(saved) as IntakeType[];
      const restoreTimer = window.setTimeout(() => {
        setRecentCategories(parsed.filter((label) => typeOptions.some((option) => option.label === label)).slice(0, 5));
      }, 0);
      return () => window.clearTimeout(restoreTimer);
    } catch {
      window.localStorage.removeItem("dispatch-board.task-intake-recent-categories.v1");
    }
  }, []);

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
          collaboratorRequests: draft.collaboratorRequests.map((request) => ({
            userId: request.userId,
            collaborationScope: request.collaborationScope,
            ...(request.capacityRequested.trim() ? { capacityRequested: request.capacityRequested.trim() } : {})
          })),
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
      workflowArea: definition.workflow,
      expectedOutcome: current.expectedOutcome || definition.outcome
    }));
    setRecentCategories((current) => {
      const next = [nextType, ...current.filter((label) => label !== nextType)].slice(0, 5);
      window.localStorage.setItem("dispatch-board.task-intake-recent-categories.v1", JSON.stringify(next));
      return next;
    });
    setCategorySearch("");
    setCategoryDrawerOpen(false);
  }

  function applyDetailsTemplate() {
    setDetailsExpanded(true);
    setDraft((current) => ({
      ...current,
      brief: current.brief.trim() ? current.brief : detailsTemplateFor(selectedType),
      expectedOutcome: current.expectedOutcome || selectedType.outcome
    }));
    window.setTimeout(() => briefRef.current?.focus(), 0);
  }

  function refForReadinessField(field: ReadinessField) {
    if (field === "assignedUserId") return assignedUserRef;
    if (field === "brief") return briefRef;
    if (field === "context") return contextRef;
    if (field === "dueDate") return dueDateRef;
    if (field === "dueTime") return dueTimeRef;
    if (field === "expectedOutcome") return expectedOutcomeRef;
    if (field === "title") return titleRef;
    return workflowAreaRef;
  }

  function focusReadinessField(label: string) {
    const target: ReadinessField | undefined = {
      "Accountable owner": "assignedUserId",
      "Clear task details": "brief",
      "Context linked or intentionally omitted": "context",
      "Due date and time": draft.dueDate ? "dueTime" : "dueDate",
      "Executable title": "title",
      "Expected outcome": "expectedOutcome",
      "Required updates": undefined,
      "Workflow selected": "workflowArea"
    }[label] as ReadinessField | undefined;
    if (!target) return;
    if (target === "brief") expandTaskDetails();
    window.setTimeout(() => refForReadinessField(target).current?.focus(), 0);
  }

  function toggleRequiredUpdate(label: string) {
    setDraft((current) => ({
      ...current,
      requiredUpdates: current.requiredUpdates.includes(label)
        ? current.requiredUpdates.filter((item) => item !== label)
        : [...current.requiredUpdates, label]
    }));
  }

  function expandTaskDetails() {
    setDetailsExpanded(true);
    if (detailsAutoClearRef.current) return;
    detailsAutoClearRef.current = true;
    setDraft((current) => shouldClearStarterTaskDetails(current.brief) ? { ...current, brief: "" } : current);
  }

  function addCollaborator() {
    const scope = collaboratorScope.trim();
    if (!collaboratorCandidate || !scope || draft.collaboratorRequests.some((request) => request.userId === collaboratorCandidate)) return;
    setDraft((current) => ({
      ...current,
      collaboratorRequests: [...current.collaboratorRequests, {
        userId: collaboratorCandidate,
        collaborationScope: scope,
        capacityRequested: collaboratorCapacity.trim()
      }]
    }));
    setCollaboratorCandidate("");
    setCollaboratorScope("");
    setCollaboratorCapacity("");
  }

  function removeCollaborator(collaboratorId: string) {
    setDraft((current) => ({
      ...current,
      collaboratorRequests: current.collaboratorRequests.filter((request) => request.userId !== collaboratorId)
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
        <main className="task-intake-form-panel">
          <div className="task-intake-section-heading">
            <div><p>{mode === "quick" ? "Quick capture" : activeStage}</p><h2>{draft.intakeType}</h2><span>{selectedType.workflow.replaceAll("_", " ")} · {categoryEvidenceFor(selectedType)}</span></div>
            <button className="task-intake-category-trigger" onClick={() => setCategoryDrawerOpen(true)} type="button">
              <SelectedTypeIcon size={14} />
              <span>Change category</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="task-intake-form-grid">
            <label className="task-intake-span-2"><span>Task title *</span><input ref={titleRef} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Example: Diagnose 2014 Acura MDX A/C issue" value={draft.title} /></label>
            <div className={`task-intake-details task-intake-span-2${detailsExpanded ? " task-intake-details-expanded" : ""}`}>
              <div className="task-intake-details-header">
                <span>Task details *</span>
                <button onClick={applyDetailsTemplate} type="button">Use {draft.intakeType} template</button>
              </div>
              <textarea
                aria-label="Task details"
                ref={briefRef}
                onClick={expandTaskDetails}
                onFocus={expandTaskDetails}
                onChange={(event) => setDraft((current) => ({ ...current, brief: event.target.value }))}
                rows={detailsExpanded ? 7 : 2}
                value={draft.brief}
              />
              {detailsExpanded ? <p className="task-intake-details-help">Use this space like the staff instruction note. These details help the system generate better subtasks, checklist items, ownership, and follow-up context.</p> : null}
            </div>
            <label><span>Workflow area *</span><select ref={workflowAreaRef} onChange={(event) => setDraft((current) => ({ ...current, workflowArea: event.target.value }))} value={draft.workflowArea}><option value="INVENTORY">Inventory</option><option value="SHOP">Service / Recon</option><option value="SERVICE_ADVISOR">Service Advisor</option><option value="SALES">Sales</option><option value="MARKETING">Marketing</option><option value="ADVERTISING">Advertising</option><option value="ADMIN">Admin / Documentation</option><option value="COLLECTIONS">Collections</option><option value="GENERAL_MANAGER">Management</option></select></label>
            <label><span>Priority *</span><select onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value as IntakeDraft["priority"], requiresManagerApproval: event.target.value === "CRITICAL" ? true : current.requiresManagerApproval }))} value={draft.priority}><option value="LOW">Low</option><option value="MEDIUM">Normal</option><option value="HIGH">High</option><option disabled={!canAssignOthers} value="CRITICAL">Critical</option></select></label>
            <label><span>Accountable owner *</span><select ref={assignedUserRef} disabled={!canAssignOthers} onChange={(event) => setDraft((current) => ({ ...current, assignedUserId: event.target.value, collaboratorRequests: current.collaboratorRequests.filter((request) => request.userId !== event.target.value) }))} value={draft.assignedUserId}><option value="">Choose task owner</option>{collaboratorOptions.map((option) => <option key={option.id} value={option.id}>{option.name} · {option.role}</option>)}</select></label>
            <label className="task-intake-approval"><span>Manager control</span><span><input checked={draft.requiresManagerApproval} disabled={!canAssignOthers} onChange={(event) => setDraft((current) => ({ ...current, requiresManagerApproval: event.target.checked }))} type="checkbox" />Require approval before completion</span></label>
            <label><span>Due date *</span><input ref={dueDateRef} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} type="date" value={draft.dueDate} /></label>
            <label><span>Due time *</span><input ref={dueTimeRef} onChange={(event) => setDraft((current) => ({ ...current, dueTime: event.target.value }))} type="time" value={draft.dueTime} /></label>
            <label><span>Intake channel</span><select onChange={(event) => setDraft((current) => ({ ...current, channel: event.target.value }))} value={draft.channel}><option>Internal observation</option><option>Phone</option><option>Text / message</option><option>Email</option><option>Walk-in</option><option>Inspection</option><option>Vendor update</option></select></label>
            {needsCustomerContext ? <label><span>Customer / concern</span><input ref={contextRef} onChange={(event) => setDraft((current) => ({ ...current, customerReference: event.target.value }))} placeholder="Customer name, case, or concern" value={draft.customerReference} /></label> : null}
            {needsVehicleContext ? <label><span>Vehicle / stock</span><input ref={needsCustomerContext ? undefined : contextRef} onChange={(event) => setDraft((current) => ({ ...current, vehicleReference: event.target.value }))} placeholder="Vehicle, VIN, or stock number" value={draft.vehicleReference} /></label> : null}
            <div className="task-intake-collaborators task-intake-span-2">
              <span>Collaborators</span>
              <p>Add staff who should contribute, receive updates, and retain visibility without becoming the owner.</p>
              <div className="task-intake-collaborator-picker">
                <select aria-label="Choose collaborator" onChange={(event) => setCollaboratorCandidate(event.target.value)} value={collaboratorCandidate}>
                  <option value="">Choose a staff member</option>
                  {collaboratorOptions.filter((option) => option.id !== draft.assignedUserId && !draft.collaboratorRequests.some((request) => request.userId === option.id)).map((option) => <option key={option.id} value={option.id}>{option.name} · {option.role}</option>)}
                </select>
                <textarea aria-label="Collaboration scope" onChange={(event) => setCollaboratorScope(event.target.value)} placeholder="What are you asking this person to help with?" rows={2} value={collaboratorScope} />
                <input aria-label="Capacity requested" onChange={(event) => setCollaboratorCapacity(event.target.value)} placeholder="Capacity or timing requested, optional" value={collaboratorCapacity} />
                <button disabled={!collaboratorCandidate || !collaboratorScope.trim()} onClick={addCollaborator} type="button"><CirclePlus size={14} />Add collaborator</button>
              </div>
              <div className="task-intake-collaborator-list">
                {draft.collaboratorRequests.length ? draft.collaboratorRequests.map((request) => {
                  const collaborator = collaboratorOptions.find((option) => option.id === request.userId)!;
                  return <div key={request.userId}><span>{collaborator.initials}</span><p><strong>{collaborator.name}</strong><small>{request.collaborationScope}</small>{request.capacityRequested ? <small>Capacity: {request.capacityRequested}</small> : null}</p><button aria-label={`Remove ${collaborator.name}`} onClick={() => removeCollaborator(request.userId)} type="button">×</button></div>;
                }) : <em>No collaborators added. The task will begin with owner-only visibility.</em>}
              </div>
            </div>
            <label className="task-intake-span-2"><span>Expected outcome *</span><textarea ref={expectedOutcomeRef} onChange={(event) => setDraft((current) => ({ ...current, expectedOutcome: event.target.value }))} placeholder="What must be true when this work is finished?" rows={3} value={draft.expectedOutcome} /></label>
          </div>

          <fieldset className="task-intake-required-updates"><legend>Required updates</legend><p>The owner must submit these before completion.</p><div>{updateOptions.map((option) => <label key={option}><input checked={draft.requiredUpdates.includes(option)} onChange={() => toggleRequiredUpdate(option)} type="checkbox" /><span>{option}</span></label>)}</div></fieldset>

          <footer className="task-intake-form-footer">
            <div className={submitError ? "task-intake-message error" : "task-intake-message"}><Save size={14} /><span>{submitError || draftMessage || "Draft recovery is available on this device."}</span></div>
            <button onClick={saveDraft} type="button">Save Draft</button>
            <button aria-label="Create Task" className="primary" disabled={isSubmitting} onClick={createTask} type="button">{isSubmitting ? "Creating task…" : readiness.score === 100 ? "Create Task" : `Review & Create · ${readiness.score}%`}</button>
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
            <p>{draft.brief || "Task details will appear here."}</p>
            <div><span>{draft.workflowArea.replaceAll("_", " ")}</span><span>Not Started</span></div>
          </section>

          <section className="task-intake-inspector-preview">
            <div><p>Ownership policy</p><strong>{policy}</strong><span>Previewed from workflow, priority, and intake type.</span></div>
            <div><p>Expected outcome</p><strong>{draft.expectedOutcome || "Define the expected outcome."}</strong></div>
            <div><p>Required update</p><ul>{draft.requiredUpdates.map((update) => <li key={update}>{update}</li>)}</ul></div>
            <div><p>Collaborators ({draft.collaboratorRequests.length})</p>{draft.collaboratorRequests.length ? <ul>{draft.collaboratorRequests.map((request) => <li key={request.userId}>{collaboratorOptions.find((option) => option.id === request.userId)?.name}: {request.collaborationScope}</li>)}</ul> : <span>Owner-only until collaborators are added.</span>}</div>
          </section>

          <section className="task-intake-checks">
            <p>Creation gate</p>
            {readiness.checks.map((check) => (
              <button className={check.ready ? "ready" : "missing"} disabled={check.ready || check.label === "Required updates"} key={check.label} onClick={() => focusReadinessField(check.label)} type="button">
                {check.ready ? <Check size={13} /> : <AlertTriangle size={13} />}
                <span>{check.label}</span>
                <small>{check.ready ? "Ready" : "Fix"}</small>
              </button>
            ))}
          </section>

          <div className="task-intake-prototype-note"><Gauge size={15} /><span>Creation is permission checked. The task, adaptive checklist, collaborators, priority, and intake instructions are saved together.</span></div>
        </aside>
      </div>

      {categoryDrawerOpen ? (
        <div className="task-intake-category-shell" role="presentation">
          <button aria-label="Close category drawer" className="task-intake-category-backdrop" onClick={() => setCategoryDrawerOpen(false)} type="button" />
          <aside aria-label="Dealership task categories" className="task-intake-category-drawer">
            <header>
              <div>
                <p>Task category</p>
                <h2>Choose the dealership work pattern</h2>
                <span>Fields, workflow, owner policy, and default outcome adapt from the category.</span>
              </div>
              <button aria-label="Close category drawer" onClick={() => setCategoryDrawerOpen(false)} type="button">×</button>
            </header>
            <div className="task-intake-category-search">
              <input aria-label="Search task categories" onChange={(event) => setCategorySearch(event.target.value)} placeholder="Search categories, workflow, or evidence..." value={categorySearch} />
            </div>
            <section className="task-intake-category-impact">
              <p>Current selection</p>
              <strong>{draft.intakeType}</strong>
              <span>{selectedType.workflow.replaceAll("_", " ")} · {categoryEvidenceFor(selectedType)}</span>
            </section>
            <div className="task-intake-category-list">
              {!categorySearch.trim() && (recentCategoryOptions.length || recommendedCategoryOptions.length) ? (
                <section>
                  <h3>{recentCategoryOptions.length ? "Recent" : "Recommended"}</h3>
                  <div>
                    {[...recentCategoryOptions, ...recommendedCategoryOptions].slice(0, 6).map((option) => {
                      const Icon = option.icon;
                      const disabled = !canAssignOthers && option.label === "Manager Decision";
                      return (
                        <button
                          className={draft.intakeType === option.label ? "active" : undefined}
                          disabled={disabled}
                          key={option.label}
                          onClick={() => selectType(option.label)}
                          type="button"
                        >
                          <Icon size={16} />
                          <span>
                            <strong>{option.label}</strong>
                            <small>{option.workflow.replaceAll("_", " ")}</small>
                          </span>
                          {draft.intakeType === option.label ? <Check size={15} /> : <ChevronRight size={14} />}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}
              {filteredCategoryGroups.map(({ group, options }) => (
                <section key={group}>
                  <h3>{group}</h3>
                  <div>
                    {options.map((option) => {
                      const Icon = option.icon;
                      const disabled = !canAssignOthers && option.label === "Manager Decision";
                      return (
                        <button
                          className={draft.intakeType === option.label ? "active" : undefined}
                          disabled={disabled}
                          key={option.label}
                          onClick={() => selectType(option.label)}
                          type="button"
                        >
                          <Icon size={16} />
                          <span>
                            <strong>{option.label}</strong>
                            <small>{option.workflow.replaceAll("_", " ")}</small>
                          </span>
                          {draft.intakeType === option.label ? <Check size={15} /> : <ChevronRight size={14} />}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
