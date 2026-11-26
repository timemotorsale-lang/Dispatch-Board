"use client";

import { useEffect, useEffectEvent, useId, useRef, useState, type FormEvent } from "react";
import styles from "./compact-parts-entry.module.css";
import { compactPurchaseNote } from "@/lib/compact-purchase-contact";

export type CompactPartsSupplier = { id: string; name: string };
export type CompactPartsPurchaseOrder = {
  id: string; selectionKey?: string; label: string; part: string; quantity: number; partId: string;
  supplierId?: string; vendor?: string; unitPriceCents?: number; purchasedOn?: string;
};

export type CompactPartsNeededPart = { id: string; partId: string; part: string; quantity: number; requisitionId?: string };

export type CompactPartsEntryInput = {
  repairOrderId: string; requestId: string; purchaseOrderId?: string; partId?: string; partNumber?: string; demandId?: string; requisitionId?: string;
  part: string; quantity: number; purchased: boolean; supplierId?: string;
  vendor?: string; purchasedOn?: string; unitPriceCents?: number;
  receiptId?: string; lineIndex?: number; usage?: CompactPartsUsage; usageQuantity?: number; usageOccurredAt?: string; repairJobId?: string; evidence?: string[]; returnReason?: string; deadlineAt?: string;
  received: boolean; receivedOn?: string; stockLocationId?: string; stockLocationName?: string; packingSource?: string; note?: string;
};

export type CompactPartsEntryResult = {
  status: "saved" | "partial" | "approval-required" | "error";
  message: string; nextAction?: string; retryable?: boolean; canStartNew?: boolean; reviewHref?: string;
};

export type CompactPartsUsage = "NOT_YET" | "USED" | "RETURN";
export type CompactPartsReceivedPart = { receiptId: string; lineIndex: number; partId: string; part: string; label: string; quantity: number; purchaseOrderId?: string; receivedAt?: string; vendor?: string; unitPriceCents?: number };
export type CompactPartsJob = { id: string; label: string };
export type CompactPartsSelection =
  | { demandId: string; token: string }
  | { purchaseOrderId: string; partId: string; token: string }
  | { receiptId: string; lineIndex: number; partId: string; token: string; usage?: CompactPartsUsage };

