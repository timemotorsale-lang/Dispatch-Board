import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { moneyAccess } from "@/server/money-resources/service";
import { businessDate, cents, MoneyError, moneyToday, text } from "@/lib/money-resources";
import { calculateTax, summarizeTax, taxMonth, type TaxCalculation } from "@/lib/compliance-tax";

const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
function revision(records: Array<{ id: string; version: number; status: string }>) {
  return createHash("sha256").update(JSON.stringify(records.map(row => [row.id, row.version, row.status]).sort((left, right) => String(left[0]).localeCompare(String(right[0]))))).digest("hex");
}
export async function complianceAccess(actor: AuthenticatedUser | null) {
  const access = await moneyAccess(actor);
  if (!access.manager) throw new MoneyError("An authorized manager must use the tax preparation tool.", 403);
  return access;
}
export async function getTaxWorksheet(actor: AuthenticatedUser | null, monthValue: unknown) {
  const access = await complianceAccess(actor), month = taxMonth(monthValue);
  return prisma.$transaction(async database => {
    await database.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`compliance:${access.organizationId}`}, 0))`;
    const [records, period, history] = await Promise.all([
      database.complianceTaxRecord.findMany({ where: { organizationId: access.organizationId, month }, orderBy: { createdAt: "asc" } }),
      database.complianceTaxPeriod.findUnique({ where: { organizationId_month: { organizationId: access.organizationId, month } } }),
      database.complianceTaxAudit.findMany({ where: { organizationId: access.organizationId, month }, orderBy: { createdAt: "desc" }, take: 100 })
    ]);
    const rows = records.map(record => ({ ...record, snapshot: record.snapshot as unknown as TaxCalculation }));
    return { month, records: rows, period, summary: summarizeTax(rows), history, revision: revision(rows) };
  });
}
export async function searchTaxLinks(actor: AuthenticatedUser | null, query: string) {
  const { organizationId } = await complianceAccess(actor), search = text(query, 100);
  if (search.length < 2) return { customers: [], vehicles: [] };
  const [customers, vehicles] = await Promise.all([
    prisma.customer.findMany({ where: { organizationId, mergedIntoCustomerId: null, OR: [{ displayName: { contains: search, mode: "insensitive" } }, { customerNumber: { contains: search, mode: "insensitive" } }] }, select: { id: true, displayName: true, customerNumber: true }, take: 30, orderBy: { displayName: "asc" } }),
    prisma.vehicle.findMany({ where: { organizationId, mergedIntoVehicleId: null, OR: ["vin", "stockNumber", "vehicleNumber", "make", "model"].map(key => ({ [key]: { contains: search, mode: "insensitive" } })) }, select: { id: true, year: true, make: true, model: true, stockNumber: true, vin: true }, take: 30, orderBy: { vehicleNumber: "asc" } })
  ]);
  return { customers, vehicles };
}
export async function taxCommand(actor: AuthenticatedUser | null, raw: unknown) {
  const access = await complianceAccess(actor);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new MoneyError("Invalid tax record request.");
  const command = raw as Record<string, unknown>, month = taxMonth(command.month), action = text(command.action);
  return prisma.$transaction(async database => {
    await database.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`compliance:${access.organizationId}`}, 0))`;
    const key = { organizationId: access.organizationId, month };
    const period = await database.complianceTaxPeriod.findUnique({ where: { organizationId_month: key } });
    const audit = async (details: unknown, recordId?: string) => database.complianceTaxAudit.create({ data: { ...key, actorId: access.actor.id, action, details: json(details), recordId } });
    if (action === "SAVE" || action === "VOID") {
      if (period && period.status !== "DRAFT") throw new MoneyError("This period is locked. A filed-return amendment must be handled with your tax reviewer; the original worksheet is preserved.", 409);
      const id = text(command.id);
      const existing = id ? await database.complianceTaxRecord.findFirst({ where: { id, organizationId: access.organizationId, month } }) : null;
      if (id && (!existing || existing.version !== command.version || existing.status !== "ACTIVE")) throw new MoneyError("This record changed. Reload before editing.", 409);
      if (action === "VOID") {
        if (!existing) throw new MoneyError("Choose a record to void.");
        const reason = text(command.reason, 500);
        if (!reason) throw new MoneyError("Enter why this tax record is being voided.");
        await database.complianceTaxRecord.update({ where: { id }, data: { status: "VOID", version: { increment: 1 } } });
        await audit({ reason, before: existing }, id);
        return { id };
      }
      const snapshot = calculateTax(command.input);
      if (snapshot.input.date.slice(0, 7) !== month) throw new MoneyError("The tax-event date must be in the selected reporting month.");
      if (snapshot.input.date > moneyToday()) throw new MoneyError("Record executed contracts only. The tax-event date cannot be in the future.");
      if (snapshot.input.customerId) {
        const customer = await database.customer.findFirst({ where: { id: snapshot.input.customerId, organizationId: access.organizationId, mergedIntoCustomerId: null }, select: { displayName: true } });
        if (!customer) throw new MoneyError("Choose an existing customer in this organization.");
        snapshot.input.customer = customer.displayName;
      }
      if (snapshot.input.vehicleId) {
        const vehicle = await database.vehicle.findFirst({ where: { id: snapshot.input.vehicleId, organizationId: access.organizationId, mergedIntoVehicleId: null }, select: { year: true, make: true, model: true, vin: true, stockNumber: true } });
        if (!vehicle) throw new MoneyError("Choose an existing vehicle in this organization.");
        snapshot.input.vehicle = [vehicle.year, vehicle.make, vehicle.model, vehicle.stockNumber || vehicle.vin].filter(Boolean).join(" ");
      }
      const duplicate = await database.complianceTaxRecord.findFirst({ where: { organizationId: access.organizationId, reference: snapshot.input.reference, kind: snapshot.input.kind, ...(id ? { id: { not: id } } : {}) } });
      if (duplicate) throw new MoneyError(`That contract reference is already recorded in ${duplicate.month}${duplicate.status === "VOID" ? " (voided; use a corrected reference)" : ""}. Open it instead of recording tax again.`, 409);
      const data = { reference: snapshot.input.reference, kind: snapshot.input.kind, snapshot: json(snapshot) };
      const saved = existing
        ? await database.complianceTaxRecord.update({ where: { id }, data: { ...data, version: { increment: 1 } } })
        : await database.complianceTaxRecord.create({ data: { ...data, ...key, createdBy: access.actor.id } });
      await audit({ before: existing, after: saved }, saved.id);
      return { id: saved.id };
    }
    if (action !== "FILE" && action !== "PAY") throw new MoneyError("Choose a supported tax action.");
    if ((period?.version ?? 0) !== command.version) throw new MoneyError("The worksheet changed. Reload before recording confirmation.", 409);
    if (action === "FILE") {
      if (period && period.status !== "DRAFT") throw new MoneyError("This period is already recorded as filed.", 409);
      if (command.reviewed !== true) throw new MoneyError("Review all entries and local tax lines before recording filing confirmation.");
      const currentRecords = await database.complianceTaxRecord.findMany({ where: key });
      if (command.revision !== revision(currentRecords)) throw new MoneyError("The worksheet entries changed. Reload and review the latest version before recording filing confirmation.", 409);
      const records = await database.complianceTaxRecord.findMany({ where: { ...key, status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
      const rows = records.map(record => ({ ...record, snapshot: record.snapshot as unknown as TaxCalculation })), summary = summarizeTax(rows);
      if (summary.needsReview) throw new MoneyError("Resolve the flagged lease entries before recording this worksheet as filed.");
      const filingReference = text(command.reference, 160), filedAt = businessDate(command.date);
      if (!filingReference || filedAt > moneyToday() || filedAt < `${month}-01`) throw new MoneyError("Enter the actual filing confirmation and a valid filing date.");
      const data = { status: "FILED", snapshot: json({ records: rows, summary }), filingReference, filedAt };
      const saved = period ? await database.complianceTaxPeriod.update({ where: { id: period.id }, data: { ...data, version: { increment: 1 } } }) : await database.complianceTaxPeriod.create({ data: { ...key, ...data } });
      await audit({ period: saved });
      return { id: saved.id };
    }
    if (!period || period.status !== "FILED") throw new MoneyError("Record the filing confirmation before recording its payment.");
    const paymentReference = text(command.reference, 160), paidAt = businessDate(command.date), paidCents = cents(command.amount, true);
    const frozen = period.snapshot as unknown as { summary: { totalCents: number } };
    if (!paymentReference || paidAt > moneyToday() || paidAt < `${month}-01`) throw new MoneyError("Enter the actual payment confirmation and a valid payment date.");
    if (paidCents !== frozen.summary.totalCents) throw new MoneyError("The payment amount must match this lease-only worksheet. Other return lines, penalties or adjustments require reconciliation outside this tool.");
    await database.complianceTaxPeriod.update({ where: { id: period.id }, data: { status: "PAID", paymentReference, paidAt, paidCents, version: { increment: 1 } } });
    await audit({ paymentReference, paidAt, paidCents });
    return { id: period.id };
  });
}
export type TaxWorksheet = Awaited<ReturnType<typeof getTaxWorksheet>>;
