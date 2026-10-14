"use client";

import { startTransition, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import type { UnifiedCrmQuoteDraftWorkspaceModel } from "@/server/unified-crm/quote-foundation-contract";

import styles from "./unified-crm-quote-foundation.module.css";

type Props = {
  available: boolean;
  presentDetail: string;
  returnHref: string;
  workspace: UnifiedCrmQuoteDraftWorkspaceModel;
};

function createIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `quote-draft-${Date.now()}`;
}

function cents(value: string) {
  const normalized = value.trim();
  if (!normalized) return 0;
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number * 100);
}

function money(centsValue: number) {
  return (centsValue / 100).toFixed(2);
}

export function UnifiedCrmQuoteDraftForm({ available, presentDetail, returnHref, workspace }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"idle" | "error" | "success">("idle");
  const [customerId, setCustomerId] = useState(workspace.customerId ?? "");
  const [currency, setCurrency] = useState(workspace.currency);
  const [opportunityId, setOpportunityId] = useState(workspace.opportunityId ?? "");
  const [priceSource, setPriceSource] = useState(workspace.priceSource);
  const [termsSummary, setTermsSummary] = useState(workspace.termsSummary);
  const [idempotencyKey, setIdempotencyKey] = useState(() => createIdempotencyKey());
  const [lineItems, setLineItems] = useState(() => workspace.lineItems.map((item) => ({
    description: item.description,
    id: item.id,
    quantity: String(item.quantity),
    unitPrice: money(item.unitPriceCents)
  })));

  const submitHref = workspace.quoteId
    ? `/api/crm/v1/quotes/${encodeURIComponent(workspace.quoteId)}/draft`
    : "/api/crm/v1/quotes";

  const selectedQuoteHref = workspace.quoteId
    ? `${pathname}?crmReturnTo=${encodeURIComponent(returnHref)}&quoteId=${encodeURIComponent(workspace.quoteId)}`
    : null;

  const subtotalCents = lineItems.reduce((sum, item) => sum + (Number(item.quantity || "0") * cents(item.unitPrice)), 0);

  function updateLineItem(id: string, field: "description" | "quantity" | "unitPrice", value: string) {
    setLineItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  function addLineItem() {
    setLineItems((current) => [...current, {
      description: "",
      id: `new-line-${current.length + 1}`,
      quantity: "1",
      unitPrice: "0.00"
    }]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setTone("idle");
    setMessage(null);

    try {
      const response = await fetch(submitHref, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currency,
          customerId,
          expectedVersionNumber: workspace.expectedVersionNumber,
          idempotencyKey,
          lineItems: lineItems.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unitPriceCents: cents(item.unitPrice)
          })),
          opportunityId,
          priceSource,
          termsSummary
        })
      });
      const payload = await response.json().catch(() => null) as { duplicate?: boolean; error?: string; quoteId?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Quote draft could not be saved right now.");

      setTone("success");
      setMessage(payload?.duplicate
        ? "This draft was already saved. Refreshing the workspace…"
        : "Quote draft saved. Refreshing the workspace…");
      setIdempotencyKey(createIdempotencyKey());
      const nextHref = `${pathname}?crmReturnTo=${encodeURIComponent(returnHref)}&quoteId=${encodeURIComponent(payload?.quoteId ?? workspace.quoteId ?? "")}`;
      startTransition(() => {
        router.push(nextHref);
        router.refresh();
      });
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Quote draft could not be saved right now.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.section} aria-labelledby="quote-draft-heading">
      <span className={styles.eyebrow}>Draft workspace</span>
      <div className={styles.commandPanel}>
        <header className={styles.commandHeader}>
          <div>
            <h2 id="quote-draft-heading">{workspace.mode === "REVISE" ? `Revise ${workspace.quoteNumber}` : "Start a new quote draft"}</h2>
            <p>{workspace.detail}</p>
            <small>{workspace.customerLabel} · {workspace.opportunityLabel}</small>
          </div>
          <div className={styles.commandMeta}>
            <span className={workspace.state === "READY" ? styles.stateTag : styles.heldTag}>{workspace.state}</span>
            <span className={styles.heldTag}>Presentation held</span>
          </div>
        </header>

        {message ? <p className={tone === "error" ? styles.formError : styles.formSuccess} role={tone === "error" ? "alert" : "status"}>{message}</p> : null}

        {!available ? (
          <div className={styles.commandFallback}>
            <p>{workspace.detail}</p>
            <p>{presentDetail}</p>
            <div className={styles.stateActions}>
              {selectedQuoteHref ? <Link href={selectedQuoteHref}>Review this quote</Link> : null}
              <Link href={returnHref}>Return to CRM</Link>
            </div>
          </div>
        ) : (
          <form className={styles.quoteDraftForm} onSubmit={(event) => void submit(event)}>
            <div className={styles.fieldGrid}>
              <label>
                <span>Customer ID</span>
                <input onChange={(event) => setCustomerId(event.target.value)} placeholder="Optional customer id" value={customerId} />
              </label>
              <label>
                <span>Opportunity ID</span>
                <input onChange={(event) => setOpportunityId(event.target.value)} placeholder="Optional opportunity id" value={opportunityId} />
              </label>
              <label>
                <span>Currency</span>
                <input maxLength={3} onChange={(event) => setCurrency(event.target.value.toUpperCase())} required value={currency} />
              </label>
              <label>
                <span>Price source</span>
                <input onChange={(event) => setPriceSource(event.target.value)} required value={priceSource} />
              </label>
            </div>

            <label className={styles.wideField}>
              <span>Terms summary</span>
              <textarea onChange={(event) => setTermsSummary(event.target.value)} required rows={3} value={termsSummary} />
            </label>

            <div className={styles.lineItemList}>
              {lineItems.map((item, index) => (
                <div className={styles.lineItemRow} key={item.id}>
                  <label className={styles.lineItemDescription}>
                    <span>Line {index + 1}</span>
                    <input onChange={(event) => updateLineItem(item.id, "description", event.target.value)} required value={item.description} />
                  </label>
                  <label>
                    <span>Qty</span>
                    <input min="1" onChange={(event) => updateLineItem(item.id, "quantity", event.target.value)} required type="number" value={item.quantity} />
                  </label>
                  <label>
                    <span>Unit price</span>
                    <input min="0" onChange={(event) => updateLineItem(item.id, "unitPrice", event.target.value)} required step="0.01" type="number" value={item.unitPrice} />
                  </label>
                </div>
              ))}
            </div>

            <div className={styles.draftActions}>
              <button disabled={pending} onClick={addLineItem} type="button">Add line item</button>
              <strong>Subtotal ${(subtotalCents / 100).toFixed(2)}</strong>
            </div>

            <div className={styles.draftActions}>
              <button disabled={pending} type="submit">{pending ? "Saving draft…" : workspace.mode === "REVISE" ? "Save new draft version" : "Save draft"}</button>
              <span className={styles.interactionActionNote}>Saving a draft does not present it to the customer or request approval.</span>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
