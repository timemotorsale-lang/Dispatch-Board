"use client";
import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { DealCustomerChoice, DealVehicleChoice } from "@/lib/deal-continuity";
import styles from "./shared-deal-identities.module.css";

export const SharedDealVehicleContext = createContext<DealVehicleChoice | null>(null);
export function useCanonicalDealVehicle<Value extends Record<string, unknown>>(setValue: Dispatch<SetStateAction<Value>>) {
  const vehicle = useContext(SharedDealVehicleContext);
  useEffect(() => {
    if (!vehicle) return;
    setValue(current => {
      const next = { ...current };
      for (const key of ["vin", "stockNumber", "year", "make", "model", "color", "licensePlate"]) if (key in current) next[key as keyof Value] = vehicle[key as keyof DealVehicleChoice] as Value[keyof Value];
      return JSON.stringify(current) === JSON.stringify(next) ? current : next;
    });
  }, [vehicle, setValue]);
}
async function request<Value>(url: string, body?: unknown): Promise<Value> {
  const response = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Shared record request failed."); return result;
}
function AddSharedRecord({ vehicle, onCustomer, onVehicle, onCancel, initialName = "" }: { vehicle?: boolean; onCustomer?: (value: DealCustomerChoice) => void; onVehicle?: (value: DealVehicleChoice) => void; onCancel: () => void; initialName?: string }) {
  const [values, setValues] = useState({ displayName: initialName, phoneNumber: "", email: "", address: "", vin: "", year: "", make: "", model: "", locationId: "" });
  const requestKey = useRef(crypto.randomUUID());
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { const controller = new AbortController(); void fetch("/api/crm/v1/deal-identities?type=options", { signal: controller.signal }).then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error); setLocations(body.locations); }).catch(error => { if (!controller.signal.aborted) setError(error.message); }); return () => controller.abort(); }, []);
  async function save() {
    if (busy) return; setBusy(true); setError("");
    try {
      if (vehicle) { const result = await request<{ vehicle: DealVehicleChoice }>("/api/crm/v1/deal-identities", { ...values, type: "vehicle", idempotencyKey: requestKey.current }); onVehicle?.(result.vehicle); }
      else onCustomer?.(await request<DealCustomerChoice>("/api/crm/v1/deal-identities", { ...values, type: "customer" }));
    } catch (error) { setError(error instanceof Error ? error.message : "Save failed. Your entries are retained."); } finally { setBusy(false); }
  }
  const fields = vehicle ? [["vin", "VIN"], ["year", "Year"], ["make", "Make"], ["model", "Model"]] : [["displayName", "Customer name"], ["phoneNumber", "Phone"], ["email", "Email"], ["address", "Address (optional)"]];
  return <div className={styles.add} role="group" aria-label={vehicle ? "Add shared vehicle" : "Add shared customer"}><strong>{vehicle ? "Add vehicle once to the registry" : "Add customer once to shared CRM"}</strong><div className={styles.fields}>{fields.map(([key, label]) => <label key={key}>{label}<input value={values[key as keyof typeof values]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} /></label>)}<label>Location<select value={values.locationId} onChange={event => setValues(current => ({ ...current, locationId: event.target.value }))}><option value="">Select location</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label></div><p>{vehicle ? "An existing VIN is reused. Inventory eligibility is separate from creating the vehicle." : "Possible matches are held for selection; names alone never merge customers."}</p><button type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : vehicle ? "Save vehicle & select" : "Save customer & select"}</button><button type="button" onClick={onCancel}>Cancel</button>{error && <p role="alert">{error}</p>}</div>;
}
export function SharedDealCustomerPicker({ selected, initialItems = [], onSelect }: { selected?: DealCustomerChoice | null; initialItems?: DealCustomerChoice[]; onSelect: (value: DealCustomerChoice) => void }) {
  const [query, setQuery] = useState(""), [items, setItems] = useState(initialItems), [cursor, setCursor] = useState<string | null>(null), [adding, setAdding] = useState(false), [open, setOpen] = useState(!selected), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function search(more = false) {
    setBusy(true); setError(""); setOpen(true);
    try { const params = new URLSearchParams({ q: query }); if (more && cursor) params.set("cursor", cursor); const result = await request<{ items: DealCustomerChoice[]; nextCursor: string | null }>(`/api/crm/v1/deal-identities?${params}`); setItems(current => more ? [...current, ...result.items] : result.items); setCursor(result.nextCursor); }
    catch (error) { setError(error instanceof Error ? error.message : "Customer search failed."); } finally { setBusy(false); }
  }
  async function choose(id: string) {
    setBusy(true); setError("");
    try { const customer = await request<DealCustomerChoice>(`/api/crm/v1/deal-identities?type=customer&id=${encodeURIComponent(id)}`); onSelect(customer); setOpen(false); }
    catch (error) { setError(error instanceof Error ? error.message : "Customer could not open."); } finally { setBusy(false); }
  }
  return <section className={styles.picker} aria-label="Shared customer selector"><h2>Customer</h2><button className={styles.addButton} type="button" onClick={() => setAdding(true)}>＋ Add new customer</button>{selected && <p><strong>{selected.name}</strong> · {selected.customerNumber}<button type="button" onClick={() => setOpen(value => !value)}>Find / change customer</button></p>}{adding ? <AddSharedRecord initialName={query} onCancel={() => setAdding(false)} onCustomer={customer => { onSelect(customer); setAdding(false); setOpen(false); }} /> : null}{open && <><div className={styles.search}><input aria-label="Search shared customers" placeholder="Name, phone, email or customer number" maxLength={100} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} /><button type="button" disabled={busy} onClick={() => void search()}>Find customer</button></div><ul>{items.map(item => <li key={item.id}><button type="button" disabled={busy} onClick={() => void choose(item.id)}>{item.name} · {item.customerNumber} · {item.phone || item.email}</button></li>)}</ul>{cursor && <button type="button" disabled={busy} onClick={() => void search(true)}>More customers</button>}</>}{error && <p role="alert">{error}</p>}</section>;
}
export function SharedDealVehiclePicker({ selected, onSelect, label = "Vehicle" }: { selected?: DealVehicleChoice | null; onSelect: (value: DealVehicleChoice) => void; label?: string }) {
  const [query, setQuery] = useState(""), [items, setItems] = useState<DealVehicleChoice[]>([]), [page, setPage] = useState(1), [pages, setPages] = useState(1), [adding, setAdding] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function search(nextPage = 1) {
    setBusy(true); setError("");
    try { const result = await request<{ items: DealVehicleChoice[]; totalPages: number }>(`/api/crm/v1/deal-identities?type=vehicles&q=${encodeURIComponent(query)}&page=${nextPage}`); setItems(result.items); setPage(nextPage); setPages(result.totalPages); }
    catch (error) { setError(error instanceof Error ? error.message : "Vehicle search failed."); } finally { setBusy(false); }
  }
  return <section className={styles.picker} aria-label={`Shared ${label.toLowerCase()} selector`}><h2>{label}</h2><button className={styles.addButton} type="button" onClick={() => setAdding(true)}>＋ Add new vehicle</button>{selected && <p><strong>{selected.label}</strong><small>{selected.vin} · {selected.availability}</small>{!selected.inventoryUnitId && <a href={`/vehicles/inventory/units?vehicleId=${encodeURIComponent(selected.id)}`} target="_blank" rel="noopener noreferrer">Establish inventory using this existing vehicle</a>}</p>}{adding && <AddSharedRecord vehicle onCancel={() => setAdding(false)} onVehicle={vehicle => { onSelect(vehicle); setAdding(false); }} />}<div className={styles.search}><input aria-label={`Search shared ${label.toLowerCase()}s`} placeholder="VIN, stock, inventory number or vehicle" value={query} maxLength={100} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} /><button type="button" disabled={busy} onClick={() => void search()}>Find vehicle</button></div><ul>{items.map(item => <li key={item.id}><button type="button" onClick={() => onSelect(item)}><strong>{item.label}</strong><small>{item.vin} · {item.availability}</small></button></li>)}</ul>{pages > 1 && <p><button type="button" disabled={busy || page <= 1} onClick={() => void search(page - 1)}>Previous</button>Page {page} of {pages}<button type="button" disabled={busy || page >= pages} onClick={() => void search(page + 1)}>Next</button></p>}{error && <p role="alert">{error}</p>}</section>;
}
