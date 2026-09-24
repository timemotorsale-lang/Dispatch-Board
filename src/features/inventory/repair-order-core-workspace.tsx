"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Item = {
  id: string;
  repairOrderNumber: string;
  stage: string;
  operatingState: string;
  vehicle: { id: string; vehicleNumber: string; year: number | null; make: string | null; model: string | null };
  customer: { displayName: string } | null;
  inventoryUnit: { inventoryNumber: string } | null;
  ownerUser: { name: string };
  location: { name: string };
  serviceVisit: { concernSummary: string };
  age: { overdue: boolean };
};

type List = { items: Item[]; page: number; pageSize: number; total: number; totalPages: number };
type Options = {
  appointments: Array<{ id: string; appointmentNumber: string; title: string; locationId: string }>;
  vehicles: Array<{ id: string; vehicleNumber: string; year: number | null; make: string | null; model: string | null }>;
  customers: Array<{ id: string; displayName: string }>;
  inventoryUnits: Array<{ id: string; inventoryNumber: string; locationId: string; vehicle: { vehicleNumber: string } }>;
  locations: Array<{ id: string; name: string }>;
  users: Array<{ id: string; name: string }>;
};

const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const vehicleLabel = (item: Item) => [item.vehicle.year, item.vehicle.make, item.vehicle.model].filter(Boolean).join(" ");
const readable = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

