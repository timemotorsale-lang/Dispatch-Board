import Link from "next/link";
import { Plus } from "lucide-react";

export function laborGuideAddVehicleHref(vin = "") {
  const query = new URLSearchParams({ returnTo: "/diagnostics/labor-guide" });
  const normalized = vin.trim().toUpperCase();
  if (/^[A-HJ-NPR-Z0-9]{17}$/.test(normalized)) query.set("vin", normalized);
  return `/vehicles/workflows/add-vehicle?${query}`;
}

export function LaborGuideVehicleEntry({ vin }: { vin?: string }) {
  return <Link href={laborGuideAddVehicleHref(vin)} target="_blank" rel="noopener noreferrer" aria-describedby="labor-guide-add-vehicle-help"><Plus />Add vehicle (new tab)</Link>;
}
