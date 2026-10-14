"use client";

import { CalendarDays, CarFront, Check, CheckCircle2, ClipboardCheck, FileText, Save, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type { ShopReconLifecycleWorkspaceModel, ShopReconVehicleCardModel } from "@/features/inventory/shop-recon-vehicle-card";
import { getNextShopReconStageHref } from "@/features/inventory/shop-recon-navigation";
import { SHOP_RECON_STAGES } from "@/server/shop-recon/foundation";

type ScopeForm = Record<string, unknown>;

const reasonOptions = ["Customer concern", "Maintenance request", "Warning light", "Noise / vibration", "No-start / drivability", "Comeback / recheck", "Customer requested estimate", "Safety inspection", "Recon inspection", "Mechanical repair", "Cosmetic concern", "Frontline readiness blocker", "Prior inspection follow-up", "QC / rework", "Other"];
const areaOptions = ["Brakes", "Steering / suspension", "Engine / drivetrain", "Electrical / battery", "HVAC", "Tires / wheels", "Fluids / leaks", "Body / cosmetic", "Interior / accessories", "General safety inspection", "Unknown / needs inspection", "Other"];
const allowedOptions = ["Inspect only", "Verify concern only", "Diagnose only", "Estimate only", "Inspect + estimate", "Repair approved up to limit", "Complete inventory recon package", "Safety repair required", "QC / rework only"];
const stopRuleOptions = ["Stop before repair", "Stop before teardown", "Stop before ordering parts", "Stop if estimated cost exceeds limit", "Stop if unsafe to road test", "Stop if sublet/vendor is needed", "Stop if finding is outside original concern", "Stop if inventory recon cost exceeds threshold"];
const approvalOptions = ["Customer through Service Advisor", "Service Advisor", "Brock", "Inventory owner", "Brock / Inventory owner", "General Manager override"];

function has(value: unknown) { return value !== undefined && value !== null && value !== "" && !(typeof value === "number" && Number.isNaN(value)); }
function csv(value: unknown) { return String(value ?? "").split(";").map(item => item.trim()).filter(Boolean); }
function checked(form: ScopeForm) {
  const complete = ["scopeReason", "workAreas", "allowedWork", "stopRules", "safetyConcern", "roadTestAllowed", "partsLikelyNeeded", "subletVendorLikely", "approvalOwner"].every(key => has(form[key]));
  return {
    item_1: has(form.scopeReason),
    item_2: has(form.workAreas),
    item_3: has(form.allowedWork),
    item_4: has(form.stopRules),
    item_5: ["safetyConcern", "roadTestAllowed", "partsLikelyNeeded", "subletVendorLikely"].every(key => has(form[key])),
    item_6: has(form.approvalOwner),
    item_7: complete && form.scopeSummaryReviewed === true && form.scopeReadyForWorkOrder === true,
  };
}

export function ShopReconScopeBuilder({ item, lifecycleWorkspace, returnTo }: { item: ShopReconVehicleCardModel; lifecycleWorkspace: ShopReconLifecycleWorkspaceModel; returnTo: string }) {
  const inventory = item.workLane === "INVENTORY_RECON";
  const stageIsActive = lifecycleWorkspace.lifecycle.stage === "JOB_SCOPE_DEFINITION";
  const liveStageName = SHOP_RECON_STAGES.find(stage => stage.code === lifecycleWorkspace.lifecycle.stage)?.label ?? lifecycleWorkspace.lifecycle.stage;
  const [form, setForm] = useState<ScopeForm>(() => ({
    scopeReason: inventory ? "Recon inspection" : "Customer concern",
    workAreas: inventory ? "Brakes; Safety inspection; Warning light" : "Brakes; Noise / vibration",
    allowedWork: inventory ? "Inspect + estimate" : "Diagnose only",
    approvedLimit: inventory ? "Recon threshold" : "1.0 diagnostic hour",
    stopRules: inventory ? "Stop before repair; Stop if cost exceeds threshold; Stop if sublet/vendor is needed" : "Stop before repair; Stop before teardown; Stop if outside original concern",
    safetyConcern: inventory ? "Yes" : "Unknown",
    roadTestAllowed: "Not sure",
    partsLikelyNeeded: "Unknown",
    subletVendorLikely: "No",
    specialToolsProcedure: "Unknown",
    approvalOwner: inventory ? "Brock / Inventory owner" : "Customer through Service Advisor",
    scopeNotes: inventory ? "Perform inspection and estimate only. Do not repair beyond approved recon threshold." : "Perform diagnosis/estimate only. Do not repair until customer approval.",
    ...(lifecycleWorkspace.currentDraft?.formData ?? {}),
  }));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const checklist = useMemo(() => checked(form), [form]);
  const checklistCount = Object.values(checklist).filter(Boolean).length;
  const scopeSummary: Array<[string, unknown]> = [
    ["Job type:", form.scopeReason],
    ["Work areas:", form.workAreas],
    ["Allowed work:", form.allowedWork],
    ["Stop rule:", form.stopRules],
    ["Approval:", form.approvalOwner],
    ["Next:", "Work Order"],
  ];

  function update(key: string, value: unknown) { setForm(current => ({ ...current, [key]: value })); }
  function toggleList(key: string, value: string) {
    const values = csv(form[key]);
    update(key, values.includes(value) ? values.filter(item => item !== value).join("; ") : [...values, value].join("; "));
  }
  async function save(complete = false) {
    if (!stageIsActive) {
      setNotice("Stage 2 is locked because this vehicle is not currently in Job Scope. Complete the current live stage first, then return to Scope Builder.");
      return;
    }
    const nextForm = complete ? { ...form, scopeSummaryReviewed: true, scopeReadyForWorkOrder: true } : form;
    const nextChecklist = checked(nextForm);
    if (complete && Object.values(nextChecklist).some(value => !value)) {
      setForm(nextForm);
      setNotice("Complete every Scope Builder line before marking the stage ready for Work Order.");
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
          stage: "JOB_SCOPE_DEFINITION",
          expectedVersion: lifecycleWorkspace.lifecycle.version,
          idempotencyKey: crypto.randomUUID(),
          reason: complete ? "Completed official Scope Builder and marked scope ready for Work Order." : "Saved official Scope Builder draft.",
          checklist: nextChecklist,
          formData: nextForm,
          evidence: lifecycleWorkspace.currentDraft?.evidence ?? [],
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Scope Builder could not be saved.");
      setNotice(complete ? "Scope Builder completed. Opening the same vehicle in the next stage." : "Scope Builder draft saved.");
      if (complete) window.setTimeout(() => window.location.assign(getNextShopReconStageHref(item.id, "JOB_SCOPE_DEFINITION")), 650);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Scope Builder could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="scope-builder-tool-shell">
    <header className="scope-builder-hero"><Link href={returnTo}>← Back to Stage 2</Link><h1>Scope Builder</h1><p>Define what the shop is allowed to do before Work Order.</p></header>
    <section className="scope-builder-context"><p><CarFront />Vehicle: <b>{item.vehicle}</b></p><p><ClipboardCheck />Lane: <b>{item.workLaneLabel}</b></p><p><FileText />Source: <b>{inventory ? "Inventory-to-Shop Handoff" : "Intake Form"}</b></p><p><UserRound />Owner: <b>{inventory ? item.owner : item.subject}</b></p><p><CalendarDays />{inventory ? "Frontline Target" : "Promise Target"}: <b>{new Date(item.targetAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</b></p></section>
    {!stageIsActive ? <p className="scope-builder-notice locked">Stage 2 is available for review, but it is locked for saving until this vehicle reaches <b>Job Scope</b>. Current live stage: <b>{liveStageName}</b>.</p> : null}
    {notice ? <p className={`scope-builder-notice${stageIsActive ? "" : " locked"}`}>{notice}</p> : null}
    <section className="scope-builder-layout">
      <section className="scope-builder-form-card">
        <FormRow done={checklist.item_1} title="1. Why is the vehicle here?"><select onChange={event => update("scopeReason", event.target.value)} value={String(form.scopeReason ?? "")}>{reasonOptions.map(option => <option key={option}>{option}</option>)}</select></FormRow>
        <FormRow done={checklist.item_2} title="2. What area does it involve?"><div className="scope-builder-chips">{areaOptions.slice(0, 6).map(option => <button className={csv(form.workAreas).includes(option) ? "selected" : ""} key={option} onClick={() => toggleList("workAreas", option)} type="button">{option}</button>)}</div></FormRow>
        <FormRow done={checklist.item_3} title="3. What is the shop allowed to do?"><select onChange={event => update("allowedWork", event.target.value)} value={String(form.allowedWork ?? "")}>{allowedOptions.map(option => <option key={option}>{option}</option>)}</select></FormRow>
        <FormRow done={checklist.item_4} title="4. When must the technician stop?"><div className="scope-builder-checks">{stopRuleOptions.slice(0, 4).map(option => <label key={option}><input checked={csv(form.stopRules).includes(option)} onChange={() => toggleList("stopRules", option)} type="checkbox" />{option}</label>)}</div></FormRow>
        <FormRow done={checklist.item_5} title="5. Risk check"><div className="scope-builder-risk">{[["safetyConcern", "Safety concern:"], ["roadTestAllowed", "Road test allowed:"], ["partsLikelyNeeded", "Parts likely needed:"], ["subletVendorLikely", "Sublet/vendor likely:"]].map(([key, label]) => <label key={key}><span>{label}</span><select onChange={event => update(key, event.target.value)} value={String(form[key] ?? "")}>{["Yes", "No", "Unknown", "Not sure"].map(option => <option key={option}>{option}</option>)}</select></label>)}</div></FormRow>
        <FormRow done={checklist.item_6} title="6. Approval owner"><select onChange={event => update("approvalOwner", event.target.value)} value={String(form.approvalOwner ?? "")}>{approvalOptions.map(option => <option key={option}>{option}</option>)}</select></FormRow>
      </section>
      <aside className="scope-builder-summary"><h2><ClipboardCheck />Scope Summary</h2>{scopeSummary.map(([label, value]) => <p key={label}><b>{label}</b><span>{has(value) ? String(value) : "Pending"}</span></p>)}</aside>
    </section>
    <section className="scope-builder-notes"><FileText /><div><b>Notes</b><textarea onChange={event => update("scopeNotes", event.target.value)} value={String(form.scopeNotes ?? "")} /></div></section>
    <section className="scope-builder-stage-checklist"><h2>Stage 2 checklist cleared by this form</h2>{[
      ["Reason selected", checklist.item_1],
      ["Work area selected", checklist.item_2],
      ["Allowed work defined", checklist.item_3],
      ["Stop rule defined", checklist.item_4],
      ["Risk check completed", checklist.item_5],
      ["Approval owner named", checklist.item_6],
      ["Scope reviewed and ready", checklist.item_7],
    ].map(([label, done]) => <p className={done ? "checked" : ""} key={String(label)}><i>{done ? <Check /> : null}</i>{label}</p>)}</section>
    <footer className="scope-builder-actions"><span>{checklistCount}/7 checklist lines cleared</span><button disabled={busy || !stageIsActive} onClick={() => void save(false)} type="button"><Save />Save Scope Draft</button><button className="primary" disabled={busy || !stageIsActive} onClick={() => void save(true)} type="button"><CheckCircle2 />Complete Scope Builder</button></footer>
  </main>;
}

function FormRow({ children, done, title }: { children: ReactNode; done: boolean; title: string }) {
  return <section className="scope-builder-row"><i>{done ? <Check /> : null}</i><h2>{title}</h2><div>{children}</div></section>;
}
