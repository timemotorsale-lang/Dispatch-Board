import type { PacketPhase, SalesDocumentRequirement } from "@/lib/sales-document-pathways";

export type JacketDocument = { id: string; type: string; reviewed: boolean; signed: boolean; source: string; versionId: string; checksum: string; fileName: string; contentType: string };

export function closingChecklist(requirements: SalesDocumentRequirement[], documents: JacketDocument[], phase: PacketPhase) {
  return requirements.filter((item) => item.phase === phase).map((item) => {
    const latest = documents.find((doc) => doc.type === item.id && doc.source !== "GENERATED") ?? documents.find((doc) => doc.type === item.id);
    const document = latest?.reviewed && (!item.signed || (latest.signed && latest.source !== "GENERATED")) ? latest : undefined;
    const ready = Boolean(item.waiver || document);
    return { ...item, ready, documentId: document?.id ?? null, blocker: ready || !item.required ? null : item.signed ? "Signed copy needs staff review" : "Document needs staff review" };
  });
}

export class SalesDocumentsError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
