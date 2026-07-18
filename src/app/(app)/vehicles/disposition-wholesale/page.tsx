import { DispositionWholesaleWorkspace } from "@/features/inventory/disposition-wholesale-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getDispositionWholesaleWorkspace } from "@/server/disposition-wholesale/service";

type SearchParams = Promise<{ view?: string }>;

export default async function DispositionWholesalePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireCurrentUser();
  const [{ view }, initial] = await Promise.all([searchParams, getDispositionWholesaleWorkspace(user)]);
  return <DispositionWholesaleWorkspace initial={JSON.parse(JSON.stringify(initial))} initialView={view} />;
}
