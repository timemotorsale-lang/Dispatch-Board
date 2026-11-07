import { requireCurrentUser } from "@/server/auth/current-user";
import { SalesDocumentsWorkspace } from "@/features/sales-documents/sales-documents-workspace";
import { listSalesDocumentJackets, getSalesDocumentJacket, requireSalesDocumentsUser } from "@/server/sales-documents/service";
import { phoneAppOrigin } from "@/lib/phone-document-handoff";

export default async function SalesDocumentsPage({ searchParams }: { searchParams: Promise<{ jacketId?: string; customerId?: string; q?: string; requirementId?: string; scan?: string }> }) {
  const params = await searchParams;
  const returnQuery = new URLSearchParams();
  if (params.jacketId) returnQuery.set("jacketId", params.jacketId);
  if (params.requirementId) returnQuery.set("requirementId", params.requirementId);
  if (params.scan === "1") returnQuery.set("scan", "1");
  const actor = await requireCurrentUser("/sales-documents" + (returnQuery.size ? `?${returnQuery}` : ""));
  let error = "", jackets = null, selected = null, canWaive = false;
  try {
    jackets = await listSalesDocumentJackets(actor, params.q, "", params.customerId);
    selected = params.jacketId ? await getSalesDocumentJacket(actor, params.jacketId) : null;
    try { requireSalesDocumentsUser(actor, true); canWaive = true; } catch { /* Staff can review; exceptions require elevated access. */ }
  } catch (caught) { error = caught instanceof Error ? caught.message : "Sales Documents is unavailable."; }
  return <SalesDocumentsWorkspace initialJackets={jackets ?? []} initialSelected={selected} initialError={error} canWaive={canWaive} initialQuery={params.q} customerId={params.customerId} initialRequirementId={params.requirementId} initialScan={params.scan === "1"} phoneOrigin={phoneAppOrigin(process.env.AUTH_PUBLIC_BASE_URL ?? "") ?? ""} />;
}
