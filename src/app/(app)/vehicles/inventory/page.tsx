import { InventoryUnitFoundationWorkspace } from "@/features/inventory/inventory-unit-foundation-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getInventoryUnitCreateOptions, listInventoryUnits } from "@/server/inventory-unit/service";

type InventoryUnitFoundationPageProps = {
  searchParams?: Promise<{
    view?: string;
  }>;
};

export default async function InventoryUnitFoundationPage({ searchParams }: InventoryUnitFoundationPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialView = resolvedSearchParams?.view === "locations" || resolvedSearchParams?.view === "aging" ? resolvedSearchParams.view : "units";
  const user = await requireCurrentUser(); const [initial, options] = await Promise.all([listInventoryUnits(user, { page: 1, pageSize: 25, query: "" }), getInventoryUnitCreateOptions(user)]);
  return <InventoryUnitFoundationWorkspace initial={JSON.parse(JSON.stringify(initial))} initialView={initialView} options={JSON.parse(JSON.stringify(options))} />;
}
