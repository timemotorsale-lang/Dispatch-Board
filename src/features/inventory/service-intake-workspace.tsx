"use client";

import {
  ArrowLeft,
  CalendarClock,
  CarFront,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  KeyRound,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

export type ServiceIntakeOptions = {
  customers: Array<{ customerNumber?: string; displayName: string; id: string }>;
  locations: Array<{ code?: string; id: string; name: string }>;
  users: Array<{ email?: string; id: string; name: string }>;
  vehicles: Array<{ id: string; make: string | null; model: string | null; vehicleNumber: string; year: number | null }>;
};

type IntakeState = {
  arrivedAt: string;
  concernSummary: string;
  consentReference: string;
  consentStatus: "DOCUMENTED" | "NOT_REQUIRED" | "PENDING";
  consentedAt: string;
  customerId: string;
  frequency: string;
  intakeNotes: string;
  keyTag: string;
  keysReceivedCount: number;
  locationId: string;
  nextAction: string;
  onset: string;
  ownerUserId: string;
  promisedAt: string;
  promiseNotes: string;
  targetAt: string;
  transportMode: string;
  urgency: string;
  vehicleId: string;
  warningIndicators: string;
};

const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const vehicleLabel = (vehicle: ServiceIntakeOptions["vehicles"][number]) =>
  `${[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle"} · ${vehicle.vehicleNumber}`;

function buildInitial(options: ServiceIntakeOptions): IntakeState {
  const now = new Date();
  return {
    arrivedAt: local(now),
    concernSummary: "",
    consentReference: "",
    consentStatus: "PENDING",
    consentedAt: "",
    customerId: options.customers[0]?.id ?? "",
    frequency: "",
    intakeNotes: "",
    keyTag: "",
    keysReceivedCount: 1,
    locationId: options.locations[0]?.id ?? "",
    nextAction: "Complete intake review and prepare for digital vehicle inspection",
    onset: "",
    ownerUserId: options.users[0]?.id ?? "",
    promisedAt: "",
    promiseNotes: "",
    targetAt: local(new Date(now.getTime() + 2 * 60 * 60_000)),
    transportMode: "DROP_OFF",
    urgency: "STANDARD",
    vehicleId: options.vehicles[0]?.id ?? "",
    warningIndicators: "",
  };
}

export function ServiceIntakeWorkspace({ options }: { options: ServiceIntakeOptions }) {
  const [form, setForm] = useState<IntakeState>(() => buildInitial(options));
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [created, setCreated] = useState<{ id: string; repairOrderNumber: string } | null>(null);

  const vehicles = useMemo(() => {
    const query = vehicleQuery.trim().toLocaleLowerCase();
    return query ? options.vehicles.filter((vehicle) => vehicleLabel(vehicle).toLocaleLowerCase().includes(query)) : options.vehicles;
  }, [options.vehicles, vehicleQuery]);
  const customers = useMemo(() => {
    const query = customerQuery.trim().toLocaleLowerCase();
    return query ? options.customers.filter((customer) => `${customer.displayName} ${customer.customerNumber ?? ""}`.toLocaleLowerCase().includes(query)) : options.customers;
  }, [customerQuery, options.customers]);
  const selectedVehicle = options.vehicles.find((vehicle) => vehicle.id === form.vehicleId);
  const selectedCustomer = options.customers.find((customer) => customer.id === form.customerId);
  const selectedLocation = options.locations.find((location) => location.id === form.locationId);
  const selectedOwner = options.users.find((user) => user.id === form.ownerUserId);
  const readiness = [
    { label: "Customer selected", ready: Boolean(form.customerId) },
    { label: "Vehicle selected", ready: Boolean(form.vehicleId) },
    { label: "Concern captured", ready: form.concernSummary.trim().length >= 10 },
    { label: "Keys & transportation", ready: form.keysReceivedCount >= 0 && Boolean(form.transportMode) },
    { label: "Owner & target", ready: Boolean(form.ownerUserId && form.targetAt) },
    { label: "Consent disposition", ready: form.consentStatus !== "DOCUMENTED" || Boolean(form.consentReference && form.consentedAt) },
  ];
  const ready = readiness.every((item) => item.ready);

  function update<K extends keyof IntakeState>(key: K, value: IntakeState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addPrompt(prompt: string) {
    setForm((current) => ({ ...current, concernSummary: current.concernSummary ? `${current.concernSummary.trim()} ${prompt}` : prompt }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready) {
      setNotice("Complete the required check-in items before creating the repair order.");
      return;
    }
    setBusy(true);
    setNotice("");
    const structuredNotes = [
      form.onset && `Onset: ${form.onset}`,
      form.frequency && `Frequency: ${form.frequency}`,
      form.warningIndicators && `Warning indicators: ${form.warningIndicators}`,
      form.urgency && `Advisor urgency: ${form.urgency}`,
      form.intakeNotes.trim(),
    ].filter(Boolean).join("\n");
    try {
      const response = await fetch("/api/repair-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appointmentId: null,
          arrivedAt: new Date(form.arrivedAt).toISOString(),
          concernSummary: form.concernSummary,
          consentReference: form.consentReference || null,
          consentStatus: form.consentStatus,
          consentedAt: form.consentedAt ? new Date(form.consentedAt).toISOString() : null,
          customerId: form.customerId,
          idempotencyKey: crypto.randomUUID(),
          intakeNotes: structuredNotes || null,
          intakeSource: "WALK_IN",
          inventoryUnitId: null,
          keyTag: form.keyTag || null,
          keysReceivedCount: form.keysReceivedCount,
          locationId: form.locationId,
          nextAction: form.nextAction,
          operatingState: "ACTIVE",
          ownerUserId: form.ownerUserId,
          promisedAt: form.promisedAt ? new Date(form.promisedAt).toISOString() : null,
          promiseNotes: form.promiseNotes || null,
          reason: "Create governed walk-in service intake with attributable customer, vehicle, concern, custody, and handoff facts.",
          stateReason: null,
          targetAt: new Date(form.targetAt).toISOString(),
          transportMode: form.transportMode,
          vehicleId: form.vehicleId,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Vehicle check-in failed.");
      const result = body.result as { id: string; repairOrderNumber: string };
      setCreated(result);
      setNotice(`${result.repairOrderNumber} was created and placed into Shop & Recon.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Vehicle check-in failed.");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return <section className="service-intake-shell service-intake-complete">
      <div className="sic-success-icon"><CheckCircle2 /></div>
      <p>Check-in complete</p>
      <h1>{created.repairOrderNumber}</h1>
      <span>{selectedCustomer?.displayName} · {selectedVehicle ? vehicleLabel(selectedVehicle) : "Vehicle"}</span>
      <div className="sic-success-summary"><strong>Ready for intake review</strong><span>The governed repair order, customer concern, custody details, owner, target, and audit evidence are now available to Shop &amp; Recon.</span></div>
      <div className="sic-success-actions"><Link className="primary" href={`/vehicles/repair-orders?repairOrderId=${created.id}`}>Open repair order <ChevronRight /></Link><Link href="/vehicles/shop-recon">Return to Shop &amp; Recon</Link></div>
    </section>;
  }

  return <form className="service-intake-shell" onSubmit={submit}>
    <header className="sic-header">
      <div><Link href="/vehicles/shop-recon"><ArrowLeft />Shop &amp; Recon</Link><p>Advisor Workspace</p><h1>Check In Vehicle</h1><span>Capture the customer&apos;s story once, establish custody, and create accountable shop work.</span></div>
      <div className="sic-header-state"><ShieldCheck /><span><strong>Governed intake</strong>Permissions, rollout, duplicate protection, and audit history are enforced.</span></div>
    </header>

    <nav aria-label="Check-in progress" className="sic-progress">
      <span className="active"><b>1</b><i>Customer &amp; vehicle</i></span><em /><span className="active"><b>2</b><i>Concern &amp; visit</i></span><em /><span className="active"><b>3</b><i>Authorization &amp; handoff</i></span>
    </nav>

    {notice ? <div className={ready ? "sic-notice" : "sic-notice error"} role="status"><ClipboardCheck />{notice}</div> : null}

    <div className="sic-layout">
      <main className="sic-main">
        <section className="sic-card sic-identity">
          <header><span>1</span><div><h2>Customer &amp; vehicle</h2><p>Search the canonical records before creating work.</p></div></header>
          <div className="sic-two-column">
            <div className="sic-lookup"><label><span><UserRound />Customer search</span><div><Search /><input onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Name or customer number" value={customerQuery} /></div></label><select aria-label="Customer" onChange={(event) => update("customerId", event.target.value)} value={form.customerId}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.displayName}{customer.customerNumber ? ` · ${customer.customerNumber}` : ""}</option>)}</select>{selectedCustomer ? <p><Check />{selectedCustomer.displayName}<small>Canonical customer record</small></p> : <Link href="/customers">Customer not found? Open Customer 360</Link>}</div>
            <div className="sic-lookup"><label><span><CarFront />Vehicle search</span><div><Search /><input onChange={(event) => setVehicleQuery(event.target.value)} placeholder="Year, make, model, or vehicle #" value={vehicleQuery} /></div></label><select aria-label="Vehicle" onChange={(event) => update("vehicleId", event.target.value)} value={form.vehicleId}><option value="">Select vehicle</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicleLabel(vehicle)}</option>)}</select>{selectedVehicle ? <p><Check />{vehicleLabel(selectedVehicle)}<small>Canonical vehicle record</small></p> : <Link href="/vehicles/workflows/add-vehicle">Vehicle not found? Add vehicle</Link>}</div>
          </div>
        </section>

        <section className="sic-card sic-concern">
          <header><span>2</span><div><h2>Customer concern</h2><p>Record what the customer reports in their own words. This becomes the technician&apos;s starting context.</p></div><em>{form.concernSummary.length} / 2,000</em></header>
          <label className="sic-concern-field"><span>What is the customer experiencing? <b>Required</b></span><textarea autoFocus maxLength={2000} onChange={(event) => update("concernSummary", event.target.value)} placeholder="Example: Customer reports a grinding noise from the front passenger side when braking below 25 mph. It started three days ago and is getting louder. ABS warning light came on this morning…" rows={9} value={form.concernSummary} /><small><MessageSquareText />Be specific about the symptom, location, conditions, timing, and what changed.</small></label>
          <div className="sic-prompts"><span><Sparkles />Helpful prompts</span>{["Customer states…", "Occurs when…", "Started approximately…", "Warning light/message…", "Previous repair related to…"].map((prompt) => <button key={prompt} onClick={() => addPrompt(prompt)} type="button">+ {prompt}</button>)}</div>
          <div className="sic-three-column"><label><span>When did it start?</span><input onChange={(event) => update("onset", event.target.value)} placeholder="Today, last week, after repair…" value={form.onset} /></label><label><span>Frequency / conditions</span><input onChange={(event) => update("frequency", event.target.value)} placeholder="Constant, cold start, highway…" value={form.frequency} /></label><label><span>Warning indicators</span><input onChange={(event) => update("warningIndicators", event.target.value)} placeholder="ABS, check engine, message…" value={form.warningIndicators} /></label></div>
          <label className="sic-notes"><span>Advisor-only intake notes</span><textarea maxLength={2000} onChange={(event) => update("intakeNotes", event.target.value)} placeholder="Observations, prior conversations, access instructions, or context not stated by the customer." rows={4} value={form.intakeNotes} /></label>
        </section>

        <section className="sic-card">
          <header><span>3</span><div><h2>Visit, custody &amp; promise</h2><p>Establish who has the vehicle, how the customer is traveling, and who owns the next action.</p></div></header>
          <div className="sic-three-column">
            <label><span><Clock3 />Arrival</span><input onChange={(event) => update("arrivedAt", event.target.value)} required type="datetime-local" value={form.arrivedAt} /></label>
            <label><span><CalendarClock />Intake target</span><input onChange={(event) => update("targetAt", event.target.value)} required type="datetime-local" value={form.targetAt} /></label>
            <label><span>Customer promise</span><input onChange={(event) => update("promisedAt", event.target.value)} type="datetime-local" value={form.promisedAt} /></label>
            <label><span>Location</span><select onChange={(event) => update("locationId", event.target.value)} value={form.locationId}>{options.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
            <label><span>Advisor / owner</span><select onChange={(event) => update("ownerUserId", event.target.value)} value={form.ownerUserId}>{options.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <label><span>Priority</span><select onChange={(event) => update("urgency", event.target.value)} value={form.urgency}><option value="STANDARD">Standard</option><option value="WAITING_CUSTOMER">Customer waiting</option><option value="SAFETY_CONCERN">Potential safety concern</option><option value="COMEBACK_REVIEW">Possible comeback</option></select></label>
            <label><span><KeyRound />Keys received</span><input max={20} min={0} onChange={(event) => update("keysReceivedCount", Number(event.target.value))} type="number" value={form.keysReceivedCount} /></label>
            <label><span>Key tag</span><input onChange={(event) => update("keyTag", event.target.value)} placeholder="Tag or locker reference" value={form.keyTag} /></label>
            <label><span>Transportation</span><select onChange={(event) => update("transportMode", event.target.value)} value={form.transportMode}><option value="CUSTOMER_WAITING">Customer waiting</option><option value="DROP_OFF">Drop-off</option><option value="LOANER">Loaner</option><option value="SHUTTLE">Shuttle</option><option value="TOW">Tow</option><option value="OTHER">Other</option></select></label>
          </div>
          <div className="sic-two-column sic-consent">
            <label><span>Consent status</span><select onChange={(event) => update("consentStatus", event.target.value as IntakeState["consentStatus"])} value={form.consentStatus}><option value="PENDING">Pending</option><option value="DOCUMENTED">Documented</option><option value="NOT_REQUIRED">Not required</option></select></label>
            {form.consentStatus === "DOCUMENTED" ? <><label><span>Consent reference</span><input onChange={(event) => update("consentReference", event.target.value)} placeholder="Signature, call, or document reference" value={form.consentReference} /></label><label><span>Consent recorded at</span><input onChange={(event) => update("consentedAt", event.target.value)} type="datetime-local" value={form.consentedAt} /></label></> : null}
            <label><span>Promise notes</span><input onChange={(event) => update("promiseNotes", event.target.value)} placeholder="What did we commit to communicate or complete?" value={form.promiseNotes} /></label>
          </div>
        </section>
      </main>

      <aside className="sic-sidebar">
        <section className="sic-summary"><p>Live intake summary</p><h2>{selectedCustomer?.displayName ?? "Select customer"}</h2><span>{selectedVehicle ? vehicleLabel(selectedVehicle) : "Select vehicle"}</span><dl><div><dt>Location</dt><dd>{selectedLocation?.name ?? "Required"}</dd></div><div><dt>Owner</dt><dd>{selectedOwner?.name ?? "Required"}</dd></div><div><dt>Transportation</dt><dd>{form.transportMode.replaceAll("_", " ").toLocaleLowerCase()}</dd></div><div><dt>Target</dt><dd>{form.targetAt ? new Date(form.targetAt).toLocaleString() : "Required"}</dd></div></dl></section>
        <section className="sic-readiness"><h2>Check-in readiness</h2>{readiness.map((item) => <p className={item.ready ? "ready" : ""} key={item.label}><i>{item.ready ? <Check /> : null}</i><span>{item.label}</span><b>{item.ready ? "Ready" : "Required"}</b></p>)}<strong>{readiness.filter((item) => item.ready).length} of {readiness.length} complete</strong></section>
        <section className="sic-effects"><ShieldCheck /><div><h2>What this creates</h2><p>One governed repair order, immutable intake evidence, accountable ownership, and a visible Unassigned/Intake work item.</p></div></section>
      </aside>
    </div>

    <footer className="sic-footer"><div><Link href="/vehicles/shop-recon">Cancel</Link><span><ShieldCheck />No repair authorization or estimate approval is implied by check-in.</span></div><button disabled={busy || !ready} type="submit">{busy ? "Creating repair order…" : "Complete Check-In & Create Repair Order"}<ChevronRight /></button></footer>
  </form>;
}
