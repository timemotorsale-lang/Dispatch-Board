"use client";

import { ArrowRight, CheckCircle2, PackageCheck, Search, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { getPartsOperationsWorkspace } from "@/server/parts-operations/service";
import { BackToPartsWorkspace } from "./parts-return-link";

type Model = Awaited<ReturnType<typeof getPartsOperationsWorkspace>>;
type PurchaseOrder = Model["service"]["purchaseOrders"][number];
type Part = Model["waveOne"]["parts"][number];

type ReceiveLine = {
  condition: "GOOD" | "DAMAGED" | "WRONG_PART" | "MISSING_SHORT" | "EXTRA_OVER";
  damagedQuantity: string;
  partId: string;
  quantity: string;
  unitCost: string;
};

const receiveableStatuses = new Set(["ACKNOWLEDGED", "PARTIALLY_RECEIVED"]);

function dollars(cents: number) {
  return (cents / 100).toFixed(2);
}

function linePartId(line: unknown) {
  return line && typeof line === "object" && "partId" in line && typeof line.partId === "string" ? line.partId : "";
}

function lineQuantity(line: unknown) {
  return line && typeof line === "object" && "quantity" in line && typeof line.quantity === "number" ? line.quantity : 1;
}

function lineUnitCost(line: unknown) {
  return line && typeof line === "object" && "unitCostCents" in line && typeof line.unitCostCents === "number" ? line.unitCostCents : 0;
}

function partLabel(parts: Part[], partId: string) {
  const part = parts.find((item) => item.id === partId);
  return part ? `${part.partNumber} - ${part.description}` : "Unknown part";
}

function firstReceiveableOrder(model: Model) {
  return model.service.purchaseOrders.find((order) => receiveableStatuses.has(order.status)) ?? model.service.purchaseOrders[0] ?? null;
}

function buildLines(order: PurchaseOrder | null): ReceiveLine[] {
  const lines = Array.isArray(order?.lines) ? order.lines : [];
  return lines.length ? lines.map((line) => ({
    condition: "GOOD" as const,
    damagedQuantity: "0",
    partId: linePartId(line),
    quantity: String(lineQuantity(line)),
    unitCost: dollars(lineUnitCost(line))
  })) : [{ condition: "GOOD", damagedQuantity: "0", partId: "", quantity: "1", unitCost: "0.00" }];
}

async function request(path: string, body?: Record<string, unknown>) {
  const response = await fetch(path, body ? {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), ...body })
  } : undefined);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Request failed.");
  return result;
}

