"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { ArrowRight, Building2, MapPin, Save, Truck, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Vendor = { id: string; name: string; vendorType: string; status: string };
type VendorEvent = { actorUser: { name: string }; occurredAt: string | Date; summary: string; toStatus: string };
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

const statuses = ["ESTIMATE_NEEDED", "APPROVAL_NEEDED", "SCHEDULED", "AT_VENDOR", "WAITING_PARTS", "SUPPLEMENT_NEEDED", "READY_FOR_PICKUP", "RETURNED", "QC_REQUIRED", "COMPLETED", "CANCELLED"];
const approvals = ["NEEDS_DOCUMENTATION", "PENDING", "APPROVED", "DECLINED", "NOT_REQUIRED"];
const format = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const money = (value: number | null) => value == null ? "Not recorded" : `$${(value / 100).toFixed(2)}`;
const local = (value?: string | Date | null) => { const date = value ? new Date(value) : new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); };
const cents = (value: string) => value.trim() ? Math.round(Number(value) * 100) : null;

function nextStatus(work: OutsideWork) {
  if (work.status === "READY_FOR_PICKUP") return "RETURNED";
  if (work.status === "RETURNED") return "QC_REQUIRED";
  if (work.status === "QC_REQUIRED") return "COMPLETED";
  if (work.status === "SUPPLEMENT_NEEDED") return "APPROVAL_NEEDED";
  if (["ESTIMATE_NEEDED", "APPROVAL_NEEDED", "SCHEDULED", "WAITING_PARTS"].includes(work.status)) return "AT_VENDOR";
  return work.status;
}

function actionLabel(work: OutsideWork) {
  if (work.status === "READY_FOR_PICKUP") return "Arrange pickup";
  if (work.status === "RETURNED") return "Start quality inspection";
  if (work.status === "QC_REQUIRED") return "Record quality outcome";
  if (work.status === "SUPPLEMENT_NEEDED") return "Review vendor supplement";
  if (work.status === "APPROVAL_NEEDED") return "Record approval decision";
  return "Record vendor update";
}

