"use client";

import { ArrowLeft, ArrowRight, Check, MapPin, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import type { VehicleExecutionWorkbenchProjection } from "@/server/inventory-execution/workbench-service";
import { VehicleWorkflowSwitch } from "@/features/prototype/repair-workflow/vehicle-workflow-switch";

import baseStyles from "./inventory-planning-review.module.css";
import locationStyles from "./inventory-location-editor.module.css";

const styles: Record<string, string> = {
  ...(baseStyles as Record<string, string>),
  ...(locationStyles as Record<string, string>),
  actionHelp: "inventory-planning-action-help",
  checkbox: "inventory-planning-checkbox",
  checklistCard: "inventory-planning-checklist-card",
  checklistGroup: "inventory-planning-checklist-group",
  checklistRow: "inventory-planning-checklist-row",
  checklistRowComplete: "inventory-planning-checklist-row-complete",
  checklistRowConcern: "inventory-planning-checklist-row-concern",
  checklistRowDeferred: "inventory-planning-checklist-row-deferred",
  checklistRowPending: "inventory-planning-checklist-row-pending",
  checklistRowFields: "inventory-planning-checklist-row-fields",
  checklistRowHeader: "inventory-planning-checklist-row-header",
  checklistRowOutcome: "inventory-planning-checklist-row-outcome",
  checklistSummary: "inventory-planning-checklist-summary",
  checkDetails: "inventory-planning-check-details",
  dangerButton: "inventory-planning-danger-button",
  emptyAction: "inventory-planning-empty-action",
  currentTask: "inventory-planning-current-task",
  followUpChecklist: "inventory-planning-follow-up-checklist",
  followUpComplete: "inventory-planning-follow-up-complete",
  followUpNeedsAttention: "inventory-planning-follow-up-needs-attention",
  guidedChecklist: "inventory-planning-guided-checklist",
  guidedTask: "inventory-planning-guided-task",
  inlineActions: "inventory-planning-inline-actions",
  missingList: "inventory-planning-missing-list",
  stageFields: "inventory-planning-stage-fields",
  stageForm: "inventory-planning-stage-form",
  taskActions: "inventory-planning-task-actions",
  taskBadge: "inventory-planning-task-badge",
  taskRequirements: "inventory-planning-task-requirements",
  resultHelp: "inventory-planning-result-help"
};

type View = "RECEIVING" | "LIFECYCLE";
type CheckState = "PASS" | "CONCERN" | "DEFERRED" | "NOT_APPLICABLE" | "PENDING";
type CheckItem = { id: string; label: string; instruction: string; evidence: string; evidenceRequirement: string; completionCriteria: string; requiresEvidence?: boolean; requiresNotes?: boolean; state: CheckState; notes?: string; evidenceObjectIds?: string[] };
type CheckGroup = { id: string; label: string; items: CheckItem[] };
type FrontlineWorkflow = {
  id: string; version: number; stage: string; operatingState: string; nextAction: string; targetAt: string;
  ownerUser: { id: string; name: string }; location: { id: string; name: string };
  inventoryUnit: { id: string; inventoryNumber: string; vehicle: { id: string; vehicleNumber: string; year: number | null; make: string | null; model: string | null } };
  repairOrder: { id: string; repairOrderNumber: string } | null;
  acquisitionSnapshot?: unknown; transportSnapshot?: unknown; receiptSnapshot?: unknown; inspectionSnapshot?: unknown; reconSnapshot?: unknown; executionSnapshot?: unknown; qualitySnapshot?: unknown; titleSnapshot?: unknown; merchandisingSnapshot?: unknown; releaseSnapshot?: unknown; postReleaseSnapshot?: unknown; exceptionSnapshot?: unknown;
};
type FrontlineUser = { id: string; name: string };
const noFrontlineUsers: FrontlineUser[] = [];
type RegistryLocation = { id: string; code: string; name: string };
type EligibleUnit = { id: string; inventoryNumber: string; locationId: string; vehicle: { id: string; vehicleNumber: string; year: number | null; make: string | null; model: string | null } };
type ReconProgressUpdate = { id: string; actorName: string; blocker: string | null; completedWork: string; createdAt: string; nextAction: string; remainingWork: string | null; status: string };

const initialChecklist: CheckGroup[] = [
  { id: "identity", label: "Identity & custody", items: [
    { id: "vin", label: "Verify canonical vehicle identity", instruction: "Scan or compare the VIN at the vehicle, confirm the decoded identity, review duplicates, and verify the stock relationship before accepting custody.", evidence: "Open identity record", evidenceRequirement: "Canonical VIN validation and duplicate review", completionCriteria: "VIN and vehicle agree; decoded identity and stock relationship are confirmed.", state: "PASS" },
    { id: "arrival", label: "Receive the vehicle and establish custody", instruction: "Confirm odometer, keys, documents, fuel or charge, and who released the vehicle. Note any damage.", evidence: "Add arrival evidence", evidenceRequirement: "Arrival facts now; photos or supporting evidence may be deferred with a reason", completionCriteria: "Arrival facts are complete and custody can be accepted, a concern is documented, or evidence is assigned for follow-up.", requiresEvidence: true, requiresNotes: true, state: "PENDING" }
  ] },
  { id: "condition", label: "Condition evidence", items: [
    { id: "photos", label: "Capture or defer the receiving photo set", instruction: "Capture VIN, odometer, dash, four corners, interior, engine bay, cargo area, and visible exceptions. Defer with a note if offsite.", evidence: "Capture / upload photos", evidenceRequirement: "Governed receiving photo set or documented deferred photo follow-up", completionCriteria: "Required views are readable, or the missing photos are clearly assigned for onsite follow-up.", requiresEvidence: true, requiresNotes: true, state: "PENDING" },
    { id: "condition", label: "Document physical condition and equipment", instruction: "Inspect body, paint, glass, wheels, cabin, leaks, odors, missing equipment, accessories, and transport or auction damage.", evidence: "Record condition findings", evidenceRequirement: "Finding notes and applicable photos", completionCriteria: "All condition areas are reviewed and exceptions are described for recon planning.", requiresNotes: true, state: "PENDING" }
  ] },
  { id: "safety", label: "Safety & technical", items: [
    { id: "safety", label: "Complete the initial safety inspection", instruction: "Inspect tires, brakes, steering, restraints, lights, battery, fluid hazards, leaks, and any condition that could make movement or road testing unsafe.", evidence: "Perform safety inspection", evidenceRequirement: "Measurements, findings, and applicable evidence", completionCriteria: "Safe-to-move hazards are identified and every critical concern is routed to hold or recon.", requiresNotes: true, state: "PENDING" },
    { id: "scan", label: "Decide whether diagnostic baseline applies", instruction: "Record warning lights and attach a scan only when the current work actually needs diagnosis. For bodywork, cosmetic repair, or known recon work, mark this N/A or deferred and state why diagnosis is not blocking repair.", evidence: "Attach scan if needed", evidenceRequirement: "Scan report, documented N/A reason, or deferred diagnostic follow-up", completionCriteria: "The team knows whether diagnosis is needed now, later, or not for the current repair route.", requiresNotes: true, state: "PENDING" },
    { id: "nhtsa", label: "Review recalls and safety intelligence", instruction: "Review NHTSA model-level campaigns, perform VIN-specific verification when indicated, and distinguish recalls from service bulletins or complaint patterns.", evidence: "Review NHTSA source", evidenceRequirement: "Verification source and staff-recorded outcome", completionCriteria: "Potential campaigns remain labeled verify-by-VIN and any relevant safety issue is routed into recon.", requiresNotes: true, state: "PENDING" }
  ] },
  { id: "disposition", label: "Disposition", items: [
    { id: "move", label: "Decide disposition and assign the next owner", instruction: "Set safe-to-move status, any safety or title hold, recon priority, accountable owner, target time, and the first action the receiving team expects next.", evidence: "Assign disposition", evidenceRequirement: "Disposition decision with owner and target", completionCriteria: "The vehicle has an accountable route into recon or a controlled hold with a clear recovery action.", requiresNotes: true, state: "PENDING" }
  ] }
];

const stages = ["Transport", "Receipt", "Inspection", "Recon", "Shop & Parts", "Final QC", "Title", "Merch", "Release", "Verify"];
const stageReview = [
  ["Acquisition and ownership", "Verify the acquisition record and the linked inventory unit. Assign an owner before starting the lifecycle."],
  ["Transport and delivery", "Choose how the vehicle will move or record that transport is not needed. For transport, record the expected arrival, cost, carrier or reference, and release evidence. Confirm actual delivery separately."],
  ["Receiving and custody", "Match vehicle identity and record arrival, physical location, keys, and visible condition."],
  ["Initial inspection and triage", "Record safety findings, movement restrictions, evidence, and the next owner or destination."],
  ["Recon approval", "Link the correct inventory repair order and review the repair scope, supporting evidence, and spending authority."],
  ["Repair and parts execution", "Use the linked repair order to track work and parts. Verify jobs and parts dependencies are complete before advancing."],
  ["Independent quality and safety check", "An independent reviewer records quality, safety, legal checks, and the applicable road-test result. A failed check routes to rework."],
  ["Title and documents", "Review required documents and evidence. Record a hold and follow-up when a requirement is unresolved."],
  ["Merchandising and pricing", "Verify the vehicle facts, approved price, description, photos, and listing status."],
  ["Independent frontline release", "An independent reviewer confirms the current package and all required acquisition, receipt, repair, safety, title, and listing checks before release."],
  ["Post-release availability", "Check physical availability, the internal inventory record, and the digital listing. Record any mismatch for correction."],
] as const;
const stageIndex: Record<string, number> = { TRANSPORT_PLANNING: 0, IN_TRANSIT: 0, RECEIPT_AND_CUSTODY: 1, INSPECTION_AND_TRIAGE: 2, RECON_PLAN_AND_APPROVAL: 3, PARTS_AND_REPAIR_EXECUTION: 4, QUALITY_AND_SAFETY_VERIFICATION: 5, TITLE_DOCUMENT_READINESS: 6, MERCHANDISING_AND_PRICING: 7, FRONTLINE_RELEASE_REVIEW: 8, FRONTLINE_READY: 9, POST_RELEASE_VERIFICATION: 9 };

function object(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown, fallback = "Not recorded") { return typeof value === "string" && value.trim() ? value.trim() : fallback; }
function identityPart(value: unknown) { return typeof value === "number" ? String(value) : text(value, ""); }
function label(value: unknown) { return text(value).replaceAll("_", " ").toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()); }
function mergeChecklistDraft(savedGroups: CheckGroup[]) {
  const savedItems = new Map(savedGroups.flatMap(group => group.items).map(item => [item.id, item]));
  return initialChecklist.map(group => ({
    ...group,
    items: group.items.map(item => {
      const saved = savedItems.get(item.id);
      return saved ? {
        ...item,
        state: saved.state ?? item.state,
        notes: saved.notes,
        evidenceObjectIds: saved.evidenceObjectIds
      } : { ...item };
    })
  }));
}
function checklistWithSavedReceipt(groups: CheckGroup[], receiptSnapshot: unknown): CheckGroup[] {
  const receipt = object(receiptSnapshot);
  if (receipt.custodyAccepted !== true || receipt.identityMatch !== true) return groups;
  return groups.map(group => group.id === "identity" ? {
    ...group,
    items: group.items.map(item => item.id === "arrival" ? {
      ...item, state: "PASS", notes: text(receipt.conditionSummary, item.notes ?? ""),
      evidenceObjectIds: Array.isArray(receipt.evidenceObjectIds) ? receipt.evidenceObjectIds.filter((id): id is string => typeof id === "string") : [],
    } : { ...item, state: "PASS" }),
  } : group);
}
function taskMissingRequirements(item: CheckItem, evidenceIds: string[], context?: { keyCount?: string; mileage?: string }) {
  if (item.state === "PENDING" || item.state === "NOT_APPLICABLE") return [];
  const missing: string[] = [];
  if (item.state === "DEFERRED") {
    if (!item.notes?.trim()) missing.push("deferred reason");
  } else {
    if (item.requiresNotes && !item.notes?.trim()) missing.push(item.id === "arrival" ? "arrival details" : "task notes");
    if (item.requiresEvidence && !evidenceIds.length && !item.evidenceObjectIds?.length) missing.push("evidence or a defer reason");
  }
  if (item.id === "arrival") {
    if (!context?.mileage?.trim()) missing.push("odometer");
    if (!context?.keyCount?.trim()) missing.push("key count");
  }
  return missing;
}

