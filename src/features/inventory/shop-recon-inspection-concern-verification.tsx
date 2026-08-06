"use client";

import { ArrowRight, CarFront, Check, CheckCircle2, ClipboardCheck, FileSearch, Save, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import type { ShopReconLifecycleWorkspaceModel, ShopReconVehicleCardModel } from "@/features/inventory/shop-recon-vehicle-card";
import { SHOP_RECON_STAGES } from "@/server/shop-recon/foundation";

type InspectionForm = Record<string, unknown>;

const scopeOptions = ["Reviewed", "Needs correction", "Not available"];
const stopOptions = ["Stop before diagnosis", "Stop before repair", "Stop if unsafe", "Stop if outside scope"];
const matchOptions = ["Match confirmed", "Mismatch", "Needs review"];
const inspectorOptions = ["Walter Hernandez", "Brock", "Eli", "Qualified technician"];
const templateOptions = ["Customer concern inspection", "Inventory recon inspection", "Safety follow-up inspection", "General mechanical inspection"];
const checklistOptions = ["Completed", "Partial - blocked", "Not required"];
const concernOptions = ["Verified", "Not reproduced", "Intermittent", "Unsafe to test", "Not applicable"];
const decisionOptions = ["Proceed to Diagnosis", "Proceed to Findings & Repair Plan", "Scope change required", "Hold for manager review"];

function has(value: unknown) { return value !== undefined && value !== null && value !== "" && !(typeof value === "number" && Number.isNaN(value)); }
function summary(form: InspectionForm) {
  return String(form.inspectionSummary || `${String(form.concernStatus ?? "Concern outcome pending")} during ${String(form.testCondition ?? "recorded inspection condition")}. ${String(form.measurementsRecorded ?? "")}`.trim());
}
function checked(form: InspectionForm) {
  return {
    item_1: ["scopePacket", "workOrderOperations", "stopRule"].every(key => has(form[key])),
    item_2: form.vinRoMatch === "Match confirmed" && Number(form.odometer) > 0 && has(form.inspector),
    item_3: ["inspectionTemplate", "inspectionChecklistStatus", "safetyItems"].every(key => has(form[key])),
    item_4: ["concernStatus", "testCondition"].every(key => has(form[key])) && has(summary(form)),
    item_5: has(form.measurementsRecorded),
    item_6: has(form.inspectionEvidence),
    item_7: has(form.nextDecision) && form.inspectionPacketComplete === true,
  };
}

export function ShopReconInspectionConcernVerification({ item, lifecycleWorkspace, returnTo }: { item: ShopReconVehicleCardModel; lifecycleWorkspace: ShopReconLifecycleWorkspaceModel; returnTo: string }) {
  const stageIsActive = lifecycleWorkspace.lifecycle.stage === "INSPECTION_CONCERN_VERIFICATION";
  const liveStageName = SHOP_RECON_STAGES.find(stage => stage.code === lifecycleWorkspace.lifecycle.stage)?.label ?? lifecycleWorkspace.lifecycle.stage;
  const [form, setForm] = useState<InspectionForm>(() => ({
    scopePacket: "Reviewed",
    workOrderOperations: item.concern || "Concern / recon operation",
    stopRule: "Stop before repair",
    vinRoMatch: "Match confirmed",
    odometer: 84216,
    inspector: "Walter Hernandez",
    inspectionTemplate: item.workLane === "INVENTORY_RECON" ? "Inventory recon inspection" : "Customer concern inspection",
    inspectionChecklistStatus: "Completed",
    safetyItems: "Safety items reviewed",
    concernStatus: "Verified",
    testCondition: "Controlled inspection",
    inspectionSummary: "Concern verified and inspection findings recorded.",
    measurementsRecorded: "Measurements and observations recorded.",
    inspectionEvidence: "Photos / scan evidence attached",
    nextDecision: "Proceed to Diagnosis",
    inspectionPacketComplete: false,
    ...(lifecycleWorkspace.currentDraft?.formData ?? {}),
  }));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const checklist = useMemo(() => checked(form), [form]);
  const checklistCount = Object.values(checklist).filter(Boolean).length;

  function update(key: string, value: unknown) {
    setForm(current => ({ ...current, [key]: value }));
  }
  async function save(complete = false) {
    if (!stageIsActive) {
      setNotice("Stage 6 is locked because this vehicle is not currently in Inspection & Concern Verification. Complete the current live stage first, then return to this form.");
      return;
    }
    const nextForm: InspectionForm = complete ? { ...form, inspectionPacketComplete: true, inspectionSummary: summary(form) } : { ...form, inspectionSummary: summary(form) };
    const nextChecklist = checked(nextForm);
    if (complete && Object.values(nextChecklist).some(value => !value)) {
      setForm(nextForm);
      setNotice("Complete every Inspection & Concern Verification line before submitting the inspection result.");
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
          stage: "INSPECTION_CONCERN_VERIFICATION",
          expectedVersion: lifecycleWorkspace.lifecycle.version,
          idempotencyKey: crypto.randomUUID(),
          reason: complete ? "Completed official Inspection & Concern Verification and submitted the inspection result." : "Saved official Inspection & Concern Verification draft.",
          checklist: nextChecklist,
          formData: nextForm,
          evidence: ["Versioned inspection", String(nextForm.inspectionEvidence || "Concern-verification evidence")],
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Inspection & Concern Verification could not be saved.");
      setNotice(complete ? "Inspection & Concern Verification completed. Returning to the vehicle card for Stage 6 review." : "Inspection & Concern Verification draft saved.");
      if (complete) window.setTimeout(() => window.location.assign(returnTo), 650);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Inspection & Concern Verification could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="inspection-tool-shell">
    <header className="custody-hero"><Link href={returnTo}>Back to Stage 6</Link><span>Stage 6</span><h1>Inspection &amp; Concern Verification</h1><p>Verify the exact concern, capture measurements, and submit the inspection result.</p></header>
    <section className="custody-stage-strip inspection"><i><FileSearch /></i><div><small>Current stage</small><h2>Inspection &amp; Concern Verification</h2><p>Confirm what is observed before diagnosis or repair planning begins.</p></div><b>{stageIsActive ? "In Progress" : "Locked"}</b></section>
    {!stageIsActive ? <p className="scope-builder-notice locked">Stage 6 is available for review, but it is locked for saving until this vehicle reaches <b>Inspection &amp; Concern Verification</b>. Current live stage: <b>{liveStageName}</b>.</p> : null}
    {notice ? <p className={`scope-builder-notice${stageIsActive ? "" : " locked"}`}>{notice}</p> : null}
    <section className="custody-layout inspection-layout">
      <section className="custody-form-card inspection-form-card">
        <h2><ClipboardCheck />Inspection &amp; Concern Verification Form</h2>
        <InspectionRow number={1} title="Scope control">
          <Field label="Scope packet"><select onChange={event => update("scopePacket", event.target.value)} value={String(form.scopePacket ?? "")}>{scopeOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
          <Field label="Work-order operation(s)"><input onChange={event => update("workOrderOperations", event.target.value)} value={String(form.workOrderOperations ?? "")} /></Field>
          <Field label="Stop rule"><select onChange={event => update("stopRule", event.target.value)} value={String(form.stopRule ?? "")}>{stopOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
        </InspectionRow>
        <InspectionRow number={2} title="Vehicle verification">
          <Field label="VIN / RO match"><select onChange={event => update("vinRoMatch", event.target.value)} value={String(form.vinRoMatch ?? "")}>{matchOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
          <Field label="Observed odometer"><input onChange={event => update("odometer", event.target.valueAsNumber)} type="number" value={typeof form.odometer === "number" ? form.odometer : Number(form.odometer) || ""} /></Field>
          <Field label="Inspector"><select onChange={event => update("inspector", event.target.value)} value={String(form.inspector ?? "")}>{inspectorOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
        </InspectionRow>
        <InspectionRow number={3} title="Inspection checklist">
          <Field label="Inspection template"><select onChange={event => update("inspectionTemplate", event.target.value)} value={String(form.inspectionTemplate ?? "")}>{templateOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
          <Field label="Checklist status"><select onChange={event => update("inspectionChecklistStatus", event.target.value)} value={String(form.inspectionChecklistStatus ?? "")}>{checklistOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
          <Field label="Safety items observed"><input onChange={event => update("safetyItems", event.target.value)} value={String(form.safetyItems ?? "")} /></Field>
        </InspectionRow>
        <InspectionRow number={4} title="Concern outcome">
          <Field label="Concern verification"><select onChange={event => update("concernStatus", event.target.value)} value={String(form.concernStatus ?? "")}>{concernOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
          <Field label="Test condition"><input onChange={event => update("testCondition", event.target.value)} value={String(form.testCondition ?? "")} /></Field>
          <Field label="Next decision"><select onChange={event => update("nextDecision", event.target.value)} value={String(form.nextDecision ?? "")}>{decisionOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
        </InspectionRow>
        <section className="inspection-notes-grid">
          <label><span>Inspection findings</span><textarea onChange={event => update("inspectionSummary", event.target.value)} value={String(form.inspectionSummary ?? "")} /></label>
          <label><span>Measurements / observations</span><textarea onChange={event => update("measurementsRecorded", event.target.value)} value={String(form.measurementsRecorded ?? "")} /></label>
          <label><span>Photo / video / scan evidence</span><input onChange={event => update("inspectionEvidence", event.target.value)} value={String(form.inspectionEvidence ?? "")} /></label>
        </section>
        <label className="custody-acceptance"><input checked={form.inspectionPacketComplete === true} onChange={event => update("inspectionPacketComplete", event.target.checked)} type="checkbox" /><span><b>I confirm the inspection result is complete and ready for the next decision.</b><small>This clears Stage 6 only after the required inspection facts and evidence are recorded.</small></span></label>
      </section>
      <aside className="custody-rail inspection-rail">
        <section><h2><CarFront />Current Vehicle Context</h2><p><span>Vehicle</span><b>{item.vehicle} - {item.subject}</b></p><p><span>Lane</span><b>{item.workLaneLabel}</b></p><p><span>Owner</span><b>{item.owner}</b></p><p><span>RO / Reference</span><b>{item.repairOrderNumber}</b></p></section>
        <section><h2><ShieldCheck />Decision Authority</h2><p><span>Technical</span><b>Walter Hernandez</b></p><p><span>Shop control</span><b>Brock; Eli as backup</b></p></section>
        <section className="inspection-outcome-card"><h2><Wrench />Inspection Outcome</h2><p><span>Outcome</span><b>{String(form.concernStatus ?? "Pending")}</b></p><p><span>Next decision</span><b>{String(form.nextDecision ?? "Pending")}</b></p></section>
        <section><h2><ArrowRight />Completion Path</h2><p><span>Next</span><b>{String(form.nextDecision ?? "Proceed to Diagnosis")}</b></p><small>If the concern cannot be verified or the scope changes, the card should stop here and return to the correct decision path instead of drifting into repair.</small></section>
      </aside>
    </section>
    <section className="custody-stage-checklist inspection-stage-checklist"><h2>Stage 6 checklist</h2>{[
      ["Scope and work order reviewed", checklist.item_1],
      ["Vehicle identity and odometer confirmed", checklist.item_2],
      ["Required inspection checklist completed", checklist.item_3],
      ["Concern verified or outcome classified", checklist.item_4],
      ["Measurements and observations recorded", checklist.item_5],
      ["Photo / video / scan evidence attached", checklist.item_6],
      ["Inspection result submitted for next decision", checklist.item_7],
    ].map(([label, done]) => <p className={done ? "checked" : ""} key={String(label)}><i>{done ? <Check /> : null}</i>{label}</p>)}</section>
    <footer className="scope-builder-actions"><span>{checklistCount}/7 checklist lines cleared</span><button disabled={busy || !stageIsActive} onClick={() => void save(false)} type="button"><Save />Save Inspection Draft</button><button className="primary" disabled={busy || !stageIsActive} onClick={() => void save(true)} type="button"><CheckCircle2 />Complete Inspection</button></footer>
  </main>;
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label><span>{label}</span>{children}</label>;
}

function InspectionRow({ children, number, title }: { children: ReactNode; number: number; title: string }) {
  return <section className="custody-row inspection-row"><i>{number}</i><h3>{title}</h3><div>{children}</div></section>;
}
