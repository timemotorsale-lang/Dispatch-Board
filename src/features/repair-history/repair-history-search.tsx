"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  RepairHistoryItem,
  RepairHistoryKind,
  RepairHistoryResult,
  RepairHistoryState,
} from "@/lib/repair-history";
import styles from "./repair-history-search.module.css";

type Props = {
  initialQuery?: string;
  initialVehicleId?: string;
  initialCustomerId?: string;
  linkTarget?: "_blank";
};

const kinds: Record<RepairHistoryKind, string> = {
  ALL: "All kinds",
  DRAFT: "Drafts",
  ESTIMATE: "Estimates",
  INVOICE: "Invoices",
  RECEIPT: "Receipts",
};

const documentLabels: Readonly<Record<string, string>> = {
  ESTIMATE: "Estimate",
  LEGACY_ESTIMATE: "Legacy estimate",
  RO: "Repair order",
  AUTHORIZATION: "Authorization",
  INVOICE: "Invoice",
  INVOICE_PACKAGE: "Invoice preparation record",
  LEGACY_INVOICE: "Invoice record (no archived document)",
  LEGACY_RECEIPT: "Payment record (no archived receipt)",
  RECEIPT: "Receipt",
  PAYMENT: "Payment receipt",
  REFUND: "Refund receipt",
  CREDIT: "Credit receipt",
  VOID: "Void receipt",
};

const documentDateCaptions: Readonly<Record<string, string>> = {
  INVOICE_PACKAGE: "Prepared",
  LEGACY_INVOICE: "Recorded",
  LEGACY_RECEIPT: "Recorded",
};

const states: Record<RepairHistoryState, string> = { ALL: "All statuses", OPEN: "Open", CLOSED: "Closed" };

type Filters = {
  query: string;
  kind: RepairHistoryKind;
  state: RepairHistoryState;
};

type Search = Filters & { page: number };

const loadError = "Could not load saved repair work. Try again.";
const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function Timestamp({ value }: { value: string }) {
  const date = new Date(value);
  return (
    <time dateTime={value}>
      {Number.isNaN(date.getTime()) ? value : `${dateFormat.format(date)} UTC`}
    </time>
  );
}

