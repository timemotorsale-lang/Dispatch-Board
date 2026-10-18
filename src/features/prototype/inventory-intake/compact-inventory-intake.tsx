"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { INTAKE_SOURCES, intakePending, type IntakeDetails } from "@/server/inventory-unit/intake-domain";
import styles from "./compact-inventory-intake.module.css";

export type CompactInventoryIntakeContext = {
  vehicleId: string; vehicleNumber: string; vin: string | null; year: number | null; make: string | null; model: string | null;
  inventoryNumber: string | null; inventoryUnitId?: string | null; details?: Partial<IntakeDetails>; intakeVersion?: number; unitVersion?: number | null;
  locationId?: string | null; ownerUserId?: string | null; canPrice?: boolean;
};
type Options = { locations: { id: string; name: string }[]; users: { id: string; name: string }[] };
type Receipt = { vehicleId: string; inventoryUnitId: string; inventoryNumber: string; intakeVersion: number; unitVersion: number; repairOrderId?: string };
type WorkType = "sale" | "recon" | "customer";

function initialFields(context: CompactInventoryIntakeContext | undefined, options: Options) {
  const details = context?.details;
  return {
    vin: context?.vin ?? "", year: context?.year?.toString() ?? "", make: context?.make ?? "", model: context?.model ?? "",
    odometer: details?.odometer?.toString() ?? "", odometerUnit: details?.odometerUnit ?? "MILES",
    source: details?.source ?? "", seller: details?.seller ?? "", boughtFrom: details?.boughtFrom ?? "", buyer: details?.buyer ?? "",
    acquiredOn: details?.acquiredOn ?? "", reference: details?.reference ?? "", priceStatus: details?.priceStatus ?? "PENDING",
    purchaseAmount: details?.purchaseCents == null ? "" : (details.purchaseCents / 100).toFixed(2),
    askingPrice: details?.proposedPriceCents == null ? "" : (details.proposedPriceCents / 100).toFixed(2),
    location: context?.locationId ?? options.locations[0]?.id ?? "", staff: context?.ownerUserId ?? options.users[0]?.id ?? "",
    whereabouts: details?.whereabouts ?? "", condition: details?.condition ?? "", concern: "", keys: details?.keys?.toString() ?? "",
    titleStatus: details?.titleStatus ?? "PENDING", documents: details?.documents ?? "", pendingNotes: details?.pendingNotes ?? "",
  };
}

