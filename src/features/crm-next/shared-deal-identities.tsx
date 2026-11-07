"use client";
import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { DealCustomerChoice, DealCustomerList, DealVehicleChoice } from "@/lib/deal-continuity";
import { dealCustomerDisplayNumber, prefillDealVehicle } from "@/lib/deal-continuity";
import styles from "./shared-deal-identities.module.css";

export const SharedDealVehicleContext = createContext<DealVehicleChoice | null>(null);
function CustomerLabel({ customer }: { customer: DealCustomerChoice }) {
  const number = dealCustomerDisplayNumber(customer);
  const contact = customer.phone || customer.email;
  return <><strong>{customer.name}</strong><small>{number ? `Customer # ${number}` : "Customer record"}{contact ? ` · ${contact}` : ""}</small></>;
}
export function useCanonicalDealVehicle<Value extends Record<string, unknown>>(setValue: Dispatch<SetStateAction<Value>>) {
  const vehicle = useContext(SharedDealVehicleContext);
  useEffect(() => {
    if (!vehicle) return;
    setValue(current => prefillDealVehicle(current, vehicle));
  }, [vehicle, setValue]);
}
class SharedRecordRequestError extends Error {
  constructor(message: string, readonly matches: DealCustomerChoice[] = []) { super(message); }
}
async function request<Value>(url: string, body?: unknown): Promise<Value> {
  const response = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
  const result = await response.json(); if (!response.ok) throw new SharedRecordRequestError(result.error ?? "Shared record request failed.", result.code === "CUSTOMER_MATCH_REQUIRES_SELECTION" && Array.isArray(result.matches) ? result.matches : []); return result;
}
function AddSharedRecord({ vehicle, onCustomer, onVehicle, onCancel, initialName = "" }: { vehicle?: boolean; onCustomer?: (value: DealCustomerChoice) => void; onVehicle?: (value: DealVehicleChoice) => void; onCancel: () => void; initialName?: string }) {
  const [values, setValues] = useState({ displayName: initialName, phoneNumber: "", email: "", address: "", vin: "", year: "", make: "", model: "", locationId: "" });
  const requestKey = useRef(crypto.randomUUID());
  const [matches, setMatches] = useState<DealCustomerChoice[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [locationsLoading, setLocationsLoading] = useState(true), [locationReload, setLocationReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/crm/v1/deal-identities?type=options&recordType=${vehicle ? "vehicle" : "customer"}`, { signal: controller.signal }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Company locations could not be loaded. Retry without clearing your entries.");
      if (!Array.isArray(body.locations) || !body.locations.length) throw new Error("No authorized company locations are available. Ask a manager to review location settings; your entries are retained.");
      if (controller.signal.aborted) return;
      setLocations(body.locations);
      setValues(current => ({ ...current, locationId: body.locations.some((location: { id: string }) => location.id === current.locationId) ? current.locationId : body.locations.length === 1 ? body.locations[0].id : "" }));
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLocationsLoading(false); });
    return () => controller.abort();
  }, [vehicle, locationReload]);
  async function save() {
    if (busy) return;
    if (locationsLoading) { setError("Company locations are loading. Please try again shortly."); return; }
    if (!locations.some(location => location.id === values.locationId)) { setError(locations.length ? "Choose a company location before saving." : "No authorized location is available. Retry locations or ask a manager to review access; your entries are retained."); return; }
    setBusy(true); setError(""); setMatches([]);
    try {
      if (vehicle) { const result = await request<{ vehicle: DealVehicleChoice }>("/api/crm/v1/deal-identities", { ...values, type: "vehicle", idempotencyKey: requestKey.current }); onVehicle?.(result.vehicle); }
      else onCustomer?.(await request<DealCustomerChoice>("/api/crm/v1/deal-identities", { ...values, type: "customer" }));
    } catch (error) { if (error instanceof SharedRecordRequestError) setMatches(error.matches); setError(error instanceof Error ? error.message : "Save failed. Your entries are retained."); } finally { setBusy(false); }
  }
  async function selectMatch(id: string) {
    if (busy) return;
    setBusy(true); setError("");
    try { onCustomer?.(await request<DealCustomerChoice>(`/api/crm/v1/deal-identities?type=customer&id=${encodeURIComponent(id)}`)); }
    catch (error) { setError(error instanceof Error ? error.message : "The existing customer could not be selected. Your entries are retained."); }
    finally { setBusy(false); }
  }
  const fields = vehicle ? [["vin", "VIN"], ["year", "Year"], ["make", "Make"], ["model", "Model"]] : [["displayName", "Customer name"], ["phoneNumber", "Phone"], ["email", "Email"], ["address", "Address (optional)"]];
return <div className={styles.add} role="group" aria-label={vehicle ? "Add shared vehicle" : "Add shared customer"}><strong>{vehicle ? "Add vehicle once to the registry" : "Add customer once to shared CRM"}</strong><div className={styles.fields}>{fields.map(([key, label]) => <label key={key}>{label}<input value={values[key as keyof typeof values]} onChange={event => { setMatches([]); setError(""); setValues(current => ({ ...current, [key]: event.target.value })); }} /></label>)}<label>Location<select disabled={busy || locationsLoading || !locations.length} value={values.locationId} onChange={event => setValues(current => ({ ...current, locationId: event.target.value }))}><option value="">{locationsLoading ? "Loading locations…" : locations.length ? "Select location" : "No locations available"}</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label></div><p>{vehicle ? "An existing VIN is reused. Inventory eligibility is separate from creating the vehicle." : "Possible matches are held for selection; names alone never merge customers."}</p><button type="button" disabled={busy || locationsLoading || !locations.length} onClick={() => void save()}>{busy ? "Saving…" : vehicle ? "Save vehicle & select" : "Save customer & select"}</button><button type="button" onClick={onCancel}>Cancel</button>{error && <p role="alert">{error}</p>}{matches.length > 0 && <section aria-label="Existing customer matches"><h3>Existing customer found</h3><p>Select the matching record to continue. This will not overwrite its contact information with the values entered above.</p><ul>{matches.map(match => <li key={match.id}><CustomerLabel customer={match} /><button type="button" disabled={busy} onClick={() => void selectMatch(match.id)}>Select existing customer · {match.name}</button></li>)}</ul><p>If this is a different person sharing a phone or email, ask a manager to review the records. Do not change contact information just to bypass the match.</p></section>}{!locationsLoading && !locations.length ? <button type="button" onClick={() => { setError(""); setLocationsLoading(true); setLocationReload(value => value + 1); }}>Retry locations</button> : null}</div>;
}
export function SharedDealCustomerPicker({ selected, initialItems = [], initialCustomerList, onSelect }: { selected?: DealCustomerChoice | null; initialItems?: DealCustomerChoice[]; initialCustomerList?: DealCustomerList; onSelect: (value: DealCustomerChoice) => void }) {
  const [query, setQuery] = useState(""), [items, setItems] = useState(initialCustomerList?.items ?? initialItems), [cursor, setCursor] = useState<string | null>(initialCustomerList?.nextCursor ?? null), [adding, setAdding] = useState(false), [open, setOpen] = useState(false), [error, setError] = useState(initialCustomerList?.error ?? ""), [busy, setBusy] = useState(false);
  const [searchComplete, setSearchComplete] = useState(Boolean(initialCustomerList && !initialCustomerList.error));
  const searchSequence = useRef(0);
  useEffect(() => {
    if (initialCustomerList) return;
    const controller = new AbortController(), attempt = ++searchSequence.current;
    void fetch("/api/crm/v1/deal-identities?q=", { cache: "no-store", signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Customers could not be loaded. Use Find customer to retry.");
      if (!controller.signal.aborted && attempt === searchSequence.current) { setItems(result.items); setCursor(result.nextCursor); setSearchComplete(true); }
    }).catch(error => { if (!controller.signal.aborted && attempt === searchSequence.current) setError(error instanceof Error ? error.message : "Customer list could not be loaded. Use Find customer to retry."); });
    return () => controller.abort();
  }, [initialCustomerList]);
  async function search(more = false) {
    const attempt = ++searchSequence.current;
    setBusy(true); setError(""); setOpen(true);
    try { const params = new URLSearchParams({ q: query }); if (more && cursor) params.set("cursor", cursor); const result = await request<{ items: DealCustomerChoice[]; nextCursor: string | null }>(`/api/crm/v1/deal-identities?${params}`); if (attempt !== searchSequence.current) return; setItems(current => more ? [...current, ...result.items] : result.items); setCursor(result.nextCursor); setSearchComplete(true); }
    catch (error) { if (attempt === searchSequence.current) setError(error instanceof Error ? error.message : "Customer search failed."); } finally { if (attempt === searchSequence.current) setBusy(false); }
  }
  async function choose(id: string) {
    setBusy(true); setError("");
    try { const customer = await request<DealCustomerChoice>(`/api/crm/v1/deal-identities?type=customer&id=${encodeURIComponent(id)}`); onSelect(customer); setOpen(false); }
    catch (error) { setError(error instanceof Error ? error.message : "Customer could not open."); } finally { setBusy(false); }
  }
return <section className={styles.picker} aria-label="Shared customer selector"><h2>Customer</h2><button className={styles.addButton} type="button" onClick={() => setAdding(true)}>＋ Add new customer</button>{selected && <p><CustomerLabel customer={selected} /><button type="button" onClick={() => setOpen(value => !value)}>Find / change customer</button></p>}{adding ? <AddSharedRecord initialName={query} onCancel={() => setAdding(false)} onCustomer={customer => { onSelect(customer); setAdding(false); setOpen(false); setError(""); }} /> : null}{(!selected || open) && <><div className={styles.search}><input aria-label="Search shared customers" placeholder="Name, phone, email or customer number" maxLength={100} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} /><button type="button" disabled={busy} onClick={() => void search()}>Find customer</button></div>{searchComplete && !items.length && !error ? <p role="status">No matching customers. Try another name or customer number, or add a new customer.</p> : null}<ul>{items.map(item => <li key={item.id}><button type="button" disabled={busy} onClick={() => void choose(item.id)}><CustomerLabel customer={item} /></button></li>)}</ul>{cursor && <button type="button" disabled={busy} onClick={() => void search(true)}>More customers</button>}</>}{error && <p role="alert">{error}</p>}</section>;
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