function RepairHistoryCard({ item, linkTarget }: { item: RepairHistoryItem; linkTarget: Props["linkTarget"] }) {
  const linkProps = { target: linkTarget, rel: linkTarget ? "noopener noreferrer" : undefined };

  return (
    <li className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <strong>{item.number} · {item.title}</strong>
          <div className={styles.metadata}>
            <span>{item.customer}</span>
            <span>{item.vehicle}</span>
            {item.vin && <span>VIN {item.vin}</span>}
            {item.stockNumber && <span>Stock {item.stockNumber}</span>}
          </div>
          <div className={styles.metadata}>
            <span>{item.status}</span>
            <span>Updated <Timestamp value={item.updatedAt} /></span>
          </div>
        </div>
        <a {...linkProps} href={item.href} aria-label={`Open original record ${item.number}`}>Open record</a>
      </div>
      {(item.documents.length > 0 || item.drafts.length > 0) && (
        <ul className={styles.related}>
          {item.documents.map((document) => (
            <li key={`document-${document.id}-${document.version}`}>
              <a {...linkProps} href={document.href}>{documentLabels[document.kind] ?? document.kind} {document.number} · v{document.version}</a>
              <span>{documentDateCaptions[document.kind] ?? "Issued"} <Timestamp value={document.issuedAt} /></span>
            </li>
          ))}
          {item.drafts.map((draft) => (
            <li key={`draft-${draft.id}`}><a {...linkProps} href={draft.href}>Open {draft.label}</a></li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function RepairHistorySearch(props: Props) {
  const context = JSON.stringify([props.initialQuery, props.initialVehicleId, props.initialCustomerId]);
  return <RepairHistoryDirectory key={context} {...props} />;
}

function RepairHistoryDirectory({ initialQuery = "", initialVehicleId, initialCustomerId, linkTarget }: Props) {
  const [filters, setFilters] = useState<Filters>({ query: initialQuery, kind: "ALL", state: "ALL" });
  const [result, setResult] = useState<{ data: RepairHistoryResult; search: Search }>();
  const [failure, setFailure] = useState<{ message: string; search: Search }>();
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  const lastSearch = useRef<Search>({ ...filters, page: 1 });

  useEffect(() => () => request.current?.abort(), []);

  async function load(search: Search) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    lastSearch.current = search;
    setLoading(true);
    setFailure(undefined);

    const params = new URLSearchParams({
      query: search.query,
      kind: search.kind,
      state: search.state,
      page: String(search.page),
      pageSize: "20",
    });
    if (initialVehicleId) params.set("vehicleId", initialVehicleId);
    if (initialCustomerId) params.set("customerId", initialCustomerId);

    try {
      const response = await fetch(`/api/repair-history?${params}`, { signal: controller.signal });
      if (!response.ok) {
        let message = loadError;
        if (response.status === 403) {
          const body = await response.json().catch(() => null);
          const detail = body?.error ?? body?.message;
          message = typeof detail === "string" && detail.trim()
            ? detail
            : "You do not have access to saved repair work.";
        }
        if (!controller.signal.aborted) setFailure({ message, search });
        return;
      }

      const data: RepairHistoryResult = await response.json();
      if (!controller.signal.aborted) setResult({ data, search });
    } catch {
      if (!controller.signal.aborted) setFailure({ message: loadError, search });
    } finally {
      if (request.current === controller) {
        request.current = null;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void load({ ...filters, page: 1 });
  }

  return (
    <details className={styles.directory} onToggle={(event) => {
      if (!event.currentTarget.open) {
        request.current?.abort();
        request.current = null;
        setLoading(false);
      } else if (!result && !failure && !request.current) {
        void load(lastSearch.current);
      }
    }}>
      <summary>Find saved repair work</summary>
      <div className={styles.content}>
        <form className={styles.filters} onSubmit={submit}>
          <label>
            Search repair history
            <input type="search" value={filters.query} placeholder="Number, customer, vehicle, VIN or stock"
              onChange={(event) => setFilters({ ...filters, query: event.target.value })} />
          </label>
          <label>
            Record kind
            <select value={filters.kind} onChange={(event) => setFilters({ ...filters, kind: event.target.value as Search["kind"] })}>
              {Object.entries(kinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>
            Status
            <select value={filters.state} onChange={(event) => setFilters({ ...filters, state: event.target.value as Search["state"] })}>
              {Object.entries(states).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button className={styles.search} type="submit">Search</button>
        </form>

        <div role="status" className={styles.status}>
          {loading ? "Loading saved repair work…" : result?.data.items.length === 0 && !failure
            ? "No saved repair work matches these filters."
            : null}
        </div>
        {failure && (
          <div className={styles.error}>
            <p role="alert">{failure.message}{result && " Showing the last loaded results."}</p>
            <button type="button" onClick={() => void load(failure.search)}>Retry</button>
          </div>
        )}
        {result && (
          <div aria-busy={loading}>
            <ul className={styles.results}>
              {result.data.items.map((item) => <RepairHistoryCard key={`${item.source}-${item.id}`} item={item} linkTarget={linkTarget} />)}
            </ul>
            {(result.data.page > 1 || result.data.hasMore) && (
              <nav className={styles.pages} aria-label="Repair history pages">
                <button type="button" disabled={loading || result.data.page <= 1}
                  onClick={() => void load({ ...result.search, page: result.data.page - 1 })}>Previous</button>
                <span>Page {result.data.page}</span>
                <button type="button" disabled={loading || !result.data.hasMore}
                  onClick={() => void load({ ...result.search, page: result.data.page + 1 })}>Next</button>
              </nav>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
