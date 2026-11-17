export type RepairHistoryKind = "ALL" | "DRAFT" | "ESTIMATE" | "INVOICE" | "RECEIPT";
export type RepairHistoryState = "ALL" | "OPEN" | "CLOSED";
export type RepairHistoryItem = {
  id: string;
  source: "REPAIR_ORDER" | "AUTOBODY_DRAFT" | "LABOR_DRAFT";
  number: string;
  title: string;
  customer: string;
  vehicle: string;
  vin: string | null;
  stockNumber: string | null;
  status: string;
  updatedAt: string;
  href: string;
  documents: Array<{ id: string; kind: string; number: string; version: number; issuedAt: string; href: string }>;
  drafts: Array<{ id: string; label: string; href: string }>;
};
export type RepairHistoryResult = { items: RepairHistoryItem[]; page: number; hasMore: boolean };

export function serviceDocumentHistoryHref(repairOrderId: string, documentId: string) {
  return `/service-documents?${new URLSearchParams({ repairOrderId, documentId, workspace: "1" })}`;
}
