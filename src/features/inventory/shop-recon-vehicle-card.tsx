"use client";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowLeft, BookOpenCheck, Building2, Camera, CarFront, Check, CheckCircle2, Circle, ClipboardCheck, Clock3, FileText, FlaskConical, History, LockKeyhole, MapPin, Paperclip, PlayCircle, RotateCcw, Save, ShieldCheck, UserRound, Wrench } from "lucide-react";
import Link from "next/link";

import { SHOP_RECON_STAGES, type ShopReconStageCode } from "@/server/shop-recon/foundation";
import { getShopReconOperationalWorkspace, type ShopReconOperationalTool } from "@/server/shop-recon/operational-workspace";
import { evaluateShopReconPilotProgress, type ShopReconPilotScenario } from "@/server/shop-recon/pilot";
import { getShopReconStageWorkspace, type ShopReconFormField } from "@/server/shop-recon/stage-workspace";

export type ShopReconVehicleCardModel = {
  id: string;
  vehicleId: string | null;
  vin: string | null;
  repairOrderNumber: string;
  workLane: "INVENTORY_RECON" | "CUSTOMER_REPAIR";
  workLaneLabel: string;
  commitmentLabel: string;
  authorizationPath: string;
  completionHandoff: string;
  inventoryLifecycleStage: string | null;
  shopLifecycleStage: ShopReconStageCode;
  shopLifecycleLabel: string;
  shopLifecycleOrder: number;
  shopZoneCode: string;
  stageTargetBand: string;
  stageElapsedMinutes: number;
  priorityScore: number;
  priorityBand: string;
  priorityReasons: ReadonlyArray<{ code: string; points: number }>;
  operatingState: string;
  targetAt: string;
  nextAction: string;
  blocker: string | null;
  owner: string;
  location: string;
  vehicle: string;
  subject: string;
  concern: string;
  technician: string | null;
  bay: string | null;
  waitingParts: boolean;
  approvalPending: boolean;
  qcPending: number;
  pilot: ShopReconPilotScenario | null;
};

export type ShopReconLifecycleWorkspaceModel = {
  lifecycle: { version: number; stage: ShopReconStageCode; operatingState: string; stageStartedAt: string; zoneCode: string; targetAt: string; nextAction: string; blockerCodes: unknown[]; scopeVersion: number; initialized: boolean; lastSavedAt: string | null; lastSavedByUserId: string | null; lastSavedByName: string | null };
  currentDraft: { id: string; stage: ShopReconStageCode; scopeVersion: number; revision: number; checklist: Record<string, boolean>; formData: Record<string, unknown>; evidence: string[]; savedAt: string; savedByUserId: string; savedByName: string; reason: string } | null;
  currentEvidence: { id: string; stage: ShopReconStageCode; scopeVersion: number; version: number; payload: Record<string, unknown>; sourceReferences: unknown[]; publishedAt: string; publishedByUserId: string; publishedByName: string; reason: string } | null;
  history: Array<{ sequence: number; eventType: string; fromStage: ShopReconStageCode | null; toStage: ShopReconStageCode | null; actorName: string; reason: string; occurredAt: string; scopeVersion: number }>;
  overrides: Array<{ id: string; kind: string; authorizedByName: string; reason: string; expiresAt: string | null; createdAt: string }>;
  scopeChanges: Array<{ id: string; version: number; status: string; finding: string; submittedByName: string; submittedAt: string }>;
  permissions: { currentUserName: string; canSave: boolean; canPublishEvidence: boolean; canComplete: boolean; canOverride: boolean; overrideAuthority: string };
};

const words = (value: string | null) => value ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()) : "Not applicable";
const date = (value: string) => new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
type WorkspaceView = "work" | "activity" | "evidence" | "completion";
type OperationalActivity = { id: string; title: string; result: string; evidence: string; actor: string; occurredAt: string };
function operationalActivity(value: unknown): OperationalActivity[] { return Array.isArray(value) ? value.filter((entry): entry is OperationalActivity => Boolean(entry && typeof entry === "object" && "id" in entry && "title" in entry)) : []; }
function fieldHasValue(value: unknown) { return value !== undefined && value !== null && value !== "" && !(typeof value === "number" && Number.isNaN(value)); }

