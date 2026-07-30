import {
  hasRequiredAuditMetadata,
  type AddSalesNote,
  type AddSalesPromise,
  type AttachSalesEvidence,
  type CompletedSaleRecord,
  type CreateRevenueOpportunity,
  type CreateSalesOpportunity,
  type CreateSourceReconciliationRecord,
  type LogSalesActivity,
  type RecordCompletedSale,
  type RecordSalesOutcome,
  type RevenueOpportunity,
  type SalesActivity,
  type SalesConsoleAuditMetadata,
  type SalesEvidence,
  type SalesNote,
  type SalesOpportunity,
  type SalesOutcome,
  type SalesPromise,
  type SourceReconciliationRecord
} from "./sales-console-m50-record-command-contract";

export type SalesConsolePersistentRecordStore = {
  salesOpportunities: SalesOpportunity[];
  revenueOpportunities: RevenueOpportunity[];
  activities: SalesActivity[];
  notes: SalesNote[];
  promises: SalesPromise[];
  evidence: SalesEvidence[];
  outcomes: SalesOutcome[];
  completedSales: CompletedSaleRecord[];
  sourceReconciliations: SourceReconciliationRecord[];
};

export type SalesConsolePersistentRecordResult =
  | { ok: true; status: "created"; recordId: string; store: SalesConsolePersistentRecordStore }
  | { ok: true; status: "duplicate"; recordId: string; store: SalesConsolePersistentRecordStore }
  | { ok: false; status: "rejected"; reason: string; store: SalesConsolePersistentRecordStore };

export const emptySalesConsolePersistentRecordStore: SalesConsolePersistentRecordStore = {
  salesOpportunities: [],
  revenueOpportunities: [],
  activities: [],
  notes: [],
  promises: [],
  evidence: [],
  outcomes: [],
  completedSales: [],
  sourceReconciliations: []
};

export type SalesConsoleRecordRepository = {
  read(): SalesConsolePersistentRecordStore;
  write(store: SalesConsolePersistentRecordStore): SalesConsolePersistentRecordStore;
};

export function createInMemorySalesConsoleRecordRepository(
  initial: SalesConsolePersistentRecordStore = emptySalesConsolePersistentRecordStore
): SalesConsoleRecordRepository {
  let current = initial;

  return {
    read() {
      return current;
    },
    write(store) {
      current = store;
      return current;
    }
  };
}

type NamedCommand<TCommand, TName extends string> = TCommand & { name: TName };

type PersistableCommand =
  | NamedCommand<CreateSalesOpportunity, "CreateSalesOpportunity">
  | NamedCommand<CreateRevenueOpportunity, "CreateRevenueOpportunity">
  | NamedCommand<LogSalesActivity, "LogSalesActivity">
  | NamedCommand<AddSalesNote, "AddSalesNote">
  | NamedCommand<AddSalesPromise, "AddSalesPromise">
  | NamedCommand<AttachSalesEvidence, "AttachSalesEvidence">
  | NamedCommand<RecordSalesOutcome, "RecordSalesOutcome">
  | NamedCommand<RecordCompletedSale, "RecordCompletedSale">
  | NamedCommand<CreateSourceReconciliationRecord, "CreateSourceReconciliationRecord">;

function allAudits(store: SalesConsolePersistentRecordStore): SalesConsoleAuditMetadata[] {
  return [
    ...store.salesOpportunities.map((record) => record.createdAudit),
    ...store.revenueOpportunities.map((record) => record.createdAudit),
    ...store.activities.map((record) => record.audit),
    ...store.notes.map((record) => record.audit),
    ...store.promises.map((record) => record.audit),
    ...store.evidence.map((record) => record.audit),
    ...store.outcomes.map((record) => record.audit),
    ...store.completedSales.map((record) => record.audit),
    ...store.sourceReconciliations.map((record) => record.audit)
  ];
}

function duplicateRecordId(store: SalesConsolePersistentRecordStore, audit: SalesConsoleAuditMetadata) {
  const duplicateAudit = allAudits(store).find((existing) => existing.idempotencyKey === audit.idempotencyKey);
  return duplicateAudit?.commandId ?? null;
}

function rejectUnsafe(
  command: Pick<PersistableCommand, "audit" | "mutatesSourceSystem" | "writesTo">,
  store: SalesConsolePersistentRecordStore
): SalesConsolePersistentRecordResult | undefined {
  if (command.writesTo !== "Sales Console Internal" || command.mutatesSourceSystem !== false) {
    return { ok: false, status: "rejected", reason: "source-system mutation rejected", store };
  }

  if (!hasRequiredAuditMetadata(command.audit)) {
    return { ok: false, status: "rejected", reason: "audit and idempotency metadata required", store };
  }

  const duplicate = duplicateRecordId(store, command.audit);
  if (duplicate) {
    return { ok: true, status: "duplicate", recordId: duplicate, store };
  }

  return undefined;
}

