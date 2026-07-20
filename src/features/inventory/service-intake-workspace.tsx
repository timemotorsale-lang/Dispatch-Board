"use client";

import {
  CalendarClock,
  CalendarDays,
  CarFront,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  KeyRound,
  MessageSquareText,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

export type ServiceIntakeOptions = {
  appointments: Array<{ appointmentNumber: string; id: string; locationId: string; startsAt: string | null; title: string; participants: Array<{ customer: null | { customerNumber?: string; displayName: string; email?: string | null; id: string; phoneNumber?: string | null } }>; vehicles: Array<{ vehicle: { color?: string | null; id: string; licensePlate?: string | null; make: string | null; model: string | null; vehicleNumber: string; vin?: string | null; year: number | null } }> }>;
  customers: Array<{ customerNumber?: string; displayName: string; email?: string | null; id: string; phoneNumber?: string | null }>;
  locations: Array<{ code?: string; id: string; name: string }>;
  repairOrders: Array<{ customer: null | { displayName: string }; id: string; operatingState: string; repairOrderNumber: string; stage: string; vehicle: ServiceIntakeOptions["vehicles"][number] }>;
  users: Array<{ email?: string; id: string; name: string }>;
  vehicles: Array<{ color?: string | null; id: string; licensePlate?: string | null; make: string | null; model: string | null; vehicleNumber: string; vin?: string | null; year: number | null }>;
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

type ServiceReadiness = {
  appointment: null | { appointmentNumber: string; attendanceStatus: string; endsAt: string | null; expectedVersion: number; id: string; owner: string | null; startsAt: string | null; timing: string; title: string };
  alternatives: string[];
  canAcceptCustody: true;
  checks: Array<{ code: string; label: string; message: string; status: "PASS" | "REVIEW" | "WARNING" }>;
  confidence: "HIGH" | "LOW" | "MEDIUM";
  diagnosisOutlook: "CAPACITY_REVIEW" | "LIKELY_TODAY" | "SCHEDULED_WINDOW";
  expiresAt: string;
  facts: { activeBayCapacity: number; activeStaffCapacity: number; availableBayCapacity: number; availableStaffCapacity: number; matchedAppointmentCount: number; openRepairOrders: number; overdueRepairOrders: number; reservedBayCapacity: number; reservedStaffCapacity: number };
  generatedAt: string;
  policyVersion: string;
  promiseConfidence: "CONDITIONAL" | "DO_NOT_PROMISE" | "HIGH";
  recommendation: string;
  snapshotId: string;
  status: "ACCEPT_WITH_CONSTRAINTS" | "MANAGER_REVIEW" | "READY";
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
    customerId: "",
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
    vehicleId: "",
    warningIndicators: "",
  };
}

export function ServiceIntakeWorkspace({ options }: { options: ServiceIntakeOptions }) {
  const [form, setForm] = useState<IntakeState>(() => buildInitial(options));
  const [arrivalQuery, setArrivalQuery] = useState("");
  const [arrivalMode, setArrivalMode] = useState<"recent" | "search" | "today">("search");
  const [customerRecords, setCustomerRecords] = useState(options.customers);
  const [vehicleRecords, setVehicleRecords] = useState(options.vehicles);
  const [drawer, setDrawer] = useState<"customer" | "vehicle" | null>(null);
  const [newCustomer, setNewCustomer] = useState({ address: "", displayName: "", email: "", phoneNumber: "", preferredContactMethod: "PHONE" });
  const [newVehicle, setNewVehicle] = useState({ color: "", licensePlate: "", make: "", model: "", vin: "", year: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [created, setCreated] = useState<{ id: string; repairOrderNumber: string } | null>(null);
  const [readiness, setReadiness] = useState<ServiceReadiness | null>(null);
  const [readinessError, setReadinessError] = useState("");
  const [readinessLoading, setReadinessLoading] = useState(false);

  const arrivalMatches = useMemo(() => {
    const query = arrivalQuery.trim().toLocaleLowerCase();
    const contains = (value: unknown) => String(value ?? "").toLocaleLowerCase().includes(query);
    if (!query && arrivalMode === "today") {
      const today = new Date().toDateString();
      return { appointments: options.appointments.filter((appointment) => appointment.startsAt && new Date(appointment.startsAt).toDateString() === today).slice(0, 8), customers: [], repairOrders: [], vehicles: [] };
    }
    if (!query && arrivalMode === "recent") return { appointments: [], customers: customerRecords.slice(0, 8), repairOrders: [], vehicles: [] };
    if (!query) return { appointments: [], customers: [], repairOrders: [], vehicles: [] };
    return {
      appointments: options.appointments.filter((appointment) => contains(appointment.appointmentNumber) || contains(appointment.title) || contains(appointment.participants[0]?.customer?.displayName) || contains(appointment.vehicles[0]?.vehicle.vin) || contains(appointment.vehicles[0]?.vehicle.licensePlate)).slice(0, 4),
      customers: customerRecords.filter((customer) => contains(customer.displayName) || contains(customer.customerNumber) || contains(customer.phoneNumber) || contains(customer.email)).slice(0, 4),
      repairOrders: options.repairOrders.filter((order) => contains(order.repairOrderNumber) || contains(order.customer?.displayName) || contains(vehicleLabel(order.vehicle)) || contains(order.vehicle.vin) || contains(order.vehicle.licensePlate)).slice(0, 4),
      vehicles: vehicleRecords.filter((vehicle) => contains(vehicleLabel(vehicle)) || contains(vehicle.vin) || contains(vehicle.licensePlate)).slice(0, 4),
    };
  }, [arrivalMode, arrivalQuery, customerRecords, options.appointments, options.repairOrders, vehicleRecords]);
  const selectedVehicle = vehicleRecords.find((vehicle) => vehicle.id === form.vehicleId);
  const selectedCustomer = customerRecords.find((customer) => customer.id === form.customerId);
  const selectedLocation = options.locations.find((location) => location.id === form.locationId);
  const selectedOwner = options.users.find((user) => user.id === form.ownerUserId);
  const checklist = [
    { label: "Customer selected", ready: Boolean(form.customerId) },
    { label: "Vehicle selected", ready: Boolean(form.vehicleId) },
    { label: "Concern captured", ready: form.concernSummary.trim().length >= 10 },
    { label: "Keys & transportation", ready: form.keysReceivedCount >= 0 && Boolean(form.transportMode) },
    { label: "Live service readiness", ready: Boolean(readiness) },
    { label: "Owner & target", ready: Boolean(form.ownerUserId && form.targetAt) },
    { label: "Consent disposition", ready: form.consentStatus !== "DOCUMENTED" || Boolean(form.consentReference && form.consentedAt) },
  ];
  const ready = checklist.every((item) => item.ready);

  const evaluateReadiness = useCallback(async () => {
    if (!form.customerId || !form.vehicleId || !form.locationId || !form.arrivedAt) {
      setReadiness(null);
      setReadinessError("");
      return null;
    }
    setReadinessLoading(true);
    setReadinessError("");
    try {
      const response = await fetch("/api/service-intake/readiness", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ arrivedAt: new Date(form.arrivedAt).toISOString(), customerId: form.customerId, locationId: form.locationId, vehicleId: form.vehicleId }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.readiness) throw new Error(body.error ?? "Live service readiness is unavailable.");
      setReadiness(body.readiness as ServiceReadiness);
      return body.readiness as ServiceReadiness;
    } catch (error) {
      setReadiness(null);
      setReadinessError(error instanceof Error ? error.message : "Live service readiness is unavailable.");
      return null;
    } finally {
      setReadinessLoading(false);
    }
  }, [form.arrivedAt, form.customerId, form.locationId, form.vehicleId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void evaluateReadiness(), 0);
    return () => window.clearTimeout(timer);
  }, [evaluateReadiness]);

  function update<K extends keyof IntakeState>(key: K, value: IntakeState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addPrompt(prompt: string) {
    setForm((current) => ({ ...current, concernSummary: current.concernSummary ? `${current.concernSummary.trim()} ${prompt}` : prompt }));
  }

  function chooseCustomer(customerId: string) {
    update("customerId", customerId);
    setArrivalQuery("");
  }

  function chooseVehicle(vehicleId: string) {
    update("vehicleId", vehicleId);
    setArrivalQuery("");
  }

  function chooseAppointment(appointment: ServiceIntakeOptions["appointments"][number]) {
    const customer = appointment.participants[0]?.customer;
    const vehicle = appointment.vehicles[0]?.vehicle;
    if (customer && !customerRecords.some((record) => record.id === customer.id)) setCustomerRecords((records) => [...records, customer]);
    if (vehicle && !vehicleRecords.some((record) => record.id === vehicle.id)) setVehicleRecords((records) => [...records, vehicle]);
    setForm((current) => ({ ...current, customerId: customer?.id ?? current.customerId, vehicleId: vehicle?.id ?? current.vehicleId, locationId: appointment.locationId || current.locationId }));
    setArrivalQuery("");
  }

  async function createCustomer() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/service-intake/customers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...newCustomer, locationId: form.locationId }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.customer) throw new Error(body.error ?? "Customer could not be created.");
      const customer = body.customer as ServiceIntakeOptions["customers"][number];
      setCustomerRecords((records) => records.some((record) => record.id === customer.id) ? records : [...records, customer]);
      update("customerId", customer.id);
      setDrawer(null);
      setNewCustomer({ address: "", displayName: "", email: "", phoneNumber: "", preferredContactMethod: "PHONE" });
      setNotice(body.duplicate ? "An existing matching customer was selected; no duplicate was created." : "Customer created and selected for this intake.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Customer could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function createVehicle() {
    const normalizedVin = newVehicle.vin.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const existing = vehicleRecords.find((vehicle) => vehicle.vin?.toUpperCase() === normalizedVin || newVehicle.licensePlate && vehicle.licensePlate?.toUpperCase() === newVehicle.licensePlate.toUpperCase());
    if (existing) {
      chooseVehicle(existing.id);
      setDrawer(null);
      setNotice("A matching vehicle already exists and was selected; no duplicate was created.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/vehicles", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...newVehicle, year: newVehicle.year ? Number(newVehicle.year) : null, locationId: form.locationId, idempotencyKey: crypto.randomUUID(), reason: "Create a canonical customer vehicle during governed service intake." }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.result?.id) throw new Error(body.error ?? "Vehicle could not be created.");
      const vehicle = { ...newVehicle, id: String(body.result.id), year: newVehicle.year ? Number(newVehicle.year) : null, vehicleNumber: String(body.result.vehicleNumber), vin: normalizedVin } satisfies ServiceIntakeOptions["vehicles"][number];
      setVehicleRecords((records) => [...records, vehicle]);
      update("vehicleId", vehicle.id);
      if (form.customerId) {
        await fetch(`/api/vehicles/${encodeURIComponent(vehicle.id)}/commands`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "ADD_RELATIONSHIP", customerId: form.customerId, effectiveFrom: new Date().toISOString(), expectedVersion: Number(body.version ?? 1), idempotencyKey: crypto.randomUUID(), locationId: form.locationId, reason: "Link the newly created service vehicle to the intake customer.", relationshipType: "SERVICE_ONLY", sourceCode: "SERVICE_INTAKE" }) });
      }
      setDrawer(null);
      setNewVehicle({ color: "", licensePlate: "", make: "", model: "", vin: "", year: "" });
      setNotice(body.result.duplicateReviewId ? "Vehicle created with a possible-duplicate review flag and selected for intake." : "Vehicle created and selected for this intake.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Vehicle could not be created.");
    } finally {
      setBusy(false);
    }
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
      const freshReadiness = await evaluateReadiness();
      if (!freshReadiness) throw new Error("A current service-readiness evaluation is required before check-in.");
      const appointment = freshReadiness.appointment;
      if (appointment && appointment.attendanceStatus === "EXPECTED") {
        const commandKey = `service-intake-check-in-${appointment.id}-${crypto.randomUUID()}`;
        const appointmentResponse = await fetch("/api/appointments/commands", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ appointmentId: appointment.id, commandType: "CHECK_IN", correlationId: commandKey, expectedAppointmentVersion: appointment.expectedVersion, idempotencyKey: commandKey, payload: {} }) });
        const appointmentBody = await appointmentResponse.json().catch(() => ({}));
        if (!appointmentResponse.ok || !appointmentBody.accepted) throw new Error(appointmentBody.error ?? appointmentBody.execution?.rejectionReasons?.join(" ") ?? "The matched appointment could not be checked in.");
      }
      const response = await fetch("/api/repair-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment?.id ?? null,
          arrivedAt: new Date(form.arrivedAt).toISOString(),
          concernSummary: form.concernSummary,
          consentReference: form.consentReference || null,
          consentStatus: form.consentStatus,
          consentedAt: form.consentedAt ? new Date(form.consentedAt).toISOString() : null,
          customerId: appointment ? null : form.customerId,
          idempotencyKey: crypto.randomUUID(),
          intakeNotes: structuredNotes || null,
          intakeSource: appointment ? "APPOINTMENT" : "WALK_IN",
          inventoryUnitId: null,
          keyTag: form.keyTag || null,
          keysReceivedCount: form.keysReceivedCount,
          locationId: form.locationId,
          nextAction: form.nextAction,
          operatingState: "ACTIVE",
          ownerUserId: form.ownerUserId,
          promisedAt: form.promisedAt ? new Date(form.promisedAt).toISOString() : null,
          promiseNotes: form.promiseNotes || null,
          readinessSnapshotId: freshReadiness.snapshotId,
          reason: appointment
            ? "Create governed appointment service intake with attributable customer, vehicle, concern, custody, and readiness facts."
            : "Create governed walk-in service intake with attributable customer, vehicle, concern, custody, and readiness facts.",
          stateReason: null,
          targetAt: new Date(form.targetAt).toISOString(),
          transportMode: form.transportMode,
          vehicleId: appointment ? null : form.vehicleId,
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

  return <form className="service-intake-shell sic-reference-v2" onSubmit={submit}>
    <header className="sic-header">
      <div><Link className="sic-back-to-shop" href="/vehicles/shop-recon">← Back to Shop &amp; Recon</Link><span className="sic-advisor-label">Advisor Workspace</span><i /><h1>Check In Vehicle</h1><span className="sic-governed"><ShieldCheck />Governed intake</span></div>
      <div className="sic-header-state"><ShieldCheck /><span><strong>Governed intake</strong>Canonical records, policy gates, and audit history are enforced.</span></div>
    </header>

    <nav aria-label="Check-in progress" className="sic-progress">
      <span className="active"><b>1</b><i>Find Arrival</i></span><em /><span><b>2</b><i>Appointment &amp; Capacity</i></span><em /><span><b>3</b><i>Customer Concern</i></span><em /><span><b>4</b><i>Authorization &amp; Handoff</i></span>
    </nav>

    {notice ? <div className={ready ? "sic-notice" : "sic-notice error"} role="status"><ClipboardCheck />{notice}</div> : null}

    <div className="sic-layout">
      <main className="sic-main">
        <section className="sic-card sic-identity sic-find-arrival">
          <header><span>1</span><div><h2>Find Customer, Vehicle, or Appointment</h2><p>Search canonical records before creating work. No match? Create the missing record without leaving intake.</p></div></header>
          <label className="sic-arrival-search"><Search /><input aria-label="Find customer, vehicle, or appointment" onChange={(event) => { setArrivalMode("search"); setArrivalQuery(event.target.value); }} placeholder="Search name, phone, email, VIN, plate, appointment, or RO..." type="search" value={arrivalQuery} /></label>
          <div className="sic-arrival-actions"><div><button onClick={() => { setArrivalQuery(""); setArrivalMode("today"); }} type="button"><CalendarDays />Today&apos;s Arrivals</button><button onClick={() => { setArrivalQuery(""); setArrivalMode("recent"); }} type="button"><UserRound />Recent Customers</button><button onClick={() => { setArrivalMode("search"); setArrivalQuery(""); setNotice("Walk-in intake selected. Find or add the customer and vehicle to continue."); }} type="button">Walk-In</button><button onClick={() => { update("transportMode", "TOW"); setNotice("Tow-in selected. Capture the customer, vehicle, keys, and custody facts before check-in."); }} type="button"><CarFront />Tow-In</button></div><div><button className="create" onClick={() => setDrawer("customer")} type="button"><Plus />Add New Customer</button><button className="create" onClick={() => setDrawer("vehicle")} type="button"><Plus />Add New Vehicle</button></div></div>
          {arrivalQuery || arrivalMode !== "search" ? <div className="sic-arrival-results" role="listbox" aria-label="Arrival search results">
            {arrivalMatches.appointments.map((appointment) => <button key={appointment.id} onClick={() => chooseAppointment(appointment)} type="button"><CalendarClock /><span><strong>{appointment.appointmentNumber} · {appointment.title}</strong><small>{appointment.participants[0]?.customer?.displayName ?? "Customer"} · {appointment.vehicles[0] ? vehicleLabel(appointment.vehicles[0].vehicle) : "Vehicle not linked"}</small></span><b>Appointment</b></button>)}
            {arrivalMatches.customers.map((customer) => <button key={customer.id} onClick={() => chooseCustomer(customer.id)} type="button"><UserRound /><span><strong>{customer.displayName}</strong><small>{customer.phoneNumber ?? customer.email ?? customer.customerNumber ?? "Canonical customer"}</small></span><b>Customer</b></button>)}
            {arrivalMatches.repairOrders.map((order) => <Link href={`/vehicles/repair-orders?repairOrderId=${order.id}`} key={order.id}><ClipboardCheck /><span><strong>{order.repairOrderNumber} · {vehicleLabel(order.vehicle)}</strong><small>{order.customer?.displayName ?? "Internal vehicle"} · {order.stage.replaceAll("_", " ")}</small></span><b>Open RO</b></Link>)}
            {arrivalMatches.vehicles.map((vehicle) => <button key={vehicle.id} onClick={() => chooseVehicle(vehicle.id)} type="button"><CarFront /><span><strong>{vehicleLabel(vehicle)}</strong><small>{vehicle.vin ?? vehicle.licensePlate ?? "Canonical vehicle"}</small></span><b>Vehicle</b></button>)}
            {!arrivalMatches.appointments.length && !arrivalMatches.customers.length && !arrivalMatches.repairOrders.length && !arrivalMatches.vehicles.length ? <div className="sic-arrival-empty"><strong>No matching record found</strong><span>Add a new customer or vehicle, or refine the search.</span></div> : null}
          </div> : null}
          <div className="sic-selected-arrival">
            <article className={selectedCustomer ? "selected" : ""}><UserRound /><div><small>Customer</small><strong>{selectedCustomer?.displayName ?? "Select customer"}</strong><span>{selectedCustomer?.phoneNumber ?? selectedCustomer?.email ?? "Search or add a canonical customer"}</span></div>{selectedCustomer ? <button onClick={() => update("customerId", "")} type="button">Change</button> : null}</article>
            <article className={selectedVehicle ? "selected" : ""}><CarFront /><div><small>Vehicle</small><strong>{selectedVehicle ? vehicleLabel(selectedVehicle) : "Select vehicle"}</strong><span>{selectedVehicle?.vin ?? selectedVehicle?.licensePlate ?? "Search or add a canonical vehicle"}</span></div>{selectedVehicle ? <button onClick={() => update("vehicleId", "")} type="button">Change</button> : null}</article>
            <article className={readiness?.appointment ? "selected appointment" : ""}><CalendarClock /><div><small>Appointment</small><strong>{readiness?.appointment?.appointmentNumber ?? "No appointment matched"}</strong><span>{readiness?.appointment?.startsAt ? new Date(readiness.appointment.startsAt).toLocaleString() : "Walk-in readiness will apply"}</span></div></article>
          </div>
        </section>

        <section className={`sic-card sic-live-readiness ${readiness?.status.toLocaleLowerCase().replaceAll("_", "-") ?? "loading"}`}>
          <header><span><CalendarClock /></span><div><h2>Live service readiness</h2><p>Appointment match, current shop load, staff, bay capacity, resource reservations, and promise risk.</p></div><button disabled={readinessLoading || !form.customerId || !form.vehicleId} onClick={() => void evaluateReadiness()} type="button">{readinessLoading ? "Checking…" : "Refresh live facts"}</button></header>
          {readiness ? <><div className="sic-capacity-grid">
            <article className="appointment"><small>Matched appointment</small><strong>{readiness.appointment?.startsAt ? new Date(readiness.appointment.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Walk-in"}</strong><span>{readiness.appointment?.appointmentNumber ?? "Current capacity"}</span></article>
            <article><small>Arrival status</small><b className="status">{readiness.appointment?.timing ?? "ARRIVED"}</b><span>{new Date(form.arrivedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span></article>
            <article><small>Staff</small><strong>{readiness.facts.availableStaffCapacity} / {readiness.facts.activeStaffCapacity}</strong><i><em style={{ width: `${Math.min(100, readiness.facts.availableStaffCapacity / Math.max(1, readiness.facts.activeStaffCapacity) * 100)}%` }} /></i></article>
            <article><small>Bays</small><strong>{readiness.facts.availableBayCapacity} / {readiness.facts.activeBayCapacity}</strong><i><em style={{ width: `${Math.min(100, readiness.facts.availableBayCapacity / Math.max(1, readiness.facts.activeBayCapacity) * 100)}%` }} /></i></article>
            <article><small>Shop load</small><strong>{readiness.facts.openRepairOrders}</strong><span>{readiness.facts.overdueRepairOrders} overdue</span></article>
            <article><small>Promise confidence</small><strong>{readiness.promiseConfidence.replaceAll("_", " ")}</strong><span>{readiness.diagnosisOutlook.replaceAll("_", " ")}</span></article>
            <article className="decision"><small>Intake decision</small><b>{readiness.status === "READY" ? "Accept" : readiness.status === "ACCEPT_WITH_CONSTRAINTS" ? "Accept with constraints" : "Manager review"}</b><span>{readiness.recommendation}</span></article>
          </div><footer><span>Custody: Accept</span><span>Diagnosis: {readiness.diagnosisOutlook.replaceAll("_", " ").toLocaleLowerCase()}</span><span>Promise: {readiness.promiseConfidence.replaceAll("_", " ").toLocaleLowerCase()}</span><span>Live snapshot {new Date(readiness.generatedAt).toLocaleTimeString()}</span></footer></> : <div className={readinessError ? "sic-readiness-unavailable error" : "sic-readiness-unavailable"}><CalendarClock /><div><strong>{readinessError ? "Readiness unavailable" : "Select a customer and vehicle"}</strong><span>{readinessError || "Live appointment and capacity facts will appear here."}</span></div></div>}
        </section>

        <section className="sic-card sic-concern">
          <header><span>3</span><div><h2>Customer concern</h2><p>Record what the customer reports in their own words. This becomes the technician&apos;s starting context.</p></div><em>{form.concernSummary.length} / 2,000</em></header>
          <label className="sic-concern-field"><span>What is the customer experiencing? <b>Required</b></span><textarea maxLength={2000} onChange={(event) => update("concernSummary", event.target.value)} placeholder="Example: Customer reports a grinding noise from the front passenger side when braking below 25 mph. It started three days ago and is getting louder. ABS warning light came on this morning…" rows={5} value={form.concernSummary} /><small><MessageSquareText />Be specific about the symptom, location, conditions, timing, and what changed.</small></label>
          <div className="sic-prompts"><span><Sparkles />Helpful prompts</span>{["Customer states…", "Occurs when…", "Started approximately…", "Warning light/message…", "Previous repair related to…"].map((prompt) => <button key={prompt} onClick={() => addPrompt(prompt)} type="button">+ {prompt}</button>)}</div>
          <details className="sic-more-context"><summary>Additional concern context &amp; advisor notes</summary><div className="sic-three-column"><label><span>When did it start?</span><input onChange={(event) => update("onset", event.target.value)} placeholder="Today, last week, after repair…" value={form.onset} /></label><label><span>Frequency / conditions</span><input onChange={(event) => update("frequency", event.target.value)} placeholder="Constant, cold start, highway…" value={form.frequency} /></label><label><span>Warning indicators</span><input onChange={(event) => update("warningIndicators", event.target.value)} placeholder="ABS, check engine, message…" value={form.warningIndicators} /></label></div><label className="sic-notes"><span>Advisor-only intake notes</span><textarea maxLength={2000} onChange={(event) => update("intakeNotes", event.target.value)} placeholder="Observations, prior conversations, access instructions, or context not stated by the customer." rows={3} value={form.intakeNotes} /></label></details>
        </section>

        <section className="sic-card sic-custody-card">
          <header><div><h2>Visit &amp; Custody</h2><p>Establish arrival, keys, and customer transportation.</p></div></header>
          <div className="sic-custody-row">
            <label><span><Clock3 />Arrival</span><input onChange={(event) => update("arrivedAt", event.target.value)} required type="datetime-local" value={form.arrivedAt} /></label>
            <label><span><KeyRound />Keys received</span><input max={20} min={0} onChange={(event) => update("keysReceivedCount", Number(event.target.value))} type="number" value={form.keysReceivedCount} /></label>
            <label><span>Key tag</span><input onChange={(event) => update("keyTag", event.target.value)} placeholder="Tag reference" value={form.keyTag} /></label>
            <label><span>Transportation</span><select onChange={(event) => update("transportMode", event.target.value)} value={form.transportMode}><option value="CUSTOMER_WAITING">Customer waiting</option><option value="DROP_OFF">Customer drive / drop-off</option><option value="LOANER">Loaner</option><option value="SHUTTLE">Shuttle</option><option value="TOW">Tow</option><option value="OTHER">Other</option></select></label>
          </div>
          <details className="sic-more-context"><summary>Authorization, ownership, promise &amp; advanced custody</summary><div className="sic-three-column"><label><span><CalendarClock />Intake target</span><input onChange={(event) => update("targetAt", event.target.value)} required type="datetime-local" value={form.targetAt} /></label><label><span>Customer promise</span><input onChange={(event) => update("promisedAt", event.target.value)} type="datetime-local" value={form.promisedAt} /></label><label><span>Location</span><select onChange={(event) => update("locationId", event.target.value)} value={form.locationId}>{options.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><label><span>Advisor / owner</span><select onChange={(event) => update("ownerUserId", event.target.value)} value={form.ownerUserId}>{options.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label><span>Priority</span><select onChange={(event) => update("urgency", event.target.value)} value={form.urgency}><option value="STANDARD">Standard</option><option value="WAITING_CUSTOMER">Customer waiting</option><option value="SAFETY_CONCERN">Potential safety concern</option><option value="COMEBACK_REVIEW">Possible comeback</option></select></label></div><div className="sic-two-column sic-consent">
            <label><span>Consent status</span><select onChange={(event) => update("consentStatus", event.target.value as IntakeState["consentStatus"])} value={form.consentStatus}><option value="PENDING">Pending</option><option value="DOCUMENTED">Documented</option><option value="NOT_REQUIRED">Not required</option></select></label>
            {form.consentStatus === "DOCUMENTED" ? <><label><span>Consent reference</span><input onChange={(event) => update("consentReference", event.target.value)} placeholder="Signature, call, or document reference" value={form.consentReference} /></label><label><span>Consent recorded at</span><input onChange={(event) => update("consentedAt", event.target.value)} type="datetime-local" value={form.consentedAt} /></label></> : null}
            <label><span>Promise notes</span><input onChange={(event) => update("promiseNotes", event.target.value)} placeholder="What did we commit to communicate or complete?" value={form.promiseNotes} /></label>
          </div></details>
        </section>
      </main>

      <aside className="sic-sidebar">
        <section className="sic-intake-summary"><h2>Live Intake Summary</h2><article><UserRound /><div><small>Customer</small><strong>{selectedCustomer?.displayName ?? "Select customer"}</strong><span>{selectedCustomer?.phoneNumber ?? selectedCustomer?.email ?? "Canonical customer required"}</span></div></article><article><CarFront /><div><small>Vehicle</small><strong>{selectedVehicle ? vehicleLabel(selectedVehicle) : "Select vehicle"}</strong><span>{selectedVehicle?.vin ?? selectedVehicle?.licensePlate ?? "Canonical vehicle required"}</span></div></article><article><CalendarClock /><div><small>Appointment</small><strong>{readiness?.appointment?.appointmentNumber ?? "No appointment matched"}</strong><span>{readiness?.appointment?.startsAt ? new Date(readiness.appointment.startsAt).toLocaleString() : "Walk-in readiness applies"}</span></div></article><div className="sic-summary-progress"><span>Readiness overview</span><b>{checklist.filter((item) => item.ready).length}/{checklist.length} complete</b><i><em style={{ width: `${checklist.filter((item) => item.ready).length / checklist.length * 100}%` }} /></i></div><dl><div><dt>Custody status</dt><dd>{form.keysReceivedCount > 0 ? "Accept" : "Review"}</dd></div><div><dt>Advisor</dt><dd>{selectedOwner?.name ?? "Required"}</dd></div><div><dt>Location</dt><dd>{selectedLocation?.name ?? "Required"}</dd></div><div><dt>Target update</dt><dd>{form.targetAt ? new Date(form.targetAt).toLocaleString() : "Required"}</dd></div></dl><div className="sic-readiness"><h2>Check-in requirements</h2>{checklist.map((item) => <p className={item.ready ? "ready" : ""} key={item.label}><i>{item.ready ? <Check /> : null}</i><span>{item.label}</span></p>)}<strong>{checklist.filter((item) => item.ready).length} / {checklist.length}</strong></div></section>
      </aside>
    </div>

    {drawer ? <div className="sic-drawer-backdrop" role="presentation"><section aria-label={drawer === "customer" ? "Add new customer" : "Add new vehicle"} aria-modal="true" className="sic-create-drawer" role="dialog">
      <header><div><small>Find Arrival</small><h2>{drawer === "customer" ? "Add New Customer" : "Add New Vehicle"}</h2><p>The server checks canonical records and duplicate signals before this record is selected.</p></div><button aria-label="Close" onClick={() => setDrawer(null)} type="button"><X /></button></header>
      {drawer === "customer" ? <div className="sic-drawer-fields">
        <label><span>Customer name <b>Required</b></span><input autoFocus onChange={(event) => setNewCustomer((value) => ({ ...value, displayName: event.target.value }))} value={newCustomer.displayName} /></label>
        <label><span>Mobile phone</span><input onChange={(event) => setNewCustomer((value) => ({ ...value, phoneNumber: event.target.value }))} type="tel" value={newCustomer.phoneNumber} /></label>
        <label><span>Email</span><input onChange={(event) => setNewCustomer((value) => ({ ...value, email: event.target.value }))} type="email" value={newCustomer.email} /></label>
        <label><span>Preferred contact</span><select onChange={(event) => setNewCustomer((value) => ({ ...value, preferredContactMethod: event.target.value }))} value={newCustomer.preferredContactMethod}><option value="PHONE">Phone</option><option value="SMS">Text message</option><option value="EMAIL">Email</option></select></label>
        <label className="wide"><span>Address</span><input onChange={(event) => setNewCustomer((value) => ({ ...value, address: event.target.value }))} value={newCustomer.address} /></label>
      </div> : <div className="sic-drawer-fields">
        <label className="wide"><span>VIN <b>Required</b></span><input autoFocus maxLength={17} onChange={(event) => setNewVehicle((value) => ({ ...value, vin: event.target.value.toUpperCase() }))} placeholder="17-character VIN" value={newVehicle.vin} /></label>
        <label><span>Year</span><input max={new Date().getFullYear() + 2} min={1886} onChange={(event) => setNewVehicle((value) => ({ ...value, year: event.target.value }))} type="number" value={newVehicle.year} /></label>
        <label><span>Make</span><input onChange={(event) => setNewVehicle((value) => ({ ...value, make: event.target.value }))} value={newVehicle.make} /></label>
        <label><span>Model</span><input onChange={(event) => setNewVehicle((value) => ({ ...value, model: event.target.value }))} value={newVehicle.model} /></label>
        <label><span>Color</span><input onChange={(event) => setNewVehicle((value) => ({ ...value, color: event.target.value }))} value={newVehicle.color} /></label>
        <label><span>License plate</span><input onChange={(event) => setNewVehicle((value) => ({ ...value, licensePlate: event.target.value.toUpperCase() }))} value={newVehicle.licensePlate} /></label>
      </div>}
      <footer><button onClick={() => setDrawer(null)} type="button">Cancel</button><button className="primary" disabled={busy || (drawer === "customer" ? !newCustomer.displayName || !newCustomer.phoneNumber && !newCustomer.email : newVehicle.vin.length !== 17)} onClick={() => void (drawer === "customer" ? createCustomer() : createVehicle())} type="button">{busy ? "Saving…" : drawer === "customer" ? "Create & Select Customer" : "Create & Select Vehicle"}</button></footer>
    </section></div> : null}

    <footer className="sic-footer"><div><Link href="/vehicles/shop-recon">Cancel</Link><span><ShieldCheck />No repair authorization or estimate approval is implied by check-in.</span></div><button disabled={busy || !ready} type="submit">{busy ? "Creating repair order…" : "Complete Check-In & Create Repair Order"}<ChevronRight /></button></footer>
  </form>;
}
