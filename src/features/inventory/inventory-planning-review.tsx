"use client";

import { AlertTriangle, ArrowLeft, ArrowRight, Camera, CarFront, Check, CheckCircle2, FileText, LockKeyhole, MapPin, Pencil, RotateCcw, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import type { VehicleExecutionWorkbenchProjection } from "@/server/inventory-execution/workbench-service";

import baseStyles from "./inventory-planning-review.module.css";
import locationStyles from "./inventory-location-editor.module.css";

const styles: Record<string, string> = {
  ...(baseStyles as Record<string, string>),
  ...(locationStyles as Record<string, string>),
  checkbox: "inventory-planning-checkbox",
  checkDetails: "inventory-planning-check-details",
  dangerButton: "inventory-planning-danger-button",
  emptyAction: "inventory-planning-empty-action",
  currentTask: "inventory-planning-current-task",
  guidedChecklist: "inventory-planning-guided-checklist",
  guidedTask: "inventory-planning-guided-task",
  inlineActions: "inventory-planning-inline-actions",
  stageFields: "inventory-planning-stage-fields",
  stageForm: "inventory-planning-stage-form",
  taskActions: "inventory-planning-task-actions",
  taskBadge: "inventory-planning-task-badge",
  taskRequirements: "inventory-planning-task-requirements"
};

type View = "RECEIVING" | "LIFECYCLE";
type CheckState = "PASS" | "CONCERN" | "NOT_APPLICABLE" | "PENDING";
type CheckItem = { id: string; label: string; instruction: string; evidence: string; evidenceRequirement: string; completionCriteria: string; requiresEvidence?: boolean; requiresNotes?: boolean; state: CheckState; notes?: string; evidenceObjectIds?: string[] };
type CheckGroup = { id: string; label: string; items: CheckItem[] };
type FrontlineWorkflow = {
  id: string; version: number; stage: string; operatingState: string; nextAction: string; targetAt: string;
  ownerUser: { id: string; name: string }; location: { id: string; name: string };
  inventoryUnit: { id: string; inventoryNumber: string; vehicle: { id: string; vehicleNumber: string; year: number | null; make: string | null; model: string | null } };
  repairOrder: { id: string; repairOrderNumber: string } | null;
  receiptSnapshot?: unknown; inspectionSnapshot?: unknown; reconSnapshot?: unknown; executionSnapshot?: unknown; qualitySnapshot?: unknown; titleSnapshot?: unknown; merchandisingSnapshot?: unknown; releaseSnapshot?: unknown; postReleaseSnapshot?: unknown; exceptionSnapshot?: unknown;
};
type FrontlineUser = { id: string; name: string };
type RegistryLocation = { id: string; code: string; name: string };
type EligibleUnit = { id: string; inventoryNumber: string; locationId: string; vehicle: { id: string; vehicleNumber: string; year: number | null; make: string | null; model: string | null } };

const initialChecklist: CheckGroup[] = [
  { id: "identity", label: "Identity & custody", items: [
    { id: "vin", label: "Verify canonical vehicle identity", instruction: "Scan or compare the VIN at the vehicle, confirm the decoded identity, review duplicates, and verify the stock relationship before accepting custody.", evidence: "Open identity record", evidenceRequirement: "Canonical VIN validation and duplicate review", completionCriteria: "VIN and vehicle agree; decoded identity and stock relationship are confirmed.", state: "PASS" },
    { id: "arrival", label: "Receive the vehicle and establish custody", instruction: "Record arrival, odometer, keys or fobs, documents received, fuel or charge level, visible damage, and the person or source releasing the vehicle.", evidence: "Add arrival evidence", evidenceRequirement: "Odometer/arrival evidence plus custody observations", completionCriteria: "Arrival facts are complete and custody can be accepted or a concern is documented.", requiresEvidence: true, requiresNotes: true, state: "PENDING" }
  ] },
  { id: "condition", label: "Condition evidence", items: [
    { id: "photos", label: "Capture the required receiving photo set", instruction: "Photograph the VIN, odometer, dash and warning lights, four corners, interior, engine compartment, cargo area, and every visible exception.", evidence: "Capture / upload photos", evidenceRequirement: "Governed receiving photo set", completionCriteria: "Required views are readable and every visible exception has supporting evidence.", requiresEvidence: true, state: "PENDING" },
    { id: "condition", label: "Document physical condition and equipment", instruction: "Inspect body, paint, glass, wheels, cabin, leaks, odors, missing equipment, accessories, and transport or auction damage.", evidence: "Record condition findings", evidenceRequirement: "Finding notes and applicable photos", completionCriteria: "All condition areas are reviewed and exceptions are described for recon planning.", requiresNotes: true, state: "PENDING" }
  ] },
  { id: "safety", label: "Safety & technical", items: [
    { id: "safety", label: "Complete the initial safety inspection", instruction: "Inspect tires, brakes, steering, restraints, lights, battery, fluid hazards, leaks, and any condition that could make movement or road testing unsafe.", evidence: "Perform safety inspection", evidenceRequirement: "Measurements, findings, and applicable evidence", completionCriteria: "Safe-to-move hazards are identified and every critical concern is routed to hold or recon.", requiresNotes: true, state: "PENDING" },
    { id: "scan", label: "Establish the diagnostic and warning-light baseline", instruction: "Record warning lights, attach the diagnostic scan when applicable, identify relevant DTCs, and decide whether a road test is safe and necessary.", evidence: "Attach diagnostic scan", evidenceRequirement: "Scan report or documented not-applicable reason", completionCriteria: "Diagnostic baseline and road-test decision are documented for the technician.", requiresEvidence: true, state: "PENDING" },
    { id: "nhtsa", label: "Review recalls and safety intelligence", instruction: "Review NHTSA model-level campaigns, perform VIN-specific verification when indicated, and distinguish recalls from service bulletins or complaint patterns.", evidence: "Review NHTSA source", evidenceRequirement: "Verification source and staff-recorded outcome", completionCriteria: "Potential campaigns remain labeled verify-by-VIN and any relevant safety issue is routed into recon.", requiresNotes: true, state: "PENDING" }
  ] },
  { id: "disposition", label: "Disposition", items: [
    { id: "move", label: "Decide disposition and assign the next owner", instruction: "Set safe-to-move status, any safety or title hold, recon priority, accountable owner, target time, and the first action the receiving team expects next.", evidence: "Assign disposition", evidenceRequirement: "Disposition decision with owner and target", completionCriteria: "The vehicle has an accountable route into recon or a controlled hold with a clear recovery action.", requiresNotes: true, state: "PENDING" }
  ] }
];

const stages = ["Transport", "Receipt", "Inspection", "Recon", "Shop & Parts", "Final QC", "Title", "Merch", "Release", "Verify"];
const stageIndex: Record<string, number> = { TRANSPORT_PLANNING: 0, IN_TRANSIT: 0, RECEIPT_AND_CUSTODY: 1, INSPECTION_AND_TRIAGE: 2, RECON_PLAN_AND_APPROVAL: 3, PARTS_AND_REPAIR_EXECUTION: 4, QUALITY_AND_SAFETY_VERIFICATION: 5, TITLE_DOCUMENT_READINESS: 6, MERCHANDISING_AND_PRICING: 7, FRONTLINE_RELEASE_REVIEW: 8, FRONTLINE_READY: 9, POST_RELEASE_VERIFICATION: 9 };

function object(value: unknown) { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown, fallback = "Not recorded") { return typeof value === "string" && value.trim() ? value.trim() : fallback; }
function display(value: unknown, fallback = "Not recorded") { return typeof value === "number" ? value.toLocaleString() : text(value, fallback); }
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
function taskRequirementMet(item: CheckItem, evidenceIds: string[]) { return (!item.requiresEvidence || evidenceIds.length > 0 || Boolean(item.evidenceObjectIds?.length)) && (!item.requiresNotes || Boolean(item.notes?.trim())); }
function taskOperationalStatus(item: CheckItem, evidenceIds: string[]) {
  if (item.state === "PASS") return "Complete · Pass";
  if (item.state === "CONCERN") return "Complete · Concern";
  if (item.state === "NOT_APPLICABLE") return "Complete · N/A";
  if (item.requiresEvidence && !evidenceIds.length && !item.evidenceObjectIds?.length) return "Evidence required";
  if (item.requiresNotes && !item.notes?.trim()) return "Work details required";
  return "Ready for result";
}

export function InventoryPlanningReview({ eligibleUnit = null, initial, initialRepairOrderId = "", initialWorkflow = null, locations = [], users = [] }: { eligibleUnit?: EligibleUnit | null; initial: VehicleExecutionWorkbenchProjection; initialRepairOrderId?: string; initialWorkflow?: FrontlineWorkflow | null; locations?: RegistryLocation[]; users?: FrontlineUser[] }) {
  const identity = object(initial.identity), operation = object(initial.operation), location = object(operation.location), latestOdometer = object(operation.latestOdometer);
  const vehicleId = text(identity.id, text(identity.vehicleNumber, "vehicle"));
  const acquisitionHref = `/vehicles/acquisition-appraisal?vehicleId=${encodeURIComponent(vehicleId)}&returnTo=${encodeURIComponent(`/vehicles/${vehicleId}/inventory-planning`)}`;
  const draftKey = `inventory-receiving-review:${vehicleId}`;
  const [workflow, setWorkflow] = useState<FrontlineWorkflow | null>(initialWorkflow);
  const [view, setView] = useState<View>(() => initialWorkflow && !["RECEIPT_AND_CUSTODY", "INSPECTION_AND_TRIAGE"].includes(initialWorkflow.stage) ? "LIFECYCLE" : "RECEIVING");
  const [groups, setGroups] = useState<CheckGroup[]>(initialChecklist);
  const [notes, setNotes] = useState("");
  const [notice, setNotice] = useState(initialWorkflow ? `Governed workflow loaded at ${label(initialWorkflow.stage)}.` : eligibleUnit ? "This InventoryUnit is eligible to start its governed lifecycle." : "No eligible InventoryUnit or active lifecycle workflow is connected to this vehicle.");
  const [busy, setBusy] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState(initialWorkflow?.ownerUser.id ?? users[0]?.id ?? "");
  const [keyCount, setKeyCount] = useState("1");
  const [mileage, setMileage] = useState(() => String(typeof latestOdometer.reading === "number" ? latestOdometer.reading : ""));
  const [damageSummary, setDamageSummary] = useState("");
  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);
  const [canonicalLocation, setCanonicalLocation] = useState<RegistryLocation | null>(() => typeof location.id === "string" && typeof location.name === "string" ? { id: location.id, code: text(location.code, ""), name: location.name } : null);
  const items = useMemo(() => groups.flatMap(group => group.items), [groups]);
  const completed = items.filter(item => item.state !== "PENDING").length;
  const concerns = items.filter(item => item.state === "CONCERN").length;
  const readiness = Math.round(completed / items.length * 100);
  const vehicleName = [identity.year, identity.make, identity.model].map(identityPart).filter(Boolean).join(" ") || text(identity.vehicleNumber, "Vehicle");
  const evidenceIds = useMemo(() => initial.evidence.items.map(item => { const link = object(item); return text(object(link.evidenceObject).id, text(link.id, "")); }).filter(Boolean), [initial.evidence.items]);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const saved = window.localStorage.getItem(draftKey);
      if (!saved) return;
      try {
        const draft = JSON.parse(saved) as { groups?: CheckGroup[]; notes?: string };
        if (draft.groups?.length) setGroups(mergeChecklistDraft(draft.groups));
        if (typeof draft.notes === "string") setNotes(draft.notes);
        setNotice("Saved receiving review draft restored from this browser.");
      } catch {
        window.localStorage.removeItem(draftKey);
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, [draftKey]);

  function updateCheck(id: string, state: CheckState) {
    setGroups(current => current.map(group => ({ ...group, items: group.items.map(item => item.id === id ? { ...item, state } : item) })));
  }

  function updateCheckDetails(id: string, values: Partial<Pick<CheckItem, "notes" | "evidenceObjectIds">>) {
    setGroups(current => current.map(group => ({ ...group, items: group.items.map(item => item.id === id ? { ...item, ...values } : item) })));
  }

  function saveDraft() {
    window.localStorage.setItem(draftKey, JSON.stringify({ groups, notes }));
    setNotice("Review draft saved in this browser. No backend record was changed.");
  }

  function resetDraft() {
    window.localStorage.removeItem(draftKey);
    setGroups(mergeChecklistDraft([]));
    setNotes("");
    setView("RECEIVING");
    setNotice("Local draft reset. Authoritative workflow history was not changed.");
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
      setNotice(workflow && workflow.location.id !== recordedLocation.id ? `Current custody verified at ${displayName}. The active lifecycle remains operationally assigned to ${workflow.location.name}; reassign that workflow separately if needed.` : `Current location verified as ${displayName}. The source and correction reason were added to the canonical custody history.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Current location could not be updated.");
      throw error;
    } finally {
      setBusy(false);
    }
  }

  async function startWorkflow() {
    if (!eligibleUnit || !ownerUserId) { setNotice("An eligible InventoryUnit and accountable owner are required."); return; }
    setBusy(true); setNotice("");
    try {
      await request("/api/frontline-workflows", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: 0, idempotencyKey: crypto.randomUUID(), inventoryUnitId: eligibleUnit.id, ownerUserId, policyVersion: "INV-ITF-POLICY/1.0.0", reason: "Start governed vehicle-specific inventory lifecycle from approved intake.", targetAt: new Date(Date.now() + 10 * 86_400_000).toISOString() }) });
      const next = await refresh();
      setNotice(`Governed lifecycle started${next ? ` at ${label(next.stage)}` : ""}.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Lifecycle could not be started."); }
    finally { setBusy(false); }
  }

  async function act(action: string, values: Record<string, unknown>, success: string) {
    if (!workflow) { setNotice("Start the governed lifecycle before recording stage work."); return null; }
    setBusy(true); setNotice("");
    try {
      await request(`/api/frontline-workflows/${workflow.id}/commands`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, expectedVersion: workflow.version, idempotencyKey: crypto.randomUUID(), reason: `${success} from the vehicle-specific lifecycle workspace.`, ...values }) });
      const next = await refresh();
      setNotice(`${success}${next ? ` Next: ${next.nextAction}` : ""}`);
      return next;
    } catch (error) { setNotice(error instanceof Error ? error.message : "Lifecycle command failed."); return null; }
    finally { setBusy(false); }
  }

  async function advanceReceiving() {
    if (!workflow) { await startWorkflow(); return; }
    if (workflow.stage === "TRANSPORT_PLANNING") {
      await act("PLAN_TRANSPORT", { carrierReference: null, costAuthorized: false, estimatedCostCents: 0, expectedAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(), method: "NO_TRANSPORT", releaseEvidenceReference: null, transportRequired: false }, "No-transport path recorded.");
      return;
    }
    if (workflow.stage === "RECEIPT_AND_CUSTODY") {
      const arrivalTask = items.find(item => item.id === "arrival");
      if (!arrivalTask || arrivalTask.state === "PENDING" || !taskRequirementMet(arrivalTask, evidenceIds)) { setNotice("Complete the guided arrival-and-custody task, its evidence, work details, and result before recording receipt."); return; }
      if (!notes.trim() || !mileage || !keyCount) { setNotice("Condition summary, mileage, and key count are required before receipt."); return; }
      if (!evidenceIds.length) { setNotice("Receipt is blocked until at least one governed evidence item is attached in Vehicle 360."); return; }
      await act("RECORD_RECEIPT", { arrivedAt: new Date().toISOString(), conditionSummary: notes, custodyAccepted: true, damageSummary: damageSummary || null, documentSummary: { source: "VEHICLE_SPECIFIC_RECEIVING" }, evidenceObjectIds: evidenceIds, identityMatch: groups.flatMap(group => group.items).find(item => item.id === "vin")?.state === "PASS", keyCount: Number(keyCount), mileage: Number(mileage) }, "Receipt and custody recorded.");
      return;
    }
    if (workflow.stage === "INSPECTION_AND_TRIAGE") {
      if (completed !== items.length) { setNotice(`Complete all ${items.length} checklist decisions before inspection submission.`); return; }
      const incompleteWork = items.filter(item => item.state !== "NOT_APPLICABLE" && !taskRequirementMet(item, evidenceIds));
      if (incompleteWork.length) { setNotice(`Complete the required work details and evidence for: ${incompleteWork.map(item => item.label).join(", ")}.`); return; }
      if (!evidenceIds.length) { setNotice("Inspection is blocked until governed evidence is attached in Vehicle 360."); return; }
      const byId = Object.fromEntries(items.map(item => [item.id, item.state]));
      const next = await act("RECORD_INSPECTION", { checklistResults: items.map(item => ({ code: item.id.toUpperCase(), evidenceObjectIds: item.evidenceObjectIds ?? [], label: item.label, notes: item.notes ?? null, status: item.state })), diagnosticRequired: byId.scan === "CONCERN", evidenceObjectIds: evidenceIds, findings: items.filter(item => item.state === "CONCERN").map(item => ({ code: item.id.toUpperCase(), description: item.notes?.trim() || item.label, disposition: "REVIEW_REQUIRED", evidenceObjectIds: item.evidenceObjectIds ?? [] })), identityConflict: byId.vin === "CONCERN", safetyCriticalFail: byId.safety === "CONCERN", templateCode: "TMS-RECEIVING-IQI", templateComplete: true, templateVersion: 1, titleConcern: false }, "Receiving inspection recorded and baseline locked.");
      if (next?.stage === "RECON_PLAN_AND_APPROVAL") setView("LIFECYCLE");
      return;
    }
    if (workflow.stage === "HOLD") { await act("REOPEN_FOR_CORRECTION", {}, "Held workflow reopened for governed correction."); return; }
    setView("LIFECYCLE");
  }

  function previewLifecycle() {
    saveDraft();
    setView("LIFECYCLE");
    setNotice(workflow ? `Authoritative lifecycle opened at ${label(workflow.stage)}.` : "Lifecycle preview opened; start the governed workflow before submitting work.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <section className={styles.workspace} aria-label={`Inventory planning review for ${vehicleName}`}>
    <header className={styles.header}>
      <Link href={`/vehicles/${encodeURIComponent(vehicleId)}/workbench`}><ArrowLeft size={15} /> Vehicle Workbench</Link>
      <div className={styles.identity}><span><CarFront /></span><div><small>Inventory planning · vehicle-specific workspace</small><h1>{vehicleName}</h1><p>{text(identity.vin, label(identity.vinState))} · Stock {text(identity.stockNumber, "not assigned")} · {display(latestOdometer.reading, "Mileage not recorded")}</p></div></div>
      <div className={styles.headerState}><small>Authoritative state</small><strong>{workflow ? label(workflow.stage) : "Not started"}</strong><span>{workflow ? `${label(workflow.operatingState)} · version ${workflow.version}` : "No workflow mutation yet"}</span></div>
      <Link className={styles.secondaryButton} href={withQuery(initial.links.vehicle360, { returnTo: `/vehicles/${vehicleId}/inventory-planning` })}>Open Vehicle 360</Link>
    </header>

    <nav className={styles.reviewSteps} aria-label="Approved experience review">
      <button aria-current={view === "RECEIVING" ? "step" : undefined} onClick={() => setView("RECEIVING")} type="button"><b>{view === "LIFECYCLE" ? <Check size={14} /> : "1"}</b><span>Receiving & Initial QC</span></button>
      <span aria-hidden="true" />
      <button aria-current={view === "LIFECYCLE" ? "step" : undefined} onClick={() => setView("LIFECYCLE")} type="button"><b>2</b><span>Guided Lifecycle</span></button>
    </nav>

    <div className={styles.notice} role="status"><ShieldCheck size={17} /><span>{notice}</span></div>

    {view === "RECEIVING" ? <ReceivingReview activeCheckId={activeCheckId} busy={busy} canonicalLocation={canonicalLocation} damageSummary={damageSummary} eligibleUnit={eligibleUnit} evidenceIds={evidenceIds} identity={identity} keyCount={keyCount} locations={locations} mileage={mileage} notes={notes} onRecordLocation={recordCurrentLocation} operation={operation} ownerUserId={ownerUserId} setActiveCheckId={setActiveCheckId} setDamageSummary={setDamageSummary} setKeyCount={setKeyCount} setMileage={setMileage} setNotes={setNotes} setOwnerUserId={setOwnerUserId} groups={groups} updateCheck={updateCheck} updateCheckDetails={updateCheckDetails} readiness={readiness} completed={completed} concerns={concerns} initial={initial} users={users} workflow={workflow} /> : <LifecycleReview act={act} busy={busy} completed={completed} concerns={concerns} evidenceIds={evidenceIds} identity={identity} initial={initial} initialRepairOrderId={initialRepairOrderId} users={users} workflow={workflow} />}

    <footer className={styles.footer}>
      <button className={styles.textButton} onClick={resetDraft} type="button"><RotateCcw size={14} /> Reset review</button>
      <span>{view === "RECEIVING" ? !workflow && !eligibleUnit ? "InventoryUnit required—complete acquisition before starting the lifecycle" : `${completed}/${items.length} checklist decisions recorded` : "Receiving details remain available from every later stage"}</span>
      {view === "RECEIVING" ? <div><button className={styles.secondaryButton} onClick={saveDraft} type="button">Save local draft</button><button className={styles.secondaryButton} onClick={previewLifecycle} type="button">Open lifecycle</button>{!workflow && !eligibleUnit ? <Link className={styles.primaryButton} href={acquisitionHref}>Establish acquisition first <ArrowRight size={16} /></Link> : <button className={styles.primaryButton} disabled={busy} onClick={advanceReceiving} type="button">{receivingActionLabel(workflow)} <ArrowRight size={16} /></button>}</div> : <button className={styles.primaryButton} onClick={() => setView("RECEIVING")} type="button">Review receiving details</button>}
    </footer>
  </section>;
}

function ReceivingReview({ activeCheckId, busy, canonicalLocation, completed, concerns, damageSummary, eligibleUnit, evidenceIds, groups, identity, initial, keyCount, locations, mileage, notes, onRecordLocation, operation, ownerUserId, readiness, setActiveCheckId, setDamageSummary, setKeyCount, setMileage, setNotes, setOwnerUserId, updateCheck, updateCheckDetails, users, workflow }: { activeCheckId: string | null; busy: boolean; canonicalLocation: RegistryLocation | null; completed: number; concerns: number; damageSummary: string; eligibleUnit: EligibleUnit | null; evidenceIds: string[]; groups: CheckGroup[]; identity: Record<string, unknown>; initial: VehicleExecutionWorkbenchProjection; keyCount: string; locations: RegistryLocation[]; mileage: string; notes: string; onRecordLocation: (input: { custodianType: string; displayName: string; locationId: string | null; positionLabel: string; reason: string; sourceCode: string }) => Promise<void>; operation: Record<string, unknown>; ownerUserId: string; readiness: number; setActiveCheckId: (value: string | null) => void; setDamageSummary: (value: string) => void; setKeyCount: (value: string) => void; setMileage: (value: string) => void; setNotes: (value: string) => void; setOwnerUserId: (value: string) => void; updateCheck: (id: string, state: CheckState) => void; updateCheckDetails: (id: string, values: Partial<Pick<CheckItem, "notes" | "evidenceObjectIds">>) => void; users: FrontlineUser[]; workflow: FrontlineWorkflow | null }) {
  const [locationEditorOpen, setLocationEditorOpen] = useState(false);
  const orderedTasks = groups.flatMap(group => group.items), currentTask = orderedTasks.find(item => item.state === "PENDING") ?? orderedTasks[orderedTasks.length - 1];
  return <main className={styles.reviewBody}>
    <div className={styles.mainColumn}>
      <section className={styles.card}>
        <div className={styles.cardHeader}><div><small>Carried forward automatically</small><h2>Detailed intake & canonical vehicle facts</h2><p>No repeated entry. These facts remain connected to their canonical origins.</p></div><span className={styles.locked}><LockKeyhole size={14} /> Baseline facts</span></div>
        <div className={styles.factGrid}>
          <Fact term="Canonical vehicle" value={text(identity.vehicleNumber)} /><Fact term="VIN" value={text(identity.vin, label(identity.vinState))} /><Fact term="Year / Make / Model" value={[identity.year, identity.make, identity.model].map(identityPart).filter(Boolean).join(" ")} /><Fact term="Color" value={text(identity.color)} />
          <Fact term="License plate" value={text(identity.licensePlate)} /><Fact term="Stock number" value={text(identity.stockNumber)} /><EditableLocationFact location={canonicalLocation} onEdit={() => setLocationEditorOpen(true)} /><Fact term="Custody / state" value={label(operation.operatingState)} />
        </div>
        {locationEditorOpen ? <VehicleLocationEditor busy={busy} current={canonicalLocation} locations={locations} onCancel={() => setLocationEditorOpen(false)} onSave={async values => { await onRecordLocation(values); setLocationEditorOpen(false); }} /> : null}
        <div className={styles.sourceRow}><FileText size={16} /><div><strong>Canonical origins preserved</strong><span>VIN identity, decoded specifications, arrival observations, evidence, and later corrections remain attributable in Vehicle 360.</span></div><Link href={withQuery(initial.links.vehicle360, { returnTo: `/vehicles/${text(identity.id, "")}/inventory-planning` })}>View full details</Link></div>
      </section>

      <section className={styles.currentTask}>
        <div><small>Current required receiving task · {orderedTasks.findIndex(item => item.id === currentTask.id) + 1} of {orderedTasks.length}</small><h2>{currentTask.label}</h2><p>{currentTask.instruction}</p><dl><div><dt>Evidence</dt><dd>{currentTask.evidenceRequirement}</dd></div><div><dt>Done when</dt><dd>{currentTask.completionCriteria}</dd></div></dl></div>
        <div><span className={styles.taskBadge}>{taskOperationalStatus(currentTask, evidenceIds)}</span><div className={styles.taskActions}><ChecklistAction initial={initial} item={currentTask} onOpen={() => setActiveCheckId(currentTask.id)} />{["arrival", "photos", "scan", "nhtsa"].includes(currentTask.id) ? <button onClick={() => setActiveCheckId(currentTask.id)} type="button">Record work details</button> : null}</div></div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}><div><small>Original detailed receiving design · mandatory completion gate</small><h2>Receiving & Initial Quality Inspection</h2><p>Complete the work and evidence described for each task, then record Pass, Concern, or N/A as its outcome.</p></div><strong>{readiness}% reviewed</strong></div>
        <div className={styles.guidedChecklist}>{groups.map(group => <section key={group.id}><header><h3>{group.label}</h3><span>{group.items.filter(item => item.state !== "PENDING").length}/{group.items.length} complete</span></header>{group.items.map(item => {
          const requirementMet = taskRequirementMet(item, evidenceIds), taskNumber = orderedTasks.findIndex(task => task.id === item.id) + 1;
          return <article className={styles.guidedTask} key={item.id}><div><small>Task {taskNumber}</small><h4>{item.label}</h4><p>{item.instruction}</p><div className={styles.taskRequirements}><span><b>Required evidence</b>{item.evidenceRequirement}</span><span><b>Completion standard</b>{item.completionCriteria}</span></div></div><div><span className={styles.taskBadge}>{taskOperationalStatus(item, evidenceIds)}</span><select aria-label={`${item.label} result`} className={styles[`state${item.state}`]} onChange={event => updateCheck(item.id, event.target.value as CheckState)} value={item.state}><option value="PENDING">Not recorded</option><option disabled={!requirementMet} value="PASS">Pass</option><option disabled={!requirementMet} value="CONCERN">Concern</option><option value="NOT_APPLICABLE">N/A</option></select><div className={styles.taskActions}><ChecklistAction initial={initial} item={item} onOpen={() => setActiveCheckId(activeCheckId === item.id ? null : item.id)} />{["arrival", "photos", "scan", "nhtsa"].includes(item.id) ? <button onClick={() => setActiveCheckId(activeCheckId === item.id ? null : item.id)} type="button">{activeCheckId === item.id ? "Close details" : "Record details"}</button> : null}</div></div>{activeCheckId === item.id && item.id !== "vin" ? <GuidedTaskDetails damageSummary={damageSummary} evidenceIds={evidenceIds} item={item} keyCount={keyCount} mileage={mileage} ownerUserId={ownerUserId} setDamageSummary={setDamageSummary} setKeyCount={setKeyCount} setMileage={setMileage} setOwnerUserId={setOwnerUserId} updateCheckDetails={updateCheckDetails} users={users} workflow={workflow} /> : null}</article>;
        })}</section>)}</div>
      </section>

      <section className={styles.card}><div className={styles.cardHeader}><div><small>Receiving handoff narrative</small><h2>Exceptions, priorities, and technician starting context</h2><p>Structured arrival and assignment facts are completed in their guided tasks above.</p></div><span>{notes.length}/2,000</span></div><label className={styles.notes}><span>What should the recon planner and technician know?</span><textarea maxLength={2000} onChange={event => setNotes(event.target.value)} placeholder="Summarize overall condition, operability, warning lights, safety or title holds, immediate priorities, and the recommended starting point." value={notes} /></label></section>
    </div>

    <aside className={styles.sideColumn}>
      <section className={styles.summaryCard}><h2>Receiving readiness</h2><div className={styles.score}><strong>{readiness}%</strong><span>{completed}/{groups.flatMap(group => group.items).length} reviewed</span></div><div className={styles.progress}><span style={{ width: `${readiness}%` }} /></div><p className={concerns ? styles.warning : styles.good}>{concerns ? `${concerns} concern${concerns === 1 ? "" : "s"} will carry into recon or create a hold.` : "No concerns recorded yet."}</p><p><b>Workflow:</b> {workflow ? `${label(workflow.stage)} · v${workflow.version}` : eligibleUnit ? "Eligible to start" : "InventoryUnit required"}</p><p><b>Evidence:</b> {evidenceIds.length} governed item(s) available</p>{!workflow && !eligibleUnit ? <Link className={styles.secondaryButton} href={`/vehicles/acquisition-appraisal?vehicleId=${encodeURIComponent(text(identity.id, ""))}&returnTo=${encodeURIComponent(`/vehicles/${text(identity.id, "")}/inventory-planning`)}`}>Establish acquisition &amp; InventoryUnit</Link> : null}{busy ? <p>Submitting governed command…</p> : null}</section>
      <section className={styles.summaryCard}><h2>Safety intelligence</h2><div className={styles.safetyItem}><ShieldCheck /><div><strong>NHTSA decoded identity</strong><span>Available from the canonical VIN record.</span></div></div><div className={styles.safetyItem}><AlertTriangle /><div><strong>Recall verification pending</strong><span>Model-level campaigns must remain “Potentially applicable—verify by VIN.”</span></div></div></section>
      <section className={styles.summaryCard}><h2>Two QC controls</h2><p><b>Receiving QC</b> establishes the original vehicle baseline.</p><p><b>Final Recon QC</b> later validates completed work through independent review.</p></section>
      <section className={styles.summaryCard}><h2>Existing connected records</h2><p>{initial.evidence.items.length} evidence item(s)</p><p>{initial.workOrders.items.length} repair order(s)</p><p>{initial.parts.demands.length} parts demand(s)</p></section>
    </aside>
  </main>;
}

