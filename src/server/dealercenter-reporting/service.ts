import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { chicagoToday } from "@/features/collections/domain/money-dates";
import {
  parseDealerCenterReport, type DealerCenterKind, type DealerCenterMapping,
  type InventoryReportRow, type SaleReportRow,
} from "@/features/dealercenter-reporting/import-format";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { isManager } from "@/server/policies/access";

const draftLifetimeMs = 30 * 60_000;

export class DealerCenterReportError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export async function dealerCenterLocations(user: AuthenticatedUser | null, db: Prisma.TransactionClient = prisma) {
  if (!user?.isActive || !isManager(user)) return [];
  const today = new Date(chicagoToday());
  const grants = await db.userLocationAccess.findMany({
    where: { userId: user.id, validFrom: { lte: today }, OR: [{ validTo: null }, { validTo: { gte: today } }] },
    select: { location: { select: { id: true, name: true, organizationId: true } } },
    orderBy: { location: { name: "asc" } },
  });
  return grants.map(grant => grant.location);
}

async function requireLocation(user: AuthenticatedUser | null, locationId: string, db: Prisma.TransactionClient = prisma) {
  if (!user?.isActive) throw new DealerCenterReportError("Sign in to review a DealerCenter report.", 401);
  const location = (await dealerCenterLocations(user, db)).find(item => item.id === locationId);
  if (!location) throw new DealerCenterReportError("A manager assigned to this location must review the report.", 403);
  return { organizationId: location.organizationId, locationId, actorUserId: user.id };
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

type Scope = { organizationId: string; locationId: string };
type SalesRowState = SaleReportRow & { action: "New" | "Unchanged" | "Update"; previousDate?: string; previousAmountCents?: number; refreshSource?: boolean };

function latestInventory(db: Prisma.TransactionClient, scope: Scope) {
  return db.dealerCenterReportImport.findFirst({
    where: { organizationId: scope.organizationId, locationId: scope.locationId, kind: "INVENTORY", committedAt: { not: null }, resultId: null },
    orderBy: [{ committedAt: "desc" }, { id: "desc" }],
  });
}

function previouslyConfirmed(db: Prisma.TransactionClient, scope: Scope, kind: string, dataAsOf: string, fingerprint: string) {
  return db.dealerCenterReportImport.findFirst({
    where: { organizationId: scope.organizationId, locationId: scope.locationId, kind, dataAsOf, fingerprint, committedAt: { not: null }, resultId: null },
    select: { id: true },
  });
}

function assertCurrentReport(prior: { id: string } | null) {
  if (prior) throw new DealerCenterReportError("This file was already confirmed and has since been superseded. Use the corrected export.", 409);
}

async function salesChanges(db: Prisma.TransactionClient, scope: Scope, rows: SaleReportRow[], dataAsOf: string) {
  const previousRows = await db.dealerCenterReportedSale.findMany({
    where: { organizationId: scope.organizationId, dealNumber: { in: rows.map(row => row.deal) } },
    orderBy: { dealNumber: "asc" }, include: { source: { select: { dataAsOf: true } } },
  });
  const previousByDeal = new Map(previousRows.map(previous => [previous.dealNumber, previous]));
  const details: SalesRowState[] = rows.map(row => {
    const previous = previousByDeal.get(row.deal);
    if (!previous) return { ...row, action: "New" };
    if (previous.locationId !== scope.locationId) {
      throw new DealerCenterReportError("Deal " + row.deal + " already belongs to another location. Check the export and selected location.", 409);
    }
    const vin = row.vin || previous.vin;
    const stock = row.stock || previous.stock;
    if (previous.soldDate === row.date && previous.amountCents === row.amountCents && previous.vin === vin && previous.stock === stock) {
      return { ...row, vin, stock, action: "Unchanged", refreshSource: dataAsOf > previous.source.dataAsOf };
    }
    if (dataAsOf < previous.source.dataAsOf) {
      throw new DealerCenterReportError("Deal " + row.deal + " has a later confirmed report. Use a current export to correct it.", 409);
    }
    return { ...row, vin, stock, action: "Update", previousDate: previous.soldDate, previousAmountCents: previous.amountCents };
  });
  return { details, basis: digest(previousRows.map(row => [row.dealNumber, row.importId])) };
}

function inventoryChanges(rows: InventoryReportRow[], previous: InventoryReportRow[]) {
  const old = new Map(previous.map(row => [row.vin, row]));
  const current = new Set(rows.map(row => row.vin));
  const details = rows.map(row => {
    const prior = old.get(row.vin);
    return { ...row, action: !prior ? "New" : digest(prior) === digest(row) ? "Unchanged" : "Update",
      previousStatus: prior?.status, previousCostCents: prior?.costCents, previousPriceCents: prior?.priceCents,
    };
  });
  return { details, omitted: previous.filter(row => !current.has(row.vin)) };
}

export async function previewDealerCenterReport(user: AuthenticatedUser | null, input: {
  kind: DealerCenterKind; locationId: string; dataAsOf: string; fileName: string; csv: string; mapping: DealerCenterMapping; completedOnly: boolean;
}) {
  const scope = await requireLocation(user, input.locationId);
  const today = chicagoToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dataAsOf) || input.dataAsOf > today ||
      new Date(input.dataAsOf).toJSON()?.slice(0, 10) !== input.dataAsOf) {
    throw new DealerCenterReportError("Choose a valid report date on or before today.");
  }
  let report: ReturnType<typeof parseDealerCenterReport>;
  try {
    report = parseDealerCenterReport(input.kind, input.csv, input.mapping, input.completedOnly);
  } catch (error) {
    throw new DealerCenterReportError(error instanceof Error ? error.message : "Could not read this report.");
  }
  if (report.issues.length) return { issues: report.issues, totalRows: report.totalRows, draft: null };
  if (input.kind === "SALES" && (report.records as SaleReportRow[]).some(row => row.date > input.dataAsOf)) {
    throw new DealerCenterReportError("The file contains a sale dated after the report date. Check the report dates.");
  }

  const last = input.kind === "INVENTORY" ? await latestInventory(prisma, scope) : null;
  if (last && last.dataAsOf > input.dataAsOf) {
    throw new DealerCenterReportError("Inventory already has a newer report. Choose a current export.", 409);
  }
  const inventory = input.kind === "INVENTORY"
    ? inventoryChanges(report.records as InventoryReportRow[], (last?.rows ?? []) as InventoryReportRow[]) : null;
  const sales = input.kind === "SALES" ? await salesChanges(prisma, scope, report.records as SaleReportRow[], input.dataAsOf) : null;
  const records = report.records as unknown as Prisma.InputJsonValue;
  const sorted = [...report.records].sort((a, b) => ("deal" in a ? a.deal : a.vin).localeCompare("deal" in b ? b.deal : b.vin));
  const fingerprint = digest(sorted);
  const changesCurrent = inventory ? Boolean(last && last.fingerprint !== fingerprint) : Boolean(sales?.details.some(row => row.action !== "Unchanged"));
  if (changesCurrent) assertCurrentReport(await previouslyConfirmed(prisma, scope, input.kind, input.dataAsOf, fingerprint));
  const draft = await prisma.dealerCenterReportImport.create({
    data: {
      ...scope, kind: input.kind, dataAsOf: input.dataAsOf,
      fileName: input.fileName.split(/[\\/]/).at(-1)?.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 160) || "DealerCenter report",
      fingerprint, basisId: sales?.basis ?? last?.id, rows: records,
    },
    select: { id: true, dataAsOf: true },
  });
  return { issues: [], totalRows: report.totalRows,
    draft: { ...draft, rows: (inventory ?? sales)!.details, omitted: inventory?.omitted ?? [] } };
}

