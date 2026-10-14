import { getCurrentUser } from "@/server/auth/current-user";
import { SalesDocumentsWorkspace } from "@/features/sales-documents/sales-documents-workspace";
import { listSalesDocumentJackets, getSalesDocumentJacket, requireSalesDocumentsUser } from "@/server/sales-documents/service";

export default async function SalesDocumentsPage({ searchParams }: { searchParams: Promise<{ jacketId?: string; customerId?: string; q?: string }> }) {
  const params = await searchParams;
  let error = "", jackets = null, selected = null, canWaive = false;
  try {
    const actor = await getCurrentUser();
    jackets = await listSalesDocumentJackets(actor, params.q, "", params.customerId);
    selected = params.jacketId ? await getSalesDocumentJacket(actor, params.jacketId) : null;
    try { requireSalesDocumentsUser(actor, true); canWaive = true; } catch { /* Staff can review; exceptions require elevated access. */ }
  } catch (caught) { error = caught instanceof Error ? caught.message : "Sales Documents is unavailable."; }
  return <SalesDocumentsWorkspace initialJackets={jackets ?? []} initialSelected={selected} initialError={error} canWaive={canWaive} initialQuery={params.q} customerId={params.customerId} />;
}