export function persistSalesConsoleRecord(
  command: PersistableCommand,
  repository = createInMemorySalesConsoleRecordRepository()
): SalesConsolePersistentRecordResult {
  const store = repository.read();
  const rejected = rejectUnsafe(command, store);
  if (rejected) return rejected;

  switch (command.name) {
    case "CreateSalesOpportunity": {
      const record: SalesOpportunity = {
        id: command.audit.commandId,
        status: "open",
        createdAudit: command.audit,
        ...command.payload
      };
      return { ok: true, status: "created", recordId: record.id, store: repository.write({ ...store, salesOpportunities: [...store.salesOpportunities, record] }) };
    }
    case "CreateRevenueOpportunity": {
      const record: RevenueOpportunity = {
        id: command.audit.commandId,
        status: "open",
        createdAudit: command.audit,
        ...command.payload
      };
      return { ok: true, status: "created", recordId: record.id, store: repository.write({ ...store, revenueOpportunities: [...store.revenueOpportunities, record] }) };
    }
    case "LogSalesActivity": {
      const record: SalesActivity = { id: command.audit.commandId, audit: command.audit, ...command.payload };
      return { ok: true, status: "created", recordId: record.id, store: repository.write({ ...store, activities: [...store.activities, record] }) };
    }
    case "AddSalesNote": {
      const record: SalesNote = { id: command.audit.commandId, audit: command.audit, ...command.payload };
      return { ok: true, status: "created", recordId: record.id, store: repository.write({ ...store, notes: [...store.notes, record] }) };
    }
    case "AddSalesPromise": {
      const record: SalesPromise = { id: command.audit.commandId, audit: command.audit, ...command.payload };
      return { ok: true, status: "created", recordId: record.id, store: repository.write({ ...store, promises: [...store.promises, record] }) };
    }
    case "AttachSalesEvidence": {
      const record: SalesEvidence = { id: command.audit.commandId, audit: command.audit, ...command.payload };
      return { ok: true, status: "created", recordId: record.id, store: repository.write({ ...store, evidence: [...store.evidence, record] }) };
    }
    case "RecordSalesOutcome": {
      const record: SalesOutcome = { id: command.audit.commandId, audit: command.audit, ...command.payload };
      return { ok: true, status: "created", recordId: record.id, store: repository.write({ ...store, outcomes: [...store.outcomes, record] }) };
    }
    case "RecordCompletedSale": {
      const record: CompletedSaleRecord = { id: command.audit.commandId, audit: command.audit, ...command.payload };
      return { ok: true, status: "created", recordId: record.id, store: repository.write({ ...store, completedSales: [...store.completedSales, record] }) };
    }
    case "CreateSourceReconciliationRecord": {
      const record: SourceReconciliationRecord = { id: command.audit.commandId, audit: command.audit, ...command.payload };
      return {
        ok: true,
        status: "created",
        recordId: record.id,
        store: repository.write({ ...store, sourceReconciliations: [...store.sourceReconciliations, record] })
      };
    }
  }

  const exhaustive: never = command;
  return exhaustive;
}

export function salesConsolePersistentServiceStoresCompletedSales() {
  const repository = createInMemorySalesConsoleRecordRepository();
  const audit: SalesConsoleAuditMetadata = {
    actorId: "USER-1",
    actorRole: "Sales Manager",
    storeId: "TMS-001",
    occurredAt: "2026-07-30T15:00:00.000Z",
    commandId: "CMD-M67",
    correlationId: "CORR-M67",
    idempotencyKey: "IDEMP-M67",
    sourceLink: "/sales"
  };

  const result = persistSalesConsoleRecord({
    name: "RecordCompletedSale",
    writesTo: "Sales Console Internal",
    mutatesSourceSystem: false,
    audit,
    payload: {
      salesOpportunityId: "SO-1",
      revenueOpportunityId: "REV-1",
      customerId: "CUST-1",
      customerName: "John Smith",
      revenueLane: "Inventory Cash Sale",
      saleDate: "2026-07-30",
      salespersonId: "USER-1",
      managerId: "MGR-1",
      productLabel: "2022 Toyota RAV4 XLE",
      vehicleStockNumber: "TMS22145",
      grossEstimateCents: 285000,
      paymentPath: "cash",
      lifecycleState: "sale-recorded",
      sourceRecordLinks: ["/customers/customer-360?customerId=CUST-1", "/vehicles/360/TMS22145"],
      evidenceIds: ["EVD-1"],
      reconciliationStatus: "pending"
    }
  }, repository);

  return result.ok && repository.read().completedSales.length === 1;
}