export async function confirmDealerCenterReport(user: AuthenticatedUser | null, id: string) {
  if (!user?.isActive) throw new DealerCenterReportError("Sign in to confirm the report.", 401);
  if (!isManager(user)) throw new DealerCenterReportError("A manager must confirm this report.", 403);
  const draft = await prisma.dealerCenterReportImport.findFirst({
    where: { id, actorUserId: user.id },
    select: { id: true, locationId: true, organizationId: true },
  });
  if (!draft) throw new DealerCenterReportError("This preview is unavailable. Upload and review the file again.", 404);
  return prisma.$transaction(async tx => {
    // Serialize confirmation within the company, including deals imported from different locations.
    await tx.$queryRaw`SELECT "id" FROM "Organization" WHERE "id" = ${draft.organizationId} FOR UPDATE`;
    const { organizationId, locationId } = await requireLocation(user, draft.locationId, tx);
    if (organizationId !== draft.organizationId) throw new DealerCenterReportError("The location’s company changed. Preview the report again.", 409);
    const scope = { organizationId, locationId };
    const current = await tx.dealerCenterReportImport.findUniqueOrThrow({ where: { id } });
    const receipt = (importedCount: number, unchangedCount: number, reportId = id) => ({ id: reportId, kind: current.kind, importedCount, unchangedCount, dataAsOf: current.dataAsOf });
    if (current.committedAt) return receipt(current.importedCount, current.unchangedCount, current.resultId ?? id);
    if (Date.now() - current.createdAt.getTime() > draftLifetimeMs) {
      throw new DealerCenterReportError("This preview expired. Review the file again before confirming.", 409);
    }
    let updated = 0, unchanged = 0;
    if (current.kind === "INVENTORY") {
      const latest = await latestInventory(tx, scope);
      const rows = current.rows as InventoryReportRow[];
      if (latest?.dataAsOf === current.dataAsOf && latest.fingerprint === current.fingerprint) {
        await tx.dealerCenterReportImport.update({
          where: { id }, data: { committedAt: new Date(), resultId: latest.id, unchangedCount: rows.length },
        });
        return receipt(0, rows.length, latest.id);
      }
      if (latest && latest.fingerprint !== current.fingerprint) {
        assertCurrentReport(await previouslyConfirmed(tx, scope, current.kind, current.dataAsOf, current.fingerprint));
      }
      if ((latest?.id ?? null) !== current.basisId || (latest && latest.dataAsOf > current.dataAsOf)) {
        throw new DealerCenterReportError("Inventory changed after preview. Review the file again before confirming.", 409);
      }
      const detail = inventoryChanges(rows, (latest?.rows ?? []) as InventoryReportRow[]).details;
      unchanged = detail.filter(row => row.action === "Unchanged").length;
      updated = rows.length - unchanged;
    } else {
      const { details, basis } = await salesChanges(tx, scope, current.rows as SaleReportRow[], current.dataAsOf);
      if (details.some(row => row.action !== "Unchanged")) {
        assertCurrentReport(await previouslyConfirmed(tx, scope, current.kind, current.dataAsOf, current.fingerprint));
        if (basis !== current.basisId) throw new DealerCenterReportError("Saved sales changed after preview. Review the file again before confirming.", 409);
      }
      for (const row of details) {
        if (row.action === "Unchanged") {
          unchanged++;
          if (row.refreshSource) await tx.dealerCenterReportedSale.update({
            where: { organizationId_dealNumber: { organizationId, dealNumber: row.deal } }, data: { importId: id },
          });
          continue;
        }
        const values = { soldDate: row.date, amountCents: row.amountCents, vin: row.vin, stock: row.stock, importId: id };
        await tx.dealerCenterReportedSale.upsert({
          where: { organizationId_dealNumber: { organizationId, dealNumber: row.deal } },
          create: { ...scope, ...values, dealNumber: row.deal }, update: values,
        });
        updated++;
      }
    }
    await tx.dealerCenterReportImport.update({ where: { id }, data: { committedAt: new Date(), importedCount: updated, unchangedCount: unchanged } });
    return receipt(updated, unchanged);
  }, { timeout: 20_000 });
}

