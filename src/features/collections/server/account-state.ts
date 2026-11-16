/**
 * Loads the workflow facts that decide an account's status (flags, repo case, starter,
 * plans, promises) and recalculates status/bucket from the latest snapshot.
 */
import type { CollectionAccountStatus, Prisma } from "@prisma/client";

import type { CollectionsSettings } from "../domain/settings";
import { bucketFor, deriveAccountStatus } from "../domain/status";

type Db = Prisma.TransactionClient;

export type WorkflowState = {
  activeFlags: Set<string>;
  repoCaseStatus: string | null;
  starterDisabled: boolean;
  hasActivePlan: boolean;
  hasOpenPromise: boolean;
};

const OPEN_REPO = ["REVIEW", "APPROVED", "ASSIGNED", "LOCATED", "RECOVERED", "IN_STORAGE", "SENT_TO_AUCTION", "RETURNED_TO_INVENTORY", "REDEEMED"] as const;

export async function loadWorkflowState(db: Db, organizationId: string, accountIds: string[]) {
  const result = new Map<string, WorkflowState>();
  if (!accountIds.length) return result;
  for (const id of accountIds) result.set(id, { activeFlags: new Set(), repoCaseStatus: null, starterDisabled: false, hasActivePlan: false, hasOpenPromise: false });
  const [flags, repoCases, starter, plans, promises] = await Promise.all([
    db.collectionFlag.findMany({ where: { organizationId, accountId: { in: accountIds }, clearedAt: null }, select: { accountId: true, type: true } }),
    db.repossessionCase.findMany({ where: { organizationId, accountId: { in: accountIds }, status: { in: [...OPEN_REPO] } }, orderBy: { createdAt: "desc" }, select: { accountId: true, status: true } }),
    db.starterDisableAction.findMany({ where: { organizationId, accountId: { in: accountIds }, status: "DONE_IN_PORTAL" }, orderBy: { performedInPortalAt: "desc" }, select: { accountId: true, action: true } }),
    db.paymentPlan.findMany({ where: { organizationId, accountId: { in: accountIds }, status: "ACTIVE" }, select: { accountId: true } }),
    db.paymentPromise.findMany({ where: { organizationId, accountId: { in: accountIds }, status: "OPEN" }, select: { accountId: true } })
  ]);
  for (const flag of flags) result.get(flag.accountId)?.activeFlags.add(flag.type);
  const seenRepo = new Set<string>();
  for (const repo of repoCases) {
    if (seenRepo.has(repo.accountId)) continue;
    seenRepo.add(repo.accountId);
    const state = result.get(repo.accountId);
    if (state) state.repoCaseStatus = repo.status;
  }
  const seenStarter = new Set<string>();
  for (const action of starter) {
    if (seenStarter.has(action.accountId)) continue;
    seenStarter.add(action.accountId);
    const state = result.get(action.accountId);
    if (state) state.starterDisabled = action.action === "DISABLE";
  }
  for (const plan of plans) { const s = result.get(plan.accountId); if (s) s.hasActivePlan = true; }
  for (const promise of promises) { const s = result.get(promise.accountId); if (s) s.hasOpenPromise = true; }
  return result;
}

export function statusFor(
  account: { daysPastDue: number; closedStatus: CollectionAccountStatus | null },
  latestDmsRepoStatus: string | null,
  state: WorkflowState | undefined,
  settings: CollectionsSettings
) {
  const s = state ?? { activeFlags: new Set<string>(), repoCaseStatus: null, starterDisabled: false, hasActivePlan: false, hasOpenPromise: false };
  const closed = account.closedStatus === "PAID_OFF" || account.closedStatus === "CLOSED" ? account.closedStatus : null;
  return {
    bucket: bucketFor(account.daysPastDue, settings.graceDays),
    status: deriveAccountStatus({
      daysPastDue: account.daysPastDue,
      graceDays: settings.graceDays,
      disableThreshold: settings.thresholds.disableReview,
      repoThreshold: settings.thresholds.repoReview,
      dmsRepoStatus: latestDmsRepoStatus,
      bankruptcyActive: s.activeFlags.has("BANKRUPTCY"),
      repoCaseStatus: s.repoCaseStatus,
      starterDisabled: s.starterDisabled,
      hasActivePlan: s.hasActivePlan,
      hasOpenPromise: s.hasOpenPromise,
      closedStatus: closed,
      repoReviewHold: s.activeFlags.has("DO_NOT_REPO_REVIEW_HOLD")
    })
  };
}

/** Recalculate and save status/bucket for the given accounts. Writes an event only when status changes. */
export async function recalculateAccounts(db: Db, organizationId: string, settings: CollectionsSettings, accountIds?: string[]) {
  const accounts = await db.collectionAccount.findMany({
    where: { organizationId, ...(accountIds ? { id: { in: accountIds } } : {}) },
    select: { id: true, daysPastDue: true, closedStatus: true, status: true, bucket: true, snapshots: { orderBy: { asOfDate: "desc" }, take: 1, select: { dmsRepoStatus: true } } }
  });
  const states = await loadWorkflowState(db, organizationId, accounts.map(account => account.id));
  let changed = 0;
  for (const account of accounts) {
    const next = statusFor(account, account.snapshots[0]?.dmsRepoStatus ?? null, states.get(account.id), settings);
    if (next.status === account.status && next.bucket === account.bucket) continue;
    await db.collectionAccount.update({ where: { id: account.id }, data: { status: next.status, bucket: next.bucket, version: { increment: 1 } } });
    if (next.status !== account.status) {
      await db.collectionAccountEvent.create({ data: { organizationId, accountId: account.id, type: "STATUS_CHANGE", before: { status: account.status }, after: { status: next.status }, reason: "Recalculated from latest snapshot and workflow state" } });
    }
    changed += 1;
  }
  return { checked: accounts.length, changed };
}
