"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { AlertCircle, Camera, CarFront, CheckCircle2, ClipboardCheck, FileText, Gauge, PackageCheck, PenLine, ShieldCheck, UserPlus, Wrench } from "lucide-react";

import styles from "./crm-next-shell.module.css";

type IntakeMode = "customer" | "prospect";
type CapturePurpose = "customer" | "vehicle" | "mileage" | "condition" | "repair" | "parts" | "document" | "signature";

type CustomerFields = {
  address: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  preferredContactMethod: string;
};

type SaveState =
  | { kind: "idle" }
  | { kind: "saving"; message: string }
  | { kind: "success"; message: string; customerHref: string }
  | { kind: "error"; message: string };

const DEFAULT_LOCATION_ID = "loc-time-motor-sales-minneapolis";

const EMPTY_CUSTOMER_FIELDS: CustomerFields = {
  address: "",
  displayName: "",
  email: "",
  phoneNumber: "",
  preferredContactMethod: "PHONE"
};

const CAPTURE_PURPOSES: Array<{
  id: CapturePurpose;
  label: string;
  nextAction: string;
  icon: typeof Camera;
}> = [
  { id: "customer", label: "Add customer", nextAction: "Create or update customer", icon: UserPlus },
  { id: "vehicle", label: "Add vehicle", nextAction: "Find or create vehicle", icon: CarFront },
  { id: "mileage", label: "Record mileage", nextAction: "Attach odometer proof", icon: Gauge },
  { id: "condition", label: "Show condition", nextAction: "Attach condition evidence", icon: Camera },
  { id: "repair", label: "Repair proof", nextAction: "Attach to RO or job", icon: Wrench },
  { id: "parts", label: "Add part", nextAction: "Attach to parts request", icon: PackageCheck },
  { id: "document", label: "Add document", nextAction: "Route to record", icon: FileText },
  { id: "signature", label: "Capture approval", nextAction: "Hold for review", icon: PenLine }
];

const CAPTURE_WORKFLOWS: Record<CapturePurpose, {
  attachTo: string;
  confirm: string;
  guidance: string;
  reviewField: string;
}> = {
  condition: {
    attachTo: "Vehicle, inventory unit, RO, or deal",
    confirm: "Confirm the condition area, severity, and whether the next action is repair, recon, manager review, or delivery proof.",
    guidance: "Use for walkaround photos, damage, interior condition, warning lights, tires, glass, and lot-ready proof.",
    reviewField: "Condition, area, severity, next action"
  },
  customer: {
    attachTo: "Customer record",
    confirm: "Confirm customer identity, phone or email, duplicate check, and privacy handling before saving.",
    guidance: "Use for driver license assisted customer creation.",
    reviewField: "Name, phone/email, address, license ending"
  },
  document: {
    attachTo: "Customer, vehicle, RO, deal, invoice, or vendor",
    confirm: "Confirm document type, owner record, effective date, and whether it needs accounting, title, compliance, or manager review.",
    guidance: "Use for insurance cards, registration, vendor invoices, auction paperwork, receipts, title packets, and signed forms.",
    reviewField: "Document type, owner record, review destination"
  },
  mileage: {
    attachTo: "Vehicle, RO, inventory unit, transport, or delivery",
    confirm: "Confirm mileage number, event type, and whether it is intake, repair start, road test, pickup, or delivery.",
    guidance: "Use for odometer proof and mileage history at key vehicle handoffs.",
    reviewField: "Mileage, event, date, vehicle"
  },
  parts: {
    attachTo: "RO, repair job, parts request, return, or warranty claim",
    confirm: "Confirm part number, quantity, vendor, condition, and whether to order, receive, return, or hold for review.",
    guidance: "Use for part labels, packaging, invoices, cores, warranty tags, and damaged or wrong parts.",
    reviewField: "Part number, quantity, vendor, next action"
  },
  repair: {
    attachTo: "RO, repair job, diagnostic case, estimate, or QC",
    confirm: "Confirm repair stage, finding, proof type, and whether the next action is estimate, authorization, repair, or verification.",
    guidance: "Use for failed parts, measurements, scan screens, before/after repair, QC proof, and road-test evidence.",
    reviewField: "Finding, proof, RO/job, next action"
  },
  signature: {
    attachTo: "Estimate, authorization, delivery, privacy consent, or trade-in",
    confirm: "Confirm signer, document purpose, timestamp, and whether this should remain review-only or become approval evidence.",
    guidance: "Use for customer consent, paper authorization, pickup proof, delivery proof, and trade-in approval.",
    reviewField: "Signer, purpose, authorization status"
  },
  vehicle: {
    attachTo: "Vehicle record",
    confirm: "Confirm VIN or plate, year/make/model, duplicate vehicle check, and inventory or customer ownership.",
    guidance: "Use for VIN labels, license plates, key tags, window stickers, and stock labels.",
    reviewField: "VIN/plate, vehicle identity, ownership"
  }
};

