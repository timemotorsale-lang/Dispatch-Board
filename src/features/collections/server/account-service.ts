/**
 * Accounts, queue and account-level actions (spec sections 6.1, 6.2, 12, 14).
 * Every read is scoped to the user's organization; every change writes an audit event.
 */
import type { CollectionAccountType, CollectionContactChannel, CollectionContactOutcome, CollectionContactScope, CollectionFlagType, CollectionLanguage, CollectionPaymentFrequency, Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { CollectionsError, hasCollectionsPermission } from "../config/permissions";
import { chicagoToday, dateOnly, toE164, toYmd } from "../domain/money-dates";
import { buildQueue, type QueueFacts, type QueueFilters } from "../domain/queue";
import type { Bucket } from "../domain/status";
import { collectionsAccess, recordAccountEvent, type CollectionsAccess } from "./access";
import { recalculateAccounts } from "./account-state";
import { assertAccountDocument } from "./documents";
import { loadCollectionsSettings } from "./settings-store";

type Db = Prisma.TransactionClient;

export const CONTACT_CHANNELS: CollectionContactChannel[] = ["CALL_OUT", "CALL_IN", "TEXT_OUT", "TEXT_IN", "EMAIL_OUT", "EMAIL_IN", "IN_PERSON", "LETTER", "VOICEMAIL"];
export const CONTACT_OUTCOMES: CollectionContactOutcome[] = ["NO_ANSWER", "LEFT_MESSAGE", "SPOKE_WITH_CUSTOMER", "WRONG_NUMBER", "DISCONNECTED", "PROMISE_MADE", "PLAN_MADE", "PAYMENT_REPORTED", "REFUSED", "DISPUTE", "HARDSHIP", "REQUESTED_NO_CONTACT", "ATTORNEY_REFERRED", "BANKRUPTCY_REPORTED", "OTHER"];
export const FLAG_TYPES: CollectionFlagType[] = ["BANKRUPTCY", "ATTORNEY_REPRESENTED", "CONTACT_RESTRICTED", "DISPUTE", "DECEASED", "SKIP", "DO_NOT_REPO_REVIEW_HOLD"];
export const CONTACT_SCOPES: CollectionContactScope[] = ["NO_TEXT", "NO_CALL", "NO_EMAIL", "NO_CONTACT", "ATTORNEY_ONLY"];
const LANGUAGES: CollectionLanguage[] = ["EN", "ES", "SO", "SW"];
const FREQUENCIES: CollectionPaymentFrequency[] = ["WEEKLY", "BIWEEKLY", "SEMIMONTHLY", "MONTHLY", "UNKNOWN"];

export function text(value: unknown, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function oneOf<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
  throw new CollectionsError(`Choose a valid ${label}.`);
}
function requireReason(value: unknown, min = 5) {
  const reason = text(value, 1000);
  if (reason.length < min) throw new CollectionsError(`Write a short reason (at least ${min} characters).`);
  return reason;
}

/** Collector visibility setting: all accounts, or only the ones assigned to them. */
async function visibilityWhere(access: CollectionsAccess): Promise<Prisma.CollectionAccountWhereInput> {
  if (access.role === "ADMIN") return {};
  const settings = await loadCollectionsSettings(access.organizationId);
  return settings.collectorVisibility === "ASSIGNED_ONLY" ? { assignedCollectorUserId: access.actor.id } : {};
}

export async function findAccount(db: Db, access: CollectionsAccess, id: string) {
  const account = await db.collectionAccount.findFirst({ where: { id, organizationId: access.organizationId, ...(await visibilityWhere(access)) } });
  if (!account) throw new CollectionsError("This account isn't available.", 404);
  return account;
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export async function loadQueueFacts(access: CollectionsAccess): Promise<QueueFacts[]> {
  const today = dateOnly(chicagoToday());
  const brokenSince = new Date(Date.now() - 14 * 86_400_000);
  const accounts = await prisma.collectionAccount.findMany({
    where: { organizationId: access.organizationId, archivedAt: null, closedStatus: null, ...(await visibilityWhere(access)) },
    take: 10_000,
    select: {
      id: true, buyerNameRaw: true, dealNumber: true, stockNumberRaw: true, vehicleDescriptionRaw: true, primaryPhone: true, accountType: true,
      status: true, bucket: true, daysPastDue: true, amountDueCents: true, assignedCollectorUserId: true, lastContactAt: true, nextActionAt: true,
      customerId: true, vehicleId: true, missingFromImportAt: true,
      flags: { where: { clearedAt: null }, select: { type: true } },
      promises: { where: { OR: [{ status: "OPEN" }, { status: "BROKEN", resolvedAt: { gte: brokenSince } }] }, select: { status: true, promisedDate: true, resolvedAt: true } },
      reportedPayments: { where: { status: "NOT_FOUND" }, select: { id: true } },
      insuranceRecords: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
      snapshots: { orderBy: [{ asOfDate: "desc" }, { createdAt: "desc" }], take: 1, select: { dmsInsuranceStatus: true } },
      inboundMessages: { where: { readAt: null }, select: { id: true } }
    }
  });
  return accounts.map(account => {
    const open = account.promises.filter(p => p.status === "OPEN");
    const broken = account.promises.filter(p => p.status === "BROKEN");
    const latestBroken = broken.reduce<Date | null>((max, p) => (p.resolvedAt && (!max || p.resolvedAt > max) ? p.resolvedAt : max), null);
    const insurance = account.insuranceRecords[0]?.status ?? null;
    const dmsInsurance = (account.snapshots[0]?.dmsInsuranceStatus ?? "").toUpperCase();
    return {
      id: account.id,
      buyerName: account.buyerNameRaw,
      dealNumber: account.dealNumber,
      stockNumber: account.stockNumberRaw,
      vehicleDescription: account.vehicleDescriptionRaw,
      phone: account.primaryPhone,
      accountType: account.accountType,
      status: account.status,
      bucket: account.bucket as Bucket,
      daysPastDue: account.daysPastDue,
      amountDueCents: account.amountDueCents,
      assignedCollectorUserId: account.assignedCollectorUserId,
      lastContactAt: account.lastContactAt?.toISOString() ?? null,
      nextActionAt: account.nextActionAt?.toISOString() ?? null,
      customerLinked: Boolean(account.customerId),
      vehicleLinked: Boolean(account.vehicleId),
      missingFromImport: Boolean(account.missingFromImportAt),
      activeFlags: account.flags.map(flag => flag.type),
      // Broken counts until a newer promise is made (an open promise replaces it).
      brokenPromise: Boolean(latestBroken) && open.length === 0,
      promiseDueToday: open.some(p => p.promisedDate.getTime() === today.getTime()),
      reportedNotFound: account.reportedPayments.length > 0,
      insuranceProblem: insurance ? ["EXPIRED", "MISSING", "EXPIRING_SOON"].includes(insurance) : ["EXPIRED", "MISSING", "CANCELLED", "LAPSED"].includes(dmsInsurance),
      unreadInbound: account.inboundMessages.length
    };
  });
}

export async function getQueue(actor: AuthenticatedUser | null, filters: QueueFilters) {
  const access = await collectionsAccess(actor, "VIEW");
  const facts = await loadQueueFacts(access);
  const queue = buildQueue(facts, filters);
  const lastImport = await prisma.collectionsImportRun.findFirst({ where: { organizationId: access.organizationId, status: "COMMITTED" }, orderBy: { committedAt: "desc" }, select: { committedAt: true, asOfDate: true } });
  return {
    ...queue,
    rows: queue.rows.slice(0, 500),
    totalRows: queue.rows.length,
    lastImport: lastImport ? { committedAt: lastImport.committedAt?.toISOString() ?? null, asOfDate: toYmd(lastImport.asOfDate) } : null,
    importedToday: lastImport?.asOfDate ? toYmd(lastImport.asOfDate) === chicagoToday() : false
  };
}

// ---------------------------------------------------------------------------
// Accounts list
// ---------------------------------------------------------------------------

const SORTS = { name: "buyerNameRaw", dpd: "daysPastDue", due: "amountDueCents", balance: "totalBalanceCents", deal: "dealNumber", status: "status", type: "accountType" } as const;
export type AccountSort = keyof typeof SORTS;

export async function listAccounts(actor: AuthenticatedUser | null, query: { q?: string; sort?: string; dir?: string; page?: number; type?: string; status?: string; includeClosed?: boolean; pageSize?: number }) {
  const access = await collectionsAccess(actor, "VIEW");
  const q = text(query.q, 100);
  const sortKey = (query.sort && query.sort in SORTS ? query.sort : "dpd") as AccountSort;
  const dir: "asc" | "desc" = query.dir === "asc" ? "asc" : "desc";
  const pageSize = Math.min(Math.max(query.pageSize ?? 50, 1), 10_000);
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const digits = q.replace(/\D/g, "");
  const where: Prisma.CollectionAccountWhereInput = {
    organizationId: access.organizationId,
    archivedAt: null,
    ...(query.includeClosed ? {} : { closedStatus: null }),
    ...(query.type === "LEASE_TO_OWN" || query.type === "BHPH" ? { accountType: query.type } : {}),
    ...(query.status ? { status: query.status as never } : {}),
    ...(await visibilityWhere(access)),
    ...(q ? { OR: [
      { buyerNameRaw: { contains: q, mode: "insensitive" } },
      { dealNumber: { contains: q, mode: "insensitive" } },
      { stockNumberRaw: { contains: q, mode: "insensitive" } },
      { externalAccountId: { contains: q, mode: "insensitive" } },
      ...(digits.length >= 4 ? [{ primaryPhone: { contains: digits } }] : [])
    ] } : {})
  };
  const [total, accounts] = await Promise.all([
    prisma.collectionAccount.count({ where }),
    prisma.collectionAccount.findMany({
      where,
      orderBy: [{ [SORTS[sortKey]]: dir }, { buyerNameRaw: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, externalAccountId: true, buyerNameRaw: true, dealNumber: true, stockNumberRaw: true, vehicleDescriptionRaw: true, accountType: true, status: true, bucket: true, daysPastDue: true, amountDueCents: true, totalBalanceCents: true, assignedCollectorUserId: true, lastContactAt: true, customerId: true, vehicleId: true }
    })
  ]);
  return {
    total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), sort: sortKey, dir,
    accounts: accounts.map(account => ({ ...account, lastContactAt: account.lastContactAt?.toISOString() ?? null }))
  };
}

export function csvCell(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  // Prevent spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function exportAccountsCsv(actor: AuthenticatedUser | null, query: Parameters<typeof listAccounts>[1]) {
  const result = await listAccounts(actor, { ...query, page: 1, pageSize: 10_000 });
  const header = ["AccountId", "Customer", "Deal #", "Stock #", "Vehicle", "Type", "Status", "Bucket", "Days past due", "Amount due", "Total balance"];
  const lines = result.accounts.map(a => [a.externalAccountId, a.buyerNameRaw, a.dealNumber, a.stockNumberRaw, a.vehicleDescriptionRaw, a.accountType, a.status, a.bucket, a.daysPastDue, (a.amountDueCents / 100).toFixed(2), (a.totalBalanceCents / 100).toFixed(2)].map(csvCell).join(","));
  return [header.join(","), ...lines].join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Account detail
// ---------------------------------------------------------------------------

export type TimelineItem = { id: string; at: string; kind: string; title: string; detail?: string; by?: string | null };

export async function getAccountDetail(actor: AuthenticatedUser | null, accountId: string) {
  const access = await collectionsAccess(actor, "VIEW");
  const account = await findAccount(prisma, access, accountId);
  const [snapshot, customer, suggestedCustomer, vehicle, flags, contacts, promises, plans, reported, outbound, inbound, insurance, starter, repoCases, letters, events, users, consents] = await Promise.all([
    prisma.collectionAccountSnapshot.findFirst({ where: { accountId }, orderBy: [{ asOfDate: "desc" }, { createdAt: "desc" }] }),
    account.customerId ? prisma.customer.findFirst({ where: { id: account.customerId, organizationId: access.organizationId }, select: { id: true, displayName: true, phoneNumber: true, email: true } }) : null,
    account.suggestedCustomerId && !account.customerId ? prisma.customer.findFirst({ where: { id: account.suggestedCustomerId, organizationId: access.organizationId }, select: { id: true, displayName: true } }) : null,
    account.vehicleId ? prisma.vehicle.findFirst({ where: { id: account.vehicleId, organizationId: access.organizationId }, select: { id: true, vehicleNumber: true, stockNumber: true, year: true, make: true, model: true, vin: true } }) : null,
    prisma.collectionFlag.findMany({ where: { accountId }, orderBy: { setAt: "desc" } }),
    prisma.collectionContactAttempt.findMany({ where: { accountId }, orderBy: { occurredAt: "desc" }, take: 100 }),
    prisma.paymentPromise.findMany({ where: { accountId }, orderBy: { promisedDate: "desc" }, take: 100 }),
    prisma.paymentPlan.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, include: { installments: { orderBy: { installmentNumber: "asc" } } } }),
    prisma.customerReportedPayment.findMany({ where: { accountId }, orderBy: { reportedAt: "desc" }, take: 50 }),
    prisma.outboundMessage.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.inboundMessage.findMany({ where: { accountId }, orderBy: { receivedAt: "desc" }, take: 100 }),
    prisma.insuranceRecord.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.starterDisableAction.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.repossessionCase.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, include: { letters: true, vendor: { select: { name: true } } } }),
    prisma.collectionLetter.findMany({ where: { accountId }, orderBy: { createdAt: "desc" } }),
    prisma.collectionAccountEvent.findMany({ where: { accountId, type: { in: ["IMPORT_UPDATED", "IMPORT_CREATED", "STATUS_CHANGE", "TYPE_CHANGE", "NOT_IN_LATEST_IMPORT", "CLOSURE_CONFIRMED", "CONTACT_INFO_CHANGE", "CUSTOMER_LINKED", "ASSIGNMENT"] } }, orderBy: { occurredAt: "desc" }, take: 100 }),
    prisma.user.findMany({ where: { isActive: true, appointmentLocationAccess: { some: { location: { organizationId: access.organizationId } } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.contactConsent.findMany({ where: { accountId }, orderBy: { recordedAt: "desc" }, take: 50 })
  ]);
  const names = new Map(users.map(user => [user.id, user.name]));
  const who = (id: string | null | undefined) => (id ? names.get(id) ?? "Staff" : "System");
  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const timeline: TimelineItem[] = [
    ...contacts.map(c => ({ id: c.id, at: c.occurredAt.toISOString(), kind: "contact", title: `${c.channel.replaceAll("_", " ").toLowerCase()}: ${c.outcome.replaceAll("_", " ").toLowerCase()}`, detail: c.notes, by: who(c.userId) })),
    ...promises.map(p => ({ id: p.id, at: p.createdAt.toISOString(), kind: "promise", title: `Promise ${money(p.promisedAmountCents)} on ${toYmd(p.promisedDate)} (${p.status.toLowerCase().replaceAll("_", " ")})`, detail: p.source === "IMPORTED_FROM_DMS" ? "From DealerCenter" : p.resolutionNote ?? undefined, by: who(p.takenByUserId) })),
    ...plans.map(p => ({ id: p.id, at: p.createdAt.toISOString(), kind: "plan", title: `Payment plan ${money(p.totalCatchUpCents)} in ${p.installments.length} payments (${p.status.toLowerCase()})`, detail: p.reason, by: who(p.createdByUserId) })),
    ...reported.map(r => ({ id: r.id, at: r.reportedAt.toISOString(), kind: "reported", title: `Customer says they paid ${money(r.amountCents)} by ${r.method.toLowerCase().replaceAll("_", " ")} (${r.status.toLowerCase().replaceAll("_", " ")})`, detail: r.notes, by: who(r.enteredByUserId) })),
    ...outbound.map(m => ({ id: m.id, at: m.createdAt.toISOString(), kind: "message-out", title: `${m.channel === "SMS" ? "Text" : "Email"} ${m.status.toLowerCase().replaceAll("_", " ")}${m.automationRuleKey ? ` (automatic: ${m.automationRuleKey})` : ""}`, detail: m.blockedReason ? `Blocked: ${m.blockedReason}` : m.renderedBody, by: m.sentByUserId ? who(m.sentByUserId) : "System" })),
    ...inbound.map(m => ({ id: m.id, at: m.receivedAt.toISOString(), kind: "message-in", title: "Customer text", detail: m.body, by: "Customer" })),
    ...flags.flatMap(f => [
      { id: `${f.id}-set`, at: f.setAt.toISOString(), kind: "flag", title: `Flag set: ${f.type.replaceAll("_", " ").toLowerCase()}${f.scope ? ` (${f.scope.replaceAll("_", " ").toLowerCase()})` : ""}`, detail: f.setReason, by: who(f.setByUserId) },
      ...(f.clearedAt ? [{ id: `${f.id}-clear`, at: f.clearedAt.toISOString(), kind: "flag", title: `Flag cleared: ${f.type.replaceAll("_", " ").toLowerCase()}`, detail: f.clearReason ?? undefined, by: who(f.clearedByUserId) }] : [])
    ]),
    ...insurance.map(i => ({ id: i.id, at: i.createdAt.toISOString(), kind: "insurance", title: `Insurance ${i.status.toLowerCase().replaceAll("_", " ")}${i.carrier ? `: ${i.carrier}` : ""}`, detail: i.expirationDate ? `Expires ${toYmd(i.expirationDate)}` : i.notes, by: who(i.enteredByUserId) })),
    ...starter.map(s => ({ id: s.id, at: s.createdAt.toISOString(), kind: "starter", title: `Starter ${s.action.toLowerCase()}: ${s.status.toLowerCase().replaceAll("_", " ")}`, detail: s.reason, by: who(s.requestedByUserId) })),
    ...repoCases.map(r => ({ id: r.id, at: r.updatedAt.toISOString(), kind: "repo", title: `Repo case: ${r.status.toLowerCase().replaceAll("_", " ")}${r.vendor ? ` (${r.vendor.name})` : ""}`, detail: r.outcomeNotes ?? undefined, by: who(r.openedByUserId) })),
    ...letters.map(l => ({ id: l.id, at: l.createdAt.toISOString(), kind: "letter", title: `Letter: ${l.templateKey.replaceAll("_", " ").toLowerCase()}${l.sentAt ? ` sent ${l.sentMethod?.toLowerCase() ?? ""}` : " generated"}`, detail: l.isDraftWording ? "Draft wording (attorney approval required)" : undefined, by: who(l.generatedByUserId) })),
    ...events.map(e => ({ id: e.id, at: e.occurredAt.toISOString(), kind: "event", title: e.type.replaceAll("_", " ").toLowerCase(), detail: e.reason || undefined, by: who(e.userId) }))
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 300);

  const openPromises = promises.filter(p => p.status === "OPEN");
  const latestInsurance = insurance[0] ?? null;
  return {
    account: {
      ...account,
      contractDate: toYmd(account.contractDate), consentDate: toYmd(account.consentDate),
      lastContactAt: account.lastContactAt?.toISOString() ?? null, nextActionAt: account.nextActionAt?.toISOString() ?? null,
      lastImportedAt: account.lastImportedAt?.toISOString() ?? null, missingFromImportAt: account.missingFromImportAt?.toISOString() ?? null,
      closedAt: account.closedAt?.toISOString() ?? null, createdAt: account.createdAt.toISOString(), updatedAt: account.updatedAt.toISOString(),
      archivedAt: null
    },
    snapshot: snapshot ? { ...snapshot, asOfDate: toYmd(snapshot.asOfDate), paymentDueDate: toYmd(snapshot.paymentDueDate), promiseDateFromDms: toYmd(snapshot.promiseDateFromDms), createdAt: snapshot.createdAt.toISOString() } : null,
    customer, suggestedCustomer, vehicle,
    activeFlags: flags.filter(f => !f.clearedAt).map(f => ({ id: f.id, type: f.type, scope: f.scope, setAt: f.setAt.toISOString(), setReason: f.setReason, attorneyName: f.attorneyName, attorneyFirm: f.attorneyFirm, attorneyPhone: f.attorneyPhone, attorneyEmail: f.attorneyEmail, bankruptcyChapter: f.bankruptcyChapter, bankruptcyCaseNumber: f.bankruptcyCaseNumber })),
    openPromises: openPromises.map(p => ({ id: p.id, amountCents: p.promisedAmountCents, date: toYmd(p.promisedDate), source: p.source, planId: p.planId })),
    plans: plans.map(p => ({ id: p.id, status: p.status, reason: p.reason, totalCatchUpCents: p.totalCatchUpCents, installments: p.installments.map(i => ({ id: i.id, number: i.installmentNumber, amountCents: i.promisedAmountCents, date: toYmd(i.promisedDate), status: i.status })) })),
    reportedPayments: reported.map(r => ({ id: r.id, amountCents: r.amountCents, method: r.method, paidDate: toYmd(r.paidDate), status: r.status, referenceNumber: r.referenceNumber })),
    insurance: latestInsurance ? { ...latestInsurance, effectiveDate: toYmd(latestInsurance.effectiveDate), expirationDate: toYmd(latestInsurance.expirationDate), verifiedAt: latestInsurance.verifiedAt?.toISOString() ?? null, createdAt: latestInsurance.createdAt.toISOString() } : null,
    starterActions: starter.map(s => ({ id: s.id, action: s.action, status: s.status, reason: s.reason, warningMethod: s.warningMethod, requestedAt: s.requestedAt.toISOString(), approvedAt: s.approvedAt?.toISOString() ?? null, performedInPortalAt: s.performedInPortalAt?.toISOString() ?? null })),
    repoCases: repoCases.map(r => ({ id: r.id, status: r.status, vendorName: r.vendor?.name ?? null, storageLocation: r.storageLocation, assignedAt: r.assignedAt?.toISOString() ?? null, recoveredAt: r.recoveredAt?.toISOString() ?? null, outcomeNotes: r.outcomeNotes, letters: r.letters.map(l => ({ id: l.id, templateKey: l.templateKey, sentAt: l.sentAt?.toISOString() ?? null, sentMethod: l.sentMethod, certifiedTrackingNumber: l.certifiedTrackingNumber, isDraftWording: l.isDraftWording })) })),
    consents: consents.map(c => ({ channel: c.channel, address: c.address, status: c.status, source: c.source, recordedAt: c.recordedAt.toISOString() })),
    timeline,
    collectors: users,
    permissions: {
      isAdmin: access.role === "ADMIN",
      canClearFlag: hasCollectionsPermission(access.actor, "CLEAR_FLAG"),
      canChangeType: hasCollectionsPermission(access.actor, "CHANGE_ACCOUNT_TYPE"),
      canApprove: hasCollectionsPermission(access.actor, "APPROVE_DISABLE_OR_REPO")
    }
  };
}

// ---------------------------------------------------------------------------
// Account actions
// ---------------------------------------------------------------------------

export type ActionResult = { ok: true; message: string; [key: string]: unknown };

async function afterChange(db: Db, access: CollectionsAccess, accountId: string) {
  const settings = await loadCollectionsSettings(access.organizationId, db);
  await recalculateAccounts(db, access.organizationId, settings, [accountId]);
}

export async function logContact(db: Db, access: CollectionsAccess, accountId: string, input: Record<string, unknown>) {
  const channel = oneOf(input.channel, CONTACT_CHANNELS, "contact type");
  const outcome = oneOf(input.outcome, CONTACT_OUTCOMES, "result");
  const occurredAt = input.occurredAt ? new Date(String(input.occurredAt)) : new Date();
  if (Number.isNaN(occurredAt.getTime()) || occurredAt.getTime() > Date.now() + 5 * 60_000) throw new CollectionsError("Choose when the contact happened (not in the future).");
  const attempt = await db.collectionContactAttempt.create({
    data: { organizationId: access.organizationId, accountId, userId: access.actor.id, occurredAt, channel, outcome, notes: text(input.notes, 4000), contactPoint: text(input.contactPoint, 200) || null, messageId: text(input.messageId, 100) || null }
  });
  await db.collectionAccount.update({ where: { id: accountId }, data: { lastContactAt: occurredAt, version: { increment: 1 } } });
  return attempt;
}

export async function accountAction(actor: AuthenticatedUser | null, accountId: string, input: Record<string, unknown>): Promise<ActionResult> {
  const action = text(input.action, 50);
  const permission = ({
    LOG_CONTACT: "LOG_ACTIVITY", SET_FLAG: "SET_FLAG", CLEAR_FLAG: "CLEAR_FLAG", CHANGE_TYPE: "CHANGE_ACCOUNT_TYPE", EDIT_CONTACT: "LOG_ACTIVITY",
    LINK_CUSTOMER: "LOG_ACTIVITY", LINK_VEHICLE: "LOG_ACTIVITY", CONFIRM_MISSING: "IMPORT", ASSIGN_COLLECTOR: "EDIT_SETTINGS", SET_NEXT_ACTION: "LOG_ACTIVITY"
  } as const)[action as "LOG_CONTACT"];
  if (!permission) throw new CollectionsError("Unknown action.");
  const access = await collectionsAccess(actor, permission);
  return prisma.$transaction(async tx => {
    const account = await findAccount(tx, access, accountId);
    const event = (type: string, before: unknown, after: unknown, reason = "") => recordAccountEvent(tx, { organizationId: access.organizationId, accountId, type, userId: access.actor.id, before, after, reason });

    switch (action) {
      case "LOG_CONTACT": {
        const attempt = await logContact(tx, access, accountId, input);
        return { ok: true, message: "Contact logged.", contactId: attempt.id };
      }
      case "SET_NEXT_ACTION": {
        const when = input.nextActionAt ? new Date(String(input.nextActionAt)) : null;
        if (when && Number.isNaN(when.getTime())) throw new CollectionsError("Choose a valid date.");
        await tx.collectionAccount.update({ where: { id: accountId }, data: { nextActionAt: when, version: { increment: 1 } } });
        await event("NEXT_ACTION", { nextActionAt: account.nextActionAt }, { nextActionAt: when });
        return { ok: true, message: when ? "Next action date saved." : "Next action date cleared." };
      }
      case "SET_FLAG": {
        const type = oneOf(input.type, FLAG_TYPES, "flag");
        const reason = requireReason(input.reason);
        const active = await tx.collectionFlag.findFirst({ where: { accountId, type, clearedAt: null }, select: { id: true } });
        if (active) throw new CollectionsError("This flag is already set on the account.", 409);
        const scope = type === "CONTACT_RESTRICTED" ? oneOf(input.scope, CONTACT_SCOPES, "contact restriction") : null;
        if (type === "ATTORNEY_REPRESENTED" && !text(input.attorneyName, 200)) throw new CollectionsError("Enter the attorney's name.");
        const flag = await tx.collectionFlag.create({
          data: {
            organizationId: access.organizationId, accountId, type, scope, setByUserId: access.actor.id, setReason: reason,
            attorneyName: text(input.attorneyName, 200) || null, attorneyFirm: text(input.attorneyFirm, 200) || null,
            attorneyPhone: text(input.attorneyPhone, 40) || null, attorneyEmail: text(input.attorneyEmail, 200) || null,
            bankruptcyChapter: text(input.bankruptcyChapter, 20) || null, bankruptcyCaseNumber: text(input.bankruptcyCaseNumber, 100) || null,
            bankruptcyFilingDate: input.bankruptcyFilingDate ? dateOnly(text(input.bankruptcyFilingDate, 10)) : null, bankruptcyCourt: text(input.bankruptcyCourt, 200) || null
          }
        });
        await event("FLAG_SET", null, { flagId: flag.id, type, scope }, reason);
        await afterChange(tx, access, accountId);
        return { ok: true, message: type === "BANKRUPTCY" ? "Bankruptcy flag set. The account is fully frozen: no texts, emails, disables, repos or letters." : "Flag set." };
      }
      case "CLEAR_FLAG": {
        const flag = await tx.collectionFlag.findFirst({ where: { id: text(input.flagId, 100), accountId, clearedAt: null } });
        if (!flag) throw new CollectionsError("This flag isn't active.", 404);
        const reason = requireReason(input.reason, 10);
        let clearDocumentId: string | null = null;
        if (flag.type === "BANKRUPTCY") {
          const documentId = text(input.documentId, 100);
          if (!documentId) throw new CollectionsError("Clearing a bankruptcy freeze needs an uploaded document (relief-from-stay order, dismissal, discharge, or attorney note).");
          clearDocumentId = await assertAccountDocument(access.organizationId, accountId, documentId);
        }
        // Clearing is recorded on the same row (clearedAt/By/Reason); the original "set" facts are never changed.
        await tx.collectionFlag.update({ where: { id: flag.id }, data: { clearedAt: new Date(), clearedByUserId: access.actor.id, clearReason: reason, clearDocumentId } });
        await event("FLAG_CLEARED", { flagId: flag.id, type: flag.type }, { cleared: true, clearDocumentId }, reason);
        await afterChange(tx, access, accountId);
        return { ok: true, message: "Flag cleared." };
      }
      case "CHANGE_TYPE": {
        const accountType = oneOf(input.accountType, ["LEASE_TO_OWN", "BHPH"] as const, "account type") as CollectionAccountType;
        if (accountType === account.accountType) return { ok: true, message: "The account already has this type." };
        const reason = requireReason(input.reason);
        await tx.collectionAccount.update({ where: { id: accountId }, data: { accountType, version: { increment: 1 } } });
        await event("TYPE_CHANGE", { accountType: account.accountType }, { accountType }, reason);
        return { ok: true, message: `Account type changed to ${accountType === "BHPH" ? "BHPH" : "Lease-to-own"}.` };
      }
      case "EDIT_CONTACT": {
        const phoneText = text(input.primaryPhone, 40);
        const phone = phoneText ? toE164(phoneText) : null;
        if (phoneText && !phone) throw new CollectionsError("Enter a 10-digit US phone number.");
        const email = text(input.primaryEmail, 200).toLowerCase() || null;
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CollectionsError("Enter a valid email address.");
        const gps = input.gpsDisclosedInContract === "YES" ? true : input.gpsDisclosedInContract === "NO" ? false : null;
        const data = {
          primaryPhone: phone, primaryEmail: email, mailingAddress: text(input.mailingAddress, 500) || null,
          preferredLanguage: oneOf(input.preferredLanguage ?? "EN", LANGUAGES, "language"),
          vin: text(input.vin, 20).toUpperCase() || null, gpsDeviceSerial: text(input.gpsDeviceSerial, 100) || null,
          gpsDisclosedInContract: gps, paymentFrequency: oneOf(input.paymentFrequency ?? "UNKNOWN", FREQUENCIES, "payment frequency")
        };
        const before = Object.fromEntries(Object.keys(data).map(key => [key, account[key as keyof typeof account]]));
        await tx.collectionAccount.update({ where: { id: accountId }, data: { ...data, version: { increment: 1 } } });
        await event("CONTACT_INFO_CHANGE", before, data, text(input.reason, 500) || "Contact details edited");
        return { ok: true, message: "Contact details saved." };
      }
      case "LINK_CUSTOMER": {
        const customerId = text(input.customerId, 100);
        const customer = await tx.customer.findFirst({ where: { id: customerId, organizationId: access.organizationId, mergedIntoCustomerId: null }, select: { id: true, displayName: true } });
        if (!customer) throw new CollectionsError("Choose a customer from this company.");
        await tx.collectionAccount.update({ where: { id: accountId }, data: { customerId: customer.id, suggestedCustomerId: null, version: { increment: 1 } } });
        await event("CUSTOMER_LINKED", { customerId: account.customerId }, { customerId: customer.id }, `Linked to ${customer.displayName}`);
        return { ok: true, message: `Linked to customer ${customer.displayName}.` };
      }
      case "LINK_VEHICLE": {
        const vehicle = await tx.vehicle.findFirst({ where: { id: text(input.vehicleId, 100), organizationId: access.organizationId, mergedIntoVehicleId: null }, select: { id: true } });
        if (!vehicle) throw new CollectionsError("Choose a vehicle from this company.");
        await tx.collectionAccount.update({ where: { id: accountId }, data: { vehicleId: vehicle.id, version: { increment: 1 } } });
        await event("VEHICLE_LINKED", { vehicleId: account.vehicleId }, { vehicleId: vehicle.id });
        return { ok: true, message: "Vehicle linked." };
      }
      case "CONFIRM_MISSING": {
        const resolution = oneOf(input.resolution, ["PAID_OFF", "CLOSED", "STILL_ACTIVE"] as const, "resolution");
        const reason = requireReason(input.reason);
        if (resolution === "STILL_ACTIVE") {
          await tx.collectionAccount.update({ where: { id: accountId }, data: { missingFromImportAt: null, missingFromImportRunId: null, version: { increment: 1 } } });
        } else {
          await tx.collectionAccount.update({ where: { id: accountId }, data: { closedStatus: resolution, closedAt: new Date(), closedByUserId: access.actor.id, version: { increment: 1 } } });
        }
        await event("CLOSURE_CONFIRMED", { missingFromImportAt: account.missingFromImportAt, closedStatus: account.closedStatus }, { resolution }, reason);
        await afterChange(tx, access, accountId);
        return { ok: true, message: resolution === "STILL_ACTIVE" ? "Kept as active." : `Marked ${resolution === "PAID_OFF" ? "paid off" : "closed"}.` };
      }
      case "ASSIGN_COLLECTOR": {
        const userId = await assertStaff(tx, access, text(input.userId, 100));
        await tx.collectionAccount.update({ where: { id: accountId }, data: { assignedCollectorUserId: userId, version: { increment: 1 } } });
        await event("ASSIGNMENT", { assignedCollectorUserId: account.assignedCollectorUserId }, { assignedCollectorUserId: userId });
        return { ok: true, message: "Collector assigned." };
      }
    }
    throw new CollectionsError("Unknown action.");
  }, { timeout: 30_000 });
}

async function assertStaff(db: Db, access: CollectionsAccess, userId: string) {
  const now = new Date();
  const user = await db.user.findFirst({ where: { id: userId, isActive: true, appointmentLocationAccess: { some: { location: { organizationId: access.organizationId }, validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gte: now } }] } } }, select: { id: true } });
  if (!user) throw new CollectionsError("Choose active staff in this company.");
  return user.id;
}

