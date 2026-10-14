import {
  commandMutatesOnlySalesConsoleInternal,
  type AddSalesNote,
  type AddSalesPromise,
  type AttachSalesEvidence,
  type LogSalesActivity,
  type RecordSalesOutcome,
  type SalesActivity,
  type SalesConsoleAuditMetadata,
  type SalesConsoleCommandContract,
  type SalesEvidence,
  type SalesNote,
  type SalesOutcome,
  type SalesPromise
} from "./sales-console-m50-record-command-contract";

export type SalesConsoleInternalRecordingStore = {
  activities: SalesActivity[];
  notes: SalesNote[];
  promises: SalesPromise[];
  evidence: SalesEvidence[];
  outcomes: SalesOutcome[];
};

export type SalesConsoleInternalRecordingResult =
  | { ok: true; recordId: string; store: SalesConsoleInternalRecordingStore }
  | { ok: false; reason: string; store: SalesConsoleInternalRecordingStore };

export const emptySalesConsoleInternalRecordingStore: SalesConsoleInternalRecordingStore = {
  activities: [],
  notes: [],
  promises: [],
  evidence: [],
  outcomes: []
};

function commandHasSafeAudit<TPayload>(command: SalesConsoleCommandContract<TPayload>) {
  return Boolean(
    command.audit.actorId &&
      command.audit.commandId &&
      command.audit.correlationId &&
      command.audit.idempotencyKey &&
      command.audit.sourceLink
  );
}

function alreadyRecorded(store: SalesConsoleInternalRecordingStore, audit: SalesConsoleAuditMetadata) {
  const allAudits = [
    ...store.activities.map((record) => record.audit),
    ...store.notes.map((record) => record.audit),
    ...store.promises.map((record) => record.audit),
    ...store.evidence.map((record) => record.audit),
    ...store.outcomes.map((record) => record.audit)
  ];

  return allAudits.some((existing) => existing.idempotencyKey === audit.idempotencyKey);
}

function rejectUnsafeCommand<TPayload>(
  command: SalesConsoleCommandContract<TPayload>,
  store: SalesConsoleInternalRecordingStore
): SalesConsoleInternalRecordingResult | undefined {
  if (!commandMutatesOnlySalesConsoleInternal(command)) {
    return { ok: false, reason: "command must write only to Sales Console internal records", store };
  }

  if (!commandHasSafeAudit(command)) {
    return { ok: false, reason: "audit and idempotency metadata required", store };
  }

  if (alreadyRecorded(store, command.audit)) {
    return { ok: false, reason: "duplicate idempotency key", store };
  }

  return undefined;
}

export function recordSalesConsoleActivity(
  command: LogSalesActivity,
  store = emptySalesConsoleInternalRecordingStore
): SalesConsoleInternalRecordingResult {
  const rejected = rejectUnsafeCommand(command, store);
  if (rejected) return rejected;

  const record = { id: command.audit.commandId, audit: command.audit, ...command.payload };
  return { ok: true, recordId: record.id, store: { ...store, activities: [...store.activities, record] } };
}

export function recordSalesConsoleNote(
  command: AddSalesNote,
  store = emptySalesConsoleInternalRecordingStore
): SalesConsoleInternalRecordingResult {
  const rejected = rejectUnsafeCommand(command, store);
  if (rejected) return rejected;

  const record = { id: command.audit.commandId, audit: command.audit, ...command.payload };
  return { ok: true, recordId: record.id, store: { ...store, notes: [...store.notes, record] } };
}

export function recordSalesConsolePromise(
  command: AddSalesPromise,
  store = emptySalesConsoleInternalRecordingStore
): SalesConsoleInternalRecordingResult {
  const rejected = rejectUnsafeCommand(command, store);
  if (rejected) return rejected;

  const record = { id: command.audit.commandId, audit: command.audit, ...command.payload };
  return { ok: true, recordId: record.id, store: { ...store, promises: [...store.promises, record] } };
}

export function recordSalesConsoleEvidence(
  command: AttachSalesEvidence,
  store = emptySalesConsoleInternalRecordingStore
): SalesConsoleInternalRecordingResult {
  const rejected = rejectUnsafeCommand(command, store);
  if (rejected) return rejected;

  const record = { id: command.audit.commandId, audit: command.audit, ...command.payload };
  return { ok: true, recordId: record.id, store: { ...store, evidence: [...store.evidence, record] } };
}

export function recordSalesConsoleOutcome(
  command: RecordSalesOutcome,
  store = emptySalesConsoleInternalRecordingStore
): SalesConsoleInternalRecordingResult {
  const rejected = rejectUnsafeCommand(command, store);
  if (rejected) return rejected;

  const record = { id: command.audit.commandId, audit: command.audit, ...command.payload };
  return { ok: true, recordId: record.id, store: { ...store, outcomes: [...store.outcomes, record] } };
}