function GuidedTaskDetails({ damageSummary, evidenceIds, item, keyCount, mileage, ownerUserId, setDamageSummary, setKeyCount, setMileage, setOwnerUserId, updateCheckDetails, users, workflow }: { damageSummary: string; evidenceIds: string[]; item: CheckItem; keyCount: string; mileage: string; ownerUserId: string; setDamageSummary: (value: string) => void; setKeyCount: (value: string) => void; setMileage: (value: string) => void; setOwnerUserId: (value: string) => void; updateCheckDetails: (id: string, values: Partial<Pick<CheckItem, "notes" | "evidenceObjectIds">>) => void; users: FrontlineUser[]; workflow: FrontlineWorkflow | null }) {
  const prompt = item.id === "arrival" ? "Record documents received, fuel/charge level, releasing party, custody exception, and any arrival detail not captured below." : item.id === "condition" ? "Describe damage, missing equipment, odors, leaks, wear, and the exact areas recon must address." : item.id === "safety" ? "Record tire/brake measurements, warning conditions, safe-to-move restrictions, and any immediate hazard." : item.id === "scan" ? "Record warning lights, relevant DTCs, scan limitations, and the road-test decision." : item.id === "nhtsa" ? "Record the source reviewed, VIN-verification outcome, potentially applicable campaigns, and whether any item relates to the planned repair." : "Record safe-to-move status, hold decision, recon priority, target, and the first expected next action.";
  return <div className={styles.checkDetails}>
    {item.id === "arrival" ? <div className="inventory-planning-task-fields"><Field label="Odometer"><input min="0" onChange={event => setMileage(event.target.value)} type="number" value={mileage} /></Field><Field label="Keys / fobs"><input min="0" onChange={event => setKeyCount(event.target.value)} type="number" value={keyCount} /></Field><Field label="Visible damage"><input onChange={event => setDamageSummary(event.target.value)} placeholder="None observed, or describe" value={damageSummary} /></Field></div> : null}
    {item.id === "move" ? <div className="inventory-planning-task-fields"><Field label="Accountable owner"><select disabled={Boolean(workflow)} onChange={event => setOwnerUserId(event.target.value)} value={workflow?.ownerUser.id ?? ownerUserId}>{users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field><div><span>Workflow target</span><strong>{workflow ? new Date(workflow.targetAt).toLocaleString() : "Set when the governed lifecycle starts"}</strong></div></div> : null}
    <label><span>Work performed, observation, and outcome context</span><textarea maxLength={1000} onChange={event => updateCheckDetails(item.id, { notes: event.target.value })} placeholder={prompt} value={item.notes ?? ""} /></label>
    {evidenceIds.length ? <fieldset><legend>Link governed evidence to this task</legend>{evidenceIds.map(id => <label key={id}><input checked={(item.evidenceObjectIds ?? []).includes(id)} onChange={event => updateCheckDetails(item.id, { evidenceObjectIds: event.target.checked ? [...new Set([...(item.evidenceObjectIds ?? []), id])] : (item.evidenceObjectIds ?? []).filter(value => value !== id) })} type="checkbox" /> {id}</label>)}</fieldset> : <p>No governed evidence is available yet. Use the task action to add it in Vehicle 360, then return here.</p>}
  </div>;
}

function LifecycleReview({ act, busy, completed, concerns, evidenceIds, identity, initial, initialRepairOrderId, users, workflow }: { act: (action: string, values: Record<string, unknown>, success: string) => Promise<FrontlineWorkflow | null>; busy: boolean; completed: number; concerns: number; evidenceIds: string[]; identity: Record<string, unknown>; initial: VehicleExecutionWorkbenchProjection; initialRepairOrderId: string; users: FrontlineUser[]; workflow: FrontlineWorkflow | null }) {
  const active = workflow ? stageIndex[workflow.stage] ?? 0 : 0;
  return <main className={styles.lifecycle}>
    <section className={styles.stageStrip} aria-label="Inventory lifecycle stages">{stages.map((stage, index) => <button className={index < active ? styles.stageComplete : index === active ? styles.stageActive : styles.stageFuture} key={stage} type="button"><b>{index < active ? <Check size={14} /> : index + 1}</b><span>{stage}</span><small>{index < active ? "Complete" : index === active ? "Current" : "Not ready"}</small></button>)}</section>
    <div className={styles.lifecycleGrid}>
      <section className={styles.card}><div className={styles.workHeader}><small>Current governed step · {workflow ? label(workflow.stage) : "Not started"}</small><h2>{workflow?.nextAction ?? "Start the governed lifecycle from Receiving"}</h2><p>The full receiving baseline stays attached to {text(identity.vehicleNumber)}. Only the command valid for the authoritative stage can advance the vehicle.</p></div>{workflow ? <GovernedStageAction act={act} busy={busy} evidenceIds={evidenceIds} initial={initial} initialRepairOrderId={initialRepairOrderId} key={`${workflow.id}:${workflow.stage}`} users={users} workflow={workflow} /> : <div className="inventory-planning-empty-action"><p>Return to Receiving &amp; Initial QC to start the governed Inventory-to-Frontline workflow.</p></div>}</section>
      <aside className={styles.sideColumn}>
        <section className={styles.summaryCard}><h2>Receiving baseline</h2><p><CheckCircle2 /> {completed}/8 checklist decisions carried forward</p><p><AlertTriangle /> {concerns} concern(s) requiring disposition</p><p><Camera /> {initial.evidence.items.length} existing evidence item(s)</p><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} type="button">Receiving details remain available</button></section>
        <section className={styles.summaryCard}><h2>Current authority</h2><p><b>Stage:</b> {workflow ? label(workflow.stage) : "Not started"}</p><p><b>State:</b> {workflow ? label(workflow.operatingState) : "No workflow"}</p><p><b>Owner:</b> {workflow?.ownerUser.name ?? "Not assigned"}</p><p><b>Version:</b> {workflow?.version ?? 0}</p></section>
        <section className={styles.summaryCard}><h2>Controlled boundaries</h2><p>Repair execution is read from the authoritative inventory-recon Repair Order.</p><p>Parts completion is read from canonical Parts demand.</p><p>QC and frontline release require independent authority.</p></section>
        <section className={styles.summaryCard}><h2>Pilot operations</h2><p><ShieldCheck /> Optimistic version checks and idempotency protect every lifecycle command.</p><p><AlertTriangle /> Overdue stages are evaluated by the Inventory-to-Frontline escalation sweep and routed to a controlled hold.</p><p><FileText /> Provider actions remain disabled; staff must verify external title, publication, and VIN-recall facts before recording completion.</p><Link className={styles.secondaryButton} href="/settings/vehicle-operations">Open rollout &amp; health</Link></section>
      </aside>
    </div>
  </main>;
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
function ChecklistAction({ initial, item, onOpen }: { initial: VehicleExecutionWorkbenchProjection; item: CheckItem; onOpen: () => void }) {
  const returnTo = `/vehicles/${text(object(initial.identity).id, "")}/inventory-planning`;
  if (item.id === "vin") return <Link href={withQuery(initial.links.vehicle360, { returnTo })}>{item.evidence}</Link>;
  if (item.id === "nhtsa") return <Link href={withQuery(initial.links.vehicle360, { section: "intelligence", intent: "recalls", returnTo })}>{item.evidence}</Link>;
  const category = item.id === "photos" ? "PHOTO" : item.id === "scan" ? "INSPECTION" : item.id === "arrival" ? "OTHER" : null;
  if (category) return <Link href={withQuery(initial.links.evidence, { category, returnTo })}>{item.evidence}</Link>;
  return <button onClick={onOpen} type="button">{item.evidence}</button>;
}
function withQuery(href: string, values: Record<string, string>) { const [path, query = ""] = href.split("?", 2), params = new URLSearchParams(query); for (const [key, value] of Object.entries(values)) params.set(key, value); const serialized = params.toString(); return serialized ? `${path}?${serialized}` : path; }
function Reviewer({ set, users, value, workflow }: { set: (value: string) => void; users: FrontlineUser[]; value: string; workflow: FrontlineWorkflow }) { return <Field label="Independent reviewer"><select onChange={event => set(event.target.value)} value={value}><option value="">Select reviewer</option>{users.filter(user => user.id !== workflow.ownerUser.id).map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></Field>; }
function StageSubmit({ busy, children, disabled = false }: { busy: boolean; children: ReactNode; disabled?: boolean }) { return <button className={styles.primaryButton} disabled={busy || disabled} type="submit">{busy ? "Recording…" : children}</button>; }
function localFuture(days: number) { const date = new Date(Date.now() + days * 86_400_000); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }
function receivingActionLabel(workflow: FrontlineWorkflow | null) { if (!workflow) return "Start governed lifecycle"; if (workflow.stage === "TRANSPORT_PLANNING") return "Confirm no transport & open receipt"; if (workflow.stage === "RECEIPT_AND_CUSTODY") return "Record receipt & custody"; if (workflow.stage === "INSPECTION_AND_TRIAGE") return "Complete inspection & lock baseline"; if (workflow.stage === "HOLD") return "Reopen responsible gate"; return "Continue guided lifecycle"; }

function EditableLocationFact({ location, onEdit }: { location: RegistryLocation | null; onEdit: () => void }) {
  return <div className={styles.editableFact}>
    <dt>Current location</dt>
    <dd>{location?.name ?? "Not recorded"}</dd>
    <button aria-label="Edit current vehicle location" onClick={onEdit} type="button"><Pencil size={12} /> {location ? "Edit / verify" : "Choose location"}</button>
  </div>;
}

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
      <label><span>Reason / reconciliation note</span><input maxLength={500} minLength={10} onChange={event => setReason(event.target.value)} required value={reason} /></label>
    </div>
    {locationKind === "DEALERSHIP" && !locations.length ? <p className={styles.locationError}>No dealership locations are configured. Choose an external location or add a dealership location in Administration.</p> : null}
    {current ? <p className={styles.locationContext}><b>Current canonical location:</b> {current.name}. Saving another location records a correction with its source and timestamp.</p> : <p className={styles.locationContext}>No canonical custody location is recorded yet. Choose where the vehicle is physically present now.</p>}
    {error ? <p aria-live="polite" className={styles.locationError}>{error}</p> : null}
    <footer><button disabled={busy} onClick={onCancel} type="button">Cancel</button><button disabled={busy || (locationKind === "DEALERSHIP" ? !locationId || !locations.length : !externalName.trim()) || reason.trim().length < 10} type="submit">{busy ? "Recording location…" : "Save verified location"}</button></footer>
  </form>;
}

function Fact({ term, value }: { term: string; value: string }) { return <div><dt>{term}</dt><dd>{value || "Not recorded"}</dd></div>; }
