"use client";

import { useEffect, useState } from "react";
import { CarFront, Plus, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { CrmNextVinDecoder } from "./crm-next-vin-decoder";
import styles from "./crm-next-shell.module.css";

type VehicleIdentity = { vin: string; stockNumber: string; year: string; make: string; model: string; trim: string };
type InventoryChoice = {
  id: string;
  inventoryNumber: string;
  lifecycleStage: string;
  operatingState: string;
  vehicle: { vin: string | null; stockNumber: string | null; year: number | null; make: string | null; model: string | null };
};
type InventoryPage = { items: InventoryChoice[]; page: number; totalPages: number; total: number };

export function availableTestDriveVehicles(items: InventoryChoice[]) {
  return items.filter((item) => item.lifecycleStage === "FRONTLINE_READY" && item.operatingState === "ACTIVE" && /^[A-HJ-NPR-Z0-9]{17}$/.test(item.vehicle.vin ?? ""));
}

export function testDriveInventoryIdentity(item: InventoryChoice): VehicleIdentity {
  return { vin: item.vehicle.vin ?? "", stockNumber: item.vehicle.stockNumber ?? item.inventoryNumber,
    year: item.vehicle.year == null ? "" : String(item.vehicle.year), make: item.vehicle.make ?? "", model: item.vehicle.model ?? "", trim: "" };
}

export function TestDriveVehiclePicker({ fields, vehicle, onApply, onVinChange }: {
  fields: VehicleIdentity; vehicle: string; onApply: (values: Partial<VehicleIdentity>) => void; onVinChange: (vin: string) => void;
}) {
  const [mode, setMode] = useState<"inventory" | "manual">("inventory");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<InventoryPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "inventory") return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setBusy(true); setError(""); setResult(null);
      const params = new URLSearchParams({ state: "ACTIVE", stage: "FRONTLINE_READY", page: String(page), pageSize: "100", query });
      void fetch(`/api/inventory-units?${params}`, { signal: controller.signal }).then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Available vehicles could not be loaded.");
        if (!controller.signal.aborted) setResult(payload as InventoryPage);
      }).catch((caught) => {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Available vehicles could not be loaded.");
      }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    }, 200);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [mode, query, page, retry]);

  const choices = availableTestDriveVehicles(result?.items ?? []);
  return <div className={`${styles.retailWide} ${styles.testDriveVehiclePicker}`}>
    <div role="radiogroup" aria-label="Vehicle entry" className={styles.testDriveVehicleModes}>
      <button role="radio" aria-checked={mode === "inventory"} type="button" onClick={() => setMode("inventory")}><CarFront size={17} />Select available vehicle</button>
      <button role="radio" aria-checked={mode === "manual"} type="button" onClick={() => setMode("manual")}><Plus size={17} />Add vehicle / VIN</button>
    </div>
    {mode === "inventory" ? <>
      <label><span>Search available vehicles</span><input value={query} placeholder="Stock number, VIN, make, or model" onChange={(event) => { setQuery(event.target.value); setPage(1); setResult(null); }} /></label>
      <label><span>Available vehicle</span><select disabled={busy || !choices.length} value={choices.some((item) => item.vehicle.vin === fields.vin) ? choices.find((item) => item.vehicle.vin === fields.vin)!.id : ""} onChange={(event) => {
        const selected = choices.find((item) => item.id === event.target.value);
        if (selected) onApply(testDriveInventoryIdentity(selected));
      }}><option value="">{busy ? "Loading vehicles..." : "Select a vehicle"}</option>{choices.map((item) => <option key={item.id} value={item.id}>{[item.vehicle.year, item.vehicle.make, item.vehicle.model].filter(Boolean).join(" ")} · {item.vehicle.stockNumber || item.inventoryNumber} · {item.vehicle.vin}</option>)}</select></label>
      {error ? <div role="alert">{error}<button type="button" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={16} />Retry</button></div> : result && !choices.length ? <p role="status">No active, frontline-ready vehicles with a complete VIN match this search.</p> : null}
      {result && result.totalPages > 1 && <div className={styles.testDriveVehicleModes}><button type="button" title="Previous vehicles" aria-label="Previous vehicles" disabled={busy || page <= 1} onClick={() => { setResult(null); setPage(page - 1); }}><ChevronLeft size={16} /></button><span>Page {result.page} of {result.totalPages}</span><button type="button" title="Next vehicles" aria-label="Next vehicles" disabled={busy || page >= result.totalPages} onClick={() => { setResult(null); setPage(page + 1); }}><ChevronRight size={16} /></button></div>}
    </> : <>
      <label><span>Vehicle VIN</span><input maxLength={17} value={fields.vin} placeholder="17-character VIN" onChange={(event) => onVinChange(event.target.value.toUpperCase().replace(/\s/g, ""))} /></label>
      <CrmNextVinDecoder vin={fields.vin} query={fields.vin} fields={fields} onApply={onApply} />
    </>}
    {vehicle && <p aria-live="polite">Selected vehicle: {vehicle}</p>}
  </div>;
}
