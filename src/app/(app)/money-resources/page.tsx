import { requireCurrentUser } from "@/server/auth/current-user";
import { MoneyResourcesWorkbench } from "@/features/money-resources/workbench";

export default async function MoneyResourcesPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requireCurrentUser();
  const query = await searchParams ?? {};
  const value = (key: string) => typeof query[key] === "string" ? query[key] as string : "";
  return <MoneyResourcesWorkbench vehicleId={value("vehicleId")} repairOrderId={value("repairOrderId")} initialDate={value("date")} initialAction={value("action")} />;
}
