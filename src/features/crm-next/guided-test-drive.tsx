"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useDealDraft, useDealDraftState, useDealSaveState } from "./deal-draft-workspace";
import { DRIVE_PHOTOS, DRIVE_PHOTO_LABELS, DRIVE_RETURN_PHOTOS, DRIVE_RETURN_PHOTO_LABELS, DRIVE_STEPS, driveAgreementContent, driveDueState, driveLocalTime, driveReadiness, driveReturnFacts, TEST_DRIVE_TIMEZONE } from "@/lib/test-drive-workflow";
import { testDriveDateTime, testDriveDeadline } from "@/lib/test-drive-form-packet";
import type { DealVehicleChoice } from "@/lib/deal-continuity";
import { CustomerContactDetails } from "@/features/crm/customer-contact-details";
import { openPrintablePdfDocument } from "@/lib/printable-pdf";
import styles from "./guided-test-drive.module.css";

type Document = { id: string; type: string; reviewed: boolean; signed: boolean; fileName: string; source?: string };
type Packet = { packetId: string; jacketId: string; documents: Array<{ html: string; contentType: string; contentBase64: string; downloadFileName: string }> };
type Booking = { id: string; status: string; version: number; checkedOutAt: string; expectedReturnAt: string; returnedAt: string; departureSnapshot: { odometer: number }; returnSnapshot: { note?: string; resolution?: { note: string } } };
type Model = { bookings: Booking[]; currentContent: string; signedCurrent: boolean; suggestedOdometer: number | null; agreementCurrent: boolean; agreement: { packetId: string; jacketId: string; packet: Packet } | null; jacket: { id: string; revision: number; documents: Document[] } | null; events: Array<{ id: string; action: string; occurredAt: string; actorUserId: string }> };
export type GuidedTestDriveProps = { customerId: string; customerName: string; employeeName: string; vehicle: DealVehicleChoice | null; customerPrefill: { phoneNumber: string; email: string; idState: string }; onChooseIdentity: () => void; identityPicker?: ReactNode; showIdentityPicker?: boolean };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(120000) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "The action could not be saved. Your entries remain here.");
  return body;
}

