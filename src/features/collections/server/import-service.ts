/**
 * DealerCenter import: upload -> validate -> preview -> owner confirms -> commit (one transaction).
 * Never deletes accounts. Never overwrites the account type. Never links a customer by name.
 */
import { createHash, randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { normalizeStockNumber } from "@/server/vehicle-registry/domain";

import { CollectionsError } from "../config/permissions";
import { chicagoToday, dateFromFileName, dateOnly, parseBusinessDate, toYmd } from "../domain/money-dates";
import { MAX_IMPORT_BYTES, parseTable, readTable, type ParseIssue } from "../import/parse";
import { buildPreview, nameKey, toImportRecord, type ExistingAccount, type ImportRecord, type PreviewRow, type PreviewSummary, type RowMatch } from "../import/preview";
import { DEALERCENTER_ACTIVE_ACCOUNTS } from "../import/profiles";
import { collectionsAccess, recordAccountEvent } from "./access";
import { loadWorkflowState, statusFor } from "./account-state";
import { loadCollectionsSettings } from "./settings-store";

type Db = Prisma.TransactionClient;

export type StoredPreview = { rows: PreviewRow[]; missingAccountIds: string[] };

function json(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/** Vehicle by normalized stock number; customer suggestion from the vehicle's current owner, else a unique name match. */
async function findMatches(db: Db, organizationId: string, records: ImportRecord[]) {
  const matches = new Map<string, RowMatch>();
  const stockKeys = new Map<string, string>();
  for (const record of records) {
    const normalized = record.stockNumber ? normalizeStockNumber(record.stockNumber).normalized : null;
    if (normalized) stockKeys.set(record.externalAccountId, normalized);
  }
  const vehicles = stockKeys.size
    ? await db.vehicle.findMany({
      where: { organizationId, mergedIntoVehicleId: null, stockNumberNormalized: { in: [...new Set(stockKeys.values())] } },
      select: { id: true, stockNumberNormalized: true, customerRelationships: { where: { effectiveTo: null }, orderBy: { effectiveFrom: "desc" }, take: 1, select: { customerId: true } } }
    })
    : [];
  const vehicleByStock = new Map(vehicles.map(vehicle => [vehicle.stockNumberNormalized, vehicle]));
  const customers = await db.customer.findMany({ where: { organizationId, mergedIntoCustomerId: null }, select: { id: true, displayName: true } });
  const byName = new Map<string, string[]>();
  for (const customer of customers) {
    const key = nameKey(customer.displayName);
    byName.set(key, [...(byName.get(key) ?? []), customer.id]);
  }
  for (const record of records) {
    const vehicle = vehicleByStock.get(stockKeys.get(record.externalAccountId) ?? "");
    const vehicleCustomer = vehicle?.customerRelationships[0]?.customerId ?? null;
    const nameMatches = byName.get(nameKey(record.buyerName)) ?? [];
    matches.set(record.externalAccountId, {
      vehicleId: vehicle?.id ?? null,
      suggestedCustomerId: vehicleCustomer ?? (nameMatches.length === 1 ? nameMatches[0] : null),
      suggestionSource: vehicleCustomer ? "VEHICLE" : nameMatches.length === 1 ? "NAME" : null
    });
  }
  return matches;
}

async function loadExisting(db: Db, organizationId: string): Promise<ExistingAccount[]> {
  const accounts = await db.collectionAccount.findMany({
    where: { organizationId, archivedAt: null },
    select: {
      id: true, externalAccountId: true, customerId: true, vehicleId: true, closedStatus: true,
      snapshots: { orderBy: [{ asOfDate: "desc" }, { createdAt: "desc" }], take: 1 }
    }
  });
  return accounts.map(account => {
    const s = account.snapshots[0];
    return {
      id: account.id,
      externalAccountId: account.externalAccountId,
      customerId: account.customerId,
      vehicleId: account.vehicleId,
      closed: Boolean(account.closedStatus),
      latest: s ? {
        totalBalanceCents: s.totalBalanceCents, amountDueCents: s.amountDueCents, daysPastDue: s.daysPastDue,
        paymentDueDate: toYmd(s.paymentDueDate), dmsRepoStatus: s.dmsRepoStatus, dmsAccountStatus: s.dmsAccountStatus,
        lateCents: s.lateCents, paymentsRemaining: s.paymentsRemaining, promiseDate: toYmd(s.promiseDateFromDms)
      } : null
    };
  });
}

async function storeImportFile(organizationId: string, actorId: string, runId: string, fileName: string, bytes: Uint8Array, checksum: string) {
  const storage = resolveDocumentStorageRuntimeFromEnv();
  if (!storage.adapter || !storage.readiness.readyForByteStorage) return null;
  const documentId = randomUUID();
  const contentType = fileName.toLowerCase().endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const stored = await storage.adapter.writeObject({ bytes, contentType, documentId, expectedChecksumSha256: checksum, fileName: fileName.slice(0, 160), organizationId, // The storage owner type is only used as a folder name; Collections keeps its own type.
    owner: { id: runId, label: `Collections import ${runId}`, type: "COLLECTIONS_IMPORT" } as never, version: 1 });
  await prisma.documentLibraryDocument.create({
    data: {
      id: documentId, organizationId, ownerType: "COLLECTIONS_IMPORT", ownerId: runId, ownerLabel: "Collections · DealerCenter import",
      documentType: "COLLECTIONS_IMPORT_FILE", fileName: stored.fileName, sensitivity: "RESTRICTED", source: "MANUAL_UPLOAD",
      retentionCategory: "FINANCIAL_RECORD", storageProvider: "INTERNAL", storageReference: stored.reference, checksumSha256: checksum,
      sizeBytes: stored.sizeBytes, contentType, createdByUserId: actorId, updatedByUserId: actorId,
      versions: { create: { organizationId, version: 1, storageProvider: "INTERNAL", storageReference: stored.reference, fileName: stored.fileName, contentType, sizeBytes: stored.sizeBytes, checksumSha256: checksum, createdByUserId: actorId } }
    }
  });
  return documentId;
}

export type PreviewResult = {
  runId: string;
  status: "PREVIEW" | "FAILED";
  asOfDate: string;
  summary: PreviewSummary | null;
  errors: ParseIssue[];
  unknownColumns: string[];
  fileStored: boolean;
};

export async function previewCollectionsImport(
  actor: AuthenticatedUser | null,
  input: { fileName: string; bytes: Uint8Array; asOfDate?: string | null }
): Promise<PreviewResult> {
  const access = await collectionsAccess(actor, "IMPORT");
  const fileName = input.fileName.trim().slice(0, 200) || "import";
  if (input.bytes.byteLength < 1) throw new CollectionsError("The file is empty.");
  if (input.bytes.byteLength > MAX_IMPORT_BYTES) throw new CollectionsError("The file is larger than 10 MB. Export only the Active Accounts report.", 413);
  const fileHash = createHash("sha256").update(input.bytes).digest("hex");
  const already = await prisma.collectionsImportRun.findFirst({ where: { organizationId: access.organizationId, fileHash, status: "COMMITTED" }, select: { committedAt: true } });
  if (already) throw new CollectionsError(`This exact file was already imported${already.committedAt ? ` on ${already.committedAt.toLocaleDateString("en-US", { timeZone: "America/Chicago" })}` : ""}. Nothing was changed.`, 409);

  const chosenDate = input.asOfDate ? parseBusinessDate(input.asOfDate) : null;
  if (input.asOfDate && !chosenDate) throw new CollectionsError("Choose a valid 'data as of' date.");
  const asOfDate = chosenDate ?? dateFromFileName(fileName) ?? chicagoToday();
  const settings = await loadCollectionsSettings(access.organizationId);

  let table;
  try {
    table = await readTable(input.bytes, fileName);
  } catch (error) {
    throw new CollectionsError(error instanceof Error && error.message.startsWith("Upload a") ? error.message : "The file couldn't be read. Export it again from DealerCenter as .xlsx or .csv.");
  }
  const parsed = parseTable(table, DEALERCENTER_ACTIVE_ACCOUNTS);
  const runId = randomUUID();
  if (parsed.missingColumns.length || (parsed.rows.length === 0 && parsed.errors.length)) {
    await prisma.collectionsImportRun.create({
      data: { id: runId, organizationId: access.organizationId, fileName, fileHash, uploadedByUserId: access.actor.id, asOfDate: dateOnly(asOfDate), status: "FAILED", finishedAt: new Date(), totalRows: table.rows.length, errorCount: parsed.errors.length, errorDetails: json(parsed.errors), unknownColumns: json(parsed.unknownColumns) }
    });
    return { runId, status: "FAILED", asOfDate, summary: null, errors: parsed.errors, unknownColumns: parsed.unknownColumns, fileStored: false };
  }

  const records = parsed.rows.map(row => toImportRecord(row, settings.graceDays));
  const [existing, matches] = await Promise.all([loadExisting(prisma, access.organizationId), findMatches(prisma, access.organizationId, records)]);
  const preview = buildPreview({ records, existing, matches, errorCount: parsed.errors.length });
  const stored: StoredPreview = { rows: preview.rows, missingAccountIds: preview.missing.map(account => account.id) };

  // Replace any older unconfirmed preview so only one is pending at a time.
  await prisma.collectionsImportRun.updateMany({ where: { organizationId: access.organizationId, status: "PREVIEW" }, data: { status: "CANCELLED", finishedAt: new Date(), previewRows: Prisma.DbNull } });
  await prisma.collectionsImportRun.create({
    data: {
      id: runId, organizationId: access.organizationId, fileName, fileHash, uploadedByUserId: access.actor.id, asOfDate: dateOnly(asOfDate),
      status: "PREVIEW", totalRows: table.rows.length, createdCount: preview.summary.created, updatedCount: preview.summary.updated,
      unchangedCount: preview.summary.unchanged, needsReviewCount: preview.summary.needsReview, errorCount: parsed.errors.length,
      missingCount: preview.summary.missing, totalBalanceCents: preview.summary.totalBalanceCents,
      previewRows: json(stored), summary: json(preview.summary), errorDetails: json(parsed.errors), unknownColumns: json(parsed.unknownColumns)
    }
  });
  let fileStored = false;
  try {
    const documentId = await storeImportFile(access.organizationId, access.actor.id, runId, fileName, input.bytes, fileHash);
    if (documentId) {
      await prisma.collectionsImportRun.update({ where: { id: runId }, data: { fileDocumentId: documentId } });
      fileStored = true;
    }
  } catch {
    // Storage problems never block the import; the run simply has no stored file.
  }
  return { runId, status: "PREVIEW", asOfDate, summary: preview.summary, errors: parsed.errors, unknownColumns: parsed.unknownColumns, fileStored };
}

export async function getImportPreview(actor: AuthenticatedUser | null, runId: string) {
  const access = await collectionsAccess(actor, "IMPORT");
  const run = await prisma.collectionsImportRun.findFirst({ where: { id: runId, organizationId: access.organizationId } });
  if (!run) throw new CollectionsError("This import isn't available.", 404);
  const stored = (run.previewRows ?? { rows: [], missingAccountIds: [] }) as unknown as StoredPreview;
  const missing = stored.missingAccountIds.length
    ? await prisma.collectionAccount.findMany({ where: { organizationId: access.organizationId, id: { in: stored.missingAccountIds } }, select: { id: true, externalAccountId: true, buyerNameRaw: true, dealNumber: true } })
    : [];
  return {
    id: run.id, status: run.status, fileName: run.fileName, asOfDate: toYmd(run.asOfDate), createdAt: run.createdAt.toISOString(),
    summary: run.summary as PreviewSummary | null, errors: (run.errorDetails ?? []) as ParseIssue[], unknownColumns: (run.unknownColumns ?? []) as string[],
    rows: stored.rows.map(row => ({
      rowNumber: row.rowNumber, externalAccountId: row.externalAccountId, buyerName: row.buyerName, dealNumber: row.dealNumber,
      stockNumber: row.stockNumber, daysPastDue: row.daysPastDue, amountDueCents: row.amountDueCents, totalBalanceCents: row.totalBalanceCents,
      bucket: row.bucket, change: row.change, needsReview: row.needsReview, reviewReasons: row.reviewReasons, changedFields: row.changedFields
    })),
    missing
  };
}

export async function cancelCollectionsImport(actor: AuthenticatedUser | null, runId: string) {
  const access = await collectionsAccess(actor, "IMPORT");
  const result = await prisma.collectionsImportRun.updateMany({ where: { id: runId, organizationId: access.organizationId, status: "PREVIEW" }, data: { status: "CANCELLED", finishedAt: new Date(), previewRows: Prisma.DbNull } });
  if (result.count !== 1) throw new CollectionsError("Only an import that is still in preview can be cancelled.", 409);
  return { cancelled: true };
}

export type CommitResult = { runId: string; created: number; updated: number; unchanged: number; needsReview: number; missing: number; dmsPromisesCreated: number; accountIds: string[] };

export async function commitCollectionsImport(actor: AuthenticatedUser | null, runId: string): Promise<CommitResult> {
  const access = await collectionsAccess(actor, "IMPORT");
  const settings = await loadCollectionsSettings(access.organizationId);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`collections-import:${access.organizationId}`}))`;
    const run = await tx.collectionsImportRun.findFirst({ where: { id: runId, organizationId: access.organizationId } });
    if (!run) throw new CollectionsError("This import isn't available.", 404);
    if (run.status !== "PREVIEW") throw new CollectionsError(`This import is already ${run.status.toLowerCase()}. Upload the file again to start over.`, 409);
    const duplicate = await tx.collectionsImportRun.findFirst({ where: { organizationId: access.organizationId, fileHash: run.fileHash, status: "COMMITTED" }, select: { id: true } });
    if (duplicate) throw new CollectionsError("This exact file was already imported. Nothing was changed.", 409);
    const stored = run.previewRows as unknown as StoredPreview;
    const now = new Date();
    const asOf = run.asOfDate;
    const result: CommitResult = { runId, created: 0, updated: 0, unchanged: 0, needsReview: 0, missing: 0, dmsPromisesCreated: 0, accountIds: [] };

    const existing = await tx.collectionAccount.findMany({ where: { organizationId: access.organizationId, externalAccountId: { in: stored.rows.map(row => row.externalAccountId) } } });
    const byExternal = new Map(existing.map(account => [account.externalAccountId, account]));
    const repoById = new Map<string, string | null>();

    for (const row of stored.rows) {
      const current = byExternal.get(row.externalAccountId);
      const common = {
        dealNumber: row.dealNumber,
        contractDate: row.contractDate ? dateOnly(row.contractDate) : null,
        buyerNameRaw: row.buyerName,
        vehicleDescriptionRaw: row.vehicleDescription,
        stockNumberRaw: row.stockNumber,
        daysPastDue: row.daysPastDue,
        bucket: row.bucket,
        amountDueCents: row.amountDueCents,
        totalBalanceCents: row.totalBalanceCents,
        ...(row.paymentAmountCents !== null ? { paymentAmountCents: row.paymentAmountCents } : {}),
        lastImportedAt: now,
        lastImportRunId: runId,
        missingFromImportAt: null,
        missingFromImportRunId: null
      };
      let accountId: string;
      if (!current) {
        const created = await tx.collectionAccount.create({
          data: {
            ...common,
            organizationId: access.organizationId,
            externalAccountId: row.externalAccountId,
            // Account type is never taken from the file (LenderType says BHPH for everything).
            accountType: "LEASE_TO_OWN",
            vehicleId: row.match.vehicleId,
            suggestedCustomerId: row.match.suggestedCustomerId,
            consentDate: row.contractDate ? dateOnly(row.contractDate) : null,
            assignedCollectorUserId: access.actor.id
          }
        });
        accountId = created.id;
        result.created += 1;
        await recordAccountEvent(tx, { organizationId: access.organizationId, accountId, type: "IMPORT_CREATED", after: { externalAccountId: row.externalAccountId, importRunId: runId } });
      } else {
        accountId = current.id;
        await tx.collectionAccount.update({
          where: { id: current.id },
          data: {
            ...common,
            // Only fill links that are still empty; never replace what the owner confirmed.
            ...(!current.vehicleId && row.match.vehicleId ? { vehicleId: row.match.vehicleId } : {}),
            ...(!current.customerId && !current.suggestedCustomerId && row.match.suggestedCustomerId ? { suggestedCustomerId: row.match.suggestedCustomerId } : {}),
            version: { increment: 1 }
          }
        });
        if (row.change === "UPDATED" || current.missingFromImportAt) {
          result.updated += 1;
          await recordAccountEvent(tx, {
            organizationId: access.organizationId, accountId, type: "IMPORT_UPDATED", reason: `DealerCenter import ${toYmd(asOf)}`,
            before: { daysPastDue: current.daysPastDue, amountDueCents: current.amountDueCents, totalBalanceCents: current.totalBalanceCents, missingFromImportAt: current.missingFromImportAt },
            after: { daysPastDue: row.daysPastDue, amountDueCents: row.amountDueCents, totalBalanceCents: row.totalBalanceCents, changedFields: row.changedFields }
          });
        } else {
          result.unchanged += 1;
        }
      }
      if (row.needsReview) result.needsReview += 1;
      result.accountIds.push(accountId);
      repoById.set(accountId, row.dmsRepoStatus);
      await tx.collectionAccountSnapshot.create({
        data: {
          organizationId: access.organizationId, accountId, importRunId: runId, asOfDate: asOf,
          downCents: row.downCents, principalCents: row.principalCents, interestCents: row.interestCents, otherCents: row.otherCents,
          lateCents: row.lateCents, sideNoteCents: row.sideNoteCents, creditCents: row.creditCents, totalBalanceCents: row.totalBalanceCents,
          amountDueCents: row.amountDueCents, paymentAmountCents: row.paymentAmountCents,
          paymentDueDate: row.paymentDueDate ? dateOnly(row.paymentDueDate) : null, daysPastDue: row.daysPastDue,
          paymentsRemaining: row.paymentsRemaining, promiseDateFromDms: row.promiseDate ? dateOnly(row.promiseDate) : null,
          dmsAccountStatus: row.dmsAccountStatus, dmsRepoStatus: row.dmsRepoStatus, dmsInsuranceStatus: row.dmsInsuranceStatus,
          dmsAutopayStatus: row.dmsAutopayStatus, dmsCollectorName: row.dmsCollectorName, dmsLenderType: row.dmsLenderType, bucket: row.bucket
        }
      });
      // A DealerCenter promise date with no matching open promise becomes a tracked promise.
      if (row.promiseDate) {
        const promiseDate = dateOnly(row.promiseDate);
        const open = await tx.paymentPromise.findFirst({ where: { accountId, status: "OPEN", promisedDate: promiseDate }, select: { id: true } });
        const seen = await tx.paymentPromise.findFirst({ where: { accountId, source: "IMPORTED_FROM_DMS", promisedDate: promiseDate }, select: { id: true } });
        if (!open && !seen) {
          await tx.paymentPromise.create({
            data: { organizationId: access.organizationId, accountId, promisedAmountCents: row.amountDueCents, promisedDate: promiseDate, source: "IMPORTED_FROM_DMS", baselineAmountDueCents: row.amountDueCents, baselineDaysPastDue: row.daysPastDue }
          });
          result.dmsPromisesCreated += 1;
        }
      }
    }

    // Accounts that were active but are missing from this file: flag, never delete.
    const missingIds = stored.missingAccountIds;
    if (missingIds.length) {
      const toFlag = await tx.collectionAccount.findMany({ where: { organizationId: access.organizationId, id: { in: missingIds }, closedStatus: null }, select: { id: true, missingFromImportAt: true } });
      for (const account of toFlag) {
        if (!account.missingFromImportAt) {
          await tx.collectionAccount.update({ where: { id: account.id }, data: { missingFromImportAt: now, missingFromImportRunId: runId, version: { increment: 1 } } });
          await recordAccountEvent(tx, { organizationId: access.organizationId, accountId: account.id, type: "NOT_IN_LATEST_IMPORT", reason: "Missing from the latest DealerCenter import. Confirm whether it was paid off, closed or repossessed.", after: { importRunId: runId } });
        }
        result.missing += 1;
      }
    }

    // Status from the new snapshots plus workflow state.
    const states = await loadWorkflowState(tx, access.organizationId, result.accountIds);
    const fresh = await tx.collectionAccount.findMany({ where: { id: { in: result.accountIds } }, select: { id: true, daysPastDue: true, closedStatus: true, status: true } });
    for (const account of fresh) {
      const next = statusFor(account, repoById.get(account.id) ?? null, states.get(account.id), settings);
      if (next.status !== account.status) {
        await tx.collectionAccount.update({ where: { id: account.id }, data: { status: next.status } });
        await recordAccountEvent(tx, { organizationId: access.organizationId, accountId: account.id, type: "STATUS_CHANGE", before: { status: account.status }, after: { status: next.status }, reason: "DealerCenter import" });
      }
    }

    await tx.collectionsImportRun.update({
      where: { id: runId },
      data: {
        status: "COMMITTED", committedAt: now, committedByUserId: access.actor.id, finishedAt: now,
        createdCount: result.created, updatedCount: result.updated, unchangedCount: result.unchanged,
        needsReviewCount: result.needsReview, missingCount: result.missing, previewRows: Prisma.DbNull
      }
    });
    return result;
  }, { timeout: 120_000, maxWait: 10_000 });
}

export async function listCollectionsImports(actor: AuthenticatedUser | null) {
  const access = await collectionsAccess(actor, "IMPORT");
  const runs = await prisma.collectionsImportRun.findMany({
    where: { organizationId: access.organizationId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, fileName: true, status: true, asOfDate: true, createdAt: true, committedAt: true, totalRows: true, createdCount: true, updatedCount: true, unchangedCount: true, needsReviewCount: true, errorCount: true, missingCount: true, totalBalanceCents: true, fileDocumentId: true }
  });
  return runs.map(run => ({ ...run, asOfDate: toYmd(run.asOfDate), createdAt: run.createdAt.toISOString(), committedAt: run.committedAt?.toISOString() ?? null, fileStored: Boolean(run.fileDocumentId) }));
}