async function requestJson(url: string, options?: RequestInit) {
  const response = await fetch(url, { ...options, cache: "no-store" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Intake could not be completed. Your entries remain on this page.");
  return result;
}

export function CompactInventoryIntake({ context: initialContext, options = { locations: [], users: [] } }: { context?: CompactInventoryIntakeContext; options?: Options }) {
  const prefix = useId();
  const router = useRouter();
  const [context, setContext] = useState(initialContext);
  const [fields, setFields] = useState(() => initialFields(initialContext, options));
  const [workType, setWorkType] = useState<WorkType>("recon");
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false);
  const [busy, setBusy] = useState(false), [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(""), [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const pending = useRef<{ signature: string; body: Record<string, unknown> } | null>(null);
  const correction = useRef<{ signature: string; body: Record<string, unknown> } | null>(null);
  const [numberEdit, setNumberEdit] = useState("");
  const [numberReason, setNumberReason] = useState("");
  type Field = keyof typeof fields;
  const dirty = useRef(false);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  function update(name: Field, value: string) { dirty.current = true; setFields(previous => ({ ...previous, [name]: value })); setError(""); }
  function cents(value: string) {
    if (!value.trim()) return null;
    if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0) throw new Error("Enter a positive amount with at most two decimal places, or leave it pending.");
    return Math.round(Number(value) * 100);
  }
  function details(): IntakeDetails {
    return { source: fields.source, seller: fields.seller, boughtFrom: fields.boughtFrom, buyer: fields.buyer, acquiredOn: fields.acquiredOn,
      reference: fields.reference, purchaseCents: cents(fields.purchaseAmount), proposedPriceCents: cents(fields.askingPrice), priceStatus: fields.priceStatus,
      whereabouts: fields.whereabouts, condition: fields.condition, odometer: fields.odometer === "" ? null : Number(fields.odometer), odometerUnit: fields.odometerUnit,
      keys: fields.keys === "" ? null : Number(fields.keys), titleStatus: fields.titleStatus, documents: fields.documents, pendingNotes: fields.pendingNotes };
  }
  const pendingItems = intakePending({ ...fields, purchaseCents: fields.purchaseAmount ? 1 : null, proposedPriceCents: null, odometer: fields.odometer === "" ? null : Number(fields.odometer), keys: fields.keys === "" ? null : Number(fields.keys) });
  async function lookup() {
    const initial = initialFields(context, options);
    const enteredDetails = (Object.keys(fields) as Field[]).some(name => name !== "vin" && fields[name] !== initial[name]);
    if (enteredDetails && !window.confirm("Lookup will replace this form with the selected vehicle's saved intake. Continue?")) return;
    const vin = fields.vin.trim().toUpperCase();
    setChecking(true); setError(""); setMessage("");
    try {
      const found = await requestJson(`/api/inventory-units/compact-intake?${new URLSearchParams({ vin })}`);
      if (found.intake) {
        setContext(found.intake); setFields(initialFields(found.intake, options));
        setMessage("Existing vehicle selected. Its inventory and history will be reused.");
      } else {
        const decoded = await requestJson("/api/inventory-console/workflows/add-vehicle/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vin }) });
        if (decoded.potentialDuplicate) {
          const existing = await requestJson(`/api/inventory-units/compact-intake?${new URLSearchParams({ vehicleId: decoded.potentialDuplicate.id })}`);
          setContext(existing); setFields(initialFields(existing, options));
          setMessage("Existing vehicle selected. No duplicate will be added.");
        } else {
          const identity = decoded.decode?.decoded;
          setContext(undefined); setFields({ ...initialFields(undefined, options), vin, year: identity?.modelYear?.toString() ?? "", make: identity?.make ?? "", model: identity?.model ?? "" });
          setMessage(identity ? "VIN decoded. Verify the details, then complete acquisition and receiving information." : "VIN validated; decoding is unavailable. Enter and verify year, make and model.");
        }
      }
      dirty.current = false; pending.current = null; setReceipt(null); setOwnershipConfirmed(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "VIN lookup failed. Your entries were kept."); }
    finally { setChecking(false); }
  }
  function changeVehicle() {
    if (dirty.current && !window.confirm("Clear this form to select another vehicle?")) return;
    setContext(undefined); setFields(initialFields(undefined, options)); setReceipt(null); setOwnershipConfirmed(false);
    setMessage(""); setError(""); pending.current = null; dirty.current = false;
    setNumberEdit(""); setNumberReason(""); correction.current = null;
  }
  async function correctNumber() {
    const unitId = context?.inventoryUnitId ?? receipt?.inventoryUnitId;
    if (!unitId || !context?.unitVersion || busy) return;
    setError(""); setMessage("");
    try {
      if (pending.current) throw new Error("Recover the interrupted intake save before correcting its number, or reload the latest record.");
      if (numberReason.trim().length < 10) throw new Error("Enter a brief correction reason (at least 10 characters).");
      const values = { inventoryNumber: numberEdit.trim().toUpperCase(), expectedVersion: context.unitVersion, reason: numberReason.trim() };
      const signature = JSON.stringify(values);
      if (correction.current?.signature !== signature) correction.current = { signature, body: { ...values, idempotencyKey: crypto.randomUUID() } };
      setBusy(true);
      const saved = await requestJson(`/api/inventory-units/${encodeURIComponent(unitId)}/number`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(correction.current.body) });
      setContext(previous => previous ? { ...previous, inventoryNumber: saved.inventoryNumber, unitVersion: saved.version } : previous);
      setReceipt(previous => previous ? { ...previous, inventoryNumber: saved.inventoryNumber, unitVersion: saved.version } : previous);
      correction.current = null; setNumberEdit(""); setNumberReason("");
      setMessage("Inventory number corrected. Vehicle, repair-order and history links are unchanged.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Correction interrupted. Retry unchanged to recover its receipt."); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (workType === "customer" || busy) return;
    const next = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "continue";
    setError(""); setMessage("");
    try {
      if (!fields.location || !fields.staff) throw new Error("Select the receiving location and responsible staff.");
      if (!context?.vehicleId && (!fields.vin || !fields.year || !fields.make || !fields.model)) throw new Error("Identify the vehicle by VIN, year, make and model.");
      if (!fields.source || !fields.acquiredOn) throw new Error("Select the acquisition source and date.");
      if (!fields.whereabouts.trim() || fields.condition.trim().length < 10) throw new Error("Enter the vehicle's current whereabouts and a brief condition description (at least 10 characters).");
      const values = details();
      if (values.purchaseCents !== null && fields.priceStatus === "PENDING") throw new Error("Choose incurred or estimated for the entered purchase amount.");
      if (next && workType === "recon" && fields.concern.trim().length < 10) throw new Error("Enter the repair concern (at least 10 characters).");
      const data = { action: next && workType === "recon" ? "SAVE_AND_START_RO" : "SAVE_INVENTORY", reason: "Record compact inventory acquisition intake", vehicleId: context?.vehicleId,
        vin: fields.vin || undefined, year: fields.year ? Number(fields.year) : undefined, make: fields.make || undefined, model: fields.model || undefined,
        locationId: fields.location, ownerUserId: fields.staff, expectedIntakeVersion: context?.intakeVersion ?? 0, expectedUnitVersion: context?.unitVersion ?? null,
        details: values, concern: fields.concern, ownershipConfirmed };
      const signature = JSON.stringify(data);
      if (pending.current?.signature !== signature) pending.current = { signature, body: { ...data, idempotencyKey: crypto.randomUUID() } };
      setBusy(true);
      const saved = await requestJson("/api/inventory-units/compact-intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current.body) });
      const result = saved.result as Receipt;
      setContext({ ...context, vehicleId: result.vehicleId, vehicleNumber: context?.vehicleNumber ?? "Saved vehicle", vin: fields.vin || null, year: fields.year ? Number(fields.year) : null,
        make: fields.make || null, model: fields.model || null, inventoryNumber: result.inventoryNumber, inventoryUnitId: result.inventoryUnitId, intakeVersion: result.intakeVersion, unitVersion: result.unitVersion,
        locationId: fields.location, ownerUserId: fields.staff, details: values });
      setReceipt(result); pending.current = null; dirty.current = false;
      setMessage(result.repairOrderId ? "Inventory saved. Linked repair order is ready for work planning; repairs are not authorized by intake." : "Inventory saved and linked to this vehicle.");
      if (next && workType === "sale") router.push(`/vehicles/${encodeURIComponent(result.vehicleId)}/frontline`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Response interrupted. Retry the unchanged save to recover its receipt safely."); }
    finally { setBusy(false); }
  }
  function input(name: Field, label: string, type = "text", required = false) {
    return <div className={styles.field}><label htmlFor={`${prefix}-${name}`}>{label}{required ? " *" : ""}</label><input id={`${prefix}-${name}`} name={name} type={type} value={fields[name]} required={required} readOnly={Boolean(context?.vehicleId) && ["year", "make", "model"].includes(name)} onChange={event => update(name, event.target.value)} {...(type === "number" ? { min: 0, step: name === "odometer" || name === "keys" ? "1" : "0.01" } : {})} /></div>;
  }
  function select(name: Field, label: string, choices: { id: string; name: string }[], required = false) {
    return <div className={styles.field}><label htmlFor={`${prefix}-${name}`}>{label}{required ? " *" : ""}</label><select id={`${prefix}-${name}`} name={name} value={fields[name]} required={required} onChange={event => update(name, event.target.value)}><option value="">Select…</option>{choices.map(choice => <option key={choice.id} value={choice.id}>{choice.name}</option>)}</select></div>;
  }
  function area(name: Field, label: string, required = false) {
    return <div className={styles.field}><label htmlFor={`${prefix}-${name}`}>{label}{required ? " *" : ""}</label><textarea id={`${prefix}-${name}`} name={name} rows={2} required={required} value={fields[name]} onChange={event => update(name, event.target.value)} /></div>;
  }
  return <section className={styles.workspace}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Vehicle / Acquisition / Work</p><h1>Inventory intake</h1></div><span className={styles.badge}>New form · Review before adoption</span></header>
    <div className={styles.context}><strong>{context ? `${context.vehicleNumber} · ${context.inventoryNumber ?? "Inventory will be linked on save"}` : "Add inventory · VIN lookup prevents duplicate records"}</strong><span>Save writes real records. Current intake remains available.</span></div>
    <fieldset className={styles.workTypes} disabled={busy || checking}><legend>Work type</legend>{([["sale", "Prepare for Sale"], ["recon", "Dealership Repair / Recon"], ["customer", "Customer Repair"]] as const).map(([value, label]) => <label key={value}><input type="radio" name="workType" value={value} checked={workType === value} onChange={() => setWorkType(value)} />{label}</label>)}</fieldset>
    {workType === "customer" ? <div className={styles.feedback}><h2>Customer repair</h2><p>Customer-owned vehicles do not create dealership inventory. Continue with the existing customer check-in using this same vehicle.</p><Link onClick={event => { if (dirty.current && !window.confirm("Leave this intake without saving the entered inventory details?")) event.preventDefault(); }} href={`/vehicles/repair-orders?${new URLSearchParams({ intakeSource: "WALK_IN", ...(context?.vehicleId ? { vehicleId: context.vehicleId } : {}) })}`}>Open customer check-in</Link></div> : <form noValidate onSubmit={save}>
      <fieldset className={styles.columns} disabled={busy || checking}>
        <section className={styles.column}><h2>Vehicle identification</h2><div className={styles.vinRow}><div className={styles.field}><label htmlFor={`${prefix}-vin`}>VIN</label><input id={`${prefix}-vin`} name="vin" value={fields.vin} readOnly={Boolean(context?.vehicleId)} onChange={event => update("vin", event.target.value.toUpperCase())} /></div>{context ? <button type="button" onClick={changeVehicle}>Change vehicle</button> : <button type="button" onClick={lookup}>VIN Lookup</button>}</div>
          <div className={styles.pair}>{input("year", "Year", "number", !context)}{input("odometer", "Odometer", "number")}</div>{input("make", "Make", "text", !context)}{input("model", "Model", "text", !context)}
          {select("odometerUnit", "Mileage unit", [{ id: "MILES", name: "Miles" }, { id: "KILOMETERS", name: "Kilometers" }])}
          <div className={styles.field}><label htmlFor={`${prefix}-stock`}>Stock / inventory number</label><input id={`${prefix}-stock`} readOnly value={context?.inventoryNumber ?? "VIN last six · assigned on save"} /></div>
          {(context?.inventoryUnitId || receipt?.inventoryUnitId) && <details className={styles.optional}><summary>Correct inventory number · authorized staff</summary><div className={styles.field}><label htmlFor={`${prefix}-numberEdit`}>Corrected inventory number</label><input id={`${prefix}-numberEdit`} value={numberEdit} maxLength={100} onChange={event => setNumberEdit(event.target.value)} /></div><div className={styles.field}><label htmlFor={`${prefix}-numberReason`}>Correction reason</label><input id={`${prefix}-numberReason`} value={numberReason} maxLength={500} onChange={event => setNumberReason(event.target.value)} /></div><button type="button" disabled={busy || checking} onClick={correctNumber}>Save number correction</button><p className={styles.hint}>Changes the display number only. Permission, duplicate and version checks still apply.</p></details>}
          {!context?.inventoryNumber && <label className={styles.confirm}><input type="checkbox" checked={ownershipConfirmed} onChange={event => setOwnershipConfirmed(event.target.checked)} />I confirm dealership ownership or consignment authority.</label>}
        </section>
        <section className={styles.column}><h2>Purchase &amp; acquisition</h2>{select("source", "Acquisition source", INTAKE_SOURCES.map(source => ({ id: source, name: source.replaceAll("_", " ") })), true)}{input("acquiredOn", "Acquisition date", "date", true)}{input("seller", "Seller / acquired from")}
          <div className={styles.pair}>{input("purchaseAmount", "Purchase amount ($)", "number")}{select("priceStatus", "Cost status", [{ id: "PENDING", name: "Pending" }, { id: "INCURRED", name: "Incurred" }, { id: "ESTIMATED", name: "Estimated" }])}</div>{input("reference", "Purchase invoice / reference (optional)")}
          <p className={styles.hint}>Blank cost remains pending—not zero. Existing purchase records must reconcile.</p>
          {pendingItems.length > 0 && area("pendingNotes", "Pending details / follow-up (optional)")}
        </section>
        <section className={styles.column}><h2>Receiving &amp; work</h2>{select("location", "Receiving location", options.locations, true)}{select("staff", "Responsible staff", options.users, true)}{input("whereabouts", "Where is the vehicle now?", "text", true)}{area("condition", "Condition / damage", true)}
          {workType === "recon" && area("concern", "Repair concern")}
          <details className={styles.optional}><summary>Additional details</summary>{input("boughtFrom", "Purchase location")}{input("buyer", "Who acquired it")}{input("keys", "Number of keys", "number")}{select("titleStatus", "Title status", [{ id: "PENDING", name: "Pending" }, { id: "RECEIVED", name: "Received (staff reported)" }, { id: "ISSUE", name: "Issue / hold" }])}{area("documents", "Document references (optional)")}{context?.canPrice && input("askingPrice", "Proposed asking price ($)", "number")}<p className={styles.hint}>Document references only; no upload or readiness approval is implied.</p></details>
        </section>
      </fieldset>
      {(error || message || checking || receipt) && <div className={styles.feedback}>{error && <p role="alert">{error}</p>}{(message || checking) && <p role="status">{checking ? "Checking VIN…" : message}</p>}{receipt && <nav aria-label="Continue saved vehicle" onClickCapture={event => { if (event.target instanceof Element && event.target.closest("a") && dirty.current && !window.confirm("Leave this intake without saving your changes?")) event.preventDefault(); }}><Link href={`/vehicles/${encodeURIComponent(receipt.vehicleId)}/frontline`}>Open selling workbench</Link>{receipt.repairOrderId && <><span> · </span><Link href={`/prototype/repair-explorer?repairOrderId=${encodeURIComponent(receipt.repairOrderId)}`}>Build estimate in Labor Guide</Link></>}</nav>}</div>}
      <footer className={styles.footer}><span>{workType === "sale" ? "Preparing for sale does not approve retail release." : "Intake does not authorize repairs or customer charges."}</span><div className={styles.actions}><button disabled={busy || checking} type="submit" value="inventory">{busy ? "Saving…" : "Save Inventory"}</button><button className={styles.primary} disabled={busy || checking} type="submit" value="continue">{workType === "sale" ? "Save & Open Selling Workbench" : "Save & Start Repair Order"}</button></div></footer>
    </form>}
  </section>;
}
