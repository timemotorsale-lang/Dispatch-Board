"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DealWorkspaceSection } from "@/lib/deal-workspace-navigation";
import { normalizeVehicleUseCommand } from "@/lib/deal-continuity";
import { RENTAL_TIMEZONE, rentalCheckoutDefaults, rentalLocalTime, rentalTimeChoices, rentalTimeIso } from "@/lib/rental-checkout";
import { RENTAL_OPERATIONS_CHANGED, rentalOperationsSummary, type RentalBooking } from "@/lib/rental-operations";
import { validateRentalCoverage } from "@/lib/rental-lifecycle";
import { SALES_DOCUMENT_CHECKOUT_FINALIZED } from "@/lib/sales-document-pathways";
import { useDealDraft, useDealDraftState, useDealSaveState } from "./deal-draft-workspace";
import { finalizeCheckoutReview, RentalPacketChecklist, type CheckoutPacketReview } from "./rental-packet-checklist";
import styles from "./shared-deal-identities.module.css";

type RentalAction = "RESERVE" | "HANDOFF" | "RETURN" | "EXTEND" | "COMPLETE" | "CANCEL";
type Model = {
  agreements: { id: string; dealNumber: string }[];
  agreementHref: string | null;
  insuranceProofs?: Array<{ id: string; fileName: string }>;
  vehicleId: string | null;
  vehicleReadiness?: { eligible: boolean; detail: string; inventoryUnitId: string | null; noRepairsConfirmed?: boolean; review?: { vehicleId: string; inventoryUnitId: string; unitVersion: number; intakeRevisionId: string } | null } | null;
  bookings: RentalBooking[];
  packetClosed: boolean;
  settlementReceiptOnFile: boolean;
  canManageExceptions: boolean;
  draftStatus: string;
  source: { sourceDraftId: string; sourceJacketId: string } | null;
  events: { id: string; action: string; occurredAt: string }[];
};

const emptyFields = {
  startsAt: null as string | null, expectedReturnAt: null as string | null, occurredAt: "", reason: "", odometer: "", fuel: "", condition: "", recipient: "",
  evidence: "", keysVerified: false, driverVerified: false, physicalHandover: false, insuranceVerified: false,
  insuranceValidUntil: "", insuranceDocumentId: "", historicalHandoff: false, inspected: false, settlementReference: "", settlementException: false, noHandoffConfirmed: false
};
const emptyCheckoutDraft = {
  scope: "",
  hasDueBackOverride: false,
  fields: { expectedReturnAt: "", occurredAt: "", odometer: "", fuel: "", condition: "", recipient: "", insuranceValidUntil: "", insuranceDocumentId: "", reason: "", evidence: "" },
  occurrences: {} as Record<string, string>
};
const actionLabels: Record<RentalAction, string> = {
  RESERVE: "Reserve Vehicle", HANDOFF: "Prepare / Checkout", RETURN: "Record Return", EXTEND: "Extend",
  COMPLETE: "Complete Rental", CANCEL: "Cancel"
};

function selectedBooking(model: Model | null) {
  return rentalOperationsSummary(model?.bookings ?? []).booking;
}

function availableActions(model: Model | null, returnOnly: boolean): RentalAction[] {
  const summary = rentalOperationsSummary(model?.bookings ?? [], { cancelled: model?.draftStatus === "CANCELLED" });
  const inactive = ["CANCELLED", "ARCHIVED", "LOST"].includes(model?.draftStatus ?? "");
  if (inactive) return model?.canManageExceptions ? summary.actions.filter(action => action === "RETURN" || action === "COMPLETE") : [];
  if (returnOnly) return summary.booking ? summary.actions.filter(action => action !== "HANDOFF") : [];
  if (summary.stage === "DRAFT" && model?.vehicleId) return ["HANDOFF", "RESERVE", "CANCEL"];
  return summary.actions;
}

async function loadAssignment(id: string, signal?: AbortSignal): Promise<Model | null> {
  const response = await fetch(`/api/crm/v1/deal-continuity/${encodeURIComponent(id)}`, { cache: "no-store", signal });
  const result = await response.json();
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(result.error || "Unable to load the assignment.");
  return result as Model;
}

