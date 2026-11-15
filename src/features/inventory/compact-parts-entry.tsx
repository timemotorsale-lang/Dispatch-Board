"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import styles from "./compact-parts-entry.module.css";

export type CompactPartsSupplier = { id: string; name: string };
export type CompactPartsPurchaseOrder = {
  id: string; selectionKey?: string; label: string; part: string; quantity: number; partId: string;
  supplierId?: string; vendor?: string; unitPriceCents?: number; purchasedOn?: string;
};

export type CompactPartsNeededPart = { id: string; partId: string; part: string; quantity: number; requisitionId?: string };

export type CompactPartsEntryInput = {
  repairOrderId: string; requestId: string; purchaseOrderId?: string; partId?: string; demandId?: string; requisitionId?: string;
  part: string; quantity: number; purchased: boolean; supplierId?: string;
  vendor?: string; purchasedOn?: string; unitPriceCents?: number;
  received: boolean; receivedOn?: string; stockLocationId?: string; packingSource?: string; note?: string;
};

export type CompactPartsEntryResult = {
  status: "saved" | "partial" | "approval-required" | "error";
  message: string; nextAction?: string; retryable?: boolean; canStartNew?: boolean; reviewHref?: string;
};

type Props = {
  repairOrderId: string;
  disabled?: boolean;
  suppliers?: readonly CompactPartsSupplier[];
  purchaseOrders?: readonly CompactPartsPurchaseOrder[];
  neededParts?: readonly CompactPartsNeededPart[];
  stockLocations?: readonly { id: string; label: string }[];
  onSave: (entry: CompactPartsEntryInput) => Promise<CompactPartsEntryResult>;
};

export function currentPartsEntryDate(now = new Date()) {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
}

export function canStartAnotherPartsEntry(result: CompactPartsEntryResult | null) {
  return Boolean(result && !result.retryable && (result.status === "approval-required" || (result.status === "partial" && result.canStartNew)));
}