function formText(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function idempotencyKey() {
  const cryptoValue = globalThis.crypto?.randomUUID?.();
  return cryptoValue ?? `crm-next-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function readJson(response: Response) {
  const value = await response.json().catch(() => null);
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function customerFrom(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" ? { id: record.id, displayName: String(record.displayName ?? "Customer") } : null;
}

export function CrmNextIntakeForm() {
  const [mode, setMode] = useState<IntakeMode>("customer");
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const [customerFields, setCustomerFields] = useState<CustomerFields>(EMPTY_CUSTOMER_FIELDS);
  const [capturePurpose, setCapturePurpose] = useState<CapturePurpose>("customer");
  const mobileNameRef = useRef<HTMLInputElement>(null);
  const mobilePhoneRef = useRef<HTMLInputElement>(null);
  const mobileEmailRef = useRef<HTMLInputElement>(null);
  const mobileAddressRef = useRef<HTMLInputElement>(null);
  const mobileLicenseStateRef = useRef<HTMLInputElement>(null);
  const mobileLicenseEndingRef = useRef<HTMLInputElement>(null);
  const [mobileIdReviewed, setMobileIdReviewed] = useState(false);
  const [captureNotice, setCaptureNotice] = useState("Use a phone camera when available, then confirm only the fields needed to create the customer.");

  const submitLabel = useMemo(() => mode === "prospect" ? "Save prospect" : "Save customer", [mode]);
  const selectedCapture = CAPTURE_WORKFLOWS[capturePurpose];

  function updateCustomerField<K extends keyof CustomerFields>(key: K, value: CustomerFields[K]) {
    setCustomerFields((current) => ({ ...current, [key]: value }));
  }

  function applyMobileIdDraft() {
    const draft = {
      address: mobileAddressRef.current?.value.trim() ?? "",
      displayName: mobileNameRef.current?.value.trim() ?? "",
      email: mobileEmailRef.current?.value.trim() ?? "",
      phoneNumber: mobilePhoneRef.current?.value.trim() ?? ""
    };
    const mobileIdReady = Boolean(draft.displayName && mobileIdReviewed && (draft.phoneNumber || draft.email));

    if (!mobileIdReady) {
      setCaptureNotice("Confirm the customer name, at least one contact method, and the review checkbox before using the captured information.");
      return;
    }

    setCustomerFields((current) => ({
      ...current,
      address: draft.address || current.address,
      displayName: draft.displayName || current.displayName,
      email: draft.email || current.email,
      phoneNumber: draft.phoneNumber || current.phoneNumber,
      preferredContactMethod: draft.email && !draft.phoneNumber ? "EMAIL" : current.preferredContactMethod
    }));
    setCaptureNotice("Confirmed ID details were copied into customer intake. Save only after checking this is not an existing customer.");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setState({ kind: "saving", message: "Saving customer..." });

    const customerPayload = {
      address: formText(data, "address"),
      displayName: formText(data, "displayName"),
      email: formText(data, "email"),
      locationId: formText(data, "locationId") || DEFAULT_LOCATION_ID,
      phoneNumber: formText(data, "phoneNumber"),
      preferredContactMethod: formText(data, "preferredContactMethod") || "PHONE"
    };

    try {
      const customerResponse = await fetch("/api/service-intake/customers", {
        body: JSON.stringify(customerPayload),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const customerJson = await readJson(customerResponse);
      if (!customerResponse.ok) {
        throw new Error(typeof customerJson.error === "string" ? customerJson.error : "Customer could not be saved.");
      }

      const customer = customerFrom(customerJson.customer);
      if (!customer) throw new Error("Customer saved, but the customer record could not be opened.");

      const customerHref = `/crm-next/customers/${customer.id}`;
      if (mode === "prospect") {
        setState({ kind: "saving", message: "Creating prospect lead..." });
        const leadResponse = await fetch("/api/customers/leads", {
          body: JSON.stringify({
            customerId: customer.id,
            idempotencyKey: idempotencyKey(),
            qualification: {
              budget: formText(data, "budget"),
              customerNeed: formText(data, "customerNeed"),
              desiredTimeline: formText(data, "desiredTimeline"),
              notes: formText(data, "notes"),
              preferredContactMethod: customerPayload.preferredContactMethod
            },
            sourceCode: "CRM_NEXT",
            vehicleInterest: formText(data, "vehicleInterest") || null
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST"
        });
        const leadJson = await readJson(leadResponse);
        if (!leadResponse.ok) {
          setState({
            kind: "success",
            customerHref,
            message: `${customer.displayName} is saved. Open Customer 360 to continue; lead setup needs attention: ${typeof leadJson.error === "string" ? leadJson.error : "lead could not be created."}`
          });
          return;
        }
      }

      setState({
        kind: "success",
        customerHref,
        message: `${customer.displayName} is ready in CRM Next.`
      });
      window.location.assign(customerHref);
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "Customer could not be saved." });
    }
  }

  return (
    <form className={styles.intakeCard} onSubmit={onSubmit}>
      <header className={styles.panelHeader}>
        <div>
          <h2>Customer details</h2>
          <p className={styles.muted}>Start with the person. Add prospect details only when there is a sales opportunity.</p>
        </div>
        <div className={styles.segmentedControl} aria-label="Intake type">
          <button aria-pressed={mode === "customer"} onClick={() => setMode("customer")} type="button">Customer</button>
          <button aria-pressed={mode === "prospect"} onClick={() => setMode("prospect")} type="button">Prospect</button>
        </div>
      </header>

      <input name="locationId" type="hidden" value={DEFAULT_LOCATION_ID} />

      <section className={styles.mobileCapturePanel} aria-label="Capture Hub review">
        <div className={styles.captureIntro}>
          <div>
            <span className={styles.eyebrow}>Capture Hub</span>
            <h3>Use the phone camera to start the right work</h3>
            <p>Choose what you are capturing, confirm the useful details, attach it to the right record, then move to the next action.</p>
          </div>
          <div className={styles.capturePrivacy}>
            <ShieldCheck size={16} />
            <span>No sensitive photo is saved in this review build.</span>
          </div>
        </div>

        <div className={styles.capturePurposeGrid} aria-label="Capture purpose">
          {CAPTURE_PURPOSES.map(({ id, label, nextAction, icon: Icon }) => (
            <button aria-pressed={capturePurpose === id} key={id} onClick={() => setCapturePurpose(id)} type="button">
              <Icon size={18} />
              <span>{label}</span>
              <small>{nextAction}</small>
            </button>
          ))}
        </div>

        <div className={styles.captureSteps} aria-label="Capture Hub steps">
          <span><b>1</b> Capture</span>
          <span><b>2</b> Confirm</span>
          <span><b>3</b> Attach</span>
          <span><b>4</b> Next action</span>
        </div>

        {capturePurpose === "customer" ? (
          <>
            <div className={styles.mobileCaptureGrid}>
              <label className={styles.captureUpload}>
                <span><Camera size={18} /> Capture ID photo</span>
                <input
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => {
                    setCaptureNotice(event.currentTarget.files?.length ? "Photo selected for review. Confirm the fields below; the photo is not uploaded or saved." : "Use a phone camera when available, then confirm only the fields needed to create the customer.");
                  }}
                  type="file"
                />
                <small>For review only</small>
              </label>
              <label>
                <span>Customer name</span>
                <input placeholder="Name from ID" ref={mobileNameRef} />
              </label>
              <label>
                <span>Phone</span>
                <input aria-label="Captured customer phone" autoComplete="tel" inputMode="tel" placeholder="612 342 5656" ref={mobilePhoneRef} type="tel" />
              </label>
              <label>
                <span>Email</span>
                <input aria-label="Captured customer email" autoComplete="email" placeholder="customer@example.com" ref={mobileEmailRef} type="email" />
              </label>
              <label className={styles.fullField}>
                <span>Address</span>
                <input autoComplete="street-address" placeholder="Street, city, state" ref={mobileAddressRef} />
              </label>
              <label>
                <span>License state</span>
                <input maxLength={2} onChange={(event) => { event.currentTarget.value = event.currentTarget.value.toUpperCase(); }} placeholder="MN" ref={mobileLicenseStateRef} />
              </label>
              <label>
                <span>License ending</span>
                <input inputMode="numeric" maxLength={4} onChange={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 4); }} placeholder="Last 4 only" ref={mobileLicenseEndingRef} />
              </label>
            </div>

            <label className={styles.captureReviewCheck}>
              <input checked={mobileIdReviewed} onChange={(event) => setMobileIdReviewed(event.target.checked)} type="checkbox" />
              <span>I confirmed the ID details with the customer and checked for an existing customer before saving.</span>
            </label>
          </>
        ) : (
          <div className={styles.captureWorkflowCard}>
            <div>
              <strong>{CAPTURE_PURPOSES.find((purpose) => purpose.id === capturePurpose)?.label}</strong>
              <p>{selectedCapture.guidance}</p>
            </div>
            <dl>
              <div><dt>Confirm</dt><dd>{selectedCapture.reviewField}</dd></div>
              <div><dt>Attach to</dt><dd>{selectedCapture.attachTo}</dd></div>
              <div><dt>Next action</dt><dd>{selectedCapture.confirm}</dd></div>
            </dl>
            <label className={styles.captureUpload}>
              <span><Camera size={18} /> Capture or select photo</span>
              <input accept="image/*,.pdf" capture="environment" type="file" />
              <small>Review-only route preview</small>
            </label>
            <div className={styles.captureRoutePreview}>
              <ClipboardCheck size={18} />
              <span>This capture route is ready for your review. Live OCR, permanent storage, and workflow updates stay off until approved.</span>
            </div>
          </div>
        )}

        <div className={styles.captureFooter}>
          <p>{capturePurpose === "customer" ? captureNotice : "This route shows the intended staff workflow without writing to customer, vehicle, RO, parts, document, or accounting records."}</p>
          {capturePurpose === "customer" ? <button className={styles.secondaryButton} onClick={applyMobileIdDraft} type="button">Use this customer info</button> : null}
        </div>
      </section>

      <div className={styles.intakeFields}>
        <label>
          <span>Name</span>
          <input autoComplete="name" name="displayName" onChange={(event) => updateCustomerField("displayName", event.target.value)} placeholder="First and last name" required value={customerFields.displayName} />
        </label>
        <label>
          <span>Phone</span>
          <input aria-label="Customer phone" autoComplete="tel" inputMode="tel" name="phoneNumber" onChange={(event) => updateCustomerField("phoneNumber", event.target.value)} placeholder="612 342 5656" type="tel" value={customerFields.phoneNumber} />
        </label>
        <label>
          <span>Email</span>
          <input autoComplete="email" name="email" onChange={(event) => updateCustomerField("email", event.target.value)} placeholder="customer@example.com" type="email" value={customerFields.email} />
        </label>
        <label>
          <span>Preferred contact</span>
          <select name="preferredContactMethod" onChange={(event) => updateCustomerField("preferredContactMethod", event.target.value)} value={customerFields.preferredContactMethod}>
            <option value="PHONE">Phone</option>
            <option value="EMAIL">Email</option>
            <option value="TEXT">Text</option>
          </select>
        </label>
        <label className={styles.fullField}>
          <span>Address</span>
          <input autoComplete="street-address" name="address" onChange={(event) => updateCustomerField("address", event.target.value)} placeholder="Street, city, state" value={customerFields.address} />
        </label>
      </div>

      {mode === "prospect" ? (
        <section className={styles.prospectFields} aria-label="Prospect details">
          <h3>Prospect details</h3>
          <div className={styles.intakeFields}>
            <label>
              <span>Vehicle interest</span>
              <input name="vehicleInterest" placeholder="2021 Toyota RAV4, SUV, financing..." />
            </label>
            <label>
              <span>Timeline</span>
              <input name="desiredTimeline" placeholder="Today, this week, this month..." />
            </label>
            <label>
              <span>Budget</span>
              <input name="budget" placeholder="$350/month, under $18k..." />
            </label>
            <label>
              <span>Customer need</span>
              <input name="customerNeed" placeholder="Replace vehicle, first car, trade-in..." />
            </label>
            <label className={styles.fullField}>
              <span>Notes</span>
              <textarea name="notes" placeholder="Anything the next staff member should know" rows={3} />
            </label>
          </div>
        </section>
      ) : null}

      {state.kind !== "idle" ? (
        <div className={styles.intakeStatus} data-state={state.kind}>
          {state.kind === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{state.message}</span>
          {state.kind === "success" ? <a href={state.customerHref}>Open Customer 360</a> : null}
        </div>
      ) : null}

      <div className={styles.intakeFooter}>
        <button className={styles.primaryButton} disabled={state.kind === "saving"} type="submit">
          <UserPlus size={16} /> {state.kind === "saving" ? "Saving..." : submitLabel}
        </button>
        <a className={styles.secondaryButton} href="/crm-next">Cancel</a>
      </div>
    </form>
  );
}