function joinRequirementList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function taskRequirementHelp(item: CheckItem, evidenceIds: string[], context?: { keyCount?: string; mileage?: string }) {
  const missing = taskMissingRequirements(item, evidenceIds, context);
  return missing.length ? `Still needed: ${joinRequirementList(missing)}.` : null;
}

function taskResponded(item: CheckItem) {
  return item.state !== "PENDING";
}

function unresolvedReceivingFollowUps(items: CheckItem[], evidenceIds: string[], context?: { keyCount?: string; mileage?: string }) {
  return items.filter(item => taskResponded(item) && !taskRequirementMet(item, evidenceIds, context)).map(item => ({
    id: item.id,
    label: item.label,
    missing: taskMissingRequirements(item, evidenceIds, context)
  }));
}

function unresolvedReceivingFollowUpSummary(items: CheckItem[], evidenceIds: string[], context?: { keyCount?: string; mileage?: string }) {
  const followUps = unresolvedReceivingFollowUps(items, evidenceIds, context);
  return followUps.length ? followUps.map(item => `${item.label}: ${joinRequirementList(item.missing)}`).join(" | ") : null;
}

function receivingAttentionChecklist(items: CheckItem[], evidenceIds: string[], context?: { keyCount?: string; mileage?: string }) {
  return items.map(item => ({
    id: item.id,
    label: item.label,
    complete: taskRequirementMet(item, evidenceIds, context),
    detail: taskRequirementMet(item, evidenceIds, context) ? "Complete" : `Needs attention: ${joinRequirementList(taskMissingRequirements(item, evidenceIds, context))}`
  }));
}

function taskRequirementMet(item: CheckItem, evidenceIds: string[], context?: { keyCount?: string; mileage?: string }) {
  if (item.state === "PENDING") return false;
  return taskMissingRequirements(item, evidenceIds, context).length === 0;
}
function taskNotesLabel(item: CheckItem) {
  if (item.state === "DEFERRED") return "Why can this not be completed right now, and who should follow up?";
  if (item.state === "CONCERN") return "What needs attention before or after recon?";
  if (item.id === "arrival") return "What was received, confirmed, or observed?";
  if (item.id === "photos") return "What was captured or confirmed in the photo set?";
  if (item.id === "scan") return "Why is diagnosis needed, not needed, or deferred?";
  return "What was checked, confirmed, or observed?";
}

function taskRowTone(item: CheckItem) {
  if (item.state === "PASS" || item.state === "NOT_APPLICABLE") return styles.checklistRowComplete;
  if (item.state === "DEFERRED") return styles.checklistRowDeferred;
  if (item.state === "CONCERN") return styles.checklistRowConcern;
  return styles.checklistRowPending;
}

function deferredEvidenceReason(items: CheckItem[]) {
  const deferred = items.filter(item => item.state === "DEFERRED");
  return deferred.length ? deferred.map(item => `${item.label}: ${item.notes?.trim() || "follow-up required"}`).join(" | ") : null;
}

function receivingSubmissionItems(items: CheckItem[], handoffNotes: string) {
  return items.map(item => item.id === "move" && !item.notes?.trim() && handoffNotes.trim() ? { ...item, notes: handoffNotes.trim() } : item);
}