export function readCompactPartsEntry(
  data: FormData, repairOrderId: string, existingOrder?: CompactPartsPurchaseOrder, neededPart?: CompactPartsNeededPart,
): Omit<CompactPartsEntryInput, "requestId"> {
  const text = (name: string) => String(data.get(name) ?? "").trim();
  const part = existingOrder?.part ?? neededPart?.part ?? text("part");
  const quantity = Number(text("quantity") || existingOrder?.quantity || neededPart?.quantity);
  if (!part || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error("Enter a part and a whole quantity of at least 1.");
  if (existingOrder && quantity > existingOrder.quantity) throw new Error("Quantity exceeds what remains on this purchase order.");
  if (neededPart && quantity > neededPart.quantity) throw new Error("Quantity exceeds what remains on this needed part.");
  const purchased = Boolean(existingOrder || neededPart) || data.has("purchased");
  const received = Boolean(existingOrder) || (purchased && data.has("received"));
  const supplierId = existingOrder ? existingOrder.supplierId : text("supplierId") || undefined;
  const vendor = existingOrder ? existingOrder.vendor : text("vendor") || undefined;
  const purchasedOn = existingOrder ? existingOrder.purchasedOn : text("purchasedOn");
  const price = text("unitPrice");
  const unitPriceCents = existingOrder ? existingOrder.unitPriceCents : price ? Math.round(Number(price) * 100) : undefined;
  const receivedOn = text("receivedOn");
  const note = text("note");
  const today = currentPartsEntryDate();
  const stockLocationId = text("stockLocationId");
  const packingSource = text("packingSource");
  if (!existingOrder && purchased && ((!supplierId && !vendor) || !purchasedOn || unitPriceCents === undefined || !Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0)) {
    throw new Error("Enter the supplier or vendor, purchase date, and unit price.");
  }
  if (received && (!receivedOn || !stockLocationId || !packingSource)) throw new Error("Enter the receipt date, receiving bin, and packing reference.");
  if ((!existingOrder && purchased && purchasedOn && purchasedOn > today) || (received && receivedOn > today)) throw new Error("Purchase and receipt dates cannot be in the future.");
  if (received && purchasedOn && receivedOn < purchasedOn) throw new Error("Receipt date cannot be before the purchase date.");
  return {
    repairOrderId, ...(existingOrder && { purchaseOrderId: existingOrder.id, partId: existingOrder.partId }),
    ...(neededPart && { demandId: neededPart.id, partId: neededPart.partId, requisitionId: neededPart.requisitionId }), part, quantity, purchased,
    ...(purchased && { supplierId, vendor, purchasedOn: purchasedOn || undefined, unitPriceCents }),
    received, ...(received && { receivedOn, stockLocationId, packingSource }), ...(note && { note }),
  };
}

export async function runCompactPartsSubmission(latch: { current: boolean }, save: () => Promise<void>) {
  if (latch.current) return;
  latch.current = true;
  try { await save(); } finally { latch.current = false; }
}

export function CompactPartsEntry(props: Props) {
  return <PartsEntryForm key={props.repairOrderId} {...props} />;
}

function PartsEntryForm({ repairOrderId, disabled, suppliers = [], purchaseOrders = [], neededParts = [], stockLocations = [], onSave }: Props) {
  const headingId = useId();
  const [mode, setMode] = useState<"new" | "existing" | "needed">("new");
  const [neededId, setNeededId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [purchased, setPurchased] = useState(false);
  const [received, setReceived] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CompactPartsEntryResult | null>(null);
  const sending = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const retry = useRef<{ fingerprint: string; entry: CompactPartsEntryInput } | null>(null);
  const existingOrder = mode === "existing" ? purchaseOrders.find(order => (order.selectionKey ?? order.id) === orderId) : undefined;
  const neededPart = mode === "needed" ? neededParts.find(part => part.id === neededId) : undefined;
  const buying = mode === "needed" || purchased;
  const resultBlocked = (result?.status === "partial" || result?.status === "approval-required") && result.retryable !== true;

  function resetFields(form: HTMLFormElement) {
    retry.current = null;
    form.reset();
    setMode("new");
    setOrderId("");
    setNeededId("");
    setPurchased(false);
    setReceived(false);
    setSupplierId("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || !repairOrderId || resultBlocked) return;
    const form = event.currentTarget;
    await runCompactPartsSubmission(sending, async () => {
      let attempted = false;
      try {
        const frozen = result?.retryable ? retry.current?.entry : undefined;
        if (!frozen && mode === "existing" && !existingOrder) throw new Error("Choose an existing purchase order to receive.");
        if (!frozen && mode === "needed" && !neededPart) throw new Error("Choose the needed part being purchased.");
        const input = frozen ?? readCompactPartsEntry(new FormData(form), repairOrderId, existingOrder, neededPart);
        const fingerprint = JSON.stringify(input);
        if (!frozen && retry.current?.fingerprint !== fingerprint) retry.current = { fingerprint, entry: { ...input, requestId: crypto.randomUUID() } };
        setBusy(true);
        setResult(null);
        attempted = true;
        const response = await onSave(frozen ?? retry.current!.entry);
        setResult(response);
        if (response.status === "saved") resetFields(form);
      } catch (error) {
        setResult({ status: "error", message: error instanceof Error ? error.message : "Parts entry could not be saved. Retry the same entry.", retryable: attempted, ...(attempted && { nextAction: "Retry the same entry to check what was saved." }) });
      } finally {
        setBusy(false);
        requestAnimationFrame(() => feedback.current?.focus());
      }
    });
  }

  const today = currentPartsEntryDate();
  const reviewHref = result?.reviewHref;
  const showReviewLink = reviewHref?.startsWith("/") && !reviewHref.startsWith("//") && !reviewHref.includes("\\");
  const receive = mode === "existing" ? Boolean(existingOrder) : buying && received;
  return (
    <section aria-labelledby={headingId} className={styles.entry}>
      <h2 id={headingId}>Add or receive parts</h2>
      {!repairOrderId && <p>Select a repair order before entering parts.</p>}
      <form ref={formRef} onSubmit={submit} aria-busy={busy || undefined}>
        <fieldset disabled={disabled || busy || !repairOrderId || resultBlocked || result?.retryable} className={styles.fields}>
          {(purchaseOrders.length > 0 || neededParts.length > 0) && <label>Entry type
            <select value={mode} onChange={event => {
              const nextMode = event.target.value;
              if (formRef.current) resetFields(formRef.current);
              setMode(nextMode === "existing" || nextMode === "needed" ? nextMode : "new");
              setResult(null);
            }}>
              <option value="new">New part</option>
              {neededParts.length > 0 && <option value="needed">Purchase needed part</option>}
              {purchaseOrders.length > 0 && <option value="existing">Receive existing order</option>}
            </select>
          </label>}
          {mode === "existing" ? <>
            <label className={styles.wide}>Purchase order
              <select required value={orderId} onChange={event => { setOrderId(event.target.value); setResult(null); }}>
                <option value="">Choose an existing order</option>
                {purchaseOrders.map(order => <option key={order.selectionKey ?? order.id} value={order.selectionKey ?? order.id}>{order.label} · {order.part}</option>)}
              </select>
            </label>
            {existingOrder && <div className={styles.wide}>
              <p><strong>{existingOrder.part}</strong> · Qty {existingOrder.quantity}
                {existingOrder.unitPriceCents !== undefined && <> · ${(existingOrder.unitPriceCents / 100).toFixed(2)} each</>}
                {(existingOrder.vendor || existingOrder.supplierId) && <> · {existingOrder.vendor || suppliers.find(supplier => supplier.id === existingOrder.supplierId)?.name || existingOrder.supplierId}</>}
              </p>
              <label>Qty to receive<input key={existingOrder.selectionKey ?? existingOrder.id} required name="quantity" type="number" min="1" max={existingOrder.quantity} step="1" inputMode="numeric" defaultValue={existingOrder.quantity} /></label>
              <p>This records receipt against the selected purchase order.</p>
            </div>}
          </> : <>
            {mode === "needed" ? <>
              <label className={styles.part}>Needed part<select required value={neededId} onChange={event => { setNeededId(event.target.value); setSupplierId(""); setReceived(false); setResult(null); }}>
                <option value="">Choose a needed part</option>
                {neededParts.map(part => <option key={part.id} value={part.id}>{part.part} · Qty {part.quantity}</option>)}
              </select></label>
              {neededPart && <label>Qty<input key={neededPart.id} required name="quantity" type="number" min="1" max={neededPart.quantity} step="1" inputMode="numeric" defaultValue={neededPart.quantity} /></label>}
              <label className={styles.check}><input type="checkbox" checked disabled /> Purchased</label>
            </> : <>
            <label className={styles.part}>Part<input required name="part" maxLength={200} placeholder="Name or part number" /></label>
            <label>Qty<input required name="quantity" type="number" min="1" step="1" inputMode="numeric" defaultValue="1" /></label>
            <label className={styles.check}><input name="purchased" type="checkbox" checked={purchased} onChange={event => setPurchased(event.target.checked)} /> Purchased</label>
            </>}
            <div key={mode + ":" + neededId} className={styles.wide} hidden={!buying}>
              <div className={styles.purchase}>
                {suppliers.length > 0 && <label>Supplier<select name="supplierId" disabled={!buying} value={supplierId} onChange={event => setSupplierId(event.target.value)}>
                  <option value="">Other vendor</option>
                  {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select></label>}
                <label hidden={Boolean(supplierId)}>Vendor / from where<input name="vendor" maxLength={200} disabled={!buying || Boolean(supplierId)} required={buying && !supplierId} /></label>
                <label>Purchased on<input name="purchasedOn" type="date" max={today} disabled={!buying} required={buying} /></label>
                <label>Unit price ($)<input name="unitPrice" type="number" disabled={!buying} min="0" step="0.01" inputMode="decimal" required={buying} /></label>
                <label className={styles.check}><input name="received" type="checkbox" disabled={!buying} checked={received} onChange={event => setReceived(event.target.checked)} /> Received</label>
              </div>
            </div>
          </>}
          <div key={mode + ":" + orderId + ":" + neededId} className={styles.wide} hidden={!receive}>
            <div className={styles.purchase}>
              <label>Received on<input name="receivedOn" type="date" max={today} disabled={!receive} required={receive} /></label>
              <label>Receiving bin<select name="stockLocationId" disabled={!receive} required={receive} defaultValue={stockLocations.length === 1 ? stockLocations[0].id : ""}>
                <option value="">Choose a bin</option>
                {stockLocations.map(stock => <option key={stock.id} value={stock.id}>{stock.label}</option>)}
              </select></label>
              <label>Packing reference<input name="packingSource" disabled={!receive} required={receive} maxLength={200} /></label>
            </div>
            {receive && stockLocations.length === 0 && <p>No receiving bin is available for this repair order. Ask Parts to check receiving setup.</p>}
          </div>
          <label className={styles.wide}>Note (optional)<input name="note" maxLength={500} /></label>
        </fieldset>
        <button type="submit" disabled={disabled || busy || !repairOrderId || resultBlocked}>{busy ? "Saving…" : result?.retryable ? "Retry save" : "Save parts entry"}</button>

      </form>
      <div ref={feedback} tabIndex={-1} role={result?.status === "error" ? "alert" : "status"} className={styles.feedback}>
        {result && <><p>{result.message}</p>{result.nextAction && <p><strong>Next:</strong> {result.nextAction}</p>}{showReviewLink && <a href={reviewHref}>Review saved record</a>}</>}
        {canStartAnotherPartsEntry(result) && <button type="button" disabled={disabled || busy} onClick={() => {
          if (!formRef.current) return;
          resetFields(formRef.current);
          setResult(null);
          requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("select, input:not([hidden])")?.focus());
        }}>Add another part</button>}
      </div>
    </section>
  );
}
