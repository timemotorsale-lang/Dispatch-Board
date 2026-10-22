"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { CompactInventoryIntakeContext } from "@/features/prototype/inventory-intake/compact-inventory-intake";
import { INTAKE_SOURCES } from "@/server/inventory-unit/intake-domain";
import { BarcodeScanner } from "./barcode-scanner";
import { vinFromBarcode } from "./barcode-review";
import { MOBILE_HOME_HREF } from "./capture-navigation";
import { intakeRequest } from "./mobile-intake-utils";
import styles from "./mobile-intake.module.css";

type Options = { locations: { id: string; name: string }[]; users: { id: string; name: string }[] };
type Preview = { potentialDuplicate?: { id: string }; decode?: { decoded?: { modelYear?: number; make?: string; model?: string } } };
type Receipt = { vehicleId: string; inventoryUnitId: string; inventoryNumber: string };

export function MobileVehicleIntake({ options, initialVin = "" }: { options: Options; initialVin?: string }) {
  const prefix = useId();
  const [vin, setVin] = useState(initialVin);
  const [scanner, setScanner] = useState(false);
  const [identity, setIdentity] = useState<{ vin: string; year: string; make: string; model: string } | null>(null);
  const [existing, setExisting] = useState<CompactInventoryIntakeContext | null>(null);
  const [locationId, setLocationId] = useState(options.locations.length === 1 ? options.locations[0].id : "");
  const [ownerUserId, setOwnerUserId] = useState(options.users[0]?.id ?? "");
  const [source, setSource] = useState("");
  const [acquiredOn, setAcquiredOn] = useState("");
  const [whereabouts, setWhereabouts] = useState("");
  const [condition, setCondition] = useState("");
  const [ownership, setOwnership] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const inFlight = useRef(false);
  const started = useRef(false);
  const pending = useRef<{ signature: string; body: string } | null>(null);

  const lookup = useCallback(async (value: string) => {
    if (inFlight.current) return;
    const normalized = value.trim().toUpperCase();
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalized)) { setError("Scan or enter a complete 17-character VIN. VINs do not use I, O or Q."); return; }
    inFlight.current = true; setBusy(true); setError(""); setMessage(""); setVin(normalized);
    try {
      const found = await intakeRequest<{ intake: CompactInventoryIntakeContext | null }>(`/api/inventory-units/compact-intake?${new URLSearchParams({ vin: normalized })}`);
      let context = found.intake;
      let decoded: Preview["decode"];
      if (!context) {
        const preview = await intakeRequest<Preview>("/api/inventory-console/workflows/add-vehicle/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vin: normalized }) });
        if (preview.potentialDuplicate) context = await intakeRequest<CompactInventoryIntakeContext>(`/api/inventory-units/compact-intake?${new URLSearchParams({ vehicleId: preview.potentialDuplicate.id })}`);
        decoded = preview.decode;
      }
      setExisting(context);
      setSource(context?.details?.source ?? ""); setAcquiredOn(context?.details?.acquiredOn ?? "");
      setWhereabouts(context?.details?.whereabouts ?? ""); setCondition(context?.details?.condition ?? "");
      setIdentity({ vin: normalized, year: (context?.year ?? decoded?.decoded?.modelYear)?.toString() ?? "", make: context?.make ?? decoded?.decoded?.make ?? "", model: context?.model ?? decoded?.decoded?.model ?? "" });
      setMessage(context?.inventoryUnitId ? "This VIN is already in inventory. Open the existing record instead of adding it again." : context ? "Vehicle found. This intake will reuse its existing record." : decoded?.decoded ? "VIN decoded. Verify the vehicle and finish the receiving details below." : "Automatic decoding is unavailable. Enter and verify year, make and model below.");
      setOwnership(false); pending.current = null;
    } catch (failure) { setError(failure instanceof Error ? failure.message : "VIN lookup failed. Retry without losing your VIN."); }
    finally { inFlight.current = false; setBusy(false); }
  }, []);

  useEffect(() => {
    if (initialVin && !started.current) { started.current = true; void lookup(initialVin); }
  }, [initialVin, lookup]);

  function reset() {
    setIdentity(null); setExisting(null); setVin(""); setOwnership(false); setError(""); setReceipt(null);
    setSource(""); setAcquiredOn(""); setWhereabouts(""); setCondition(""); pending.current = null;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !identity || receipt || existing?.inventoryUnitId) return;
    if (!ownership) { setError("Confirm dealership ownership or consignment authority before adding inventory."); return; }
    inFlight.current = true; setBusy(true); setError("");
    try {
      const data = {
        action: "SAVE_INVENTORY", reason: "Add reviewed vehicle through mobile acquisition intake.",
        vehicleId: existing?.vehicleId, vin: identity.vin, year: Number(identity.year), make: identity.make, model: identity.model,
        locationId, ownerUserId, expectedIntakeVersion: existing?.intakeVersion ?? 0, expectedUnitVersion: existing?.unitVersion ?? null,
        ownershipConfirmed: ownership, concern: "",
        details: { seller: "", boughtFrom: "", buyer: "", reference: "", priceStatus: "PENDING", purchaseCents: null, proposedPriceCents: null, odometer: null, odometerUnit: "MILES", keys: null, titleStatus: "PENDING", documents: "", pendingNotes: "", ...existing?.details, source, acquiredOn, whereabouts, condition }
      };
      const signature = JSON.stringify(data);
      if (pending.current?.signature !== signature) pending.current = { signature, body: JSON.stringify({ ...data, idempotencyKey: crypto.randomUUID() }) };
      const saved = await intakeRequest<{ result: Receipt }>("/api/inventory-units/compact-intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: pending.current.body });
      setReceipt(saved.result); pending.current = null;
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Save interrupted. Retry the same details to recover your receipt safely."); }
    finally { inFlight.current = false; setBusy(false); }
  }

  return <section className={styles.workspace} aria-label="Mobile vehicle intake">
    <nav className={styles.nav}><Link href={MOBILE_HOME_HREF}>← Mobile home</Link><Link href="/vehicles">Inventory</Link></nav>
    <p className={styles.steps}>{receipt ? "Complete" : identity ? "2 · Review & add" : "1 · Capture VIN"}</p>
    <h1>{receipt ? "Vehicle added" : "Add vehicle"}</h1>
    {receipt ? <div className={styles.card} role="status"><h2>{[identity?.year, identity?.make, identity?.model].filter(Boolean).join(" ")}</h2><p>Inventory {receipt.inventoryNumber} is saved. Pricing, documents and other missing acquisition details remain pending.</p><Link className={styles.primary} href={`/vehicles/${encodeURIComponent(receipt.vehicleId)}/frontline`}>Open vehicle</Link><button type="button" onClick={reset}>Add another vehicle</button></div> : !identity ? <form className={styles.card} onSubmit={(event) => { event.preventDefault(); void lookup(vin); }}><fieldset disabled={busy}><h2>Scan it. Decode it. Review it.</h2><p>Use the VIN barcode on the door jamb or windshield. You can also choose a photo or enter the VIN.</p><button className={styles.primary} type="button" onClick={() => setScanner(true)}>Scan VIN barcode</button><label htmlFor={`${prefix}-vin`}>VIN<input id={`${prefix}-vin`} autoCapitalize="characters" autoComplete="off" spellCheck={false} minLength={17} maxLength={17} required value={vin} onChange={(event) => setVin(event.target.value.toUpperCase())} /></label><button className={styles.primary} type="submit">{busy ? "Checking VIN…" : "Decode & continue"}</button><p className={styles.hint}>Nothing is added until you confirm. Existing VINs are checked first.</p></fieldset></form> : <>
      <p className={styles.notice} role="status">{message}</p>
      {existing?.inventoryUnitId ? <div className={styles.card}><h2>Already in inventory</h2><p>{identity.year} {identity.make} {identity.model} · {existing.inventoryNumber}</p><Link className={styles.primary} href={`/vehicles/${encodeURIComponent(existing.vehicleId)}/frontline`}>Open existing vehicle</Link><button type="button" onClick={reset}>Scan another VIN</button></div> : <form onSubmit={save}>
        <fieldset disabled={busy}>
          <div className={styles.card}><h2>Verify vehicle</h2><p>{identity.vin}</p>
            <label htmlFor={`${prefix}-year`}>Year<input id={`${prefix}-year`} required type="number" min={1886} max={new Date().getFullYear() + 2} readOnly={Boolean(existing)} value={identity.year} onChange={(event) => setIdentity({ ...identity, year: event.target.value })} /></label>
            <div className={styles.pair}>{(["make", "model"] as const).map((name) => <label key={name} htmlFor={`${prefix}-${name}`}>{name === "make" ? "Make" : "Model"}<input id={`${prefix}-${name}`} required maxLength={100} readOnly={Boolean(existing)} value={identity[name]} onChange={(event) => setIdentity({ ...identity, [name]: event.target.value })} /></label>)}</div>
          </div>
          <div className={styles.card}><h2>Receiving details</h2><p className={styles.hint}>Only the essentials now. Add price, mileage and documents later.</p>
            <label htmlFor={`${prefix}-source`}>Acquired from<select id={`${prefix}-source`} required value={source} onChange={(event) => setSource(event.target.value)}><option value="">Choose source</option>{INTAKE_SOURCES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
            <label htmlFor={`${prefix}-date`}>Acquisition date<input id={`${prefix}-date`} required type="date" value={acquiredOn} onChange={(event) => setAcquiredOn(event.target.value)} /></label>
            <label htmlFor={`${prefix}-location`}>Receiving location<select id={`${prefix}-location`} required value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Choose location</option>{options.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
            <label htmlFor={`${prefix}-staff`}>Responsible staff<select id={`${prefix}-staff`} required value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)}><option value="">Choose staff</option>{options.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
            <label htmlFor={`${prefix}-where`}>Where is the vehicle now?<input id={`${prefix}-where`} required maxLength={500} value={whereabouts} onChange={(event) => setWhereabouts(event.target.value)} placeholder="Example: Main lot, receiving row" /></label>
            <label htmlFor={`${prefix}-condition`}>Arrival condition / damage<textarea id={`${prefix}-condition`} required minLength={10} maxLength={1000} value={condition} onChange={(event) => setCondition(event.target.value)} /></label>
            <label className={styles.check}><input type="checkbox" required checked={ownership} onChange={(event) => setOwnership(event.target.checked)} />I reviewed this VIN and confirm dealership ownership or consignment authority.</label>
            <button className={styles.primary} type="submit">{busy ? "Adding to inventory…" : "Confirm & add to inventory"}</button>
            <button type="button" onClick={() => { if (window.confirm("Discard this unsaved vehicle intake and scan another VIN?")) reset(); }}>Change VIN</button>
          </div>
        </fieldset>
      </form>}
    </>}
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {scanner ? <BarcodeScanner vinOnly onClose={() => setScanner(false)} onConfirm={(result) => { setScanner(false); const scanned = vinFromBarcode(result.value); if (scanned) void lookup(scanned); else setError("A complete VIN was not found. Retake the photo or enter the VIN."); }} /> : null}
  </section>;
}
