import { redirect } from "next/navigation";

type PageProps = {
  searchParams?: Promise<{ guidedStage?: string; inventoryUnitId?: string; stage?: string }>;
};

export default async function InventoryLifecyclePrototypePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  if (params.inventoryUnitId) query.set("inventoryUnitId", params.inventoryUnitId);
  if (params.guidedStage ?? params.stage) query.set("guidedStage", params.guidedStage ?? params.stage ?? "");
  redirect(`/vehicles/inventory${query.size ? `?${query.toString()}` : ""}`);
}