export async function getDealerCenterReport(user: AuthenticatedUser | null, kind: DealerCenterKind, locationId?: string, month?: string, page = 1) {
  const locations = await dealerCenterLocations(user);
  const location = locationId ? locations.find(item => item.id === locationId) : locations[0];
  if (!location) return null;
  const scope = { organizationId: location.organizationId, locationId: location.id };
  try {
    if (kind === "INVENTORY") {
      const report = await latestInventory(prisma, scope);
      return { kind, location, locations, report, rows: (report?.rows ?? []) as InventoryReportRow[] } as const;
    }
    const where = { ...scope, ...(month ? { soldDate: { startsWith: month + "-" } } : {}) };
    const [sales, latest, totals] = await prisma.$transaction([
      prisma.dealerCenterReportedSale.findMany({
        where, orderBy: [{ soldDate: "desc" }, { dealNumber: "asc" }], skip: (page - 1) * 50, take: 50,
      }),
      prisma.dealerCenterReportImport.findFirst({
        where: { ...scope, kind, committedAt: { not: null } },
        orderBy: [{ committedAt: "desc" }, { id: "desc" }], select: { dataAsOf: true, fileName: true, committedAt: true },
      }),
      prisma.dealerCenterReportedSale.aggregate({ where, _count: true, _sum: { amountCents: true } }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return { kind, location, locations, sales, latest, total: totals._count, amountCents: totals._sum.amountCents ?? 0 } as const;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      throw new DealerCenterReportError("DealerCenter reporting storage is unavailable. Apply the reporting migration to this server.", 503);
    }
    throw error;
  }
}
