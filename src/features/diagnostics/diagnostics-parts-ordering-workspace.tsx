"use client";

import { Check, ClipboardList, Package, Plus, RotateCcw, ScanBarcode, ShoppingCart, Truck, Wrench } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import styles from "./diagnostics-parts-ordering-workspace.module.css";

type PartsDemandLine = {
  id: string;
  name: string;
  number: string;
  quantity: number;
  sourceLabel: string;
  totalLabel: string;
};

type OrderedPart = {
  cost: string;
  id: string;
  orderedDate: string;
  orderedPart: string;
  sourceCustom: string;
  source: string;
};

type ReturnPart = {
  id: string;
  partName: string;
  qty: string;
  reason: string;
  returnDate: string;
};

type UsedPart = {
  id: string;
  partName: string;
  qtyUsed: string;
  usedOnRepair: string;
  usedDate: string;
};

const defaultSourceOptions = ["NAPA", "O'Reilly", "Advance", "Dealer / OEM", "LKQ", "eBay", "Amazon", "Local stock", "Custom vendor"];
const returnReasonOptions = ["Wrong part", "Core return", "Over ordered", "Damaged", "No longer needed", "Warranty return"];

function normalizeCurrency(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function DiagnosticsPartsOrderingWorkspace({
  parts,
  repairOrderId,
  repairOrderNumber,
  returnLabel,
  returnTo,
  vehicleLabel,
}: {
  parts: PartsDemandLine[];
  repairOrderId?: string;
  repairOrderNumber?: string;
  returnLabel?: string;
  returnTo: string;
  vehicleLabel?: string;
}) {
  const totalQuantity = parts.reduce((sum, item) => sum + item.quantity, 0);
  const pendingPricing = parts.filter((item) => item.totalLabel === "Quote needed").length;
  const [sourceOptions, setSourceOptions] = useState<string[]>(defaultSourceOptions);
  const [newVendorName, setNewVendorName] = useState("");
  const [orderedParts, setOrderedParts] = useState<OrderedPart[]>(parts.map((part, index) => ({
    cost: part.totalLabel === "Quote needed" ? "" : part.totalLabel.replace("$", "").replaceAll(",", ""),
    id: `ordered-${index + 1}`,
    orderedDate: "",
    orderedPart: `${part.name} (${part.number})`,
    sourceCustom: "",
    source: part.sourceLabel.includes("catalog") ? "Local stock" : "",
  })));
  const [returnParts, setReturnParts] = useState<ReturnPart[]>([]);
  const [usedParts, setUsedParts] = useState<UsedPart[]>(parts.map((part, index) => ({
    id: `used-${index + 1}`,
    partName: `${part.name} (${part.number})`,
    qtyUsed: "",
    usedOnRepair: "",
    usedDate: "",
  })));

  const sourcedCount = orderedParts.filter((part) => {
    if (part.source === "Custom vendor") return part.sourceCustom.trim().length > 0;
    return part.source.trim().length > 0;
  }).length;
  const orderedCost = useMemo(() => orderedParts.reduce((sum, part) => {
    const amount = Number(part.cost);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0), [orderedParts]);
  const returnedCount = returnParts.reduce((sum, part) => sum + (Number(part.qty) || 0), 0);
  const usedCount = usedParts.reduce((sum, part) => sum + (Number(part.qtyUsed) || 0), 0);

  function updateOrderedPart(id: string, field: keyof Omit<OrderedPart, "id">, value: string) {
    setOrderedParts((current) => current.map((part) => part.id === id ? { ...part, [field]: value } : part));
  }

  function addOrderedPartRow() {
    setOrderedParts((current) => [...current, {
      cost: "",
      id: `ordered-${current.length + 1}`,
      orderedDate: "",
      orderedPart: "",
      sourceCustom: "",
      source: "",
    }]);
  }

  function addVendorOption() {
    const vendorName = newVendorName.trim();
    if (!vendorName) return;
    setSourceOptions((current) => current.includes(vendorName) ? current : [...current.slice(0, -1), vendorName, current[current.length - 1]]);
    setNewVendorName("");
  }

  function updateReturnPart(id: string, field: keyof Omit<ReturnPart, "id">, value: string) {
    setReturnParts((current) => current.map((part) => part.id === id ? { ...part, [field]: value } : part));
  }

  function addReturnRow() {
    setReturnParts((current) => [...current, {
      id: `return-${current.length + 1}`,
      partName: "",
      qty: "",
      reason: "",
      returnDate: "",
    }]);
  }

  function updateUsedPart(id: string, field: keyof Omit<UsedPart, "id">, value: string) {
    setUsedParts((current) => current.map((part) => part.id === id ? { ...part, [field]: value } : part));
  }

  function addUsedRow() {
    setUsedParts((current) => [...current, {
      id: `used-${current.length + 1}`,
      partName: "",
      qtyUsed: "",
      usedOnRepair: "",
      usedDate: "",
    }]);
  }

  return <section className={styles.workspace} aria-label="Diagnostics parts ordering workspace">
    <header className={styles.hero}>
      <div className={styles.heroMain}>
        <h1>Govern parts ordering, receiving, and returns in one worksheet.</h1>
        <p>Use the labor-guide demand as the source of truth, then record exactly what was ordered, from which vendor, on what date, at what cost, and what must be returned.</p>
      </div>
      <div className={styles.contextCard}>
        <strong>{repairOrderNumber ?? "RO context pending"}</strong>
        <small title={repairOrderId ? `${vehicleLabel ?? "Selected repair order"} · Linked: ${repairOrderId}` : (vehicleLabel ?? "Selected repair order")}>
          {repairOrderId ? `${vehicleLabel ?? "Selected repair order"} · Linked: ${repairOrderId}` : (vehicleLabel ?? "Selected repair order")}
        </small>
      </div>
    </header>

    <section className={styles.quickVendorBar} aria-label="Quick add vendor">
      <div className={styles.quickVendorText}>
        <strong>Add missing vendor</strong>
        <small>Add a new vendor here, then select it in the ordered-parts ledger below.</small>
      </div>
      <div className={styles.addVendorControls}>
        <input
          aria-label="New vendor name"
          className={styles.field}
          onChange={(event) => setNewVendorName(event.target.value)}
          placeholder="Enter missing vendor name"
          value={newVendorName}
        />
        <button className={styles.addRowButton} onClick={addVendorOption} type="button"><Plus size={15} />Add vendor</button>
      </div>
    </section>

    <section className={styles.kpis}>
      <article><Package /><span><strong>{parts.length}</strong><small>part lines</small></span></article>
      <article><ClipboardList /><span><strong>{totalQuantity}</strong><small>units requested</small></span></article>
      <article><ShoppingCart /><span><strong>{sourcedCount}</strong><small>sources logged</small></span></article>
      <article><Check /><span><strong>{normalizeCurrency(orderedCost.toFixed(2))}</strong><small>ordered cost</small></span></article>
    </section>

    <section className={styles.summaryStrip} aria-label="Demand summary strip">
      <div className={styles.summaryCard}>
        <header><Wrench size={17} /><div><span>Demand output</span><strong>Labor-guide parts needed now</strong></div></header>
        <div className={styles.partsList}>
          {parts.length ? parts.map((part) => <article key={part.id}><span><strong>{part.name}</strong><small>{part.number} · Qty {part.quantity} · {part.sourceLabel}</small></span><em>{part.totalLabel}</em></article>) : <p>No parts were supplied from the labor guide yet. Return and add labor or manual parts first.</p>}
        </div>
      </div>

      <div className={styles.summaryMetrics}>
        <article><span>Logged sources</span><strong>{sourcedCount}/{orderedParts.length || 0}</strong></article>
        <article><span>Quote needed</span><strong>{pendingPricing}</strong></article>
        <article><span>Ordered cost</span><strong>{normalizeCurrency(orderedCost.toFixed(2))}</strong></article>
        <article><span>Used qty</span><strong>{usedCount}</strong></article>
        <article><span>Parts return qty</span><strong>{returnedCount}</strong></article>
      </div>

      <div className={styles.commandRail}>
        <Link href={repairOrderId ? `/vehicles/repair-workbench?${new URLSearchParams({ repairOrderId, ...(returnLabel ? { returnLabel } : {}), returnTo }).toString()}` : returnTo}><Truck size={15} />Send estimate to repair workbench</Link>
        <Link href={returnTo}><ScanBarcode size={15} />{returnLabel ?? "Return and document parts demand"}</Link>
      </div>
    </section>

    <div className={styles.workflow}>
      <section className={styles.stepCard}>
        <header><span>Step 1</span><h2>Confirm exact parts demand</h2></header>
        <p>Make sure every needed part is tied to the repair scope before sourcing begins.</p>
        <ul>
          <li>Repair order and vehicle are confirmed</li>
          <li>Part name, number, and quantity are visible</li>
          <li>Need came from labor guide, manual part, or policy-required rule</li>
        </ul>
      </section>

      <section className={styles.ledgerCard}>
        <header className={styles.ledgerHeader}>
          <div>
            <span>Step 2</span>
            <h2>Record what was actually ordered</h2>
            <p>Use the full-width ordered-parts ledger to preserve detailed part names, vendor choice, ordered date, and cost.</p>
          </div>
          <div className={styles.ledgerActions}>
            <button className={styles.addRowButton} onClick={addOrderedPartRow} type="button"><Plus size={15} />Add ordered part</button>
          </div>
        </header>


        <div className={styles.ledgerTable}>
          <div className={styles.ledgerHead}>
            <div className={styles.gridHead}>Ordered part</div>
            <div className={styles.gridHead}>Vendor / source</div>
            <div className={styles.gridHead}>Ordered date</div>
            <div className={styles.gridHead}>Cost</div>
          </div>

          {orderedParts.map((part) => <div className={styles.ledgerRow} key={part.id}>
            <input
              aria-label={`Ordered part ${part.id}`}
              className={styles.field}
              onChange={(event) => updateOrderedPart(part.id, "orderedPart", event.target.value)}
              placeholder="Front brake pad set - ceramic premium, VIN matched"
              value={part.orderedPart}
            />
            <div className={styles.sourceFieldStack}>
              <select
                aria-label={`Source ${part.id}`}
                className={styles.field}
                onChange={(event) => updateOrderedPart(part.id, "source", event.target.value)}
                value={part.source}
              >
                <option value="">Select source</option>
                {sourceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              {part.source === "Custom vendor" ? <input
                aria-label={`Custom vendor ${part.id}`}
                className={styles.field}
                onChange={(event) => updateOrderedPart(part.id, "sourceCustom", event.target.value)}
                placeholder="Enter vendor name"
                value={part.sourceCustom}
              /> : null}
            </div>
            <input
              aria-label={`Ordered date ${part.id}`}
              className={styles.field}
              onChange={(event) => updateOrderedPart(part.id, "orderedDate", event.target.value)}
              type="date"
              value={part.orderedDate}
            />
            <input
              aria-label={`Cost ${part.id}`}
              className={styles.field}
              inputMode="decimal"
              onChange={(event) => updateOrderedPart(part.id, "cost", event.target.value)}
              placeholder="128.99"
              value={part.cost}
            />
          </div>)}
        </div>
      </section>

      <section className={styles.stepCard}>
        <header><span>Step 3</span><h2>Resolve supplement or budget control</h2></header>
        <p>If ordered parts change the approved total, preserve the supplement decision before the job is treated as ready.</p>
        <ul>
          <li>Within plan: continue with documented sourcing</li>
          <li>Above plan: manager review and supplement control</li>
          <li>Urgent safety exception: preserve exact work trail</li>
        </ul>
      </section>

      <section className={styles.stepCard}>
        <header><span>Step 4</span><h2>Receive, match, and release to repair</h2></header>
        <p>Order completion alone is not enough. Confirm quantity, fitment, and visible condition before releasing the job forward.</p>
        <ul>
          <li>Received physically</li>
          <li>Quantity matched</li>
          <li>Fitment confirmed</li>
          <li>No shipping damage</li>
        </ul>
      </section>

      <section className={styles.ledgerCard}>
        <header className={styles.ledgerHeader}>
          <div>
            <span>Step 5</span>
            <h2>Document whether ordered parts were actually used</h2>
            <p>Close the loop on purchasing by recording what was installed on the repair, in what quantity, and when it was used.</p>
          </div>
          <button className={styles.addRowButton} onClick={addUsedRow} type="button"><Check size={15} />Add used-part line</button>
        </header>

        <div className={styles.returnTable}>
          <div className={styles.returnHead}>
            <div className={styles.gridHead}>Used part</div>
            <div className={styles.gridHead}>Qty used</div>
            <div className={styles.gridHead}>Used on repair</div>
            <div className={styles.gridHead}>Used date</div>
          </div>

          {usedParts.length ? usedParts.map((part) => <div className={styles.returnRow} key={part.id}>
            <input
              aria-label={`Used part ${part.id}`}
              className={styles.field}
              onChange={(event) => updateUsedPart(part.id, "partName", event.target.value)}
              placeholder="Front brake pad set - installed"
              value={part.partName}
            />
            <input
              aria-label={`Used quantity ${part.id}`}
              className={styles.field}
              inputMode="numeric"
              onChange={(event) => updateUsedPart(part.id, "qtyUsed", event.target.value)}
              placeholder="1"
              value={part.qtyUsed}
            />
            <input
              aria-label={`Used on repair ${part.id}`}
              className={styles.field}
              onChange={(event) => updateUsedPart(part.id, "usedOnRepair", event.target.value)}
              placeholder="RO-0691C247 front brake service"
              value={part.usedOnRepair}
            />
            <input
              aria-label={`Used date ${part.id}`}
              className={styles.field}
              onChange={(event) => updateUsedPart(part.id, "usedDate", event.target.value)}
              type="date"
              value={part.usedDate}
            />
          </div>) : <p className={styles.emptyReturnState}>No used-part lines yet. Record parts actually installed so unused items can be returned or held accurately.</p>}
        </div>
      </section>

      <section className={styles.ledgerCard}>
        <header className={styles.ledgerHeader}>
          <div>
            <span>Step 6</span>
            <h2>Document parts returns</h2>
            <p>Capture wrong parts, cores, damaged items, or over-orders so returns are tracked with the same discipline as purchasing.</p>
          </div>
          <button className={styles.addRowButton} onClick={addReturnRow} type="button"><RotateCcw size={15} />Add return line</button>
        </header>

        <div className={styles.returnTable}>
          <div className={styles.returnHead}>
            <div className={styles.gridHead}>Returned part</div>
            <div className={styles.gridHead}>Qty</div>
            <div className={styles.gridHead}>Return reason</div>
            <div className={styles.gridHead}>Return date</div>
          </div>

          {returnParts.length ? returnParts.map((part) => <div className={styles.returnRow} key={part.id}>
            <input
              aria-label={`Returned part ${part.id}`}
              className={styles.field}
              onChange={(event) => updateReturnPart(part.id, "partName", event.target.value)}
              placeholder="Front brake rotor - wrong diameter"
              value={part.partName}
            />
            <input
              aria-label={`Returned quantity ${part.id}`}
              className={styles.field}
              inputMode="numeric"
              onChange={(event) => updateReturnPart(part.id, "qty", event.target.value)}
              placeholder="1"
              value={part.qty}
            />
            <select
              aria-label={`Return reason ${part.id}`}
              className={styles.field}
              onChange={(event) => updateReturnPart(part.id, "reason", event.target.value)}
              value={part.reason}
            >
              <option value="">Select return reason</option>
              {returnReasonOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <input
              aria-label={`Return date ${part.id}`}
              className={styles.field}
              onChange={(event) => updateReturnPart(part.id, "returnDate", event.target.value)}
              type="date"
              value={part.returnDate}
            />
          </div>) : <p className={styles.emptyReturnState}>No return lines yet. Add a return line only when a part must be sent back, core-tracked, or removed from inventory responsibility.</p>}
        </div>
      </section>
    </div>
  </section>;
}
