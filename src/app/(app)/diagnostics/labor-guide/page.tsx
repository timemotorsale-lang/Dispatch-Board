import { redirect } from "next/navigation";
import { ServiceBillingWorkspace } from "@/features/inventory/service-billing-workspace";
import { safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";
import { laborGuideInvoiceHref } from "@/lib/service-billing-workflow";
import { requireCurrentUser } from "@/server/auth/current-user";
import type { PageProps } from "./render-page";

export default async function DiagnosticsLaborGuidePage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  if (first(params.mode) === "invoice") {
    const repairOrderId = first(params.repairOrderId) ?? "";
    const estimateId = first(params.estimateId);
    const documentId = first(params.documentId);
    const documentHash = first(params.documentHash);
    const estimateDocument = documentId !== undefined || documentHash !== undefined
      ? { documentId: documentId ?? "", documentHash: documentHash ?? "" } : undefined;
    const returnTo = safeLaborGuideReturnTo(first(params.returnTo));
    await requireCurrentUser(laborGuideInvoiceHref(repairOrderId, { estimateId, estimateDocument, returnTo }));
    return <ServiceBillingWorkspace invoiceOnly repairOrderId={repairOrderId} estimateId={estimateId} estimateDocument={estimateDocument} returnTo={returnTo} />;
  }
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const selected = first(value);
    if (key !== "guide" && key !== "experience" && selected !== undefined) query.set(key, selected);
  }
  const destination = "/prototype/repair-explorer";
  redirect(`${destination}${query.size ? `?${query}` : ""}`);
}