/** Bulk change type or assign collector for many accounts at once (spec section 14). */
export async function bulkAccountAction(actor: AuthenticatedUser | null, input: Record<string, unknown>) {
  const action = text(input.action, 50);
  const ids = Array.isArray(input.accountIds) ? [...new Set(input.accountIds.filter((id): id is string => typeof id === "string"))].slice(0, 1000) : [];
  if (!ids.length) throw new CollectionsError("Select at least one account.");
  if (action !== "CHANGE_TYPE" && action !== "ASSIGN_COLLECTOR") throw new CollectionsError("Unknown bulk action.");
  const access = await collectionsAccess(actor, action === "CHANGE_TYPE" ? "CHANGE_ACCOUNT_TYPE" : "EDIT_SETTINGS");
  return prisma.$transaction(async tx => {
    const accounts = await tx.collectionAccount.findMany({ where: { organizationId: access.organizationId, id: { in: ids } }, select: { id: true, accountType: true, assignedCollectorUserId: true } });
    if (accounts.length !== ids.length) throw new CollectionsError("Some selected accounts aren't available. Refresh and try again.", 409);
    let changed = 0;
    if (action === "CHANGE_TYPE") {
      const accountType = oneOf(input.accountType, ["LEASE_TO_OWN", "BHPH"] as const, "account type");
      const reason = requireReason(input.reason);
      for (const account of accounts.filter(a => a.accountType !== accountType)) {
        await tx.collectionAccount.update({ where: { id: account.id }, data: { accountType, version: { increment: 1 } } });
        await recordAccountEvent(tx, { organizationId: access.organizationId, accountId: account.id, type: "TYPE_CHANGE", userId: access.actor.id, before: { accountType: account.accountType }, after: { accountType }, reason: `Bulk: ${reason}` });
        changed += 1;
      }
    } else {
      const userId = await assertStaff(tx, access, text(input.userId, 100));
      for (const account of accounts.filter(a => a.assignedCollectorUserId !== userId)) {
        await tx.collectionAccount.update({ where: { id: account.id }, data: { assignedCollectorUserId: userId, version: { increment: 1 } } });
        await recordAccountEvent(tx, { organizationId: access.organizationId, accountId: account.id, type: "ASSIGNMENT", userId: access.actor.id, before: { assignedCollectorUserId: account.assignedCollectorUserId }, after: { assignedCollectorUserId: userId } });
        changed += 1;
      }
    }
    return { ok: true as const, message: `${changed} account(s) updated.`, changed };
  }, { timeout: 60_000 });
}

/** Customer search for the "link customer" picker (scoped, minimal fields). */
export async function searchCustomers(actor: AuthenticatedUser | null, q: string) {
  const access = await collectionsAccess(actor, "LOG_ACTIVITY");
  const needle = text(q, 100);
  if (needle.length < 2) return [];
  return prisma.customer.findMany({ where: { organizationId: access.organizationId, mergedIntoCustomerId: null, displayName: { contains: needle, mode: "insensitive" } }, select: { id: true, displayName: true, customerNumber: true }, take: 20, orderBy: { displayName: "asc" } });
}
