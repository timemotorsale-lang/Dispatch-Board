import type { AuthenticatedUser } from "@/server/auth/store";
import { getStaffExecutionFlags, type StaffExecutionFlags } from "@/lib/staff-execution-flags";
import { assertAuthenticatedUser, canUseStaffSelfService, isManager } from "@/server/policies/access";
import {
  createStaffDayRepository,
  type StaffDayDutySnapshot,
  type StaffDayGenerationUser,
  type StaffDayRepository
} from "@/server/repositories/staff-day-repository";
import { normalizeBoardDate } from "@/server/validation/board-date";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";

type Dependencies = {
  flags?: StaffExecutionFlags;
  now?: () => Date;
  recordActivity?: typeof recordBoardActivityEvent;
  repository?: StaffDayRepository;
};

function toReadModel(staffDay: Awaited<ReturnType<StaffDayRepository["findForUser"]>>) {
  if (!staffDay) return null;
  return {
    ...staffDay,
    startAcknowledgedAt: staffDay.startAcknowledgedAt?.toISOString() ?? null,
    availabilityDeclaredAt: staffDay.availabilityDeclaredAt?.toISOString() ?? null,
    closedAt: staffDay.closedAt?.toISOString() ?? null,
    createdAt: staffDay.createdAt.toISOString(),
    updatedAt: staffDay.updatedAt.toISOString(),
    dutyItems: staffDay.dutyItems.map((item) => ({
      ...item,
      completedAt: item.completedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    }))
  };
}

export type StaffDayReadModel = NonNullable<ReturnType<typeof toReadModel>>;

export function buildStaffDayDutySnapshots(user: StaffDayGenerationUser): StaffDayDutySnapshot[] {
  const snapshots = new Map<string, StaffDayDutySnapshot>();

  for (const assignment of user.userDuties) {
    const duty = assignment.duty;
    snapshots.set(duty.id, {
      description: duty.description,
      label: duty.name,
      required: true,
      sortOrder: 0,
      sourceDutyId: duty.id,
      sourceKey: `duty:${duty.id}`,
      sourceRoleId: null,
      sourceType: "DIRECT",
      workflowArea: duty.workflowArea
    });
  }

  for (const assignment of user.userRoles) {
    for (const roleDuty of assignment.role.roleDuties) {
      const duty = roleDuty.duty;
      if (!snapshots.has(duty.id)) {
        snapshots.set(duty.id, {
          description: duty.description,
          label: duty.name,
          required: true,
          sortOrder: 0,
          sourceDutyId: duty.id,
          sourceKey: `duty:${duty.id}`,
          sourceRoleId: assignment.role.id,
          sourceType: "ROLE",
          workflowArea: duty.workflowArea
        });
      }
    }
  }

  return [...snapshots.values()]
    .sort((left, right) => left.workflowArea.localeCompare(right.workflowArea) || left.label.localeCompare(right.label))
    .map((snapshot, sortOrder) => ({ ...snapshot, sortOrder }));
}

export async function generateStaffDayPlans(
  actor: AuthenticatedUser | null,
  boardDate: string,
  dependencies: Dependencies = {}
) {
  const user = assertAuthenticatedUser(actor);
  if (!isManager(user)) throw new Error("Manager access is required to generate staff-day plans.");
  return generateStaffDayPlansForBoardDate(boardDate, dependencies);
}

export async function generateStaffDayPlansForBoardDate(
  boardDate: string,
  dependencies: Dependencies = {}
) {
  const date = normalizeBoardDate(boardDate);
  const flags = dependencies.flags ?? getStaffExecutionFlags();
  if (!flags.enabled) return { boardDate: date, enabled: false, generatedCount: 0 };
  const repository = dependencies.repository ?? createStaffDayRepository();
  const boardDay = await repository.findBoardDay(date);
  if (!boardDay) throw new Error("Board day not found.");
  const users = await repository.listActiveUsers();
  for (const staffUser of users) {
    await repository.upsertPlan({ boardDayId: boardDay.id, duties: buildStaffDayDutySnapshots(staffUser), userId: staffUser.id });
  }
  return { boardDate: date, enabled: true, generatedCount: users.length };
}