export function InventoryPlanningReview({ eligibleUnit = null, initial, initialRepairOrderId = "", initialWorkflow = null, locations = [], users = noFrontlineUsers, focused = false, returnTo, shopHref, reconActions }: { eligibleUnit?: EligibleUnit | null; initial: VehicleExecutionWorkbenchProjection; initialRepairOrderId?: string; initialWorkflow?: FrontlineWorkflow | null; locations?: RegistryLocation[]; users?: FrontlineUser[]; focused?: boolean; returnTo?: string; shopHref?: string; reconActions?: { appointment?: string; appointments: { href: string; label: string }[]; order?: string; shop?: string; vendor?: string } }) {
  const identity = object(initial.identity), operation = object(initial.operation), location = object(operation.location), latestOdometer = object(operation.latestOdometer);
  const vehicleId = text(identity.id, text(identity.vehicleNumber, "vehicle"));
  const acquisitionHref = `/vehicles/acquisition-appraisal?vehicleId=${encodeURIComponent(vehicleId)}&returnTo=${encodeURIComponent(`/vehicles/${vehicleId}/inventory-planning`)}`;
  const draftKey = `inventory-receiving-review:${vehicleId}`;
  const [workflow, setWorkflow] = useState<FrontlineWorkflow | null>(initialWorkflow);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const stageDirty = useRef(false);
  const reconFocusRequested = useRef(false);
  const [view, setView] = useState<View>(() => initialWorkflow && !["RECEIPT_AND_CUSTODY", "INSPECTION_AND_TRIAGE"].includes(initialWorkflow.stage) ? "LIFECYCLE" : "RECEIVING");
  const savedReceipt = initialWorkflow?.receiptSnapshot;
  const [groups, setGroups] = useState<CheckGroup[]>(() => checklistWithSavedReceipt(initialChecklist, savedReceipt));
  const [notes, setNotes] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState(initialWorkflow?.ownerUser.id ?? users[0]?.id ?? "");
  const [keyCount, setKeyCount] = useState(() => String(object(savedReceipt).keyCount ?? 1));
  const [mileage, setMileage] = useState(() => String(object(savedReceipt).mileage ?? (typeof latestOdometer.reading === "number" ? latestOdometer.reading : "")));
  const [damageSummary, setDamageSummary] = useState(() => text(object(savedReceipt).damageSummary, ""));
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);
  const [canonicalLocation, setCanonicalLocation] = useState<RegistryLocation | null>(() => typeof location.id === "string" && typeof location.name === "string" ? { id: location.id, code: text(location.code, ""), name: location.name } : null);
  const [reconUpdates, setReconUpdates] = useState<ReconProgressUpdate[]>([]);
  const [reconStatus, setReconStatus] = useState("NEEDS_MECHANICAL_REPAIR");
  const [reconCompletedWork, setReconCompletedWork] = useState("");
  const [reconRemainingWork, setReconRemainingWork] = useState("");
  const [reconNextAction, setReconNextAction] = useState("");
  const [reconBlocker, setReconBlocker] = useState("");
  const items = useMemo(() => groups.flatMap(group => group.items), [groups]);
  const evidenceIds = useMemo(() => initial.evidence.items.map(item => { const link = object(item); return text(object(link.evidenceObject).id, text(link.id, "")); }).filter(Boolean), [initial.evidence.items]);
  const submissionItems = useMemo(() => receivingSubmissionItems(items, notes), [items, notes]);
  const completed = submissionItems.filter(item => taskRequirementMet(item, evidenceIds, { keyCount, mileage })).length;
  const vehicleName = [identity.year, identity.make, identity.model].map(identityPart).filter(Boolean).join(" ") || text(identity.vehicleNumber, "Vehicle");

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const saved = window.localStorage.getItem(draftKey);
      if (!saved) return;
      try {
        const draft = JSON.parse(saved) as { groups?: CheckGroup[]; notes?: string; mileage?: string; keyCount?: string; damageSummary?: string; ownerUserId?: string };
        if (draft.groups?.length) setGroups(checklistWithSavedReceipt(mergeChecklistDraft(draft.groups), savedReceipt));
        if (typeof draft.notes === "string") setNotes(draft.notes);
        const savedOwner = draft.ownerUserId;
        if (!initialWorkflow && savedOwner && users.some(user => user.id === savedOwner)) setOwnerUserId(savedOwner);
        if (!object(savedReceipt).custodyAccepted) {
          if (typeof draft.mileage === "string") setMileage(draft.mileage);
          if (typeof draft.keyCount === "string") setKeyCount(draft.keyCount);
          if (typeof draft.damageSummary === "string") setDamageSummary(draft.damageSummary);
        }
        setNotice("Saved receiving review draft restored from this browser.");
      } catch {
        window.localStorage.removeItem(draftKey);
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, [draftKey, initialWorkflow, savedReceipt, users]);

  useEffect(() => {
    let active = true;
    void request(`/api/vehicles/${encodeURIComponent(vehicleId)}/recon-updates`).then((body: { items?: ReconProgressUpdate[] }) => {
      if (active) setReconUpdates(body.items ?? []);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [vehicleId]);

  useEffect(() => {
    if (focused || new URLSearchParams(window.location.search).get("focus") !== "recon-update") return;
    const open = window.setTimeout(() => {
      reconFocusRequested.current = true;
      setView("RECEIVING");
      setNotice("Recon update opened.");
    }, 0);
    return () => window.clearTimeout(open);
  }, [focused]);

  useEffect(() => {
    if (view !== "RECEIVING" || !reconFocusRequested.current) return;
    const tool = document.getElementById("rapid-recon-update");
    if (!(tool instanceof HTMLDetailsElement)) return;
    reconFocusRequested.current = false;
    tool.open = true;
    tool.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [notice, view]);

  function updateCheck(id: string, state: CheckState) {
    if (focused) stageDirty.current = true;
    setGroups(current => current.map(group => ({ ...group, items: group.items.map(item => item.id === id ? { ...item, state } : item) })));
  }

  function updateCheckDetails(id: string, values: Partial<Pick<CheckItem, "notes" | "evidenceObjectIds">>) {
    setGroups(current => current.map(group => ({ ...group, items: group.items.map(item => item.id === id ? { ...item, ...values } : item) })));
  }

  function saveDraft() {
    window.localStorage.setItem(draftKey, JSON.stringify({ groups, notes, mileage, keyCount, damageSummary, ownerUserId }));
    setNotice("Review draft saved in this browser.");
  }

  function resetDraft() {
    window.localStorage.removeItem(draftKey);
    setGroups(checklistWithSavedReceipt(mergeChecklistDraft([]), savedReceipt));
    setMileage(String(object(savedReceipt).mileage ?? (typeof latestOdometer.reading === "number" ? latestOdometer.reading : "")));
    setKeyCount(String(object(savedReceipt).keyCount ?? 1));
    setDamageSummary(text(object(savedReceipt).damageSummary, ""));
    setOwnerUserId(workflow?.ownerUser.id ?? users[0]?.id ?? "");
    setActiveCheckId(null);
    setNotes("");
    setView("RECEIVING");
    setNotice("Browser draft cleared.");
  }

  async function request(url: string, init?: RequestInit) {
    const response = await fetch(url, init), body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Inventory lifecycle request failed.");
    return body;
  }

  async function refresh() {
    const model = await request(`/api/frontline-workflows?vehicleId=${encodeURIComponent(vehicleId)}`) as { items: FrontlineWorkflow[] };
    const next = model.items.find(item => item.inventoryUnit.vehicle.id === vehicleId) ?? null;
    setWorkflow(next);
    return next;
  }

  async function recordCurrentLocation(input: { custodianType: string; displayName: string; locationId: string | null; positionLabel: string; reason: string; sourceCode: string }) {
    const selected = input.locationId ? locations.find(candidate => candidate.id === input.locationId) : null;
    if (input.locationId && !selected) throw new Error("Select a valid dealership location.");
    const displayName = selected?.name ?? input.displayName.trim();
    if (!displayName) throw new Error("Enter the auction, repair facility, transport, or external location name.");
    setBusy(true); setNotice("");
    try {
      const current = await request(`/api/vehicles/${encodeURIComponent(vehicleId)}`) as { version?: number };
      await request(`/api/vehicles/${encodeURIComponent(vehicleId)}/commands`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "RECORD_CUSTODY",
          custodianType: input.custodianType,
          eventType: canonicalLocation ? "CORRECTION" : "CHECK_IN",
          expectedVersion: Number(current.version ?? identity.version ?? 0),
          idempotencyKey: crypto.randomUUID(),
          locationId: selected?.id ?? null,
          occurredAt: new Date().toISOString(),
          positionLabel: selected ? input.positionLabel || null : [displayName, input.positionLabel].filter(Boolean).join(" · "),
          reason: input.reason,
          sourceCode: input.sourceCode,
          sourceReference: "Inventory planning canonical facts"
        })
      });
      const recordedLocation = selected ?? { id: "", code: input.custodianType, name: displayName };
      setCanonicalLocation(recordedLocation);
      setNotice(workflow && workflow.location.id !== recordedLocation.id ? `Current custody verified at ${displayName}. The active lifecycle remains operationally assigned to ${workflow.location.name}; reassign that workflow separately if needed.` : `Location verified as ${displayName}. Source and reason saved to custody history.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Current location could not be updated.");
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function saveReconUpdate() {
    if (!reconCompletedWork.trim() || !reconNextAction.trim()) { setNotice("Completed work and next action are required for a recon update."); return; }
    setBusy(true); setNotice("");
    try {
      const update = await request(`/api/vehicles/${encodeURIComponent(vehicleId)}/recon-updates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blocker: reconBlocker, completedWork: reconCompletedWork, nextAction: reconNextAction, remainingWork: reconRemainingWork, status: reconStatus })
      }) as ReconProgressUpdate;
      setReconUpdates(current => [update, ...current].slice(0, 10));
      setNotice("Recon progress saved. The vehicle history now reflects what is done, what remains, and the next action.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Recon progress could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function startWorkflow() {
    if (!eligibleUnit || !ownerUserId) { setNotice("An eligible InventoryUnit and accountable owner are required."); return null; }
    setBusy(true); setNotice("");
    try {
      await request("/api/frontline-workflows", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: 0, idempotencyKey: crypto.randomUUID(), inventoryUnitId: eligibleUnit.id, ownerUserId, policyVersion: "INV-ITF-POLICY/1.0.0", reason: "Start governed vehicle-specific inventory lifecycle from approved intake.", targetAt: new Date(Date.now() + 10 * 86_400_000).toISOString() }) });
      const next = await refresh();
      stageDirty.current = false;
      if (next) setSelectedStage(null);
      setNotice(`Governed lifecycle started${next ? ` at ${label(next.stage)}` : ""}.`);
      return next;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Lifecycle could not be started.");
      return null;
    } finally { setBusy(false); }
  }

  async function act(action: string, values: Record<string, unknown>, success: string, activeWorkflow = workflow) {
    if (!activeWorkflow) { setNotice("Start the governed lifecycle before recording stage work."); return null; }
    setBusy(true); setNotice("");
    try {
      await request(`/api/frontline-workflows/${activeWorkflow.id}/commands`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, expectedVersion: activeWorkflow.version, idempotencyKey: crypto.randomUUID(), reason: `${success} from the vehicle-specific lifecycle workspace.`, ...values }) });
      const next = await refresh();
      stageDirty.current = false;
      if (next?.stage !== activeWorkflow.stage) setSelectedStage(null);
      setNotice(`${success}${next ? ` Next: ${next.nextAction}` : ""}`);
      return next;
    } catch (error) { setNotice(error instanceof Error ? error.message : "Lifecycle command failed."); return null; }
    finally { setBusy(false); }
  }

  async function advanceReceiving() {
    function openRequiredCheck(id: string) {
      setActiveCheckId(id);
      document.getElementById(`receiving-check-${id}`)?.focus();
    }
    let current = workflow;
    if (!current) {
      current = await startWorkflow();
      if (!current) return;
    }
    if (current.stage === "TRANSPORT_PLANNING") {
      const next = await act("PLAN_TRANSPORT", { carrierReference: null, costAuthorized: false, estimatedCostCents: 0, expectedAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(), method: "NO_TRANSPORT", releaseEvidenceReference: null, transportRequired: false }, "No-transport path recorded.", current);
      if (!next) return;
      current = next;
    }
    if (current.stage === "RECEIPT_AND_CUSTODY") {
      const arrivalTask = submissionItems.find(item => item.id === "arrival");
      if (!arrivalTask || !taskResponded(arrivalTask)) {
        openRequiredCheck("arrival");
        setNotice("Next step: open \"Receive the vehicle and establish custody\" and record the result for arrival and custody.");
        return;
      }
      const arrivalCoreMissing = taskMissingRequirements({ ...arrivalTask, requiresEvidence: false, requiresNotes: false }, evidenceIds, { keyCount, mileage });
      if (arrivalCoreMissing.length) {
        openRequiredCheck("arrival");
        setNotice(`Next step: open "Receive the vehicle and establish custody" and add ${joinRequirementList(arrivalCoreMissing)}.`);
        return;
      }
      const followUpSummary = unresolvedReceivingFollowUpSummary(submissionItems, evidenceIds, { keyCount, mileage });
      const deferredReason = deferredEvidenceReason(submissionItems) ?? followUpSummary;
      const conditionSummary = notes.trim() || arrivalTask.notes?.trim() || damageSummary.trim() || "Receiving baseline recorded.";
      const next = await act("RECORD_RECEIPT", { arrivedAt: new Date().toISOString(), conditionSummary, custodyAccepted: true, damageSummary: damageSummary || null, documentSummary: { source: "VEHICLE_SPECIFIC_RECEIVING" }, evidenceDeferredReason: deferredReason, evidenceObjectIds: evidenceIds, identityMatch: submissionItems.find(item => item.id === "vin")?.state === "PASS", keyCount: Number(keyCount), mileage: Number(mileage) }, deferredReason && !evidenceIds.length ? "Receipt and custody recorded with evidence follow-up." : "Receipt and custody recorded.", current);
      if (!next) return;
      current = next;
      if (followUpSummary) setNotice(`Receipt recorded. Unfinished receiving work was carried forward for follow-up: ${followUpSummary}.`);
      if (focused) return;
    }
    if (current.stage === "INSPECTION_AND_TRIAGE") {
      const unansweredWork = submissionItems.filter(item => !taskResponded(item));
      if (unansweredWork.length) {
        openRequiredCheck(unansweredWork[0].id);
        setNotice(`Next step: open "${unansweredWork[0].label}" and record a result so the receiving baseline can continue.`);
        return;
      }
      const followUpSummary = unresolvedReceivingFollowUpSummary(submissionItems, evidenceIds, { keyCount, mileage });
      const deferredReason = deferredEvidenceReason(submissionItems) ?? followUpSummary;
      const byId = Object.fromEntries(submissionItems.map(item => [item.id, item.state]));
      const next = await act("RECORD_INSPECTION", { checklistResults: submissionItems.map(item => ({ code: item.id.toUpperCase(), evidenceObjectIds: item.evidenceObjectIds ?? [], label: item.label, notes: item.notes ?? null, status: item.state })), diagnosticRequired: byId.scan === "CONCERN", evidenceDeferredReason: deferredReason, evidenceObjectIds: evidenceIds, findings: submissionItems.filter(item => item.state === "CONCERN").map(item => ({ code: item.id.toUpperCase(), description: item.notes?.trim() || item.label, disposition: "REVIEW_REQUIRED", evidenceObjectIds: item.evidenceObjectIds ?? [] })), identityConflict: byId.vin === "CONCERN", safetyCriticalFail: byId.safety === "CONCERN", templateCode: "TMS-RECEIVING-IQI", templateComplete: true, templateVersion: 1, titleConcern: false }, deferredReason && !evidenceIds.length ? "Receiving inspection recorded with evidence follow-up." : "Receiving inspection recorded and baseline locked.", current);
      if (next?.stage === "RECON_PLAN_AND_APPROVAL") setView("LIFECYCLE");
      if (next && followUpSummary) setNotice(`Receiving inspection recorded. Unfinished receiving work remains visible for follow-up: ${followUpSummary}.`);
      return;
    }
    if (current.stage === "HOLD") { await act("REOPEN_FOR_CORRECTION", {}, "Held workflow reopened for governed correction.", current); return; }
    setView("LIFECYCLE");
  }

  const receivingTool = <ReceivingReview receiptOnly={focused && workflow?.stage === "RECEIPT_AND_CUSTODY"} activeCheckId={activeCheckId} busy={busy} canonicalLocation={canonicalLocation} damageSummary={damageSummary} evidenceIds={evidenceIds} identity={identity} keyCount={keyCount} locations={locations} mileage={mileage} notes={notes} onRecordLocation={recordCurrentLocation} ownerUserId={ownerUserId} reconBlocker={reconBlocker} reconCompletedWork={reconCompletedWork} reconNextAction={reconNextAction} reconRemainingWork={reconRemainingWork} reconStatus={reconStatus} reconUpdates={reconUpdates} saveReconUpdate={saveReconUpdate} setActiveCheckId={setActiveCheckId} setDamageSummary={setDamageSummary} setKeyCount={setKeyCount} setMileage={setMileage} setNotes={setNotes} setOwnerUserId={setOwnerUserId} setReconBlocker={setReconBlocker} setReconCompletedWork={setReconCompletedWork} setReconNextAction={setReconNextAction} setReconRemainingWork={setReconRemainingWork} setReconStatus={setReconStatus} groups={groups} updateCheck={updateCheck} updateCheckDetails={updateCheckDetails} completed={completed} initial={initial} users={users} workflow={workflow} />;
  if (focused) {
    const inventoryStatus = initial.hasInventoryRecord === false ? "No linked inventory record"
      : initial.hasInventoryRecord === undefined ? "Inventory details are unavailable for your role"
      : !workflow && !eligibleUnit ? "Inventory record has no active lifecycle to continue" : null;
    const activeStage = !workflow || workflow.stage === "ACQUISITION_VALIDATION" ? -1 : stageIndex[workflow.stage] ?? stages.length;
    const stage = selectedStage ?? activeStage;
    const stageNames = ["Acquisition", ...stages, ...(activeStage === stages.length ? [label(workflow?.stage)] : [])];
    const receiving = workflow?.stage === "RECEIPT_AND_CUSTODY" || workflow?.stage === "INSPECTION_AND_TRIAGE";
    const snapshots = [workflow?.transportSnapshot, workflow?.receiptSnapshot, workflow?.inspectionSnapshot, workflow?.reconSnapshot,
      workflow?.executionSnapshot, workflow?.qualitySnapshot, workflow?.titleSnapshot, workflow?.merchandisingSnapshot, workflow?.releaseSnapshot, workflow?.postReleaseSnapshot];
    const savedSummary = object(stage === -1 ? workflow?.acquisitionSnapshot : snapshots[stage]);
    const summary = text(savedSummary.conditionSummary ?? savedSummary.summary ?? savedSummary.description, "")
      || (typeof savedSummary.method === "string" ? label(savedSummary.method) : "");
    const canLeave = () => !stageDirty.current || window.confirm("Leave this stage without saving the entered changes?");
    return <section className={baseStyles.focusedLifecycle} aria-label="Inventory Lifecycle" onClickCapture={event => {
      if ((event.target as HTMLElement).closest("a") && !canLeave()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }}>
      {returnTo && <Link href={returnTo}>← Return to Repair Workbench</Link>}
      <header className={baseStyles.focusedHeader}>
        <div><h1>Inventory Lifecycle</h1><strong>{vehicleName} · {workflow?.inventoryUnit.inventoryNumber ?? eligibleUnit?.inventoryNumber ?? vehicleId}</strong><p>VIN <strong>{text(identity.vin, "Not recorded")}</strong></p></div>
        <VehicleWorkflowSwitch active="inventory" shopHref={shopHref} />
      </header>
      <nav className={styles.stageStrip} aria-label="Inventory lifecycle stages">
        {stageNames.map((name, index) => {
          const option = index - 1;
          const complete = workflow && activeStage < stages.length && option < activeStage;
          return <button aria-current={option === activeStage && !inventoryStatus ? "step" : undefined} aria-controls="inventory-stage-tool" aria-expanded={option === stage}
            className={!inventoryStatus && option === activeStage ? styles.stageActive : complete ? styles.stageComplete : styles.stageFuture}
            key={name} type="button" disabled={busy} onClick={() => {
              if (option === stage || !canLeave()) return;
              stageDirty.current = false;
              setSelectedStage(option);
            }}>
            <b>{complete ? <Check size={14} /> : index + 1}</b><span>{name}</span>
            <small>{inventoryStatus ? "Preview" : option === activeStage ? "Current" : complete ? "Complete" : activeStage < stages.length && option > activeStage ? "Upcoming" : "Review"}</small>
          </button>;
        })}
      </nav>
      <p role="status" className={baseStyles.focusedNotice}>{inventoryStatus ?? notice}</p>
      <section className={baseStyles.focusedTool} id="inventory-stage-tool" aria-labelledby="inventory-stage-heading" onChangeCapture={() => { stageDirty.current = true; }}>
        <h2 id="inventory-stage-heading">{stageNames[stage + 1]}</h2>
        {stage === 0 && <p>Transport VIN <strong>{text(identity.vin, "Not recorded")}</strong></p>}
        {inventoryStatus || stage !== activeStage ? <>
          <p><strong>Stage review</strong> · Opening this stage does not move the vehicle.</p>
          {stageReview[stage + 1] && <><h3>{stageReview[stage + 1][0]}</h3><p>{stageReview[stage + 1][1]}</p></>}
          {summary ? <p>Saved record · {summary}</p> : Object.keys(savedSummary).length > 0 && <p>Saved evidence is on file for this stage.</p>}
          {inventoryStatus ? <p>{inventoryStatus}. {shopHref && <Link href={shopHref}>Continue in Shop &amp; Recon</Link>}</p>
            : <button className={styles.secondaryButton} onClick={() => setSelectedStage(activeStage)} type="button">Resume {stageNames[activeStage + 1]}</button>}
        </> : !workflow ? eligibleUnit ? <>
          <Field label="Lifecycle owner"><select value={ownerUserId} onChange={event => setOwnerUserId(event.target.value)}>
            <option value="">Select owner</option>{users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select></Field>
          <button className={styles.primaryButton} disabled={busy || !ownerUserId} onClick={() => void startWorkflow()} type="button">Start inventory lifecycle</button>
        </> : <Link className={styles.primaryButton} href={acquisitionHref}>Open acquisition</Link>
          : receiving ? <>
            {receivingTool}
            <div className={baseStyles.focusedActions}>
              <button className={styles.primaryButton} disabled={busy} onClick={() => void advanceReceiving()} type="button">{receivingActionLabel(workflow)}</button>
              <button className={styles.secondaryButton} onClick={() => { saveDraft(); stageDirty.current = false; }} type="button">Save local draft</button>
            </div>
          </> : <GovernedStageAction act={act} busy={busy} evidenceIds={evidenceIds} initial={initial}
            initialRepairOrderId={initialRepairOrderId} key={`${workflow.id}:${workflow.stage}`} users={users} workflow={workflow} />}
      </section>
    </section>;
  }

  return <section className={baseStyles.toolkit} aria-label={`Inventory planning for ${vehicleName}`}>
    <header className={baseStyles.toolkitHeader}>
      <div><Link href={`/vehicles/${encodeURIComponent(vehicleId)}/workbench`}><ArrowLeft size={14} /> Vehicle Workbench</Link>
        <h1>{vehicleName}</h1><p>{text(identity.vin, label(identity.vinState))} · Stock {text(identity.stockNumber, "not assigned")}</p></div>
      <div className={baseStyles.stageSummary}><span>Inventory lifecycle</span><strong>{workflow ? label(workflow.stage) : "Not started"}</strong>{workflow && <span>{workflow.ownerUser.name} · {label(workflow.operatingState)}</span>}</div>
    </header>
    {reconActions && (reconActions.appointment || reconActions.order || reconActions.shop || reconActions.vendor || reconActions.appointments.length > 0) && <section className={styles.parallelRecon} aria-labelledby="parallel-recon-title">
      <div>
        <h2 id="parallel-recon-title">Shop &amp; Recon</h2>
        <p>Plan known work or record shop or vendor arrival while receiving continues. Inventory checks and release requirements stay in place.</p>
      </div>
      {reconActions.appointments.length > 0 && <ul aria-label="Your recon appointments" className={styles.parallelReconAppointments}>
        {reconActions.appointments.map(appointment => <li key={appointment.href}><Link href={appointment.href} onClick={saveDraft}>{appointment.label}</Link></li>)}
      </ul>}
      <div className={styles.parallelReconActions}>
        {reconActions.appointment && <Link className={styles.primaryButton} href={reconActions.appointment} onClick={saveDraft}>Plan recon appointment</Link>}
        {reconActions.order && <Link className={styles.secondaryButton} href={reconActions.order} onClick={saveDraft}>Open repair order</Link>}
        {reconActions.shop && <Link className={styles.secondaryButton} href={reconActions.shop} onClick={saveDraft}>Open shop intake</Link>}
        {reconActions.vendor && <Link className={styles.secondaryButton} href={reconActions.vendor} onClick={saveDraft}>Route to outside vendor</Link>}
      </div>
    </section>}
    <nav className={baseStyles.toolNav} aria-label="Inventory planning views">
      <button aria-current={view === "RECEIVING" ? "page" : undefined} onClick={() => setView("RECEIVING")} type="button">Receiving &amp; Initial QC</button>
      <button aria-current={view === "LIFECYCLE" ? "page" : undefined} onClick={() => setView("LIFECYCLE")} type="button">Guided Lifecycle</button>
    </nav>
    {notice && <p className={baseStyles.toolNotice} role="status">{notice}</p>}
    {view === "RECEIVING" ? <>
      {receivingTool}
      <footer className={baseStyles.toolFooter}>
        <div className={baseStyles.draftActions}>
          <button className={styles.textButton} disabled={busy} onClick={saveDraft} type="button">Save browser draft</button>
          <button className={styles.textButton} disabled={busy} onClick={resetDraft} type="button"><RotateCcw size={14} /> Reset draft</button>
        </div>
        {!workflow && !eligibleUnit ? <><span>Complete acquisition to start the lifecycle.</span><Link className={styles.primaryButton} href={acquisitionHref}>Open acquisition <ArrowRight size={16} /></Link></> :
          <div className={baseStyles.submitActions}>
            {!workflow && <Field label="Lifecycle owner"><select disabled={busy} value={ownerUserId} onChange={event => setOwnerUserId(event.target.value)}>
              <option value="">Select owner</option>{users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select></Field>}
            <button className={styles.primaryButton} disabled={busy || (!workflow && !ownerUserId)} onClick={() => void advanceReceiving()} type="button">{busy ? "Saving…" : receivingActionLabel(workflow)} <ArrowRight size={16} /></button>
          </div>}
      </footer>
    </> : <LifecycleReview act={act} busy={busy} evidenceIds={evidenceIds} initial={initial} initialRepairOrderId={initialRepairOrderId}
      receivingChecklist={receivingAttentionChecklist(submissionItems, evidenceIds, { keyCount, mileage })} setView={setView} users={users} workflow={workflow} />}
  </section>;
}

function ReceivingReview({ activeCheckId, busy, canonicalLocation, completed, receiptOnly = false, damageSummary, evidenceIds, groups, identity, initial, keyCount, locations, mileage, notes, onRecordLocation, ownerUserId, reconBlocker, reconCompletedWork, reconNextAction, reconRemainingWork, reconStatus, reconUpdates, saveReconUpdate, setActiveCheckId, setDamageSummary, setKeyCount, setMileage, setNotes, setOwnerUserId, setReconBlocker, setReconCompletedWork, setReconNextAction, setReconRemainingWork, setReconStatus, updateCheck, updateCheckDetails, users, workflow }: { activeCheckId: string | null; busy: boolean; canonicalLocation: RegistryLocation | null; completed: number; receiptOnly?: boolean; damageSummary: string; evidenceIds: string[]; groups: CheckGroup[]; identity: Record<string, unknown>; initial: VehicleExecutionWorkbenchProjection; keyCount: string; locations: RegistryLocation[]; mileage: string; notes: string; onRecordLocation: (input: { custodianType: string; displayName: string; locationId: string | null; positionLabel: string; reason: string; sourceCode: string }) => Promise<void>; ownerUserId: string; reconBlocker: string; reconCompletedWork: string; reconNextAction: string; reconRemainingWork: string; reconStatus: string; reconUpdates: ReconProgressUpdate[]; saveReconUpdate: () => Promise<void>; setActiveCheckId: (value: string | null) => void; setDamageSummary: (value: string) => void; setKeyCount: (value: string) => void; setMileage: (value: string) => void; setNotes: (value: string) => void; setOwnerUserId: (value: string) => void; setReconBlocker: (value: string) => void; setReconCompletedWork: (value: string) => void; setReconNextAction: (value: string) => void; setReconRemainingWork: (value: string) => void; setReconStatus: (value: string) => void; updateCheck: (id: string, state: CheckState) => void; updateCheckDetails: (id: string, values: Partial<Pick<CheckItem, "notes" | "evidenceObjectIds">>) => void; users: FrontlineUser[]; workflow: FrontlineWorkflow | null }) {
  const [locationEditorOpen, setLocationEditorOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [conditionCorrection, setConditionCorrection] = useState(notes);
  const [needsCorrection, setNeedsCorrection] = useState(reconRemainingWork);
  const [nextActionCorrection, setNextActionCorrection] = useState(reconNextAction);
  const visibleGroups = receiptOnly ? groups.filter(group => group.id === "identity") : groups;
  const orderedTasks = visibleGroups.flatMap(group => group.items);
  const currentTask = orderedTasks.find(item => {
    const displayItem = receivingSubmissionItems([item], notes)[0];
    return displayItem.state === "PENDING" || !taskRequirementMet(displayItem, evidenceIds, { keyCount, mileage });
  });
  function chooseResult(item: CheckItem, state: CheckState) {
    updateCheck(item.id, state);
    const next = { ...receivingSubmissionItems([item], notes)[0], state };
    setActiveCheckId(state !== "NOT_APPLICABLE" && !taskRequirementMet(next, evidenceIds, { keyCount, mileage }) ? item.id : null);
  }
  function applyIntakeCorrection() {
    const condition = conditionCorrection.trim();
    const needs = needsCorrection.trim();
    const next = nextActionCorrection.trim();
    const summary = [
      condition ? `Current condition at intake: ${condition}` : "",
      damageSummary.trim() ? `Visible damage / exception: ${damageSummary.trim()}` : "",
      needs ? `Current needs: ${needs}` : "",
      next ? `Recommended next action: ${next}` : ""
    ].filter(Boolean).join("\n");
    if (summary) setNotes(summary);
    if (condition || damageSummary.trim()) {
      updateCheckDetails("arrival", { notes: [condition, damageSummary.trim() ? `Visible damage / exception: ${damageSummary.trim()}` : ""].filter(Boolean).join("\n") });
      updateCheck("arrival", needs ? "CONCERN" : "PASS");
      updateCheckDetails("condition", { notes: [condition, needs ? `Needs: ${needs}` : ""].filter(Boolean).join("\n") });
      updateCheck("condition", needs ? "CONCERN" : "PASS");
    }
    if (needs || next) {
      updateCheckDetails("move", { notes: [needs ? `Current needs: ${needs}` : "", next ? `Next action: ${next}` : ""].filter(Boolean).join("\n") });
      updateCheck("move", needs ? "CONCERN" : "PASS");
      setReconStatus(needs ? "NEEDS_MECHANICAL_REPAIR" : "READY_FOR_QC");
      setReconCompletedWork(condition || "Initial intake baseline corrected.");
      setReconRemainingWork(needs);
      setReconNextAction(next || "Continue receiving QC and route to recon.");
      setReconBlocker(needs ? "Corrected intake baseline identifies work still needed." : "");
    }
    setActiveCheckId("arrival");
    setCorrectionOpen(false);
  }
  return <div className={baseStyles.receivingBody}>
    <div className={styles.mainColumn}>
      <div className={baseStyles.custodyRow}><div><span>Current location</span><strong>{canonicalLocation?.name ?? "Not recorded"}</strong></div><button className={styles.secondaryButton} aria-expanded={locationEditorOpen} onClick={() => setLocationEditorOpen(open => !open)} type="button">{locationEditorOpen ? "Close location editor" : "Verify / edit location"}</button></div>
      {locationEditorOpen && <VehicleLocationEditor busy={busy} current={canonicalLocation} locations={locations} onCancel={() => setLocationEditorOpen(false)} onSave={async values => { await onRecordLocation(values); setLocationEditorOpen(false); }} />}

      <section className={styles.checklistCard}>
        <div className={baseStyles.checklistHeading}><h2>Receiving checklist</h2><span>{receiptOnly ? orderedTasks.filter(item => taskRequirementMet(receivingSubmissionItems([item], notes)[0], evidenceIds, { keyCount, mileage })).length : completed} of {orderedTasks.length} complete</span></div>
        {visibleGroups.map(group => <section className={styles.checklistGroup} key={group.id}><header><h3>{group.label}</h3><span>{group.items.filter(item => taskResponded(receivingSubmissionItems([item], notes)[0])).length}/{group.items.length} answered</span></header>{group.items.map(item => {
          const displayItem = receivingSubmissionItems([item], notes)[0];
          const requirementHelp = taskRequirementHelp(displayItem, evidenceIds, { keyCount, mileage });
          const expanded = activeCheckId === null ? currentTask?.id === item.id : activeCheckId === item.id;
          return <article className={`${styles.checklistRow} ${taskRowTone(displayItem)}`} key={item.id}>
            <div className={baseStyles.checkRow}>
              <button id={`receiving-check-${item.id}`} className={baseStyles.checkToggle} aria-controls={`receiving-fields-${item.id}`} aria-expanded={expanded} onClick={() => setActiveCheckId(expanded ? "" : item.id)} type="button">
                <span aria-hidden="true">{expanded ? "▾" : "▸"}</span> {item.label}
              </button>
              <select aria-label={`Result for ${item.label}`} className={baseStyles.resultSelect} value={displayItem.state} onChange={event => chooseResult(item, event.target.value as CheckState)}>
                <option value="PENDING">Choose result</option><option value="PASS">Complete</option><option value="DEFERRED">Unable now</option><option value="CONCERN">Needs attention</option>{item.id === "scan" && <option value="NOT_APPLICABLE">Not needed</option>}
              </select>
            </div>
            <div className={styles.checklistRowFields} hidden={!expanded} id={`receiving-fields-${item.id}`}>
              {expanded && <>
              <p className={baseStyles.taskInstruction}>{item.instruction}</p>
              {item.id === "arrival" ? <div className="inventory-planning-task-fields"><Field label="Odometer"><input min="0" onChange={event => setMileage(event.target.value)} type="number" value={mileage} /></Field><Field label="Keys / fobs"><input min="0" onChange={event => setKeyCount(event.target.value)} type="number" value={keyCount} /></Field><Field label="Visible damage"><input onChange={event => setDamageSummary(event.target.value)} placeholder="None observed, or describe" value={damageSummary} /></Field></div> : null}
              {item.id === "move" ? <div className="inventory-planning-task-fields"><Field label="Accountable owner"><select disabled={Boolean(workflow)} onChange={event => setOwnerUserId(event.target.value)} value={workflow?.ownerUser.id ?? ownerUserId}>{users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field><div><span>Workflow target</span><strong>{workflow ? new Date(workflow.targetAt).toLocaleString() : "Set when the governed lifecycle starts"}</strong></div></div> : null}
              {["vin", "nhtsa", "photos", "scan", "arrival"].includes(item.id) && <div className={styles.taskActions}><ChecklistAction initial={initial} item={item} /></div>}
              <label><span>{taskNotesLabel(displayItem)}</span><textarea rows={2} maxLength={1000} onChange={event => updateCheckDetails(item.id, { notes: event.target.value })} placeholder={displayItem.state === "DEFERRED" ? "Example: Photos cannot be taken until the vehicle reaches the lot. Onsite intake staff should add them." : displayItem.state === "CONCERN" ? "Describe the issue, risk, or exception that needs follow-up." : "Record what was checked, confirmed, or observed."} value={item.notes ?? ""} /></label>
              {item.requiresEvidence ? <div>{evidenceIds.length ? <fieldset><legend>Link existing governed evidence</legend>{evidenceIds.map(id => <label key={id}><input checked={(item.evidenceObjectIds ?? []).includes(id)} onChange={event => updateCheckDetails(item.id, { evidenceObjectIds: event.target.checked ? [...new Set([...(item.evidenceObjectIds ?? []), id])] : (item.evidenceObjectIds ?? []).filter(value => value !== id) })} type="checkbox" /> {id}</label>)}</fieldset> : <p>{displayItem.state === "DEFERRED" ? "Reason captured here will document why evidence is missing for now." : "No evidence yet? Choose Unable now and add a reason."}</p>}</div> : null}
              {requirementHelp ? <small className={styles.resultHelp}>{requirementHelp}</small> : null}
              </>}
            </div>
          </article>;
        })}</section>)}
      </section>

      <details className={baseStyles.receivingExtras}><summary>Handoff note <small>Optional</small></summary>
        <Field label="Handoff note"><textarea rows={2} maxLength={2000} onChange={event => setNotes(event.target.value)} value={notes} /></Field>
      </details>
      <details className={baseStyles.receivingExtras}><summary>Vehicle details &amp; intake correction</summary>
        <dl className={baseStyles.vehicleFacts}><Fact term="Vehicle record" value={text(identity.vehicleNumber)} /><Fact term="VIN" value={text(identity.vin, label(identity.vinState))} /><Fact term="Color" value={text(identity.color)} /><Fact term="Plate" value={text(identity.licensePlate)} /></dl>
        <Link href={withQuery(initial.links.vehicle360, { returnTo: `/vehicles/${text(identity.id, "")}/inventory-planning` })}>Open Vehicle 360</Link>
        <button className={styles.secondaryButton} aria-expanded={correctionOpen} onClick={() => setCorrectionOpen(value => !value)} type="button">{correctionOpen ? "Close correction" : "Correct intake info"}</button>
        {correctionOpen && <div className={styles.correctionFields}>
          <Field label="Current condition at intake"><textarea rows={2} maxLength={1200} onChange={event => setConditionCorrection(event.target.value)} value={conditionCorrection} /></Field>
          <Field label="Vehicle needs"><textarea rows={2} maxLength={1200} onChange={event => setNeedsCorrection(event.target.value)} value={needsCorrection} /></Field>
          <Field label="Recommended next action"><input maxLength={500} onChange={event => setNextActionCorrection(event.target.value)} value={nextActionCorrection} /></Field>
          <button className={styles.secondaryButton} onClick={applyIntakeCorrection} type="button">Apply to receiving draft</button>
        </div>}
      </details>
      <RapidReconUpdateCard busy={busy} blocker={reconBlocker} completedWork={reconCompletedWork} nextAction={reconNextAction} remainingWork={reconRemainingWork} save={saveReconUpdate} setBlocker={setReconBlocker} setCompletedWork={setReconCompletedWork} setNextAction={setReconNextAction} setRemainingWork={setReconRemainingWork} setStatus={setReconStatus} status={reconStatus} updates={reconUpdates} />
    </div>
  </div>;
}

function RapidReconUpdateCard({ blocker, busy, completedWork, nextAction, remainingWork, save, setBlocker, setCompletedWork, setNextAction, setRemainingWork, setStatus, status, updates }: { blocker: string; busy: boolean; completedWork: string; nextAction: string; remainingWork: string; save: () => Promise<void>; setBlocker: (value: string) => void; setCompletedWork: (value: string) => void; setNextAction: (value: string) => void; setRemainingWork: (value: string) => void; setStatus: (value: string) => void; status: string; updates: ReconProgressUpdate[] }) {
  const latest = updates[0];
  return <details className={baseStyles.receivingExtras} id="rapid-recon-update"><summary>Record recon update</summary>
    <div className="inventory-planning-task-fields">
      <Field label="Current status"><select onChange={event => setStatus(event.target.value)} value={status}><option value="BODYWORK_IN_PROGRESS">Bodywork in progress</option><option value="NEEDS_MECHANICAL_REPAIR">Needs mechanical repair</option><option value="READY_FOR_QC">Ready for QC</option><option value="READY_FOR_FRONTLINE">Ready for frontline review</option><option value="ON_HOLD">On hold</option></select></Field>
      <Field label="Completed so far"><textarea rows={2} maxLength={2000} onChange={event => setCompletedWork(event.target.value)} value={completedWork} /></Field>
      <Field label="Remaining work"><textarea rows={2} maxLength={2000} onChange={event => setRemainingWork(event.target.value)} value={remainingWork} /></Field>
      <Field label="Next action"><input maxLength={500} onChange={event => setNextAction(event.target.value)} value={nextAction} /></Field>
      <Field label="Blocker / note"><input maxLength={500} onChange={event => setBlocker(event.target.value)} value={blocker} /></Field>
    </div>
    <div className={styles.inlineActions}><button className={styles.primaryButton} disabled={busy || !completedWork.trim() || !nextAction.trim()} onClick={() => void save()} type="button">{busy ? "Saving..." : "Save recon update"}</button><Link className={styles.secondaryButton} href="/vehicles/recon-repair-advisor">Open Recon / Repair Advisor</Link></div>
    {latest ? <p className={styles.good}>Latest: {latest.status.replaceAll("_", " ").toLowerCase()} by {latest.actorName} — {latest.completedWork}{latest.remainingWork ? ` Remaining: ${latest.remainingWork}` : ""}</p> : <p className={styles.warning}>No saved recon update yet for this vehicle.</p>}
  </details>;
}

function LifecycleReview({ act, busy, evidenceIds, initial, initialRepairOrderId, receivingChecklist, setView, users, workflow }: { act: (action: string, values: Record<string, unknown>, success: string) => Promise<FrontlineWorkflow | null>; busy: boolean; evidenceIds: string[]; initial: VehicleExecutionWorkbenchProjection; initialRepairOrderId: string; receivingChecklist: Array<{ id: string; label: string; complete: boolean; detail: string }>; setView: (view: View) => void; users: FrontlineUser[]; workflow: FrontlineWorkflow | null }) {
  const active = workflow ? stageIndex[workflow.stage] : undefined;
  const followUps = receivingChecklist.filter(item => !item.complete);
  const receiving = !workflow || ["RECEIPT_AND_CUSTODY", "INSPECTION_AND_TRIAGE"].includes(workflow.stage);
  return <div className={baseStyles.receivingBody}>
    <ol className={baseStyles.stageProgress} aria-label="Inventory lifecycle stages">
      {stages.map((stage, index) => <li key={stage} aria-current={index === active ? "step" : undefined}>
        {active !== undefined && index < active ? <Check size={13} aria-label="Complete" /> : null}{stage}
      </li>)}
    </ol>
    <section className={baseStyles.stageTool}>
      <header><h2>{workflow?.nextAction ?? "Start with receiving"}</h2>{workflow && <span>Version {workflow.version}</span>}</header>
      {receiving ? <button className={styles.primaryButton} onClick={() => setView("RECEIVING")} type="button">{workflow ? "Open receiving checklist" : "Return to receiving"}</button>
        : <GovernedStageAction act={act} busy={busy} evidenceIds={evidenceIds} initial={initial} initialRepairOrderId={initialRepairOrderId} key={`${workflow.id}:${workflow.stage}`} users={users} workflow={workflow} />}
    </section>
    {workflow && !receiving && followUps.length > 0 && <details className={baseStyles.receivingExtras}>
      <summary>Receiving follow-up ({followUps.length})</summary>
      <ul>{followUps.map(item => <li key={item.id}>{item.label} — {item.detail}</li>)}</ul>
      <button className={styles.secondaryButton} onClick={() => setView("RECEIVING")} type="button">Review receiving checklist</button>
    </details>}
  </div>;
}

function GovernedStageAction({ act, busy, evidenceIds, initial, initialRepairOrderId, users, workflow }: { act: (action: string, values: Record<string, unknown>, success: string) => Promise<FrontlineWorkflow | null>; busy: boolean; evidenceIds: string[]; initial: VehicleExecutionWorkbenchProjection; initialRepairOrderId: string; users: FrontlineUser[]; workflow: FrontlineWorkflow }) {
  const [form, setForm] = useState(() => ({ amount: "150000", blockers: "", carrierReference: "", channel: "INTERNAL_MANUAL", channelReconciled: false, description: "Verified vehicle facts and retail presentation", desiredState: "PUBLISHED", digitalAvailable: true, deliveryEvidence: "", errorCode: "", expectedAt: localFuture(2), externalDependency: "", failedChecks: "QC", internalAvailable: true, listingChannels: "INTERNAL_MANUAL", method: "CARRIER", observedState: "FAILED", photoReferences: "", physicalAvailable: true, policyVersion: "TITLE/1.0.0", price: "1800000", repairOrderId: initialRepairOrderId || workflow.repairOrder?.id || text(object(initial.workOrders.items[0]).id, ""), retryAt: localFuture(1), reviewerUserId: users.find(user => user.id !== workflow.ownerUser.id)?.id ?? "", titleDueAt: localFuture(2), transportEvidence: "" }));
  const set = (key: keyof typeof form, value: string | boolean) => setForm(current => ({ ...current, [key]: value }));
  const submit = (event: FormEvent, action: string, values: Record<string, unknown>, success: string) => { event.preventDefault(); void act(action, values, success); };
  const evidence = evidenceIds;

  if (workflow.stage === "TRANSPORT_PLANNING") return <form className={styles.stageForm} onSubmit={event => submit(event, "PLAN_TRANSPORT", { carrierReference: form.carrierReference || null, costAuthorized: form.method === "NO_TRANSPORT" || Number(form.amount) >= 0, estimatedCostCents: Number(form.amount), expectedAt: new Date(form.expectedAt).toISOString(), method: form.method, releaseEvidenceReference: form.method === "NO_TRANSPORT" ? null : form.transportEvidence, transportRequired: form.method !== "NO_TRANSPORT" }, "Transport path approved.")}><h3>Plan transport or verify no-transport path</h3><div className={styles.stageFields}><Field label="Method"><select onChange={event => set("method", event.target.value)} value={String(form.method)}><option value="CARRIER">Carrier</option><option value="DEALER_DRIVER">Dealer driver</option><option value="TOW">Tow</option><option value="NO_TRANSPORT">No transport required</option></select></Field><Field label="Expected arrival"><input onChange={event => set("expectedAt", event.target.value)} type="datetime-local" value={String(form.expectedAt)} /></Field><Field label="Authorized cost (cents)"><input min="0" onChange={event => set("amount", event.target.value)} type="number" value={String(form.amount)} /></Field><Field label="Carrier / reference"><input onChange={event => set("carrierReference", event.target.value)} value={String(form.carrierReference)} /></Field><Field label="Release evidence reference"><input disabled={form.method === "NO_TRANSPORT"} onChange={event => set("transportEvidence", event.target.value)} required={form.method !== "NO_TRANSPORT"} value={String(form.transportEvidence)} /></Field></div><StageSubmit busy={busy}>Approve transport path</StageSubmit></form>;
  if (workflow.stage === "IN_TRANSIT") return <form className={styles.stageForm} onSubmit={event => submit(event, "RECORD_DELIVERY", { delivered: true, deliveryEvidenceReference: form.deliveryEvidence, observedAt: new Date().toISOString() }, "Observed delivery recorded.")}><h3>Confirm observed delivery</h3><Field label="Delivery evidence reference"><input onChange={event => set("deliveryEvidence", event.target.value)} required value={String(form.deliveryEvidence)} /></Field><StageSubmit busy={busy}>Record delivery</StageSubmit></form>;
  if (["RECEIPT_AND_CUSTODY", "INSPECTION_AND_TRIAGE"].includes(workflow.stage)) return <div className={styles.emptyAction}><p>Complete the current receiving gate in the detailed Receiving &amp; Initial QC form.</p></div>;
  if (workflow.stage === "RECON_PLAN_AND_APPROVAL") return <form className={styles.stageForm} onSubmit={event => submit(event, "APPROVE_RECON_PLAN", { approved: true, approvedAmountCents: Number(form.amount), evidenceObjectIds: evidence, planVersion: Number(object(workflow.reconSnapshot).planVersion ?? 0) + 1, repairOrderId: form.repairOrderId }, "Exact recon scope and amount approved.")}><h3>Approve the exact recon plan</h3><p>Create or select the authoritative inventory-recon Repair Order before approval. The amount is rechecked against the actor&apos;s authority.</p><div className={styles.stageFields}><Field label="Inventory-recon Repair Order ID"><input onChange={event => set("repairOrderId", event.target.value)} required value={String(form.repairOrderId)} /></Field><Field label="Approved amount (cents)"><input min="0" onChange={event => set("amount", event.target.value)} required type="number" value={String(form.amount)} /></Field></div><div className={styles.inlineActions}><Link className={styles.secondaryButton} href={`/vehicles/repair-orders?intakeSource=INVENTORY_RECON&vehicleId=${encodeURIComponent(workflow.inventoryUnit.vehicle.id)}&returnTo=${encodeURIComponent(`/vehicles/${workflow.inventoryUnit.vehicle.id}/inventory-planning`)}`}>Open Repair Order intake</Link><StageSubmit busy={busy}>Approve and release to Shop &amp; Parts</StageSubmit></div></form>;
  if (workflow.stage === "PARTS_AND_REPAIR_EXECUTION") { const returnTo = `/vehicles/${workflow.inventoryUnit.vehicle.id}/inventory-planning`; return <div className={styles.stageForm}><h3>Shop &amp; Parts execution</h3><p>The system will advance only when the linked Repair Order contains repair jobs and every job and Parts dependency is authoritatively complete.</p><div className={styles.inlineActions}><Link className={styles.secondaryButton} href={workflow.repairOrder ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(workflow.repairOrder.id)}&vehicleId=${encodeURIComponent(workflow.inventoryUnit.vehicle.id)}&returnTo=${encodeURIComponent(returnTo)}` : `/vehicles/repair-workbench?vehicleId=${encodeURIComponent(workflow.inventoryUnit.vehicle.id)}&returnTo=${encodeURIComponent(returnTo)}`}>Open Repair Workbench</Link><Link className={styles.secondaryButton} href={`/vehicles/parts-operations?vehicleId=${encodeURIComponent(workflow.inventoryUnit.vehicle.id)}${workflow.repairOrder ? `&repairOrderId=${encodeURIComponent(workflow.repairOrder.id)}` : ""}&returnTo=${encodeURIComponent(returnTo)}`}>Open Parts</Link><button className={styles.primaryButton} disabled={busy} onClick={() => void act("VERIFY_EXECUTION", {}, "Shop and Parts completion verified.")} type="button">Verify authoritative completion</button></div></div>; }
  if (workflow.stage === "QUALITY_AND_SAFETY_VERIFICATION") return <form className={styles.stageForm} onSubmit={event => submit(event, "VERIFY_QUALITY", { evidenceObjectIds: evidence, legalPass: true, qcPass: true, reviewerUserId: form.reviewerUserId, roadTestApplicable: true, roadTestPass: true, safetyPass: true }, "Independent Final Recon QC passed.")}><h3>Independent Final Recon QC</h3><p>The workflow owner cannot perform this verification. Every applicable critical check must pass; failures cannot be averaged away.</p><Reviewer users={users} value={String(form.reviewerUserId)} workflow={workflow} set={value => set("reviewerUserId", value)} /><div className={styles.inlineActions}><Link className={styles.secondaryButton} href={`/vehicles/quality-control?${new URLSearchParams({ repairOrderId: workflow.repairOrder?.id ?? "", returnTo: `/vehicles/${workflow.inventoryUnit.vehicle.id}/inventory-planning` })}`}>Open QC workspace</Link><StageSubmit busy={busy}>Pass all critical gates</StageSubmit><button className={styles.dangerButton} disabled={busy || !evidence.length} onClick={() => void act("RECORD_QUALITY_FAILURE", { evidenceObjectIds: evidence, failedChecks: String(form.failedChecks).split(",").map(value => value.trim()).filter(Boolean), reviewerUserId: form.reviewerUserId }, "QC failure recorded and rework required.")} type="button">Record failed QC</button></div></form>;
  if (workflow.stage === "TITLE_DOCUMENT_READINESS") return <div className={styles.stageForm}><form onSubmit={event => submit(event, "RECORD_TITLE_READY", { allRequirementsAccepted: true, evidenceObjectIds: evidence, externalDependencyClear: true, requirementPolicyVersion: form.policyVersion, reviewerUserId: form.reviewerUserId }, "Title and document readiness recorded.")}><h3>Title &amp; document readiness</h3><Reviewer users={users} value={String(form.reviewerUserId)} workflow={workflow} set={value => set("reviewerUserId", value)} /><Field label="Requirement policy"><input onChange={event => set("policyVersion", event.target.value)} required value={String(form.policyVersion)} /></Field><StageSubmit busy={busy} disabled={!evidence.length}>Record title ready</StageSubmit></form><section><h3>Cannot clear title requirements?</h3><div className={styles.stageFields}><Field label="Blockers (comma separated)"><input onChange={event => set("blockers", event.target.value)} value={String(form.blockers)} /></Field><Field label="External dependency"><input onChange={event => set("externalDependency", event.target.value)} value={String(form.externalDependency)} /></Field><Field label="Resolution due"><input onChange={event => set("titleDueAt", event.target.value)} type="datetime-local" value={String(form.titleDueAt)} /></Field></div><button className={styles.dangerButton} disabled={busy || !String(form.blockers).trim()} onClick={() => void act("RECORD_TITLE_HOLD", { blockers: String(form.blockers).split(",").map(value => value.trim()).filter(Boolean), dueAt: new Date(String(form.titleDueAt)).toISOString(), externalDependency: form.externalDependency || null, ownerUserId: workflow.ownerUser.id }, "Title/document hold recorded.")} type="button">Place governed title hold</button></section></div>;
  if (workflow.stage === "MERCHANDISING_AND_PRICING") return <div className={styles.stageForm}><form onSubmit={event => submit(event, "VERIFY_MERCHANDISING", { channelReconciled: form.channelReconciled, contentApproved: true, description: form.description, factsVerified: true, listingChannels: String(form.listingChannels).split(",").map(value => value.trim()).filter(Boolean), mediaApproved: true, photoReferences: String(form.photoReferences).split(",").map(value => value.trim()).filter(Boolean), priceApproved: true, priceApprovedByUserId: form.reviewerUserId, priceCents: Number(form.price) }, "Merchandising, pricing, and publication state verified.")}><h3>Merchandising &amp; pricing</h3><div className={styles.stageFields}><Field label="Approved description"><input onChange={event => set("description", event.target.value)} required value={String(form.description)} /></Field><Field label="Approved price (cents)"><input min="1" onChange={event => set("price", event.target.value)} required type="number" value={String(form.price)} /></Field><Field label="Five or more photo references"><input onChange={event => set("photoReferences", event.target.value)} placeholder="photo-1, photo-2, photo-3, photo-4, photo-5" required value={String(form.photoReferences)} /></Field><Field label="Listing channels"><input onChange={event => set("listingChannels", event.target.value)} value={String(form.listingChannels)} /></Field></div><label className={styles.checkbox}><input checked={Boolean(form.channelReconciled)} onChange={event => set("channelReconciled", event.target.checked)} type="checkbox" /> Desired and observed publication states are reconciled</label><Reviewer users={users} value={String(form.reviewerUserId)} workflow={workflow} set={value => set("reviewerUserId", value)} /><StageSubmit busy={busy}>Verify merchandising package</StageSubmit></form><section><h3>Publication did not reconcile?</h3><div className={styles.stageFields}><Field label="Channel"><input onChange={event => set("channel", event.target.value)} value={String(form.channel)} /></Field><Field label="Error code"><input onChange={event => set("errorCode", event.target.value)} value={String(form.errorCode)} /></Field><Field label="Observed state"><input onChange={event => set("observedState", event.target.value)} value={String(form.observedState)} /></Field><Field label="Retry at"><input onChange={event => set("retryAt", event.target.value)} type="datetime-local" value={String(form.retryAt)} /></Field></div><button className={styles.dangerButton} disabled={busy || !String(form.errorCode).trim()} onClick={() => void act("RECORD_PUBLICATION_EXCEPTION", { channel: form.channel, desiredState: form.desiredState, errorCode: form.errorCode, observedAt: new Date().toISOString(), observedState: form.observedState, retryAt: new Date(String(form.retryAt)).toISOString() }, "Publication exception recorded.")} type="button">Record publication exception</button></section></div>;
  if (workflow.stage === "FRONTLINE_RELEASE_REVIEW") return <div className={styles.stageForm}><h3>Independent frontline release</h3><p>The current signed-in staff member must not be the workflow owner. The server re-evaluates acquisition, receipt, inspection, execution, QC, title, merchandising, publication, and package-version gates.</p><button className={styles.primaryButton} disabled={busy} onClick={() => void act("AUTHORIZE_RELEASE", {}, "Independent frontline release authorized.")} type="button">Authorize exact package release</button></div>;
  if (["FRONTLINE_READY", "POST_RELEASE_VERIFICATION"].includes(workflow.stage)) return <div className={styles.stageForm}><h3>Post-release verification</h3><p>Verify physical, internal, and digital availability. Submit the observed state; any unchecked channel records a blocking mismatch for reconciliation.</p><label className={styles.checkbox}><input checked={Boolean(form.physicalAvailable)} onChange={event => set("physicalAvailable", event.target.checked)} type="checkbox" /> Vehicle is physically frontline available</label><label className={styles.checkbox}><input checked={Boolean(form.internalAvailable)} onChange={event => set("internalAvailable", event.target.checked)} type="checkbox" /> Internal inventory state is available</label><label className={styles.checkbox}><input checked={Boolean(form.digitalAvailable)} onChange={event => set("digitalAvailable", event.target.checked)} type="checkbox" /> Digital listing state is available</label><button className={styles.primaryButton} disabled={busy} onClick={() => void act("POST_RELEASE_VERIFY", { digitalAvailable: form.digitalAvailable, internalAvailable: form.internalAvailable, physicalAvailable: form.physicalAvailable }, form.digitalAvailable && form.internalAvailable && form.physicalAvailable ? "Post-release availability verified." : "Availability mismatch recorded and blocked for reconciliation.")} type="button">Record observed availability</button></div>;
  if (workflow.stage === "HOLD") return <div className={styles.stageForm}><h3>Controlled hold</h3><p>{workflow.nextAction}</p><button className={styles.primaryButton} disabled={busy} onClick={() => void act("REOPEN_FOR_CORRECTION", {}, "Workflow reopened at its responsible gate.")} type="button">Reopen for correction</button></div>;
  return <div className={styles.emptyAction}><p>This lifecycle state is terminal or routed to a governed disposition workspace.</p></div>;
}

function Field({ children, label: fieldLabel }: { children: ReactNode; label: string }) { return <label><span>{fieldLabel}</span>{children}</label>; }
function ChecklistAction({ initial, item }: { initial: VehicleExecutionWorkbenchProjection; item: CheckItem }) {
  const returnTo = `/vehicles/${text(object(initial.identity).id, "")}/inventory-planning`;
  if (item.id === "vin") return <Link href={withQuery(initial.links.vehicle360, { returnTo })}>{item.evidence}</Link>;
  if (item.id === "nhtsa") return <Link href={withQuery(initial.links.vehicle360, { section: "intelligence", intent: "recalls", returnTo })}>{item.evidence}</Link>;
  const category = item.id === "photos" ? "PHOTO" : item.id === "scan" ? "INSPECTION" : item.id === "arrival" ? "OTHER" : null;
  if (category) return <Link href={withQuery(initial.links.evidence, { category, returnTo })}>{item.evidence}</Link>;
  return null;
}
function withQuery(href: string, values: Record<string, string>) { const [path, query = ""] = href.split("?", 2), params = new URLSearchParams(query); for (const [key, value] of Object.entries(values)) params.set(key, value); const serialized = params.toString(); return serialized ? `${path}?${serialized}` : path; }
function Reviewer({ set, users, value, workflow }: { set: (value: string) => void; users: FrontlineUser[]; value: string; workflow: FrontlineWorkflow }) { return <Field label="Independent reviewer"><select onChange={event => set(event.target.value)} value={value}><option value="">Select reviewer</option>{users.filter(user => user.id !== workflow.ownerUser.id).map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field>; }
function StageSubmit({ busy, children, disabled = false }: { busy: boolean; children: ReactNode; disabled?: boolean }) { return <button className={styles.primaryButton} disabled={busy || disabled} type="submit">{busy ? "Recording…" : children}</button>; }
function localFuture(days: number) { const date = new Date(Date.now() + days * 86_400_000); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }
function receivingActionLabel(workflow: FrontlineWorkflow | null) { if (!workflow) return "Start governed lifecycle"; if (workflow.stage === "TRANSPORT_PLANNING") return "Confirm no transport & open receipt"; if (workflow.stage === "RECEIPT_AND_CUSTODY") return "Record receipt & custody"; if (workflow.stage === "INSPECTION_AND_TRIAGE") return "Complete inspection & lock baseline"; if (workflow.stage === "HOLD") return "Reopen responsible gate"; return "Continue guided lifecycle"; }

export function VehicleLocationEditor({ busy, current, locations, onCancel, onSave }: { busy: boolean; current: RegistryLocation | null; locations: RegistryLocation[]; onCancel: () => void; onSave: (values: { custodianType: string; displayName: string; locationId: string | null; positionLabel: string; reason: string; sourceCode: string }) => Promise<void> }) {
  const [locationKind, setLocationKind] = useState(current?.id ? "DEALERSHIP" : "EXTERNAL_REPAIR_FACILITY");
  const [locationId, setLocationId] = useState(current?.id ?? locations[0]?.id ?? "");
  const [externalName, setExternalName] = useState(current && !current.id ? current.name : "");
  const [positionLabel, setPositionLabel] = useState("");
  const [sourceCode, setSourceCode] = useState("PHYSICAL_VERIFICATION");
  const [reason, setReason] = useState(current ? "Verify or correct the vehicle's current physical location." : "Record the vehicle's current physical location during inventory receiving.");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try { await onSave({ custodianType: locationKind, displayName: locationKind === "DEALERSHIP" ? locations.find(location => location.id === locationId)?.name ?? "" : externalName, locationId: locationKind === "DEALERSHIP" ? locationId : null, positionLabel: positionLabel.trim(), reason: reason.trim(), sourceCode }); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Location could not be saved."); }
  }

  return <form aria-label="Edit current vehicle location" className={styles.locationEditor} onSubmit={submit}>
    <header><div><span><MapPin size={16} /></span><div><strong>Verify the vehicle&apos;s physical location</strong><small>This creates an attributable canonical custody event; it does not overwrite history.</small></div></div><button aria-label="Close location editor" disabled={busy} onClick={onCancel} type="button"><X size={16} /></button></header>
    <div className={styles.locationFields}>
      <label><span>Where is the vehicle?</span><select autoFocus onChange={event => setLocationKind(event.target.value)} value={locationKind}><option value="DEALERSHIP">At one of our dealerships</option><option value="AUCTION">At an auction</option><option value="EXTERNAL_REPAIR_FACILITY">At an outside repair facility</option><option value="IN_TRANSPORT">In transport</option><option value="OTHER_EXTERNAL">At another external location</option></select></label>
      {locationKind === "DEALERSHIP" ? <label><span>Dealership location</span><select onChange={event => setLocationId(event.target.value)} required value={locationId}><option value="">Choose a location</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}{location.code ? ` · ${location.code}` : ""}</option>)}</select></label> : <label><span>{locationKind === "EXTERNAL_REPAIR_FACILITY" ? "Repair facility name" : locationKind === "AUCTION" ? "Auction or site name" : locationKind === "IN_TRANSPORT" ? "Carrier / current route" : "External location name"}</span><input maxLength={200} onChange={event => setExternalName(event.target.value)} placeholder={locationKind === "EXTERNAL_REPAIR_FACILITY" ? "Example: Diego Auto Body" : "Enter the current site or custodian"} required value={externalName} /></label>}
      <label><span>Address, lot, row, bay, or contact <small>Optional</small></span><input maxLength={200} onChange={event => setPositionLabel(event.target.value)} placeholder="Example: 123 Main St · Bay 4 · contact Diego" value={positionLabel} /></label>
      <label><span>Verification source</span><select onChange={event => setSourceCode(event.target.value)} value={sourceCode}><option value="PHYSICAL_VERIFICATION">Staff physically verified vehicle</option><option value="DEALERSHIP_INVENTORY_RECORD">Dealership inventory record</option><option value="RECEIVING_DOCUMENT">Receiving or transport document</option><option value="MANAGER_CORRECTION">Manager correction</option></select></label>
      <label><span>Reason / reconciliation note</span><input maxLength={500} onChange={event => setReason(event.target.value)} required value={reason} /></label>
    </div>
    {locationKind === "DEALERSHIP" && !locations.length ? <p className={styles.locationError}>No dealership locations are configured. Choose an external location or add a dealership location in Administration.</p> : null}
    {current ? <p className={styles.locationContext}><b>Current canonical location:</b> {current.name}. Saving another location records a correction with its source and timestamp.</p> : <p className={styles.locationContext}>No canonical custody location is recorded yet. Choose where the vehicle is physically present now.</p>}
    {error ? <p aria-live="polite" className={styles.locationError}>{error}</p> : null}
    <footer><button disabled={busy} onClick={onCancel} type="button">Cancel</button><button disabled={busy || (locationKind === "DEALERSHIP" ? !locationId || !locations.length : !externalName.trim()) || reason.trim().length === 0} type="submit">{busy ? "Recording location…" : "Save verified location"}</button></footer>
  </form>;
}

function Fact({ term, value }: { term: string; value: string }) { return <div><dt>{term}</dt><dd>{value || "Not recorded"}</dd></div>; }
