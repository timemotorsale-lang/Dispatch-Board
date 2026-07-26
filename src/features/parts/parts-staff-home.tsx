import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  PackageOpen,
  RotateCcw,
  ScanBarcode,
  ShoppingCart,
  Truck
} from "lucide-react";
import Link from "next/link";

import type { getPartsOperationsWorkspace } from "@/server/parts-operations/service";
import { buildPartsControlSnapshot } from "./parts-control-snapshot";

type Model = Awaited<ReturnType<typeof getPartsOperationsWorkspace>>;

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function partsOperationsHref(view: string) {
  return `/vehicles/parts-operations?view=${encodeURIComponent(view)}`;
}

export function PartsStaffHome({ model }: { model: Model }) {
  const control = buildPartsControlSnapshot(model);
  const readyOrders = model.ledger.repairOrders.filter((order) => order.readinessEvaluations[0]?.ready).length;
  const readiness = model.ledger.repairOrders.length ? Math.round((readyOrders / model.ledger.repairOrders.length) * 100) : 0;

  const kpis = [
    { icon: Boxes, label: "Open Demand", value: control.counts.openDemand, detail: "Repair-linked demand" },
    { icon: AlertTriangle, label: "Duplicate Risk", value: control.counts.duplicateRisk, detail: "Review before buying" },
    { icon: PackageCheck, label: "Readiness", value: `${readiness}%`, detail: "Repair orders ready" },
    { icon: ShoppingCart, label: "Late Risk", value: control.counts.lateOrderRisk, detail: "Vendor cutoff risk" },
    { icon: Truck, label: "Unverified Parts", value: control.counts.unverifiedPartReview, detail: "Bin/issue review" },
    { icon: RotateCcw, label: "Recovery Risk", value: money(control.counts.recoveryRiskCents), detail: "Expected credit" }
  ];

  const leakageCards = [
    { href: partsOperationsHref("demand"), label: "Duplicate risk", value: control.counts.duplicateRisk, detail: "Possible repeated demand/order before purchase" },
    { href: partsOperationsHref("demand"), label: "Late-order risk", value: control.counts.lateOrderRisk, detail: "Vendor ETA, cutoff, or target risk" },
    { href: "/vehicles/parts-receiving", label: "Receiving exceptions", value: control.leakageQueues.receivingExceptions.length, detail: "Wrong, damaged, short, over, or cost variance" },
    { href: "/vehicles/parts-receiving", label: "Unverified parts", value: control.counts.unverifiedPartReview, detail: "Received parts needing bin/issue verification" },
    { href: partsOperationsHref("returns-recovery"), label: "Returns & credits", value: control.leakageQueues.recoveryRisk.length, detail: "Open recovery cases until credit/disposition" }
  ];

  return (
    <section className="parts-staff-home">
      <header className="parts-staff-hero">
        <div>
          <p>Parts Workspace</p>
          <h1>Stop parts leakage before it delays work.</h1>
          <span>Duplicate protection, late-order risk, receiving, bin/location accountability, returns, and repair readiness without the full management console first.</span>
        </div>
        <nav aria-label="Parts staff primary actions">
          <Link className="primary" href={partsOperationsHref("demand")}><Boxes /> Demand Queue</Link>
          <Link href="/vehicles/parts-receiving"><Truck /> Receive Parts</Link>
          <Link href="/vehicles/parts-counter"><ScanBarcode /> Parts Counter</Link>
          <Link href="/my-tasks"><ClipboardList /> My Work</Link>
        </nav>
      </header>

      <section className="parts-staff-kpis" aria-label="Parts staff snapshot">
        {kpis.map(({ icon: Icon, label, value, detail }) => (
          <article key={label}>
            <Icon />
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>

      <section className="parts-control-strip" aria-label="Parts leakage controls">
        {leakageCards.map((item) => (
          <Link href={item.href} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </Link>
        ))}
      </section>

      <div className="parts-staff-grid">
        <section className="parts-staff-panel parts-staff-queue">
          <header>
            <div>
              <strong>Parts action queue</strong>
              <span>Algorithm-ranked work that can stop duplicate buying, late ordering, lost parts, and stalled repairs.</span>
            </div>
            <Link href={partsOperationsHref("overview")}>Open full operations</Link>
          </header>
          <div>
            {control.actionQueue.length ? control.actionQueue.map((item) => (
              <Link className={`parts-staff-row ${item.severity}`} href={item.href} key={item.id}>
                <PackageOpen />
                <span>
                  <strong>{item.action}</strong>
                  <small>{item.detail}</small>
                  <small>{item.label} - {item.meta}</small>
                </span>
                <ArrowRight />
              </Link>
            )) : (
              <p className="parts-staff-empty"><CheckCircle2 /> No parts actions need attention right now.</p>
            )}
          </div>
        </section>

        <aside className="parts-staff-panel parts-staff-rules">
          <header>
            <div>
              <strong>Returns & credits recovery</strong>
              <span>Recover money before deadlines are missed.</span>
            </div>
            <Link href={partsOperationsHref("returns-recovery")}>Open</Link>
          </header>
          {control.leakageQueues.recoveryRisk.length ? control.leakageQueues.recoveryRisk.slice(0, 3).map((item) => (
            <p key={item.id}><strong>{item.action}</strong><span>{item.detail} · {item.meta}</span></p>
          )) : <p><strong>No open recovery risk</strong><span>Core, warranty, and unused-part credit cases are currently clear.</span></p>}
          <header>
            <div>
              <strong>Unverified part review</strong>
              <span>Received parts must have a bin, issue, return, or quarantine outcome.</span>
            </div>
            <Link href="/vehicles/parts-receiving">Review</Link>
          </header>
          {control.leakageQueues.unverifiedPartReview.length ? control.leakageQueues.unverifiedPartReview.slice(0, 3).map((item) => (
            <p key={item.id}><strong>{item.label}</strong><span>{item.meta}</span></p>
          )) : <p><strong>No unverified received parts</strong><span>Everything received has a clean location/custody trail.</span></p>}
          <header>
            <div>
              <strong>Parts rules</strong>
              <span>Keep the records clean.</span>
            </div>
          </header>
          <p><strong>Demand first</strong><span>A part should not be ordered unless it has a repair-linked demand or approved stock reason.</span></p>
          <p><strong>Duplicate gate</strong><span>Before buying, check active demands, open POs, received/unissued parts, returns, and quarantine.</span></p>
          <p><strong>Location proof</strong><span>Received does not mean ready. Parts must be inspected, binned, issued, installed, returned, or escalated as unknown.</span></p>
        </aside>
      </div>
    </section>
  );
}
