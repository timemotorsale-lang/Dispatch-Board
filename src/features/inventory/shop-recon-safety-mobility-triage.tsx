"use client";

import { AlertTriangle, ArrowRight, CarFront, Check, CheckCircle2, ClipboardCheck, Save, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import type { ShopReconLifecycleWorkspaceModel, ShopReconVehicleCardModel } from "@/features/inventory/shop-recon-vehicle-card";
import { getNextShopReconStageHref } from "@/features/inventory/shop-recon-navigation";
import { SHOP_RECON_STAGES } from "@/server/shop-recon/foundation";

type TriageForm = Record<string, unknown>;

const leakOptions = ["No active leak", "Leak observed", "Unknown"];
const concernOptions = ["No concern", "Needs caution", "Unsafe"];
const fireOptions = ["No fire risk", "Electrical concern", "Fire risk"];
const mobilityOptions = ["Moves normally", "Restricted movement", "Do not move"];
const startOptions = ["Starts and runs", "No start", "Runs poorly", "Unknown"];
const moveOptions = ["Any authorized staff", "Technician or Brock only", "Tow/push only", "Do not move"];
const roadTestOptions = ["Allowed", "Not allowed", "Not required", "Pending technician approval"];
const restrictionOptions = ["No restriction", "No customer road test", "Brock/Eli approval required", "Technician only", "Tow/push only", "Do not move"];
const priorityOptions = ["P1 Critical", "P2 High", "P3 Normal", "P4 Hold"];

function has(value: unknown) { return value !== undefined && value !== null && value !== "" && !(typeof value === "number" && Number.isNaN(value)); }
function hazardSummary(form: TriageForm) { return `Leaks/fluids: ${String(form.leaksFluids ?? "")}; Brake/steering: ${String(form.brakeSteeringConcern ?? "")}; Fire/electrical: ${String(form.fireElectricalRisk ?? "")}`; }
function checked(form: TriageForm) {
  return {
    item_1: has(form.leaksFluids) && has(form.brakeSteeringConcern) && has(form.fireElectricalRisk) && has(form.hazards),
    item_2: has(form.mobility) && has(form.startRunStatus) && has(form.moveMethod),
    item_3: has(form.roadTestDecision) && has(form.roadTestReason) && has(form.roadTestAuthority),
    item_4: has(form.movementRestriction),
    item_5: has(form.priority),
    item_6: has(form.containment) && has(form.physicalHoldLocation),
    item_7: has(form.nextAllowedStage) && has(form.confirmedBy) && form.safetyDecisionConfirmed === true,
  };
}

export function ShopReconSafetyMobilityTriage({ item, lifecycleWorkspace, returnTo }: { item: ShopReconVehicleCardModel; lifecycleWorkspace: ShopReconLifecycleWorkspaceModel; returnTo: string }) {
  const stageIsActive = lifecycleWorkspace.lifecycle.stage === "SAFETY_MOBILITY_TRIAGE";
  const liveStageName = SHOP_RECON_STAGES.find(stage => stage.code === lifecycleWorkspace.lifecycle.stage)?.label ?? lifecycleWorkspace.lifecycle.stage;
  const [form, setForm] = useState<TriageForm>(() => {
    const base: TriageForm = {
      leaksFluids: "No active leak",
      brakeSteeringConcern: "Needs caution",
      fireElectricalRisk: "No fire risk",
      mobility: "Restricted movement",
      startRunStatus: "Starts and runs",
      moveMethod: "Technician or Brock only",
      roadTestDecision: "Pending technician approval",
      roadTestReason: "Brake concern",
      roadTestAuthority: "Walter / Brock",
      movementRestriction: "No customer road test",
      containment: "Park in hold zone",
      physicalHoldLocation: "Safety Hold A",
      priority: "P2 High",
      nextAllowedStage: "Inspection / Concern Verification",
      confirmedBy: "Brock",
      safetyDecisionConfirmed: false,
      ...(lifecycleWorkspace.currentDraft?.formData ?? {}),
    };
    return { ...base, hazards: base.hazards ?? hazardSummary(base) };
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const checklist = useMemo(() => checked(form), [form]);
  const checklistCount = Object.values(checklist).filter(Boolean).length;

  function update(key: string, value: unknown) {
    setForm(current => {
      const next = { ...current, [key]: value };
      return ["leaksFluids", "brakeSteeringConcern", "fireElectricalRisk"].includes(key) ? { ...next, hazards: hazardSummary(next) } : next;
    });
  }
  async function save(complete = false) {
    if (!stageIsActive) {
      setNotice("Stage 5 is locked because this vehicle is not currently in Safety & Mobility Triage. Complete the current live stage first, then return to this form.");
      return;
    }
    const nextForm: TriageForm = complete ? { ...form, safetyDecisionConfirmed: true, confirmedBy: String(form.confirmedBy || "Brock"), hazards: hazardSummary(form) } : { ...form, hazards: hazardSummary(form) };
    const nextChecklist = checked(nextForm);
    if (complete && Object.values(nextChecklist).some(value => !value)) {
      setForm(nextForm);
      setNotice("Complete every Safety & Mobility Triage line before marking the triage decision confirmed.");
      return;
    }
    setForm(nextForm);
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/shop-recon/${item.id}/draft`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stage: "SAFETY_MOBILITY_TRIAGE",
          expectedVersion: lifecycleWorkspace.lifecycle.version,
          idempotencyKey: crypto.randomUUID(),
          reason: complete ? "Completed official Safety & Mobility Triage and confirmed the movement decision." : "Saved official Safety & Mobility Triage draft.",
          checklist: nextChecklist,
          formData: nextForm,
          evidence: ["Safety and mobility triage", `${String(nextForm.priority)} - ${String(nextForm.movementRestriction)}`],
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Safety & Mobility Triage could not be saved.");
      setNotice(complete ? "Safety & Mobility Triage completed. Opening the same vehicle in the next stage." : "Safety & Mobility Triage draft saved.");
      if (complete) window.setTimeout(() => window.location.assign(getNextShopReconStageHref(item.id, "SAFETY_MOBILITY_TRIAGE")), 650);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Safety & Mobility Triage could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="triage-tool-shell">
    <header className="custody-hero"><Link href={returnTo}>← Back to Stage 5</Link><span>Stage 5</span><h1>Safety &amp; Mobility Triage</h1><p>Decide how this vehicle may safely move, be road-tested, or enter inspection.</p></header>
    <section className="custody-stage-strip triage"><i><ClipboardCheck /></i><div><small>Current stage</small><h2>Safety &amp; Mobility Triage</h2><p>Decide how this vehicle may safely move, be road-tested, or enter inspection.</p></div><b>{stageIsActive ? "In Progress" : "Locked"}</b></section>
    {!stageIsActive ? <p className="scope-builder-notice locked">Stage 5 is available for review, but it is locked for saving until this vehicle reaches <b>Safety &amp; Mobility Triage</b>. Current live stage: <b>{liveStageName}</b>.</p> : null}
    {notice ? <p className={`scope-builder-notice${stageIsActive ? "" : " locked"}`}>{notice}</p> : null}
    <section className="custody-layout triage-layout">
      <section className="custody-form-card triage-form-card">
        <h2><ClipboardCheck />Safety &amp; Mobility Triage Form</h2>
        <TriageRow number={1} title="Immediate hazard screen">
          <Field label="Leaks / fluids"><select onChange={event => update("leaksFluids", event.target.value)} value={String(form.leaksFluids ?? "")}>{leakOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
          <Field label="Brake / steering concern"><select onChange={event => update("brakeSteeringConcern", event.target.value)} value={String(form.brakeSteeringConcern ?? "")}>{concernOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
          <Field label="Fire / electrical risk"><select onChange={event => update("fireElectricalRisk", event.target.value)} value={String(form.fireElectricalRisk ?? "")}>{fireOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
        </TriageRow>
        <TriageRow number={2} title="Mobility status">
          <Field label="Vehicle mobility"><select onChange={event => update("mobility", event.target.value)} value={String(form.mobility ?? "")}>{mobilityOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
          <Field label="Start / run status"><select onChange={event => update("startRunStatus", event.target.value)} value={String(form.startRunStatus ?? "")}>{startOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
          <Field label="Move method"><select onChange={event => update("moveMethod", event.target.value)} value={String(form.moveMethod ?? "")}>{moveOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
        </TriageRow>
        <TriageRow number={3} title="Road-test eligibility">
          <Field label="Road test decision"><select onChange={event => update("roadTestDecision", event.target.value)} value={String(form.roadTestDecision ?? "")}>{roadTestOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
          <Field label="Road-test reason"><input onChange={event => update("roadTestReason", event.target.value)} value={String(form.roadTestReason ?? "")} /></Field>
          <Field label="Road-test authority"><input onChange={event => update("roadTestAuthority", event.target.value)} value={String(form.roadTestAuthority ?? "")} /></Field>
        </TriageRow>
        <TriageRow number={4} title="Restriction & containment">
          <Field label="Shop movement restriction"><select onChange={event => update("movementRestriction", event.target.value)} value={String(form.movementRestriction ?? "")}>{restrictionOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
          <Field label="Containment action"><input onChange={event => update("containment", event.target.value)} value={String(form.containment ?? "")} /></Field>
          <Field label="Physical hold location"><input onChange={event => update("physicalHoldLocation", event.target.value)} value={String(form.physicalHoldLocation ?? "")} /></Field>
        </TriageRow>
        <TriageRow number={5} title="Triage decision">
          <Field label="Priority / risk level"><select onChange={event => update("priority", event.target.value)} value={String(form.priority ?? "")}>{priorityOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
          <Field label="Next allowed stage"><select onChange={event => update("nextAllowedStage", event.target.value)} value={String(form.nextAllowedStage ?? "")}><option>Inspection / Concern Verification</option><option>Hold for safety review</option><option>Manager review</option></select></Field>
          <Field label="Confirmed by"><input onChange={event => update("confirmedBy", event.target.value)} value={String(form.confirmedBy ?? "")} /></Field>
        </TriageRow>
        <label className="custody-acceptance"><input checked={form.safetyDecisionConfirmed === true} onChange={event => update("safetyDecisionConfirmed", event.target.checked)} type="checkbox" /><span><b>I confirm the safety and movement decision is clear for this vehicle.</b><small>Checking this box indicates the vehicle has a clear movement, road-test, and inspection boundary.</small></span></label>
      </section>
      <aside className="custody-rail triage-rail">
        <section><h2><CarFront />Current Vehicle Context</h2><p><span>Vehicle</span><b>{item.vehicle} · {item.subject}</b></p><p><span>Lane</span><b>{item.workLaneLabel}</b></p><p><span>Owner</span><b>{item.owner}</b></p><p><span>RO / Reference</span><b>{item.repairOrderNumber}</b></p></section>
        <section><h2><ShieldCheck />Decision Authority</h2><p><span>Authority</span><b>Brock; qualified technician for technical safety findings</b></p></section>
        <section className="triage-priority-card"><h2><AlertTriangle />Constraint &amp; Priority</h2><p><span>Restriction</span><b>{String(form.movementRestriction ?? "Pending")}</b></p><p><span>Priority / risk level</span><b>{String(form.priority ?? "Pending")}</b></p></section>
        <section><h2><ArrowRight />Completion Path</h2><p><span>Next</span><b>Ready for Inspection / Concern Verification</b></p><small>Once safety triage is confirmed, the vehicle can enter inspection under the recorded movement boundary.</small></section>
      </aside>
    </section>
    <section className="custody-stage-checklist triage-stage-checklist"><h2>Stage 5 checklist</h2>{[
      ["Immediate safety hazard screen completed", checklist.item_1],
      ["Mobility status classified", checklist.item_2],
      ["Road-test eligibility decided", checklist.item_3],
      ["Shop movement restriction recorded", checklist.item_4],
      ["Priority / risk level assigned", checklist.item_5],
      ["Required containment action recorded", checklist.item_6],
      ["Safety triage decision confirmed", checklist.item_7],
    ].map(([label, done]) => <p className={done ? "checked" : ""} key={String(label)}><i>{done ? <Check /> : null}</i>{label}</p>)}</section>
    <footer className="scope-builder-actions"><span>{checklistCount}/7 checklist lines cleared</span><button disabled={busy || !stageIsActive} onClick={() => void save(false)} type="button"><Save />Save Triage Draft</button><button className="primary" disabled={busy || !stageIsActive} onClick={() => void save(true)} type="button"><CheckCircle2 />Complete Safety Triage</button></footer>
  </main>;
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label><span>{label}</span>{children}</label>;
}

function TriageRow({ children, number, title }: { children: ReactNode; number: number; title: string }) {
  return <section className="custody-row triage-row"><i>{number}</i><h3>{title}</h3><div>{children}</div></section>;
}
