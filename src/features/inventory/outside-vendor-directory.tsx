"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { ArrowRight, Building2, CheckCircle2, Clock3, FileText, Mail, MapPin, Phone, Plus, ReceiptText, Save, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type VendorWorkEvent = {
  actorUser?: { id: string; name: string } | null;
  approvalStatus: string;
  id: string;
  occurredAt: string;
  summary: string;
  toStatus: string;
  version: number;
};

type VendorWork = {
  approvalStatus: string;
  approvedAmountCents: number | null;
  currentLocation: string;
  estimateAmountCents: number | null;
  events?: VendorWorkEvent[];
  expectedReturnAt: string | null;
  id: string;
  lastUpdateSummary: string;
  nextAction: string;
  nextFollowUpAt: string | null;
  repairOrder: {
    customer: { displayName: string } | null;
    id: string;
    inventoryUnit: { inventoryNumber: string | null } | null;
    location: { name: string };
    operatingState: string;
    repairOrderNumber: string;
    stage: string;
    targetAt: string;
    vehicle: { make: string | null; model: string | null; vehicleNumber: string; vin: string | null; year: number | null };
  };
  returnedAt: string | null;
  scope: string;
  sentAt: string;
  status: string;
  supplementalAmountCents: number | null;
  vendorName: string;
  workType: string;
};

export type OutsideVendorRecord = {
  address: string | null;
  code: string;
  contactName: string | null;
  defaultLeadDays: number;
  email: string | null;
  id: string;
  name: string;
  notes: string | null;
  phoneNumber: string | null;
  status: string;
  vendorType: string;
  workAssignments?: VendorWork[];
};

const activeStatuses = new Set(["ESTIMATE_NEEDED", "APPROVAL_NEEDED", "SCHEDULED", "AT_VENDOR", "WAITING_PARTS", "SUPPLEMENT_NEEDED", "READY_FOR_PICKUP", "RETURN_TRANSPORT", "RETURNED", "QC_REQUIRED"]);
const billingReadyStatuses = new Set(["RETURNED", "QC_REQUIRED", "COMPLETED"]);
const qcIssueStatuses = new Set(["QC_REQUIRED", "AT_VENDOR"]);

const format = (value: string) => value.replaceAll("_", " ").toLocaleLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const money = (value: number | null | undefined) => value == null ? "Not recorded" : `$${(value / 100).toFixed(2)}`;
const date = (value: string | null | undefined) => value ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not recorded";
const vehicleLabel = (work: VendorWork) => [work.repairOrder.vehicle.year, work.repairOrder.vehicle.make, work.repairOrder.vehicle.model].filter(Boolean).join(" ") || work.repairOrder.vehicle.vehicleNumber;
const finalEstimateCents = (work: VendorWork) => (work.approvedAmountCents ?? work.estimateAmountCents ?? 0) + (work.supplementalAmountCents ?? 0);

function vendorStats(vendor: OutsideVendorRecord) {
  const works = vendor.workAssignments ?? [];
  const active = works.filter((work) => activeStatuses.has(work.status));
  const completed = works.filter((work) => work.status === "COMPLETED");
  const billingReady = works.filter((work) => billingReadyStatuses.has(work.status));
  const pendingApproval = works.filter((work) => ["PENDING", "NEEDS_DOCUMENTATION"].includes(work.approvalStatus));
  const qcIssues = works.filter((work) => work.status === "QC_REQUIRED" || /fail|incomplete|rework|not complete/i.test(`${work.lastUpdateSummary} ${work.nextAction}`));
  const openBalanceCents = billingReady.reduce((sum, work) => sum + finalEstimateCents(work), 0);
  const totalSpendCents = completed.reduce((sum, work) => sum + finalEstimateCents(work), 0);
  return { active, billingReady, completed, openBalanceCents, pendingApproval, qcIssues, totalSpendCents, works };
}

