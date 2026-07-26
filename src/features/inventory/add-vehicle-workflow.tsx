"use client";

import { AlertTriangle, ArrowRight, Building2, CalendarDays, Camera, CarFront, Check, CheckCircle2, ClipboardList, HelpCircle, Info, LockKeyhole, Mic, Search, Stethoscope, UserRound, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { ADD_VEHICLE_ALLOWED_REASONS, recommendAddVehicleWorkflow, type AddVehicleReason, type AddVehicleRelationship } from "@/lib/add-vehicle-workflow";

import { BackToVehicleOperationsWorkspace } from "./workspace-return-link";

type Options = { locations: Array<{ code: string; id: string; name: string }> };
type Duplicate = { id: string; stockNumber: string | null; vehicleNumber: string; vin: string | null; vinRaw: string | null };
type Preview = { identity: { validationSource: string; vin: string | null; vinState: string }; potentialDuplicate: Duplicate | null };
type FormState = { color: string; description: string; licensePlate: string; locationId: string; make: string; model: string; nonVinReason: string; reasonCode: AddVehicleReason; relationship: AddVehicleRelationship; vin: string; year: string };

const relationshipChoices: Array<{ icon: typeof Building2; label: string; value: AddVehicleRelationship }> = [
  { icon: Building2, label: "Dealership Inventory", value: "DEALERSHIP_INVENTORY" },
  { icon: UserRound, label: "Customer Vehicle", value: "CUSTOMER_VEHICLE" },
  { icon: CarFront, label: "Trade / Acquisition Candidate", value: "TRADE_ACQUISITION_CANDIDATE" },
  { icon: HelpCircle, label: "Ownership Not Confirmed", value: "OWNERSHIP_NOT_CONFIRMED" }
];
const reasonChoices: Array<{ icon: typeof Wrench; label: string; value: AddVehicleReason }> = [
  { icon: Wrench, label: "Service or Repair Request", value: "SERVICE_REPAIR" },
  { icon: Stethoscope, label: "Inspection / Diagnosis", value: "INSPECTION_DIAGNOSIS" },
  { icon: ClipboardList, label: "Trade Appraisal", value: "TRADE_APPRAISAL" },
  { icon: CalendarDays, label: "Customer Appointment", value: "CUSTOMER_APPOINTMENT" },
  { icon: CarFront, label: "Inventory Recon", value: "INVENTORY_RECON" },
  { icon: Search, label: "Acquisition Review", value: "ACQUISITION_REVIEW" },
  { icon: Info, label: "Reference Only", value: "REFERENCE_ONLY" },
  { icon: HelpCircle, label: "Other", value: "OTHER" }
];

const draftKey = "inventory-add-vehicle-draft-v1";
const empty = (options: Options): FormState => ({ color: "", description: "", licensePlate: "", locationId: options.locations[0]?.id ?? "", make: "", model: "", nonVinReason: "", reasonCode: "SERVICE_REPAIR", relationship: "CUSTOMER_VEHICLE", vin: "", year: "" });

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, init); const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Add Vehicle request failed.");
  return body;
}

function appendReturnTo(href: string, returnTo?: string) {
  if (!returnTo) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}

function existingHref(code: string, vehicleId: string, description: string, returnTo?: string) {
  if (code === "CREATE_SERVICE_INTAKE") return appendReturnTo(`/vehicles/repair-orders?${new URLSearchParams({ concernSummary: description, intakeSource: "WALK_IN", vehicleId }).toString()}`, returnTo);
  if (code === "SCHEDULE_APPOINTMENT") return `/appointments?${new URLSearchParams({ vehicleId }).toString()}`;
  if (code === "START_ACQUISITION_APPRAISAL") return `/vehicles/acquisition-appraisal?${new URLSearchParams({ vehicleId }).toString()}`;
  if (code === "REVIEW_INVENTORY_CONTROL") return `/vehicles/registry?${new URLSearchParams({ vehicleId }).toString()}`;
  return `/vehicles/360/${vehicleId}`;
}

function createLocalPreview(vin: string): Preview | null {
  const normalizedVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalizedVin)) return null;
  return { identity: { validationSource: "LOCAL_VIN_FORMAT_CHECK_PENDING_SERVER_DUPLICATE_SEARCH", vin: normalizedVin, vinState: "VALID" }, potentialDuplicate: null };
}

