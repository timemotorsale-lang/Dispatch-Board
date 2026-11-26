"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { currentPartsEntryDate } from "./compact-parts-entry";
import styles from "./parts-quote-workbook.module.css";

type Quote = {
  id: string; part: string; partNumber: string | null; supplier: string; supplierPhone: string | null;
  supplierContact: string | null; supplierLink: string | null; quantity: number; unitPriceCents: number;
  reference: string | null; createdAt: string; state: string;
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dated = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/Chicago" });

export function PartsQuoteWorkbook({ repairOrderId, context, vin, quotes, canWrite, closed, backHref, backLabel = "Back to repair parts tools", partsHref }: {
  repairOrderId: string; context: string; vin: string | null; quotes: Quote[]; canWrite: boolean;
  closed: boolean; backHref: string; backLabel?: string; partsHref: string;
}) {
  const router = useRouter();
  const pending = useRef(false);
  const saveAttempt = useRef<{ fingerprint: string; id: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const today = currentPartsEntryDate();
  const visible = quotes.filter(quote => [quote.part, quote.partNumber, quote.supplier, quote.supplierPhone, quote.supplierContact, quote.reference].some(value => value?.toLowerCase().includes(query.trim().toLowerCase())));

  async function submit(body: Record<string, unknown>, afterSave: () => void) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/repair-parts-quotes", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, repairOrderId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The request couldn’t be confirmed.");
      afterSave();
      setFeedback({ error: false, message: data.message });
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : "The request couldn’t be confirmed. Check the workbook before trying again." });
    } finally {
      pending.current = false;
      setBusy(false);
      router.refresh();
    }
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const quote = Object.fromEntries(new FormData(event.currentTarget));
    const fingerprint = JSON.stringify(quote);
    if (saveAttempt.current?.fingerprint !== fingerprint) saveAttempt.current = { fingerprint, id: crypto.randomUUID() };
    void submit({ action: "save", quote: { ...quote, id: saveAttempt.current.id } }, () => {
      saveAttempt.current = null;
      setAdding(false);
      setQuery("");
    });
  }

  function checkout(event: FormEvent<HTMLFormElement>, quoteId: string) {
    event.preventDefault();
    void submit({ action: "checkout", quoteId, purchasedOn: new FormData(event.currentTarget).get("purchasedOn") }, () => setSelected(null));
  }

  return <section className={styles.page} aria-labelledby="parts-quote-workbook-title">
    <Link href={backHref}>← {backLabel}</Link>
    <header className={styles.header}>
      <div>
        <h1 id="parts-quote-workbook-title">Parts search workbook</h1>
        <p>{context}{vin && <> · VIN {vin}</>}</p>
      </div>
      <div className="form-actions">
        <Link className="button button-secondary" href={partsHref}>Parts Operations</Link>
        {canWrite && !adding && <button type="button" className="button button-primary" onClick={() => { setAdding(true); setSelected(null); setFeedback(null); }}>Add quote</button>}
      </div>
    </header>
    <p className={styles.intro}>Save supplier quotes, compare prices, and record the part you actually order. Saving a quote does not create a purchase.</p>
    {feedback && <p className={styles.feedback} role={feedback.error ? "alert" : "status"}>{feedback.message}{!feedback.error && <>{ " " }<Link href={partsHref}>View parts records</Link></>}</p>}
    {!canWrite && <p role="status">{closed ? "This repair order is closed. Saved quotes are still available." : "You can view quotes. Parts editing permission is required to add quotes or record purchases."}</p>}
    {canWrite && adding && <form className={styles.panel} onSubmit={save} aria-label="Add supplier quote" aria-busy={busy}>
      <h2>Add supplier quote</h2>
      <fieldset className={styles.fields} disabled={busy}>
        <label>Part name<input name="part" required maxLength={200} /></label>
        <label>Part number (optional)<input name="partNumber" maxLength={100} /></label>
        <label>Quantity<input name="quantity" type="number" min="1" max="99999" step="1" defaultValue="1" required /></label>
        <label>Price each (USD)<input name="price" type="text" inputMode="decimal" pattern="[0-9]{1,8}(\.[0-9]{1,2})?" placeholder="0.00" required /></label>
        <label>Supplier name<input name="supplier" required maxLength={160} /></label>
        <label>Supplier phone (optional)<input name="supplierPhone" type="tel" maxLength={60} /></label>
        <details className={styles.extra}>
          <summary>Contact, link, and notes</summary>
          <div className={styles.fields}>
            <label>Contact name or email<input name="supplierContact" maxLength={160} /></label>
            <label>Supplier website or quote link<input name="supplierLink" type="url" maxLength={500} /></label>
            <label>Notes<input name="reference" maxLength={500} placeholder="Availability, shipping, or quote reference" /></label>
          </div>
        </details>
        <div className="form-actions">
          <button className="button button-primary" type="submit">{busy ? "Saving…" : "Save quote"}</button>
          <button className="button button-secondary" type="button" onClick={() => { setAdding(false); setFeedback(null); }}>Cancel</button>
        </div>
      </fieldset>
    </form>}

    <section className={styles.panel} aria-labelledby="saved-quotes">
      <div className={styles.header}>
        <div><h2 id="saved-quotes">Saved quotes</h2><p aria-live="polite">{visible.length} {visible.length === 1 ? "quote" : "quotes"}{visible.length !== quotes.length && ` of ${quotes.length}`}</p></div>
        {quotes.length > 0 && <div className={styles.filter}>
          <label>Find a saved quote<input type="search" placeholder="Part or supplier" value={query} onChange={event => setQuery(event.target.value)} /></label>
          {query && <button type="button" className="button button-secondary" onClick={() => setQuery("")}>Clear</button>}
        </div>}
      </div>
      {visible.length === 0 && <p>{query ? "No saved quotes match this search." : canWrite ? "No quotes yet. Add a supplier quote to start comparing prices." : "No quotes have been saved on this repair order."}</p>}
      {visible.length > 0 && <ul className={styles.list}>
        {visible.map(quote => {
          const resumable = quote.state === "Checkout unfinished";
          const available = quote.state === "Not ordered" || resumable;
          return <li key={quote.id} className={styles.quote}>
            <div className={styles.row}>
              <div><h3>{quote.part}</h3><p>{quote.partNumber && <>{quote.partNumber} · </>}Qty {quote.quantity}</p></div>
              <div><strong>{quote.supplier}</strong>{quote.supplierPhone && <p>{quote.supplierPhone}</p>}{quote.supplierContact && <p>{quote.supplierContact}</p>}{quote.supplierLink && <p><a href={quote.supplierLink} target="_blank" rel="noreferrer">Supplier link (opens in new tab)</a></p>}</div>
              <div><strong>{money.format(quote.unitPriceCents / 100)} each</strong><p>{money.format(quote.quantity * quote.unitPriceCents / 100)} total</p></div>
              <div><strong>{quote.state}</strong><p>{dated.format(new Date(quote.createdAt))}</p>
                {canWrite && available && selected !== quote.id && <button className="button button-secondary" type="button" disabled={busy} aria-label={`${resumable ? "Resume checkout" : "Record purchase"} for ${quote.part} from ${quote.supplier}`} onClick={() => { setSelected(quote.id); setFeedback(null); }}>{resumable ? "Resume checkout" : "Record purchase"}</button>}
              </div>
            </div>
            {quote.reference && <p className={styles.note}>{quote.reference}</p>}
            {canWrite && available && selected === quote.id && <form className={styles.confirm} aria-label="Confirm quote purchase" onSubmit={event => checkout(event, quote.id)}>
              <p>{resumable ? "Resume with the details already saved. This won’t start another purchase." : "Confirm only after you’ve placed the order. The app records it in Parts Operations and does not contact the supplier."}</p>
              <fieldset className={styles.filter} disabled={busy}>
                {!resumable && <label>Order date<input name="purchasedOn" type="date" max={today} defaultValue={today} required /></label>}
                <button type="submit" className="button button-primary">{busy ? "Saving…" : resumable ? "Resume checkout" : "Confirm purchase"}</button>
                <button type="button" className="button button-secondary" onClick={() => setSelected(null)}>Cancel</button>
              </fieldset>
            </form>}
          </li>;
        })}
      </ul>}
    </section>
  </section>;
}
