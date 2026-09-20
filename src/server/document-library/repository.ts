import {
  DocumentLibraryError,
  type DocumentAuditEvent,
  type DocumentLibraryCommand,
  type DocumentRecord,
  type PacketRecord,
  previewArchiveEligibility,
  previewReviewDecision,
  resolvePacket
} from "./domain";

export type DocumentLibraryState = {
  auditEvents: DocumentAuditEvent[];
  documents: DocumentRecord[];
  idempotencyKeys: string[];
  packets: PacketRecord[];
};

export type DocumentLibraryCommandResult = {
  auditEvent: DocumentAuditEvent;
  document?: DocumentRecord;
  packet?: ReturnType<typeof resolvePacket>;
  state: DocumentLibraryState;
};

function cloneState(state: DocumentLibraryState): DocumentLibraryState {
  return {
    auditEvents: state.auditEvents.map((event) => ({ ...event })),
    documents: state.documents.map((document) => ({
      ...document,
      auditTrail: document.auditTrail.map((event) => ({ ...event })),
      owner: { ...document.owner },
      providerReferences: document.providerReferences.map((reference) => ({ ...reference })),
      storage: { ...document.storage }
    })),
    idempotencyKeys: [...state.idempotencyKeys],
    packets: state.packets.map((packet) => ({
      ...packet,
      documents: [...packet.documents],
      owner: { ...packet.owner },
      requirements: packet.requirements.map((requirement) => ({
        ...requirement,
        waived: requirement.waived ? { ...requirement.waived } : undefined
      }))
    }))
  };
}

function requireIdempotency(state: DocumentLibraryState, key: string) {
  const normalized = key.trim();
  if (!normalized) throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", "Document Library commands require an idempotency key.");
  if (state.idempotencyKeys.includes(normalized)) throw new DocumentLibraryError("DOCUMENT_LIBRARY_IDEMPOTENCY_CONFLICT", "Document Library command idempotency key was already used.");
  return normalized;
}

function requireReason(reason: string | undefined, message = "Document Library command requires a reason.") {
  const normalized = reason?.trim() ?? "";
  if (!normalized) throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", message);
  return normalized;
}

function audit(input: { action: string; actorId: string; at: string; idempotencyKey: string; note: string; subjectId: string }): DocumentAuditEvent {
  return input;
}

function appendAudit(document: DocumentRecord, event: DocumentAuditEvent): DocumentRecord {
  return {
    ...document,
    auditTrail: [
      ...document.auditTrail,
      { action: event.action, actor: event.actorId, at: event.at, note: event.note }
    ]
  };
}

function replaceDocument(state: DocumentLibraryState, document: DocumentRecord) {
  return {
    ...state,
    documents: state.documents.map((item) => item.id === document.id ? document : item)
  };
}

function replacePacket(state: DocumentLibraryState, packet: PacketRecord) {
  return {
    ...state,
    packets: state.packets.map((item) => item.id === packet.id ? packet : item)
  };
}