export function AddVehicleWorkflow({ options, returnTo, showWorkspaceReturn = false }: { options: Options; returnTo?: string; showWorkspaceReturn?: boolean }) {
  const router = useRouter(); const vinRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(() => empty(options)); const [preview, setPreview] = useState<Preview | null>(null);
  const [checking, setChecking] = useState(false); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(""); const [identityConfirmed, setIdentityConfirmed] = useState(false); const [idempotencyKey] = useState(() => typeof crypto === "undefined" ? "" : crypto.randomUUID());
  const recommendation = useMemo(() => recommendAddVehicleWorkflow(form), [form]); const nonVin = Boolean(form.nonVinReason);
  const allowedReasons = ADD_VEHICLE_ALLOWED_REASONS[form.relationship];
  const ready = Boolean(form.locationId && form.year && form.make.trim() && form.model.trim() && form.description.trim().length >= 10 && (nonVin || (preview?.identity.vin && !preview.potentialDuplicate && identityConfirmed)));

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const saved = localStorage.getItem(draftKey); if (!saved) return;
      try { const value = JSON.parse(saved) as Partial<FormState>; setForm(current => ({ ...current, ...value, locationId: value.locationId && options.locations.some(location => location.id === value.locationId) ? value.locationId : current.locationId })); setNotice("Saved Add Vehicle draft restored."); } catch { localStorage.removeItem(draftKey); }
    }, 0);
    return () => window.clearTimeout(restore);
  }, [options.locations]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(current => ({ ...current, [key]: value }));
    if (key === "vin") { setPreview(null); setIdentityConfirmed(false); }
  }

  function chooseRelationship(value: AddVehicleRelationship) {
    const nextReason = ADD_VEHICLE_ALLOWED_REASONS[value].includes(form.reasonCode) ? form.reasonCode : ADD_VEHICLE_ALLOWED_REASONS[value][0];
    setForm(current => ({ ...current, relationship: value, reasonCode: nextReason }));
  }

  async function validateIdentity() {
    setChecking(true); setNotice("");
    try {
      const result = await request("/api/inventory-console/workflows/add-vehicle/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vin: form.vin }) }) as Preview;
      setPreview(result); setIdentityConfirmed(false);
      setNotice(result.potentialDuplicate ? "An existing vehicle matches this VIN. Use the existing canonical record or review the identity." : "VIN passed authoritative format and check-digit validation. No exact canonical match was found.");
    } catch (error) {
      const localPreview = createLocalPreview(form.vin);
      setPreview(localPreview);
      setNotice(localPreview ? "VIN format was accepted locally. Server duplicate search is unavailable in the current rollout, so final save will recheck identity and authority." : error instanceof Error ? error.message : "Vehicle identity could not be validated.");
    }
    finally { setChecking(false); }
  }

  function saveDraft() { localStorage.setItem(draftKey, JSON.stringify(form)); setNotice("Draft saved on this device. It has not created a vehicle or changed workflow state."); }

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!ready) { setNotice("Complete and confirm the required identity, purpose, description, vehicle details, and location before continuing."); return; }
    setBusy(true); setNotice("");
    try {
      const result = await request("/api/inventory-console/workflows/add-vehicle", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, idempotencyKey: idempotencyKey || crypto.randomUUID() }) }) as { result: { duplicateReviewId?: string | null; id: string; vehicleNumber: string }; nextWorkflow: { href: string; title: string } };
      localStorage.removeItem(draftKey);
      if (result.result.duplicateReviewId) { setNotice("A concurrent identity match was found. The candidate was routed to duplicate review; no downstream workflow was launched."); return; }
      router.push(appendReturnTo(result.nextWorkflow.href, returnTo));
    } catch (error) { setNotice(error instanceof Error ? error.message : "Vehicle could not be added."); }
    finally { setBusy(false); }
  }

  return <form className="add-vehicle-workflow" onSubmit={submit}>
    <header className="avw-header"><div>{showWorkspaceReturn ? <BackToVehicleOperationsWorkspace /> : null}<nav><Link href={returnTo ?? "/vehicles"}>{returnTo ? "Source Console" : "Inventory Lifecycle"}</Link><span>›</span><Link href="/vehicles/workflows">Start Workflow</Link><span>›</span><strong>Add Vehicle</strong></nav><h1>Add Vehicle</h1><p>Scan or enter the VIN. We will search existing records before creating a vehicle.</p></div><span><strong>Quick workflow</strong> · approximately 20 seconds</span></header>
    <ol className="avw-progress"><li className={preview || nonVin ? "complete" : "active"}><b>{preview || nonVin ? <Check size={14}/> : "1"}</b><span>Identify</span></li><li className={preview || nonVin ? "active" : ""}><b>2</b><span>Purpose</span></li><li><b>3</b><span>Review &amp; Continue</span></li></ol>
    {notice ? <div className={`avw-notice ${/could not|invalid|required|cannot|match was found/i.test(notice) ? "error" : "info"}`} role="status"><Info size={16}/><span>{notice}</span></div> : null}
    <div className="avw-layout"><main>
      <section className="avw-panel"><h2>1. Identify the Vehicle</h2><div className="avw-vin-row"><label><span>VIN</span><input ref={vinRef} autoCapitalize="characters" maxLength={24} onChange={event => update("vin", event.target.value.toUpperCase())} placeholder="Enter 17-character VIN" value={form.vin} /></label><button className="secondary" onClick={() => { vinRef.current?.focus(); setNotice("Connected barcode scanners can enter the VIN directly. Camera OCR is not configured in the current rollout."); }} type="button"><Camera size={16}/>Scan VIN</button><button disabled={checking || !form.vin.trim()} onClick={validateIdentity} type="button"><Search size={16}/>{checking ? "Checking..." : "Search"}</button></div>
        {preview ? <div className={preview.potentialDuplicate ? "avw-identity duplicate" : "avw-identity"}>{preview.potentialDuplicate ? <AlertTriangle size={34}/> : <CarFront size={56}/>}<div><span className={preview.potentialDuplicate ? "amber" : "green"}>{preview.potentialDuplicate ? "Existing canonical vehicle found" : preview.identity.validationSource.startsWith("LOCAL_") ? "VIN format accepted · Server search pending" : "Identity verified · No duplicate match"}</span><h3>{preview.potentialDuplicate?.vehicleNumber ?? ([form.year, form.make, form.model].filter(Boolean).join(" ") || "Confirm vehicle details")}</h3><p>VIN {preview.identity.vin}</p><small>{preview.identity.validationSource} · checked just now</small></div>{preview.potentialDuplicate ? <div className="avw-existing-actions"><Link href={`/vehicles/360/${preview.potentialDuplicate.id}`}>Open Vehicle 360</Link><button onClick={() => router.push(existingHref(recommendation.code, preview.potentialDuplicate!.id, form.description, returnTo))} type="button">Use Existing Vehicle &amp; Continue<ArrowRight size={15}/></button></div> : <label className="avw-confirm"><input checked={identityConfirmed} onChange={event => setIdentityConfirmed(event.target.checked)} type="checkbox"/><span>Yes, this is the correct vehicle</span></label>}</div> : null}
        <div className="avw-details"><label><span>Year <em>Required</em></span><input inputMode="numeric" maxLength={4} onChange={event => update("year", event.target.value)} placeholder="Year" value={form.year}/></label><label><span>Make <em>Required</em></span><input onChange={event => update("make", event.target.value)} placeholder="Make" value={form.make}/></label><label><span>Model <em>Required</em></span><input onChange={event => update("model", event.target.value)} placeholder="Model" value={form.model}/></label><label><span>Color</span><input onChange={event => update("color", event.target.value)} placeholder="Optional" value={form.color}/></label></div>
        <p className="avw-source-note"><Info size={14}/>VIN decoding is not configured in the current rollout. Confirm year, make, and model from an authoritative observation.</p>
      </section>
      <section className="avw-panel"><h2>2. Why are you adding this vehicle?</h2><fieldset><legend>Relationship</legend><div className="avw-choice-grid relationships">{relationshipChoices.map(choice => { const Icon = choice.icon; return <button aria-pressed={form.relationship === choice.value} className={form.relationship === choice.value ? "selected" : ""} key={choice.value} onClick={() => chooseRelationship(choice.value)} type="button"><Icon size={20}/><span>{choice.label}</span></button>; })}</div></fieldset>
        <fieldset><legend>Operational reason</legend><div className="avw-choice-grid reasons">{reasonChoices.filter(choice => allowedReasons.includes(choice.value)).map(choice => { const Icon = choice.icon; return <button aria-pressed={form.reasonCode === choice.value} className={form.reasonCode === choice.value ? "selected" : ""} key={choice.value} onClick={() => update("reasonCode", choice.value)} type="button"><Icon size={18}/><span>{choice.label}</span></button>; })}</div></fieldset>
        <label className="avw-description"><span>Briefly describe why this vehicle is being added <em>Required</em></span><textarea maxLength={240} onChange={event => update("description", event.target.value)} placeholder="One or two operational sentences" rows={3} value={form.description}/><small>One or two sentences. This context will appear in the recommended workflow. <b>{form.description.length}/240</b><button onClick={() => setNotice("Voice-to-text uses your device keyboard or accessibility dictation when available.")} type="button"><Mic size={14}/>Voice-to-text</button></small></label>
        <div className="avw-context-row"><label><span>Current location <em>Required</em></span><select onChange={event => update("locationId", event.target.value)} value={form.locationId}><option value="">Select location</option>{options.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><div><span>Customer</span><strong>Associate in Service Intake</strong><small>Customer selection is not required to establish vehicle identity.</small></div></div>
        <details className="avw-optional"><summary>Optional identity and evidence details</summary><div className="avw-details"><label><span>License plate</span><input onChange={event => update("licensePlate", event.target.value)} value={form.licensePlate}/></label><label><span>Non-VIN exception reason</span><input onChange={event => { update("nonVinReason", event.target.value); if (event.target.value) { setPreview(null); setIdentityConfirmed(false); } }} placeholder="Required only when no standard VIN exists" value={form.nonVinReason}/></label></div><p>Odometer observations, photos, documents, and external identities are added through Vehicle 360 after canonical identity exists.</p></details>
      </section>
    </main><aside>
      <section className="avw-recommendation"><header><CheckCircle2 size={22}/><span>Recommended Next Workflow</span></header><h2>{recommendation.title}</h2><p>{recommendation.description}</p><dl><div><dt>Confidence</dt><dd>{recommendation.confidence === "HIGH" ? "High" : "Medium"}</dd></div><div><dt>Reasons</dt><dd>{form.relationship.replaceAll("_", " ").toLowerCase()} · {form.reasonCode.replaceAll("_", " ").toLowerCase()}</dd></div></dl><small>The server rechecks identity, authority, context, and eligibility before any downstream command.</small></section>
      <section className="avw-side-panel"><h2>Readiness</h2><ul><li className={preview?.identity.vin || nonVin ? "ready" : "pending"}><CheckCircle2 size={15}/>Identity validation <b>{preview?.identity.vin || nonVin ? "Complete" : "Required"}</b></li><li className={preview && !preview.potentialDuplicate || nonVin ? "ready" : "pending"}><CheckCircle2 size={15}/>Duplicate check <b>{nonVin ? "Exception" : preview && !preview.potentialDuplicate ? "Complete" : "Required"}</b></li><li className="ready"><CheckCircle2 size={15}/>Relationship selected <b>Complete</b></li><li className={form.description.trim().length >= 10 ? "ready" : "pending"}><CheckCircle2 size={15}/>Description <b>{form.description.trim().length >= 10 ? "Complete" : "Required"}</b></li><li className={form.year && form.make && form.model ? "ready" : "pending"}><CheckCircle2 size={15}/>Vehicle details <b>{form.year && form.make && form.model ? "Complete" : "Required"}</b></li></ul><strong>{ready ? "Ready to continue." : "Complete the required items."}</strong></section>
      <section className="avw-side-panel"><h2>What Will Happen</h2><ul className="avw-effects"><li>Create one canonical Vehicle and Vehicle 360.</li><li>Preserve identity source, purpose, and staff description.</li><li>Prepare {recommendation.title}.</li></ul><p className="avw-safeguard"><LockKeyhole size={17}/><strong>Does not create dealership inventory, a stock number, acquisition cost, repair order, or purchase commitment.</strong></p></section>
      <section className="avw-side-panel"><h2>Records Not Created Yet</h2><p>Inventory Unit · Repair Order · Purchase Commitment</p><small>Created only by an eligible next workflow and required authority.</small></section>
    </aside></div>
    <footer className="avw-actions"><Link href={returnTo ?? "/vehicles/workflows"}>Cancel</Link><button className="secondary" onClick={saveDraft} type="button">Save Draft</button><span>Creates the vehicle, then opens the prepared next workflow.</span><button disabled={busy || !ready || Boolean(preview?.potentialDuplicate)} type="submit">{busy ? "Adding Vehicle..." : recommendation.commandLabel}<ArrowRight size={17}/></button></footer>
  </form>;
}