type Props = {
  repairOrderId: string;
  disabled?: boolean;
  suppliers?: readonly CompactPartsSupplier[];
  purchaseOrders?: readonly CompactPartsPurchaseOrder[];
  neededParts?: readonly CompactPartsNeededPart[];
  selection?: CompactPartsSelection;
  receivedParts?: readonly CompactPartsReceivedPart[];
  jobs?: readonly CompactPartsJob[];
  usageEnabled?: boolean;
  taskLayout?: boolean;
  outcomeOnly?: boolean;
  linkNewPartsToJob?: boolean;
  preferredPartsJobId?: string;
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
  data: FormData, repairOrderId: string, existingOrder?: CompactPartsPurchaseOrder, neededPart?: CompactPartsNeededPart, receiptLine?: CompactPartsReceivedPart,
): Omit<CompactPartsEntryInput, "requestId"> {
  const text = (name: string) => String(data.get(name) ?? "").trim();
  const part = receiptLine?.part ?? existingOrder?.part ?? neededPart?.part ?? text("part");
  const quantity = Number(text("quantity") || receiptLine?.quantity || existingOrder?.quantity || neededPart?.quantity);
  if (!part || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error("Enter a part and a whole quantity of at least 1.");
  if (existingOrder && quantity > existingOrder.quantity) throw new Error("Quantity exceeds what remains on this purchase order.");
  if (neededPart && quantity > neededPart.quantity) throw new Error("Quantity exceeds what remains on this needed part.");
  if (receiptLine && quantity > receiptLine.quantity) throw new Error("Quantity exceeds what remains on this receipt line.");
  const purchased = Boolean(receiptLine || existingOrder || neededPart) || data.has("purchased");
  const received = Boolean(receiptLine) || (purchased && text("received") === "yes");
  if (existingOrder && !received) throw new Error("Select Received to record a receipt for this purchase order.");
  const supplierId = existingOrder ? existingOrder.supplierId : text("supplierId") || undefined;
  const vendor = existingOrder ? existingOrder.vendor : text("vendor") || undefined;
  const purchasedOn = existingOrder ? existingOrder.purchasedOn : text("purchasedOn");
  const price = text("unitPrice");
  const unitPriceCents = existingOrder ? existingOrder.unitPriceCents : price ? Math.round(Number(price) * 100) : undefined;
  const receivedOn = text("receivedOn");
  const note = purchased && !existingOrder && !receiptLine ? compactPurchaseNote(text("note"), text("supplierPhone"), text("supplierContact")) : text("note");
  const today = currentPartsEntryDate();
  const selection = text("usage");
  const usage: CompactPartsUsage | undefined = !received ? undefined : selection === "USED" || selection === "RETURN" ? selection : "NOT_YET";
  const repairJobId = text("repairJobId");
  const usageOccurredAt = text("usageOccurredAt");
  const usageQuantity = text("usageQuantity") ? Number(text("usageQuantity")) : quantity;
  const installationEvidence = text("installationEvidence");
  const returnReason = text("returnReason");
  const deadlineAt = text("deadlineAt");
  if (receiptLine && usage === "NOT_YET") throw new Error("No change to save. This part stays received and available.");
  if ((usage === "USED" || usage === "RETURN") && (!Number.isSafeInteger(usageQuantity) || usageQuantity < 1 || usageQuantity > quantity)) {
    throw new Error("Enter a whole usage quantity within the quantity being received or available.");
  }
  const outcomeTime = Date.parse(usageOccurredAt);
  const receiptTime = receiptLine?.receivedAt ? Date.parse(receiptLine.receivedAt) : receivedOn ? Date.parse(receivedOn + "T00:00:00") : null;
  const invalidOutcomeDate = !Number.isFinite(outcomeTime) || outcomeTime > Date.now() || (receiptTime !== null && outcomeTime < receiptTime);
  if (usage === "USED" && (!repairJobId || invalidOutcomeDate)) {
    throw new Error("Select a repair job and enter a used date between receipt and today.");
  }
  if (usage === "RETURN" && (returnReason.length < 10 || invalidOutcomeDate || !Number.isFinite(Date.parse(deadlineAt)) || Date.parse(deadlineAt) < outcomeTime || deadlineAt.slice(0, 10) < today)) {
    throw new Error("Enter the return decision date, a reason of at least 10 characters, and a follow-up date of today or later.");
  }
  const usageDetails = usage === "USED" ? { usage, usageQuantity, usageOccurredAt, repairJobId, evidence: [installationEvidence || "Staff marked the received quantity as used on the selected repair job."] }
    : usage === "RETURN" ? { usage, usageQuantity, usageOccurredAt, returnReason, deadlineAt } : usage ? { usage } : {};
  if (receiptLine) return {
    repairOrderId, receiptId: receiptLine.receiptId, lineIndex: receiptLine.lineIndex, partId: receiptLine.partId,
    purchaseOrderId: receiptLine.purchaseOrderId, part, quantity, purchased, received, ...usageDetails, ...(note && { note }),
  };
  const selectedLocation = text("stockLocationId");
  const stockLocationId = selectedLocation === "__new__" ? undefined : selectedLocation;
  const stockLocationName = selectedLocation === "__new__" ? text("stockLocationName") : undefined;
  const needJobId = !existingOrder && !neededPart ? text("needJobId") : "";
  const enteredPartNumber = text("partNumber");
  const partNumber = !existingOrder && !neededPart && text("numberMode") === "manual" && !/^(?:N\/?A|UNKNOWN)$/i.test(enteredPartNumber)
    ? enteredPartNumber : undefined;
  if (partNumber === "") throw new Error("Enter the stock number or choose automatic numbering.");
  const packingSource = text("packingSource");
  if (!existingOrder && purchased && ((!supplierId && !vendor) || !purchasedOn || unitPriceCents === undefined || !Number.isSafeInteger(unitPriceCents) || unitPriceCents < 0)) {
    throw new Error("Enter the supplier or vendor, purchase date, and unit price.");
  }
  if (received && (!receivedOn || (!stockLocationId && !stockLocationName) || !packingSource)) throw new Error("Enter the receipt date, receiving bin, and packing reference.");
  if ((!existingOrder && purchased && purchasedOn && purchasedOn > today) || (received && receivedOn > today)) throw new Error("Purchase and receipt dates cannot be in the future.");
  if (received && purchasedOn && receivedOn < purchasedOn) throw new Error("Receipt date cannot be before the purchase date.");
  return {
    repairOrderId, ...(existingOrder && { purchaseOrderId: existingOrder.id, partId: existingOrder.partId }),
    ...(neededPart && { demandId: neededPart.id, partId: neededPart.partId, requisitionId: neededPart.requisitionId }), part, quantity, purchased, ...(partNumber && { partNumber }),
    ...(purchased && { supplierId, vendor, purchasedOn: purchasedOn || undefined, unitPriceCents }),
    received, ...(needJobId && { repairJobId: needJobId }), ...usageDetails, ...(received && { receivedOn, ...(stockLocationId && { stockLocationId }), ...(stockLocationName && { stockLocationName }), packingSource }), ...(note && { note }),
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

function PartsEntryForm({ repairOrderId, disabled, suppliers = [], purchaseOrders = [], neededParts = [], selection, receivedParts = [], jobs = [], usageEnabled = false, linkNewPartsToJob = false, preferredPartsJobId, taskLayout = false, outcomeOnly = false, stockLocations = [], onSave }: Props) {
  const headingId = useId();
  const preset = outcomeOnly && selection && "receiptId" in selection ? selection : undefined;
  const [mode, setMode] = useState<"new" | "existing" | "needed" | "receipt">(preset ? "receipt" : "new");
  const [receiptKey, setReceiptKey] = useState(preset ? preset.receiptId + ":" + preset.lineIndex : "");
  const [usage, setUsage] = useState<CompactPartsUsage>(preset?.usage ?? "NOT_YET");
  const [neededId, setNeededId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [extraParts, setExtraParts] = useState<string[]>([]);
  const batch = useRef<CompactPartsEntryInput[]>([]);
  const [purchased, setPurchased] = useState(false);
  const [received, setReceived] = useState(false);
  const [packingSource, setPackingSource] = useState("");
  const [manualNumber, setManualNumber] = useState(false);
  const [locationChoice, setLocationChoice] = useState(stockLocations.length === 1 ? stockLocations[0].id : "");
  const [supplierId, setSupplierId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CompactPartsEntryResult | null>(null);
  const sending = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const retry = useRef<{ fingerprint: string; entry: CompactPartsEntryInput } | null>(null);
  const existingOrder = mode === "existing" ? purchaseOrders.find(order => (order.selectionKey ?? order.id) === orderId) : undefined;
  const neededPart = mode === "needed" ? neededParts.find(part => part.id === neededId) : undefined;
  const receiptLine = mode === "receipt" ? receivedParts.find(part => part.receiptId + ":" + part.lineIndex === receiptKey) : undefined;
  const buying = mode === "needed" || purchased;
  const resultBlocked = (result?.status === "partial" || result?.status === "approval-required") && result.retryable !== true;

  function resetFields(form: HTMLFormElement) {
    retry.current = null;
    batch.current = [];
    setExtraParts([]);
    form.reset();
    setMode("new");
    setReceiptKey("");
    setUsage("NOT_YET");
    setOrderId("");
    setNeededId("");
    setPurchased(false);
    setReceived(false);
    setPackingSource("");
    setManualNumber(false);
    setLocationChoice(stockLocations.length === 1 ? stockLocations[0].id : "");
    setSupplierId("");
  }

  const selectedPurchaseOrder = selection && "purchaseOrderId" in selection
    ? purchaseOrders.find(order => order.id === selection.purchaseOrderId && order.partId === selection.partId)
    : undefined;
  const selectedOrderKey = selectedPurchaseOrder?.selectionKey ?? selectedPurchaseOrder?.id;
  const selectedReceipt = usageEnabled && selection && "receiptId" in selection
    ? receivedParts.find(part => part.receiptId === selection.receiptId && part.lineIndex === selection.lineIndex && part.partId === selection.partId)
    : undefined;
  const selectedReceiptKey = selectedReceipt && selectedReceipt.receiptId + ":" + selectedReceipt.lineIndex;
  const selectedUsage = selection && "receiptId" in selection ? selection.usage : undefined;
  const selectedDemandId = selection && "demandId" in selection ? selection.demandId : undefined;
  const selectionToken = selection?.token;
  const latestSelection = useEffectEvent((key: string, isReceipt: boolean) => {
    if (sending.current || disabled || resultBlocked || result?.retryable || !formRef.current) return;
    resetFields(formRef.current);
    setMode(isReceipt ? "receipt" : "existing");
    if (isReceipt) { setReceiptKey(key); setUsage(selectedUsage ?? "NOT_YET"); }
    else { setOrderId(key); if (taskLayout) setReceived(true); }
    setResult(null);
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(isReceipt ? '[name="usage"]' : taskLayout ? '[name="quantity"]' : '[name="received"]')?.focus());
  });
  useEffect(() => {
    const selectedKey = selectedReceiptKey ?? selectedOrderKey;
    if (outcomeOnly || !selectionToken || !selectedKey) return;
    const frame = requestAnimationFrame(() => latestSelection(selectedKey, Boolean(selectedReceiptKey)));
    return () => cancelAnimationFrame(frame);
  }, [outcomeOnly, selectionToken, selectedOrderKey, selectedReceiptKey, selectedUsage]);

  const selectDemand = useEffectEvent((id: string) => {
    setMode("needed");
    setNeededId(id);
    setReceived(false);
    setResult(null);
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[name="supplierId"]')?.focus());
  });
  useEffect(() => {
    if (!selectedDemandId || !selectionToken) return;
    const frame = requestAnimationFrame(() => selectDemand(selectedDemandId));
    return () => cancelAnimationFrame(frame);
  }, [selectedDemandId, selectionToken]);

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
        if (!frozen && mode === "receipt" && !receiptLine) throw new Error("Choose the exact received part.");
        const fields = new FormData(form);
        const input = frozen ?? readCompactPartsEntry(fields, repairOrderId, existingOrder, neededPart, receiptLine);
        const fingerprint = JSON.stringify(input);
        if (!frozen && retry.current?.fingerprint !== fingerprint) retry.current = { fingerprint, entry: { ...input, requestId: crypto.randomUUID() } };
        setBusy(true);
        setResult(null);
        attempted = true;
        if (!batch.current.length && !frozen && mode === "new" && !purchased && extraParts.length) {
          batch.current = [retry.current!.entry, ...extraParts.filter(key => String(fields.get("part-" + key) ?? "").trim()).map(key => {
            const row = new FormData();
            row.set("part", String(fields.get("part-" + key) ?? ""));
            row.set("quantity", String(fields.get("quantity-" + key) ?? ""));
            row.set("note", String(fields.get("note") ?? ""));
            row.set("needJobId", String(fields.get("needJobId") ?? ""));
            return { ...readCompactPartsEntry(row, repairOrderId), requestId: crypto.randomUUID() };
          })];
        }
        if (batch.current.length) {
          let saved = 0;
          while (batch.current.length) {
            const entry = batch.current[0];
            const response = await onSave(entry);
            if (response.status !== "saved") {
              setResult({ ...response, message: `${saved} saved this attempt. Stopped at ${entry.part}. ${response.message}` });
              return;
            }
            batch.current.shift();
            saved++;
          }
          resetFields(form);
          setResult({ status: "saved", message: `Saved ${saved} needed parts.` });
        } else {
          const response = await onSave(frozen ?? retry.current!.entry);
          setResult(response);
          if (response.status === "saved" && !outcomeOnly) resetFields(form);
        }
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
  const canChooseReceipt = mode === "existing" ? Boolean(existingOrder) : mode !== "receipt" && buying;
  const receive = canChooseReceipt && received;
  const awaitingExistingReceipt = mode === "existing" && Boolean(existingOrder) && !received;
  const preferredPartsJob = jobs.find(job => job.id === preferredPartsJobId);
  const outcomeTitle = preset?.usage === "RETURN" ? "Return part" : "Record part use";
  const submitLabel = !taskLayout ? "Save parts entry" : outcomeOnly ? (preset?.usage === "RETURN" ? "Open return case" : "Save part use")
    : mode === "existing" ? "Record receipt" : buying ? (received ? "Record purchase & receipt" : "Record purchase") : "Save needed part";
  return (
    <section aria-labelledby={headingId} className={styles.entry}>
      <h2 id={headingId}>{outcomeOnly ? outcomeTitle : "Add or receive parts"}</h2>
      {!repairOrderId && <p>Select a repair order before entering parts.</p>}
      <form ref={formRef} onSubmit={submit} aria-busy={busy || undefined}>
        <fieldset disabled={disabled || busy || !repairOrderId || resultBlocked || result?.retryable} className={styles.fields}>
          {!outcomeOnly && (purchaseOrders.length > 0 || neededParts.length > 0 || (usageEnabled && receivedParts.length > 0)) && <label>Entry type
            <select value={mode} onChange={event => {
              const nextMode = event.target.value;
              if (formRef.current) resetFields(formRef.current);
              setMode(nextMode === "existing" || nextMode === "needed" || nextMode === "receipt" ? nextMode : "new");
              if (taskLayout && nextMode === "existing") setReceived(true);
              setResult(null);
            }}>
              <option value="new">New part</option>
              {neededParts.length > 0 && <option value="needed">Purchase needed part</option>}
              {purchaseOrders.length > 0 && <option value="existing">Receive existing order</option>}
              {!taskLayout && usageEnabled && receivedParts.length > 0 && <option value="receipt">Update received part</option>}
            </select>
          </label>}
          {mode === "receipt" ? <>
            {outcomeOnly ? receiptLine && <div className={styles.wide}><strong>{receiptLine.part}</strong><p>{receiptLine.vendor ?? "Supplier not recorded"}{receiptLine.unitPriceCents !== undefined && <> · ${(receiptLine.unitPriceCents / 100).toFixed(2)} each</>} · {receiptLine.quantity} available</p><small>{receiptLine.label}</small></div> : <label className={styles.part}>Received part
              <select required value={receiptKey} onChange={event => { setReceiptKey(event.target.value); setUsage("NOT_YET"); setResult(null); }}>
                <option value="">Choose a receipt line</option>
                {receivedParts.map(part => <option key={part.receiptId + ":" + part.lineIndex} value={part.receiptId + ":" + part.lineIndex}>{part.label} · {part.part}</option>)}
              </select>
            </label>}
            {receiptLine && receiptLine.quantity > 0 && <label>Qty<input key={receiptKey} required name="quantity" type="number" min="1" max={receiptLine.quantity} step="1" defaultValue={receiptLine.quantity} /></label>}
          </> : mode === "existing" ? <>
            <label className={styles.wide} hidden={taskLayout && Boolean(existingOrder) && Boolean(selectedOrderKey)}>Purchase order
              <select required value={orderId} onChange={event => { setOrderId(event.target.value); setReceived(taskLayout); setPackingSource(""); setLocationChoice(""); setResult(null); }}>
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
              <label className={styles.part}>Needed part<select required value={neededId} onChange={event => { setNeededId(event.target.value); setSupplierId(""); setReceived(false); setPackingSource(""); setResult(null); }}>
                <option value="">Choose a needed part</option>
                {neededParts.map(part => <option key={part.id} value={part.id}>{part.part} · Qty {part.quantity}</option>)}
              </select></label>
              {neededPart && <label>Qty<input key={neededPart.id} required name="quantity" type="number" min="1" max={neededPart.quantity} step="1" inputMode="numeric" defaultValue={neededPart.quantity} /></label>}
              <label className={styles.check}><input type="checkbox" checked disabled /> Purchased</label>
            </> : <>
            <label className={styles.part}>Part<input required name="part" maxLength={200} placeholder="Name or part number" /></label>
            <label>Qty<input required name="quantity" type="number" min="1" step="1" inputMode="numeric" defaultValue="1" /></label>
            {linkNewPartsToJob && jobs.length > 1 && (preferredPartsJob ? <details className={styles.wide}>
              <summary>For {preferredPartsJob.label}</summary>
              <label>Repair job<select required name="needJobId" defaultValue={preferredPartsJob.id}>{jobs.map(job => <option key={job.id} value={job.id}>{job.label}</option>)}</select></label>
            </details> : <label>Repair job
              <select required name="needJobId"><option value="">Choose the job for these parts</option>{jobs.map(job => <option key={job.id} value={job.id}>{job.label}</option>)}</select>
            </label>)}
            <label className={styles.check}><input name="purchased" type="checkbox" disabled={extraParts.length > 0} checked={purchased} onChange={event => { setPurchased(event.target.checked); if (!event.target.checked) setReceived(false); }} /> Purchased</label>
            {!purchased && <>
              {extraParts.map((key, index) => <div key={key} className={styles.extraPartRow}>
                <label>Part {index + 2}<input name={"part-" + key} maxLength={200} placeholder="Name or part number" /></label>
                <label>Qty<input required name={"quantity-" + key} type="number" min="1" step="1" defaultValue="1" /></label>
                <button type="button" onClick={() => setExtraParts(rows => rows.filter(row => row !== key))} aria-label={`Remove part ${index + 2}`}>Remove</button>
              </div>)}
              </>}
            {(!taskLayout || !purchased) && <div className={styles.addPartRow}>
              <button type="button" disabled={purchased} onClick={() => setExtraParts(rows => [...rows, crypto.randomUUID()])}>+ Add needed part</button>
              {purchased && !taskLayout && <small> Save this purchase first. Add multiple needed parts from a new entry with Purchased unchecked.</small>}
            </div>}
            <details className={styles.wide}><summary>{taskLayout ? "Part number (optional)" : "Stock number options"}</summary>
              <label>Stock number<select name="numberMode" value={manualNumber ? "manual" : "automatic"} onChange={event => setManualNumber(event.target.value === "manual")}>
                <option value="automatic">Generate if this is a new catalog part</option>
                <option value="manual">Enter stock number</option>
              </select></label>
              <label hidden={!manualNumber}>Stock number<input name="partNumber" maxLength={100} disabled={!manualNumber} required={manualNumber} /></label>
              <small>Existing catalog parts keep their current stock number.</small>
            </details>
            </>}
            <div key={mode + ":" + neededId} className={styles.wide} hidden={!buying}>
              <div className={styles.purchase}>
                {suppliers.length > 0 && <label>Supplier<select name="supplierId" disabled={!buying} value={supplierId} onChange={event => setSupplierId(event.target.value)}>
                  <option value="">Other vendor</option>
                  {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                </select></label>}
                <label hidden={Boolean(supplierId)}>Vendor / from where<input name="vendor" maxLength={200} disabled={!buying || Boolean(supplierId)} required={buying && !supplierId} /></label>
                <label>Purchased on<input name="purchasedOn" type="date" max={today} defaultValue={today} disabled={!buying} required={buying} /></label>
                <label>Unit price ($)<input name="unitPrice" type="number" disabled={!buying} min="0" step="0.01" inputMode="decimal" required={buying} /></label>
                {taskLayout && buying && <details className={styles.wide}><summary>Supplier contact (optional)</summary>
                  <div className={styles.purchase}>
                    <label>Supplier phone<input name="supplierPhone" type="tel" maxLength={45} /></label>
                    <label>Contact name or email<input name="supplierContact" maxLength={90} /></label>
                  </div>
                  <small>Saved with this purchase. The supplier directory is unchanged.</small>
                </details>}
              </div>
            </div>
          </>}
          {canChooseReceipt && !(taskLayout && mode === "existing") && <div className={styles.wide} role="group" aria-label="Receipt status">
            <label className={styles.check}><input name="received" type="checkbox" value="yes" checked={received} onChange={event => setReceived(event.target.checked)} /> Received</label>
            {awaitingExistingReceipt && <small>Check Received when the part arrives.</small>}
          </div>}
          {taskLayout && mode === "existing" && receive && <input type="hidden" name="received" value="yes" />}
          {!outcomeOnly && <div key={mode + ":" + orderId + ":" + neededId} className={styles.wide} hidden={!receive}>
            <div className={styles.purchase}>
              <label>Received on<input name="receivedOn" type="date" max={today} defaultValue={taskLayout ? today : undefined} disabled={!receive} required={receive} /></label>
              <label>Receiving bin<select name="stockLocationId" disabled={!receive} required={receive} value={locationChoice} onChange={event => setLocationChoice(event.target.value)}>
                <option value="">Choose a bin</option>
                {stockLocations.map(stock => <option key={stock.id} value={stock.id}>{stock.label}</option>)}
                <option value="__new__">Add a physical location</option>
              </select></label>
              {locationChoice === "__new__" && <label>Actual physical bin or shelf name<input name="stockLocationName" disabled={!receive} required={receive} maxLength={100} placeholder="Enter the real bin or shelf name" /></label>}
              <div className={styles.reference}>
                <label>Packing reference<input name="packingSource" disabled={!receive} required={receive} maxLength={200} value={packingSource} onChange={event => setPackingSource(event.target.value)} /></label>
                <button type="button" disabled={!receive || Boolean(packingSource.trim())} onClick={() => {
                  const numbers = crypto.getRandomValues(new Uint32Array(2));
                  const groups = Array.from(numbers, number => String(number % 1_000_000).padStart(6, "0"));
                  setPackingSource("RC-" + groups.join("-"));
                }}>Generate internal reference</button>
                <small>Use the vendor packing reference when available. Generate one only for your internal receipt record.</small>
              </div>
            </div>
            {receive && stockLocations.length === 0 && <p>Enter the name of the physical location where the part is stored, or ask Parts for help.</p>}
          </div>}
          {usageEnabled && (receive || receiptLine) && <div className={styles.wide} key={mode + ":" + orderId + ":" + neededId + ":" + receiptKey}>
            {!outcomeOnly && <div className={styles.outcomeSection}>
              <p id={headingId + "-outcome"}>What happened to the part?</p>
              <div role="radiogroup" aria-labelledby={headingId + "-outcome"} className={styles.outcomeChoices}>
                {([["USED", "Used"], ["NOT_YET", "Not yet used"], ["RETURN", "Not used — return"]] as const).map(([value, label]) =>
                  <label key={value} className={styles.outcomeOption}>
                    <input name="usage" type="radio" disabled={value === "USED" && !jobs.length} value={value} checked={usage === value} onChange={() => setUsage(value)} />
                    <span>{label}</span>
                  </label>
                )}
              </div>
            </div>}
            {outcomeOnly && <input type="hidden" name="usage" value={usage} />}
            {!receiptLine && usage !== "NOT_YET" && <label>Qty for this outcome<input name="usageQuantity" type="number" min="1" step="1" placeholder="Whole received quantity" /></label>}
            {usage === "USED" && <div className={styles.purchase}>
              <label>Repair job<select required name="repairJobId" defaultValue={taskLayout && jobs.length === 1 ? jobs[0].id : ""}><option value="">Choose the job</option>{jobs.map(job => <option key={job.id} value={job.id}>{job.label}</option>)}</select></label>
              <label>Used at<input required name="usageOccurredAt" type="datetime-local" step="0.001" max={today + "T23:59:59.999"} /></label>


            </div>}
            {usage === "RETURN" && <div className={styles.purchase}>
              <label>Return reason<input required name="returnReason" minLength={10} maxLength={500} /></label>
              <label>Return decision at<input required name="usageOccurredAt" type="datetime-local" step="0.001" max={today + "T23:59:59.999"} /></label>
              <label>Follow up by<input required name="deadlineAt" type="datetime-local" step="0.001" min={today + "T00:00"} /></label>
              <p>This opens a return case for follow-up. Shipment and refund are separate steps.</p>
            </div>}
            {receiptLine && usage === "NOT_YET" && <p>This part stays received and available. There is nothing to save.</p>}
          </div>}
          {taskLayout ? <details className={styles.wide}><summary>Note (optional)</summary><label>Note<input name="note" maxLength={220} /></label></details> : <label className={styles.wide}>Note (optional)<input name="note" maxLength={500} /></label>}
        </fieldset>
        <button type="submit" disabled={disabled || busy || !repairOrderId || resultBlocked || (outcomeOnly && (!receiptLine?.quantity || result?.status === "saved")) || (mode === "receipt" && usage === "NOT_YET" && !result?.retryable)}>{busy ? "Saving…" : result?.retryable ? "Retry save" : submitLabel}</button>

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
