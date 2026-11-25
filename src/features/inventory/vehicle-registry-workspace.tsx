"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { VehicleWorkToolkit } from "./vehicle-work-actions";
import type { VehicleWorkActions } from "@/lib/repair-resume";
import type { getVehicleRegistryToolAccess } from "@/server/vehicle-registry/service";
import styles from "./vehicle-registry-workspace.module.css";

type VehicleListItem = {
  id: string;
  vehicleNumber: string;
  vin: string | null;
  vinRaw: string | null;
  vinState: string;
  stockNumber: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  color: string | null;
  licensePlate: string | null;
  status: string;
  version: number;
  updatedAt: string;
  work?: VehicleWorkActions;
  _count: { duplicateCasesAsCandidate: number; duplicateCasesAsPrimary: number };
};

type RegistryList = {
  items: VehicleListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type Detail = VehicleListItem & {
  nonVinReason: string | null;
  registryRelationships: Array<{
    id: string;
    relationshipType: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    customer: { displayName: string; customerNumber: string } | null;
  }>;
  externalIdentities: Array<{
    id: string;
    systemCode: string;
    externalId: string;
    authority: string;
    conflictStatus: string;
  }>;
  odometerObservations: Array<{
    id: string;
    reading: number;
    unit: string;
    observedAt: string;
    status: string;
    exceptionReason: string | null;
  }>;
  custodyEvents: Array<{
    id: string;
    eventType: string;
    occurredAt: string;
    positionLabel: string | null;
    custodianType: string;
    location: { name: string } | null;
  }>;
  duplicateCasesAsPrimary: Array<{
    id: string;
    status: string;
    candidateVehicle: { id: string; vehicleNumber: string; vinRaw: string | null; stockNumber: string | null };
  }>;
  duplicateCasesAsCandidate: Array<{
    id: string;
    status: string;
    primaryVehicle: { id: string; vehicleNumber: string; vinRaw: string | null; stockNumber: string | null };
  }>;
};

const emptyIdentity = {
  vehicleNumber: "",
  vin: "",
  nonVinReason: "",
  stockNumber: "",
  year: "",
  make: "",
  model: "",
  color: "",
  licensePlate: ""
};

const emptyVehicle = {
  ...emptyIdentity,
  initialOdometerMiles: "",
  initialCustodyPosition: ""
};

const identityFieldLabels: Record<keyof typeof emptyVehicle, string> = {
  color: "Color",
  initialCustodyPosition: "Initial location / bay",
  initialOdometerMiles: "Mileage",
  licensePlate: "License plate",
  make: "Make",
  model: "Model",
  nonVinReason: "Non-VIN reason",
  stockNumber: "Stock number",
  vehicleNumber: "Vehicle number",
  vin: "VIN",
  year: "Year"
};

const createFieldOrder: Array<keyof typeof emptyVehicle> = [
  "vehicleNumber",
  "vin",
  "stockNumber",
  "year",
  "make",
  "model",
  "color",
  "licensePlate",
  "initialOdometerMiles",
  "initialCustodyPosition",
  "nonVinReason"
];

const vehicleColors = new Set([
  "beige",
  "black",
  "blue",
  "brown",
  "gold",
  "gray",
  "green",
  "grey",
  "maroon",
  "orange",
  "purple",
  "red",
  "silver",
  "tan",
  "teal",
  "white",
  "yellow"
]);

function toTitleCase(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b[a-z]/g, (match) => match.toUpperCase());
}

