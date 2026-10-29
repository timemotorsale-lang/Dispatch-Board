"use client";
import type { EstimatePartItem } from "./estimate";
import { itemizedPartsTotal } from "./estimate";
import styles from "./parts-breakdown.module.css";

export function PartsBreakdown({ items, onChange }: { items: EstimatePartItem[]; onChange: (items: EstimatePartItem[]) => void }) {
  const total = itemizedPartsTotal(items);
  function update(id: string, patch: Partial<EstimatePartItem>) { onChange(items.map(item => item.id === id ? { ...item, ...patch } : item)); }
  return <section className={styles.breakdown} aria-label="Itemized parts">
    {items.map((item, index) => <div className={styles.row} key={item.id}>
      <label>Description<input aria-label={`Part ${index + 1} description`} maxLength={200} placeholder="e.g. Front brake pads" value={item.name} onChange={event => update(item.id, { name: event.target.value })} /></label>
      <label>Part number<input aria-label={`Part ${index + 1} number`} maxLength={100} value={item.number} onChange={event => update(item.id, { number: event.target.value })} /></label>
      <label>Qty<input aria-label={`Part ${index + 1} quantity`} type="number" min="1" max="10000" step="1" value={item.quantity} onChange={event => { const quantity = Number(event.target.value); if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 10000) update(item.id, { quantity }); }} /></label>
      <label>Unit price ($)<input aria-label={`Part ${index + 1} unit price`} type="number" min="0" max="100000" step="0.01" value={item.unitPrice ?? ""} onChange={event => { const unitPrice = event.target.value === "" ? null : Number(event.target.value); if (unitPrice === null || Number.isFinite(unitPrice) && unitPrice >= 0 && unitPrice <= 100000) update(item.id, { unitPrice }); }} /></label>
      <span>{item.unitPrice === null ? "Price needed" : `$${(Math.round(item.unitPrice * 100) * item.quantity / 100).toFixed(2)}`}</span>
      <button type="button" aria-label={`Remove part ${index + 1}`} onClick={() => onChange(items.filter(part => part.id !== item.id))}>Remove</button>
    </div>)}
    <footer><button type="button" disabled={items.length >= 100} onClick={() => onChange([...items, { id: crypto.randomUUID(), name: "", number: "", quantity: 1, unitPrice: null }])}>Add part</button><strong>Parts total: {total === null ? "Enter prices" : `$${total.toFixed(2)}`}</strong></footer>
  </section>;
}