export function OutsideVendorDirectory({ vendors }: { vendors: OutsideVendorRecord[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState(vendors[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const selectedVendor = vendors.find((vendor) => vendor.id === selectedVendorId) ?? vendors[0] ?? null;
  const selectedStats = selectedVendor ? vendorStats(selectedVendor) : null;
  const workspaceStats = useMemo(() => vendors.reduce((result, vendor) => {
    const stats = vendorStats(vendor);
    result.active += stats.active.length;
    result.billingReady += stats.billingReady.length;
    result.openBalanceCents += stats.openBalanceCents;
    result.pendingApproval += stats.pendingApproval.length;
    return result;
  }, { active: 0, billingReady: 0, openBalanceCents: 0, pendingApproval: 0 }), [vendors]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const response = await fetch("/api/repair-vendors", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ address: form.get("address"), contactName: form.get("contactName"), defaultLeadDays: Number(form.get("defaultLeadDays") || 1), email: form.get("email"), name: form.get("name"), notes: form.get("notes"), phoneNumber: form.get("phoneNumber"), vendorType: form.get("vendorType"), idempotencyKey: crypto.randomUUID(), reason: "Add reusable outside repair vendor to Inventory resources." }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setError(payload.error ?? "Outside vendor could not be added."); return; }
      setMessage("Outside vendor added and available to Service Advisors.");
      setOpen(false);
      router.refresh();
    });
  }

  return <section className="outside-vendor-directory outside-vendor-workspace">
    <header>
      <div><small>Operations · Outside vendor workspace</small><h1>Outside Vendors</h1><p>One place for vendor profiles, active offsite work, billing readiness, invoice follow-up, QC outcomes, and repair-order drill-through.</p></div>
      <button onClick={() => setOpen(true)} type="button"><Plus /> Add outside vendor</button>
    </header>

    <section className="outside-vendor-guidance"><Building2 /><div><strong>Separate from Customers, connected to every RO</strong><span>Vendors are operational partners. Their profile stays here, while each vehicle and repair order keeps a linked vendor work record.</span></div></section>

    <section className="outside-vendor-kpis" aria-label="Outside vendor operating summary">
      <article><Wrench /><span>Active vendor jobs</span><strong>{workspaceStats.active}</strong><small>Offsite or waiting for vendor QC/return</small></article>
      <article><ShieldCheck /><span>Approval follow-up</span><strong>{workspaceStats.pendingApproval}</strong><small>Pending or needs documentation</small></article>
      <article><ReceiptText /><span>Billing ready</span><strong>{workspaceStats.billingReady}</strong><small>Returned, QC required, or completed</small></article>
      <article><FileText /><span>Open balance proxy</span><strong>{money(workspaceStats.openBalanceCents)}</strong><small>Recorded vendor amounts awaiting invoice/payment controls</small></article>
    </section>

    {open ? <form onSubmit={submit}><header><strong>Add outside vendor</strong><span>This vendor becomes reusable in Service Advisor and Shop &amp; Recon workflows.</span></header><label><span>Vendor name</span><input name="name" placeholder="Simba Collision" required /></label><label><span>Vendor type</span><select name="vendorType"><option value="BODY_SHOP">Body shop</option><option value="MECHANICAL_SUBLET">Mechanical sublet</option><option value="GLASS">Glass</option><option value="CALIBRATION">Calibration</option><option value="DETAIL">Detail</option><option value="TRANSPORT">Transport</option><option value="OTHER">Other</option></select></label><label><span>Default lead time</span><input min="0" name="defaultLeadDays" type="number" defaultValue="1" /></label><label><span>Contact name</span><input name="contactName" /></label><label><span>Phone</span><input name="phoneNumber" type="tel" /></label><label><span>Email</span><input name="email" type="email" /></label><label className="wide"><span>Address</span><input name="address" /></label><label className="wide"><span>Operating notes</span><textarea name="notes" placeholder="Pickup hours, towing instructions, preferred estimate method, billing contact, payment terms, or escalation contact" /></label>{error ? <p className="advisor-response-error wide">{error}</p> : null}<button disabled={pending} type="submit"><Save /> {pending ? "Saving..." : "Save outside vendor"}</button></form> : null}
    {message ? <p className="outside-vendor-message">{message}</p> : null}

    <div className="outside-vendor-ops-grid">
      <aside className="outside-vendor-list" aria-label="Outside vendor list">
        <header><strong>Vendor ledger</strong><span>{vendors.length} partner(s)</span></header>
        {vendors.length ? vendors.map((vendor) => {
          const stats = vendorStats(vendor);
          return <button aria-pressed={selectedVendor?.id === vendor.id} key={vendor.id} onClick={() => setSelectedVendorId(vendor.id)} type="button">
            <Building2 /><span><strong>{vendor.name}</strong><small>{vendor.code} · {format(vendor.vendorType)}</small></span><b>{stats.active.length}</b>
          </button>;
        }) : <div className="outside-vendor-empty"><Building2 /><strong>No outside vendors added yet</strong><span>Add Simba Collision or another partner once, then select it from any repair order.</span></div>}
      </aside>

      <main className="outside-vendor-detail">
        {selectedVendor && selectedStats ? <>
          <section className="outside-vendor-profile">
            <header><Building2 /><div><span>{selectedVendor.code} · {format(selectedVendor.vendorType)}</span><h2>{selectedVendor.name}</h2><p>{selectedVendor.notes ?? "No operating notes recorded yet."}</p></div><b>{format(selectedVendor.status)}</b></header>
            <dl><div><dt>Contact</dt><dd>{selectedVendor.contactName ?? "Not recorded"}</dd></div><div><dt>Lead time</dt><dd>{selectedVendor.defaultLeadDays} day(s)</dd></div><div><dt>Total completed spend</dt><dd>{money(selectedStats.totalSpendCents)}</dd></div><div><dt>Open billing proxy</dt><dd>{money(selectedStats.openBalanceCents)}</dd></div></dl>
            <div className="outside-vendor-contact">{selectedVendor.phoneNumber ? <a href={`tel:${selectedVendor.phoneNumber}`}><Phone /> {selectedVendor.phoneNumber}</a> : null}{selectedVendor.email ? <a href={`mailto:${selectedVendor.email}`}><Mail /> {selectedVendor.email}</a> : null}{selectedVendor.address ? <span><MapPin /> {selectedVendor.address}</span> : null}</div>
          </section>

          <section className="outside-vendor-billing-panel">
            <header><ReceiptText /><div><strong>Billing and invoice control</strong><span>Use this panel to know what to ask the vendor for before the accounting controls are added.</span></div></header>
            <div><span>Ask for invoice on</span><strong>{selectedStats.billingReady.length} job(s)</strong><small>{selectedStats.billingReady.length ? "Returned/completed vendor work has an amount that should be reconciled to an invoice." : "No returned vendor work is waiting for invoice follow-up."}</small></div>
            <div><span>Approval evidence</span><strong>{selectedStats.pendingApproval.length} pending</strong><small>Record who approved the vendor scope and amount before work continues.</small></div>
            <div><span>QC accountability</span><strong>{selectedStats.qcIssues.length} issue(s)</strong><small>Failed or incomplete vendor returns should drive internal completion work or vendor rework.</small></div>
          </section>

          <section className="outside-vendor-work-ledger">
            <header><strong>Vendor work ledger</strong><span>{selectedStats.works.length} repair-order record(s)</span></header>
            {selectedStats.works.length ? selectedStats.works.map((work) => {
              const latestEvent = work.events?.[0];
              return <article className={activeStatuses.has(work.status) ? "active" : ""} key={work.id}>
                <div><span>{format(work.status)} · {format(work.approvalStatus)}</span><strong>{vehicleLabel(work)}</strong><small>{work.repairOrder.repairOrderNumber} · {work.repairOrder.customer?.displayName ?? work.repairOrder.inventoryUnit?.inventoryNumber ?? "Inventory unit"}</small></div>
                <p>{work.scope}</p>
                <dl><div><dt>Estimate</dt><dd>{money(work.estimateAmountCents)}</dd></div><div><dt>Approved</dt><dd>{money(work.approvedAmountCents)}</dd></div><div><dt>Supplement</dt><dd>{money(work.supplementalAmountCents)}</dd></div><div><dt>Expected return</dt><dd>{date(work.expectedReturnAt)}</dd></div></dl>
                <section><Clock3 /><span><strong>{work.nextAction}</strong><small>{latestEvent ? `${latestEvent.summary} · ${date(latestEvent.occurredAt)}${latestEvent.actorUser?.name ? ` · ${latestEvent.actorUser.name}` : ""}` : work.lastUpdateSummary}</small></span></section>
                <footer><span>{qcIssueStatuses.has(work.status) ? "QC / completion decision needed" : activeStatuses.has(work.status) ? "Active vendor coordination" : "Closed vendor record"}</span><Link href={`/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(work.repairOrder.id)}&tab=repair`}>Open RO <ArrowRight /></Link></footer>
              </article>;
            }) : <div className="outside-vendor-empty"><CheckCircle2 /><strong>No work assigned yet</strong><span>Assign this vendor from a repair order when a vehicle leaves the dealership workflow.</span></div>}
          </section>
        </> : <section className="outside-vendor-profile"><header><Building2 /><div><span>Reusable partner setup</span><h2>Add your first outside vendor</h2><p>Once a vendor exists, this page becomes the billing, invoice, QC, and repair-order ledger for that partner.</p></div></header></section>}
      </main>
    </div>
  </section>;
}