export function RepairOrderCoreWorkspace({ initial, initialDraft, initialSearch = "", options }: {
  initial: List;
  initialDraft?: { concernSummary?: string; intakeSource?: string; vehicleId?: string };
  initialSearch?: string;
  options: Options;
}) {
  const now = new Date();
  const preparedVehicle = options.vehicles.some((vehicle) => vehicle.id === initialDraft?.vehicleId) ? initialDraft?.vehicleId : "";
  const [list, setList] = useState(initial);
  const [query, setQuery] = useState(initialSearch);
  const [notice, setNotice] = useState(initialDraft?.vehicleId ? "Service intake is ready. Confirm the remaining details." : "");
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(Boolean(initialDraft?.vehicleId));
  const [create, setCreate] = useState({
    intakeSource: initialDraft?.intakeSource === "WALK_IN" ? "WALK_IN" : initialDraft?.intakeSource === "INVENTORY_RECON" ? "INVENTORY_RECON" : "APPOINTMENT",
    appointmentId: options.appointments[0]?.id ?? "",
    vehicleId: preparedVehicle || options.vehicles[0]?.id || "",
    customerId: options.customers[0]?.id ?? "",
    inventoryUnitId: options.inventoryUnits[0]?.id ?? "",
    locationId: options.appointments[0]?.locationId ?? options.locations[0]?.id ?? "",
    ownerUserId: options.users[0]?.id ?? "",
    arrivedAt: local(now),
    targetAt: local(new Date(now.getTime() + 2 * 3600000)),
    concernSummary: initialDraft?.concernSummary ?? "",
    promisedAt: "", promiseNotes: "", consentStatus: "PENDING", consentReference: "", consentedAt: "",
    keysReceivedCount: 1, keyTag: "", transportMode: "DROP_OFF", intakeNotes: "",
    operatingState: "ACTIVE", stateReason: "", nextAction: "Complete intake review and prepare for DVI",
  });

  async function request(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error ?? "Repair-order request failed.");
    return body;
  }

  async function refresh() {
    setBusy(true);
    try {
      setList(await request(`/api/repair-orders?query=${encodeURIComponent(query)}`));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to search repair orders.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await request("/api/repair-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...create, idempotencyKey: crypto.randomUUID(), reason: "Document repair-order intake and ownership." }),
      });
      if (result.result?.id) {
        window.location.assign(`/vehicles/repair-workbench?${new URLSearchParams({ repairOrderId: result.result.id })}`);
        return;
      }
      setNotice("The repair order was saved. Search for it in the list.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to open repair order.");
      setBusy(false);
    }
  }

  const update = (field: string, value: string | number) => setCreate((current) => ({ ...current, [field]: value }));

  return <section className="page-stack repair-order-core-workspace">
    <header className="page-copy">
      <span className="eyebrow">Shop Operations</span>
      <h1>Repair orders</h1>
      <p>Select any row to open that vehicle&apos;s workbench.</p>
      <div className="form-actions">
        <Link className="pill pill-secondary" href="/vehicles">Control Tower</Link>
        <button className="button button-primary" onClick={() => setShowCreate((value) => !value)} type="button">
          {showCreate ? "Close intake" : "Open new RO"}
        </button>
      </div>
    </header>

    {notice ? <div className="notice notice-info"><p>{notice}</p></div> : null}

    <section className="panel-card ro-core-search">
      <form className="form-actions" onSubmit={(event) => { event.preventDefault(); refresh(); }}>
        <label className="form-field"><span>Find an RO, vehicle, customer, or stock number</span><input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <button className="button button-primary" disabled={busy}>Search</button>
      </form>
      <p>{query.trim() ? `${list.total} repair order${list.total === 1 ? "" : "s"} matching "${query.trim()}"` : `${list.total} open repair orders`}</p>
    </section>

    <section className="panel-card page-stack">
      <h2>RO jobs</h2>
      <div className="ro-core-list">
        {list.items.map((item) => <Link
          aria-label={`Open ${item.repairOrderNumber} for ${vehicleLabel(item)}`}
          className="ro-core-row"
          href={`/vehicles/repair-workbench?${new URLSearchParams({ repairOrderId: item.id, vehicleId: item.vehicle.id })}`}
          key={item.id}
        >
          <span className="ro-core-identity"><strong>{item.repairOrderNumber} · {vehicleLabel(item)}</strong><small>{item.inventoryUnit?.inventoryNumber ?? item.customer?.displayName ?? item.vehicle.vehicleNumber}</small></span>
          <span className="ro-core-status"><strong>{readable(item.stage)}</strong><small>{item.ownerUser.name}</small></span>
          <span className="ro-core-concern"><strong>{item.serviceVisit.concernSummary}</strong><small>{item.location.name} · {readable(item.operatingState)}{item.age.overdue ? " · Overdue" : ""}</small></span>
          <span className="ro-core-open">Open workbench →</span>
        </Link>)}
        {!list.items.length ? <p>No open repair orders match this search.</p> : null}
      </div>
    </section>

    {showCreate ? <form className="panel-card page-stack" onSubmit={submit}>
      <h2>Open repair order</h2>
      <div className="settings-overview-grid">
        <label className="form-field"><span>Intake source</span><select value={create.intakeSource} onChange={(event) => update("intakeSource", event.target.value)}><option value="APPOINTMENT">Appointment</option><option value="WALK_IN">Walk-in</option><option value="INVENTORY_RECON">Inventory recon</option></select></label>
        {create.intakeSource === "APPOINTMENT" ? <label className="form-field"><span>Appointment</span><select value={create.appointmentId} onChange={(event) => { const appointment = options.appointments.find((item) => item.id === event.target.value); setCreate((value) => ({ ...value, appointmentId: event.target.value, locationId: appointment?.locationId ?? value.locationId })); }}>{options.appointments.map((item) => <option key={item.id} value={item.id}>{item.appointmentNumber} · {item.title}</option>)}</select></label> : create.intakeSource === "WALK_IN" ? <>
          <label className="form-field"><span>Vehicle</span><select value={create.vehicleId} onChange={(event) => update("vehicleId", event.target.value)}>{options.vehicles.map((item) => <option key={item.id} value={item.id}>{item.vehicleNumber} · {[item.year, item.make, item.model].filter(Boolean).join(" ")}</option>)}</select></label>
          <label className="form-field"><span>Customer</span><select value={create.customerId} onChange={(event) => update("customerId", event.target.value)}>{options.customers.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
        </> : <label className="form-field"><span>Inventory unit</span><select value={create.inventoryUnitId} onChange={(event) => { const unit = options.inventoryUnits.find((item) => item.id === event.target.value); setCreate((value) => ({ ...value, inventoryUnitId: event.target.value, locationId: unit?.locationId ?? value.locationId })); }}>{options.inventoryUnits.map((item) => <option key={item.id} value={item.id}>{item.inventoryNumber} · {item.vehicle.vehicleNumber}</option>)}</select></label>}
        <label className="form-field"><span>Location</span><select value={create.locationId} onChange={(event) => update("locationId", event.target.value)}>{options.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="form-field"><span>Owner</span><select value={create.ownerUserId} onChange={(event) => update("ownerUserId", event.target.value)}>{options.users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="form-field"><span>Arrival</span><input type="datetime-local" value={create.arrivedAt} onChange={(event) => update("arrivedAt", event.target.value)} /></label>
        <label className="form-field"><span>Target</span><input type="datetime-local" value={create.targetAt} onChange={(event) => update("targetAt", event.target.value)} /></label>
        <label className="form-field"><span>Concern</span><textarea required value={create.concernSummary} onChange={(event) => update("concernSummary", event.target.value)} /></label>
        <label className="form-field"><span>Transportation</span><select value={create.transportMode} onChange={(event) => update("transportMode", event.target.value)}><option value="CUSTOMER_WAITING">Customer waiting</option><option value="DROP_OFF">Drop off</option><option value="LOANER">Loaner</option><option value="SHUTTLE">Shuttle</option><option value="TOW">Tow</option><option value="INTERNAL_TRANSPORT">Internal transport</option><option value="OTHER">Other</option></select></label>
      </div>
      <button className="button button-primary" disabled={busy}>Open RO and workbench</button>
    </form> : null}
  </section>;
}
