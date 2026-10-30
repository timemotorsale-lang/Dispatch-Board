import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, isGeneralManager, isManager } from "@/server/policies/access";
import { canOpenDispatchBoard } from "@/server/auth/navigation";
import { getGenerationSettings } from "@/server/services/app-settings-service";
import { getBoardDateInTimeZone, normalizeBoardDate } from "@/server/validation/board-date";
import { projectTeamRow, type DispatchTeam, type TeamTask } from "@/lib/dispatch-team";

const organizationId = INITIAL_ORGANIZATION.id;
export async function readDispatchTeam(actor: AuthenticatedUser | null, date: string): Promise<DispatchTeam> {
  const user = assertAuthenticatedUser(actor);
  if (!user.isActive) throw new Error("Active staff access required.");
  const selectedDate = normalizeBoardDate(date), settings = await getGenerationSettings();
  const today = getBoardDateInTimeZone(new Date(), settings.timezone), historical = selectedDate !== today;
  const boardDate = new Date(`${selectedDate}T00:00:00Z`), fullBoard = canOpenDispatchBoard(user);
  const [people, presences, tasks, focuses, handoffs] = await prisma.$transaction([
    prisma.user.findMany({ where: { ...(fullBoard ? { OR: [{ isActive: true }, ...(historical ? [{ workdayWorkbooks: { some: { boardDay: { date: boardDate } } } }] : [])] } : { id: user.id }) }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 501 }),
    prisma.dispatchPresence.findMany({ where: { organizationId, ...(fullBoard ? {} : { userId: user.id }) }, take: 501 }),
    prisma.task.findMany({ where: { ...(fullBoard ? {} : { assignedUserId: user.id }), ...(historical
      ? { boardDay: { date: boardDate } }
      : { status: { not: "COMPLETED" }, OR: [{ boardDay: { date: boardDate } }, { status: "IN_PROGRESS" }] }) },
      select: { id: true, title: true, status: true, assignedUserId: true, ownerUserId: true, updatedAt: true, blockerReason: true, isClaimable: true, boardDay: { select: { date: true } } },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 2001 }),
    prisma.workdayDailyFocusItem.findMany({ where: { workbook: { ...(fullBoard ? {} : { userId: user.id }), boardDay: { date: boardDate } } },
      select: { id: true, outcome: true, status: true, convertedTaskId: true, workbook: { select: { userId: true, boardDay: { select: { date: true } } } } }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 2001 }),
    prisma.dispatchHandoff.findMany({ where: { organizationId, status: "PENDING", ...(fullBoard ? {} : { OR: [{ senderUserId: user.id }, { receiverUserId: user.id }] }) },
      include: { task: { select: { title: true } }, sender: { select: { name: true } }, receiver: { select: { name: true } } },
      orderBy: { createdAt: "asc" }, take: 501 }),
  ], { isolationLevel: "RepeatableRead" });
  if (people.length > 500 || tasks.length > 2000 || focuses.length > 2000 || handoffs.length > 500 || presences.length > 500) throw new Error("Team activity is too large to load safely. Please narrow the board scope.");
  const taskModels: TeamTask[] = tasks.map(item => ({ ...item, boardDate: item.boardDay.date.toISOString().slice(0, 10), updatedAt: item.updatedAt.toISOString() }));
  const rows = people.map(person => ({ ...projectTeamRow({
    person, date: selectedDate, now: new Date().toISOString(), tasks: historical ? [] : taskModels.filter(item => item.assignedUserId === person.id && !item.isClaimable),
    focuses: focuses.filter(item => item.workbook.userId === person.id).map(item => ({ id: item.id, title: item.outcome, status: item.status, taskId: item.convertedTaskId, businessDate: item.workbook.boardDay.date.toISOString().slice(0, 10) })),
    presence: historical ? null : presences.filter(item => item.userId === person.id).map(item => ({ ...item, updatedAt: item.updatedAt.toISOString(), startedAt: item.startedAt?.toISOString() ?? null }))[0],
  }) }));
  return {
    date: selectedDate, today, historical, syncedAt: new Date().toISOString(), actorUserId: user.id,
    canReviewReports: isGeneralManager(user), canManage: isManager(user), people, rows,
    handoffs: historical ? [] : handoffs.map(item => ({ id: item.id, taskId: item.taskId, title: item.task.title, senderUserId: item.senderUserId,
      receiverUserId: item.receiverUserId, sender: item.sender.name, receiver: item.receiver.name, nextAction: item.nextAction, status: item.status, version: item.version, createdAt: item.createdAt.toISOString() })),
    unassigned: historical ? [] : taskModels.filter(item => item.isClaimable),
    limitation: historical ? "Historical view shows dated focus records. Open Team Reports for recorded activity and submitted snapshots; current task state is not a historical replay." : null,
  };
}
