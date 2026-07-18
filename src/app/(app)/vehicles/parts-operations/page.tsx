import { PartsOperationsWorkspace } from "@/features/inventory/parts-operations-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPartsOperationsWorkspace } from "@/server/parts-operations/service";

type SearchParams = Promise<{ view?: string }>;

export default async function PartsOperationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireCurrentUser();
  const [{ view }, initial] = await Promise.all([
    searchParams,
    getPartsOperationsWorkspace(user)
  ]);

  return (
    <PartsOperationsWorkspace
      initial={JSON.parse(JSON.stringify(initial))}
      initialView={view}
    />
  );
}
