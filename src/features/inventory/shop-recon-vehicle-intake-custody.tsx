"use client";

import { Save } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore, type ReactNode } from "react";

import type { ShopReconLifecycleWorkspaceModel, ShopReconVehicleCardModel } from "@/features/inventory/shop-recon-vehicle-card";
import styles from "./shop-recon-lifecycle.module.css";
import { SHOP_RECON_STAGES } from "@/server/shop-recon/foundation";

type IntakeForm = Record<string, unknown>;

const conditionOptions = ["As-is", "Normal", "Damage observed", "Movement restricted"];
const matchOptions = ["Match confirmed", "Mismatch", "Needs review"];
const restrictionOptions = ["No restriction", "No Move – Shop Custody", "Move only with Brock", "Do not move"];
const subscribeToHydration = () => () => {};

function has(value: unknown) { return value !== undefined && value !== null && (typeof value !== "string" || value.trim().length > 0) && !(typeof value === "number" && Number.isNaN(value)); }
function checked(form: IntakeForm) {
  return {
    item_1: has(form.observedIdentifier) && form.matchStatus === "Match confirmed",
    item_2: has(form.arrivalCondition) && has(form.intakeNotes),
    item_3: Number.isInteger(Number(form.keyCount)) && Number(form.keyCount) >= 1 && Number(form.keyCount) <= 20 && has(form.keyTag),
    item_4: has(form.photoEvidence),
    item_5: has(form.custodyLocation),
    item_6: has(form.movementRestriction),
    item_7: has(form.custodyAcceptedBy) && form.custodyAccepted === true,
  };
}

export function ShopReconVehicleIntakeCustody({ item, lifecycleWorkspace, returnTo }: { item: ShopReconVehicleCardModel; lifecycleWorkspace: ShopReconLifecycleWorkspaceModel; returnTo: string }) {
  const stageIsActive = lifecycleWorkspace.lifecycle.stage === "VEHICLE_INTAKE_CUSTODY";
  const liveStageName = SHOP_RECON_STAGES.find(stage => stage.code === lifecycleWorkspace.lifecycle.stage)?.label ?? lifecycleWorkspace.lifecycle.stage;
  const canSave = stageIsActive && lifecycleWorkspace.permissions.canSave && item.stage !== "CLOSED" && lifecycleWorkspace.lifecycle.operatingState !== "CLOSED";
  const interactive = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [form, setForm] = useState<IntakeForm>(() => ({
    decodedVehicle: item.vehicle,
    ...(stageIsActive ? lifecycleWorkspace.currentDraft?.formData : {}),
  }));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  function update(key: string, value: unknown) { setForm(current => ({ ...current, [key]: value })); }
  async function save() {
    if (!canSave || busy) return;
    const nextChecklist = checked(form);
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
          reason: "Saved observed vehicle intake and custody facts.",
          checklist: nextChecklist,
          formData: form,
          evidence: has(form.photoEvidence) ? ["Vehicle intake record", String(form.photoEvidence).trim()] : [],
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Vehicle Intake & Custody could not be saved.");
      window.location.assign(returnTo);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Vehicle Intake & Custody could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <main className={`custody-tool-shell ${styles.custody}`}>
    <header className={styles.header}><Link href={returnTo}>Back to Shop &amp; Recon</Link><h1>Vehicle Intake &amp; Custody</h1><strong>{item.vehicle} · {item.repairOrderNumber}</strong><p>Confirm identity and record actual condition, keys, and location.</p></header>
    {!stageIsActive ? <p className="scope-builder-notice locked">Read only. Current task: {liveStageName}.</p> : !canSave ? <p className="scope-builder-notice locked">You can view this record. A staff member with custody access must save changes.</p> : null}
    {notice && <p className="scope-builder-notice" role="alert">{notice}</p>}
    <form className={styles.custodyForm} onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset className="custody-form-card" disabled={!canSave || !interactive || busy}>
        <CustodyRow number={1} title="Match the vehicle">
          <Field label="Observed VIN / stock / RO"><input onChange={event => update("observedIdentifier", event.target.value)} value={String(form.observedIdentifier ?? "")} /></Field>
          <Field label="Match status"><select onChange={event => update("matchStatus", event.target.value)} value={String(form.matchStatus ?? "")}><option value="">Select</option>{matchOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
        </CustodyRow>
        <CustodyRow number={2} title="Keys & custody">
          <Field label="Keys received"><input min="0" max="20" onChange={event => update("keyCount", event.target.valueAsNumber)} type="number" value={has(form.keyCount) && Number.isFinite(Number(form.keyCount)) ? Number(form.keyCount) : ""} /></Field>
          <Field label="Key tag / locker"><input onChange={event => update("keyTag", event.target.value)} value={String(form.keyTag ?? "")} /></Field>
          <Field label="Custody accepted by"><select onChange={event => update("custodyAcceptedBy", event.target.value)} value={String(form.custodyAcceptedBy ?? "")}><option value="">Select staff</option><option>Brock</option><option>Eli</option></select></Field>
        </CustodyRow>
        <CustodyRow number={3} title="Arrival condition">
          <Field label="Arrival condition"><select onChange={event => update("arrivalCondition", event.target.value)} value={String(form.arrivalCondition ?? "")}><option value="">Select</option>{conditionOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
          <Field label="Visible damage notes"><input onChange={event => update("intakeNotes", event.target.value)} value={String(form.intakeNotes ?? "")} /></Field>
          <Field label="Photo evidence"><input onChange={event => update("photoEvidence", event.target.value)} value={String(form.photoEvidence ?? "")} /></Field>
        </CustodyRow>
        <CustodyRow number={4} title="Physical location">
          <Field label="Current zone / lot position"><input onChange={event => update("custodyLocation", event.target.value)} value={String(form.custodyLocation ?? "")} /></Field>
          <Field label="Move restriction"><select onChange={event => update("movementRestriction", event.target.value)} value={String(form.movementRestriction ?? "")}><option value="">Select</option>{restrictionOptions.map(option => <option key={option}>{option}</option>)}</select></Field>
        </CustodyRow>
        <label className="custody-acceptance"><input checked={form.custodyAccepted === true} onChange={event => update("custodyAccepted", event.target.checked)} type="checkbox" /><span><b>I confirm this exact vehicle is now under Shop custody.</b><small>Checking this box indicates acceptance of physical custody and responsibility.</small></span></label>
      </fieldset>
      {canSave && <footer className={styles.taskActions}><button className={styles.primary} disabled={!interactive || busy} type="submit"><Save size={16} />{busy ? "Saving…" : "Save custody & return"}</button><small>Saving does not advance the stage.</small></footer>}
    </form>
  </main>;
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label><span>{label}</span>{children}</label>;
}

function CustodyRow({ children, number, title }: { children: ReactNode; number: number; title: string }) {
  return <section className="custody-row"><i>{number}</i><h3>{title}</h3><div>{children}</div></section>;
}
