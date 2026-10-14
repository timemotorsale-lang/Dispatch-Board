"use client";

import { ArrowRight, CarFront, Check, CheckCircle2, ClipboardCheck, Save, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import type { ShopReconLifecycleWorkspaceModel, ShopReconVehicleCardModel } from "@/features/inventory/shop-recon-vehicle-card";
import { getNextShopReconStageHref } from "@/features/inventory/shop-recon-navigation";
import { SHOP_RECON_STAGES } from "@/server/shop-recon/foundation";

type IntakeForm = Record<string, unknown>;

const conditionOptions = ["As-is", "Normal", "Damage observed", "Movement restricted"];
const matchOptions = ["Match confirmed", "Mismatch", "Needs review"];
const restrictionOptions = ["No restriction", "No Move – Shop Custody", "Move only with Brock", "Do not move"];

function has(value: unknown) { return value !== undefined && value !== null && value !== "" && !(typeof value === "number" && Number.isNaN(value)); }
function checked(form: IntakeForm) {
  return {
    item_1: has(form.observedIdentifier) && form.matchStatus === "Match confirmed",
    item_2: has(form.arrivalCondition) && has(form.intakeNotes),
    item_3: Number(form.keyCount) > 0 && has(form.keyTag),
    item_4: has(form.photoEvidence),
    item_5: has(form.custodyLocation),
    item_6: has(form.movementRestriction),
    item_7: has(form.custodyAcceptedBy) && form.custodyAccepted === true,
  };
}

export function ShopReconVehicleIntakeCustody({ item, lifecycleWorkspace, returnTo }: { item: ShopReconVehicleCardModel; lifecycleWorkspace: ShopReconLifecycleWorkspaceModel; returnTo: string }) {
  const inventory = item.workLane === "INVENTORY_RECON";
  const stageIsActive = lifecycleWorkspace.lifecycle.stage === "VEHICLE_INTAKE_CUSTODY";
  const liveStageName = SHOP_RECON_STAGES.find(stage => stage.code === lifecycleWorkspace.lifecycle.stage)?.label ?? lifecycleWorkspace.lifecycle.stage;
  const [form, setForm] = useState<IntakeForm>(() => ({
    observedIdentifier: item.vin ?? item.repairOrderNumber,
    decodedVehicle: item.vehicle,
    matchStatus: "Match confirmed",
    keyCount: 2,
    keyTag: "KT-0417",
    custodyAcceptedBy: "Brock",
    arrivalCondition: "As-is",
    intakeNotes: "Minor scuffs on front bumper; RR door ding",
    photoEvidence: "Upload photos (3)",
    custodyLocation: inventory ? "Inventory Lot A" : "Customer Drop-Off",
    movementRestriction: "No Move – Shop Custody",
    bayNeeded: "Yes",
    custodyAccepted: false,
    ...(lifecycleWorkspace.currentDraft?.formData ?? {}),
  }));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const checklist = useMemo(() => checked(form), [form]);
  const checklistCount = Object.values(checklist).filter(Boolean).length;

  function update(key: string, value: unknown) { setForm(current => ({ ...current, [key]: value })); }
  async function save(complete = false) {
    if (!stageIsActive) {
      setNotice("Stage 4 is locked because this vehicle is not currently in Vehicle Intake & Custody. Complete the current live stage first, then return to this form.");
      return;
    }
    const nextForm = complete ? { ...form, custodyAccepted: true, custodyAcceptedBy: String(form.custodyAcceptedBy || "Brock") } : form;
    const nextChecklist = checked(nextForm);
    if (complete && Object.values(nextChecklist).some(value => !value)) {
      setForm(nextForm);
      setNotice("Complete every Vehicle Intake & Custody line before marking custody accepted.");
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
          stage: "VEHICLE_INTAKE_CUSTODY",
          expectedVersion: lifecycleWorkspace.lifecycle.version,
          idempotencyKey: crypto.randomUUID(),
          reason: complete ? "Completed official Vehicle Intake & Custody and accepted Shop custody." : "Saved official Vehicle Intake & Custody draft.",
          checklist: nextChecklist,
          formData: nextForm,
          evidence: ["Vehicle intake record", String(nextForm.photoEvidence || "Key, condition and custody evidence")],
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Vehicle Intake & Custody could not be saved.");
      setNotice(complete ? "Vehicle Intake & Custody completed. Opening the same vehicle in the next stage." : "Vehicle Intake & Custody draft saved.");
      if (complete) window.setTimeout(() => window.location.assign(getNextShopReconStageHref(item.id, "VEHICLE_INTAKE_CUSTODY")), 650);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Vehicle Intake & Custody could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="custody-tool-shell">
    <header className="custody-hero"><Link href={returnTo}>← Back to Stage 4</Link><span>Stage 4</span><h1>Vehicle Intake &amp; Custody</h1><p>Confirm the exact vehicle is physically here and under shop control.</p></header>
    <section className="custody-stage-strip"><i><ClipboardCheck /></i><div><small>Current stage</small><h2>Vehicle Intake &amp; Custody</h2><p>Confirm the exact vehicle is physically here and under shop control.</p></div><b>{stageIsActive ? "In Progress" : "Locked"}</b></section>
    {!stageIsActive ? <p className="scope-builder-notice locked">Stage 4 is available for review, but it is locked for saving until this vehicle reaches <b>Vehicle Intake &amp; Custody</b>. Current live stage: <b>{liveStageName}</b>.</p> : null}
    {notice ? <p className={`scope-builder-notice${stageIsActive ? "" : " locked"}`}>{notice}</p> : null}
    <section className="custody-layout">
      <section className="custody-form-card">
        <h2><ClipboardCheck />Physical Check-In Form</h2>
        <CustodyRow number={1} title="Match the vehicle">
          <Field label="Observed VIN / stock / RO"><input onChange={event => update("observedIdentifier", event.target.value)} value={String(form.observedIdentifier ?? "")} /></Field>
          <Field label="Decoded vehicle"><input onChange={event => update("decodedVehicle", event.target.value)} value={String(form.decodedVehicle ?? "")} /></Field>
          <Field label="Match status"><select onChange={event => update("matchStatus", event.target.value)} value={String(form.matchStatus ?? "")}>{matchOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
        </CustodyRow>
        <CustodyRow number={2} title="Keys & custody">
          <Field label="Keys received"><input min="0" onChange={event => update("keyCount", event.target.valueAsNumber)} type="number" value={Number(form.keyCount ?? 0)} /></Field>
          <Field label="Key tag / locker"><input onChange={event => update("keyTag", event.target.value)} value={String(form.keyTag ?? "")} /></Field>
          <Field label="Custody accepted by"><select onChange={event => update("custodyAcceptedBy", event.target.value)} value={String(form.custodyAcceptedBy ?? "")}><option>Brock</option><option>Eli</option></select></Field>
        </CustodyRow>
        <CustodyRow number={3} title="Arrival condition">
          <Field label="Arrival condition"><select onChange={event => update("arrivalCondition", event.target.value)} value={String(form.arrivalCondition ?? "")}>{conditionOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
          <Field label="Visible damage notes"><input onChange={event => update("intakeNotes", event.target.value)} value={String(form.intakeNotes ?? "")} /></Field>
          <Field label="Photo evidence"><input onChange={event => update("photoEvidence", event.target.value)} value={String(form.photoEvidence ?? "")} /></Field>
        </CustodyRow>
        <CustodyRow number={4} title="Physical location">
          <Field label="Current zone / lot position"><input onChange={event => update("custodyLocation", event.target.value)} value={String(form.custodyLocation ?? "")} /></Field>
          <Field label="Move restriction"><select onChange={event => update("movementRestriction", event.target.value)} value={String(form.movementRestriction ?? "")}>{restrictionOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
          <Field label="Bay needed"><select onChange={event => update("bayNeeded", event.target.value)} value={String(form.bayNeeded ?? "")}><option>Yes</option><option>No</option><option>Unknown</option></select></Field>
        </CustodyRow>
        <label className="custody-acceptance"><input checked={form.custodyAccepted === true} onChange={event => update("custodyAccepted", event.target.checked)} type="checkbox" /><span><b>I confirm this exact vehicle is now under Shop custody.</b><small>Checking this box indicates acceptance of physical custody and responsibility.</small></span></label>
      </section>
      <aside className="custody-rail">
        <section><h2><CarFront />Current Vehicle Context</h2><p><span>Vehicle</span><b>{item.vehicle} · {item.subject}</b></p><p><span>Lane</span><b>{item.workLaneLabel}</b></p><p><span>Owner</span><b>{item.owner}</b></p><p><span>RO / Reference</span><b>{item.repairOrderNumber}</b></p></section>
        <section><h2><ShieldCheck />Decision Authority</h2><p><span>Primary</span><b>Brock</b></p><p><span>Backup</span><b>Eli as backup</b></p><small>Only authorized users can complete this stage.</small></section>
        <section><h2><ArrowRight />Completion Path</h2><p><span>Next stage</span><b>Ready for Safety &amp; Mobility Triage</b></p><small>Once custody is accepted and all items are complete, the vehicle can advance to the next stage.</small></section>
      </aside>
    </section>
    <section className="custody-stage-checklist"><h2>Stage 4 checklist</h2>{[
      ["Vehicle identity matched", checklist.item_1],
      ["Arrival condition recorded", checklist.item_2],
      ["Keys counted and tagged", checklist.item_3],
      ["Photos/evidence captured", checklist.item_4],
      ["Physical location assigned", checklist.item_5],
      ["Movement restriction noted", checklist.item_6],
      ["Custody accepted", checklist.item_7],
    ].map(([label, done]) => <p className={done ? "checked" : ""} key={String(label)}><i>{done ? <Check /> : null}</i>{label}</p>)}</section>
    <footer className="scope-builder-actions"><span>{checklistCount}/7 checklist lines cleared</span><button disabled={busy || !stageIsActive} onClick={() => void save(false)} type="button"><Save />Save Custody Draft</button><button className="primary" disabled={busy || !stageIsActive} onClick={() => void save(true)} type="button"><CheckCircle2 />Complete Vehicle Intake</button></footer>
  </main>;
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label><span>{label}</span>{children}</label>;
}

function CustodyRow({ children, number, title }: { children: ReactNode; number: number; title: string }) {
  return <section className="custody-row"><i>{number}</i><h3>{title}</h3><div>{children}</div></section>;
}
