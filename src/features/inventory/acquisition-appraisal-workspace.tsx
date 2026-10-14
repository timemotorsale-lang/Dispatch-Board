"use client";

import { ArrowLeft, BadgeCheck, CarFront, Check, ChevronRight, ClipboardCheck, FileCheck2, Gauge, Landmark, LockKeyhole, Plus, Scale, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import styles from "./acquisition-appraisal-workspace.module.css";

type Option = { id: string; name?: string; vehicleNumber?: string; vin?: string | null; year?: number | null; make?: string | null; model?: string | null };
type CaseItem = { id: string; version: number; status: string; source: string; sourceReference: string; acquisitionType: string; intendedUse: string; expiresAt: string; location: { id: string; name: string }; ownerUser: { id: string; name: string }; vehicle: { id: string; vehicleNumber: string; vin: string | null; year: number | null; make: string | null; model: string | null }; inventoryUnit: { id: string; inventoryNumber: string; lifecycleStage: string } | null; evidenceSnapshot: Record<string, unknown>; appraisalSnapshot: Record<string, unknown>; recommendationSnapshot: Record<string, unknown>; authorizationSnapshot: Record<string, unknown>; offerSnapshot: Record<string, unknown>; commitmentSnapshot: Record<string, unknown>; events: Array<{ id: string; version: number; commandType: string; fromStatus: string | null; toStatus: string; reason: string; occurredAt: string; actorUser: { name: string } }> };
type Model = { contractVersion: string; freshness: string; generatedAt: string; items: CaseItem[]; totals: { active: number; authorizationPending: number; evidenceRequired: number; readyForAppraisal: number } };
type Options = { locations: Option[]; users: Option[]; vehicles: Option[] };

function scopeVehicleCases(model: Model, vehicleId?: string): Model {
  if (!vehicleId) return model;
  const items = model.items.filter(item => item.vehicle.id === vehicleId);
  return { ...model, items, totals: { active: items.filter(item => !["DECLINED", "EXPIRED", "CANCELLED", "REJECTED", "HANDOFF_READY", "REVERSED"].includes(item.status)).length, authorizationPending: items.filter(item => item.status === "AUTHORIZATION_PENDING").length, evidenceRequired: items.filter(item => ["EVIDENCE_REQUIRED", "INSUFFICIENT"].includes(item.status)).length, readyForAppraisal: items.filter(item => item.status === "READY_FOR_APPRAISAL").length } };
}

const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const money = (value: unknown) => typeof value === "number" ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value / 100) : "Not calculated";
const dollarsFromCents = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? String(Math.round(value / 100)) : "";
const centsFromDollars = (value: string) => Math.round(Number(value.replace(/[$,\s]/g, "")) * 100);
const vehicleLabel = (vehicle: Pick<Option, "year" | "make" | "model" | "vehicleNumber">) => [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber || "Canonical vehicle";
const humanize = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

const gates = [
  { label: "Source & identity", icon: CarFront },
  { label: "Evidence", icon: FileCheck2 },
  { label: "Appraisal", icon: Gauge },
  { label: "Recommendation", icon: Scale },
  { label: "Authorization", icon: ShieldCheck },
  { label: "Commitment", icon: ClipboardCheck },
  { label: "InventoryUnit", icon: Landmark },
] as const;

function gateIndex(status?: string) {
  if (!status) return 0;
  if (["EVIDENCE_REQUIRED", "INSUFFICIENT", "WATCH"].includes(status)) return 1;
  if (status === "READY_FOR_APPRAISAL") return 2;
  if (status === "APPRAISAL_REVIEW") return 3;
  if (["PROPOSAL_READY", "AUTHORIZATION_PENDING"].includes(status)) return 4;
  if (["AUTHORIZED", "OFFER_PENDING"].includes(status)) return 5;
  return 6;
}

function gateCopy(item: CaseItem | null) {
  if (!item) return { title: "Register the acquisition opportunity", body: "Connect this canonical vehicle to a governed decision record before appraisal or inventory creation." };
  const copy: Record<string, { title: string; body: string }> = {
    EVIDENCE_REQUIRED: { title: "Qualify identity and acquisition evidence", body: "Verify VIN, mileage, seller authority, title history, and supporting evidence before valuation." },
    INSUFFICIENT: { title: "Resolve evidence blockers", body: "The case cannot advance until the failed identity, authority, mileage, or evidence controls are corrected." },
    READY_FOR_APPRAISAL: { title: "Build the appraisal economics", body: "Record comparables, expected retail, recon exposure, fees, and evidence quality for this version." },
    APPRAISAL_REVIEW: { title: "Calculate the governed recommendation", body: "Apply target gross, risk reserve, policy ceiling, transport, holding, and selling costs." },
    PROPOSAL_READY: { title: "Request independent authorization", body: "Submit the exact proposed amount and policy version. The server enforces the maximum and expiry." },
    AUTHORIZATION_PENDING: { title: "Record the independent decision", body: "An eligible approver must review this exact case version; the requester cannot self-approve." },
    AUTHORIZED: { title: "Record the offer and seller response", body: "Capture the governed amount, terms, offer version, and acceptance evidence when accepted." },
    OFFER_PENDING: { title: "Record the offer and seller response", body: "Capture the governed amount, terms, offer version, and acceptance evidence when accepted." },
    COMMITMENT_ACCEPTED: { title: "Confirm financial acquisition", body: "This is the control boundary that creates exactly one InventoryUnit from accepted evidence." },
    INVENTORY_UNIT_CREATED: { title: "Handoff to transport", body: "The inventory record exists. Create the internal handoff so downstream receiving can begin." },
    HANDOFF_READY: { title: "Acquisition handoff is ready", body: "The governed acquisition is complete and ready for its next operational workflow." },
  };
  return copy[item.status] ?? { title: `${humanize(item.status)} case`, body: "Review the authoritative history and available governed actions." };
}

function nextStepCopy(item: CaseItem | null) {
  if (!item) return {
    after: "After registration, the case moves to evidence qualification.",
    doNow: "Register the acquisition opportunity for this canonical vehicle.",
    goal: "Create a controlled pre-inventory decision record.",
    title: "Start here"
  };
  const copy: Record<string, { after: string; doNow: string; goal: string; title: string }> = {
    EVIDENCE_REQUIRED: { after: "After evidence passes, you will build the appraisal economics.", doNow: "Verify identity, mileage, seller authority, title/history, and attach evidence.", goal: "Decide if this opportunity is qualified enough to appraise.", title: "Next step: qualify the vehicle" },
    READY_FOR_APPRAISAL: { after: "After appraisal, the system can calculate the advisory maximum.", doNow: "Enter expected retail, recon exposure, fees, comparable quality, and appraisal expiry.", goal: "Create the economic version used for the purchase recommendation.", title: "Next step: submit appraisal" },
    APPRAISAL_REVIEW: { after: "After calculation, the case moves to purchase authorization.", doNow: "Enter target gross, risk reserve, policy ceiling, transport, holding, and selling costs.", goal: "Calculate the advisory maximum bid for this vehicle.", title: "Next step: calculate maximum" },
    PROPOSAL_READY: { after: "After approval, record the seller offer and acceptance. Inventory is created only after accepted commitment.", doNow: "Enter the dollar amount you want approved, confirm policy/conflict/expiry, then request independent approval.", goal: "Get permission to acquire this vehicle at one exact maximum amount.", title: "Next step: request purchase authorization" },
    AUTHORIZATION_PENDING: { after: "If approved, staff can make or record the seller offer.", doNow: "Have a different authorized person approve or reject this exact amount and case version.", goal: "Complete the four-eyes purchase decision.", title: "Next step: independent decision" },
    AUTHORIZED: { after: "If the seller accepts, record accepted commitment evidence.", doNow: "Record the offer amount, terms, version, and seller response.", goal: "Convert approval into an actual seller offer record.", title: "Next step: record offer" },
    OFFER_PENDING: { after: "After accepted commitment, confirm financial acquisition and create the InventoryUnit.", doNow: "Record whether the seller accepted and attach acceptance evidence if accepted.", goal: "Capture the seller commitment without skipping evidence.", title: "Next step: seller commitment" },
    COMMITMENT_ACCEPTED: { after: "After this, inventory lifecycle and transport/receiving can begin.", doNow: "Confirm financial acquisition time, inventory number, owner, target, and next action.", goal: "Create exactly one governed InventoryUnit from accepted evidence.", title: "Next step: create InventoryUnit" },
    INVENTORY_UNIT_CREATED: { after: "After handoff, receiving and inventory lifecycle continue from the vehicle planning workspace.", doNow: "Create the internal transport or receiving handoff.", goal: "Move the acquired vehicle into operational inventory flow.", title: "Next step: handoff to inventory" }
  };
  return copy[item.status] ?? { after: "Review history and choose the available governed action.", doNow: "Follow the available action for this case status.", goal: "Keep the acquisition record controlled and attributable.", title: `Next step: ${humanize(item.status)}` };
}

export function AcquisitionAppraisalWorkspace({ initial, initialCaseId, initialVehicleId, options, returnTo }: { initial: Model; initialCaseId?: string; initialVehicleId?: string; options: Options; returnTo?: string }) {
  const scopedModel = scopeVehicleCases(initial, initialVehicleId);
  const scopedItems = scopedModel.items;
  const initialCase = scopedItems.find((item) => item.id === initialCaseId) ?? scopedItems[0] ?? null;
  const now = new Date();
  const [model, setModel] = useState(scopedModel);
  const [selected, setSelected] = useState<CaseItem | null>(initialCase);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : initialVehicleId ? `/vehicles/${encodeURIComponent(initialVehicleId)}/inventory-planning` : "/vehicles/inventory";
  const contextVehicle = options.vehicles.find((vehicle) => vehicle.id === initialVehicleId) ?? (selected ? selected.vehicle : null);
  const activeGate = gateIndex(selected?.status);
  const next = gateCopy(selected);
  const step = nextStepCopy(selected);
  const [create, setCreate] = useState({ acquisitionType: "PURCHASE", expiresAt: local(new Date(now.getTime() + 7 * 86_400_000)), intendedUse: "RETAIL", locationId: options.locations[0]?.id ?? "", ownerUserId: options.users[0]?.id ?? "", source: "MANUAL", sourceReference: "", vehicleId: initialVehicleId ? options.vehicles.some(vehicle => vehicle.id === initialVehicleId) ? initialVehicleId : "" : options.vehicles[0]?.id ?? "" });

  async function request(url: string, init?: RequestInit) { const response = await fetch(url, init); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error ?? "Acquisition request failed."); return body; }
  async function refresh(preferredId?: string) { const nextModel = scopeVehicleCases(await request("/api/acquisition-cases") as Model, initialVehicleId); setModel(nextModel); const id = preferredId ?? selected?.id; const item = nextModel.items.find((candidate) => candidate.id === id) ?? nextModel.items[0] ?? null; setSelected(item); return item; }
  async function submitCreate(event: FormEvent) { event.preventDefault(); setBusy(true); setNotice(""); try { await request("/api/acquisition-cases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...create, expiresAt: new Date(create.expiresAt).toISOString(), expectedVersion: 0, idempotencyKey: crypto.randomUUID(), reason: "Register governed acquisition opportunity for evidence qualification." }) }); await refresh(); setNotice("Acquisition opportunity registered with immutable command, event, audit, and outbox evidence."); } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to register acquisition opportunity."); } finally { setBusy(false); } }
  async function submitAction(action: string, values: Record<string, unknown>) { if (!selected) return; setBusy(true); setNotice(""); try { await request(`/api/acquisition-cases/${selected.id}/commands`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, expectedVersion: selected.version, idempotencyKey: crypto.randomUUID(), reason: `${action.replaceAll("_", " ").toLowerCase()} with reviewed R4 acquisition evidence.`, ...values }) }); const updated = await refresh(selected.id); setNotice(`${action.replaceAll("_", " ")} completed and appended to immutable acquisition history.`); if (action === "CONFIRM_FINANCIAL_ACQUISITION" && updated?.inventoryUnit) window.location.assign(safeReturnTo); } catch (error) { setNotice(error instanceof Error ? error.message : "Acquisition command failed."); } finally { setBusy(false); } }

  return <section className={styles.workspace}>
    <header className={styles.hero}>
      <div>
        <nav aria-label="Acquisition breadcrumb"><Link href="/vehicles/inventory">Inventory Lifecycle</Link><ChevronRight /><span>Acquisition &amp; Appraisal</span></nav>
        <span className={styles.eyebrow}>Governed pre-inventory decision workspace</span>
        <h1>Acquisition &amp; Appraisal Command Center</h1>
        <p><strong>Decide before inventory begins.</strong> Qualify the vehicle, value the opportunity, enforce purchase authority, and create inventory only after accepted financial commitment.</p>
      </div>
      <div className={styles.heroActions}>
        <Link className={styles.returnButton} href={safeReturnTo}><ArrowLeft />Return to vehicle planning</Link>
        {contextVehicle ? <Link className={styles.primaryButton} href={`/vehicles/360/${encodeURIComponent(contextVehicle.id)}?returnTo=${encodeURIComponent(`/vehicles/acquisition-appraisal?vehicleId=${contextVehicle.id}&returnTo=${encodeURIComponent(safeReturnTo)}`)}`}>Open Vehicle 360</Link> : null}
      </div>
      <div className={styles.truthBar}>
        <span><BadgeCheck /><b>{model.freshness}</b> authoritative projection</span>
        <span><LockKeyhole />Contract {model.contractVersion}</span>
        <span>Updated {new Date(model.generatedAt).toLocaleString()}</span>
        <span>External bidding, payment, accounting, and transport adapters are disabled.</span>
      </div>
    </header>

    {contextVehicle ? <section className={styles.vehicleContext} aria-label="Selected vehicle context">
      <div className={styles.vehicleIcon}><CarFront /></div>
      <div><span>Vehicle in acquisition review</span><h2>{vehicleLabel(contextVehicle)}</h2><p>{contextVehicle.vin ? `VIN ${contextVehicle.vin}` : "VIN evidence exception required"} · {contextVehicle.vehicleNumber}</p></div>
      <dl><div><dt>Case status</dt><dd>{selected ? humanize(selected.status) : "Not registered"}</dd></div><div><dt>Decision owner</dt><dd>{selected?.ownerUser.name ?? "Assign at registration"}</dd></div><div><dt>InventoryUnit</dt><dd>{selected?.inventoryUnit?.inventoryNumber ?? "Not created"}</dd></div></dl>
    </section> : null}

    <section className={styles.gates} aria-label="Governed acquisition stages">
      {gates.map((gate, index) => { const Icon = gate.icon; const state = index < activeGate ? styles.complete : index === activeGate ? styles.active : ""; return <div className={state} key={gate.label}><span>{index < activeGate ? <Check /> : <Icon />}</span><small>Gate {index + 1}</small><strong>{gate.label}</strong></div>; })}
    </section>

    <section className={styles.kpis} aria-label="Acquisition case totals">
      {[{ label: "Active cases", value: model.totals.active, note: "In governed review" }, { label: "Evidence required", value: model.totals.evidenceRequired, note: "Identity or source controls" }, { label: "Ready for appraisal", value: model.totals.readyForAppraisal, note: "Evidence gate passed" }, { label: "Authorization pending", value: model.totals.authorizationPending, note: "Independent decision required" }].map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small></article>)}
    </section>

    {notice ? <div aria-live="polite" className={`${styles.notice} ${notice.includes("completed") || notice.includes("registered") ? styles.success : styles.warning}`}><p>{notice}</p></div> : null}

    <div className={styles.commandGrid}>
      <aside className={styles.queue}>
        <header><div><span>Acquisition queue</span><h2>Cases requiring action</h2></div><b>{model.items.length}</b></header>
        {model.items.length ? <div className={styles.caseList}>{model.items.map((item) => <button aria-pressed={selected?.id === item.id} key={item.id} onClick={() => setSelected(item)} type="button"><span><strong>{vehicleLabel(item.vehicle)}</strong><small>{item.vehicle.vehicleNumber} · {item.source} / {item.sourceReference}</small></span><span><b>{humanize(item.status)}</b><small>{item.ownerUser.name} · expires {new Date(item.expiresAt).toLocaleDateString()}</small></span></button>)}</div> : <div className={styles.empty}><CarFront /><strong>No acquisition case yet</strong><p>This vehicle is known, but no pre-inventory decision record has been created.</p><a href="#register-acquisition">Register this opportunity</a></div>}
        <footer><Link href="/vehicles/registry">Find another vehicle</Link><Link href="/vehicles/workflows/add-vehicle">Add vehicle</Link></footer>
      </aside>

      <main className={styles.decisionPanel}>
        <header><div><span>{selected ? `Case version ${selected.version} · ${selected.acquisitionType}` : "Start the governed acquisition"}</span><h2>{selected ? vehicleLabel(selected.vehicle) : contextVehicle ? vehicleLabel(contextVehicle) : "Select or register a vehicle"}</h2><p>{selected ? `${selected.location.name} · ${selected.intendedUse} · ${selected.vehicle.vin ? `VIN ${selected.vehicle.vin}` : "VIN exception"}` : "The registration gate creates a decision record only—never inventory, ownership, a bid, or a commitment."}</p></div>{selected ? <span className={styles.status}>{humanize(selected.status)}</span> : null}</header>
        {selected ? <>
          <dl className={styles.facts}><div><dt>Appraisal confidence</dt><dd>{String(selected.appraisalSnapshot.confidence ?? "Not calculated")}</dd></div><div><dt>Advisory maximum</dt><dd>{money(selected.recommendationSnapshot.recommendedMaximumBidCents)}</dd></div><div><dt>Proposed amount</dt><dd>{money(selected.authorizationSnapshot.proposedAmountCents)}</dd></div><div><dt>InventoryUnit</dt><dd>{selected.inventoryUnit?.inventoryNumber ?? "Not created"}</dd></div></dl>
          <section className={styles.nextAction}><header><span>Current governed gate</span><h3>{next.title}</h3><p>{next.body}</p></header><div className={styles.doNextStrip}><div><span>You are here</span><strong>{step.title}</strong></div><div><span>Do this now</span><strong>{step.doNow}</strong></div><div><span>Why it matters</span><strong>{step.goal}</strong></div><div><span>What happens after</span><strong>{step.after}</strong></div></div><ActionPanel busy={busy} item={selected} submit={submitAction} /></section>
          <details className={styles.history}><summary>Immutable case history <b>{selected.events.length}</b></summary><div>{selected.events.length ? selected.events.map((entry) => <article key={entry.id}><span>v{entry.version}</span><div><strong>{humanize(entry.commandType)}</strong><small>{entry.fromStatus ?? "START"} → {entry.toStatus} · {entry.actorUser.name} · {new Date(entry.occurredAt).toLocaleString()}</small><p>{entry.reason}</p></div></article>) : <p>No commands have been recorded beyond the current projection.</p>}</div></details>
        </> : <div className={styles.startState}><Landmark /><h3>Inventory has not begun</h3><p>Register the acquisition opportunity below. Staff will then be guided through evidence, appraisal, authorization, commitment, and InventoryUnit creation one gate at a time.</p><a href="#register-acquisition">Register governed opportunity</a></div>}
      </main>

      <aside className={styles.rail}>
        <section><span>Decision readiness</span><h2>{next.title}</h2><p>{next.body}</p><div className={styles.progress}><i style={{ width: `${Math.round((activeGate / (gates.length - 1)) * 100)}%` }} /></div><small>Gate {activeGate + 1} of {gates.length}</small></section>
        <section><span>Control boundary</span><h2>Inventory remains protected</h2><ul><li><ShieldCheck />Canonical vehicle identity is preserved</li><li><LockKeyhole />Independent authority is enforced</li><li><FileCheck2 />Accepted evidence is required</li><li><Landmark />Exactly one InventoryUnit is created</li></ul></section>
        <section><span>Connected workspaces</span><nav><Link href="/vehicles/control-tower">Control Tower <ChevronRight /></Link><Link href="/manager-review?scope=inventory&view=approvals">Approvals <ChevronRight /></Link><Link href="/vehicles/inventory">Inventory Lifecycle <ChevronRight /></Link></nav></section>
      </aside>
    </div>

    <details className={styles.registration} id="register-acquisition" open={!selected}>
      <summary><span><Plus /><b>Register acquisition opportunity</b><small>Creates a pre-control decision record only</small></span><ChevronRight /></summary>
      <form onSubmit={submitCreate}><div className={styles.registrationIntro}><h2>Source and assignment</h2><p>This does not create inventory, ownership, a bid, or a commitment. It opens the evidence qualification gate for the selected canonical vehicle.</p></div><div className={styles.formGrid}>
        <label><span>Canonical vehicle</span><select value={create.vehicleId} onChange={(event) => setCreate((value) => ({ ...value, vehicleId: event.target.value }))}><option value="">Select a vehicle</option>{options.vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicleNumber} · {vehicleLabel(vehicle)}</option>)}</select></label>
        <label><span>Acquisition source</span><input value={create.source} onChange={(event) => setCreate((value) => ({ ...value, source: event.target.value }))} /></label>
        <label><span>Unique source reference <b>Required</b></span><input required value={create.sourceReference} onChange={(event) => setCreate((value) => ({ ...value, sourceReference: event.target.value }))} /></label>
        <label><span>Acquisition type</span><select value={create.acquisitionType} onChange={(event) => setCreate((value) => ({ ...value, acquisitionType: event.target.value }))}>{["PURCHASE", "TRADE", "CONSIGNMENT", "TRANSFER"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Intended use</span><select value={create.intendedUse} onChange={(event) => setCreate((value) => ({ ...value, intendedUse: event.target.value }))}>{["RETAIL", "WHOLESALE", "TRANSFER", "RETURN", "UNDECIDED"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Decision owner</span><select value={create.ownerUserId} onChange={(event) => setCreate((value) => ({ ...value, ownerUserId: event.target.value }))}>{options.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
        <label><span>Intended location</span><select value={create.locationId} onChange={(event) => setCreate((value) => ({ ...value, locationId: event.target.value }))}>{options.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
        <label><span>Opportunity expiry</span><input type="datetime-local" value={create.expiresAt} onChange={(event) => setCreate((value) => ({ ...value, expiresAt: event.target.value }))} /></label>
      </div><footer><span><LockKeyhole />The server rechecks vehicle identity, source uniqueness, authority, location, and expiry.</span><button disabled={busy || !options.vehicles.length} type="submit">{busy ? "Registering…" : "Register governed opportunity"}</button></footer></form>
    </details>
  </section>;
}

function ActionPanel({ busy, item, submit }: { busy: boolean; item: CaseItem; submit: (action: string, values: Record<string, unknown>) => Promise<void> }) {
  const [values, setValues] = useState<Record<string, string | boolean>>(() => { const at = new Date(); return { acceptanceEvidenceReference: "", accepted: false, acquisitionFeesCents: "50000", amountCents: "", appraisalVersion: "1", comparableCount: "3", comparableRecency: "0.8", conditionEvidence: "0.8", conflictDisclosure: "No known conflict", disposition: "APPROVED", effectiveAt: local(at), estimatedFeesCents: "50000", estimatedReconCents: "150000", evidenceObjectIds: "manual-evidence-reference", expectedHoldingCostCents: "50000", expectedRetailCents: "1800000", expiresAt: local(new Date(at.getTime() + 2 * 86_400_000)), historyTitleEvidence: "0.8", identityConflict: false, inventoryNumber: "", mileage: "0", mileageVerified: true, nextAction: "Confirm release and transportation plan", offerVersion: String(Number(item.offerSnapshot.version ?? 0) + 1), otherAcquisitionCostsCents: "0", ownerUserId: item.ownerUser.id, policyCeilingCents: "1500000", policyVersion: "R4-MANUAL-1", proposedAmountCents: "", reconEstimateQuality: "0.8", riskReserveCents: "75000", sellerAuthorityVerified: true, sellingCostsCents: "50000", targetAt: local(new Date(at.getTime() + 3 * 86_400_000)), targetGrossCents: "250000", terms: "Subject to reviewed acquisition evidence", titleAndMerchandisingCostsCents: "25000", titleHistoryConflict: false, transportCostCents: "50000", trimCertainty: "0.9", vinDecodeQuality: "0.9" }; });
  const set = (key: string, value: string | boolean) => setValues((current) => ({ ...current, [key]: value }));
  const number = (key: string) => Number(values[key]);
  const commonEvidence = () => ({ conditionEvidence: number("conditionEvidence"), evidenceObjectIds: String(values.evidenceObjectIds).split(",").map((value) => value.trim()).filter(Boolean), historyTitleEvidence: number("historyTitleEvidence"), identityConflict: values.identityConflict, mileage: number("mileage"), mileageVerified: values.mileageVerified, observedAt: new Date().toISOString(), sellerAuthorityVerified: values.sellerAuthorityVerified, titleHistoryConflict: values.titleHistoryConflict, trimCertainty: number("trimCertainty"), vinDecodeQuality: number("vinDecodeQuality") });
  const field = (key: string, title: string, type = "number") => <label><span>{title}</span><input onChange={(event) => set(key, event.target.value)} type={type} value={String(values[key] ?? "")} /></label>;
  let form: React.ReactNode = null;
  if (["EVIDENCE_REQUIRED", "INSUFFICIENT"].includes(item.status)) form = <>{field("evidenceObjectIds", "Evidence references", "text")}{field("mileage", "Mileage")}{field("vinDecodeQuality", "VIN decode quality 0–1")}{field("trimCertainty", "Trim certainty 0–1")}{field("conditionEvidence", "Condition evidence 0–1")}{field("historyTitleEvidence", "Title/history evidence 0–1")}<label className={styles.check}><input checked={Boolean(values.mileageVerified)} onChange={(event) => set("mileageVerified", event.target.checked)} type="checkbox" />Mileage verified</label><label className={styles.check}><input checked={Boolean(values.sellerAuthorityVerified)} onChange={(event) => set("sellerAuthorityVerified", event.target.checked)} type="checkbox" />Seller authority verified</label><button disabled={busy} onClick={() => submit("QUALIFY_EVIDENCE", commonEvidence())} type="button">Qualify evidence</button></>;
  else if (item.status === "READY_FOR_APPRAISAL") form = <>{field("comparableCount", "Eligible comparable count")}{field("comparableRecency", "Comparable recency 0–1")}{field("expectedRetailCents", "Expected retail (cents)")}{field("estimatedReconCents", "Estimated recon (cents)")}{field("estimatedFeesCents", "Estimated fees (cents)")}{field("reconEstimateQuality", "Recon estimate quality 0–1")}{field("expiresAt", "Appraisal expiry", "datetime-local")}<button disabled={busy} onClick={() => submit("SUBMIT_APPRAISAL", { ...commonEvidence(), comparableCount: number("comparableCount"), comparableRecency: number("comparableRecency"), comparables: [], estimatedFeesCents: number("estimatedFeesCents"), estimatedReconCents: number("estimatedReconCents"), expectedRetailCents: number("expectedRetailCents"), expiresAt: new Date(String(values.expiresAt)).toISOString(), reconEstimateQuality: number("reconEstimateQuality") })} type="button">Submit appraisal version</button></>;
  else if (item.status === "APPRAISAL_REVIEW") form = <>{field("targetGrossCents", "Target gross (cents)")}{field("riskReserveCents", "Risk reserve (cents)")}{field("policyCeilingCents", "Policy ceiling (cents)")}{field("transportCostCents", "Transport cost (cents)")}<button disabled={busy} onClick={() => submit("CALCULATE_PROPOSAL", { acquisitionFeesCents: number("acquisitionFeesCents"), expectedHoldingCostCents: number("expectedHoldingCostCents"), otherAcquisitionCostsCents: number("otherAcquisitionCostsCents"), policyCeilingCents: number("policyCeilingCents"), riskReserveCents: number("riskReserveCents"), sellingCostsCents: number("sellingCostsCents"), targetGrossCents: number("targetGrossCents"), titleAndMerchandisingCostsCents: number("titleAndMerchandisingCostsCents"), transportCostCents: number("transportCostCents") })} type="button">Calculate advisory maximum</button></>;
  else if (item.status === "PROPOSAL_READY") {
    const advisoryMaximum = typeof item.recommendationSnapshot.recommendedMaximumBidCents === "number" ? item.recommendationSnapshot.recommendedMaximumBidCents : null;
    const proposedDollars = values.proposedAmountCents ? dollarsFromCents(Number(values.proposedAmountCents)) : "";
    form = <><section className={styles.guidanceBox}><strong>What are you trying to do?</strong><p>Ask an independent approver for permission to acquire this vehicle at an exact purchase amount. Enter the maximum dollar amount you want authorized. It should normally be at or below the advisory maximum of {money(advisoryMaximum)}.</p><ul><li>This does not buy the vehicle yet.</li><li>This does not create inventory yet.</li><li>It only asks for approval for this exact case version and amount.</li></ul></section><label><span>Proposed purchase amount ($)</span><input inputMode="decimal" onChange={(event) => set("proposedAmountCents", String(centsFromDollars(event.target.value)))} placeholder={advisoryMaximum ? dollarsFromCents(advisoryMaximum) : "Example: 8500"} type="text" value={proposedDollars} /><small>Example: enter 8500 for $8,500. The system converts it to cents for the governed authorization record.</small></label>{field("policyVersion", "Policy version", "text")}{field("conflictDisclosure", "Conflict disclosure", "text")}{field("expiresAt", "Authorization expiry", "datetime-local")}<button disabled={busy || !Number(values.proposedAmountCents)} onClick={() => submit("REQUEST_AUTHORIZATION", { appraisalVersion: item.version, conflictDisclosure: values.conflictDisclosure, expiresAt: new Date(String(values.expiresAt)).toISOString(), policyVersion: values.policyVersion, proposedAmountCents: number("proposedAmountCents") })} type="button">Request approval for this purchase amount</button></>;
  }
  else if (item.status === "AUTHORIZATION_PENDING") form = <><label><span>Decision</span><select onChange={(event) => set("disposition", event.target.value)} value={String(values.disposition)}><option>APPROVED</option><option>REJECTED</option></select></label><button disabled={busy} onClick={() => submit("DECIDE_AUTHORIZATION", { disposition: values.disposition })} type="button">Record independent decision</button></>;
  else if (["AUTHORIZED", "OFFER_PENDING"].includes(item.status)) form = <>{field("amountCents", "Offer / accepted amount (cents)")}{field("terms", "Terms", "text")}{field("offerVersion", "Offer version")}<label className={styles.check}><input checked={Boolean(values.accepted)} onChange={(event) => set("accepted", event.target.checked)} type="checkbox" />Accepted commitment</label>{values.accepted ? field("acceptanceEvidenceReference", "Acceptance evidence reference", "text") : null}<button disabled={busy} onClick={() => submit("RECORD_OFFER", { acceptanceEvidenceReference: values.acceptanceEvidenceReference, accepted: values.accepted, amountCents: number("amountCents"), offerVersion: number("offerVersion"), terms: values.terms })} type="button">Record immutable offer version</button></>;
  else if (item.status === "COMMITMENT_ACCEPTED") form = <>{field("inventoryNumber", "Unique inventory number", "text")}{field("effectiveAt", "Financial acquisition time", "datetime-local")}{field("targetAt", "Stage target", "datetime-local")}{field("nextAction", "Next action", "text")}<button disabled={busy} onClick={() => submit("CONFIRM_FINANCIAL_ACQUISITION", { effectiveAt: new Date(String(values.effectiveAt)).toISOString(), inventoryNumber: values.inventoryNumber, nextAction: values.nextAction, ownerUserId: values.ownerUserId, targetAt: new Date(String(values.targetAt)).toISOString() })} type="button">Confirm evidence and create InventoryUnit</button></>;
  else if (item.status === "INVENTORY_UNIT_CREATED") form = <button disabled={busy} onClick={() => submit("HANDOFF_TO_TRANSPORT", {})} type="button">Create internal transport handoff</button>;
  else if (item.status === "REVERSAL_REVIEW") form = <>{field("custodyDisposition", "Custody compensation", "text")}{field("paymentDisposition", "Payment compensation", "text")}{field("titleDisposition", "Title compensation", "text")}{field("evidenceObjectIds", "Compensation evidence", "text")}{field("verifiedByUserId", "Independent verifier user ID", "text")}<button disabled={busy} onClick={() => submit("COMPLETE_REVERSAL", { custodyDisposition: values.custodyDisposition, evidenceObjectIds: String(values.evidenceObjectIds).split(",").map((value) => value.trim()).filter(Boolean), paymentDisposition: values.paymentDisposition, titleDisposition: values.titleDisposition, verifiedByUserId: values.verifiedByUserId })} type="button">Complete verified non-destructive reversal</button></>;
  return <div className={styles.actionPanel}><div className={styles.actionForm}>{form ?? <p>No mutating action is available in this terminal state.</p>}</div><div className={styles.secondaryActions}>{["EVIDENCE_REQUIRED", "INSUFFICIENT", "WATCH"].includes(item.status) ? <><button disabled={busy} onClick={() => submit("WATCH", {})} type="button">Watch</button><button disabled={busy} onClick={() => submit("DECLINE", {})} type="button">Decline</button></> : null}{["APPRAISAL_REVIEW", "PROPOSAL_READY", "AUTHORIZATION_PENDING", "AUTHORIZED", "OFFER_PENDING"].includes(item.status) ? <button disabled={busy} onClick={() => submit("REOPEN_APPRAISAL", {})} type="button">Revise and supersede appraisal</button> : null}{["INVENTORY_UNIT_CREATED", "HANDOFF_READY"].includes(item.status) ? <button disabled={busy} onClick={() => submit("REQUEST_REVERSAL", {})} type="button">Request non-destructive reversal review</button> : null}{!["INVENTORY_UNIT_CREATED", "HANDOFF_READY", "CANCELLED", "REJECTED", "DECLINED", "EXPIRED", "REVERSAL_REVIEW", "REVERSED"].includes(item.status) ? <button disabled={busy} onClick={() => submit("CANCEL", {})} type="button">Cancel before control</button> : null}</div></div>;
}
