import Link from "next/link";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getRepairDocuments } from "@/server/repair-order/document-service";
import { ServiceDocument } from "@/features/inventory/service-document";
import { ServiceDocumentWorkflow } from "@/features/inventory/service-document-workflow";
import { notFound } from "next/navigation";

export default async function ServiceDocumentsPage({ searchParams }: { searchParams: Promise<{ repairOrderId?: string; documentId?: string; sourceId?: string; workspace?: string }> }) {
  const user = await requireCurrentUser(), params = await searchParams;
  if (!params.repairOrderId) return <main><h1>Service documents</h1><p>Open this hub from a repair order or Service Billing.</p><Link href="/vehicles/repair-workbench">Repair workbench</Link></main>;
  const { order, documents } = await getRepairDocuments(user, params.repairOrderId);
  const selected = params.documentId ? documents.find(document => document.id === params.documentId) : params.sourceId ? documents.find(document => document.sourceId === params.sourceId) : null;
  if ((params.documentId || params.sourceId) && !selected) notFound();
  const workspaceDocument = selected ?? documents.find(document => document.kind === "ESTIMATE" || document.kind === "INVOICE" || document.kind === "PAYMENT");
  if ((params.workspace === "1" || selected?.kind === "ESTIMATE" || selected?.kind === "INVOICE") && workspaceDocument) return <ServiceDocumentWorkflow key={workspaceDocument.id} repairOrderId={order.id} selectedId={workspaceDocument.id} documents={documents.map(({ id, sourceId, kind, content, sha256, templateVersion, createdAt, createdByName }) => ({ id, sourceId, kind, content, sha256, templateVersion, createdAt: createdAt.toISOString(), createdByName }))} />;
  if (selected) return <ServiceDocument repairOrderId={order.id} content={selected.content} sha256={selected.sha256} templateVersion={selected.templateVersion} />;
  return <main style={{ maxWidth: 1000, margin: "32px auto", padding: 24 }}><h1>{order.repairOrderNumber} — documents</h1><p>Historical records preserve the customer, vehicle, store, scope, and amounts as issued. Legacy records require a newly reviewed version; no historical authorization is fabricated.</p><Link href={`/vehicles/shop-planning?repairOrderId=${encodeURIComponent(order.id)}`}>Review / record customer authorization</Link>{" · "}<Link href={`/vehicles/service-billing?repairOrderId=${encodeURIComponent(order.id)}`}>Create / Print Final Invoice and receipts</Link><ul>{documents.map(document => <li key={document.id}><Link href={`/service-documents?repairOrderId=${encodeURIComponent(order.id)}&documentId=${encodeURIComponent(document.id)}`}>{document.content.title} — {document.content.number}</Link> · {document.createdAt.toISOString()}</li>)}</ul>{!documents.length && <p>No frozen documents have been issued for this legacy RO.</p>}</main>;
}