export function ShopReconVehicleCard({ item, lifecycleWorkspace, returnTo = "/vehicles/shop-recon" }: { item: ShopReconVehicleCardModel; lifecycleWorkspace: ShopReconLifecycleWorkspaceModel; returnTo?: string }) {
  const lifecycle = lifecycleWorkspace.lifecycle;
  const [selectedStage, setSelectedStage] = useState<ShopReconStageCode>(lifecycle.stage);
  const [checklist, setChecklist] = useState<Record<string, boolean>>(lifecycleWorkspace.currentDraft?.checklist ?? {});
  const [formData, setFormData] = useState<Record<string, unknown>>(lifecycleWorkspace.currentDraft?.formData ?? {});
  const [evidenceText, setEvidenceText] = useState((lifecycleWorkspace.currentDraft?.evidence ?? []).join("\n"));
  const [saveReason, setSaveReason] = useState(lifecycleWorkspace.currentDraft?.reason ?? "Updated current stage work and supporting evidence.");
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [overrideId, setOverrideId] = useState("");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("work");
  const [workGuidance, setWorkGuidance] = useState<string | null>(null);
  const [overrideKind, setOverrideKind] = useState("NONCRITICAL_DOCUMENTATION"), [overrideReason, setOverrideReason] = useState(""), [scopeFinding, setScopeFinding] = useState("");
  const selectedDefinition = SHOP_RECON_STAGES.find(stage => stage.code === selectedStage)!;
  const workspace = getShopReconStageWorkspace(selectedStage);
  const operationalWorkspace = getShopReconOperationalWorkspace(selectedStage);
  const usesExternalIntake = selectedStage === "SERVICE_RECON_JOB_INTAKE";
  const laneClass = item.workLane === "INVENTORY_RECON" ? "inventory" : "customer", isCurrent = selectedStage === lifecycle.stage;
  const overallLifecycle = item.workLane === "INVENTORY_RECON" ? words(item.inventoryLifecycleStage ?? "RECONDITIONING") : "Customer Repair";
  const currentIndex = SHOP_RECON_STAGES.findIndex(stage => stage.code === lifecycle.stage), selectedIndex = SHOP_RECON_STAGES.findIndex(stage => stage.code === selectedStage), nextStage = SHOP_RECON_STAGES[currentIndex + 1]?.code ?? (currentIndex === 15 ? "VEHICLE_HANDOVER_SHOP_EXIT" : null), requiresPublishedEvidence = currentIndex < 16;
  const evidence = useMemo(() => evidenceText.split("\n").map(value => value.trim()).filter(Boolean), [evidenceText]);
  const activeOverrides = lifecycleWorkspace.overrides.filter(record => !record.expiresAt || new Date(record.expiresAt) > new Date());
  const pilotProgress = item.pilot ? evaluateShopReconPilotProgress(item.pilot, currentIndex + 1, lifecycle.operatingState) : [];
  const sourceWorkspace = currentIndex === 7 || currentIndex === 8 ? { href: `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(item.id)}`, label: "Open estimate & authorization workspace" } : currentIndex === 9 ? { href: `/vehicles/parts-operations?repairOrderId=${encodeURIComponent(item.id)}`, label: "Open Parts & resource workspace" } : currentIndex >= 10 && currentIndex <= 13 ? { href: "/vehicles/shop-dispatch", label: currentIndex >= 12 ? "Open technician execution workspace" : "Open dispatch & assignment workspace" } : currentIndex === 14 ? { href: "/vehicles/quality-control", label: "Open QC & release workspace" } : currentIndex === 15 ? { href: "/vehicles/advisor", label: "Open recipient readiness workspace" } : null;
  const activityEntries = operationalActivity(formData.__activity).slice().reverse();

  async function post(path: string, body: Record<string, unknown>) { const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "The action could not be completed."); return result; }
  async function saveDraft() { setBusy(true); setFeedback(null); try { await post(`/api/shop-recon/${item.id}/draft`, { stage: lifecycle.stage, expectedVersion: lifecycle.version, idempotencyKey: crypto.randomUUID(), reason: saveReason, checklist, formData, evidence }); setDirty(false); setFeedback({ tone: "success", text: "Draft saved. The vehicle did not move; your name and save time were recorded." }); window.location.reload(); } catch (error) { setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Draft could not be saved." }); } finally { setBusy(false); } }
  async function publishEvidence() { setBusy(true); setFeedback(null); try { await post(`/api/shop-recon/${item.id}/evidence`, { expectedVersion: lifecycle.version, idempotencyKey: crypto.randomUUID(), reason: `Published authoritative operational evidence for ${workspace.formTitle}.` }); setFeedback({ tone: "success", text: "Operational evidence published and linked to its authoritative Shop records. The stage has not moved." }); window.location.reload(); } catch (error) { setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Operational evidence could not be published." }); } finally { setBusy(false); } }
  async function moveStage(destination: ShopReconStageCode) { setBusy(true); setFeedback(null); try { await post(`/api/shop-recon/${item.id}/transition`, { toStage: destination, expectedVersion: lifecycle.version, idempotencyKey: crypto.randomUUID(), reason: currentIndex === 15 && destination === lifecycle.stage ? "Completed the physical Shop exit and custody handoff under the approved terminal-stage policy." : destination === nextStage ? `Completed ${workspace.formTitle} and advanced under the approved stage policy.` : `General Manager controlled movement from ${lifecycle.stage} to ${destination}.`, facts: {}, overrideId: overrideId || null }); setFeedback({ tone: "success", text: currentIndex === 15 ? "Shop exit recorded. The receiving Inventory or customer close workflow may continue." : "Stage movement recorded with the completing user, evidence snapshot, and time." }); window.location.reload(); } catch (error) { setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Stage could not be completed." }); } finally { setBusy(false); } }
  async function grantOverride() { setBusy(true); setFeedback(null); try { await post(`/api/shop-recon/${item.id}/override`, { kind: overrideKind, expectedVersion: lifecycle.version, idempotencyKey: crypto.randomUUID(), reason: overrideReason, boundaries: ["Applies only to this vehicle and current stage"] }); setFeedback({ tone: "success", text: "General Manager exception recorded. Safety, identity, authorization, QC, road-test, and release gates remain non-overridable." }); window.location.reload(); } catch (error) { setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Override could not be recorded." }); } finally { setBusy(false); } }
  async function submitScopeChange() { setBusy(true); setFeedback(null); try { await post(`/api/shop-recon/${item.id}/scope-change`, { expectedVersion: lifecycle.version, idempotencyKey: crypto.randomUUID(), reason: "Additional finding changed the currently authorized repair scope.", finding: scopeFinding, affectedRepairJobIds: [], originalScope: formData, proposedScope: { finding: scopeFinding } }); setFeedback({ tone: "success", text: "Affected work stopped. A new scope version was created and the card returned to Findings Verification." }); window.location.reload(); } catch (error) { setFeedback({ tone: "error", text: error instanceof Error ? error.message : "Scope change could not be submitted." }); } finally { setBusy(false); } }
  function changed() { setDirty(true); setFeedback(null); }
  function appendOperationalActivity(entry: Omit<OperationalActivity, "id" | "actor" | "occurredAt">) {
    setFormData(current => ({ ...current, __activity: [...operationalActivity(current.__activity), { ...entry, id: crypto.randomUUID(), actor: lifecycleWorkspace.permissions.currentUserName, occurredAt: new Date().toISOString() }] }));
  }
  function recordOperationalAction(index: number) {
    const action = operationalWorkspace?.actions[index];
    if (!action) return;
    if (!isCurrent) {
      setSelectedStage(lifecycle.stage);
      setWorkspaceView("work");
      setWorkGuidance(`Stage ${currentIndex + 1} is the active operational stage. Complete it before entering work in a future stage.`);
      return;
    }
    const missingFields = action.requiredFields.filter(field => !fieldHasValue(formData[field]));
    if (missingFields.length) {
      const labels = missingFields.map(field => workspace.fields.find(item => item.key === field)?.label ?? field);
      if (usesExternalIntake) {
        setWorkGuidance(`Complete or correct ${labels.join(" and ")} in the Intake Form, then return here to record "${action.title}".`);
        return;
      }
      setWorkGuidance(`Complete ${labels.join(" and ")} before recording “${action.title}.”`);
      requestAnimationFrame(() => document.getElementById(`shop-field-${missingFields[0]}`)?.focus());
      return;
    }
    const key = `item_${index + 1}`, wasComplete = checklist[key] === true;
    setChecklist(current => ({ ...current, [key]: !wasComplete }));
    appendOperationalActivity({ title: action.title, result: wasComplete ? "Operation reopened for correction." : "Operation performed and recorded on the current stage.", evidence: action.evidence });
    setWorkGuidance(wasComplete ? `${action.title} is open for correction.` : `${action.title} was recorded. Save stage work when the stage record is complete.`);
    changed();
  }
  function loadPilotExample() {
    if (!operationalWorkspace || !item.pilot || !isCurrent) return;
    setFormData(current => ({ ...current, ...operationalWorkspace.pilotValues }));
    setChecklist(current => ({ ...current, ...Object.fromEntries(operationalWorkspace.actions.map((_, index) => [`item_${index + 1}`, false])) }));
    setWorkGuidance("Sample facts loaded for review. Record each operation, inspect Stage Activity, then try Documents & Evidence and Stage Completion. Nothing is saved until you choose Save recorded stage work.");
    changed();
  }
  function updateOperationalField(key: string, value: unknown) {
    const actionIndex = operationalWorkspace?.actions.findIndex(action => action.requiredFields.includes(key)) ?? -1;
    const checklistKey = `item_${actionIndex + 1}`, invalidatesRecordedAction = actionIndex >= 0 && checklist[checklistKey] === true;
    if (invalidatesRecordedAction) setChecklist(current => ({ ...current, [checklistKey]: false }));
    setFormData(current => ({
      ...current,
      [key]: value,
      __activity: invalidatesRecordedAction
        ? [...operationalActivity(current.__activity), { id: crypto.randomUUID(), title: operationalWorkspace!.actions[actionIndex].title, result: "Recorded operation reopened because its supporting facts changed.", evidence: "Correction required", actor: lifecycleWorkspace.permissions.currentUserName, occurredAt: new Date().toISOString() }]
        : current.__activity,
    }));
    changed();
  }
  const completionControls = (() => {
    const publishLocked = dirty || !lifecycleWorkspace.currentDraft || !lifecycleWorkspace.permissions.canPublishEvidence;
    const completeLocked = dirty || !lifecycleWorkspace.currentDraft || !nextStage || (requiresPublishedEvidence && !lifecycleWorkspace.currentEvidence) || (!lifecycleWorkspace.permissions.canComplete && !overrideId);
    if (isCurrent) return <section className="srv-live-actions">
      <h2>Save Work, Publish Evidence, and Complete</h2>
      {sourceWorkspace ? <Link className="srv-source-workspace" href={sourceWorkspace.href}><Wrench />{sourceWorkspace.label}</Link> : null}
      {requiresPublishedEvidence ? <p className={`srv-publish-state ${lifecycleWorkspace.currentEvidence ? "published" : "draft"}`}>{lifecycleWorkspace.currentEvidence ? <><CheckCircle2 /><span><strong>Operational evidence published</strong><small>Version {lifecycleWorkspace.currentEvidence.version} by {lifecycleWorkspace.currentEvidence.publishedByName} · {date(lifecycleWorkspace.currentEvidence.publishedAt)}</small></span></> : <><AlertTriangle /><span><strong>{lifecycleWorkspace.currentDraft ? "Recorded work saved — publication required" : "Recorded work has not been saved"}</strong><small>Use the three numbered actions below in order. A locked action will explain what is missing when clicked.</small></span></>}</p> : null}
      <label><span>Work-record note</span><textarea disabled={busy} onChange={event => { setSaveReason(event.target.value); changed(); }} value={saveReason} /></label>
      {activeOverrides.length ? <label><span>Approved exception (optional)</span><select disabled={busy} onChange={event => setOverrideId(event.target.value)} value={overrideId}><option value="">No exception</option>{activeOverrides.map(record => <option key={record.id} value={record.id}>{words(record.kind)} · {record.authorizedByName}</option>)}</select></label> : null}
      <button disabled={busy || !lifecycleWorkspace.permissions.canSave} onClick={saveDraft} type="button"><Save />{busy ? "Working…" : "1. Save recorded stage work"}</button>
      {requiresPublishedEvidence ? <button className={publishLocked ? "is-locked" : ""} data-locked={publishLocked || undefined} disabled={busy} onClick={() => publishLocked ? setFeedback({ tone: "error", text: dirty ? "Save the latest stage changes first." : !lifecycleWorkspace.currentDraft ? "Record the stage work and save it first." : "You do not have evidence-publication authority for this stage." }) : publishEvidence()} type="button"><ShieldCheck />{lifecycleWorkspace.currentEvidence ? `2. Republish evidence · v${lifecycleWorkspace.currentEvidence.version}` : "2. Publish operational evidence"}</button> : null}
      <button className={completeLocked ? "is-locked" : ""} data-locked={completeLocked || undefined} disabled={busy} onClick={() => completeLocked ? setFeedback({ tone: "error", text: dirty ? "Save the latest changes before completing the stage." : !lifecycleWorkspace.currentDraft ? "Save recorded stage work first." : requiresPublishedEvidence && !lifecycleWorkspace.currentEvidence ? "Publish operational evidence before advancing." : "The named completion authority or an approved exception is required." }) : nextStage && moveStage(nextStage)} type="button"><CheckCircle2 />{currentIndex === 15 ? "3. Complete Shop exit" : "3. Complete stage & advance"}</button>
      <small>Saving records all work, corrections, evidence references, user attribution, and time without moving the vehicle. Completion separately rechecks every gate.</small>
    </section>;
    if (selectedIndex < currentIndex && lifecycleWorkspace.permissions.canOverride) return <section className="srv-live-actions"><h2>Controlled Stage Movement</h2><p>A General Manager override for backward movement or reopening is required.</p><label><span>Approved exception</span><select onChange={event => setOverrideId(event.target.value)} value={overrideId}><option value="">Select an active override</option>{activeOverrides.filter(record => ["CONTROLLED_BACKWARD_MOVEMENT", "REOPEN_STAGE"].includes(record.kind)).map(record => <option key={record.id} value={record.id}>{words(record.kind)} · {record.authorizedByName}</option>)}</select></label><button disabled={busy || !overrideId} onClick={() => moveStage(selectedStage)} type="button"><RotateCcw />Move vehicle to this stage</button></section>;
    return <section className="srv-live-actions"><h2>Future-stage preview</h2><p>This stage becomes operational after the current stage and all required gates are complete.</p></section>;
  })();

  return <section className={`srv-card lane-${laneClass}`} aria-label={`Unified vehicle card for ${item.vehicle}`}>
    <header className="srv-card-header">
      <Link href={returnTo}><ArrowLeft /> Shop &amp; Recon</Link>
      <div className="srv-card-identity">
        <span><CarFront /></span>
        <div>
          <small><LaneIcon lane={item.workLane} /> {item.workLaneLabel}{item.pilot ? <b className="srv-pilot-badge">Operational Pilot</b> : null}</small>
          <h1>{item.vehicle}</h1>
          <p>{item.vin ?? "VIN unavailable"} · {item.repairOrderNumber} · {item.subject}</p>
        </div>
      </div>
      <div className="srv-card-now">
        <small>Do This Now · Stage {currentIndex + 1} of 16</small>
        <strong>{lifecycle.nextAction}</strong>
        <span>{SHOP_RECON_STAGES[currentIndex].label} · {lifecycle.zoneCode}</span>
      </div>
      <div className="srv-card-status">
        <small><i /> Viewing Stage {selectedDefinition.order} of 16</small>
        <strong>{selectedDefinition.label}</strong>
        <span>{isCurrent ? "Current operational stage" : "Review selection only"}</span>
      </div>
    </header>

    <section className="srv-context-strip" aria-label="Vehicle lifecycle context">
      <p><span>Overall lifecycle</span><strong>{overallLifecycle}</strong></p>
      <p><span>Shop stage</span><strong>{currentIndex + 1}. {SHOP_RECON_STAGES[currentIndex].label}</strong></p>
      <p><span>Operating state</span><strong>{words(lifecycle.operatingState)}</strong></p>
      <p><span>Physical zone</span><strong>{lifecycle.zoneCode}</strong></p>
      <p><span>Owner</span><strong>{item.owner}</strong></p>
      <p><span>{item.commitmentLabel}</span><strong>{date(lifecycle.targetAt)}</strong></p>
    </section>

    <div className="srv-design-notice"><ShieldCheck /><span><strong>Governed operational workspace</strong> Any authorized user with access may save an attributable draft. Saving never completes a stage or moves the vehicle. Movement requires all gates and the named stage authority.</span></div>

    <section className="srv-stage-control" aria-label="Shop stage selector">
      <div><span><i /> Current Shop Stage</span><strong>{currentIndex + 1}. {SHOP_RECON_STAGES[currentIndex].label}</strong><small>Select a stage below to review it. Selecting alone never moves the operational vehicle.</small></div>
      <b>{item.priorityBand} · {item.priorityScore}<small>{words(item.stageTargetBand)} · {item.stageElapsedMinutes} staffed min</small></b>
    </section>

    <nav className="srv-stage-nav" aria-label="Sixteen Shop and Recon stages">
      {SHOP_RECON_STAGES.map(stage => {
        const state = stage.order < currentIndex + 1 ? "complete" : stage.order === currentIndex + 1 ? "current" : "upcoming";
        return <button aria-current={selectedStage === stage.code ? "step" : undefined} className={`${state} ${selectedStage === stage.code ? "selected" : ""}`} key={stage.code} onClick={() => { setSelectedStage(stage.code); setWorkspaceView("work"); setWorkGuidance(null); }} type="button">
          <i>{selectedStage === stage.code ? <em /> : state === "complete" ? <Check /> : stage.order}</i>
          <span>{stage.label}<small>{state === "current" ? "Current work" : state === "complete" ? "Prior stage" : "Upcoming"}</small></span>
        </button>;
      })}
    </nav>

    <main className="srv-workspace">
      <section className="srv-workspace-main">
        <header>
          <span>Stage {selectedDefinition.order}</span>
          <div><small>{isCurrent ? "Current operational workspace" : "Read-only stage review"}</small><h2>{selectedDefinition.label}</h2><p>{workspace.purpose}</p></div>
          <b>{isCurrent ? "CURRENT" : selectedDefinition.order < currentIndex + 1 ? "HISTORY" : "UPCOMING"}</b>
        </header>

        {operationalWorkspace ? <section className="srv-operational-shell">
          <nav aria-label="Stage operational workspace sections" className="srv-operational-tabs">
            <button className={workspaceView === "work" ? "active" : ""} onClick={() => setWorkspaceView("work")} type="button"><PlayCircle />Work to Perform <b>{workspace.checklist.filter((_, index) => checklist[`item_${index + 1}`]).length}/{workspace.checklist.length}</b></button>
            <button className={workspaceView === "activity" ? "active" : ""} onClick={() => setWorkspaceView("activity")} type="button"><Activity />Stage Activity <b>{activityEntries.length + lifecycleWorkspace.history.length}</b></button>
            <button className={workspaceView === "evidence" ? "active" : ""} onClick={() => setWorkspaceView("evidence")} type="button"><Paperclip />Documents &amp; Evidence <b>{evidence.length}/{workspace.evidence.length}</b></button>
            <button className={workspaceView === "completion" ? "active" : ""} onClick={() => setWorkspaceView("completion")} type="button"><BookOpenCheck />Stage Completion</button>
          </nav>

          {workspaceView === "work" ? <div className="srv-operational-work">
            <header><div><small>Perform the work here</small><h3>{operationalWorkspace.workTitle}</h3><p>{operationalWorkspace.workInstruction}</p>{operationalWorkspace.tools?.length ? <nav aria-label={`${workspace.formTitle} tools`} className="srv-stage-tools">{operationalWorkspace.tools.map(tool => <Link href={tool.href} key={tool.key} title={tool.description}><FileText />{tool.label}</Link>)}</nav> : null}</div><div className="srv-operational-header-actions"><span>{isCurrent ? `Working as ${lifecycleWorkspace.permissions.currentUserName}` : `Preview only · Stage ${currentIndex + 1} is active`}</span>{item.pilot && isCurrent ? <button onClick={loadPilotExample} type="button"><FlaskConical />Load sample stage work</button> : null}</div></header>
            {workGuidance ? <p className="srv-work-guidance"><AlertTriangle /><span>{workGuidance}</span></p> : null}
            <div className="srv-operational-grid">
              <section className="srv-operation-list">{operationalWorkspace.actions.map((action, index) => { const completed = checklist[`item_${index + 1}`] === true, missing = action.requiredFields.filter(field => !fieldHasValue(formData[field])), ready = missing.length === 0; return <article className={completed ? "complete" : ""} key={action.key}><header><i>{completed ? <Check /> : index + 1}</i><div><strong>{action.title}</strong><small>{action.owner}</small></div><b>{completed ? "Recorded" : ready ? "Ready" : "Needs facts"}</b></header><p>{action.instruction}</p><dl><div><dt>Required record</dt><dd>{action.requiredFields.map(field => workspace.fields.find(item => item.key === field)?.label ?? field).join(" · ")}</dd></div><div><dt>Evidence created</dt><dd>{action.evidence}</dd></div></dl>{!completed && !ready && isCurrent ? <small className="srv-operation-help">Click below to enter: {missing.map(field => workspace.fields.find(item => item.key === field)?.label ?? field).join(" and ")}</small> : null}<button disabled={busy} onClick={() => recordOperationalAction(index)} type="button">{!isCurrent ? <><RotateCcw />Return to active Stage {currentIndex + 1}</> : completed ? <><RotateCcw />Reopen operation</> : ready ? <><CheckCircle2 />Record operation</> : <><FileText />Enter required facts</>}</button></article>; })}</section>
              {usesExternalIntake ? <IntakeSummaryPanel fields={workspace.fields} formData={formData} item={item} tools={operationalWorkspace.tools ?? []} /> : <section className="srv-stage-record"><header><FileText /><div><h3>{workspace.formTitle}</h3><p>Enter the facts used by the operations. Changing a recorded fact reopens its operation for confirmation.</p></div><span>{lifecycleWorkspace.currentDraft?.revision ? `Saved v${lifecycleWorkspace.currentDraft.revision}` : "Unsaved work"}</span></header><div>{workspace.fields.map(field => isCurrent ? <OperationalField disabled={busy} field={field} key={field.key} onChange={updateOperationalField} value={formData[field.key]} /> : <PreviewField field={field} key={field.key} />)}</div></section>}
            </div>
          </div> : null}

          {workspaceView === "activity" ? <section className="srv-operational-activity"><header><Activity /><div><h3>Attributable Stage Activity</h3><p>Every recorded operation, correction, save, publication, and movement remains associated with its user and time.</p></div></header><div>{activityEntries.map(entry => <article key={entry.id}><i><Check /></i><div><strong>{entry.title}</strong><p>{entry.result}</p><small>{entry.actor} · {date(entry.occurredAt)} · {entry.evidence}</small></div></article>)}{lifecycleWorkspace.history.map(event => <article key={`history-${event.sequence}`}><i><History /></i><div><strong>{words(event.eventType)}</strong><p>{event.reason}</p><small>{event.actorName} · {date(event.occurredAt)}</small></div></article>)}{!activityEntries.length && !lifecycleWorkspace.history.length ? <p className="srv-operational-empty">No stage operations have been recorded. Begin in Work to Perform.</p> : null}</div></section> : null}

          {workspaceView === "evidence" ? <section className="srv-evidence srv-operational-evidence"><header><Camera /><div><h3>Documents &amp; Evidence</h3><p>Attach or reference the actual photos, scans, measurements, records, and documents produced while performing this stage.</p></div></header><div>{workspace.evidence.map((requirement, index) => <p key={requirement}><span>{evidence[index] ? <CheckCircle2 /> : <Camera />}</span><strong>{requirement}</strong><small>{evidence[index] ?? "Evidence reference required"}</small></p>)}</div>{isCurrent ? <label className="srv-evidence-entry"><span>Evidence references</span><textarea disabled={busy} onChange={event => { setEvidenceText(event.target.value); changed(); }} placeholder="One photo, document, measurement, or source record per line" value={evidenceText} /></label> : null}</section> : null}

          {workspaceView === "completion" ? <section className="srv-completion-workspace"><header><BookOpenCheck /><div><h3>Stage Completion Gate</h3><p>Review recorded work separately from the decision to publish evidence and move the vehicle.</p></div></header><div className="srv-completion-summary"><p><span>Operations recorded</span><strong>{workspace.checklist.filter((_, index) => checklist[`item_${index + 1}`]).length} / {workspace.checklist.length}</strong></p><p><span>Evidence supplied</span><strong>{evidence.length} / {workspace.evidence.length}</strong></p><p><span>Completion authority</span><strong>{workspace.authority}</strong></p><p><span>Current status</span><strong>{dirty ? "Unsaved changes" : lifecycleWorkspace.currentEvidence ? "Published" : lifecycleWorkspace.currentDraft ? "Saved work" : "Work not saved"}</strong></p></div>{completionControls}{feedback ? <p className={`srv-action-feedback ${feedback.tone}`}>{feedback.text}</p> : null}</section> : null}
        </section> : <><div className="srv-work-grid"><section className="srv-checklist"><header><ClipboardCheck /><div><h3>Stage Checklist</h3><p>Required before the card can advance.</p></div><span>{workspace.checklist.filter((_, index) => checklist[`item_${index + 1}`]).length} / {workspace.checklist.length}</span></header>{workspace.checklist.map((label, index) => { const key = `item_${index + 1}`, checked = checklist[key] === true; return <label key={label}><input checked={checked} disabled={!isCurrent || busy} onChange={event => { setChecklist(value => ({ ...value, [key]: event.target.checked })); changed(); }} type="checkbox" /><i>{checked ? <Check /> : <Circle />}</i><span><strong>{label}</strong><small>Required gate {index + 1}</small></span></label>; })}</section><section className="srv-form-preview"><header><FileText /><div><h3>{workspace.formTitle}</h3><p>{isCurrent ? "Work saves as an attributable draft." : "Read-only stage review."}</p></div><span>{lifecycleWorkspace.currentDraft?.revision ? `Draft v${lifecycleWorkspace.currentDraft.revision}` : "New draft"}</span></header><div>{workspace.fields.map(field => isCurrent ? <OperationalField disabled={busy} field={field} key={field.key} onChange={(key, value) => { setFormData(current => ({ ...current, [key]: value })); changed(); }} value={formData[field.key]} /> : <PreviewField field={field} key={field.key} />)}</div></section></div><section className="srv-evidence"><header><Camera /><div><h3>Required Evidence</h3><p>Enter one attachment, photo, measurement, or source reference per line. The saved revision remains in history.</p></div></header><div>{workspace.evidence.map((requirement, index) => <p key={requirement}><span>{evidence[index] ? <CheckCircle2 /> : <Camera />}</span><strong>{requirement}</strong><small>{evidence[index] ?? "Evidence reference required"}</small></p>)}</div>{isCurrent ? <label className="srv-evidence-entry"><span>Evidence references</span><textarea disabled={busy} onChange={event => { setEvidenceText(event.target.value); changed(); }} placeholder="One evidence reference per line" value={evidenceText} /></label> : null}</section></>}
      </section>

      <aside className="srv-workspace-rail">
        {item.pilot ? <section className="srv-pilot-panel"><h2><FlaskConical /> {item.pilot.label}</h2><p>{item.pilot.objective}</p><strong>Journey validation</strong><div>{pilotProgress.map(group => <p className={group.status.toLowerCase()} key={group.id}>{group.status === "COMPLETE" ? <CheckCircle2 /> : group.status === "IN_PROGRESS" ? <Clock3 /> : <Circle />}<span>{group.label}<small>Stages {group.fromStage}–{group.toStage} · {words(group.status)}</small></span></p>)}</div><details><summary>Exception drills</summary>{item.pilot.exceptionDrills.map(drill => <p key={drill.id}><AlertTriangle /><span><strong>{drill.label}</strong><small>Stage {SHOP_RECON_STAGES.find(stage => stage.code === drill.stage)?.order}: {drill.expectedControl}</small></span></p>)}</details><footer>Expected exit: <strong>{item.pilot.expectedHandoff}</strong></footer></section> : null}
        <section className="srv-current-context"><h2>Current Vehicle Context</h2><Fact icon={MapPin} label="Location" value={item.location} /><Fact icon={UserRound} label="Accountable owner" value={item.owner} /><Fact icon={Wrench} label="Technician / bay" value={[item.technician, item.bay].filter(Boolean).join(" · ") || "Not assigned"} /><Fact icon={Clock3} label={item.commitmentLabel} value={date(lifecycle.targetAt)} /></section>
        <section><h2>Decision Authority</h2><p className="srv-authority"><LockKeyhole />{workspace.authority}</p><small>{item.authorizationPath}</small></section>
        <section><h2>Constraint &amp; Priority</h2>{lifecycle.blockerCodes.length ? <p className="srv-blocker"><AlertTriangle />{lifecycle.blockerCodes.map(String).join(", ")}</p> : <p className="srv-clear"><CheckCircle2 />No controlling blocker recorded.</p>}<dl><div><dt>Priority</dt><dd>{item.priorityBand} · {item.priorityScore}</dd></div><div><dt>Timing</dt><dd>{words(item.stageTargetBand)}</dd></div><div><dt>Parts</dt><dd>{item.waitingParts ? "Constrained" : "No constraint"}</dd></div></dl></section>
        <section><h2>Completion Path</h2><p>{item.completionHandoff}</p><small>The same card and history continue through handoff.</small></section>
        {isCurrent && lifecycle.stage === "REPAIR_EXECUTION" ? <section className="srv-policy-action"><h2>Changed Scope</h2><p>Use this when a new finding exceeds the approved work. A draft save alone does not authorize additional repair.</p><textarea disabled={busy} onChange={event => setScopeFinding(event.target.value)} placeholder="Describe the new finding and affected work" value={scopeFinding} /><button disabled={busy || scopeFinding.trim().length < 10} onClick={submitScopeChange} type="button"><RotateCcw />Stop affected work &amp; start scope review</button></section> : null}
        {isCurrent && lifecycleWorkspace.permissions.canOverride ? <details className="srv-policy-action"><summary>General Manager exception</summary><p>Permitted only for WIP, timing, queue, noncritical documentation, temporary resources, controlled backward movement, or reopening.</p><select disabled={busy} onChange={event => setOverrideKind(event.target.value)} value={overrideKind}><option value="WIP_LIMIT">WIP limit</option><option value="TARGET_TIME">Target time</option><option value="QUEUE_ORDER">Queue order</option><option value="NONCRITICAL_DOCUMENTATION">Noncritical documentation</option><option value="TEMPORARY_RESOURCE">Temporary resource</option><option value="CONTROLLED_BACKWARD_MOVEMENT">Controlled backward movement</option><option value="REOPEN_STAGE">Reopen stage</option></select><textarea disabled={busy} onChange={event => setOverrideReason(event.target.value)} placeholder="Explain the exception, boundary, and follow-up" value={overrideReason} /><button disabled={busy || overrideReason.trim().length < 10} onClick={grantOverride} type="button"><ShieldCheck />Record GM exception</button><small>Identity, custody, safety, customer authorization, inventory spending authority, technician qualification, legal records, failed QC, failed road test, and release acceptance cannot be overridden.</small></details> : null}
        {operationalWorkspace ? null : completionControls}
        {!operationalWorkspace && feedback ? <p className={`srv-action-feedback ${feedback.tone}`}>{feedback.text}</p> : null}
        <section><h2><History /> Recent Stage History</h2>{lifecycleWorkspace.history.length ? lifecycleWorkspace.history.slice(0, 5).map(event => <p className="srv-history-event" key={event.sequence}><strong>{words(event.eventType)}</strong><span>{event.actorName} · {date(event.occurredAt)}</span><small>{event.reason}</small></p>) : <small>No governed stage events yet. The first save initializes the operational lifecycle.</small>}</section>
        <section><h2>Policy Guardrails</h2><small>Scope change stops affected work and loops through findings, plan, authorization, and readiness. Failed QC or road test forces rework and a fresh QC; it cannot be overridden.</small></section>
      </aside>
    </main>
  </section>;
}

function LaneIcon({ lane }: { lane: ShopReconVehicleCardModel["workLane"] }) { return lane === "INVENTORY_RECON" ? <Building2 /> : <UserRound />; }
function Fact({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) { return <p className="srv-fact"><Icon /><span>{label}<strong>{value}</strong></span></p>; }
function PreviewField({ field }: { field: ShopReconFormField }) {
  if (field.type === "textarea") return <label className="wide"><span>{field.label}</span><textarea disabled placeholder={field.placeholder ?? "Stage notes"} /></label>;
  if (field.type === "select") return <label><span>{field.label}</span><select disabled defaultValue=""><option value="">Select…</option>{field.options?.map(option => <option key={option}>{option}</option>)}</select></label>;
  if (field.type === "checkbox") return <label className="checkbox"><input disabled type="checkbox" /><span>{field.label}</span></label>;
  return <label><span>{field.label}</span><input disabled placeholder={field.placeholder} type={field.type} /></label>;
}

function IntakeSummaryPanel({ fields, formData, item, tools }: { fields: readonly ShopReconFormField[]; formData: Record<string, unknown>; item: ShopReconVehicleCardModel; tools: readonly ShopReconOperationalTool[] }) {
  const valueFor = (key: string) => {
    const value = formData[key];
    if (fieldHasValue(value)) return String(value);
    if (key === "workLane") return item.workLaneLabel;
    if (key === "vehicleIdentifier") return item.vin ?? item.subject;
    if (key === "requester") return item.subject;
    if (key === "concern") return item.concern;
    if (key === "commitmentAt") return item.targetAt ? new Date(item.targetAt).toLocaleDateString("en-US") : "";
    if (key === "intakeOwner") return item.owner;
    return "";
  };
  const rows = fields.map(field => ({ field, value: valueFor(field.key) }));
  const missing = rows.filter(row => !fieldHasValue(row.value));
  const complete = missing.length === 0;
  return <section className="srv-intake-summary"><header><FileText /><div><h3>Stage 1 Intake Summary</h3><p>Intake Form is the source of entry. The vehicle card verifies readiness and records the governed stage decision.</p></div><span className={complete ? "complete" : "missing"}>{complete ? "Ready from intake" : `${missing.length} missing`}</span></header><div className="srv-intake-summary-grid">{rows.map(({ field, value }) => <p className={fieldHasValue(value) ? "complete" : "missing"} key={field.key}><span>{field.label}</span><strong>{fieldHasValue(value) ? value : "Needs Intake Form"}</strong></p>)}</div>{missing.length ? <p className="srv-intake-missing"><AlertTriangle />Missing intake facts: {missing.map(row => row.field.label).join(", ")}</p> : <p className="srv-intake-ready"><CheckCircle2 />Required intake facts are present for Stage 1 review.</p>}<nav aria-label="Correct Stage 1 intake facts">{tools.map(tool => <Link href={tool.href} key={tool.key} title={tool.description}><FileText />{tool.key === "INTAKE_FORM" ? "Correct in Intake Form" : tool.label}</Link>)}</nav></section>;
}

function OperationalField({ field, value, disabled, onChange }: { field: ShopReconFormField; value: unknown; disabled: boolean; onChange: (key: string, value: unknown) => void }) {
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
  if (field.type === "textarea") return <label className="wide"><span>{field.label}</span><textarea disabled={disabled} id={`shop-field-${field.key}`} onChange={event => onChange(field.key, event.target.value)} placeholder={field.placeholder ?? "Stage notes"} value={text} /></label>;
  if (field.type === "select") return <label><span>{field.label}</span><select disabled={disabled} id={`shop-field-${field.key}`} onChange={event => onChange(field.key, event.target.value)} value={text}><option value="">Select…</option>{field.options?.map(option => <option key={option}>{option}</option>)}</select></label>;
  if (field.type === "checkbox") return <label className="checkbox"><input checked={value === true} disabled={disabled} id={`shop-field-${field.key}`} onChange={event => onChange(field.key, event.target.checked)} type="checkbox" /><span>{field.label}</span></label>;
  return <label><span>{field.label}</span><input disabled={disabled} id={`shop-field-${field.key}`} onChange={event => onChange(field.key, field.type === "number" ? event.target.valueAsNumber : event.target.value)} placeholder={field.placeholder} type={field.type} value={text} /></label>;
}
