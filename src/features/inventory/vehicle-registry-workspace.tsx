"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

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

function stockNumberForDisplay(vehicle: Pick<VehicleListItem, "stockNumber" | "vin">) {
  return vehicle.stockNumber ?? (deriveStockNumberFromVin(vehicle.vin) || "—");
}

function editableIdentity(vehicle: Detail | null) {
  return vehicle
    ? {
        vehicleNumber: vehicle.vehicleNumber,
        vin: vehicle.vinRaw ?? vehicle.vin ?? "",
        nonVinReason: vehicle.nonVinReason ?? "",
        stockNumber: vehicle.stockNumber ?? deriveStockNumberFromVin(vehicle.vin),
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

function vehicleWorkbenchHref(vehicleId: string) {
  return `/vehicles/${encodeURIComponent(vehicleId)}/workbench`;
}

function vehicle360Href(vehicleId: string) {
  return `/vehicles/360/${encodeURIComponent(vehicleId)}`;
}

function vehicleInventoryPlanningHref(vehicleId: string) {
  return `/vehicles/${encodeURIComponent(vehicleId)}/inventory-planning`;
}

function vehicleRepairWorkbenchHref(vehicleId: string) {
  return `/vehicles/repair-workbench?vehicleId=${encodeURIComponent(vehicleId)}&returnTo=${encodeURIComponent("/vehicles/registry")}`;
}

function vehiclePartsHref(vehicleId: string) {
  return `/vehicles/parts-operations?vehicleId=${encodeURIComponent(vehicleId)}&returnTo=${encodeURIComponent("/vehicles/registry")}`;
}

function isMutationDisabled(message: string) {
  return message.includes("not enabled") || message.includes("MASTER_DISABLED");
}

function selectedVehicleReadiness(vehicle: Detail, duplicateCaseCount: number) {
  const latestCustody = vehicle.custodyEvents[0];
  const latestOdometer = vehicle.odometerObservations[0];
  const missing: string[] = [];
  const warnings: string[] = [];
  if (!vehicle.vin && !vehicle.nonVinReason) missing.push("VIN or non-VIN reason");
  if (vehicle.vinState !== "VERIFIED" && vehicle.vinState !== "VALID") warnings.push("VIN verification");
  if (!vehicle.stockNumber) warnings.push("stock number");
  if (!latestCustody) missing.push("current location / custody");
  if (!latestOdometer) warnings.push("current mileage");
  if (duplicateCaseCount) warnings.push("duplicate review");
  const nextAction = duplicateCaseCount
    ? "Resolve duplicate review before staff make operating decisions."
    : missing.length
      ? `Complete ${missing[0]} before opening new work.`
      : warnings.length
        ? `Verify ${warnings[0]}, then continue work.`
        : "Open the workbench or continue inventory lifecycle.";
  return { latestCustody, latestOdometer, missing, nextAction, ready: !missing.length && !duplicateCaseCount, warnings };
}

export function VehicleRegistryWorkspace({
  initial,
  initialQuery = "",
  initialSelected = null
}: {
  initial: RegistryList;
  initialQuery?: string;
  initialSelected?: Detail | null;
}) {
  const [list, setList] = useState(initial);
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<Detail | null>(initialSelected);
  const [quickCreateText, setQuickCreateText] = useState("");
  const [vehicle, setVehicle] = useState(emptyVehicle);
  const [correction, setCorrection] = useState(editableIdentity(initialSelected));
  const [notice, setNotice] = useState("");
  const [registryLocked, setRegistryLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewText, setPreviewText] = useState('[{"vehicleNumber":"TMS-1001","vin":"1HGCM82633A004352","stockNumber":"1001","year":2003,"make":"Honda","model":"Accord"}]');
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);

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

  async function refresh(search = query, openSingleMatch = false) {
    setBusy(true);
    try {
      const body = await request(`/api/vehicles?query=${encodeURIComponent(search)}`) as RegistryList;
      setList(body);
      if (openSingleMatch && body.items.length === 1) {
        window.location.assign(vehicleWorkbenchHref(body.items[0].id));
      } else if (body.items.length === 1) {
        await load(body.items[0].id);
      } else if (!body.items.some((item) => item.id === selected?.id)) {
        setSelected(null);
      }
    } catch (error) {
      handleError(error, "Unable to search vehicles.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const { initialCustodyPosition, initialOdometerMiles, ...identity } = vehicle;
      const body = await request("/api/vehicles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...identity,
          year: vehicle.year || null,
          idempotencyKey: crypto.randomUUID(),
          reason: "Create canonical vehicle registry identity.",
          workflowContext: {
            initialCustodyPosition: initialCustodyPosition || null,
            initialOdometerMiles: initialOdometerMiles || null,
            source: "INVENTORY_CONSOLE_CREATE_IDENTITY"
          }
        })
      });
      const createdId = body.result?.id as string | undefined;
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
      setNotice(body.result?.duplicateReviewId ? "Vehicle candidate created and routed to duplicate review." : "Canonical vehicle created with available intake observations.");
      setVehicle(emptyVehicle);
      await refresh();
      if (createdId) await load(createdId);
    } catch (error) {
      handleError(error, "Unable to create vehicle.");
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
    setVehicle((current) => ({ ...current, ...parsed }));
    setNotice("Quick intake filled the fields it could read. Review, add VIN/stock/plate if available, then validate and create.");
  }

  function updateCreateField(key: keyof typeof emptyVehicle, value: string) {
    setVehicle((current) => {
      if (key !== "vin") return { ...current, [key]: value };
      const derivedStockNumber = deriveStockNumberFromVin(value);
      return {
        ...current,
        vin: value,
        stockNumber: current.stockNumber || !derivedStockNumber ? current.stockNumber : derivedStockNumber
      };
    });
  }

  function updateCorrectionField(key: keyof typeof emptyIdentity, value: string) {
    setCorrection((current) => {
      if (key !== "vin") return { ...current, [key]: value };
      const derivedStockNumber = deriveStockNumberFromVin(value);
      return {
        ...current,
        vin: value,
        stockNumber: current.stockNumber || !derivedStockNumber ? current.stockNumber : derivedStockNumber
      };
    });
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

  async function runPreview() {
    setBusy(true);
    try {
      const rows = JSON.parse(previewText);
      setPreview(await request("/api/vehicles/import-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows })
      }));
      setNotice("Import preview completed without writing vehicle records.");
    } catch (error) {
      handleError(error, "Import preview failed.");
    } finally {
      setBusy(false);
    }
  }

  const duplicateCases = selected ? [...selected.duplicateCasesAsPrimary, ...selected.duplicateCasesAsCandidate].filter((item) => item.status === "OPEN") : [];
  const mutationNotice = registryLocked || isMutationDisabled(notice);
  const selectedReadiness = selected ? selectedVehicleReadiness(selected, duplicateCases.length) : null;

  return (
    <section className="page-stack">
      <header className="page-copy">
        <span className="eyebrow">Vehicle Operations · Canonical registry</span>
        <h1>Find the vehicle and go straight to work</h1>
        <p>Search once, inspect the canonical identity, then open Vehicle 360 or the execution workspace without detouring through extra landing pages.</p>
        <div className="form-actions">
          <Link className="pill pill-primary" href="/vehicles/registry">Find Vehicle / Open Workbench</Link>
          <Link className="pill pill-secondary" href="/vehicles/inventory">Inventory Lifecycle</Link>
          <Link className="pill pill-secondary" href="/vehicles/control-tower">Control Tower</Link>
          <Link className="pill pill-secondary" href="/settings/vehicle-operations">Rollout &amp; health</Link>
        </div>
      </header>

      {notice ? (
        <div className={mutationNotice ? "notice notice-warning" : notice.includes("failed") || notice.includes("required") ? "notice notice-danger" : "notice notice-success"}>
          <p>{notice}</p>
          {mutationNotice && selected ? (
            <div className="form-actions">
              <Link className="button button-primary" href={vehicleWorkbenchHref(selected.id)}>Open Vehicle Workbench</Link>
              <Link className="button button-secondary" href={`/vehicles/360/${selected.id}`}>Open Vehicle 360</Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <section className="panel-card">
        <form className="form-actions" onSubmit={(event) => { event.preventDefault(); void refresh(query, true); }}>
          <label className="form-field">
            <span>Search VIN, partial VIN, stock, plate, vehicle, customer, or external ID</span>
            <input onChange={(event) => setQuery(event.target.value)} value={query} />
          </label>
          <button className="button button-primary" disabled={busy} type="submit">Search and open</button>
        </form>
        <p>
          {list.total} canonical vehicles · page {list.page} of {list.totalPages}
          {list.items.length === 1 ? " · single match opens automatically" : ""}
        </p>
      </section>

      <div className="settings-workspace">
        <section className="panel-card">
          <div className="page-copy"><h2>Registry</h2></div>
          <div className="page-stack">
            {list.items.length ? list.items.map((item) => (
              <article className="panel-card settings-callout-card inventory-vehicle-result-card" key={item.id}>
                <Link className="inventory-vehicle-result-link" href={vehicleWorkbenchHref(item.id)}>
                  <strong>{vehicleTitle(item)}</strong>
                  <span>{item.vehicleNumber} · VIN {item.vin ?? item.vinState} · Stock {stockNumberForDisplay(item)}</span>
                  {item._count.duplicateCasesAsCandidate + item._count.duplicateCasesAsPrimary ? <small>Duplicate review required</small> : null}
                  <small>Click vehicle to open the Vehicle Workbench</small>
                </Link>
                <div className="form-actions">
                  <Link className="button button-primary" href={vehicleWorkbenchHref(item.id)}>Open Vehicle Workbench</Link>
                  <Link className="button button-secondary" href={`/vehicles/360/${item.id}`}>Open Vehicle 360</Link>
                  <button className="button button-secondary" disabled={busy} onClick={() => void load(item.id)} type="button">Preview here</button>
                </div>
              </article>
            )) : <div className="vehicle-map-empty"><h3>No vehicle found here yet</h3><p>If staff know the vehicle exists, search by VIN, stock number, plate, customer, or vehicle number. If it still does not appear, use Add Vehicle so the system can either find the existing canonical record or create one.</p><div className="form-actions"><Link className="button button-primary" href="/vehicles/workflows/add-vehicle">Add / Find Vehicle</Link><Link className="button button-secondary" href="/vehicles/inventory">Back to Inventory Lifecycle</Link></div></div>}
          </div>
        </section>

        <section className="panel-card">
          {selected ? (
            <div className="page-stack">
              <div className="page-copy">
                <span className="eyebrow">Version {selected.version}</span>
                <h2>{selected.vehicleNumber}</h2>
                <p>{[selected.year, selected.make, selected.model, selected.color].filter(Boolean).join(" · ")}</p>
              </div>
              {selectedReadiness ? <section className="vehicle-command-center" aria-label="Vehicle next action command center">
                <div>
                  <span className={selectedReadiness.ready ? "ready" : "attention"}>{selectedReadiness.ready ? "Ready to work" : "Needs attention"}</span>
                  <h3>{selectedReadiness.nextAction}</h3>
                  <p>{selectedReadiness.ready ? "Identity, custody, and duplicate guard are clear enough to move to the next workspace." : "Fix only the blocker that matters, then continue from the same canonical vehicle card."}</p>
                </div>
                <dl>
                  <div><dt>Location</dt><dd>{selectedReadiness.latestCustody?.location?.name ?? selectedReadiness.latestCustody?.positionLabel ?? "Needs custody update"}</dd></div>
                  <div><dt>Mileage</dt><dd>{selectedReadiness.latestOdometer ? `${selectedReadiness.latestOdometer.reading.toLocaleString()} ${selectedReadiness.latestOdometer.unit}` : "Needs odometer"}</dd></div>
                  <div><dt>Duplicate guard</dt><dd>{duplicateCases.length ? `${duplicateCases.length} open review` : "Clear"}</dd></div>
                  <div><dt>Identity</dt><dd>{selected.vinState === "VERIFIED" || selected.vinState === "VALID" ? selected.vinState : "Verify VIN"}</dd></div>
                </dl>
              </section> : null}
              <section className="vehicle-command-actions" aria-label="Connected vehicle workspaces">
                <Link className="primary" href={vehicleWorkbenchHref(selected.id)}><strong>Open Vehicle Workbench</strong><span>Best next stop for active tasks, current status, custody, RO, QC, and handoff.</span></Link>
                <Link href={vehicleInventoryPlanningHref(selected.id)}><strong>Inventory Planning</strong><span>Correct intake condition/needs, start lifecycle, receiving QC, recon, frontline release.</span></Link>
                <Link href={vehicle360Href(selected.id)}><strong>Vehicle 360</strong><span>Canonical identity, evidence, photos, documents, history, and safety intelligence.</span></Link>
                <Link href={vehicleRepairWorkbenchHref(selected.id)}><strong>Shop &amp; Recon</strong><span>Open or continue repair order work, diagnostics, estimates, vendor path, repair, QC.</span></Link>
                <Link href={vehiclePartsHref(selected.id)}><strong>Parts</strong><span>Review demand, ordering, availability, blockers, and parts readiness for this vehicle.</span></Link>
                <Link href={`/vehicles/quality-control?vehicleId=${encodeURIComponent(selected.id)}&returnTo=${encodeURIComponent("/vehicles/registry")}`}><strong>Quality Control</strong><span>Verify completed work, failed repairs, rework decisions, and release readiness.</span></Link>
              </section>
              <dl className="etw-facts compact">
                <div><dt>VIN</dt><dd>{selected.vin ?? selected.vinRaw ?? selected.nonVinReason ?? "Not recorded"}</dd></div>
                <div><dt>Stock</dt><dd>{selected.stockNumber ?? (deriveStockNumberFromVin(selected.vin) ? `${deriveStockNumberFromVin(selected.vin)} · derived from VIN` : "Not recorded")}</dd></div>
                <div><dt>Plate</dt><dd>{selected.licensePlate ?? "Not recorded"}</dd></div>
                <div><dt>Current custody</dt><dd>{selected.custodyEvents[0]?.location?.name ?? selected.custodyEvents[0]?.positionLabel ?? "No custody event"}</dd></div>
                <div><dt>Latest odometer</dt><dd>{selected.odometerObservations[0] ? `${selected.odometerObservations[0].reading.toLocaleString()} ${selected.odometerObservations[0].unit}` : "No observation"}</dd></div>
              </dl>
              <div className="form-actions">
                <Link className="button button-primary" href={vehicleWorkbenchHref(selected.id)}>Open Vehicle Workbench</Link>
                <Link className="button button-secondary" href={`/vehicles/360/${selected.id}`}>Open Vehicle 360</Link>
                {registryLocked ? null : (
                  <>
                    <button className="button button-secondary" disabled={busy} onClick={correctIdentity} type="button">Revalidate identity</button>
                  </>
                )}
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
                      <button disabled={busy || registryLocked} onClick={() => command("RESOLVE_DUPLICATE", { caseId: item.id, resolution: "CONFIRMED_DISTINCT" })} type="button">Confirm distinct</button>
                      <button disabled={busy || registryLocked} onClick={() => command("RESOLVE_DUPLICATE", { caseId: item.id, resolution: "MERGED" })} type="button">Merge with lineage</button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
          <div className="page-copy">
            <h2>Open the vehicle workspace faster</h2>
            <p>Search by VIN, stock number, plate, customer, or external ID. If there is one match, it opens here automatically and gives staff a direct Vehicle Workbench button.</p>
          </div>
          )}
        </section>
      </div>

      <div className="settings-overview-grid">
        <form className="panel-card page-stack" onSubmit={submitCreate}>
          <div className="page-copy">
            <h2>Create canonical identity</h2>
            <p>{registryLocked ? "Registry updates are locked in this rollout. Use search and open the vehicle workspace instead." : "Enter the identity, mileage, and current lot/bay in one pass so staff do not have to hunt for a second form."}</p>
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
          {createFieldOrder.map((key) => (
            <label className="form-field" key={key}>
              <span>{identityFieldLabels[key]}</span>
              <input
                disabled={registryLocked}
                inputMode={key === "initialOdometerMiles" || key === "year" ? "numeric" : undefined}
                onChange={(event) => updateCreateField(key, event.target.value)}
                placeholder={key === "initialCustodyPosition" ? "Lot, lane, or bay" : key === "stockNumber" ? "Auto-fills from last 6 VIN digits" : undefined}
                value={vehicle[key]}
              />
            </label>
          ))}
          <button className="button button-primary" disabled={busy || registryLocked} type="submit">Validate and create</button>
        </form>

        <section className="panel-card page-stack">
          <div className="page-copy"><h2>Import preview</h2><p>Paste a JSON array. Preview validates and detects conflicts without writing.</p></div>
          <textarea onChange={(event) => setPreviewText(event.target.value)} rows={10} value={previewText} />
          <button className="button button-secondary" disabled={busy} onClick={runPreview} type="button">Preview import</button>
          {preview ? <pre>{JSON.stringify(preview, null, 2)}</pre> : null}
        </section>
      </div>

      {selected && registryLocked ? (
        <section className="panel-card page-stack">
          <div className="page-copy">
            <h2>Vehicle is available in view-only mode</h2>
            <p>Registry correction, mileage, and custody commands are locked for this rollout, so this page keeps the vehicle readable and sends staff directly to the workspaces that are available.</p>
          </div>
          <div className="form-actions">
            <Link className="button button-primary" href={vehicleWorkbenchHref(selected.id)}>Open Vehicle Workbench</Link>
            <Link className="button button-secondary" href={`/vehicles/360/${selected.id}`}>Open Vehicle 360</Link>
            <Link className="button button-secondary" href="/vehicles/inventory">Back to Inventory Lifecycle</Link>
          </div>
          <p className="notice notice-info">Mileage is now collected in Create canonical identity when registry writes are enabled.</p>
        </section>
      ) : selected ? (
        <section className="panel-card page-stack">
          <div className="page-copy">
            <h2>Advanced identity correction</h2>
            <p>Use this only when the canonical identity itself is wrong. Mileage and first location are captured during Create canonical identity, and ongoing observations live in Vehicle 360.</p>
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
            <button className="button button-secondary" disabled={busy || registryLocked} onClick={correctIdentity} type="button">Validate and save correction</button>
            <Link className="button button-secondary" href={`/vehicles/360/${selected.id}`}>Open observations in Vehicle 360</Link>
            <Link className="button button-primary" href={vehicleWorkbenchHref(selected.id)}>Open Vehicle Workbench</Link>
          </div>
        </section>
      ) : null}
    </section>
  );
}