export function OutsideRepairWorkPanel({ repairOrderId, work }: { repairOrderId: string; work: OutsideWork | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState(work?.vendorId ?? "");
  const [vendorName, setVendorName] = useState(work?.vendorName ?? "");
  const [directFromSource, setDirectFromSource] = useState(work?.directFromSource ?? false);
  const [sentFrom, setSentFrom] = useState(work?.sentFrom ?? "Dealership");
  const [scope, setScope] = useState(work?.scope ?? "");
  const [status, setStatus] = useState(work ? nextStatus(work) : "AT_VENDOR");
  const [approvalStatus, setApprovalStatus] = useState(work?.approvalStatus ?? "NEEDS_DOCUMENTATION");
  const [estimateAmount, setEstimateAmount] = useState(work?.estimateAmountCents == null ? "" : String(work.estimateAmountCents / 100));
  const [approvedAmount, setApprovedAmount] = useState(work?.approvedAmountCents == null ? "" : String(work.approvedAmountCents / 100));
  const [supplementAmount, setSupplementAmount] = useState(work?.supplementalAmountCents == null ? "" : String(work.supplementalAmountCents / 100));
  const [sentAt, setSentAt] = useState(() => local(work?.sentAt));
  const [expectedReturnAt, setExpectedReturnAt] = useState(() => local(work?.expectedReturnAt ?? new Date(Date.now() + 86400000)));
  const [nextFollowUpAt, setNextFollowUpAt] = useState(() => local(work?.nextFollowUpAt ?? new Date(Date.now() + 4 * 3600000)));
  const [transportMethod, setTransportMethod] = useState(work?.transportMethod ?? "Tow / carrier");
  const [keysCustodian, setKeysCustodian] = useState(work?.keysCustodian ?? "Vendor");
  const [summary, setSummary] = useState(work?.lastUpdateSummary ?? "Vehicle sent for outside repair work.");
  const [nextAction, setNextAction] = useState(work?.nextAction ?? "Confirm vendor estimate, approval, and expected return.");
  const [customerSummary, setCustomerSummary] = useState(work ? `The vehicle remains with ${work.vendorName} for outside repair work. We are monitoring progress and the expected return.` : "The vehicle is with an outside repair facility. We are monitoring the work and expected return.");
  const [internalNotes, setInternalNotes] = useState("");

  useEffect(() => { if (!open) return; fetch("/api/repair-vendors").then((response) => response.ok ? response.json() : []).then((rows) => setVendors(Array.isArray(rows) ? rows : [])).catch(() => setVendors([])); }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setMessage(null);
    startTransition(async () => {
      try {
        let selectedVendorId = vendorId || null;
        let selectedVendorName = vendorName.trim();
        if (vendorId) selectedVendorName = vendors.find((vendor) => vendor.id === vendorId)?.name ?? selectedVendorName;
        if (!selectedVendorName) throw new Error("Select an outside vendor or enter a new vendor name.");
        if (!work && !selectedVendorId) {
          const vendorResponse = await fetch("/api/repair-vendors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: selectedVendorName, vendorType: "BODY_SHOP", defaultLeadDays: 1, idempotencyKey: crypto.randomUUID(), reason: "Add outside repair vendor from the advisor recovery workflow." }) });
          const vendorPayload = await vendorResponse.json().catch(() => ({}));
          if (!vendorResponse.ok) throw new Error(vendorPayload.error ?? "Outside vendor could not be saved.");
          selectedVendorId = vendorPayload.result?.id ?? null;
        }
        const body = work ? {
          action: "UPDATE", vendorWorkId: work.id, status, approvalStatus, estimateAmountCents: cents(estimateAmount), approvedAmountCents: cents(approvedAmount), supplementalAmountCents: cents(supplementAmount), expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt).toISOString() : null, nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : null, lastUpdateSummary: summary, nextAction, customerVisibleSummary: customerSummary, internalNotes, evidence: [], occurredAt: new Date().toISOString(), idempotencyKey: crypto.randomUUID(), reason: "Record accountable outside repair progress."
        } : {
          action: "CREATE", vendorId: selectedVendorId, vendorName: selectedVendorName, workType: "BODY_SHOP", scope, status, approvalStatus, estimateAmountCents: cents(estimateAmount), approvedAmountCents: cents(approvedAmount), supplementalAmountCents: cents(supplementAmount), sentAt: new Date(sentAt).toISOString(), sentFrom, directFromSource, currentLocation: selectedVendorName, expectedReturnAt: expectedReturnAt ? new Date(expectedReturnAt).toISOString() : null, transportMethod, keysCustodian, lastUpdateSummary: summary, nextAction, nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : null, customerVisibleSummary: customerSummary, internalNotes, evidence: [], occurredAt: new Date().toISOString(), idempotencyKey: crypto.randomUUID(), reason: directFromSource ? "Record direct source-to-vendor outside repair dispatch." : "Record outside repair dispatch."
        };
        const response = await fetch(`/api/repair-orders/${encodeURIComponent(repairOrderId)}/vendor-work`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "Outside repair progress could not be saved.");
        setMessage(work ? "Vendor progress recorded." : "Outside repair work added to this repair order."); setOpen(false); router.refresh();
      } catch (failure) { setError(failure instanceof Error ? failure.message : "Outside repair progress could not be saved."); }
    });
  }

  if (!work && !open) return <button className="advisor-vendor-recovery" onClick={() => setOpen(true)} type="button"><Truck /> Vehicle already outside—or still at auction? <strong>Record outside work</strong></button>;

  return <section className={`advisor-vendor-work ${work ? "active" : "creating"}`}>
    {work ? <>
      <header><Building2 /><div><small>Outside repair</small><strong>{work.vendorName}</strong><span>{format(work.workType)} · {format(work.status)}</span></div><b>{work.directFromSource ? `Direct from ${work.sentFrom}` : `From ${work.sentFrom}`}</b></header>
      <div className="advisor-vendor-facts"><span><MapPin /><small>Current location</small><strong>{work.currentLocation}</strong></span><span><small>Expected return</small><strong>{work.expectedReturnAt ? new Date(work.expectedReturnAt).toLocaleString() : "Not confirmed"}</strong></span><span><small>Approval</small><strong>{format(work.approvalStatus)}</strong></span><span><small>Approved amount</small><strong>{money(work.approvedAmountCents)}</strong></span></div>
      <p>{work.lastUpdateSummary}</p><small>Next: {work.nextAction}</small>
      <button className="advisor-repair-primary" onClick={() => setOpen(true)} type="button">{actionLabel(work)} <ArrowRight /></button>
      {work.events.length ? <details className="advisor-vendor-history"><summary>Vendor progress history <span>{work.events.length}</span></summary><div>{work.events.slice(0, 8).map((event, index) => <article key={`${event.occurredAt}-${index}`}><i /><span><strong>{format(event.toStatus)}</strong><small>{event.summary}</small><em>{event.actorUser.name} · {new Date(event.occurredAt).toLocaleString()}</em></span></article>)}</div></details> : null}
    </> : null}
    {open ? <form onSubmit={submit}>
      <header><div><strong>{work ? actionLabel(work) : "Send or record outside work"}</strong><small>{work ? "Update the vendor fact once; the RO, inbox, custody, and timeline stay synchronized." : "Use this for dealership-to-vendor or auction/source-to-vendor work."}</small></div><button aria-label="Close outside work form" onClick={() => setOpen(false)} type="button"><X /></button></header>
      {!work ? <>
        <label className="wide"><span>Saved outside vendor</span><select value={vendorId} onChange={(event) => { setVendorId(event.target.value); const vendor = vendors.find((item) => item.id === event.target.value); if (vendor) setVendorName(vendor.name); }}><option value="">Add a new vendor below</option>{vendors.filter((vendor) => vendor.status === "ACTIVE").map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name} · {format(vendor.vendorType)}</option>)}</select></label>
        {!vendorId ? <label><span>New vendor name</span><input onChange={(event) => setVendorName(event.target.value)} placeholder="Diego Auto Body" required value={vendorName} /></label> : null}
        <label><span>Work type</span><select><option>Body shop</option><option>Mechanical sublet</option><option>Glass</option><option>Calibration</option><option>Detail</option><option>Other</option></select></label>
        <label className="wide direct-source"><input checked={directFromSource} onChange={(event) => { setDirectFromSource(event.target.checked); if (event.target.checked) setSentFrom("Auction"); }} type="checkbox" /><span><strong>Send directly from auction/source</strong><small>Do not falsely check the vehicle into dealership custody first.</small></span></label>
        <label><span>Sent from</span><input onChange={(event) => setSentFrom(event.target.value)} placeholder="Auction, transporter, dealership" value={sentFrom} /></label>
        <label><span>Dispatch time</span><input onChange={(event) => setSentAt(event.target.value)} type="datetime-local" value={sentAt} /></label>
        <label className="wide"><span>Approved/requested work</span><textarea onChange={(event) => setScope(event.target.value)} placeholder="Front-end body repair and airbag-related body work" required value={scope} /></label>
        <label><span>Transportation</span><input onChange={(event) => setTransportMethod(event.target.value)} value={transportMethod} /></label><label><span>Keys held by</span><input onChange={(event) => setKeysCustodian(event.target.value)} value={keysCustodian} /></label>
      </> : null}
      <label><span>Status</span><select onChange={(event) => setStatus(event.target.value)} value={status}>{statuses.map((item) => <option key={item} value={item}>{format(item)}</option>)}</select></label>
      <label><span>Approval documentation</span><select onChange={(event) => setApprovalStatus(event.target.value)} value={approvalStatus}>{approvals.map((item) => <option key={item} value={item}>{format(item)}</option>)}</select></label>
      <label><span>Vendor estimate</span><input inputMode="decimal" onChange={(event) => setEstimateAmount(event.target.value)} placeholder="$0.00" value={estimateAmount} /></label><label><span>Approved amount</span><input inputMode="decimal" onChange={(event) => setApprovedAmount(event.target.value)} placeholder="$0.00" value={approvedAmount} /></label>
      <label><span>Supplement</span><input inputMode="decimal" onChange={(event) => setSupplementAmount(event.target.value)} placeholder="$0.00" value={supplementAmount} /></label><label><span>Expected return</span><input onChange={(event) => setExpectedReturnAt(event.target.value)} type="datetime-local" value={expectedReturnAt} /></label>
      <label><span>Next follow-up</span><input onChange={(event) => setNextFollowUpAt(event.target.value)} type="datetime-local" value={nextFollowUpAt} /></label>
      <label className="wide"><span>Progress update</span><input onChange={(event) => setSummary(event.target.value)} required value={summary} /></label>
      <label className="wide"><span>Next action</span><input onChange={(event) => setNextAction(event.target.value)} required value={nextAction} /></label>
      <label className="wide"><span>Stakeholder-safe update</span><textarea onChange={(event) => setCustomerSummary(event.target.value)} required value={customerSummary} /></label>
      <label className="wide"><span>Private vendor/advisor notes</span><textarea onChange={(event) => setInternalNotes(event.target.value)} placeholder="Estimate reference, contact name, pickup instructions, or internal detail" value={internalNotes} /></label>
      {error ? <p className="advisor-response-error wide">{error}</p> : null}{message ? <p className="advisor-response-success wide">{message}</p> : null}
      <button className="advisor-repair-primary" disabled={pending} type="submit"><Save /> {pending ? "Saving..." : work ? "Save vendor update" : directFromSource ? "Send directly to vendor" : "Record outside work"}</button>
    </form> : null}
  </section>;
}
