import { CustomerCommandCenter } from "@/features/customers/customer-command-center";
import type { Customer360Tab } from "@/server/services/customer-console-read-service";

const customer360Tabs = new Set<Customer360Tab>([
  "overview",
  "timeline",
  "deals",
  "cases",
  "appointments",
  "documents",
  "vehicles",
  "communications",
  "collections",
  "notes"
]);

function safeCustomer360Tab(value: string | string[] | undefined): Customer360Tab {
  const candidate = Array.isArray(value) ? value[0] : value;
  return customer360Tabs.has(candidate as Customer360Tab) ? candidate as Customer360Tab : "overview";
}

export default async function Customer360Page({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <CustomerCommandCenter initialTab={safeCustomer360Tab(params?.tab)} />;
}
