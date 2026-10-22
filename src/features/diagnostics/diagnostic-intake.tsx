"use client";

import {
  AlertTriangle, ArrowLeft, ArrowRight, CarFront, Check, CheckCircle2,
  FileUp, MessageSquareText, Plus, Save, ScanLine, Search, ShieldCheck, Stethoscope, UserRound, X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import { BarcodeScanner } from "@/features/mobile-capture/barcode-scanner";

import styles from "./diagnostic-intake.module.css";
import layoutStyles from "./diagnostic-intake-layout.module.css";

type Vehicle = { color?: string | null; id: string; licensePlate?: string | null; make: string | null; model: string | null; stockNumber?: string | null; vehicleNumber: string; vin?: string | null; year: number | null };
type Customer = { customerNumber?: string; displayName: string; email?: string | null; id: string; phoneNumber?: string | null };
type Location = { code?: string; id: string; name: string };
type User = { email?: string; id: string; name: string };
type RepairOrder = { customer: Customer | null; id: string; location: Location; operatingState: string; ownerUser: User; repairOrderNumber: string; serviceVisit: { concernSummary: string; transportMode: string }; stage: string; vehicle: Vehicle };

export type DiagnosticIntakeOptions = {
  customers: Customer[];
  locations: Location[];
  repairOrders: RepairOrder[];
  users: User[];
  vehicles: Vehicle[];
};

type Draft = {
  assignedUserId: string;
  authorization: "DOCUMENTED" | "NOT_REQUIRED" | "PENDING";
  authorizationReference: string;
  concern: string;
  customerId: string;
  frequency: string;
  locationId: string;
  operability: string;
  repairOrderId: string;
  riskTier: "R0" | "R1" | "R2" | "R3" | "R4";
  safetyScreening: string;
  staffClarification: string;
  symptomCategory: string;
  transportMode: string;
  vehicleId: string;
};

const steps = ["Vehicle & Visit", "Concern & Conditions", "Safety & Authorization", "Triage & Assignment", "Review & Create"];
const conditionChoices = ["After hot soak", "Engine cranks", "Check Engine light reported", "Cold start", "Under load", "After prior repair"];

function vehicleLabel(vehicle: Vehicle | null | undefined) {
  if (!vehicle) return "Vehicle not selected";
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber;
}

function commandKey(prefix: string) {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}-${suffix}`;
}

export function DiagnosticIntake({ options, permissions, rollout, viewer }: {
  options: DiagnosticIntakeOptions;
  permissions: { canAssign: boolean; canCreate: boolean };
  rollout: { executable: boolean; reason: string; targetAt?: string | null };
  viewer: { id: string; name: string };
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [arrival, setArrival] = useState<"EXISTING" | "APPOINTMENT" | "WALK_IN" | "INTERNAL" | "COMEBACK">("EXISTING");
  const [query, setQuery] = useState("");
  const [vehicleRecords, setVehicleRecords] = useState(options.vehicles);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [nonVin, setNonVin] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ color: "", licensePlate: "", make: "", model: "", nonVinReason: "", stockNumber: "", vin: "", year: "" });
  const [conditions, setConditions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    assignedUserId: viewer.id,
    authorization: "PENDING",
    authorizationReference: "",
    concern: "",
    customerId: "",
    frequency: "",
    locationId: options.locations[0]?.id ?? "",
    operability: "",
    repairOrderId: "",
    riskTier: "R1",
    safetyScreening: "",
    staffClarification: "",
    symptomCategory: "",
    transportMode: "DROP_OFF",
    vehicleId: "",
  });

  const selectedRepairOrder = options.repairOrders.find((item) => item.id === draft.repairOrderId);
  const selectedVehicle = vehicleRecords.find((item) => item.id === draft.vehicleId) ?? selectedRepairOrder?.vehicle;
  const selectedCustomer = options.customers.find((item) => item.id === draft.customerId) ?? selectedRepairOrder?.customer;
  const selectedTechnician = options.users.find((item) => item.id === draft.assignedUserId);

  const matches = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    const includes = (value: unknown) => String(value ?? "").toLocaleLowerCase().includes(normalized);
    if (!normalized) return { repairOrders: options.repairOrders.slice(0, 4), vehicles: [] as Vehicle[] };
    return {
      repairOrders: options.repairOrders.filter((item) => includes(item.repairOrderNumber) || includes(item.customer?.displayName) || includes(item.vehicle.vin) || includes(vehicleLabel(item.vehicle))).slice(0, 5),
      vehicles: vehicleRecords.filter((item) => includes(item.vin) || includes(item.vehicleNumber) || includes(item.licensePlate) || includes(item.stockNumber) || includes(vehicleLabel(item))).slice(0, 5),
    };
  }, [options.repairOrders, query, vehicleRecords]);

  const gates = [
    { label: "Vehicle identity", ready: Boolean(selectedVehicle) },
    { label: "Duplicate check", ready: Boolean(selectedVehicle) },
    { label: "Primary concern", ready: draft.concern.trim().length >= 10 },
    { label: "Service context", ready: Boolean(selectedRepairOrder || draft.customerId && draft.locationId) },
    { label: "Conditions detail", ready: Boolean(draft.symptomCategory && draft.frequency && draft.operability) },
    { label: "Safety screening", ready: Boolean(draft.safetyScreening) },
    { label: "Authorization", ready: draft.authorization !== "DOCUMENTED" || Boolean(draft.authorizationReference.trim()) },
    { label: "Assignment", ready: Boolean(draft.assignedUserId && draft.riskTier) },
  ];
  const completeCount = gates.filter((gate) => gate.ready).length;
  const allReady = completeCount === gates.length;
  const concernFacts = [draft.concern.trim().length >= 10, Boolean(draft.symptomCategory), Boolean(draft.frequency), Boolean(draft.operability), conditions.length > 0, attachments.length > 0];
  const concernFactsCaptured = concernFacts.filter(Boolean).length;
  const concernMissing = [
    !selectedVehicle && "Vehicle identity",
    draft.concern.trim().length < 10 && "Customer concern narrative",
    !draft.symptomCategory && "Symptom category",
    !draft.frequency && "Frequency",
    !draft.operability && "Operability",
  ].filter((item): item is string => Boolean(item));
  const nextConcernAction = !selectedVehicle
    ? "Identify the canonical vehicle"
    : draft.concern.trim().length < 10
      ? "Capture the customer's original concern"
      : !draft.symptomCategory
        ? "Classify the symptom family"
        : !draft.frequency
          ? "Record how frequently the condition occurs"
          : !draft.operability
            ? "Assess current vehicle operability"
            : "Proceed to safety and authorization review";
  const reportStatus = draft.concern.trim().length < 10
    ? "Concern statement required"
    : !selectedVehicle
      ? "Vehicle context required"
      : !draft.symptomCategory || !draft.frequency || !draft.operability
        ? "Concern documented — characterization incomplete"
        : "Ready for technician diagnostic review";

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function chooseRepairOrder(order: RepairOrder) {
    setDraft((current) => ({ ...current, concern: order.serviceVisit.concernSummary, customerId: order.customer?.id ?? "", locationId: order.location.id, repairOrderId: order.id, transportMode: order.serviceVisit.transportMode, vehicleId: order.vehicle.id }));
    setQuery("");
    setNotice(`${order.repairOrderNumber} selected as the authoritative service context.`);
  }

  function chooseVehicle(vehicle: Vehicle) {
    setDraft((current) => ({ ...current, repairOrderId: "", vehicleId: vehicle.id }));
    setQuery("");
    setNotice("Canonical vehicle selected. Choose its customer and service context to continue.");
  }

  function scanVin() {
    setScannerOpen(true);
  }

  const [scannerOpen, setScannerOpen] = useState(false);

  async function createVehicle() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...newVehicle,
          idempotencyKey: commandKey("diagnostic-intake-vehicle"),
          locationId: draft.locationId || null,
          nonVinReason: nonVin ? newVehicle.nonVinReason : undefined,
          reason: "Create a canonical vehicle from governed diagnostic intake.",
          vin: nonVin ? undefined : newVehicle.vin,
          workflowContext: { source: "DIAGNOSTIC_INTAKE" },
          year: newVehicle.year ? Number(newVehicle.year) : null,
        }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; result?: { duplicateReviewId?: string | null; id: string; vehicleNumber: string }; version?: number };
      if (!response.ok || !body.result?.id) throw new Error(body.error ?? "Vehicle could not be created.");
      if (body.result.duplicateReviewId) {
        setNotice("A possible duplicate was detected. Search and select the existing canonical vehicle or resolve the duplicate review before continuing.");
        return;
      }
      const vehicle: Vehicle = { ...newVehicle, id: body.result.id, vehicleNumber: body.result.vehicleNumber, vin: nonVin ? null : newVehicle.vin.toUpperCase(), year: newVehicle.year ? Number(newVehicle.year) : null };
      setVehicleRecords((records) => [...records, vehicle]);
      update("vehicleId", vehicle.id);
      setShowAddVehicle(false);
      setNewVehicle({ color: "", licensePlate: "", make: "", model: "", nonVinReason: "", stockNumber: "", vin: "", year: "" });
      setNotice("Vehicle created in the canonical registry and selected for this diagnostic intake.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Vehicle could not be created.");
    } finally {
      setBusy(false);
    }
  }

  function saveDraft() {
    localStorage.setItem("diagnostics-intake-draft", JSON.stringify({ arrival, attachments, conditions, draft, savedAt: new Date().toISOString() }));
    setNotice("Diagnostic intake draft saved on this workstation. No authoritative record was created.");
  }

  function continueFromStep() {
    if (step === 1) {
      setNotice("");
      setStep(2);
      window.scrollTo({ behavior: "smooth", top: 0 });
      return;
    }
    if (step === 2 && (!draft.symptomCategory || !draft.frequency || !draft.operability)) {
      setNotice("Review the Concern & Conditions report and complete symptom category, frequency, and operability before safety review.");
      window.scrollTo({ behavior: "smooth", top: 0 });
      return;
    }
    if (step === 3 && (!draft.safetyScreening || draft.authorization === "DOCUMENTED" && !draft.authorizationReference.trim())) {
      setNotice("Complete the safety and authorization disposition before continuing.");
      window.scrollTo({ behavior: "smooth", top: 0 });
      return;
    }
    if (step === 4 && (!draft.assignedUserId || !draft.riskTier)) {
      setNotice("Select the responsible technician and risk tier before review.");
      window.scrollTo({ behavior: "smooth", top: 0 });
      return;
    }
    setNotice("");
    setStep((current) => Math.min(5, current + 1));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!allReady) return setNotice("Complete every intake readiness gate before creating the diagnostic case.");
    if (!permissions.canCreate) return setNotice("Your account does not have authority to create diagnostic cases.");
    if (!rollout.executable) return setNotice(`Diagnostic case creation remains controlled by rollout policy (${rollout.reason.replaceAll("_", " ")}).`);
    setBusy(true);
    setNotice("");
    try {
      let repairOrderId = selectedRepairOrder?.id;
      if (!repairOrderId) {
        const now = new Date();
        const repairResponse = await fetch("/api/repair-orders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            appointmentId: null,
            arrivedAt: now.toISOString(),
            concernSummary: draft.concern,
            consentReference: draft.authorization === "DOCUMENTED" ? draft.authorizationReference : null,
            consentStatus: draft.authorization,
            consentedAt: draft.authorization === "DOCUMENTED" ? now.toISOString() : null,
            customerId: draft.customerId,
            idempotencyKey: commandKey("diagnostic-intake-ro"),
            intakeNotes: draft.staffClarification || null,
            intakeSource: "WALK_IN",
            inventoryUnitId: null,
            keyTag: null,
            keysReceivedCount: 1,
            locationId: draft.locationId,
            nextAction: "Complete diagnostic intake and begin technician triage",
            operatingState: "ACTIVE",
            ownerUserId: draft.assignedUserId,
            promisedAt: null,
            promiseNotes: null,
            readinessSnapshotId: null,
            reason: "Create governed service context for a diagnostic case from Diagnostics intake.",
            stateReason: null,
            targetAt: new Date(now.getTime() + 2 * 60 * 60_000).toISOString(),
            transportMode: draft.transportMode,
            vehicleId: draft.vehicleId,
          }),
        });
        const repairBody = await repairResponse.json().catch(() => ({})) as { error?: string; result?: { id: string } };
        if (!repairResponse.ok || !repairBody.result?.id) throw new Error(repairBody.error ?? "Service context could not be created.");
        repairOrderId = repairBody.result.id;
      }

      const caseResponse = await fetch("/api/diagnostics/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assignedUserId: permissions.canAssign ? draft.assignedUserId : null,
          concernKey: "PRIMARY",
          concernStatement: draft.concern,
          idempotencyKey: commandKey("diagnostic-intake-case"),
          operatingConditions: {
            arrivalSource: arrival,
            attachmentNames: attachments,
            authorization: draft.authorization,
            frequency: draft.frequency,
            operability: draft.operability,
            reportedConditions: conditions,
            safetyScreening: draft.safetyScreening,
            staffClarification: draft.staffClarification || null,
            symptomCategory: draft.symptomCategory,
          },
          reason: "Create a governed diagnostic case from the approved diagnostic intake workflow.",
          reasonCode: "CASE_REPAIR_ORDER_INTAKE",
          repairOrderId,
          riskTier: draft.riskTier,
        }),
      });
      const caseBody = await caseResponse.json().catch(() => ({})) as { error?: string; result?: { id: string } };
      if (!caseResponse.ok || !caseBody.result?.id) throw new Error(caseBody.error ?? "Diagnostic case could not be created.");
      setCreatedCaseId(caseBody.result.id);
      localStorage.removeItem("diagnostics-intake-draft");
      setNotice("Diagnostic case created with its vehicle, concern, service context, authorization, and audit lineage.");
      router.push(`/diagnostics/cases/${encodeURIComponent(caseBody.result.id)}`);
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Diagnostic intake could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return <form className={`${styles.intake} ${layoutStyles.layout}`} onSubmit={submit}>
    {scannerOpen ? <BarcodeScanner vinOnly onClose={() => setScannerOpen(false)} onConfirm={(scan) => { setQuery(scan.value); setScannerOpen(false); setNotice("VIN captured. Select the matching vehicle or repair order below."); }} /> : null}
    <header className={styles.header}>
      <div><span>Diagnostics / New Diagnostic Case</span><h1>New Diagnostic Case</h1><p>Establish the vehicle, concern, authorization, and safety context before diagnosis begins.</p></div>
      <div><b>Draft <i>•</i> Not yet created</b><Link href="/diagnostics"><ArrowLeft />Return to Command Center</Link></div>
    </header>

    <nav className={styles.steps} aria-label="Diagnostic intake progress">
      {steps.map((label, index) => <button aria-current={step === index + 1 ? "step" : undefined} key={label} onClick={() => setStep(index + 1)} type="button"><i>{index + 1}</i><span>{label}</span></button>)}
    </nav>

    {notice ? <div className={styles.notice} role="status"><AlertTriangle />{notice}<button aria-label="Dismiss message" onClick={() => setNotice("")} type="button"><X /></button></div> : null}

    <div className={styles.layout}>
      <main className={styles.main}>
        {step === 1 ? <>
          <section className={styles.card}><h2>1. How is this vehicle arriving?</h2><div className={styles.arrivals}>
            {[["EXISTING", "Existing Vehicle or RO", "Find vehicle by VIN, RO, stock #, etc."], ["APPOINTMENT", "Appointment", "Arriving for scheduled service"], ["WALK_IN", "Walk-in / Tow-in", "No appointment; unscheduled arrival"]].map(([value, title, help]) => <button className={arrival === value ? styles.selected : ""} key={value} onClick={() => setArrival(value as typeof arrival)} type="button"><CarFront /><span><strong>{title}</strong><small>{help}</small></span>{arrival === value ? <CheckCircle2 /> : null}</button>)}
          </div><div className={styles.minorArrivals}><button onClick={() => setArrival("INTERNAL")} type="button">Internal dealership vehicle</button><button onClick={() => setArrival("COMEBACK")} type="button">Comeback / recurring concern</button></div></section>

          <section className={styles.card}><h2>2. Identify the Vehicle</h2><div className={styles.vehicleSearch}><Search /><input aria-label="Search vehicle or repair order" onChange={(event) => setQuery(event.target.value)} placeholder="Enter or scan VIN, plate, stock #, customer, phone, or RO..." ref={searchRef} value={query} /><button onClick={scanVin} type="button"><ScanLine />Scan VIN</button><button className={styles.primarySmall} onClick={() => searchRef.current?.focus()} type="button"><Search />Search</button><button onClick={() => setShowAddVehicle(true)} type="button"><Plus />Add Vehicle</button></div>
            {(query || !selectedVehicle) ? <div className={styles.searchResults}>{matches.repairOrders.map((order) => <button key={order.id} onClick={() => chooseRepairOrder(order)} type="button"><Stethoscope /><span><strong>{order.repairOrderNumber} · {vehicleLabel(order.vehicle)}</strong><small>{order.customer?.displayName ?? "Internal vehicle"} · {order.serviceVisit.concernSummary}</small></span><b>Use RO</b></button>)}{matches.vehicles.map((vehicle) => <button key={vehicle.id} onClick={() => chooseVehicle(vehicle)} type="button"><CarFront /><span><strong>{vehicleLabel(vehicle)}</strong><small>{vehicle.vin ?? vehicle.licensePlate ?? vehicle.vehicleNumber}</small></span><b>Use Vehicle</b></button>)}{!matches.repairOrders.length && !matches.vehicles.length ? <p>No matching canonical record. Add the vehicle here to continue.</p> : null}</div> : null}
            {selectedVehicle ? <div className={styles.selectedVehicle}><CheckCircle2 /><div><small>Existing canonical vehicle selected</small><strong>{vehicleLabel(selectedVehicle)}</strong><span>{selectedVehicle.vin ?? selectedVehicle.vehicleNumber}{selectedRepairOrder ? ` · ${selectedRepairOrder.repairOrderNumber}` : ""}</span></div><button onClick={() => setDraft((current) => ({ ...current, repairOrderId: "", vehicleId: "" }))} type="button">Change</button></div> : null}
          </section>

          {showAddVehicle ? <section className={`${styles.card} ${styles.addVehicle}`}><header><div><h2>Add Vehicle</h2><p>Create a canonical Vehicle Registry record without leaving diagnostic intake.</p></div><button aria-label="Close add vehicle" onClick={() => setShowAddVehicle(false)} type="button"><X /></button></header><label className={styles.nonVin}><input checked={nonVin} onChange={(event) => setNonVin(event.target.checked)} type="checkbox" />VIN unavailable or unreadable</label><div className={styles.formGrid}>{nonVin ? <label className={styles.wide}><span>Non-VIN exception reason</span><input onChange={(event) => setNewVehicle((current) => ({ ...current, nonVinReason: event.target.value }))} value={newVehicle.nonVinReason} /></label> : <label className={styles.wide}><span>VIN</span><input autoFocus maxLength={17} onChange={(event) => setNewVehicle((current) => ({ ...current, vin: event.target.value.toUpperCase() }))} placeholder="17-character VIN" value={newVehicle.vin} /></label>}<label><span>Year</span><input onChange={(event) => setNewVehicle((current) => ({ ...current, year: event.target.value }))} type="number" value={newVehicle.year} /></label><label><span>Make</span><input onChange={(event) => setNewVehicle((current) => ({ ...current, make: event.target.value }))} value={newVehicle.make} /></label><label><span>Model</span><input onChange={(event) => setNewVehicle((current) => ({ ...current, model: event.target.value }))} value={newVehicle.model} /></label><label><span>License plate</span><input onChange={(event) => setNewVehicle((current) => ({ ...current, licensePlate: event.target.value.toUpperCase() }))} value={newVehicle.licensePlate} /></label><label><span>Stock number</span><input onChange={(event) => setNewVehicle((current) => ({ ...current, stockNumber: event.target.value }))} value={newVehicle.stockNumber} /></label><label><span>Color</span><input onChange={(event) => setNewVehicle((current) => ({ ...current, color: event.target.value }))} value={newVehicle.color} /></label></div><footer><button onClick={() => setShowAddVehicle(false)} type="button">Cancel</button><button className={styles.primarySmall} disabled={busy || nonVin ? newVehicle.nonVinReason.trim().length < 10 : newVehicle.vin.length !== 17} onClick={() => void createVehicle()} type="button">{busy ? "Creating..." : "Create & Select Vehicle"}</button></footer></section> : null}

          <section className={`${styles.card} ${styles.concern}`}><header><div><h2>3. Primary Concern / Issue to Diagnose <b>Required</b></h2><p>Capture the condition in the customer&apos;s own words before diagnosis begins.</p></div></header><div className={styles.concernGrid}><label><span>Customer concern in their own words</span><textarea maxLength={2000} onChange={(event) => update("concern", event.target.value)} placeholder="Customer states... Include the symptom, when it occurs, operating conditions, frequency, and what changed." rows={5} value={draft.concern} /><small>{draft.concern.length} / 2,000</small></label><div><label><span>Symptom Category</span><select onChange={(event) => update("symptomCategory", event.target.value)} value={draft.symptomCategory}><option value="">Select category</option><option>Starting / No-Start</option><option>Driveability / Performance</option><option>Electrical / Network</option><option>Brakes / Chassis</option><option>HVAC / Comfort</option><option>Noise / Vibration</option><option>Other / New Concern</option></select></label><label><span>Frequency</span><select onChange={(event) => update("frequency", event.target.value)} value={draft.frequency}><option value="">Select frequency</option><option>Constant</option><option>Intermittent</option><option>Single occurrence</option><option>Progressively worsening</option></select></label><label><span>Operability</span><select onChange={(event) => update("operability", event.target.value)} value={draft.operability}><option value="">Select operability</option><option>Normal operation</option><option>Limited operation</option><option>Inoperative</option><option>Unsafe to operate</option></select></label></div></div><div className={styles.conditionChips}><span>Observed conditions</span>{conditionChoices.map((condition) => <button aria-pressed={conditions.includes(condition)} key={condition} onClick={() => setConditions((current) => current.includes(condition) ? current.filter((item) => item !== condition) : [...current, condition])} type="button">{conditions.includes(condition) ? <Check /> : null}{condition}</button>)}</div><div className={styles.clarification}><label><span>Staff clarification</span><input onChange={(event) => update("staffClarification", event.target.value)} placeholder="Clarify without replacing the customer's statement..." value={draft.staffClarification} /></label><label className={styles.evidenceButton}><FileUp />Add Evidence<input multiple onChange={(event) => setAttachments(Array.from(event.target.files ?? []).map((file) => file.name))} type="file" /></label><small>{attachments.length ? `${attachments.length} file(s) selected for evidence intake` : "Photos, video, audio, scan report, or customer document"}</small></div><footer><ShieldCheck />The original concern is preserved; staff clarification and later corrections remain separately auditable.</footer></section>

          <section className={styles.card}><h2>4. Service Visit Context</h2>{selectedRepairOrder ? <div className={styles.contextChoice}><CheckCircle2 /><span><strong>Use existing open repair order</strong><small>{selectedRepairOrder.repairOrderNumber} · {selectedRepairOrder.serviceVisit.concernSummary}</small></span></div> : <><div className={styles.formGrid}><label><span>Customer / owner</span><select onChange={(event) => update("customerId", event.target.value)} value={draft.customerId}><option value="">Select existing customer</option>{options.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.displayName}</option>)}</select></label><label><span>Location</span><select onChange={(event) => update("locationId", event.target.value)} value={draft.locationId}>{options.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><label><span>Arrival / transport</span><select onChange={(event) => update("transportMode", event.target.value)} value={draft.transportMode}><option value="DROP_OFF">Drop-off</option><option value="CUSTOMER_WAITING">Customer waiting</option><option value="TOW">Tow-in</option><option value="LOANER">Loaner</option><option value="SHUTTLE">Shuttle</option><option value="INTERNAL_TRANSPORT">Internal transport</option></select></label></div><p className={styles.contextNote}>A preliminary service visit and repair order will be created before the diagnostic case, preserving the canonical workflow.</p></>}</section>
        </> : null}

        {step === 1 ? <section className={layoutStyles.liveDiagnosticReport} aria-labelledby="live-diagnostic-report-title">
          <header>
            <div><span>Live diagnostic report</span><h2 id="live-diagnostic-report-title">Diagnostic Report — Problem &amp; Concern Summary</h2><p>This report updates immediately from the intake facts entered above.</p></div>
            <b className={concernMissing.length ? layoutStyles.actionRequired : layoutStyles.reportReady}>{reportStatus}</b>
          </header>
          <div className={layoutStyles.liveReportGrid}>
            <article className={layoutStyles.reportedProblem}><span>Reported problem / concern</span><strong>{draft.concern.trim() || "No concern has been documented yet."}</strong>{draft.staffClarification ? <small>Staff clarification: {draft.staffClarification}</small> : null}</article>
            <article><span>Vehicle</span><strong>{vehicleLabel(selectedVehicle)}</strong><small>{selectedVehicle?.vin ?? selectedVehicle?.vehicleNumber ?? "Canonical vehicle identity is still required."}</small></article>
            <article><span>Problem classification</span><strong>{draft.symptomCategory || "Not classified"}</strong><small>{[draft.frequency, draft.operability].filter(Boolean).join(" · ") || "Frequency and operability not established."}</small></article>
            <article><span>Reported operating conditions</span><strong>{conditions.length ? conditions.join(" · ") : "No conditions selected"}</strong><small>{attachments.length ? `${attachments.length} evidence file(s) selected` : "No photos, scan reports, audio, video, or documents attached."}</small></article>
            <article className={layoutStyles.preliminaryAssessment}><span>Current diagnostic assessment</span><strong>{reportStatus}</strong><small>No fault, root cause, probability, or repair has been asserted. A confirmed diagnosis requires technician testing and evidence.</small></article>
            <article className={layoutStyles.reportNextAction}><span>Recommended next action</span><strong>{nextConcernAction}</strong>{concernMissing.length ? <small>Open items: {concernMissing.join(" · ")}</small> : <small>Advisor may retain this report or prepare it for technician handoff.</small>}</article>
          </div>
          <footer><button onClick={() => { setNotice(""); setStep(2); window.scrollTo({ behavior: "smooth", top: 0 }); }} type="button"><MessageSquareText />Open Complete Diagnostic Report<ArrowRight /></button><p>The report is available now. Sending it to a technician remains a separate, deliberate action.</p></footer>
        </section> : null}

        {step === 2 ? <section className={`${styles.stageCard} ${layoutStyles.concernReport}`}>
          <header className={layoutStyles.reportHeader}>
            <div><span>Step 2 · Diagnostic intake intelligence</span><h2>Concern &amp; Conditions Report</h2><p>Convert the customer&apos;s report into reproducible diagnostic context without inventing a cause.</p></div>
            <strong className={concernMissing.length ? layoutStyles.actionRequired : layoutStyles.reportReady}>{concernMissing.length ? "Action required" : "Ready for safety review"}</strong>
          </header>

          <div className={layoutStyles.reportMetrics} aria-label="Concern intake summary">
            <article><MessageSquareText /><span>Original concern</span><strong>{draft.concern.trim().length >= 10 ? "Captured" : "Required"}</strong><small>{draft.concern.length} of 2,000 characters</small></article>
            <article><Stethoscope /><span>Structured facts</span><strong>{concernFactsCaptured} / {concernFacts.length}</strong><small>Facts captured, not diagnostic confidence</small></article>
            <article><FileUp /><span>Evidence intake</span><strong>{attachments.length}</strong><small>{attachments.length ? "Files selected" : "No files attached"}</small></article>
            <article><CarFront /><span>Vehicle context</span><strong>{selectedVehicle ? "Linked" : "Missing"}</strong><small>{vehicleLabel(selectedVehicle)}</small></article>
          </div>

          <div className={layoutStyles.reportSummaryGrid}>
            <section className={layoutStyles.concernSummary}>
              <header><div><span>Authoritative intake statement</span><h3>Customer Concern Summary</h3></div><b>{draft.concern.trim().length >= 10 ? "PRESERVED" : "INCOMPLETE"}</b></header>
              <label><span>Customer&apos;s own words</span><textarea maxLength={2000} onChange={(event) => update("concern", event.target.value)} placeholder="Customer states... Include the symptom, when it occurs, operating conditions, frequency, and what changed." rows={6} value={draft.concern} /><small>{draft.concern.length} / 2,000</small></label>
              <p><ShieldCheck />Staff clarification and structured fields support this statement; they never replace it.</p>
            </section>

            <aside className={layoutStyles.nextActionPanel}>
              <span>Recommended next action</span><h3>{nextConcernAction}</h3>
              <p>{concernMissing.length ? "Complete the highest-priority missing fact before safety review. The engine will abstain from diagnostic guidance until required context is established." : "Concern characterization is sufficient for the next governed intake gate. No diagnosis has been inferred."}</p>
              {concernMissing.length ? <><strong>Open requirements</strong><ul>{concernMissing.map((item) => <li key={item}><AlertTriangle />{item}</li>)}</ul></> : <div className={layoutStyles.readyCallout}><CheckCircle2 />Concern intake is ready</div>}
              {!selectedVehicle ? <button onClick={() => { setStep(1); window.scrollTo({ behavior: "smooth", top: 0 }); }} type="button"><ArrowLeft />Return to Vehicle &amp; Visit</button> : null}
            </aside>
          </div>

          <section className={layoutStyles.conditionWorkbench}>
            <header><div><span>Structured characterization</span><h3>Operating Conditions &amp; Reproduction Context</h3></div><b>{[draft.symptomCategory, draft.frequency, draft.operability].filter(Boolean).length} of 3 required</b></header>
            <div className={styles.formGrid}><label><span>Symptom category</span><select onChange={(event) => update("symptomCategory", event.target.value)} value={draft.symptomCategory}><option value="">Select category</option><option>Starting / No-Start</option><option>Driveability / Performance</option><option>Electrical / Network</option><option>Brakes / Chassis</option><option>HVAC / Comfort</option><option>Noise / Vibration</option><option>Other / New Concern</option></select></label><label><span>Frequency</span><select onChange={(event) => update("frequency", event.target.value)} value={draft.frequency}><option value="">Select frequency</option><option>Constant</option><option>Intermittent</option><option>Single occurrence</option><option>Progressively worsening</option></select></label><label><span>Operability</span><select onChange={(event) => update("operability", event.target.value)} value={draft.operability}><option value="">Select operability</option><option>Normal operation</option><option>Limited operation</option><option>Inoperative</option><option>Unsafe to operate</option></select></label></div>
            <div className={styles.conditionChips}><span>Reported or observed conditions</span>{conditionChoices.map((condition) => <button aria-pressed={conditions.includes(condition)} key={condition} onClick={() => setConditions((current) => current.includes(condition) ? current.filter((item) => item !== condition) : [...current, condition])} type="button">{conditions.includes(condition) ? <Check /> : null}{condition}</button>)}</div>
            <label className={layoutStyles.clarificationField}><span>Staff clarification</span><textarea maxLength={2000} onChange={(event) => update("staffClarification", event.target.value)} placeholder="Clarify terminology, reported sequence, prior work, or reproduction details without rewriting the customer's statement." rows={3} value={draft.staffClarification} /></label>
          </section>

          <section className={layoutStyles.handoffPreview}>
            <header><div><span>Downstream diagnostic handoff</span><h3>What the technician will receive</h3></div><b>Draft · No diagnosis</b></header>
            <div><article><CheckCircle2 /><span><strong>Preserved concern</strong><small>{draft.concern || "Awaiting customer narrative"}</small></span></article><article><CheckCircle2 /><span><strong>Reproduction cues</strong><small>{conditions.length ? conditions.join(" · ") : "No operating-condition cues recorded"}</small></span></article><article><CheckCircle2 /><span><strong>Evidence package</strong><small>{attachments.length ? `${attachments.length} selected file(s)` : "No intake evidence attached"}</small></span></article><article><ShieldCheck /><span><strong>Reasoning boundary</strong><small>Facts only; hypotheses begin after safety, authorization, and evidence review.</small></span></article></div>
          </section>
        </section> : null}

        {step === 3 ? <section className={styles.stageCard}><span>Step 3</span><h2>Safety &amp; Authorization</h2><p>Establish immediate hazards and the authority available for diagnostic testing.</p><div className={styles.formGrid}><label><span>Safety screening</span><select onChange={(event) => update("safetyScreening", event.target.value)} value={draft.safetyScreening}><option value="">Select disposition</option><option value="NO_IMMEDIATE_HAZARD">No immediate hazard reported</option><option value="REQUIRES_TECH_REVIEW">Potential hazard - technician review required</option><option value="DO_NOT_OPERATE">Do not operate / isolate vehicle</option><option value="HIGH_VOLTAGE_PROTOCOL">High-voltage safety protocol required</option></select></label><label><span>Diagnostic authorization</span><select onChange={(event) => update("authorization", event.target.value as Draft["authorization"])} value={draft.authorization}><option value="PENDING">Pending</option><option value="DOCUMENTED">Documented</option><option value="NOT_REQUIRED">Not required by policy</option></select></label>{draft.authorization === "DOCUMENTED" ? <label className={styles.wide}><span>Authorization reference</span><input onChange={(event) => update("authorizationReference", event.target.value)} placeholder="Signed intake, recorded call, contract, or internal authority reference" value={draft.authorizationReference} /></label> : null}</div><div className={styles.safetyCallout}><ShieldCheck /><span><strong>Safety gates remain authoritative</strong>Intake does not authorize a hazardous test, high-voltage access, disassembly, or repair.</span></div></section> : null}

        {step === 4 ? <section className={styles.stageCard}><span>Step 4</span><h2>Triage &amp; Assignment</h2><p>Route the case based on risk and responsibility without asserting a diagnosis.</p><div className={styles.formGrid}><label><span>Initial risk tier</span><select onChange={(event) => update("riskTier", event.target.value as Draft["riskTier"])} value={draft.riskTier}><option value="R0">R0 - informational</option><option value="R1">R1 - routine</option><option value="R2">R2 - elevated complexity</option><option value="R3">R3 - safety or major operability</option><option value="R4">R4 - critical / isolate</option></select></label><label><span>Responsible technician</span><select disabled={!permissions.canAssign} onChange={(event) => update("assignedUserId", event.target.value)} value={draft.assignedUserId}>{options.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label></div><div className={styles.safetyCallout}><UserRound /><span><strong>{selectedTechnician?.name ?? "Unassigned"}</strong>Assignment identifies responsibility only; it does not imply qualification for every test. Test-level qualification gates remain enforced.</span></div></section> : null}

        {step === 5 ? <section className={styles.stageCard}><span>Step 5</span><h2>Review &amp; Create</h2><p>Confirm the established facts before creating the authoritative diagnostic case.</p><dl className={styles.reviewGrid}><div><dt>Vehicle</dt><dd>{vehicleLabel(selectedVehicle)}</dd></div><div><dt>Repair order</dt><dd>{selectedRepairOrder?.repairOrderNumber ?? "Create preliminary diagnostic visit"}</dd></div><div><dt>Customer</dt><dd>{selectedCustomer?.displayName ?? "Not selected"}</dd></div><div><dt>Concern</dt><dd>{draft.concern}</dd></div><div><dt>Conditions</dt><dd>{[draft.symptomCategory, draft.frequency, draft.operability, ...conditions].filter(Boolean).join(" · ")}</dd></div><div><dt>Safety</dt><dd>{draft.safetyScreening.replaceAll("_", " ")}</dd></div><div><dt>Authorization</dt><dd>{draft.authorization.replaceAll("_", " ")}</dd></div><div><dt>Assignment</dt><dd>{selectedTechnician?.name ?? "Unassigned"} · {draft.riskTier}</dd></div></dl>{!rollout.executable ? <div className={styles.rolloutHold}><AlertTriangle /><span><strong>Creation is controlled by rollout policy.</strong>You may review and save the draft, but the server will not create a case until Diagnostics mutations are enabled ({rollout.reason.replaceAll("_", " ")}).</span></div> : <div className={styles.safetyCallout}><CheckCircle2 /><span><strong>Diagnostic case creation is enabled.</strong>{rollout.targetAt ? `Rollout target: ${new Date(rollout.targetAt).toLocaleDateString()}. ` : ""}Evidence, reasoning, publishing, and AI remain separately controlled.</span></div>}</section> : null}
      </main>

      <aside className={styles.rail}><section><h2>Intake Readiness</h2>{gates.map((gate) => <p className={gate.ready ? styles.ready : ""} key={gate.label}><i>{gate.ready ? <Check /> : null}</i><span>{gate.label}</span><b>{gate.ready ? "Complete" : "Required"}</b></p>)}<div className={styles.progress}><strong>{completeCount} of {gates.length} gates complete</strong><i><span style={{ width: `${completeCount / gates.length * 100}%` }} /></i></div></section><section><h2>Case Preview</h2><dl><div><dt>Vehicle</dt><dd>{vehicleLabel(selectedVehicle)}</dd></div><div><dt>Concern</dt><dd>{draft.concern || "Required"}</dd></div><div><dt>Entry</dt><dd>{selectedRepairOrder ? "Existing RO" : selectedVehicle ? "Preliminary visit" : "Not selected"}</dd></div><div><dt>Priority</dt><dd>{draft.riskTier}</dd></div><div><dt>Technician</dt><dd>{selectedTechnician?.name ?? "Unassigned"}</dd></div><div><dt>Authorization</dt><dd>{draft.authorization.replaceAll("_", " ")}</dd></div></dl></section><section><h2><ShieldCheck />Enterprise safeguards</h2><p>Identity, duplicate, permission, rollout, idempotency, and audit controls are rechecked when the case is created.</p><span><CheckCircle2 />Draft only — no records created yet</span>{createdCaseId ? <Link href={`/diagnostics/cases/${createdCaseId}`}>Open created case</Link> : null}</section></aside>
    </div>

    <footer className={styles.footer}><Link href="/diagnostics">Cancel</Link><button onClick={saveDraft} type="button"><Save />Save Draft</button><span>Required information is preserved before continuing.</span><div>{step > 1 ? <button onClick={() => setStep((current) => current - 1)} type="button"><ArrowLeft />Back</button> : null}{step < 5 ? <button className={styles.continue} onClick={continueFromStep} type="button">Continue to {steps[step]}<ArrowRight /></button> : <button className={styles.continue} disabled={busy || !allReady || !permissions.canCreate || !rollout.executable} type="submit">{busy ? "Creating Case..." : "Create Diagnostic Case"}<ArrowRight /></button>}</div></footer>
  </form>;
}