export function GuidedTestDrive({ customerId, customerName, employeeName, vehicle, customerPrefill, onChooseIdentity, identityPicker, showIdentityPicker }: GuidedTestDriveProps) {
  const store = useDealDraft(), save = useDealSaveState();
  const [step, setStep] = useDealDraftState("guidedStep", 0);
  const [facts, setFacts] = useDealDraftState("facts", {
    driverLicense: "", driverPhone: customerPrefill.phoneNumber || "", driverEmail: customerPrefill.email || "", licenseState: customerPrefill.idState || "MN", licenseExpiration: "", licenseVerified: false,
    driveMode: "SUPERVISED", salesperson: "", accompanyingEmployee: "", insuranceBasis: "DRIVER_POLICY", insuranceCarrier: "", insurancePolicy: "", insuranceVerified: false,
    testDriveDate: driveLocalTime(new Date()).slice(0, 10), startTime: "", durationMinutes: "30", mileageAllowance: "20", departureMileage: "", departureCondition: "", fuelOut: "", approvedRoute: "Local test drive route", notes: "",
    vin: "", stockNumber: "", year: "", make: "", model: "", trim: "", returnAt: "", returnMileage: "", returnCondition: "", fuelIn: "", keysReturned: false, receivedBy: ""
  });
  const [evidence, setEvidence] = useDealDraftState<Record<string, string>>("guidedEvidence", {});
  const [returnEvidence, setReturnEvidence] = useDealDraftState<Record<string, string>>("guidedReturnEvidence", {});
  const [recordedVehicleId, setRecordedVehicleId] = useDealDraftState("guidedVehicleId", vehicle?.id ?? "");
  const [returnInfo, setReturnInfo] = useDealDraftState("guidedReturn", { returnAt: facts.returnAt, returnMileage: facts.returnMileage, fuelIn: facts.fuelIn, returnCondition: facts.returnCondition, receivedBy: facts.receivedBy, keysReturned: facts.keysReturned, returnException: false, exceptionNote: "" });
  const [legacyNotReleased, setLegacyNotReleased] = useState(false);
  const [legacyNote, setLegacyNote] = useDealDraftState("legacyReconciliationNote", "");
  const [model, setModel] = useState<Model | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const [physicalHandover, setPhysicalHandover] = useState(false), [keysVerified, setKeysVerified] = useState(false), [preview, setPreview] = useState(false), [photoIndex, setPhotoIndex] = useState(0), [resolution, setResolution] = useState("");
  const [now, setNow] = useState(() => new Date());
  const pending = useRef(false), requestKeys = useRef(new Map<string, string>()), panel = useRef<HTMLElement>(null);
  const printChecks = useRef<HTMLFieldSetElement>(null);
  const booking = model?.bookings.find(row => ["CHECKED_OUT", "RETURNED_REVIEW"].includes(row.status)) ?? model?.bookings[0];
  const active = booking?.status === "CHECKED_OUT", returned = booking?.status === "RETURNED" || booking?.status === "RETURNED_REVIEW";
  const legacyActive = store?.read("test-drive:testDriveStarted") === true && !booking;
  const readiness = driveReadiness(facts, Boolean(customerId), vehicle?.vin ?? "");
  const [printChecksExpanded, setPrintChecksExpanded] = useState(() => step === 2 && !readiness.verified);
  const content = driveAgreementContent(facts, customerId, vehicle?.vin ?? "");
  const agreementCurrent = model?.agreementCurrent && model.currentContent === content;
  const document = model?.agreement?.packet.documents[0];
  const reviewed = (id: string | undefined) => Boolean(id && model?.jacket?.documents.some(doc => doc.id === id && doc.reviewed));
  const proofReady = agreementCurrent && model?.signedCurrent && ["signed", "license", "insurance"].every(key => reviewed(evidence[key])) && Boolean(model?.jacket?.documents.find(doc => doc.id === evidence.signed)?.signed);
  const photoFiles = step === 4 ? returnEvidence : evidence;
  const prefix = step === 4 ? "return" : "td";
  const photoViews = step === 4 ? DRIVE_RETURN_PHOTOS : DRIVE_PHOTOS;
  const photoLabels = step === 4 ? DRIVE_RETURN_PHOTO_LABELS : DRIVE_PHOTO_LABELS;
  const photosReady = photoViews.every(view => reviewed(photoFiles[`${prefix}-${view}`]));
  const complete = [readiness.identity, readiness.verified, proofReady, Boolean(active || returned), returned];
  const stage = active || returned ? step === 4 ? 4 : -1 : Math.max(0, Math.min(step, 3));

  useEffect(() => {
    if (active || returned || !vehicle?.id) return;
    if (recordedVehicleId && vehicle?.id && recordedVehicleId !== vehicle.id) {
      setFacts(current => ({ ...current, insuranceVerified: false, departureMileage: "", departureCondition: "", fuelOut: "" }));
      setEvidence({});
    }
    if (vehicle?.id !== recordedVehicleId) setRecordedVehicleId(vehicle?.id ?? "");
  }, [vehicle?.id, recordedVehicleId, active, returned, setFacts, setEvidence, setRecordedVehicleId]);

  useEffect(() => {
    if (active || returned) return;
    setFacts(current => ({ ...current, driverPhone: current.driverPhone || customerPrefill.phoneNumber || "", driverEmail: current.driverEmail || customerPrefill.email || "" }));
  }, [customerPrefill.phoneNumber, customerPrefill.email, active, returned, setFacts]);

  const load = useCallback(async () => {
    if (!store) return null;
    const next = await request<Model>(`/api/crm/v1/test-drives/${encodeURIComponent(store.draftId())}`);
    setModel(next);
    return next;
  }, [store]);
  useEffect(() => {
    if (!save.saved) return;
    let cancelled = false;
    const refresh = () => { if (window.document.visibilityState === "visible") void load().catch(caught => { if (!cancelled) setError(caught.message); }); };
    refresh();
    const timer = setInterval(() => { setNow(new Date()); refresh(); }, 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [load, save.saved]);

  function navigate(next: number) { setStep(next); setPrintChecksExpanded(next === 2 && !readiness.verified); setPhotoIndex(0); setError(""); panel.current?.focus(); }
  function edit(key: keyof typeof facts, value: string | boolean) {
    if (active || returned) return;
    if (step === 2) setPrintChecksExpanded(true);
    setFacts(current => ({ ...current, [key]: value,
      ...(["driverLicense", "licenseState", "licenseExpiration"].includes(key) ? { licenseVerified: false } : {}),
      ...(["insuranceBasis", "insuranceCarrier", "insurancePolicy"].includes(key) ? { insuranceVerified: false } : {}) }));
    if (model?.agreement) setNotice("Agreement details changed. Generate and sign the updated agreement before release. Previous documents remain in history.");
    setError("");
  }
  async function run(work: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setNotice("");
    try { await work(); } catch (caught) { setError(caught instanceof Error ? caught.message : "The action could not be saved. Your entries remain here."); }
    finally { pending.current = false; setBusy(false); }
  }
  async function saveDraft() {
    if (!store || !await store.save()) throw new Error(store?.saveError() || "Save failed. Your entries remain here; retry before leaving.");
  }
  async function command(action: string, data: Record<string, unknown> = {}) {
    await saveDraft();
    const savedContent = driveAgreementContent(store!.read("test-drive:facts"), customerId, vehicle?.vin ?? "");
    const identity = JSON.stringify({ action, content: action === "GENERATE" ? savedContent : action === "RELEASE" ? content : "", ...data });
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity))), byte => byte.toString(16).padStart(2, "0")).join("");
    const operationKey = requestKeys.current.get(identity) ?? store!.reference(`test-drive:${action}:${digest}`);
    requestKeys.current.set(identity, operationKey);
    await saveDraft();
    const expectedFingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content))), byte => byte.toString(16).padStart(2, "0")).join("");
    return request<{ result: { jacketId?: string; packetId?: string } }>(`/api/crm/v1/test-drives/${encodeURIComponent(store!.draftId())}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, operationKey, expectedFingerprint: action === "RELEASE" ? expectedFingerprint : undefined, ...data }) });
  }
  function printSavedAgreement() {
    if (!document) return;
    if (openPrintablePdfDocument(document)) setNotice("Saved agreement opened in the PDF viewer. Use its Print button.");
    else { setPreview(true); setNotice("The PDF window was blocked. Use Download saved PDF below, or allow pop-ups and try Print saved agreement again."); }
  }
  function generateAndPrint() {
    if (pending.current) return;
    if (agreementCurrent && document) { printSavedAgreement(); return; }
    if (!readiness.verified) {
      setNotice(readiness.issue?.message ?? "Choose the shared customer and vehicle and complete the agreement details before printing.");
      const control = printChecks.current?.querySelector<HTMLElement>(`[data-drive-field="${readiness.issue?.field ?? ""}"]`);
      (control ?? printChecks.current)?.focus();
      return;
    }
    // Reserve the browser window during the click, before asynchronous generation.
    const viewer = window.open("about:blank", "_blank");
    void run(async () => {
      let displayed = false;
      try {
        const result = await command("GENERATE");
        if (!result.result.packetId) throw new Error("The document service did not return an agreement reference. Your entries are retained.");
        const packet = await request<Packet>(`/api/crm/v1/contract-packets/${encodeURIComponent(result.result.packetId)}`);
        const doc = packet.documents[0];
        if (!doc) throw new Error("The saved packet contains no printable agreement. Open Sales Documents to review the archived packet.");
        displayed = openPrintablePdfDocument(doc, viewer);
        if (!displayed) viewer?.close();
        setModel(current => ({ ...(current ?? { bookings: [], currentContent: "", signedCurrent: false, suggestedOdometer: null, agreementCurrent: false, jacket: null, events: [] }), agreement: { packetId: packet.packetId, jacketId: packet.jacketId, packet } }));
        if (packet.jacketId) store?.recordJacket("test-drive", packet.jacketId);
        setNotice(displayed ? "Agreement saved. Print from the PDF viewer, then upload the signed copy below." : "Agreement saved. The PDF window was blocked; use Download saved PDF or Print saved agreement below.");
        // Refreshing workflow metadata must not close or block an already opened PDF.
        try { await saveDraft(); await load(); }
        catch { setNotice("Agreement saved. The print/download copy is available. Workflow status could not refresh; your entries remain here."); }
      } catch (caught) { if (!displayed) viewer?.close(); throw caught; }
    });
  }
  async function upload(key: string, type: string, file?: File) {
    if (!file || pending.current) return;
    await run(async () => {
      await saveDraft();
      const jacketId = model?.jacket?.id;
      if (!jacketId || (!active && !returned && !agreementCurrent)) throw new Error("Generate the current agreement before attaching evidence.");
      const form = new FormData(); form.set("file", file); form.set("documentType", type);
      const jacket = await request<Model["jacket"]>(`/api/sales-documents/${encodeURIComponent(jacketId)}/documents`, { method: "POST", body: form });
      const added = jacket?.documents.find(doc => !model?.jacket?.documents.some(old => old.id === doc.id));
      if (!added) throw new Error("The upload outcome is not confirmed. Refresh status before retrying.");
      (step === 4 ? setReturnEvidence : setEvidence)(current => ({ ...current, [key]: added.id }));
      await saveDraft(); await load();
      setNotice(`${file.name} saved. Open it and confirm staff review below.`);
    });
  }
  function reviewDocument(id: string, signed = false) {
    void run(async () => {
      if (!model?.jacket) return;
      await request(`/api/sales-documents/${encodeURIComponent(model.jacket.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "REVIEW", revision: model.jacket.revision, documentId: id, signed }) });
      await load(); setNotice(signed ? "Signatures reviewed and verified." : "Evidence reviewed.");
    });
  }
  function evidenceControl(key: string, label: string, type: string, camera = false) {
    const id = photoFiles[key] ?? evidence[key];
    const doc = model?.jacket?.documents.find(item => item.id === id);
    const savedChoices = model?.jacket?.documents.filter(item => item.type === type && item.source !== "GENERATED") ?? [];
    return <div className={styles.evidence} key={key}>
      <strong>{label}</strong><span>{doc ? `${doc.fileName} · ${doc.reviewed ? "Reviewed" : "Needs review"}` : "Not recorded"}</span>
      {savedChoices.length > 0 && <label>Use an existing saved file<select aria-label={`Use saved ${label}`} disabled={busy} value={doc?.id ?? ""} onChange={event => {
        const selected = event.target.value;
        (step === 4 ? setReturnEvidence : setEvidence)(current => ({ ...current, [key]: selected }));
        void run(async () => { await saveDraft(); await load(); });
      }}><option value="">Select the matching saved evidence</option>{savedChoices.map(item => <option key={item.id} value={item.id}>{item.fileName} · {item.reviewed ? "Reviewed" : "Needs review"}</option>)}</select></label>}
      <label className={styles.upload}>{doc ? "Replace file" : camera ? "Take photo" : "Upload file"}<input aria-label={`${doc ? "Replace" : "Upload"} ${label}`} disabled={busy || !model?.jacket || (!active && !returned && !agreementCurrent)} type="file" accept={camera ? "image/jpeg,image/png" : "application/pdf,image/jpeg,image/png"} capture={camera ? "environment" : undefined} onChange={event => { void upload(key, type, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label>
      {camera && <label className={styles.upload}>Upload existing photo<input aria-label={`Upload existing ${label}`} disabled={busy || !model?.jacket} type="file" accept="image/jpeg,image/png" onChange={event => { void upload(key, type, event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label>}
      {doc && <><a target="_blank" rel="noreferrer" href={`/api/sales-documents/${model!.jacket!.id}/documents/${doc.id}`}>Open saved file</a>{!doc.reviewed && <button disabled={busy} type="button" onClick={() => reviewDocument(doc.id, key === "signed")}>{key === "signed" ? "I reviewed and verified the signatures" : "I reviewed this evidence"}</button>}</>}
    </div>;
  }
  function field(key: keyof typeof facts, label: string, type = "text") {
    const issue = readiness.issue?.field === label ? readiness.issue : null;
    return <label>{label}<input data-drive-field={label} aria-label={label} type={type} aria-invalid={Boolean(issue)} aria-describedby={issue ? `drive-issue-${key}` : undefined} value={String(facts[key])} onChange={event => edit(key, event.target.value)} />{issue && <small id={`drive-issue-${key}`}>{issue.message}</small>}</label>;
  }
  function renderVerificationFields() {
    return <><div className={styles.fields}><label>Drive type<select data-drive-field="Drive type" aria-label="Drive type" value={facts.driveMode} onChange={event => edit("driveMode", event.target.value)}><option value="UNACCOMPANIED">Unaccompanied</option><option value="SUPERVISED">Supervised</option></select></label>{field("salesperson", "Authorizing employee")}<button type="button" onClick={() => edit("salesperson", employeeName)}>Use my name · {employeeName}</button>{facts.driveMode === "SUPERVISED" ? field("accompanyingEmployee", "Accompanying employee") : <p>No accompanying employee is required.</p>}<label>Coverage basis<select data-drive-field="Coverage basis" aria-label="Coverage basis" value={facts.insuranceBasis} onChange={event => edit("insuranceBasis", event.target.value)}><option value="DRIVER_POLICY">Driver policy</option><option value="DEALER_REVIEW">Dealership coverage</option></select></label>{facts.insuranceBasis === "DRIVER_POLICY" && <>{field("insuranceCarrier", "Insurance carrier")}{field("insurancePolicy", "Insurance policy")}</>}</div><label><input data-drive-field="Valid license verified" type="checkbox" checked={facts.licenseVerified} onChange={event => edit("licenseVerified", event.target.checked)} />I reviewed the driver&apos;s license and verified it is valid</label><label><input data-drive-field="Coverage reviewed for this drive" type="checkbox" checked={facts.insuranceVerified} onChange={event => edit("insuranceVerified", event.target.checked)} />I reviewed coverage for this drive</label></>;
  }
  function renderPrintChecks() {
    if (agreementCurrent || (readiness.verified && !printChecksExpanded)) return null;
    const corrections: Record<string, [keyof typeof facts, string, string]> = {
      "Driver license": ["driverLicense", "Driver license", "text"],
      "Driver phone": ["driverPhone", "Driver phone", "tel"],
      "License state": ["licenseState", "License state", "text"],
      "License expiration": ["licenseExpiration", "License expiration", "date"],
      "Start time": ["startTime", "Start time", "time"],
      "Time allowance (minutes)": ["durationMinutes", "Time allowance (minutes)", "number"],
      "Checkout odometer": ["departureMileage", "Checkout odometer", "number"],
      "Mileage allowance": ["mileageAllowance", "Mileage allowance", "number"],
      "Approved route": ["approvedRoute", "Approved route", "text"],
      "Checkout condition": ["departureCondition", "Checkout condition", "text"],
      "Fuel out": ["fuelOut", "Fuel out", "text"]
    };
    const correction = readiness.issue ? corrections[readiness.issue.field] : null;
    return <fieldset ref={printChecks} tabIndex={-1} className={styles.evidence} aria-label="Complete checks to print">
      <legend>{readiness.verified ? "Checks complete — ready to print" : "Complete these checks to print"}</legend>
      <p role="status">{readiness.verified ? "Verification complete. You can generate and print the agreement now." : readiness.issue?.message ?? "Choose the shared customer and vehicle and complete the agreement details."}</p>
      {renderVerificationFields()}
      {correction && field(...correction)}
      {!readiness.identity && <><p>Agreement details also need review. Your existing entries are retained.</p><button type="button" onClick={() => navigate(0)}>Review driver, vehicle & dates</button></>}
      <small>Signed uploads and release photos come after printing. These checks do not release the vehicle.</small>
    </fieldset>;
  }
  let returnError = "";
  if (active && stage === 4) { try { driveReturnFacts(returnInfo, booking!.departureSnapshot.odometer, new Date(booking!.checkedOutAt)); } catch (caught) { returnError = (caught as Error).message; } }
  const legacyNotice = legacyActive ? "This older draft says started without a custody record. If no actual departure occurred, confirm that below with a reason. If the vehicle already departed, reconcile its actual custody before recording another release." : "";

  return <section className={styles.workflow} data-deal-state-managed aria-label="Guided test drive">
    <header className={styles.header}><div><h2>Test Drive</h2><p>{customerName || "Choose customer"} · {vehicle?.label || "Choose vehicle"}</p></div><div role="status" aria-live="polite">{busy || save.busy ? "Saving…" : error || store?.saveError() ? "Save failed / action needs attention" : save.dirty ? "Unsaved changes" : save.saved ? "Saved" : "New draft"}</div><button type="button" disabled={busy || save.busy} onClick={() => void run(async () => { await saveDraft(); await load(); setNotice("Saved. You can resume this step later."); })}>Save & resume later</button></header>
    <p>Times use {TEST_DRIVE_TIMEZONE}. Recorded information still needs staff verification.</p>
    <ol className={styles.steps} aria-label="Test-drive progress">{DRIVE_STEPS.map((label, index) => <li key={label}><button type="button" aria-current={stage === index ? "step" : undefined} disabled={busy || ((active || returned) && index < 4) || (!active && !returned && index === 4)} onClick={() => navigate(index)}><span>{complete[index] ? "✓" : index + 1}</span>{label}<small>{complete[index] ? "Complete" : index === stage ? "Current step" : "Pending"}</small></button></li>)}</ol>
    {error && <p role="alert" className={styles.error}>{error} <button type="button" onClick={() => void run(async () => { await load(); setNotice("Status refreshed. Your entries are retained."); })}>Refresh status</button></p>}
    {notice && <p role="status">{notice}</p>}
    {document && <section className={styles.evidence} aria-label="Saved test-drive agreement">
      <strong>Saved test-drive agreement</strong>
      {!agreementCurrent && !active && !returned && <p>This saved copy may precede your latest edits. Updated terms still require a new signed agreement before release.</p>}
      <div className={styles.header}><button type="button" onClick={printSavedAgreement}>Print saved agreement</button><button type="button" onClick={() => setPreview(!preview)}>Preview saved agreement</button><a download={document.downloadFileName} href={`data:${document.contentType};base64,${document.contentBase64}`}>Download saved PDF</a></div>
      {preview && <iframe title="Saved test-drive agreement preview" srcDoc={document.html} />}
    </section>}
    {legacyNotice && <p role="alert" className={styles.error}>{legacyNotice}</p>}
    {(active || returned) && <section className={styles.active} aria-label="Actual drive status"><h3>{booking?.status === "RETURNED_REVIEW" ? "Returned · exception needs follow-up" : returned ? "Test drive returned" : driveDueState(booking!.expectedReturnAt, now)}</h3><dl><div><dt>Actual departure</dt><dd>{testDriveDateTime(booking!.checkedOutAt)}</dd></div><div><dt>Expected return</dt><dd>{testDriveDateTime(booking!.expectedReturnAt)}</dd></div>{returned && <div><dt>Actual return</dt><dd>{testDriveDateTime(booking!.returnedAt)}</dd></div>}</dl>{active && <><CustomerContactDetails customerId={customerId} surface="crm-next" autoReveal /><button className={styles.primary} type="button" disabled={busy} onClick={() => navigate(4)}>Record return</button></>}{booking?.status === "RETURNED_REVIEW" && <><p>Vehicle availability remains on hold until the exception is resolved. {booking.returnSnapshot.note}</p><label>Resolution and completed next action<textarea value={resolution} onChange={event => setResolution(event.target.value)} /></label><button disabled={busy || resolution.trim().length < 10} type="button" onClick={() => { if (window.confirm("Confirm the return issue is resolved and all keys are accounted for? This releases the vehicle hold.")) void run(async () => { await command("RESOLVE_EXCEPTION", { bookingId: booking.id, expectedVersion: booking.version, keysVerified: true, note: resolution }); await load(); }); }}>Confirm resolution & release hold</button></>}{returned && booking?.returnSnapshot.resolution && <p>Resolution: {booking.returnSnapshot.resolution.note}</p>}</section>}
    <section ref={panel} tabIndex={-1} className={styles.panel} aria-label={stage >= 0 ? DRIVE_STEPS[stage] : "Drive records"}>
      <fieldset className={styles.editor} disabled={busy}>
      {stage === 0 && <><h3>Driver & Vehicle</h3><button type="button" onClick={onChooseIdentity}>Choose / change customer and vehicle</button></>}
      {identityPicker && <div hidden={stage !== 0 && !showIdentityPicker}>{identityPicker}</div>}
      {stage === 0 && <><div className={styles.fields}>{field("driverPhone", "Driver phone", "tel")}{field("driverEmail", "Driver email", "email")}{field("driverLicense", "Driver license")}{field("licenseState", "License state")}{field("licenseExpiration", "License expiration", "date")}{field("testDriveDate", "Departure date", "date")}{field("startTime", "Departure time", "time")}{field("durationMinutes", "Time allowance (minutes)", "number")}{field("mileageAllowance", "Mileage allowance", "number")}{field("departureMileage", "Checkout odometer", "number")}{field("fuelOut", "Fuel out")}{field("departureCondition", "Checkout condition")}{field("approvedRoute", "Approved route")}</div>{model?.suggestedOdometer != null && <p>Last recorded odometer: {model.suggestedOdometer}. <button type="button" onClick={() => edit("departureMileage", String(model.suggestedOdometer))}>Use recorded reading</button> Confirm the actual reading before release.</p>}<p>Expected return: {testDriveDateTime(testDriveDeadline(readiness.facts)) || "Enter a valid departure time and duration. Ambiguous daylight-saving times need a different time."}</p><footer><span role="status">{busy ? "Please wait for the current action to finish." : readiness.identity ? "Driver, vehicle and return window recorded" : `Before you can continue: ${readiness.missing.join(", ")}.`}</span><button className={styles.primary} type="button" disabled={!readiness.identity || busy} onClick={() => navigate(1)}>Continue to verification</button></footer></>}
      {stage === 1 && <><h3>Verify driver and release authorization</h3>{renderVerificationFields()}{readiness.issue && <p role="status">{readiness.issue.message}</p>}<footer><button type="button" onClick={() => navigate(0)}>Back to driver & vehicle</button><button className={styles.primary} type="button" disabled={!readiness.verified || busy} onClick={() => navigate(2)}>Continue to agreement</button></footer></>}
      {stage === 2 && <><h3>Sign Agreement</h3>{renderPrintChecks()}{!agreementCurrent && <p>{model?.agreement ? "Details changed. Generate and sign a new agreement; previous versions remain saved." : "Generate the agreement, print it and collect signatures."}</p>}<button className={!agreementCurrent ? styles.primary : undefined} type="button" disabled={busy} onClick={generateAndPrint}>{agreementCurrent ? "Open & print saved agreement" : "Generate & print agreement"}</button>{agreementCurrent && evidence.signed && !model?.signedCurrent && <p role="status">Upload and review a signed copy of this current agreement before continuing. An older signed copy cannot authorize changed terms.</p>}<div className={styles.fields}>{evidenceControl("signed", "Signed agreement", "signed-agreement")}{evidenceControl("license", "Driver license proof", "driver-license")}{evidenceControl("insurance", "Coverage proof", "insurance-proof")}</div><footer><button type="button" onClick={() => navigate(1)}>Back to verification</button><button className={styles.primary} type="button" disabled={!proofReady || busy} onClick={() => navigate(3)}>Continue to release photos</button></footer></>}
      {(stage === 3 || stage === 4 && active) && <><h3>{stage === 4 ? "Return checklist" : "Release photos & handover"}</h3>{stage === 4 && <div className={styles.fields}>{([ ["returnAt", "Actual return time", "datetime-local"], ["returnMileage", "Return odometer", "number"], ["fuelIn", "Fuel in", "text"], ["returnCondition", "Return condition", "text"], ["receivedBy", "Receiving employee", "text"] ] as const).map(([key, label, type]) => <label key={key}>{label}<input type={type} value={returnInfo[key]} onChange={event => setReturnInfo(current => ({ ...current, [key]: event.target.value }))} /></label>)}<button type="button" onClick={() => setReturnInfo(current => ({ ...current, returnAt: driveLocalTime(new Date()), receivedBy: employeeName }))}>Use current time & my name</button><label><input type="checkbox" checked={returnInfo.keysReturned} onChange={event => setReturnInfo(current => ({ ...current, keysReturned: event.target.checked }))} />All keys returned</label><label><input type="checkbox" checked={returnInfo.returnException} onChange={event => setReturnInfo(current => ({ ...current, returnException: event.target.checked }))} />Damage, missing keys or another exception</label>{returnInfo.returnException && <label>Exception and next action<textarea value={returnInfo.exceptionNote} onChange={event => setReturnInfo(current => ({ ...current, exceptionNote: event.target.value }))} /></label>}</div>}
        <p>{photoViews.filter(view => reviewed(photoFiles[`${prefix}-${view}`])).length} of 5 photos reviewed. {stage === 4 ? "Return" : "Departure"} evidence is required.</p><progress max={5} value={photoViews.filter(view => reviewed(photoFiles[`${prefix}-${view}`])).length} aria-label="Reviewed photo progress" />
        <nav className={styles.photoSteps} aria-label="Photo views">{photoViews.map((view, index) => <button key={view} type="button" aria-pressed={photoIndex === index} onClick={() => setPhotoIndex(index)}>{reviewed(photoFiles[`${prefix}-${view}`]) ? "✓ " : ""}{photoLabels[index]}</button>)}</nav>
        {evidenceControl(`${prefix}-${photoViews[photoIndex]}`, photoLabels[photoIndex], stage === 4 ? "return-condition" : "release-condition", true)}
        {photoIndex < 4 && <button type="button" onClick={() => setPhotoIndex(photoIndex + 1)}>Next photo view</button>}
        {stage === 3 ? <>{legacyActive && <><label><input type="checkbox" checked={legacyNotReleased} onChange={event => setLegacyNotReleased(event.target.checked)} />I confirmed this vehicle has not actually departed</label><label>Legacy reconciliation reason<textarea value={legacyNote} onChange={event => setLegacyNote(event.target.value)} /></label></>}<label><input type="checkbox" checked={keysVerified} onChange={event => setKeysVerified(event.target.checked)} />Keys handed to the verified driver</label><label><input type="checkbox" checked={physicalHandover} onChange={event => setPhysicalHandover(event.target.checked)} />Vehicle is physically being released now</label><footer><button type="button" onClick={() => navigate(2)}>Back to agreement</button><button className={styles.primary} type="button" disabled={busy || !model || !readiness.verified || !proofReady || !photosReady || !physicalHandover || !keysVerified || (legacyActive && (!legacyNotReleased || legacyNote.trim().length < 10))} onClick={() => void run(async () => { await command("RELEASE", { keysVerified, physicalHandover, ...(legacyActive ? { legacyNotReleased, legacyNote } : {}) }); await load(); setPhysicalHandover(false); setKeysVerified(false); navigate(0); })}>Confirm release & start test drive</button></footer></> : <>{returnError && <p role="status">{returnError}</p>}<footer><button type="button" onClick={() => navigate(0)}>Back to active drive</button><button className={styles.primary} type="button" disabled={busy || !photosReady || Boolean(returnError)} onClick={() => void run(async () => { await command("RETURN", { bookingId: booking!.id, expectedVersion: booking!.version, facts: returnInfo, evidence: returnEvidence }); await load(); navigate(0); })}>{returnInfo.returnException ? "Record return & keep vehicle on hold" : "Complete return"}</button></footer></>}
      </>}
      </fieldset>
    </section>
    <details><summary>Agreement, evidence & activity history</summary>{model?.jacket && <a href={`/sales-documents?jacketId=${encodeURIComponent(model.jacket.id)}`}>Open complete document history</a>}{model?.events.length ? <ol>{model.events.map(event => <li key={event.id}>{event.action.replace("TD_", "").replaceAll("_", " ")} · {testDriveDateTime(event.occurredAt)} · Staff reference {event.actorUserId}</li>)}</ol> : <p>No vehicle release recorded.</p>}<button type="button" disabled={busy} onClick={() => void run(async () => { await load(); setNotice("Status refreshed."); })}>Refresh status</button></details>
  </section>;
}
