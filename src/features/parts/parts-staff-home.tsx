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

type Model = Awaited<ReturnType<typeof getPartsOperationsWorkspace>>;

type ActionRow = {
  action: string;
  detail: string;
  href: string;
  id: string;
  label: string;
  meta: string;
  tone: "danger" | "warning" | "ready";
};

function dateLabel(value: string | Date | null | undefined) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function partsOperationsHref(view: string) {
  return `/vehicles/parts-operations?view=${encodeURIComponent(view)}`;
}

function isoDay(value: string | Date | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : null;
}

function isPast(value: string | Date) {
  return new Date(value).getTime() < Date.now();
}

export function PartsStaffHome({ model }: { model: Model }) {
  const openPurchaseOrders = model.service.purchaseOrders.filter((order) => !["CANCELLED", "CLOSED"].includes(order.status));
  const openDiscrepancies = model.service.discrepancies.filter((item) => item.status === "OPEN");
  const openRecoveries = model.service.recoveries.filter((item) => !["CREDITED", "WRITTEN_OFF"].includes(item.status));
  const todayKey = new Date().toISOString().slice(0, 10);
  const arrivingToday = model.service.offers.filter((offer) => isoDay(offer.estimatedArrivalAt) === todayKey).length;
  const unreservedDemands = model.service.demands.filter((demand) => demand.quantityReserved < demand.quantityRequired);
  const readyOrders = model.ledger.repairOrders.filter((order) => order.readinessEvaluations[0]?.ready).length;
  const readiness = model.ledger.repairOrders.length ? Math.round((readyOrders / model.ledger.repairOrders.length) * 100) : 0;
  const recoveryAtRisk = openRecoveries.reduce((sum, item) => sum + Math.max(0, item.expectedCreditCents - (item.actualCreditCents ?? 0)), 0);

  const actionQueue: ActionRow[] = [
    ...unreservedDemands.slice(0, 5).map((demand) => ({
      action: demand.quantityReserved ? "Complete reservation" : "Source / reserve part",
      detail: `${demand.part.partNumber} • ${demand.part.description}`,
      href: partsOperationsHref("demand"),
      id: `demand-${demand.id}`,
      label: demand.repairOrder.repairOrderNumber,
      meta: `${demand.quantityReserved}/${demand.quantityRequired} reserved • due ${dateLabel(demand.requiredAt)}`,
      tone: isPast(demand.requiredAt) ? "danger" as const : "warning" as const
    })),
    ...model.service.requisitions.filter((item) => !["CANCELLED", "ORDERED"].includes(item.status)).slice(0, 4).map((item) => ({
      action: item.selectedOffer ? "Review selected vendor" : "Compare sources",
      detail: `${item.demand.part.partNumber} • ${item.demand.part.description}`,
      href: partsOperationsHref("requisitions"),
      id: `requisition-${item.id}`,
      label: item.demand.repairOrder.repairOrderNumber,
      meta: item.selectedOffer ? item.selectedOffer.vendor.name : `Required ${dateLabel(item.requiredAt)}`,
      tone: isPast(item.requiredAt) ? "danger" as const : "warning" as const
    })),
    ...openPurchaseOrders.slice(0, 4).map((order) => ({
      action: order.status === "DRAFT" ? "Review order approval" : "Track purchase order",
      detail: `${order.purchaseOrderNumber} • ${order.vendor.name}`,
      href: partsOperationsHref("purchase-orders"),
      id: `po-${order.id}`,
      label: order.location.name,
      meta: `${order.status.replaceAll("_", " ")} • ${money(order.orderedTotalCents)}`,
      tone: order.status === "DRAFT" ? "danger" as const : "warning" as const
    })),
    ...openDiscrepancies.slice(0, 3).map((item) => ({
      action: "Resolve receiving exception",
      detail: item.type.replaceAll("_", " "),
      href: partsOperationsHref("receiving"),
      id: `discrepancy-${item.id}`,
      label: "Receipt discrepancy",
      meta: `Expected ${item.expectedQuantity} • received ${item.receivedQuantity}`,
      tone: "danger" as const
    })),
    ...openRecoveries.slice(0, 3).map((item) => ({
      action: "Review return / recovery",
      detail: `${item.part.partNumber} • ${item.type.replaceAll("_", " ")}`,
      href: partsOperationsHref("returns-recovery"),
      id: `recovery-${item.id}`,
      label: item.vendor?.name ?? "Vendor pending",
      meta: `${money(item.expectedCreditCents)} expected • due ${dateLabel(item.deadlineAt)}`,
      tone: isPast(item.deadlineAt) ? "danger" as const : "warning" as const
    }))
  ].slice(0, 8);

  const kpis = [
    { icon: Boxes, label: "Open Demand", value: model.service.demands.length, detail: "Repair-linked demand" },
    { icon: AlertTriangle, label: "Unreserved", value: unreservedDemands.length, detail: "Blocking or partial" },
    { icon: PackageCheck, label: "Readiness", value: `${readiness}%`, detail: "Repair orders ready" },
    { icon: ShoppingCart, label: "Open POs", value: openPurchaseOrders.length, detail: "Purchasing follow-up" },
    { icon: Truck, label: "Arriving Today", value: arrivingToday, detail: "Vendor ETA" },
    { icon: RotateCcw, label: "Recovery Risk", value: money(recoveryAtRisk), detail: "Expected credit" }
  ];

  return (
    <section className="parts-staff-home">
      <header className="parts-staff-hero">
        <div>
          <p>Parts Workspace</p>
          <h1>Start with parts that unblock work.</h1>
          <span>Demand, reservation, receiving, pickup, returns, and repair readiness without the full management console first.</span>
        </div>
        <nav aria-label="Parts staff primary actions">
          <Link className="primary" href={partsOperationsHref("demand")}><Boxes /> Demand Queue</Link>
          <Link href={partsOperationsHref("receiving")}><Truck /> Receiving</Link>
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

      <div className="parts-staff-grid">
        <section className="parts-staff-panel parts-staff-queue">
          <header>
            <div>
              <strong>Parts action queue</strong>
              <span>Work that can unblock technicians, advisors, and repair promises.</span>
            </div>
            <Link href={partsOperationsHref("overview")}>Open full operations</Link>
          </header>
          <div>
            {actionQueue.length ? actionQueue.map((item) => (
              <Link className={`parts-staff-row ${item.tone}`} href={item.href} key={item.id}>
                <PackageOpen />
                <span>
                  <strong>{item.action}</strong>
                  <small>{item.detail}</small>
                  <small>{item.label} • {item.meta}</small>
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
              <strong>Parts rules</strong>
              <span>Keep the records clean.</span>
            </div>
          </header>
          <p><strong>Demand</strong><span>Parts demand belongs to the repair order/job. Do not create a loose parts request when a repair order exists.</span></p>
          <p><strong>Reservation</strong><span>On-hand does not mean ready. A part is ready only when it is reserved/issued to the right demand.</span></p>
          <p><strong>Receiving</strong><span>Receipt, discrepancy, return, and recovery are separate evidence records.</span></p>
        </aside>
      </div>
    </section>
  );
}