export async function getStaffDay(
  actor: AuthenticatedUser | null,
  boardDate: string,
  subjectUserId?: string,
  dependencies: Dependencies = {}
) {
  const user = assertAuthenticatedUser(actor);
  const targetUserId = subjectUserId?.trim() || user.id;
  if (!canUseStaffSelfService(user, targetUserId)) throw new Error("You do not have permission to view this staff day.");
  const date = normalizeBoardDate(boardDate);
  const flags = dependencies.flags ?? getStaffExecutionFlags();
  if (!flags.enabled) return { boardDate: date, enabled: false, staffDay: null, startDayEnabled: false };
  const repository = dependencies.repository ?? createStaffDayRepository();
  return { boardDate: date, enabled: true, staffDay: toReadModel(await repository.findForUser(date, targetUserId)), startDayEnabled: flags.startDayGateEnabled };
}

function requireStartDayFlags(dependencies: Dependencies) {
  const flags = dependencies.flags ?? getStaffExecutionFlags();
  if (!flags.enabled || !flags.startDayGateEnabled) throw new Error("Start Day is not enabled.");
  return flags;
}

export async function startStaffDay(actor: AuthenticatedUser | null, boardDate: string, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  requireStartDayFlags(dependencies);
  const candidate = input && typeof input === "object" ? input as Record<string, unknown> : {};
  if (candidate.reviewedPriorities !== true) throw new Error("Start Day requires priority acknowledgement.");
  const hasBlocker = candidate.hasBlocker === true;
  const blockerCode = hasBlocker && typeof candidate.blockerCode === "string" ? candidate.blockerCode.trim() : null;
  const blockerNote = hasBlocker && typeof candidate.blockerNote === "string" ? candidate.blockerNote.trim() : null;
  if (hasBlocker && (!blockerCode || !blockerNote)) throw new Error("Starting blockers require a category and note.");
  const date = normalizeBoardDate(boardDate);
  const repository = dependencies.repository ?? createStaffDayRepository();
  const existing = await repository.findForUser(date, user.id);
  if (!existing) throw new Error("Staff day not found.");
  const startedAt = (dependencies.now ?? (() => new Date()))();
  const updated = await repository.startDay({ blockerCode, blockerNote, staffDayId: existing.id, startedAt });
  await (dependencies.recordActivity ?? recordBoardActivityEvent)({
    boardDayId: existing.boardDayId,
    actorUserId: user.id,
    eventType: hasBlocker ? "staff_day.start_blocker_recorded" : "staff_day.started",
    message: hasBlocker ? `${user.name} started the day with a documented blocker.` : `${user.name} reviewed priorities and started the day.`,
    metadata: { blockerCode, staffDayId: existing.id }
  });
  return toReadModel(updated);
}

export async function updateStaffDayDuty(actor: AuthenticatedUser | null, itemId: string, input: unknown, dependencies: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor);
  requireStartDayFlags(dependencies);
  const candidate = input && typeof input === "object" ? input as Record<string, unknown> : {};
  if (typeof candidate.completed !== "boolean") throw new Error("Duty updates require completed to be a boolean.");
  const repository = dependencies.repository ?? createStaffDayRepository();
  const item = await repository.findDutyItem(itemId.trim());
  if (!item) throw new Error("Staff-day duty item not found.");
  if (!canUseStaffSelfService(user, item.staffDay.userId)) throw new Error("You do not have permission to update this duty item.");
  const completedAt = candidate.completed ? (dependencies.now ?? (() => new Date()))() : null;
  await repository.updateDutyItem({ completed: candidate.completed, completedAt, completedByUserId: candidate.completed ? user.id : null, itemId: item.id });
  await (dependencies.recordActivity ?? recordBoardActivityEvent)({
    boardDayId: item.staffDay.boardDayId,
    actorUserId: user.id,
    eventType: candidate.completed ? "duty_item.completed" : "duty_item.reopened",
    message: `${user.name} ${candidate.completed ? "completed" : "reopened"} daily duty: ${item.label}.`,
    metadata: { dutyItemId: item.id, staffDayId: item.staffDayId }
  });
  return { completed: candidate.completed, completedAt: completedAt?.toISOString() ?? null, id: item.id };
}