function normalizeVinForStock(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function deriveStockNumberFromVin(value: string | null | undefined) {
  const vin = value ? normalizeVinForStock(value) : "";
  return vin.length === 17 ? vin.slice(-6) : "";
}

export function parseQuickVehicleIdentity(value: string): Partial<typeof emptyVehicle> {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return {};

  const result: Partial<typeof emptyVehicle> = {};
  const yearMatch = normalized.match(/\b(19\d{2}|20\d{2})\b/);
  const vinMatch = normalized.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i);
  const mileageMatch = normalized.match(/\b([\d,]{2,})\s*(?:mi|mile|miles|odometer)\b/i);
  const locationMatch = normalized.match(/\b(?:located\s+at|location\s+at|at)\s+(.+)$/i);

  if (yearMatch) result.year = yearMatch[1];
  if (vinMatch) {
    result.vin = normalizeVinForStock(vinMatch[0]);
    result.stockNumber = deriveStockNumberFromVin(result.vin);
  }
  if (mileageMatch) result.initialOdometerMiles = mileageMatch[1].replaceAll(",", "");
  if (locationMatch) {
    result.initialCustodyPosition = toTitleCase(locationMatch[1].replace(/[.,;]+$/g, ""));
  }

  const identityText = normalized
    .replace(/\bwith\s+[\d,]{2,}\s*(?:mi|mile|miles|odometer)\b/i, " ")
    .replace(/\b[\d,]{2,}\s*(?:mi|mile|miles|odometer)\b/i, " ")
    .replace(/\b[A-HJ-NPR-Z0-9]{17}\b/i, " ")
    .replace(/\b(?:vehicle\s+)?(?:is\s+)?(?:located\s+at|location\s+at|at)\s+.+$/i, " ")
    .replace(/[.,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const afterYear = yearMatch ? identityText.slice(identityText.indexOf(yearMatch[1]) + yearMatch[1].length).trim() : identityText;
  const tokens = afterYear.split(" ").filter(Boolean);
  const colorIndex = tokens.findLastIndex((token) => vehicleColors.has(token.toLowerCase()));
  const identityTokens = colorIndex >= 0 ? tokens.slice(0, colorIndex) : tokens;

  if (colorIndex >= 0) result.color = toTitleCase(tokens[colorIndex]);
  if (identityTokens[0]) result.make = toTitleCase(identityTokens[0]);
  if (identityTokens.length > 1) result.model = toTitleCase(identityTokens.slice(1).join(" "));

  return result;
}

function editableIdentity(vehicle: Detail | null) {
  return vehicle
    ? {
        vehicleNumber: vehicle.vehicleNumber,
        vin: vehicle.vinRaw ?? vehicle.vin ?? "",
        nonVinReason: vehicle.nonVinReason ?? "",
        stockNumber: vehicle.stockNumber ?? "",
        year: vehicle.year ? String(vehicle.year) : "",
        make: vehicle.make ?? "",
        model: vehicle.model ?? "",
        color: vehicle.color ?? "",
        licensePlate: vehicle.licensePlate ?? ""
      }
    : emptyIdentity;
}

function vehicleTitle(vehicle: Pick<VehicleListItem, "make" | "model" | "vehicleNumber" | "year">) {
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber;
}

function isMutationDisabled(message: string) {
  return message.includes("not enabled") || message.includes("MASTER_DISABLED");
}

export function VehicleRegistryWorkspace({
  initial,
  initialQuery = "",
  initialPage = 1,
  initialSelected = null,
  initialNotice = "",
  access
}: {
  initial: RegistryList | null;
  initialQuery?: string;
  initialPage?: number;
  initialSelected?: Detail | null;
  initialNotice?: string;
  access?: Awaited<ReturnType<typeof getVehicleRegistryToolAccess>>;
}) {
  const [list, setList] = useState(initial);
  const [query, setQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [searching, setSearching] = useState(false);
  const [failedPage, setFailedPage] = useState(initial ? null : initialPage);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Detail | null>(initialSelected);
  const [quickCreateText, setQuickCreateText] = useState("");
  const [vehicle, setVehicle] = useState(emptyVehicle);
  const [correction, setCorrection] = useState(editableIdentity(initialSelected));
  const [notice, setNotice] = useState(initialNotice);
  const [observationFollowUpId, setObservationFollowUpId] = useState<string | null>(null);
  const [registryLocked, setRegistryLocked] = useState(false);
  const [busy, setBusy] = useState(false);

  async function request(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Vehicle registry request failed.");
    return body;
  }

  function handleError(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    if (isMutationDisabled(message)) {
      setRegistryLocked(true);
      setNotice("Registry updates are currently locked. You can still inspect the vehicle and open the live workspace from here.");
      return;
    }
    setNotice(message);
  }

  async function load(id: string) {
    setBusy(true);
    try {
      const detail = await request(`/api/vehicles/${id}`) as Detail;
      setSelected(detail);
      setCorrection(editableIdentity(detail));
      setNotice("");
    } catch (error) {
      handleError(error, "Unable to load vehicle.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh(search = activeQuery, page = list?.page ?? 1) {
    const term = search.trim();
    setSearching(true);
    setActiveQuery(term);
    setFailedPage(null);
    try {
      const body = await request(`/api/vehicles?${new URLSearchParams({ includeWork: "1", query: term, page: String(page) })}`) as RegistryList;
      if (!Array.isArray(body.items) || typeof body.total !== "number") throw new Error("Invalid search response.");
      setList(body);
      if (!body.items.some((item) => item.id === selected?.id)) {
        setSelected(null);
      }
    } catch {
      setList(null);
      setFailedPage(page);
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setQuery("");
    inputRef.current?.focus();
    void refresh("", 1);
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (busy || searching || registryLocked || !access?.createIdentity) return;
    const { initialCustodyPosition: enteredPosition, initialOdometerMiles: enteredMileage, ...identity } = vehicle;
    const initialCustodyPosition = access.correctIdentity ? enteredPosition.trim() : "";
    const initialOdometerMiles = access.correctIdentity ? enteredMileage.trim() : "";
    if (initialOdometerMiles && (!/^\d+$/.test(initialOdometerMiles) || Number(initialOdometerMiles) > 2_147_483_647)) {
      setNotice("Enter mileage as a non-negative whole number before saving.");
      return;
    }
    setBusy(true);
    setNotice("");
    setObservationFollowUpId(null);
    let createdId: string | undefined;
    try {
      const body = await request("/api/vehicles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...identity,
          stockNumber: identity.stockNumber.trim() || undefined,
          year: vehicle.year || null,
          rejectDuplicateIdentity: true,
          idempotencyKey: crypto.randomUUID(),
          reason: "Create canonical vehicle registry identity.",
          workflowContext: {
            initialCustodyPosition: initialCustodyPosition || null,
            initialOdometerMiles: initialOdometerMiles || null,
            source: "INVENTORY_CONSOLE_CREATE_IDENTITY"
          }
        })
      });
      createdId = body.result?.id as string | undefined;
      if (createdId && initialOdometerMiles) {
        const detail = await request(`/api/vehicles/${createdId}`) as Detail;
        await request(`/api/vehicles/${createdId}/commands`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "RECORD_ODOMETER",
            expectedVersion: detail.version,
            idempotencyKey: crypto.randomUUID(),
            observedAt: new Date().toISOString(),
            reading: Number(initialOdometerMiles),
            reason: "Record initial mileage during canonical identity creation.",
            sourceCode: "MANAGER_UI",
            unit: "MILES"
          })
        });
      }
      if (createdId && initialCustodyPosition) {
        const detail = await request(`/api/vehicles/${createdId}`) as Detail;
        await request(`/api/vehicles/${createdId}/commands`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "RECORD_CUSTODY",
            custodianType: "DEALERSHIP",
            eventType: "CHECK_IN",
            expectedVersion: detail.version,
            idempotencyKey: crypto.randomUUID(),
            occurredAt: new Date().toISOString(),
            positionLabel: initialCustodyPosition,
            reason: "Record initial vehicle location during canonical identity creation.",
            sourceCode: "MANAGER_UI"
          })
        });
      }
      setVehicle(emptyVehicle);
      await refresh();
      if (createdId) await load(createdId);
      setNotice("Vehicle identity created.");
    } catch (error) {
      if (createdId) {
        setVehicle(emptyVehicle);
        setObservationFollowUpId(createdId);
        setNotice("Vehicle identity saved. Check which mileage or location updates are still missing in Vehicle 360.");
        await refresh();
      } else {
        handleError(error, "Unable to create vehicle.");
      }
    } finally {
      setBusy(false);
    }
  }

  function fillCreateFromQuickText() {
    const parsed = parseQuickVehicleIdentity(quickCreateText);
    if (!Object.keys(parsed).length) {
      setNotice("Enter a quick vehicle description first, then fill the form.");
      return;
    }
    setVehicle((current) => ({ ...current, ...parsed, stockNumber: current.stockNumber }));
    setNotice("Quick intake filled the fields it could read. Review, add VIN/stock/plate if available, then validate and create.");
  }

  function updateCreateField(key: keyof typeof emptyVehicle, value: string) {
    setVehicle((current) => ({ ...current, [key]: value }));
  }

  function updateCorrectionField(key: keyof typeof emptyIdentity, value: string) {
    setCorrection((current) => ({ ...current, [key]: value }));
  }

  async function correctIdentity() {
    if (!selected) return;
    setBusy(true);
    try {
      const body = await request(`/api/vehicles/${selected.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...correction,
          year: correction.year || null,
          expectedVersion: selected.version,
          idempotencyKey: crypto.randomUUID(),
          reason: "Correct canonical vehicle identity after manager review."
        })
      });
      setNotice(body.result?.identityChanged === false ? "Correction was held for duplicate review." : "Vehicle identity was revalidated and corrected.");
      await load(selected.id);
      await refresh();
    } catch (error) {
      handleError(error, "Unable to correct identity.");
    } finally {
      setBusy(false);
    }
  }

  async function command(action: string, data: Record<string, unknown>) {
    if (!selected) return;
    setBusy(true);
    try {
      await request(`/api/vehicles/${selected.id}/commands`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          expectedVersion: selected.version,
          idempotencyKey: crypto.randomUUID(),
          reason: `Record ${action.toLowerCase().replaceAll("_", " ")} in the canonical registry.`,
          ...data
        })
      });
      setNotice("Vehicle registry command completed.");
      await load(selected.id);
      await refresh();
    } catch (error) {
      handleError(error, "Vehicle command failed.");
    } finally {
      setBusy(false);
    }
  }

  const duplicateCases = selected ? [...selected.duplicateCasesAsPrimary, ...selected.duplicateCasesAsCandidate].filter((item) => item.status === "OPEN") : [];
  const mutationNotice = registryLocked || isMutationDisabled(notice);
  const returnParams = new URLSearchParams({ ...(activeQuery && { query: activeQuery }), ...(list && list.page > 1 && { page: String(list.page) }) });
  const searchHref = returnParams.size ? `/vehicles/registry?${returnParams}` : "/vehicles/registry";
  const vin = activeQuery.toUpperCase();
  const serviceOnly = !access?.add && Boolean(access?.serviceLocations.length);
  const addHref = `/vehicles/workflows/add-vehicle?${new URLSearchParams({ returnTo: searchHref, ...(/^[A-HJ-NPR-Z0-9]{17}$/.test(vin) && { vin }), ...(serviceOnly && { intent: "service" }) })}`;
  const hasTools = access && (access.createIdentity && !registryLocked || access.importCsv || access.importDocuments || access.export);

  return (
    <section className={`page-stack ${styles.workspace}`}>
      <header className={styles.heading}>
        <h1>Find Work / Vehicle</h1>
        <Link href="/vehicles/inventory">Inventory Lifecycle</Link>
      </header>

      {notice ? (
        <div role="status" className={mutationNotice ? "notice notice-warning" : "notice notice-info"}>
          <p>{notice}</p>
          {observationFollowUpId && <Link className={styles.secondary} href={`/vehicles/360/${encodeURIComponent(observationFollowUpId)}`}>Review saved vehicle</Link>}
          {mutationNotice && selected ? (
            <div className="form-actions">
              <Link className={styles.secondary} href={`/vehicles/360/${encodeURIComponent(selected.id)}`}>Open Vehicle 360</Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <section className={styles.searchPanel}>
        <form role="search" aria-label="Vehicle search" onSubmit={(event) => { event.preventDefault(); if (!busy && !searching) void refresh(query, 1); }}>
          <label htmlFor="vehicle-registry-query">Search vehicles</label>
          <div className={styles.searchRow}>
            <div className={styles.searchField}>
              <input autoComplete="off" id="vehicle-registry-query" onChange={(event) => setQuery(event.target.value)} placeholder="VIN, stock, plate, vehicle or customer" ref={inputRef} value={query} />
              {(query || activeQuery) && <button disabled={busy || searching} onClick={clearSearch} type="button">Clear</button>}
            </div>
            <button className={styles.primary} disabled={busy || searching} type="submit">Search</button>
          </div>
        </form>
        <p className={styles.count} role="status">
          {searching ? "Searching…" : list ? activeQuery ? `${list.total} vehicle match${list.total === 1 ? "" : "es"} for "${activeQuery}"` : `${list.total} vehicle${list.total === 1 ? "" : "s"}` : null}
        </p>
      </section>

      <div className={styles.layout}>
        <section aria-label="Vehicle search results" aria-busy={searching} className={styles.registry}>
          {failedPage !== null ? <div className={styles.empty}>
            <div role="alert"><h2>Couldn’t search vehicles</h2><p>Results are unavailable. Try the search again.</p></div>
            <button className={styles.primary} onClick={() => { setQuery(activeQuery); void refresh(activeQuery, failedPage); }} type="button">Retry search</button>
          </div> : !searching && list ? list.items.length ? <>
            <ul className={styles.results} role="list">{list.items.map(item => (
              <li className={styles.result} key={item.id}>
                <div className={styles.identity}>
                  <strong>{vehicleTitle(item)}</strong>
                  <span>{[item.vehicleNumber, item.stockNumber && `Stock ${item.stockNumber}`, item.licensePlate && `Plate ${item.licensePlate}`].filter(Boolean).join(" · ")}</span>
                  {item.vin && <span>VIN {item.vin}</span>}
                  {item.status !== "ACTIVE" && <span className={styles.badge}>{item.status.toLowerCase().replaceAll("_", " ")}</span>}
                  {item._count.duplicateCasesAsCandidate + item._count.duplicateCasesAsPrimary > 0 && <span className={styles.badge}>Duplicate review</span>}
                </div>
                <div className={styles.resultActions}>
                  <VehicleWorkToolkit preferSale work={item.work} vehicleId={item.id} returnTo={searchHref} returnLabel="Back to vehicle search" />
                  <button aria-label={`Registry record for ${vehicleTitle(item)}`} aria-expanded={selected?.id === item.id} className={styles.previewLink} disabled={busy} onClick={() => selected?.id === item.id ? setSelected(null) : void load(item.id)} type="button">Registry record</button>
                </div>
              </li>
            ))}</ul>
            {list.totalPages > 1 && <nav aria-label="Vehicle result pages" className={styles.actions}>
              <button className={styles.secondary} disabled={busy || list.page <= 1} onClick={() => void refresh(activeQuery, list.page - 1)} type="button">Previous</button>
              <span>Page {list.page} of {list.totalPages}</span>
              <button className={styles.secondary} disabled={busy || list.page >= list.totalPages} onClick={() => void refresh(activeQuery, list.page + 1)} type="button">Next</button>
            </nav>}
          </> : <div className={styles.empty}>
            <h2>{list.total ? "No vehicles on this page" : activeQuery ? "No matching vehicle found" : "No vehicles found"}</h2>
            <p>{list.total ? "Return to the first page to see available vehicles." : activeQuery ? "Try a shorter VIN, stock number, plate, or vehicle name." : "Search by VIN, stock number, plate, or vehicle name."}</p>
            <div className={styles.actions}>
              {list.total ? <button className={styles.primary} onClick={() => void refresh(activeQuery, 1)} type="button">First page</button> : <>
                {activeQuery && <button className={styles.secondary} onClick={clearSearch} type="button">Clear search</button>}
                {query.trim() === activeQuery && (access?.add || serviceOnly) && <Link className={styles.primary} href={addHref}>{serviceOnly ? "Check & add for service" : "Check & add vehicle"}</Link>}
              </>}
            </div>
          </div> : null}
        </section>

        {selected && !searching ? <section aria-label="Registry record" className={styles.preview}>
            <div className="page-stack">
              <div className="page-copy">
                <span className="eyebrow">Version {selected.version}</span>
                <h2>{selected.vehicleNumber}</h2>
                <p>{[selected.year, selected.make, selected.model, selected.color].filter(Boolean).join(" · ")}</p>
              </div>
              <dl className="etw-facts compact">
                <div><dt>VIN</dt><dd>{selected.vin ?? selected.vinRaw ?? selected.nonVinReason ?? "Not recorded"}</dd></div>
                <div><dt>Stock</dt><dd>{selected.stockNumber ?? "Not recorded"}</dd></div>
                <div><dt>Plate</dt><dd>{selected.licensePlate ?? "Not recorded"}</dd></div>
                <div><dt>Current custody</dt><dd>{selected.custodyEvents[0]?.location?.name ?? selected.custodyEvents[0]?.positionLabel ?? "No custody event"}</dd></div>
                <div><dt>Latest odometer</dt><dd>{selected.odometerObservations[0] ? `${selected.odometerObservations[0].reading.toLocaleString()} ${selected.odometerObservations[0].unit}` : "No observation"}</dd></div>
              </dl>
              <div className="form-actions">
                <Link className={styles.secondary} href={`/vehicles/360/${encodeURIComponent(selected.id)}`}>Open Vehicle 360</Link>
              </div>
              <div>
                <h3>Relationships and external identities</h3>
                {selected.registryRelationships.map((item) => <p key={item.id}>{item.relationshipType} · {item.customer?.displayName ?? "Dealership"}</p>)}
                {selected.externalIdentities.map((item) => <p key={item.id}>{item.systemCode}: {item.externalId} · {item.conflictStatus}</p>)}
              </div>
              {duplicateCases.length ? (
                <div className="notice notice-warning">
                  <h3>Duplicate review</h3>
                  {duplicateCases.map((item) => (
                    <div className="form-actions" key={item.id}>
                      <span>{"candidateVehicle" in item ? item.candidateVehicle.vehicleNumber : item.primaryVehicle.vehicleNumber}</span>
                      {access?.resolveDuplicates && !registryLocked && <>
                        <button className={styles.secondary} disabled={busy} onClick={() => command("RESOLVE_DUPLICATE", { caseId: item.id, resolution: "CONFIRMED_DISTINCT" })} type="button">Confirm distinct</button>
                        <button className={styles.secondary} disabled={busy} onClick={() => command("RESOLVE_DUPLICATE", { caseId: item.id, resolution: "MERGED" })} type="button">Merge with lineage</button>
                      </>}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
        </section> : null}
      </div>

      {(hasTools || (selected && access?.correctIdentity && !registryLocked)) && <details className={styles.tools}>
        <summary>More tools</summary>
        <div className={styles.actions}>
          {access?.importCsv && <Link href="/vehicles/import-export?mode=import">Import vehicles</Link>}
          {access?.importDocuments && <Link href="/vehicles/import-export?mode=import&kind=documents">Import purchase documents</Link>}
          {access?.export && <Link href="/vehicles/import-export">Export inventory</Link>}
        </div>
        {access?.createIdentity && !registryLocked && <details className={styles.tools}>
          <summary>Create vehicle identity</summary>
          <form className="page-stack" onSubmit={submitCreate}>
          <div className="page-copy">
            <p>{access.correctIdentity ? "Record vehicle identity, mileage and current location." : "Record vehicle identity."}</p>
          </div>
          <div className="inventory-quick-create">
            <label className="form-field">
              <span>Quick add from description</span>
              <textarea
                disabled={registryLocked}
                onChange={(event) => setQuickCreateText(event.target.value)}
                placeholder="Example: 2025 Mitsubishi Outlander Silver with 32145 miles, vehicle located at Time Motor Sales 1101 Lake Street"
                rows={3}
                value={quickCreateText}
              />
            </label>
            <div className="form-actions">
              <button className="button button-secondary" disabled={busy || registryLocked} onClick={fillCreateFromQuickText} type="button">Fill form from sentence</button>
              <small>Review before saving. VIN, stock number, and plate still need to be entered when available.</small>
            </div>
          </div>
          {createFieldOrder.filter(key => access.correctIdentity || (key !== "initialOdometerMiles" && key !== "initialCustodyPosition")).map((key) => (
            <label className="form-field" key={key}>
              <span>{identityFieldLabels[key]}</span>
              <input
                disabled={registryLocked}
                inputMode={key === "initialOdometerMiles" || key === "year" ? "numeric" : undefined}
                onChange={(event) => updateCreateField(key, event.target.value)}
                placeholder={key === "initialCustodyPosition" ? "Lot, lane, or bay" : key === "stockNumber" ? "Optional" : undefined}
                value={vehicle[key]}
              />
            </label>
          ))}
          <button className={styles.primary} disabled={busy || searching} type="submit">Validate and create</button>
          </form>
        </details>}
        {selected && access?.correctIdentity && !registryLocked && (
        <details className={styles.tools}>
          <summary>Correct vehicle identity</summary>
          <div className="page-copy">
            <p>Correct the saved identity for {vehicleTitle(selected)}. Use Vehicle 360 for mileage and custody updates.</p>
          </div>
          <div className="settings-overview-grid">
            {Object.entries(correction).map(([key, value]) => {
              const field = key as keyof typeof emptyIdentity;
              return (
              <label className="form-field" key={key}>
                <span>{identityFieldLabels[field]}</span>
                <input disabled={registryLocked} onChange={(event) => updateCorrectionField(field, event.target.value)} value={value} />
              </label>
              );
            })}
          </div>
          <div className="form-actions">
            <button className={styles.primary} disabled={busy || searching} onClick={correctIdentity} type="button">Validate and save correction</button>
            <Link className={styles.secondary} href={`/vehicles/360/${encodeURIComponent(selected.id)}`}>Open observations in Vehicle 360</Link>
          </div>
        </details>
      )}
      </details>}
    </section>
  );
}
