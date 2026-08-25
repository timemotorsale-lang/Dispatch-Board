"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { ArrowRight, Building2, MapPin, Save, Truck, Wrench, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { vendorRapidReconAnswers, vendorRapidReconNextAction, vendorRapidReconTransitions } from "@/lib/vendor-rapid-recon";

type Vendor = { id: string; name: string; vendorType: string; status: string };
type VendorEvent = { actorUser: { name: string }; occurredAt: string | Date; summary: string; toStatus: string };
type OutsideWorkDraft = Partial<Pick<OutsideWork, "approvalStatus" | "currentLocation" | "lastUpdateSummary" | "nextAction" | "scope" | "status" | "vendorName" | "workType">> & {
  customerVisibleSummary?: string;
};
export type OutsideWork = {
  approvalStatus: string;
  approvedAmountCents: number | null;
  currentLocation: string;
  directFromSource: boolean;
  estimateAmountCents: number | null;
  events: VendorEvent[];
  expectedReturnAt: string | Date | null;
  id: string;
  keysCustodian: string;
  lastUpdateSummary: string;
  nextAction: string;
  nextFollowUpAt: string | Date | null;
  scope: string;
  sentAt: string | Date;
  sentFrom: string;
  status: string;
  supplementalAmountCents: number | null;
  transportMethod: string | null;
  vendorId: string | null;
  vendorName: string;
  workType: string;
};

const approvals = ["NEEDS_DOCUMENTATION", "PENDING", "APPROVED", "DECLINED", "NOT_REQUIRED"];
const workTypes = [
  { label: "Body shop", value: "BODY_SHOP" },
  { label: "Mechanical sublet", value: "MECHANICAL_SUBLET" },
  { label: "Glass", value: "GLASS" },
  { label: "Calibration", value: "CALIBRATION" },
  { label: "Detail", value: "DETAIL" },
  { label: "Other", value: "OTHER" }
];
const format = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const money = (value: number | null) => value == null ? "Not recorded" : `$${(value / 100).toFixed(2)}`;
const local = (value?: string | Date | null) => { const date = value ? new Date(value) : new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); };
const cents = (value: string) => value.trim() ? Math.round(Number(value) * 100) : null;
const dispatchBadge = (work: Pick<OutsideWork, "directFromSource" | "sentFrom" | "transportMethod">) =>
  work.directFromSource
    ? `Direct from ${work.sentFrom}`
    : work.transportMethod?.trim()
      ? `${work.transportMethod} from ${work.sentFrom}`
      : `From ${work.sentFrom}`;

function actionLabel(work: OutsideWork) {
  if (work.status === "READY_FOR_PICKUP") return "Arrange pickup";
  if (work.status === "RETURNED") return "Start quality inspection";
  if (work.status === "QC_REQUIRED") return "Record quality outcome";
  if (work.status === "SUPPLEMENT_NEEDED") return "Review vendor supplement";
  if (work.status === "APPROVAL_NEEDED") return "Record approval decision";
  return "Record vendor update";
}

