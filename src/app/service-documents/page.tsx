import Link from "next/link";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getRepairDocuments, searchServiceDocuments, type ServiceDocumentSearchKind } from "@/server/repair-order/document-service";
import { ServiceDocument } from "@/features/inventory/service-document";
import { ServiceDocumentWorkflow } from "@/features/inventory/service-document-workflow";
import { safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";
import { notFound } from "next/navigation";

export default async function ServiceDocumentsPage({ searchParams }: { searchParams: Promise<{ repairOrderId?: string; documentId?: string; sourceId?: string; sourceKind?: string; workspace?: string; returnTo?: string; kind?: string; query?: string; page?: string }> }) {
  const user = await requireCurrentUser(), params = await searchParams;
  if (!params.repairOrderId) {
    const kind: ServiceDocumentSearchKind = params.kind === "estimates" || params.kind === "invoices" ? params.kind : "all";
    const query = typeof params.query === "string" ? params.query.trim().slice(0, 120) : "";
    const parsedPage = Number(params.page);
    const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(100_000, parsedPage) : 1;
    const { rows, hasNext } = await searchServiceDocuments(user, { kind, query, page });
    const searchHref = (nextPage: number) => `/service-documents?${new URLSearchParams({ kind, query, page: String(nextPage) })}`;
    return <main className="page-stack" style={{ maxWidth: 1000, margin: "32px auto", padding: 24 }}>
      <h1>Service documents</h1>
      <form action="/service-documents">
        <label>Search by document number, repair order, customer, vehicle, stock number, or VIN <input name="query" defaultValue={query} maxLength={120} /></label>{" "}
        <label>Document type <select name="kind" defaultValue={kind}>
          <option value="all">Estimates and issued invoices</option>
          <option value="estimates">Estimates only</option>
          <option value="invoices">Issued invoices only</option>
        </select></label>{" "}
        <button type="submit">Search documents</button>
      </form>
      {rows.length ? <ul>{rows.map(row => <li key={row.id}>
        <Link href={`/service-documents?${new URLSearchParams({ repairOrderId: row.repairOrderId, documentId: row.id, workspace: "1" })}`}>
          {row.kind === "ESTIMATE" ? "Estimate" : "Invoice"} · {row.number || "Open saved document"}
        </Link>
        {row.customer ? ` · ${row.customer}` : ""}{row.vehicle ? ` · ${row.vehicle}` : ""} · {row.createdAt.toISOString().slice(0, 10)}
      </li>)}</ul> : <p>No matching documents are available to your account.</p>}
      <nav aria-label="Search results pages">
        {page > 1 && <Link href={searchHref(page - 1)}>Previous page</Link>}{" "}
        {hasNext && <Link href={searchHref(page + 1)}>Next page</Link>}
      </nav>
      <Link href="/vehicles/repair-workbench">Repair workbench</Link>
    </main>;
  }
  const { order, documents } = await getRepairDocuments(user, params.repairOrderId).catch((error: unknown) => {
    if (error instanceof Error && error.message === "Repair order was not found.") notFound();
    throw error;
  });
  const returnTo = safeLaborGuideReturnTo(typeof params.returnTo === "string" ? params.returnTo : undefined);
  const candidates = params.sourceKind === "INVOICE" ? documents.filter(document => document.kind === "INVOICE") : documents;
  const selected = params.documentId ? candidates.find(document => document.id === params.documentId) : params.sourceId ? candidates.find(document => document.sourceId === params.sourceId) : null;
  if ((params.documentId || params.sourceId) && !selected) notFound();
  const workspaceDocument = selected ?? documents.find(document => document.kind === "ESTIMATE" || document.kind === "INVOICE" || document.kind === "PAYMENT");
  if ((params.workspace === "1" || selected?.kind === "ESTIMATE" || selected?.kind === "INVOICE") && workspaceDocument) return <ServiceDocumentWorkflow returnTo={returnTo} readOnlyReason={order.closedAt ? "This repair order is closed. This exact saved document remains available to view, print, or save as PDF." : undefined} key={workspaceDocument.id} repairOrderId={order.id} selectedId={workspaceDocument.id} documents={documents.map(({ id, sourceId, kind, content, sha256, templateVersion, createdAt, createdByName }) => ({ id, sourceId, kind, content, sha256, templateVersion, createdAt: createdAt.toISOString(), createdByName }))} />;
  if (selected) return <ServiceDocument repairOrderId={order.id} documentId={selected.id} content={selected.content} sha256={selected.sha256} templateVersion={selected.templateVersion} />;
  const returnPath = returnTo?.split(/[?#]/, 1)[0];
  if (returnTo && params.workspace === "1" && (returnPath === "/diagnostics/labor-guide" || returnPath === "/prototype/repair-explorer")) {
    return <main style={{ maxWidth: 1000, margin: "32px auto", padding: 24 }}>
      <Link href={returnTo}>Return to Labor Guide</Link>
      <h1>{order.repairOrderNumber} — documents</h1>
      <p>No saved estimates, invoices or receipts for this repair order yet.</p>
    </main>;
  }
  return <main style={{ maxWidth: 1000, margin: "32px auto", padding: 24 }}><h1>{order.repairOrderNumber} — documents</h1><Link href="/service-documents">Search all estimates and invoices</Link><p>Historical records preserve the customer, vehicle, store, scope, and amounts as issued. Legacy records require a newly reviewed version; no historical authorization is fabricated.</p><Link href={`/prototype/repair-explorer?repairOrderId=${encodeURIComponent(order.id)}`}>Build estimate in Labor Guide</Link>{" · "}<Link href={`/vehicles/shop-planning?repairOrderId=${encodeURIComponent(order.id)}`}>Review / record customer authorization</Link>{" · "}<Link href={`/vehicles/service-billing?repairOrderId=${encodeURIComponent(order.id)}`}>Create / Print Final Invoice and receipts</Link><ul>{documents.map(document => <li key={document.id}><Link href={`/service-documents?repairOrderId=${encodeURIComponent(order.id)}&documentId=${encodeURIComponent(document.id)}`}>{document.content.title} — {document.content.number}</Link> · {document.createdAt.toISOString()}</li>)}</ul>{!documents.length && <p>No frozen documents have been issued for this legacy RO.</p>}</main>;
}