export function PartsReceivingWorkspace({ initial }: { initial: Model }) {
  const [model, setModel] = useState(initial);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(firstReceiveableOrder(initial)?.id ?? "");
  const selectedOrder = model.service.purchaseOrders.find((order) => order.id === selectedOrderId) ?? firstReceiveableOrder(model);
  const [lines, setLines] = useState<ReceiveLine[]>(() => buildLines(selectedOrder));
  const [packingSource, setPackingSource] = useState("");
  const [invoiceReference, setInvoiceReference] = useState("");
  const [stockLocationId, setStockLocationId] = useState(model.waveOne.stockLocations[0]?.id ?? "");
  const [placement, setPlacement] = useState("RO_BIN");

  const partsById = useMemo(() => new Map(model.waveOne.parts.map((part) => [part.id, part])), [model.waveOne.parts]);
  const filteredOrders = model.service.purchaseOrders.filter((order) => {
    const haystack = `${order.purchaseOrderNumber} ${order.vendor.name} ${order.status} ${order.location.name}`.toLowerCase();
    return !query.trim() || haystack.includes(query.trim().toLowerCase());
  });
  const receiveableOrders = filteredOrders.filter((order) => receiveableStatuses.has(order.status));
  const selectedStockLocation = model.waveOne.stockLocations.find((item) => item.id === stockLocationId);
  const discrepancyCount = lines.filter((line) => line.condition !== "GOOD" || Number(line.damagedQuantity) > 0).length;
  const receivedCount = lines.reduce((sum, line) => sum + Math.max(0, Number(line.quantity) || 0), 0);
  const placementLabel = `${placement.replaceAll("_", " ")} / ${selectedStockLocation ? `${selectedStockLocation.code} - ${selectedStockLocation.name}` : "Choose exact bin"}`;

  async function refresh() {
    setModel(await request("/api/parts-operations"));
  }

  function selectOrder(order: PurchaseOrder) {
    setSelectedOrderId(order.id);
    setLines(buildLines(order));
    const locationStock = model.waveOne.stockLocations.find((item) => item.locationId === order.locationId);
    setStockLocationId(locationStock?.id ?? model.waveOne.stockLocations[0]?.id ?? "");
    setNotice("");
  }

  function setLine(index: number, patch: Partial<ReceiveLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  async function submit() {
    if (!selectedOrder) {
      setNotice("Select a purchase order before receiving parts.");
      return;
    }
    if (!stockLocationId) {
      setNotice("Choose where the received parts were placed.");
      return;
    }
    if (!packingSource.trim()) {
      setNotice("Enter the packing slip, box label, or delivery reference.");
      return;
    }
    const validLines = lines.filter((line) => line.partId && Number(line.quantity) >= 0);
    if (!validLines.length) {
      setNotice("Confirm at least one received line.");
      return;
    }

    setBusy(true);
    setNotice("");
    try {
      await request("/api/service-close-parts", {
        action: "RECEIVE_PURCHASE_ORDER",
        invoiceReference: invoiceReference.trim() || null,
        lines: validLines.map((line) => ({
          damagedQuantity: line.condition === "DAMAGED" ? Math.max(Number(line.damagedQuantity) || 0, 1) : Number(line.damagedQuantity) || 0,
          partId: line.partId,
          quantity: Number(line.quantity) || 0,
          unitCostCents: Math.round((Number(line.unitCost) || 0) * 100)
        })),
        packingSource: packingSource.trim(),
        reason: `Front-desk receiving completed. Placement: ${placement}. ${discrepancyCount ? `${discrepancyCount} discrepancy candidate(s) captured.` : "All visible lines marked good."}`,
        receivedAt: new Date().toISOString(),
        stockLocationId,
        subjectId: selectedOrder.id
      });
      await refresh();
      setNotice(`Receiving completed. ${receivedCount} item(s) recorded${discrepancyCount ? ` with ${discrepancyCount} issue(s) routed for review` : ""}.`);
      setPackingSource("");
      setInvoiceReference("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Receiving failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="parts-receiving">
      <header className="parts-receiving-hero">
        <BackToPartsWorkspace />
        <div>
          <p>Parts Workspace</p>
          <h1>Receive Parts</h1>
          <span>Confirm what arrived and where it was placed. The system handles discrepancies, custody, and readiness behind the scenes.</span>
        </div>
      </header>

      {notice ? <div className={/failed|required|choose|select|enter|not enabled|must|cannot/i.test(notice) ? "notice notice-danger" : "notice notice-success"}><p>{notice}</p></div> : null}

      <div className="parts-receiving-layout">
        <section className="parts-receiving-main">
          <article className="parts-receiving-step">
            <header><b>1</b><div><strong>Find the delivery</strong><span>Use the purchase order number from the packing slip, invoice, vendor label, or delivery paperwork.</span></div></header>
            <label className="parts-receiving-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search purchase order #, vendor, part, repair order, or vehicle..." /></label>
            <p className="parts-receiving-help">Front desk tip: the purchase order number is usually printed on the vendor packing slip, invoice, box label, or delivery ticket. If there is no number, search the vendor name.</p>
            <div className="parts-receiving-orders">
              {receiveableOrders.map((order) => (
                <button className={order.id === selectedOrder?.id ? "selected" : ""} key={order.id} onClick={() => selectOrder(order)} type="button">
                  <span><strong>{order.purchaseOrderNumber}</strong><small>{order.vendor.name} - {order.status.replaceAll("_", " ")}</small></span>
                  <ArrowRight />
                </button>
              ))}
              {!receiveableOrders.length ? <p>No ready-to-receive purchase orders match this search.</p> : null}
            </div>
          </article>

          <article className="parts-receiving-step">
            <header><b>2</b><div><strong>Confirm what arrived</strong><span>Quantity, condition, and cost. The system creates issues automatically when something does not match.</span></div></header>
            <div className="parts-receiving-lines">
              {lines.map((line, index) => (
                <div className="parts-receiving-line" key={`${line.partId}-${index}`}>
                  <label><span>Part</span><select value={line.partId} onChange={(event) => setLine(index, { partId: event.target.value })}>{model.waveOne.parts.map((part) => <option key={part.id} value={part.id}>{part.partNumber} - {part.description}</option>)}</select></label>
                  <label><span>Received</span><input min="0" type="number" value={line.quantity} onChange={(event) => setLine(index, { quantity: event.target.value })} /></label>
                  <label><span>Condition</span><select value={line.condition} onChange={(event) => setLine(index, { condition: event.target.value as ReceiveLine["condition"] })}><option value="GOOD">Good</option><option value="DAMAGED">Damaged</option><option value="WRONG_PART">Wrong part</option><option value="MISSING_SHORT">Missing / short</option><option value="EXTRA_OVER">Extra / overage</option></select></label>
                  <label><span>Unit cost</span><input min="0" step=".01" type="number" value={line.unitCost} onChange={(event) => setLine(index, { unitCost: event.target.value })} /></label>
                  {line.condition === "DAMAGED" ? <label><span>Damaged qty</span><input min="0" type="number" value={line.damagedQuantity} onChange={(event) => setLine(index, { damagedQuantity: event.target.value })} /></label> : null}
                  <small>{partsById.get(line.partId)?.partNumber ? "Canonical part selected" : partLabel(model.waveOne.parts, line.partId)}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="parts-receiving-step">
            <header><b>3</b><div><strong>Print or apply the RO bin/location label</strong><span>This is the control that prevents parts from disappearing after delivery.</span></div></header>
            <div className="parts-receiving-placement">
              {[
                ["RO_BIN", "RO bin"],
                ["PARTS_COUNTER", "Parts counter"],
                ["RETURN_AREA", "Return area"],
                ["QUARANTINE", "Quarantine"],
                ["HANDED_TO_TECH", "Handed to tech"]
              ].map(([value, label]) => (
                <button className={placement === value ? "selected" : ""} key={value} onClick={() => setPlacement(value)} type="button">{label}</button>
              ))}
            </div>
            <label className="parts-receiving-field"><span>Exact stock location / RO bin</span><select value={stockLocationId} onChange={(event) => setStockLocationId(event.target.value)}>{model.waveOne.stockLocations.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}</select></label>
            <p className="parts-receiving-help">Label preview: {placementLabel}</p>
          </article>

          <article className="parts-receiving-step">
            <header><b>4</b><div><strong>Finish receiving</strong><span>The app posts the receipt, evaluates variance, and refreshes readiness.</span></div></header>
            <div className="parts-receiving-docs">
              <label><span>Packing slip / box label</span><input value={packingSource} onChange={(event) => setPackingSource(event.target.value)} placeholder="Required: slip, delivery, scan, or box reference" /></label>
              <label><span>Invoice reference</span><input value={invoiceReference} onChange={(event) => setInvoiceReference(event.target.value)} placeholder="Optional" /></label>
            </div>
            <button className="parts-receiving-submit" disabled={busy} onClick={submit} type="button">
              <PackageCheck /> Complete Receiving
            </button>
          </article>
        </section>

        <aside className="parts-receiving-summary">
          <h2>Receiving summary</h2>
          <dl>
            <div><dt>Order number</dt><dd>{selectedOrder?.purchaseOrderNumber ?? "Select order"}</dd></div>
            <div><dt>Vendor</dt><dd>{selectedOrder?.vendor.name ?? "-"}</dd></div>
            <div><dt>Placed at</dt><dd>{selectedStockLocation ? `${selectedStockLocation.code} - ${selectedStockLocation.name}` : "Required"}</dd></div>
            <div><dt>Location label</dt><dd>{placementLabel}</dd></div>
            <div><dt>Received count</dt><dd>{receivedCount}</dd></div>
            <div><dt>Issue count</dt><dd>{discrepancyCount}</dd></div>
          </dl>
          <div className="parts-receiving-readiness">
            <p><CheckCircle2 /> Receipt will post to canonical parts records.</p>
            <p><ShieldCheck /> Wrong/short/damaged lines become receiving exceptions.</p>
            <p><Truck /> Location is recorded so parts are not lost after arrival.</p>
          </div>
          <Link href="/vehicles/parts-operations?view=receiving">Open advanced receiving details</Link>
        </aside>
      </div>
    </section>
  );
}