export function OutsideRepairWorkPanel({
  accountableLocation,
  defaultOpen,
  draft,
  internalReconHref,
  onUseInternalRecon,
  repairOrderId,
  work
}: {
  accountableLocation?: string;
  defaultOpen?: boolean;
  draft?: OutsideWorkDraft;
  internalReconHref?: string;
  onUseInternalRecon?: () => void;
  repairOrderId: string;
  work: OutsideWork | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen ?? Boolean(draft));
  const [pending, startTransition] = useTransition();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState(work?.vendorId ?? "");
  const [vendorName, setVendorName] = useState(work?.vendorName ?? draft?.vendorName ?? "");
  const [workType, setWorkType] = useState(work?.workType ?? draft?.workType ?? "MECHANICAL_SUBLET");
  const [directFromSource, setDirectFromSource] = useState(work?.directFromSource ?? false);
  const [sentFrom, setSentFrom] = useState(work?.sentFrom ?? "Dealership");
  const [scope, setScope] = useState(work?.scope ?? draft?.scope ?? "");
  const [status, setStatus] = useState(work?.status ?? draft?.status ?? "AT_VENDOR");
  const [approvalStatus, setApprovalStatus] = useState(work?.approvalStatus ?? draft?.approvalStatus ?? "NEEDS_DOCUMENTATION");
  const [estimateAmount, setEstimateAmount] = useState(work?.estimateAmountCents == null ? "" : String(work.estimateAmountCents / 100));
  const [approvedAmount, setApprovedAmount] = useState(work?.approvedAmountCents == null ? "" : String(work.approvedAmountCents / 100));
  const [supplementAmount, setSupplementAmount] = useState(work?.supplementalAmountCents == null ? "" : String(work.supplementalAmountCents / 100));
  const [sentAt, setSentAt] = useState(() => local(work?.sentAt));
  const [expectedReturnAt, setExpectedReturnAt] = useState(() => local(work?.expectedReturnAt ?? new Date(Date.now() + 86400000)));
  const [nextFollowUpAt, setNextFollowUpAt] = useState(() => local(work?.nextFollowUpAt ?? new Date(Date.now() + 4 * 3600000)));
  const [transportMethod, setTransportMethod] = useState(work?.transportMethod ?? "Tow / carrier");
  const [keysCustodian, setKeysCustodian] = useState(work?.keysCustodian ?? "Vendor");
  const [summary, setSummary] = useState(work?.lastUpdateSummary ?? draft?.lastUpdateSummary ?? "Vehicle sent for outside repair work.");
  const [nextAction, setNextAction] = useState(work?.nextAction ?? draft?.nextAction ?? "Confirm vendor estimate, approval, and expected return.");
  const [customerSummary, setCustomerSummary] = useState(work ? `The vehicle remains with ${work.vendorName} for outside repair work. We are monitoring progress and the expected return.` : draft?.customerVisibleSummary ?? "The vehicle is with an outside repair facility. We are monitoring the work and expected return.");
  const [internalNotes, setInternalNotes] = useState("");
  const answers = work ? vendorRapidReconAnswers(work) : null;
  const transitions = work ? vendorRapidReconTransitions(work.status) : [];
  const canRecordDiagnosisOnly = work && !["RETURNED", "QC_REQUIRED", "COMPLETED", "CANCELLED"].includes(work.status);
  const canSwitchToInternalRecon = !work || !["RETURNED", "QC_REQUIRED", "COMPLETED", "CANCELLED"].includes(work.status);
  const nextStep = !work
    ? draft
      ? { action: "Choose the approved follow-up vendor, confirm the repair scope, then save this outside repair record.", title: "Document the next vendor repair" }
      : { action: "Select the vendor, record where the vehicle was sent from, and save the outside repair record.", title: "Record outside vendor work" }
    : canRecordDiagnosisOnly
      ? { action: "Record the verified vendor update. If the vendor diagnosed the issue but cannot complete repair, use the diagnosis-only action below.", title: "Update the initial vendor outcome" }
      : ["RETURNED", "QC_REQUIRED"].includes(work.status)
        ? { action: "Review the returned vehicle, preserve the vendor recommendation, then record the next approved repair path.", title: "Review returned vendor work" }
        : { action: "Record the latest vendor fact, keep the next action current, and save the update.", title: "Update vendor progress" };

  useEffect(() => {
    if (!open) return;
    fetch("/api/repair-vendors")
      .then((response) => response.ok ? response.json() : [])
      .then((rows) => setVendors(Array.isArray(rows) ? rows : []))
      .catch(() => setVendors([]));
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        let selectedVendorId = vendorId || null;
        let selectedVendorName = vendorName.trim();
        if (vendorId) selectedVendorName = vendors.find((vendor) => vendor.id === vendorId)?.name ?? selectedVendorName;
        if (!selectedVendorName) throw new Error("Select an outside vendor or enter a new vendor name.");
        if (!work && !selectedVendorId) {
          const vendorResponse = await fetch("/api/repair-vendors", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              name: selectedVendorName,
              vendorType: workType,
              defaultLeadDays: 1,
              idempotencyKey: crypto.randomUUID(),
              reason: "Add outside repair vendor from the advisor recovery workflow."
            })
          });
          const vendorPayload = await vendorResponse.json().catch(() => ({}));
          if (!vendorResponse.ok) throw new Error(vendorPayload.error ?? "Outside vendor could not be saved.");
          selectedVendorId = vendorPayload.result?.id ?? null;
        }
        const body = work ? {
          action: "UPDATE",
          vendorWorkId: work.id,
          status,
          approvalStatus,
          currentLocation: selectedVendorName,
          directFromSource,
          estimateAmountCents: cents(estimateAmount),
          approvedAmountCents: cents(approvedAmount),
          supplementalAmountCents: cents(supplementAmount),
          expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt).toISOString() : null,
          nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : null,
          lastUpdateSummary: summary,
          nextAction,
          customerVisibleSummary: customerSummary,
          internalNotes,
          keysCustodian,
          occurredAt: new Date().toISOString(),
          scope,
          sentFrom,
          transportMethod,
          evidence: [],
          idempotencyKey: crypto.randomUUID(),
          reason: "Correct or record accountable outside repair progress."
        } : {
          action: "CREATE",
          vendorId: selectedVendorId,
          vendorName: selectedVendorName,
          workType,
          scope,
          status,
          approvalStatus,
          estimateAmountCents: cents(estimateAmount),
          approvedAmountCents: cents(approvedAmount),
          supplementalAmountCents: cents(supplementAmount),
          sentAt: new Date(sentAt).toISOString(),
          sentFrom,
          directFromSource,
          currentLocation: selectedVendorName,
          expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt).toISOString() : null,
          transportMethod,
          keysCustodian,
          lastUpdateSummary: summary,
          nextAction,
          nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : null,
          customerVisibleSummary: customerSummary,
          internalNotes,
          evidence: [],
          occurredAt: new Date().toISOString(),
          idempotencyKey: crypto.randomUUID(),
          reason: directFromSource ? "Record direct source-to-vendor outside repair dispatch." : "Record outside repair dispatch."
        };
        const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/vendor-work`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "Outside repair progress could not be saved.");
        setMessage(work ? "Vendor progress recorded." : "Outside repair work added to this repair order.");
        setOpen(false);
        router.refresh();
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "Outside repair progress could not be saved.");
      }
    });
  }

  function switchToInternalRecon() {
    setError(null);
    setMessage(null);
    if (!work) {
      setOpen(false);
      setMessage("Outside vendor workflow closed. Continue this repair as internal recon.");
      onUseInternalRecon?.();
      return;
    }
    if (!canSwitchToInternalRecon) {
      setError("This outside repair record has already moved into return, QC, or completion. Use the current repair workbench stage to finish the handoff.");
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/vendor-work`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "UPDATE",
            approvalStatus: work.approvalStatus,
            approvedAmountCents: work.approvedAmountCents,
            currentLocation: accountableLocation?.trim() || "Dealership",
            customerVisibleSummary: "The vehicle is being repaired internally at the dealership.",
            directFromSource: false,
            estimateAmountCents: work.estimateAmountCents,
            evidence: [],
            expectedReturnAt: null,
            idempotencyKey: crypto.randomUUID(),
            internalNotes: "Corrected workflow: this vehicle is not at an outside vendor and repair will continue as internal recon.",
            keysCustodian: work.keysCustodian || "Dealership",
            lastUpdateSummary: "Corrected to internal recon.",
            nextAction: "Continue internal recon repair progress, track any pending parts, then move to Final QC when the work is complete.",
            nextFollowUpAt: null,
            occurredAt: new Date().toISOString(),
            reason: "Correct repair workflow from outside vendor to internal recon.",
            scope: work.scope,
            sentFrom: accountableLocation?.trim() || "Dealership",
            status: "CANCELLED",
            supplementalAmountCents: work.supplementalAmountCents,
            transportMethod: work.transportMethod,
            vendorWorkId: work.id,
          })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "Internal recon correction could not be saved.");
        setMessage("Outside vendor workflow cleared. This repair is now tracked as internal recon.");
        setOpen(false);
        onUseInternalRecon?.();
        router.refresh();
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : "Internal recon correction could not be saved.");
      }
    });
  }

  if (!work && !open) return <section className="advisor-vendor-work advisor-vendor-work-closed">
    <header>
      <Truck />
      <div>
        <small>Outside vendor next step</small>
        <strong>{nextStep.title}</strong>
        <span>{nextStep.action}</span>
      </div>
    </header>
    {message ? <p className="advisor-response-success">{message}</p> : null}
    <div className="advisor-vendor-choice-actions">
      <button className="advisor-repair-primary" onClick={() => setOpen(true)} type="button">Open vendor documentation form <ArrowRight /></button>
      {internalReconHref ? <a className="advisor-vendor-internal-link" href={internalReconHref}><Wrench /> Continue internal recon</a> : null}
    </div>
  </section>;

  return <section className={`advisor-vendor-work ${work ? "active" : "creating"}`}>
    <div className="advisor-vendor-next-step">
      <span>Staff next step</span>
      <strong>{nextStep.title}</strong>
      <p>{nextStep.action}</p>
    </div>
    {canSwitchToInternalRecon ? <div className="advisor-vendor-internal-switch">
      <Wrench />
      <div>
        <strong>This repair is internal recon?</strong>
        <span>Use this when the vehicle is staying with our team. It clears the outside-vendor path and keeps staff moving through internal repair, parts, completion, and Final QC.</span>
      </div>
      <button disabled={pending} onClick={switchToInternalRecon} type="button">
        {pending ? "Saving..." : "Switch to internal recon"}
      </button>
    </div> : null}
    {work ? <>
      <header>
        <Building2 />
        <div>
          <small>Outside repair</small>
          <strong>{work.vendorName}</strong>
          <span>{format(work.workType)} · {format(work.status)}</span>
        </div>
        <b>{dispatchBadge(work)}</b>
      </header>
      <div className="advisor-vendor-facts">
        <span><MapPin /><small>Current physical location</small><strong>{work.currentLocation}</strong></span>
        {accountableLocation ? <span><small>Home / accountable site</small><strong>{accountableLocation}</strong></span> : null}
        <span><small>Transportation</small><strong>{work.transportMethod?.trim() || "Not recorded"}</strong></span>
        <span><small>Expected return</small><strong>{work.expectedReturnAt ? new Date(work.expectedReturnAt).toLocaleString() : "Not confirmed"}</strong></span>
        <span><small>Approval</small><strong>{format(work.approvalStatus)}</strong></span>
        <span><small>Approved amount</small><strong>{money(work.approvedAmountCents)}</strong></span>
      </div>
      {answers ? <div className="advisor-vendor-rapid-recon" aria-label="Rapid recon outside repair answers">
        <header><strong>Rapid recon check</strong><span>Five gates · one next action</span></header>
        <ol>
          <li className={answers.received.startsWith("Yes") ? "done" : "current"}><small>1 · Receive</small><strong>Did the vendor receive it?</strong><span>{answers.received}</span></li>
          <li className={work.scope.trim() ? "done" : "current"}><small>2 · Repair plan</small><strong>What are they fixing?</strong><span>{answers.repairPlan}</span></li>
          <li className={work.status === "WAITING_PARTS" ? "blocked" : "done"}><small>3 · Parts</small><strong>Do they need parts?</strong><span>{answers.parts}</span></li>
          <li className={["READY_FOR_PICKUP", "RETURNED", "QC_REQUIRED", "COMPLETED"].includes(work.status) ? "done" : "current"}><small>4 · Return</small><strong>Are repairs complete?</strong><span>{answers.repaired} · {answers.transport}</span></li>
          <li className={work.status === "COMPLETED" ? "done" : ["RETURNED", "QC_REQUIRED"].includes(work.status) ? "current" : "upcoming"}><small>5 · QC &amp; handoff</small><strong>What happens next?</strong><span>{answers.qcAndHandoff}</span></li>
        </ol>
      </div> : null}
      <p>{work.lastUpdateSummary}</p>
      <small>Next: {work.nextAction}</small>
      {!open ? <button className="advisor-repair-primary" onClick={() => setOpen(true)} type="button">{actionLabel(work)} <ArrowRight /></button> : null}
      {work.events.length ? <details className="advisor-vendor-history"><summary>Vendor progress history <span>{work.events.length}</span></summary><div>{work.events.slice(0, 8).map((event, index) => <article key={`${event.occurredAt}-${index}`}><i /><span><strong>{format(event.toStatus)}</strong><small>{event.summary}</small><em>{event.actorUser.name} · {new Date(event.occurredAt).toLocaleString()}</em></span></article>)}</div></details> : null}
    </> : null}
    {open ? <form onSubmit={submit}>
      <header><div><strong>{work ? actionLabel(work) : "Send or record outside work"}</strong><small>{work ? "Update the vendor fact once; the RO, inbox, custody, and timeline stay synchronized." : "Use this for dealership-to-vendor or auction/source-to-vendor work."}</small></div><button aria-label="Close outside work form" onClick={() => setOpen(false)} type="button"><X /></button></header>
      {!work ? <>
        <label className="wide"><span>Saved outside vendor</span><select value={vendorId} onChange={(event) => { setVendorId(event.target.value); const vendor = vendors.find((item) => item.id === event.target.value); if (vendor) setVendorName(vendor.name); }}><option value="">Add a new vendor below</option>{vendors.filter((vendor) => vendor.status === "ACTIVE").map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name} · {format(vendor.vendorType)}</option>)}</select></label>
        {!vendorId ? <label><span>New vendor name</span><input onChange={(event) => setVendorName(event.target.value)} placeholder="Approved outside vendor" required value={vendorName} /></label> : null}
        <label><span>Work type</span><select onChange={(event) => setWorkType(event.target.value)} value={workType}>{workTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="wide direct-source"><input checked={directFromSource} onChange={(event) => { setDirectFromSource(event.target.checked); if (event.target.checked) setSentFrom("Auction"); }} type="checkbox" /><span><strong>Send directly from auction/source</strong><small>Do not falsely check the vehicle into dealership custody first.</small></span></label>
        <label><span>Sent from</span><input onChange={(event) => setSentFrom(event.target.value)} placeholder="Auction, transporter, dealership" value={sentFrom} /></label>
        <label><span>Dispatch time</span><input onChange={(event) => setSentAt(event.target.value)} type="datetime-local" value={sentAt} /></label>
        <label className="wide"><span>Approved/requested work</span><textarea onChange={(event) => setScope(event.target.value)} placeholder="Front-end body repair and airbag-related body work" required value={scope} /></label>
        <label><span>Transportation</span><input onChange={(event) => setTransportMethod(event.target.value)} value={transportMethod} /></label>
        <label><span>Keys held by</span><input onChange={(event) => setKeysCustodian(event.target.value)} value={keysCustodian} /></label>
      </> : <>
        <label className="wide direct-source"><input checked={directFromSource} onChange={(event) => { setDirectFromSource(event.target.checked); if (event.target.checked) setSentFrom("Auction"); }} type="checkbox" /><span><strong>Sent directly from auction/source</strong><small>Turn this off when the vehicle first came through the dealership before vendor dispatch.</small></span></label>
        <label><span>Sent from</span><input onChange={(event) => setSentFrom(event.target.value)} placeholder="Dealership, auction, transporter" value={sentFrom} /></label>
        <label><span>Transportation</span><input onChange={(event) => setTransportMethod(event.target.value)} placeholder="Dropped off / driven there" value={transportMethod} /></label>
        <label><span>Current location</span><input onChange={(event) => setVendorName(event.target.value)} placeholder="Vendor or dealership" value={vendorName} /></label>
        <label><span>Keys held by</span><input onChange={(event) => setKeysCustodian(event.target.value)} value={keysCustodian} /></label>
        <label className="wide"><span>Approved/requested work</span><textarea onChange={(event) => setScope(event.target.value)} placeholder="Outside body, mechanical, glass, or sublet scope" value={scope} /></label>
      </>}
      <label><span>{work ? "What happened?" : "Vendor receipt"}</span><select onChange={(event) => { const next = event.target.value; setStatus(next); setNextAction(vendorRapidReconNextAction(next)); }} value={status}>{work ? <option value={work.status}>Choose the next verified fact</option> : <option value="AT_VENDOR">Vendor received vehicle</option>}{transitions.map((item) => <option key={item.status} value={item.status}>{item.label}</option>)}</select></label>
      <label><span>Approval documentation</span><select onChange={(event) => setApprovalStatus(event.target.value)} value={approvalStatus}>{approvals.map((item) => <option key={item} value={item}>{format(item)}</option>)}</select></label>
      <label><span>Vendor estimate</span><input inputMode="decimal" onChange={(event) => setEstimateAmount(event.target.value)} placeholder="$0.00" value={estimateAmount} /></label>
      <label><span>Approved amount</span><input inputMode="decimal" onChange={(event) => setApprovedAmount(event.target.value)} placeholder="$0.00" value={approvedAmount} /></label>
      <label><span>Supplement</span><input inputMode="decimal" onChange={(event) => setSupplementAmount(event.target.value)} placeholder="$0.00" value={supplementAmount} /></label>
      <label><span>Expected return</span><input onChange={(event) => setExpectedReturnAt(event.target.value)} type="datetime-local" value={expectedReturnAt} /></label>
      <label><span>Next follow-up</span><input onChange={(event) => setNextFollowUpAt(event.target.value)} type="datetime-local" value={nextFollowUpAt} /></label>
      <label className="wide"><span>Verified vendor update</span><input onChange={(event) => setSummary(event.target.value)} required value={summary} /></label>
      <label className="wide"><span>One next action</span><input onChange={(event) => setNextAction(event.target.value)} required value={nextAction} /></label>
      <label className="wide"><span>Stakeholder-safe update</span><textarea onChange={(event) => setCustomerSummary(event.target.value)} required value={customerSummary} /></label>
      <label className="wide"><span>Private vendor/advisor notes</span><textarea onChange={(event) => setInternalNotes(event.target.value)} placeholder="Estimate reference, contact name, pickup instructions, or internal detail" value={internalNotes} /></label>
      {canRecordDiagnosisOnly ? <button className="advisor-vendor-secondary" disabled={pending} onClick={() => {
        setStatus("RETURNED");
        setSummary(`${work.vendorName} diagnosed the concern but could not complete the repair.`);
        setScope("Timing chain replacement recommended from outside vendor diagnosis.");
        setNextAction("Review the vendor diagnostic recommendation, approve the next repair path, and dispatch to the selected follow-up vendor.");
        setCustomerSummary(`The vehicle returned from ${work.vendorName}. The vendor diagnosed the concern and recommended timing chain replacement, but they could not complete the repair.`);
        setInternalNotes("Use the next outside-vendor record to document the approved vendor who completes the timing chain replacement.");
      }} type="button"><ArrowRight /> Diagnosed only — needs another vendor</button> : null}
      {error ? <p className="advisor-response-error wide">{error}</p> : null}
      {message ? <p className="advisor-response-success wide">{message}</p> : null}
      <button className="advisor-repair-primary" disabled={pending} type="submit"><Save /> {pending ? "Saving..." : work ? "Save vendor update" : directFromSource ? "Send directly to vendor" : "Record outside work"}</button>
    </form> : null}
  </section>;
}