function RentalTimeField({ label, value, occurrence, onChange, onOccurrence, id, invalid, describedBy }: {
  label: string; value: string; occurrence: string; onChange: (value: string) => void; onOccurrence: (value: string) => void;
  id?: string; invalid?: boolean; describedBy?: string;
}) {
  const repeated = rentalTimeChoices(value).length > 1;
  return <>
    <label>{label}<input id={id} aria-invalid={invalid || undefined} aria-describedby={describedBy} type="datetime-local" value={value} onChange={event => {
      onChange(event.target.value);
      onOccurrence("");
    }} /></label>
    {repeated && <label>{label} repeated hour<select value={occurrence} onChange={event => onOccurrence(event.target.value)}>
      <option value="">Choose the actual occurrence</option><option value="first">First (CDT)</option><option value="second">Second (CST)</option>
    </select></label>}
  </>;
}

export function VehicleUseTool({ pathway, onNavigate, onPrepareCheckoutPacket, onHandoffSaved, returnOnly = false }: {
  pathway: string; returnOnly?: boolean; onNavigate?: (section: DealWorkspaceSection) => void; onPrepareCheckoutPacket?: () => void;
  onHandoffSaved?: (message: string) => void;
}) {
  const draft = useDealDraft(), saveState = useDealSaveState(), draftId = draft?.draftId();
  const [model, setModel] = useState<Model | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState<RentalAction | null>(null);
  const [intent, setIntent] = useState<{ id?: string; version?: number } | null>(null);
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [operationValues, setValues] = useState(emptyFields);
  const [operationOccurrences, setOccurrences] = useState<Record<string, string>>({});
  const [checkoutDraft, setCheckoutDraft] = useDealDraftState("rentalCheckoutDraft", emptyCheckoutDraft);
  const [checkoutSaveMessage, setCheckoutSaveMessage] = useState("");
  const [packetChecklist, setPacketChecklist] = useState(false);
  const [packetRefresh, setPacketRefresh] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const form = useRef<HTMLFormElement>(null);
  const handoffFeedback = useRef<HTMLDivElement>(null);
  const fieldId = useId();
  const coverageId = `${fieldId}-coverage`;
  const handoffId = `${fieldId}-handoff`;
  const feedbackId = `${fieldId}-activation-feedback`;
  const pending = useRef<{ signature: string; payload: Record<string, unknown> } | null>(null);
  const readSequence = useRef(0);
  const readinessRequest = useRef<{ key: string; operationKey: string } | null>(null);
  const [readinessConfirmation, setReadinessConfirmation] = useState("");
  const deepLinkConsumed = useRef(false);
  const booking = selectedBooking(model);
  const checkoutScope = model?.vehicleId ? JSON.stringify([pathway, model.vehicleId, booking?.id, booking?.version]) : "";
  const handoffForm = action === "HANDOFF" && Boolean(checkoutScope);
  const prepared = checkoutDraft.scope === checkoutScope ? checkoutDraft : emptyCheckoutDraft;
  const values = handoffForm ? { ...operationValues, ...prepared.fields } : operationValues;
  const occurrences = handoffForm ? prepared.occurrences : operationOccurrences;
  const agreementHref = model?.agreementHref;
  const loaner = pathway === "vehicle-loaner";
  const kind = loaner ? "Loaner" : "Rental";
  const isCancelled = cancelled || draft?.saleStatus === "CANCELLED" || model?.draftStatus === "CANCELLED";
  const actions = cancelled || draft?.saleStatus === "CANCELLED" && !model?.canManageExceptions ? [] : availableActions(model, returnOnly);

  useEffect(() => {
    if (!draftId) return;
    const controller = new AbortController();
    const reload = async () => {
      const sequence = ++readSequence.current;
      try {
        const result = await loadAssignment(draftId, controller.signal);
        if (controller.signal.aborted || sequence !== readSequence.current) return;
        const requested = new URLSearchParams(window.location.search).get("rentalAction") as RentalAction | null;
        const allowed = availableActions(result, returnOnly);
        if (!deepLinkConsumed.current && window.location.hash === "#rental-checkout") {
          const opened = selectedBooking(result);
          setIntent({ id: opened?.id, version: opened?.version });
          setAction(requested && allowed.includes(requested) ? requested : allowed[0] ?? null);
        }
        deepLinkConsumed.current = true;
        setModel(result);
        setLoaded(true);
      } catch (error) {
        if (!controller.signal.aborted && sequence === readSequence.current) setNotice(error instanceof Error ? error.message : "Unable to load the assignment.");
      }
    };
    void reload();
    const onFocus = () => { void reload(); };
    const onVisibility = () => { if (document.visibilityState === "visible") void reload(); };
    const packetChannel = agreementHref && typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(SALES_DOCUMENT_CHECKOUT_FINALIZED) : null;
    packetChannel?.addEventListener("message", (event: MessageEvent<unknown>) => {
      if (typeof event.data === "string" && agreementHref === `/sales-documents?jacketId=${encodeURIComponent(event.data)}`) void reload();
    });
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      controller.abort();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      packetChannel?.close();
    };
  }, [draftId, returnOnly, saveState.record?.revision, agreementHref]);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (action) form.current?.focus({ preventScroll: true });
  }, [action]);

  const defaults = rentalCheckoutDefaults(key => draft?.read(key), pathway);
  const pickupTime = values.startsAt ?? defaults.startsAt;
  const dueBackOverride = handoffForm && !prepared.hasDueBackOverride ? null : values.expectedReturnAt;
  const dueTime = dueBackOverride ?? (booking ? rentalLocalTime(booking.expectedReturnAt) : defaults.expectedReturnAt);
  let coverageIssue = "";
  if (handoffForm && dueTime && values.insuranceValidUntil) {
    try {
      const dueAt = new Date(rentalTimeIso(dueTime, occurrences.expectedReturnAt));
      validateRentalCoverage({ insuranceValidUntil: rentalTimeIso(values.insuranceValidUntil, occurrences.insuranceValidUntil) }, dueAt, dueAt);
    } catch (error) {
      coverageIssue = error instanceof Error ? error.message : "Check the coverage and due-back times.";
    }
  }
  function focusCheckoutField(id: string) {
    document.getElementById(id)?.focus();
  }
  const update = <Key extends keyof typeof emptyFields>(key: Key, value: typeof emptyFields[Key]) => {
    if (handoffForm && !retryAvailable) setNotice("");
    if (handoffForm && Object.hasOwn(emptyCheckoutDraft.fields, key)) {
      setCheckoutSaveMessage("");
      setCheckoutDraft(current => {
        const previous = current.scope === checkoutScope ? current : emptyCheckoutDraft;
        return { ...previous, scope: checkoutScope, hasDueBackOverride: key === "expectedReturnAt" || previous.hasDueBackOverride, fields: { ...previous.fields, [key]: value } };
      });
    } else {
      setValues(current => ({ ...current, [key]: value }));
    }
  };
  function updateOccurrence(key: string, value: string) {
    if (!handoffForm) {
      setOccurrences(current => ({ ...current, [key]: value }));
      return;
    }
    setCheckoutSaveMessage("");
    if (!retryAvailable) setNotice("");
    setCheckoutDraft(current => {
      const previous = current.scope === checkoutScope ? current : emptyCheckoutDraft;
      return { ...previous, scope: checkoutScope, occurrences: { ...previous.occurrences, [key]: value } };
    });
  }
  const label = (choice: RentalAction) => choice === "COMPLETE" ? `Complete ${kind}` : actionLabels[choice];
  const status = rentalOperationsSummary(model?.bookings ?? [], { pathway, cancelled: isCancelled, now: new Date(clock) }).status;
  const stale = Boolean(action && intent && (intent.id !== booking?.id || intent.version !== booking?.version));
  const checkoutTimes = action === "HANDOFF" ? rentalTimeChoices(values.occurredAt) : [];
  const occurrence = occurrences.occurredAt;
  const selectedCheckoutTime = occurrence ? checkoutTimes[occurrence === "second" ? 1 : 0] : undefined;
  const needsHistoricalHandoff = selectedCheckoutTime ? selectedCheckoutTime.getTime() < clock - 86400000
    : checkoutTimes.length > 0 && checkoutTimes.every(time => time.getTime() < clock - 86400000);
  const historicalHandoff = needsHistoricalHandoff && values.historicalHandoff;
  const checkoutBlockers = [
    !model?.vehicleId ? "Save the shared customer and vehicle before checkout."
      : model.vehicleReadiness?.eligible === false ? model.vehicleReadiness.inventoryUnitId
        ? `The vehicle is unavailable for checkout. ${model.vehicleReadiness.detail}.`
        : "This VIN is registered. Complete Inventory Intake before reviewing rental readiness."
        : "",
    model?.vehicleId && !model.agreements.length
      ? model.agreementHref ? "Review the checkout checklist before activating." : "Prepare and finalize the checkout packet before handing over the vehicle."
      : ""
  ].filter(Boolean);
  const checkoutBlocked = action === "HANDOFF" && checkoutBlockers.length > 0;
  const readinessReview = model?.vehicleReadiness?.review;
  const readinessKey = readinessReview ? JSON.stringify([draftId, readinessReview.vehicleId, readinessReview.inventoryUnitId, readinessReview.unitVersion, readinessReview.intakeRevisionId]) : "";
  const timeField = (key: "startsAt" | "expectedReturnAt" | "occurredAt" | "insuranceValidUntil", fieldLabel: string, value = values[key] ?? "") =>
    <RentalTimeField label={fieldLabel} value={value} occurrence={occurrences[key] ?? ""} onChange={value => update(key, value)} onOccurrence={value => updateOccurrence(key, value)}
      id={key === "insuranceValidUntil" ? coverageId : undefined} invalid={key === "insuranceValidUntil" && Boolean(coverageIssue)}
      describedBy={key === "insuranceValidUntil" && coverageIssue ? feedbackId : undefined} />;
  const displayTime = (value: string) => new Intl.DateTimeFormat("en-US", { timeZone: RENTAL_TIMEZONE, dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

  async function refresh() {
    if (!draftId) return;
    setBusy(true);
    try {
      const sequence = ++readSequence.current;
      const result = await loadAssignment(draftId);
      if (sequence !== readSequence.current) return;
      setModel(result);
      setLoaded(true);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load the assignment.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmReadiness() {
    if (!draftId || busy || !readinessReview || readinessConfirmation !== readinessKey) return;
    setBusy(true);
    setNotice("");
    try {
      if (saveState.dirty && !await draft?.save()) throw new Error(draft?.saveError() || "Save the deal before confirming readiness.");
      if (readinessRequest.current?.key !== readinessKey) readinessRequest.current = { key: readinessKey, operationKey: crypto.randomUUID() };
      const response = await fetch(`/api/crm/v1/deal-continuity/${encodeURIComponent(draftId)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONFIRM_RENTAL_READINESS", ...readinessReview, confirmed: true, operationKey: readinessRequest.current.operationKey })
      });
      if (!response.ok) throw new Error((await response.json()).error || "Rental readiness could not be saved.");
      const sequence = ++readSequence.current;
      const updated = await loadAssignment(draftId);
      if (sequence === readSequence.current) setModel(updated);
      setReadinessConfirmation("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Rental readiness could not be saved. Retry to recover the confirmation.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCheckoutDraft() {
    if (!draft || !handoffForm || busy) return;
    setBusy(true);
    setNotice("");
    setCheckoutSaveMessage("");
    try {
      if (await draft.save()) setCheckoutSaveMessage(`Checkout draft saved. Verify handoff when you activate the ${kind.toLowerCase()}.`);
      else setNotice(draft.saveError() || "The checkout draft could not be saved. Your entries are still here.");
    } finally {
      setBusy(false);
    }
  }

  async function save(retryPrevious = false, reviewedCheckout?: CheckoutPacketReview) {
    if (!action || busy || !retryPrevious && (stale || checkoutBlocked && !reviewedCheckout || retryAvailable && handoffForm)) return;
    if (handoffForm && !retryPrevious && (coverageIssue || !values.insuranceValidUntil || !values.physicalHandover)) {
      setNotice(coverageIssue || (!values.insuranceValidUntil ? "Enter the coverage end time shown on the accepted insurance proof." : "Confirm the physical handoff after the driver receives the vehicle and keys."));
      handoffFeedback.current?.focus();
      return;
    }
    setBusy(true);
    setNotice("");
    setRetryAvailable(false);
    let outcomeUnknown = false;
    try {
      const id = draft?.draftId();
      if (!id) throw new Error("Save the deal before recording this action.");
      if (!retryPrevious) {
        const custodyAction = action === "HANDOFF" || action === "RETURN";
        const payload = {
          ...values,
          historicalHandoff,
          reason: action === "HANDOFF" && !historicalHandoff ? "" : values.reason,
          insuranceDocumentId: reviewedCheckout?.insuranceId ?? ((model?.insuranceProofs?.length ?? 0) > 1 ? values.insuranceDocumentId : ""),
          action: action === "HANDOFF" && !intent?.id ? "ACTIVATE" : action,
          bookingId: intent?.id ?? "", expectedVersion: intent?.version,
          ...(action === "CANCEL" && !intent?.id ? { draftRevision: saveState.record?.revision } : {}),
          agreementJacketId: reviewedCheckout?.packet.id ?? model?.agreements[0]?.id ?? "",
          timezone: RENTAL_TIMEZONE,
          startsAt: action === "RESERVE" ? rentalTimeIso(pickupTime, occurrences.startsAt) : "",
          insuranceValidUntil: action === "HANDOFF" ? rentalTimeIso(values.insuranceValidUntil, occurrences.insuranceValidUntil) : "",
          expectedReturnAt: ["HANDOFF", "EXTEND", "RESERVE"].includes(action) ? rentalTimeIso(dueTime, occurrences.expectedReturnAt) : "",
          occurredAt: custodyAction ? rentalTimeIso(values.occurredAt, occurrences.occurredAt) : "",
          odometer: action === "HANDOFF" ? values.odometer || defaults.odometer : values.odometer,
          fuel: action === "HANDOFF" ? values.fuel || defaults.fuel : values.fuel,
          evidence: action === "RETURN" || historicalHandoff ? values.evidence.split("\n") : []
        };
        const signature = JSON.stringify({ id, ...payload });
        if (pending.current?.signature !== signature) pending.current = { signature, payload: { ...payload, operationKey: crypto.randomUUID() } };
      }
      if (!pending.current) return;
      const command = normalizeVehicleUseCommand(pending.current.payload);
      if (!retryPrevious && action === "HANDOFF") {
        if (needsHistoricalHandoff && !historicalHandoff) throw new Error("A manager must confirm checkout more than 24 hours ago using a dated handoff record.");
        if (!command.expectedReturnAt) throw new Error("Enter the due-back time.");
        if (command.expectedReturnAt <= command.occurredAt!) throw new Error("Due back must be after actual checkout.");
        validateRentalCoverage(pending.current.payload, command.occurredAt!, command.expectedReturnAt);
        if ((model?.insuranceProofs?.length ?? 0) > 1 && !pending.current.payload.insuranceDocumentId) throw new Error("Choose the accepted insurance proof you verified for this checkout.");
        if (!values.insuranceVerified) throw new Error("Confirm that the accepted insurance covers this driver and vehicle.");
        if (!values.physicalHandover) throw new Error("Confirm that the vehicle was actually handed over.");
      }
      if (!retryPrevious && (!saveState.saved || ["HANDOFF", "RESERVE"].includes(action) && saveState.dirty) && !await draft?.save()) throw new Error(draft?.saveError() || "Save the deal before recording this action.");
      if (reviewedCheckout) {
        if (action !== "HANDOFF" || !model?.vehicleReadiness?.eligible || model.agreementHref !== `/sales-documents?jacketId=${encodeURIComponent(reviewedCheckout.packet.id)}`) throw new Error("Refresh checkout and review the linked packet.");
        await finalizeCheckoutReview(reviewedCheckout);
      }
      outcomeUnknown = true;
      const response = await fetch(`/api/crm/v1/deal-continuity/${encodeURIComponent(id)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current.payload)
      });
      const result = await response.json();
      outcomeUnknown = response.status >= 500;
      if (!response.ok) throw new Error(result.error || "The action could not be saved.");
      pending.current = null;
      setIntent(null);
      setAction(null);
      setPacketChecklist(false);
      setValues(emptyFields);
      setOccurrences({});
      if (result.result.status === "CANCELLED") setCancelled(true);
      window.dispatchEvent(new CustomEvent(RENTAL_OPERATIONS_CHANGED, { detail: { draftId: id } }));
      if (action === "HANDOFF") onHandoffSaved?.(`${kind} activated. ${loaner ? "Loaner Active" : "Rented Out"}.`);
      try {
        const sequence = ++readSequence.current;
        const updated = await loadAssignment(id);
        if (sequence === readSequence.current) setModel(updated);
        setLoaded(true);
        setNotice(`Saved. ${result.result.lifecycle ?? label(action)}.`);
      } catch {
        setLoaded(false);
        setModel(null);
        setNotice("Action saved. Refresh checkout status to see the updated assignment.");
      }
    } catch (error) {
      if (outcomeUnknown) setRetryAvailable(true);
      if (reviewedCheckout && draftId) {
        setPacketRefresh(current => current + 1);
        const sequence = ++readSequence.current;
        void loadAssignment(draftId).then(updated => { if (sequence === readSequence.current) setModel(updated); }).catch(() => {});
      }
      const message = error instanceof Error ? error.message : "The request was interrupted.";
      setNotice(outcomeUnknown && action === "HANDOFF" ? `Retry the previous submission to check whether checkout was saved. ${message}` : message);
      if (action === "HANDOFF") handoffFeedback.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  const original = model?.source?.sourceJacketId
    ? `/sales-documents?jacketId=${encodeURIComponent(model.source.sourceJacketId)}`
    : model?.source?.sourceDraftId ? `/crm-next/deals/start?draftId=${encodeURIComponent(model.source.sourceDraftId)}` : null;
  const canShowActions = loaded || !draftId;
  const activationFeedback = handoffForm ? <div id={feedbackId} ref={handoffFeedback} tabIndex={-1} className={styles.activationFeedback}>
    {(coverageIssue || notice) ? <div role="alert">
      <strong>{retryAvailable ? "Checkout status unconfirmed" : `${kind} activation hasn’t been saved`}</strong>
      <p>{retryAvailable ? notice : coverageIssue || notice}</p>
    </div> : <p>{kind} activation is pending until you save the actual handoff.</p>}
    {(coverageIssue || !values.insuranceValidUntil) && <>
      {coverageIssue && <p>Use the end time on accepted proof that covers the full rental, or correct the due-back time if it was entered incorrectly.</p>}
      <button type="button" onClick={() => focusCheckoutField(coverageId)}>Review coverage end time</button>
      {coverageIssue && agreementHref && <a href={agreementHref} target="_blank" rel="noopener noreferrer">Open insurance paperwork</a>}
    </>}
    {!values.physicalHandover && !retryAvailable && <button type="button" onClick={() => focusCheckoutField(handoffId)}>Go to physical handoff</button>}
    {retryAvailable && <button type="button" disabled={busy} onClick={() => void save(true)}>Retry previous submission</button>}
  </div> : null;
  return <section id="rental-checkout" className={styles.useTool} aria-label={`${kind} checkout and return`}>
    <h2>{kind} checkout &amp; return</h2>
    <div className={styles.rentalHeading}><strong role="status">{loaded || !draftId || cancelled ? status : "Loading checkout status"}</strong></div>
    {!isCancelled && !booking?.checkedOutAt && model?.vehicleReadiness?.noRepairsConfirmed && <p role="status">Rental readiness confirmed for this deal.</p>}
    {!booking && Boolean(model?.agreements.length) && !isCancelled && <p>Checkout paperwork is ready. Confirm whether the vehicle was handed over before recording checkout.</p>}
    {booking && <p>
      Due back {displayTime(booking.expectedReturnAt)}
      {booking.checkedOutAt && ` · Checked out ${displayTime(booking.checkedOutAt)}`}
      {booking.returnedAt && ` · Returned ${displayTime(booking.returnedAt)}`}
      {" · Chicago time"}
    </p>}
    {!action && canShowActions && actions.includes("HANDOFF") && !model?.agreements.length && <>
      <p>{model ? "Finalize the signed checkout packet before handing over the vehicle." : "Save the shared customer and vehicle to load checkout requirements."}</p>
      {onNavigate && <div className={styles.rentalSteps}>
        <button type="button" onClick={() => onNavigate("identity")}>Customer &amp; vehicle</button>
        <button type="button" onClick={() => onNavigate("terms")}>Terms &amp; dates</button>
        <button type="button" onClick={() => onNavigate("documents")}>Signed agreement &amp; coverage</button>
      </div>}
    </>}
    <div className={styles.rentalHeading}>
      {canShowActions && actions.filter(choice => choice !== "CANCEL" || saveState.saved).map((choice, index) => <button key={choice} type="button" disabled={busy}
        className={index === 0 ? styles.rentalPrimary : undefined} aria-expanded={action === choice}
        onClick={() => { setIntent({ id: booking?.id, version: booking?.version }); setAction(choice); setValues(emptyFields); setOccurrences({}); setNotice(""); setRetryAvailable(false); }}>{label(choice)}</button>)}
      <button type="button" disabled={busy || !draftId} onClick={() => void refresh()}>Refresh checkout status</button>
    </div>
    {action && canShowActions && <form data-rental-operation noValidate ref={form} tabIndex={-1} aria-label={label(action)} onSubmit={event => { event.preventDefault(); void save(); }}>
      {stale && <p role="alert">The saved assignment changed. Review the updated status and dates before opening this action again.</p>}
      <fieldset disabled={busy} className={styles.fields}>
        <legend>{label(action)}</legend>
        {action === "RESERVE" && timeField("startsAt", "Scheduled pickup (Chicago)", pickupTime)}
        {["HANDOFF", "EXTEND", "RESERVE"].includes(action) && timeField("expectedReturnAt", "Due back (Chicago)", dueTime)}
        {(action === "HANDOFF" || action === "RETURN") && <>
          {timeField("occurredAt", action === "HANDOFF" ? "Actual checkout (Chicago)" : "Actual return (Chicago)")}
          <label>Odometer<input type="number" min="0" value={values.odometer || (action === "HANDOFF" ? defaults.odometer : "")} onChange={event => update("odometer", event.target.value)} /></label>
          <label>Fuel<input value={values.fuel || (action === "HANDOFF" ? defaults.fuel : "")} onChange={event => update("fuel", event.target.value)} /></label>
          <label>Condition<textarea value={values.condition} onChange={event => update("condition", event.target.value)} /></label>
          <label>{action === "HANDOFF" ? "Driver receiving the vehicle" : "Staff member receiving the vehicle"}<input value={values.recipient} onChange={event => update("recipient", event.target.value)} /></label>
          {(action === "RETURN" || historicalHandoff) && <label>{historicalHandoff ? "Dated handoff record" : "Return inspection record reference"}<textarea placeholder={historicalHandoff ? "Example: signed pickup record number and date" : "Example: return inspection report number"} value={values.evidence} onChange={event => update("evidence", event.target.value)} /></label>}
          <label><input type="checkbox" checked={values.keysVerified} onChange={event => update("keysVerified", event.target.checked)} />Keys verified</label>
        </>}
        {action === "HANDOFF" && <>
          {(model?.insuranceProofs?.length ?? 0) > 1 && <label>Insurance proof verified<select aria-label="Insurance proof verified" value={values.insuranceDocumentId} onChange={event => update("insuranceDocumentId", event.target.value)}>
            <option value="">Choose the proof you verified</option>
            {model?.insuranceProofs?.map(proof => <option key={proof.id} value={proof.id}>{proof.fileName}</option>)}
          </select></label>}
          {timeField("insuranceValidUntil", "Coverage ends (Chicago)")}
          <p>Use the end time on the accepted insurance proof. It must cover the full rental through the due-back time.</p>
          <label><input type="checkbox" checked={values.insuranceVerified} onChange={event => update("insuranceVerified", event.target.checked)} />Insurance verified for this customer and vehicle</label>
          <label><input type="checkbox" checked={values.driverVerified} onChange={event => update("driverVerified", event.target.checked)} />Driver verified</label>
          {needsHistoricalHandoff && (model?.canManageExceptions
            ? <label><input type="checkbox" checked={values.historicalHandoff} onChange={event => update("historicalHandoff", event.target.checked)} />Confirm checkout more than 24 hours ago from a dated record</label>
            : <p>Ask a manager to record checkout from more than 24 hours ago.</p>)}
        </>}
        {action === "COMPLETE" && <>
          {!model?.packetClosed && <p>Finalize the linked return packet first. {model?.agreementHref && <a href={model.agreementHref}>Open return paperwork</a>}</p>}
          {model?.packetClosed && !model.settlementReceiptOnFile && <p>The return packet needs a reviewed settlement or no-charge receipt, or a manager can authorize an exception.</p>}
          <label><input type="checkbox" checked={values.inspected} onChange={event => update("inspected", event.target.checked)} />Return inspection complete</label>
          {model?.canManageExceptions && <label><input type="checkbox" checked={values.settlementException} onChange={event => update("settlementException", event.target.checked)} />Authorize settlement exception</label>}
          {!values.settlementException && <label>Settlement or no-charge record reference<input value={values.settlementReference} onChange={event => update("settlementReference", event.target.value)} /></label>}
        </>}
        {action === "CANCEL" && <label><input type="checkbox" checked={values.noHandoffConfirmed} onChange={event => update("noHandoffConfirmed", event.target.checked)} />I confirmed the vehicle was never handed over</label>}
        {(action !== "HANDOFF" || historicalHandoff) && <label>{historicalHandoff ? "Why checkout is being recorded late" : values.settlementException ? "Exception reason" : "Reason"}<input required maxLength={500} value={values.reason} onChange={event => update("reason", event.target.value)} /></label>}
      </fieldset>
      {handoffForm && <fieldset disabled={busy} className={styles.checkoutChecklist}>
        <legend>Physical handoff</legend>
        <p>After the driver receives the vehicle and keys, confirm the handoff and save activation.</p>
        <label><input id={handoffId} type="checkbox" checked={values.physicalHandover} onChange={event => update("physicalHandover", event.target.checked)} />Vehicle physically handed over</label>
      </fieldset>}
      {checkoutBlocked && <div className={styles.checkoutBlocked}>
        <div role="status"><strong>Checkout pending</strong><ul>{checkoutBlockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul></div>
        {!model?.vehicleId && onNavigate && <button className={styles.rentalPrimary} type="button" onClick={() => onNavigate("identity")}>Review customer and vehicle</button>}
        {model?.vehicleId && model.vehicleReadiness?.eligible === false && !readinessReview && <p><a className={styles.rentalPrimary} target="_blank" rel="noopener noreferrer" href={model.vehicleReadiness.inventoryUnitId ? `/vehicles/inventory/units?inventoryUnitId=${encodeURIComponent(model.vehicleReadiness.inventoryUnitId)}` : `/prototype/inventory-intake?vehicleId=${encodeURIComponent(model.vehicleId)}`}>{model.vehicleReadiness.inventoryUnitId ? "Review vehicle in Inventory" : "Open Inventory Intake for this vehicle"}</a></p>}
        {model?.vehicleId && !model.agreements.length && (model.agreementHref
          ? <button type="button" className={styles.rentalPrimary} aria-expanded={packetChecklist} onClick={() => setPacketChecklist(current => !current)}>Review &amp; finalize checkout packet</button>
          : (onPrepareCheckoutPacket || onNavigate) && <button type="button" className={styles.rentalPrimary} onClick={onPrepareCheckoutPacket ?? (() => onNavigate?.("documents"))}>Prepare checkout packet</button>)}
      </div>}
      {action === "HANDOFF" && packetChecklist && model?.agreementHref && !model.agreements.length && <RentalPacketChecklist
        href={model.agreementHref} busy={busy} canActivate={Boolean(model.vehicleReadiness?.eligible) && !stale && !retryAvailable}
        onActivate={review => void save(false, review)} onClose={() => setPacketChecklist(false)} refreshKey={packetRefresh}
        activationFeedback={activationFeedback} activationFeedbackId={feedbackId}
      />}
      {(action === "HANDOFF" || action === "RESERVE") && readinessReview && <fieldset>
        <legend>Ready to rent without repairs</legend>
        <label><input type="checkbox" disabled={busy} checked={readinessConfirmation === readinessKey} onChange={event => setReadinessConfirmation(event.target.checked ? readinessKey : "")} />The vehicle is on site, safe to rent, and needs no repairs.</label>
        <button className={styles.rentalPrimary} type="button" disabled={busy || readinessConfirmation !== readinessKey} onClick={() => void confirmReadiness()}>Confirm ready to rent</button>
      </fieldset>}
      {notice && !handoffForm && <p role="alert">{notice}</p>}
      {(!packetChecklist || !checkoutBlocked) && activationFeedback}
      {!checkoutBlocked && <button type="submit" className={styles.rentalPrimary} aria-describedby={handoffForm ? feedbackId : undefined} disabled={busy || !actions.includes(action) || stale || handoffForm && retryAvailable || action === "COMPLETE" && (!model?.packetClosed || !model.settlementReceiptOnFile && !values.settlementException)}>
        {busy ? "Saving…" : action === "HANDOFF" ? `Activate ${kind}` : action === "EXTEND" ? "Save new due-back time" : action === "CANCEL" ? "Confirm cancellation" : label(action)}
      </button>}
      {handoffForm && <button type="button" disabled={busy || saveState.busy || stale} onClick={() => void saveCheckoutDraft()}>Save checkout draft</button>}
      {retryAvailable && !handoffForm && <button type="button" disabled={busy} onClick={() => void save(true)}>Retry previous submission</button>}
      <button type="button" disabled={busy} onClick={() => setAction(null)}>Close form</button>
      {handoffForm && checkoutSaveMessage && <p role="status">{checkoutSaveMessage}</p>}
    </form>}
    {notice && (!action || !canShowActions) && <p role="status">{notice}</p>}
    {original && <a href={original}>Open original deal or agreement</a>}
    {Boolean(model?.events.length) && <details><summary>Assignment history</summary>
      <ul>{model?.events.map(event => <li key={event.id}>{event.action} · {displayTime(event.occurredAt)}</li>)}</ul>
    </details>}
  </section>;
}
