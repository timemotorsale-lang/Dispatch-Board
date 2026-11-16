/**
 * Extensions (22.3), possible skip and the skip-trace checklist (22.5), charge-off and
 * recovery (22.6), and fees and credits (22.8).
 *
 * Every decision about money or terms is a person's, and approvals are admin-only
 * (APPROVE_MONEY). DealerCenter is still the official record, so each approved change
 * creates a "Post in DealerCenter" board task; nothing is changed in DealerCenter by this app.
 */
import type { AccountAdjustmentType, CollectionExtensionType, Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";

import { CollectionsError, type CollectionsPermission } from "../config/permissions";
import { addDays, chicagoToday, dateOnly, formatCents, parseBusinessDate, parseMoneyToCents, toYmd } from "../domain/money-dates";
import type { CollectionsSettings } from "../domain/settings";
import { ADJUSTMENT_TYPES, adjustmentNeedsApproval, adjustmentOverdue, adjustmentShowsInImport, checkExtensionEligibility, deficiencyCents, SKIP_STEPS, skipSignals, type AdjustmentType, type BalanceBaseline } from "../domain/upgrades";
import { collectionsAccess, recordAccountEvent } from "./access";
import { findAccount, text } from "./account-service";
import { loadInsights, RIGHT_PARTY_OUTCOMES } from "./insights-service";
import { loadCollectionsSettings } from "./settings-store";
import { closeFollowUpTask, findCollectionsAdminUserId, openFollowUpTask } from "./task-sync";

type Db = Prisma.TransactionClient;

export const UPGRADE_ACTIONS = [
  "REQUEST_EXTENSION", "DECIDE_EXTENSION", "MARK_EXTENSION_APPLIED", "CANCEL_EXTENSION",
  "CONFIRM_SKIP", "DISMISS_SKIP", "LOG_SKIP_TRACE",
  "RECORD_RECOVERY_OUTCOME", "REQUEST_CHARGE_OFF", "DECIDE_CHARGE_OFF", "RECORD_RECOVERY_PAYMENT",
  "ADD_ADJUSTMENT", "DECIDE_ADJUSTMENT", "MARK_ADJUSTMENT_POSTED", "CANCEL_ADJUSTMENT"
] as const;

const PERMISSION: Record<string, CollectionsPermission> = {
  REQUEST_EXTENSION: "REQUEST_DISABLE_OR_REPO", CANCEL_EXTENSION: "REQUEST_DISABLE_OR_REPO", DECIDE_EXTENSION: "APPROVE_MONEY", MARK_EXTENSION_APPLIED: "APPROVE_MONEY",
  CONFIRM_SKIP: "SET_FLAG", DISMISS_SKIP: "SET_FLAG", LOG_SKIP_TRACE: "LOG_ACTIVITY",
  RECORD_RECOVERY_OUTCOME: "APPROVE_MONEY", REQUEST_CHARGE_OFF: "REQUEST_DISABLE_OR_REPO", DECIDE_CHARGE_OFF: "APPROVE_MONEY", RECORD_RECOVERY_PAYMENT: "APPROVE_MONEY",
  ADD_ADJUSTMENT: "LOG_ACTIVITY", CANCEL_ADJUSTMENT: "LOG_ACTIVITY", DECIDE_ADJUSTMENT: "APPROVE_MONEY", MARK_ADJUSTMENT_POSTED: "APPROVE_MONEY"
};
const EXT_TYPES: CollectionExtensionType[] = ["EXTENSION", "DEFERRAL", "DUE_DATE_CHANGE"];
const EXT_LABEL: Record<string, string> = { EXTENSION: "extension", DEFERRAL: "deferral", DUE_DATE_CHANGE: "due-date change" };
const ADJ_LABEL: Record<string, string> = { REPO_FEE: "repo fee", STORAGE_FEE: "storage fee", RETURNED_PAYMENT_FEE: "returned-payment fee", OTHER_FEE: "fee", LATE_FEE_WAIVER: "late-fee waiver", GOODWILL_CREDIT: "goodwill credit", OTHER_CREDIT: "credit" };

function reasonText(value: unknown, min = 5) {
  const r = text(value, 1000);
  if (r.length < min) throw new CollectionsError("Give a short reason.");
  return r;
}
function cents(value: unknown, label: string, allowZero = false) {
  const c = parseMoneyToCents(value);
  if (c === null || c === undefined || c < 0 || (!allowZero && c === 0)) throw new CollectionsError(`Enter a valid ${label}.`);
  return c;
}
async function latestBalances(db: Db, accountId: string): Promise<BalanceBaseline> {
  const s = await db.collectionAccountSnapshot.findFirst({ where: { accountId }, orderBy: [{ asOfDate: "desc" }, { createdAt: "desc" }], select: { otherCents: true, lateCents: true, creditCents: true, totalBalanceCents: true } });
  return { otherCents: s?.otherCents ?? 0, lateCents: s?.lateCents ?? 0, creditCents: s?.creditCents ?? 0, totalBalanceCents: s?.totalBalanceCents ?? 0 };
}

export async function upgradeAction(actor: AuthenticatedUser | null, accountId: string, input: Record<string, unknown>) {
  const action = text(input.action, 40);
  const access = await collectionsAccess(actor, PERMISSION[action] ?? "APPROVE_MONEY");
  const settings = await loadCollectionsSettings(access.organizationId);
  const today = chicagoToday();
  return prisma.$transaction(async tx => {
    const account = await findAccount(tx, access, accountId);
    const org = access.organizationId;
    const event = (type: string, after: unknown, why = "", before?: unknown) => recordAccountEvent(tx, { organizationId: org, accountId, type, userId: access.actor.id, before, after, reason: why });
    const frozen = Boolean(await tx.collectionFlag.findFirst({ where: { accountId, type: "BANKRUPTCY", clearedAt: null }, select: { id: true } }));
    const postTask = async (key: string, title: string, description: string) => openFollowUpTask(tx, { organizationId: org, accountId, key, reason: "POST_IN_DMS", title: `${title}: ${account.buyerNameRaw}${account.dealNumber ? ` (deal ${account.dealNumber})` : ""}`, description, assignedUserId: (await findCollectionsAdminUserId(tx, org, access.actor.id)) ?? access.actor.id });
    const closeTask = (key: string, note: string) => closeFollowUpTask(tx, { organizationId: org, accountId, key, reason: "POST_IN_DMS", note });

    switch (action) {
      // ---------------- Extensions ----------------
      case "REQUEST_EXTENSION": {
        if (frozen) throw new CollectionsError("Bankruptcy freeze: no new arrangements. Review with your bankruptcy attorney.", 409);
        const type = (EXT_TYPES as string[]).includes(String(input.type)) ? (input.type as CollectionExtensionType) : null;
        if (!type) throw new CollectionsError("Choose extension, deferral or due-date change.");
        const terms = reasonText(input.requestedTerms, 5);
        const newDue = input.newDueDate ? parseBusinessDate(input.newDueDate) : null;
        if (input.newDueDate && !newDue) throw new CollectionsError("Choose a valid new due date.");
        const [approved12, openPromise] = await Promise.all([
          tx.extensionRequest.count({ where: { accountId, status: { in: ["APPROVED", "APPLIED"] }, decidedAt: { gte: new Date(`${addDays(today, -365)}T00:00:00Z`) } } }),
          tx.paymentPromise.findFirst({ where: { accountId, status: "OPEN" }, select: { id: true } })
        ]);
        const check = checkExtensionEligibility({ contractDate: toYmd(account.contractDate), today, approvedInLast12Months: approved12, openPromise: Boolean(openPromise) }, settings.extensionRules);
        const created = await tx.extensionRequest.create({ data: { organizationId: org, accountId, type, requestedTerms: terms, newDueDate: newDue ? dateOnly(newDue) : null, reason: reasonText(input.reason), eligible: check.eligible, eligibilityNotes: check.notes, requestedByUserId: access.actor.id } });
        await event("EXTENSION_REQUESTED", { requestId: created.id, type, eligible: check.eligible, notes: check.notes }, created.reason);
        return { ok: true as const, message: check.eligible ? "Requested. It meets the extension rules; an admin decides next." : `Requested, but it doesn't meet the rules: ${check.notes.join(" ")} An admin can still approve it with a reason.`, eligible: check.eligible };
      }
      case "DECIDE_EXTENSION": {
        const r = await tx.extensionRequest.findFirst({ where: { id: text(input.requestId, 100), accountId } });
        if (!r || r.status !== "REQUESTED") throw new CollectionsError("That request isn't waiting for a decision.", 409);
        const approve = input.decision === "APPROVE";
        const why = reasonText(input.reason, 3);
        if (approve && frozen) throw new CollectionsError("Bankruptcy freeze: review with your bankruptcy attorney first.", 409);
        if (approve && !r.eligible && text(input.overrideReason, 500).length < 10) throw new CollectionsError("This request doesn't meet the extension rules. Explain why you're approving it anyway (at least 10 characters).");
        await tx.extensionRequest.update({ where: { id: r.id }, data: { status: approve ? "APPROVED" : "DECLINED", decidedByUserId: access.actor.id, decidedAt: new Date(), decisionReason: why, overrideReason: approve && !r.eligible ? text(input.overrideReason, 500) : null } });
        await event(approve ? "EXTENSION_APPROVED" : "EXTENSION_DECLINED", { requestId: r.id }, why);
        if (approve) await postTask(`extension:${r.id}`, `Post ${EXT_LABEL[r.type]} in DealerCenter`, `Approved ${EXT_LABEL[r.type]}: ${r.requestedTerms}${r.newDueDate ? ` (new due date ${toYmd(r.newDueDate)})` : ""}. Enter it in DealerCenter, then mark it applied in Collections.`);
        return { ok: true as const, message: approve ? "Approved. A \"Post in DealerCenter\" task is on the board." : "Declined." };
      }
      case "MARK_EXTENSION_APPLIED": {
        const r = await tx.extensionRequest.findFirst({ where: { id: text(input.requestId, 100), accountId } });
        if (!r || r.status !== "APPROVED") throw new CollectionsError("Only an approved request can be marked applied.", 409);
        await tx.extensionRequest.update({ where: { id: r.id }, data: { status: "APPLIED", appliedAt: new Date(), appliedByUserId: access.actor.id } });
        await closeTask(`extension:${r.id}`, "Posted in DealerCenter.");
        await event("EXTENSION_APPLIED", { requestId: r.id });
        return { ok: true as const, message: "Marked as applied in DealerCenter." };
      }
      case "CANCEL_EXTENSION": {
        const r = await tx.extensionRequest.findFirst({ where: { id: text(input.requestId, 100), accountId } });
        if (!r || !["REQUESTED", "APPROVED"].includes(r.status)) throw new CollectionsError("This request is already finished.", 409);
        const why = reasonText(input.reason);
        await tx.extensionRequest.update({ where: { id: r.id }, data: { status: "CANCELLED", decisionReason: why } });
        await closeTask(`extension:${r.id}`, "Request cancelled.");
        await event("EXTENSION_CANCELLED", { requestId: r.id }, why);
        return { ok: true as const, message: "Request cancelled." };
      }

      // ---------------- Possible skip ----------------
      case "CONFIRM_SKIP":
      case "DISMISS_SKIP": {
        const alert = await tx.collectionSkipAlert.findFirst({ where: { accountId, status: "OPEN" } });
        if (!alert) throw new CollectionsError("There's no open possible-skip alert.", 404);
        const note = reasonText(input.note, 3);
        const confirm = action === "CONFIRM_SKIP";
        await tx.collectionSkipAlert.update({ where: { id: alert.id }, data: { status: confirm ? "CONFIRMED" : "DISMISSED", decidedByUserId: access.actor.id, decidedAt: new Date(), decisionNote: note } });
        if (confirm && !(await tx.collectionFlag.findFirst({ where: { accountId, type: "SKIP", clearedAt: null }, select: { id: true } }))) {
          await tx.collectionFlag.create({ data: { organizationId: org, accountId, type: "SKIP", setByUserId: access.actor.id, setReason: `Possible skip confirmed: ${note}` } });
        }
        await event(confirm ? "SKIP_CONFIRMED" : "SKIP_DISMISSED", { alertId: alert.id }, note);
        return { ok: true as const, message: confirm ? "Confirmed. The account is flagged as a skip; work the checklist." : "Dismissed." };
      }
      case "LOG_SKIP_TRACE": {
        const step = (SKIP_STEPS as readonly string[]).includes(String(input.step)) ? String(input.step) : null;
        if (!step) throw new CollectionsError("Choose a checklist step.");
        await tx.collectionSkipTraceEntry.create({ data: { organizationId: org, accountId, step, result: text(input.result, 40) || "DONE", notes: text(input.notes, 1000), userId: access.actor.id } });
        await event("SKIP_TRACE_STEP", { step, result: text(input.result, 40) || "DONE" }, text(input.notes, 1000));
        return { ok: true as const, message: "Checklist step saved." };
      }

      // ---------------- Charge-off and recovery ----------------
      case "RECORD_RECOVERY_OUTCOME": {
        const repoCase = await tx.repossessionCase.findFirst({ where: { accountId, status: { in: ["SENT_TO_AUCTION", "RETURNED_TO_INVENTORY"] } }, orderBy: { outcomeAt: "desc" } });
        if (!repoCase) throw new CollectionsError("Record this after the repo outcome is Sent to auction or Returned to inventory.", 409);
        const balances = await latestBalances(tx, accountId);
        const balanceAtRepo = input.balanceAtRepo !== undefined && input.balanceAtRepo !== "" ? cents(input.balanceAtRepo, "balance at repossession", true) : balances.totalBalanceCents;
        const costs = { repo: cents(input.repoCost ?? "0", "repo cost", true), storage: cents(input.storageCost ?? "0", "storage cost", true), auction: cents(input.auctionCost ?? "0", "auction cost", true), other: cents(input.otherCost ?? "0", "other cost", true) };
        const sale = cents(input.salePrice, "sale price", true);
        const deficiency = deficiencyCents({ balanceAtRepoCents: balanceAtRepo, salePriceCents: sale, costsCents: Object.values(costs) });
        const row = await tx.collectionRecoveryOutcome.create({ data: { organizationId: org, accountId, repoCaseId: repoCase.id, balanceAtRepoCents: balanceAtRepo, salePriceCents: sale, repoCostCents: costs.repo, storageCostCents: costs.storage, auctionCostCents: costs.auction, otherCostCents: costs.other, deficiencyCents: deficiency, notes: text(input.notes, 2000), recordedByUserId: access.actor.id } });
        await event("RECOVERY_OUTCOME", { outcomeId: row.id, deficiencyCents: deficiency });
        await postTask(`recovery:${row.id}`, "Post repo sale and costs in DealerCenter", `Sale ${formatCents(sale)}, costs ${formatCents(Object.values(costs).reduce((a, b) => a + b, 0))}, ${deficiency >= 0 ? `deficiency ${formatCents(deficiency)}` : `surplus ${formatCents(-deficiency)}`}. Check Minnesota notice requirements with your attorney before contacting the customer about a deficiency.`);
        return { ok: true as const, message: deficiency >= 0 ? `Saved. Deficiency: ${formatCents(deficiency)}. Check Minnesota notice rules with your attorney before asking the customer for it.` : `Saved. Surplus: ${formatCents(-deficiency)}. Check with your attorney about returning a surplus.` };
      }
      case "REQUEST_CHARGE_OFF": {
        if (await tx.collectionChargeOff.findFirst({ where: { accountId, status: { in: ["REQUESTED", "APPROVED"] } }, select: { id: true } })) throw new CollectionsError("A charge-off is already requested or approved.", 409);
        const why = reasonText(input.reason);
        const override = text(input.overrideReason, 500);
        if (account.daysPastDue < settings.chargeOffMinDaysPastDue && override.length < 10) throw new CollectionsError(`The account is ${account.daysPastDue} days past due, below the ${settings.chargeOffMinDaysPastDue}-day charge-off point. Explain why (at least 10 characters).`);
        const outcome = await tx.collectionRecoveryOutcome.findFirst({ where: { accountId }, orderBy: { createdAt: "desc" } });
        const amount = input.amount !== undefined && input.amount !== "" ? cents(input.amount, "charge-off amount") : outcome ? Math.max(0, outcome.deficiencyCents) : (await latestBalances(tx, accountId)).totalBalanceCents;
        const row = await tx.collectionChargeOff.create({ data: { organizationId: org, accountId, amountCents: amount, reason: why, overrideReason: override || null, requestedByUserId: access.actor.id } });
        await event("CHARGE_OFF_REQUESTED", { chargeOffId: row.id, amountCents: amount }, why);
        return { ok: true as const, message: `Charge-off of ${formatCents(amount)} requested. The owner approves it next.` };
      }
      case "DECIDE_CHARGE_OFF": {
        const row = await tx.collectionChargeOff.findFirst({ where: { id: text(input.chargeOffId, 100), accountId } });
        if (!row || row.status !== "REQUESTED") throw new CollectionsError("That charge-off isn't waiting for a decision.", 409);
        const approve = input.decision === "APPROVE";
        const why = reasonText(input.reason, 3);
        await tx.collectionChargeOff.update({ where: { id: row.id }, data: { status: approve ? "APPROVED" : "DECLINED", decidedByUserId: access.actor.id, decidedAt: new Date(), decisionReason: why } });
        await event(approve ? "CHARGE_OFF_APPROVED" : "CHARGE_OFF_DECLINED", { chargeOffId: row.id, amountCents: row.amountCents }, why);
        if (approve) await postTask(`chargeoff:${row.id}`, "Post charge-off in DealerCenter", `Approved charge-off of ${formatCents(row.amountCents)}. Record it in DealerCenter. The account stays in Collections for recovery payments.`);
        return { ok: true as const, message: approve ? "Charge-off approved. A \"Post in DealerCenter\" task is on the board; the account stays tracked for recovery." : "Declined." };
      }
      case "RECORD_RECOVERY_PAYMENT": {
        const row = await tx.collectionChargeOff.findFirst({ where: { id: text(input.chargeOffId, 100), accountId, status: "APPROVED" } });
        if (!row) throw new CollectionsError("Recovery payments go on an approved charge-off.", 409);
        const amount = cents(input.amount, "amount");
        const received = parseBusinessDate(input.receivedDate) ?? today;
        await tx.collectionRecoveryPayment.create({ data: { organizationId: org, chargeOffId: row.id, accountId, amountCents: amount, receivedDate: dateOnly(received), method: text(input.method, 40) || "OTHER", notes: text(input.notes, 1000), recordedByUserId: access.actor.id } });
        await tx.collectionChargeOff.update({ where: { id: row.id }, data: { recoveredCents: { increment: amount } } });
        await event("RECOVERY_PAYMENT", { chargeOffId: row.id, amountCents: amount });
        return { ok: true as const, message: `Recovery payment of ${formatCents(amount)} recorded. Post it in DealerCenter too.` };
      }

      // ---------------- Fees and credits ----------------
      case "ADD_ADJUSTMENT": {
        const type = (ADJUSTMENT_TYPES as readonly string[]).includes(String(input.type)) ? (input.type as AdjustmentType) : null;
        if (!type) throw new CollectionsError("Choose the kind of fee or credit.");
        const amount = cents(input.amount, "amount");
        const documentId = text(input.documentId, 100) || null;
        if (documentId && !(await tx.documentLibraryDocument.findFirst({ where: { id: documentId, organizationId: org, ownerType: "COLLECTION_ACCOUNT", ownerId: accountId }, select: { id: true } }))) throw new CollectionsError("Upload the supporting document to this account first.");
        const needsApproval = adjustmentNeedsApproval(amount, settings.adjustmentApprovalThresholdCents);
        const row = await tx.accountAdjustment.create({ data: { organizationId: org, accountId, type: type as AccountAdjustmentType, amountCents: amount, reason: reasonText(input.reason), documentId, enteredByUserId: access.actor.id, status: needsApproval ? "PENDING_APPROVAL" : "APPROVED", ...(needsApproval ? {} : { decidedByUserId: access.actor.id, decidedAt: new Date(), decisionReason: "Under the approval amount" }) } });
        await event("ADJUSTMENT_ADDED", { adjustmentId: row.id, type, amountCents: amount, status: row.status }, row.reason);
        if (!needsApproval) await postTask(`adjustment:${row.id}`, `Post ${ADJ_LABEL[type]} in DealerCenter`, `${formatCents(amount)} ${ADJ_LABEL[type]}: ${row.reason}. Post it in DealerCenter, then mark it posted in Collections.`);
        return { ok: true as const, message: needsApproval ? `Saved. The ${ADJ_LABEL[type]} waits for the owner's approval.` : `Saved and approved (under the approval amount). A "Post in DealerCenter" task is on the board.` };
      }
      case "DECIDE_ADJUSTMENT": {
        const row = await tx.accountAdjustment.findFirst({ where: { id: text(input.adjustmentId, 100), accountId } });
        if (!row || row.status !== "PENDING_APPROVAL") throw new CollectionsError("That fee or credit isn't waiting for approval.", 409);
        const approve = input.decision === "APPROVE";
        const why = reasonText(input.reason, 3);
        await tx.accountAdjustment.update({ where: { id: row.id }, data: { status: approve ? "APPROVED" : "DECLINED", decidedByUserId: access.actor.id, decidedAt: new Date(), decisionReason: why } });
        await event(approve ? "ADJUSTMENT_APPROVED" : "ADJUSTMENT_DECLINED", { adjustmentId: row.id }, why);
        if (approve) await postTask(`adjustment:${row.id}`, `Post ${ADJ_LABEL[row.type]} in DealerCenter`, `${formatCents(row.amountCents)} ${ADJ_LABEL[row.type]}: ${row.reason}. Post it in DealerCenter, then mark it posted in Collections.`);
        return { ok: true as const, message: approve ? "Approved. A \"Post in DealerCenter\" task is on the board." : "Declined." };
      }
      case "MARK_ADJUSTMENT_POSTED": {
        const row = await tx.accountAdjustment.findFirst({ where: { id: text(input.adjustmentId, 100), accountId } });
        if (!row || row.status !== "APPROVED") throw new CollectionsError("Only an approved fee or credit can be marked posted.", 409);
        const baseline = await latestBalances(tx, accountId);
        await tx.accountAdjustment.update({ where: { id: row.id }, data: { status: "POSTED_IN_DMS", postedAt: new Date(), postedByUserId: access.actor.id, baseline: baseline as unknown as Prisma.InputJsonValue } });
        await closeTask(`adjustment:${row.id}`, "Posted in DealerCenter.");
        await event("ADJUSTMENT_POSTED", { adjustmentId: row.id, baseline });
        return { ok: true as const, message: `Marked as posted. It's confirmed automatically when a DealerCenter import shows it (flagged if not within ${settings.adjustmentConfirmationDays} days).` };
      }
      case "CANCEL_ADJUSTMENT": {
        const row = await tx.accountAdjustment.findFirst({ where: { id: text(input.adjustmentId, 100), accountId } });
        if (!row || !["PENDING_APPROVAL", "APPROVED"].includes(row.status)) throw new CollectionsError("This fee or credit can't be cancelled now.", 409);
        const why = reasonText(input.reason);
        await tx.accountAdjustment.update({ where: { id: row.id }, data: { status: "CANCELLED", resolutionNote: why, resolvedAt: new Date() } });
        await closeTask(`adjustment:${row.id}`, "Cancelled.");
        await event("ADJUSTMENT_CANCELLED", { adjustmentId: row.id }, why);
        return { ok: true as const, message: "Cancelled." };
      }
      default:
        throw new CollectionsError("Unknown action.");
    }
  }, { timeout: 30_000 });
}

// ---------------- Automation steps (run with the daily automations and after imports) ----------------

/** Raise "possible skip" alerts. Never clears or confirms anything: a person decides. Idempotent. */
export async function raiseSkipAlerts(db: Db, organizationId: string, settings: CollectionsSettings, today = chicagoToday()) {
  const accounts = await db.collectionAccount.findMany({
    where: { organizationId, closedStatus: null, archivedAt: null, status: { notIn: ["REPOSSESSED", "BANKRUPTCY_FROZEN", "PAID_OFF", "CLOSED"] } },
    select: {
      id: true, daysPastDue: true,
      flags: { where: { clearedAt: null, type: { in: ["SKIP", "DECEASED", "BANKRUPTCY"] } }, select: { id: true } },
      skipAlerts: { orderBy: { raisedAt: "desc" }, take: 1, select: { status: true, decidedAt: true } },
      contactAttempts: { orderBy: { occurredAt: "desc" }, take: 30, select: { outcome: true, occurredAt: true } },
      skipTraceEntries: { where: { createdAt: { gte: new Date(`${addDays(today, -settings.skipNoContactDays)}T00:00:00Z`) } }, select: { step: true } },
      snapshots: { where: { daysPastDue: 0 }, orderBy: { asOfDate: "desc" }, take: 1, select: { asOfDate: true } }
    }
  });
  let raised = 0;
  for (const a of accounts) {
    if (a.flags.length) continue;
    const last = a.skipAlerts[0];
    if (last?.status === "OPEN") continue;
    // After a person dismisses or confirms, wait the no-contact window before raising again.
    if (last?.decidedAt && toYmd(last.decidedAt)! > addDays(today, -settings.skipNoContactDays)) continue;
    const rpc = a.contactAttempts.find(c => RIGHT_PARTY_OUTCOMES.includes(c.outcome));
    const firstPastDue = a.daysPastDue > 0 ? addDays(today, -a.daysPastDue) : null;
    const reasons = skipSignals({
      daysPastDue: a.daysPastDue, today, lastRightPartyContact: rpc ? chicagoToday(rpc.occurredAt) : null, firstPastDueDate: firstPastDue,
      latestOutcome: a.contactAttempts[0]?.outcome ?? null, recentSignalSteps: a.skipTraceEntries.map(e => e.step)
    }, settings.skipNoContactDays);
    if (!reasons.length) continue;
    await db.collectionSkipAlert.create({ data: { organizationId, accountId: a.id, reasons } });
    await db.collectionAccountEvent.create({ data: { organizationId, accountId: a.id, type: "SKIP_ALERT_RAISED", after: { reasons }, reason: reasons.join("; ") } });
    raised += 1;
  }
  return { raised };
}

/** Match fees/credits marked "posted in DealerCenter" against the latest import. Idempotent. */
export async function matchAdjustments(db: Db, organizationId: string, settings: CollectionsSettings, today = chicagoToday()) {
  const posted = await db.accountAdjustment.findMany({ where: { organizationId, status: "POSTED_IN_DMS" } });
  let confirmed = 0, notFound = 0;
  for (const adj of posted) {
    const baseline = adj.baseline as unknown as BalanceBaseline | null;
    if (!baseline || !adj.postedAt) continue;
    const later = await db.collectionAccountSnapshot.findFirst({ where: { accountId: adj.accountId, createdAt: { gt: adj.postedAt } }, orderBy: [{ asOfDate: "desc" }, { createdAt: "desc" }], select: { otherCents: true, lateCents: true, creditCents: true, totalBalanceCents: true } });
    if (later && adjustmentShowsInImport(adj.type as AdjustmentType, adj.amountCents, baseline, later)) {
      await db.accountAdjustment.update({ where: { id: adj.id }, data: { status: "CONFIRMED_BY_IMPORT", resolvedAt: new Date(), resolutionNote: "Seen in a DealerCenter import" } });
      confirmed += 1;
    } else if (adjustmentOverdue(chicagoToday(adj.postedAt), today, settings.adjustmentConfirmationDays)) {
      await db.accountAdjustment.update({ where: { id: adj.id }, data: { status: "NOT_FOUND_IN_IMPORT", resolvedAt: new Date(), resolutionNote: `Not seen in DealerCenter imports within ${settings.adjustmentConfirmationDays} days. Check DealerCenter.` } });
      await db.collectionAccountEvent.create({ data: { organizationId, accountId: adj.accountId, type: "ADJUSTMENT_NOT_FOUND", after: { adjustmentId: adj.id } } });
      notFound += 1;
    }
  }
  return { confirmed, notFound };
}

/** Everything the account page needs for the Stage 12 panels ("Do this next", extensions, skip, charge-off, fees). */
export async function getAccountUpgrades(actor: AuthenticatedUser | null, accountId: string) {
  const access = await collectionsAccess(actor, "VIEW");
  await findAccount(prisma, access, accountId);
  const settings = await loadCollectionsSettings(access.organizationId);
  const [insight] = await prisma.$transaction(tx => loadInsights(tx, access.organizationId, settings, { accountIds: [accountId] }));
  const [extensions, skipAlerts, skipTrace, outcomes, chargeOffs, adjustments] = await Promise.all([
    prisma.extensionRequest.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.collectionSkipAlert.findMany({ where: { accountId }, orderBy: { raisedAt: "desc" }, take: 5 }),
    prisma.collectionSkipTraceEntry.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.collectionRecoveryOutcome.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.collectionChargeOff.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, include: { recoveryPayments: { orderBy: { receivedDate: "desc" } } } }),
    prisma.accountAdjustment.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 50 })
  ]);
  const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;
  return {
    insight: insight ?? null,
    feeDefaults: settings.feeDefaults,
    adjustmentApprovalThresholdCents: settings.adjustmentApprovalThresholdCents,
    chargeOffMinDaysPastDue: settings.chargeOffMinDaysPastDue,
    extensions: extensions.map(e => ({ id: e.id, type: e.type, requestedTerms: e.requestedTerms, newDueDate: toYmd(e.newDueDate), reason: e.reason, eligible: e.eligible, eligibilityNotes: e.eligibilityNotes as string[], status: e.status, decisionReason: e.decisionReason, overrideReason: e.overrideReason, createdAt: e.createdAt.toISOString(), decidedAt: iso(e.decidedAt), appliedAt: iso(e.appliedAt) })),
    skipAlerts: skipAlerts.map(s => ({ id: s.id, status: s.status, reasons: s.reasons as string[], raisedAt: s.raisedAt.toISOString(), decidedAt: iso(s.decidedAt), decisionNote: s.decisionNote })),
    skipTrace: skipTrace.map(s => ({ id: s.id, step: s.step, result: s.result, notes: s.notes, createdAt: s.createdAt.toISOString() })),
    recoveryOutcomes: outcomes.map(o => ({ id: o.id, balanceAtRepoCents: o.balanceAtRepoCents, salePriceCents: o.salePriceCents, costsCents: o.repoCostCents + o.storageCostCents + o.auctionCostCents + o.otherCostCents, deficiencyCents: o.deficiencyCents, notes: o.notes, createdAt: o.createdAt.toISOString() })),
    chargeOffs: chargeOffs.map(c => ({ id: c.id, status: c.status, amountCents: c.amountCents, recoveredCents: c.recoveredCents, reason: c.reason, overrideReason: c.overrideReason, decisionReason: c.decisionReason, createdAt: c.createdAt.toISOString(), decidedAt: iso(c.decidedAt), payments: c.recoveryPayments.map(p => ({ id: p.id, amountCents: p.amountCents, receivedDate: toYmd(p.receivedDate), method: p.method })) })),
    adjustments: adjustments.map(a => ({ id: a.id, type: a.type, amountCents: a.amountCents, reason: a.reason, status: a.status, decisionReason: a.decisionReason, resolutionNote: a.resolutionNote, createdAt: a.createdAt.toISOString(), postedAt: iso(a.postedAt) })),
    canApproveMoney: access.role === "ADMIN"
  };
}

