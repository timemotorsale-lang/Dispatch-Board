"use client";
import { useContext, useEffect } from "react";
import { SharedDealVehicleContext } from "./shared-deal-identities";
import { useDealDraft, useDealDraftState } from "./deal-draft-workspace";

export function BhphVehicleFields({ vehicle, onVehicleChange }: { vehicle: string; onVehicleChange: (value: string) => void }) {
  const canonical = useContext(SharedDealVehicleContext), draft = useDealDraft();
  const legacy = draft?.read("fields") as Record<string, unknown> | undefined;
  const old = (label: string) => typeof legacy?.[`bhph:${label}:0`] === "string" ? String(legacy[`bhph:${label}:0`]) : "";
  const [extras, setExtras] = useDealDraftState("vehicleDetailExtras", { vehicleId: canonical?.id ?? "", trim: old("Trim"), mileage: old("Mileage"), odometerStatus: old("Odometer status"), parkingLocation: old("Lot / key location") });
  const sameVehicle = !extras.vehicleId || extras.vehicleId === canonical?.id;
  useEffect(() => {
    if (!canonical || extras.vehicleId === canonical.id) return;
    setExtras(current => current.vehicleId && current.vehicleId !== canonical.id ? { vehicleId: canonical.id, trim: "", mileage: "", odometerStatus: "", parkingLocation: "" } : { ...current, vehicleId: canonical.id });
  }, [canonical, extras.vehicleId, setExtras]);
  const field = (label: string, value: string, onChange?: (value: string) => void, placeholder = "Not recorded") => <label key={label}><span>{label}</span><input value={value} readOnly={!onChange} onChange={onChange ? event => onChange(event.target.value) : undefined} placeholder={placeholder} /></label>;
  const edit = (key: "trim" | "mileage" | "parkingLocation", value: string) => setExtras(current => ({ ...current, [key]: value }));
  return <div data-deal-state-managed style={{ display: "contents" }}>
    {field("Vehicle / stock #", vehicle, onVehicleChange, "Select the shared vehicle above")}
    {field("VIN", canonical?.vin ?? "")}
    {field("Stock no.", canonical?.stockNumber ?? "")}
    {field("Year", canonical?.year ?? "")}
    {field("Make", canonical?.make ?? "")}
    {field("Model", canonical?.model ?? "")}
    {field("Trim", canonical?.trim || (sameVehicle ? extras.trim : ""), canonical?.trim ? undefined : value => edit("trim", value))}
    {field("Color", canonical?.color ?? "")}
    {field("Plate", canonical?.licensePlate ?? "")}
    {field("Mileage", canonical?.recordedMileage || (sameVehicle ? extras.mileage : ""), canonical?.recordedMileage ? undefined : value => edit("mileage", value))}
    <label><span>Odometer status</span><select value={sameVehicle ? extras.odometerStatus : ""} onChange={event => setExtras(current => ({ ...current, odometerStatus: event.target.value }))}><option value="">Choose after review</option><option>Actual miles</option><option>Not actual</option><option>Exceeds mechanical limits</option><option>Exempt</option></select></label>
    {field("Lot / key location", sameVehicle ? extras.parkingLocation : "", value => edit("parkingLocation", value), "Front line, bay, row, key tag")}
    <small style={{ gridColumn: "1 / -1" }}>Vehicle identity comes from the shared record. Missing details show “Not recorded”. Recorded mileage is a reference; confirm the actual delivery odometer below.</small>
  </div>;
}