export function executeDocumentLibraryCommand(input: {
  actorId: string;
  command: DocumentLibraryCommand;
  now?: Date;
  state: DocumentLibraryState;
}): DocumentLibraryCommandResult {
  let state = cloneState(input.state);
  const command = input.command;
  const at = (input.now ?? new Date()).toISOString();
  const idempotencyKey = requireIdempotency(state, command.idempotencyKey);
  const reason = "reason" in command ? requireReason(command.reason) : undefined;
  const commit = (nextState: DocumentLibraryState, event: DocumentAuditEvent, document?: DocumentRecord, packetRecord?: PacketRecord): DocumentLibraryCommandResult => {
    const finalState = {
      ...nextState,
      auditEvents: [...nextState.auditEvents, event],
      idempotencyKeys: [...nextState.idempotencyKeys, idempotencyKey]
    };
    return {
      auditEvent: event,
      document,
      packet: packetRecord ? resolvePacket(packetRecord, finalState.documents) : undefined,
      state: finalState
    };
  };

  if (command.action === "CREATE_DOCUMENT") {
    const document: DocumentRecord = {
      auditTrail: [],
      createdAt: at,
      documentType: command.documentType.trim(),
      fileName: command.fileName.trim(),
      id: `doc-manual-${state.documents.length + 1}`,
      legalHold: false,
      owner: { ...command.owner },
      providerReferences: [],
      retentionCategory: command.documentType.trim(),
      sensitivity: command.sensitivity,
      source: command.source,
      status: "RECEIVED",
      storage: { ...command.storage }
    };
    if (!document.documentType || !document.fileName) throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", "Document type and file name are required.");

    let packetRecord: PacketRecord | undefined;
    state = { ...state, documents: [...state.documents, appendAudit(document, audit({ action: "DOCUMENT_CREATED", actorId: input.actorId, at, idempotencyKey, note: reason!, subjectId: document.id }))] };
    if (command.packetId) {
      const packet = state.packets.find((item) => item.id === command.packetId);
      if (!packet) throw new DocumentLibraryError("DOCUMENT_LIBRARY_NOT_FOUND", "Packet was not found.");
      packetRecord = { ...packet, documents: packet.documents.includes(document.id) ? packet.documents : [...packet.documents, document.id] };
      state = replacePacket(state, packetRecord);
    }
    const created = state.documents.find((item) => item.id === document.id)!;
    const event = audit({ action: "DOCUMENT_CREATED", actorId: input.actorId, at, idempotencyKey, note: reason!, subjectId: document.id });
    return commit(state, event, created, packetRecord);
  }

  if (command.action === "LINK_DOCUMENT_TO_PACKET") {
    const document = state.documents.find((item) => item.id === command.documentId);
    const packet = state.packets.find((item) => item.id === command.packetId);
    if (!document || !packet) throw new DocumentLibraryError("DOCUMENT_LIBRARY_NOT_FOUND", "Document or packet was not found.");
    const packetRecord = { ...packet, documents: packet.documents.includes(document.id) ? packet.documents : [...packet.documents, document.id] };
    const event = audit({ action: "DOCUMENT_LINKED_TO_PACKET", actorId: input.actorId, at, idempotencyKey, note: reason!, subjectId: packet.id });
    return commit(replacePacket(state, packetRecord), event, document, packetRecord);
  }

  if (command.action === "REVIEW_DOCUMENT") {
    const document = state.documents.find((item) => item.id === command.documentId);
    if (!document) throw new DocumentLibraryError("DOCUMENT_LIBRARY_NOT_FOUND", "Document was not found.");
    const preview = previewReviewDecision({ decision: command.decision, documentId: document.id });
    const reviewReason = preview.reasonRequired ? requireReason(command.reason, "Reject, correction, and waiver review decisions require a reason.") : command.reason?.trim() || "Accepted after review.";
    const updated = appendAudit({ ...document, status: preview.nextStatus }, audit({ action: `DOCUMENT_REVIEW_${command.decision}`, actorId: input.actorId, at, idempotencyKey, note: reviewReason, subjectId: document.id }));
    const packet = state.packets.find((item) => item.documents.includes(document.id));
    const event = audit({ action: `DOCUMENT_REVIEW_${command.decision}`, actorId: input.actorId, at, idempotencyKey, note: reviewReason, subjectId: document.id });
    return commit(replaceDocument(state, updated), event, updated, packet);
  }

  if (command.action === "WAIVE_REQUIREMENT") {
    const packet = state.packets.find((item) => item.id === command.packetId);
    if (!packet) throw new DocumentLibraryError("DOCUMENT_LIBRARY_NOT_FOUND", "Packet was not found.");
    if (!packet.requirements.some((requirement) => requirement.id === command.requirementId)) throw new DocumentLibraryError("DOCUMENT_LIBRARY_NOT_FOUND", "Packet requirement was not found.");
    const packetRecord = {
      ...packet,
      requirements: packet.requirements.map((requirement) => requirement.id === command.requirementId
        ? { ...requirement, waived: { by: input.actorId, reason: reason!, waivedAt: at } }
        : requirement)
    };
    const event = audit({ action: "DOCUMENT_REQUIREMENT_WAIVED", actorId: input.actorId, at, idempotencyKey, note: reason!, subjectId: command.requirementId });
    return commit(replacePacket(state, packetRecord), event, undefined, packetRecord);
  }

  const documentId = command.documentId;
  const document = state.documents.find((item) => item.id === documentId);
  if (!document) throw new DocumentLibraryError("DOCUMENT_LIBRARY_NOT_FOUND", "Document was not found.");

  if (command.action === "ARCHIVE_DOCUMENT") {
    const eligibility = previewArchiveEligibility(document, state.packets);
    if (!eligibility.eligible) throw new DocumentLibraryError("DOCUMENT_LIBRARY_INVALID_ACTION", `Document cannot be archived: ${eligibility.reasons.join(" ")}`);
    const updated = appendAudit({ ...document, status: "ARCHIVED" }, audit({ action: "DOCUMENT_ARCHIVED", actorId: input.actorId, at, idempotencyKey, note: reason!, subjectId: document.id }));
    const event = audit({ action: "DOCUMENT_ARCHIVED", actorId: input.actorId, at, idempotencyKey, note: reason!, subjectId: document.id });
    return commit(replaceDocument(state, updated), event, updated, state.packets.find((packet) => packet.documents.includes(document.id)));
  }

  if (command.action === "RESTORE_DOCUMENT") {
    const updated = appendAudit({ ...document, status: "RECEIVED" }, audit({ action: "DOCUMENT_RESTORED", actorId: input.actorId, at, idempotencyKey, note: reason!, subjectId: document.id }));
    const event = audit({ action: "DOCUMENT_RESTORED", actorId: input.actorId, at, idempotencyKey, note: reason!, subjectId: document.id });
    return commit(replaceDocument(state, updated), event, updated, state.packets.find((packet) => packet.documents.includes(document.id)));
  }

  const nextLegalHold = command.action === "SET_LEGAL_HOLD";
  const updated = appendAudit({ ...document, legalHold: nextLegalHold }, audit({ action: nextLegalHold ? "DOCUMENT_LEGAL_HOLD_APPLIED" : "DOCUMENT_LEGAL_HOLD_RELEASED", actorId: input.actorId, at, idempotencyKey, note: reason!, subjectId: document.id }));
  const event = audit({ action: nextLegalHold ? "DOCUMENT_LEGAL_HOLD_APPLIED" : "DOCUMENT_LEGAL_HOLD_RELEASED", actorId: input.actorId, at, idempotencyKey, note: reason!, subjectId: document.id });
  return commit(replaceDocument(state, updated), event, updated, state.packets.find((packet) => packet.documents.includes(document.id)));
}
