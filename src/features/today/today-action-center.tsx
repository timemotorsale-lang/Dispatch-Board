import Link from "next/link";
import { TaskStatus } from "@prisma/client";
import {
  AlertTriangle,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ContactRound,
  ListChecks,
  Play,
  ShieldAlert,
  Sparkles
} from "lucide-react";

import { CRM_NEXT_SEARCH_HREF } from "@/features/crm/crm-route-authority";
import type { BoardReadTask } from "@/server/services/board-read";

type TodayActionCenterProps = {
  boardDate: string;
  boardExists: boolean;
  fullBoardHref: string;
  generatedAt: string | null;
  generationStatus: string | null;
  nowIso: string;
  tasks: BoardReadTask[];
  userName: string;
};

type TodayTaskTone = "danger" | "warning" | "review" | "ready" | "neutral";

const completedStatuses = new Set<string>([TaskStatus.COMPLETED]);
const waitingStatuses = new Set<string>([
  TaskStatus.BLOCKED,
  TaskStatus.WAITING_ON_APPROVAL,
  TaskStatus.WAITING_ON_PARTS,
  TaskStatus.READY_FOR_REVIEW
]);

function formatBoardDateLabel(boardDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${boardDate}T00:00:00.000Z`));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatStatusLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAreaLabel(value: string) {
  return formatStatusLabel(value).replace("General Manager", "GM");
}

function getTaskReference(task: BoardReadTask) {
  return task.vehicleReference || task.customerReference || formatAreaLabel(task.workflowArea);
}

function isComplete(task: BoardReadTask) {
  return completedStatuses.has(task.status);
}

function isBlocked(task: BoardReadTask) {
  return task.status === TaskStatus.BLOCKED || Boolean(task.blockerReason);
}

function isManagerReview(task: BoardReadTask) {
  return task.status === TaskStatus.READY_FOR_REVIEW || task.requiresManagerApproval;
}

function isOverdue(task: BoardReadTask, now: Date) {
  return !isComplete(task) && new Date(task.dueAt).getTime() < now.getTime();
}

function isDueSoon(task: BoardReadTask, now: Date) {
  const dueAt = new Date(task.dueAt).getTime();
  const delta = dueAt - now.getTime();
  return !isComplete(task) && delta >= 0 && delta <= 1000 * 60 * 60 * 4;
}

function getTaskTone(task: BoardReadTask, now: Date): TodayTaskTone {
  if (isBlocked(task) || isOverdue(task, now)) return "danger";
  if (task.status === TaskStatus.WAITING_ON_APPROVAL || task.status === TaskStatus.WAITING_ON_PARTS) return "warning";
  if (isManagerReview(task)) return "review";
  if (task.status === TaskStatus.NOT_STARTED || task.status === TaskStatus.IN_PROGRESS) return "ready";
  return "neutral";
}

function getTaskReason(task: BoardReadTask, now: Date) {
  if (isBlocked(task)) return task.blockerReason || "Blocked";
  if (isOverdue(task, now)) return `Overdue since ${formatTime(task.dueAt)}`;
  if (isManagerReview(task)) return "Needs manager review";
  if (task.status === TaskStatus.WAITING_ON_APPROVAL) return "Waiting on approval";
  if (task.status === TaskStatus.WAITING_ON_PARTS) return "Waiting on parts";
  if (isDueSoon(task, now)) return `Due soon at ${formatTime(task.dueAt)}`;
  return formatStatusLabel(task.status);
}

function sortByDueAt(tasks: BoardReadTask[]) {
  return [...tasks].sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());
}

function chooseNextTask(tasks: BoardReadTask[], now: Date) {
  const openTasks = tasks.filter((task) => !isComplete(task));
  const orderedGroups = [
    openTasks.filter((task) => isBlocked(task)),
    openTasks.filter((task) => isOverdue(task, now)),
    openTasks.filter((task) => isManagerReview(task)),
    openTasks.filter((task) => isDueSoon(task, now)),
    openTasks.filter((task) => !waitingStatuses.has(task.status))
  ];

  return orderedGroups.map(sortByDueAt).flat()[0] ?? null;
}

function TodayTaskCard({
  label,
  now,
  task
}: {
  label?: string;
  now: Date;
  task: BoardReadTask;
}) {
  const tone = getTaskTone(task, now);

  return (
    <Link className={`today-task-card today-task-card-${tone}`} href={`/tasks/${encodeURIComponent(task.id)}`}>
      <span>{label ?? getTaskReason(task, now)}</span>
      <strong>{task.title}</strong>
      <small>{getTaskReference(task)} · {formatTime(task.dueAt)}</small>
      <ChevronRight aria-hidden="true" size={18} />
    </Link>
  );
}

export function TodayActionCenter({
  boardDate,
  boardExists,
  fullBoardHref,
  generatedAt,
  generationStatus,
  nowIso,
  tasks,
  userName
}: TodayActionCenterProps) {
  const now = new Date(nowIso);
  const openTasks = tasks.filter((task) => !isComplete(task));
  const blockedTasks = openTasks.filter((task) => isBlocked(task));
  const overdueTasks = openTasks.filter((task) => isOverdue(task, now));
  const reviewTasks = openTasks.filter((task) => isManagerReview(task));
  const dueSoonTasks = sortByDueAt(openTasks.filter((task) => isDueSoon(task, now))).slice(0, 4);
  const attentionTasks = sortByDueAt(
    [...blockedTasks, ...overdueTasks, ...reviewTasks].filter((task, index, list) => list.findIndex((candidate) => candidate.id === task.id) === index)
  ).slice(0, 4);
  const quickWinTasks = sortByDueAt(
    openTasks.filter((task) =>
      !isBlocked(task) &&
      !isManagerReview(task) &&
      task.requiredUpdateFields.length === 0 &&
      !waitingStatuses.has(task.status)
    )
  ).slice(0, 3);
  const nextTask = chooseNextTask(tasks, now);
  const attentionCount = new Set([...blockedTasks, ...overdueTasks, ...reviewTasks].map((task) => task.id)).size;

  return (
    <main className="today-action-center" aria-label="Today Action Center">
      <header className="today-hero">
        <div>
          <p>Today / Action Center</p>
          <h1>Good morning, {userName.split(" ")[0] || "there"}</h1>
          <span>{formatBoardDateLabel(boardDate)} · {attentionCount ? `${attentionCount} things need attention` : "No urgent blockers right now"}</span>
        </div>
        {nextTask ? (
          <Link className="today-start-button" href={`/tasks/${encodeURIComponent(nextTask.id)}`}>
            <Play aria-hidden="true" size={18} />
            Start next task
          </Link>
        ) : (
          <Link className="today-start-button today-start-button-calm" href={fullBoardHref}>
            <ListChecks aria-hidden="true" size={18} />
            Open board
          </Link>
        )}
      </header>

      <section className="today-kpi-strip" aria-label="Today summary">
        <article className={attentionCount ? "attention" : ""}>
          <AlertTriangle aria-hidden="true" size={20} />
          <span>Needs attention</span>
          <strong>{attentionCount}</strong>
          <small>Blocked, overdue, or review</small>
        </article>
        <article>
          <Clock3 aria-hidden="true" size={20} />
          <span>Due next</span>
          <strong>{dueSoonTasks.length}</strong>
          <small>Next four hours</small>
        </article>
        <article>
          <CheckCircle2 aria-hidden="true" size={20} />
          <span>Quick wins</span>
          <strong>{quickWinTasks.length}</strong>
          <small>Ready to move</small>
        </article>
        <article>
          <Sparkles aria-hidden="true" size={20} />
          <span>Board</span>
          <strong>{boardExists ? "Live" : "—"}</strong>
          <small>{generationStatus ?? (generatedAt ? "Generated" : "Not generated")}</small>
        </article>
      </section>

      <section className="today-primary-grid">
        <article className="today-panel today-next-card">
          <header>
            <span>Best next action</span>
            <Link href="/my-tasks">My Tasks</Link>
          </header>
          {nextTask ? (
            <TodayTaskCard label={getTaskReason(nextTask, now)} now={now} task={nextTask} />
          ) : (
            <div className="today-empty-card">
              <CheckCircle2 aria-hidden="true" size={22} />
              <strong>You are clear for now.</strong>
              <span>Open the board if you want to review team work or prepare the next batch.</span>
            </div>
          )}
        </article>

        <article className="today-panel today-quick-actions">
          <header>
            <span>Quick actions</span>
          </header>
          <div>
            <Link href="/my-tasks"><ListChecks size={18} />Update task</Link>
            <Link href="/vehicles/coo-workbook/effectiveness-pilot"><CheckCircle2 size={18} />Daily focus</Link>
            <Link href="/appointments"><CalendarDays size={18} />Appointment</Link>
            <Link href="/vehicles/workflows"><CarFront size={18} />Inventory workflow</Link>
            <Link href={CRM_NEXT_SEARCH_HREF}><ContactRound size={18} />Find customer</Link>
          </div>
        </article>
      </section>

      <section className="today-work-grid">
        <article className="today-panel">
          <header>
            <span>Needs attention</span>
            <Link href={fullBoardHref}>Full board</Link>
          </header>
          <div className="today-card-list">
            {attentionTasks.length ? attentionTasks.map((task) => (
              <TodayTaskCard key={task.id} now={now} task={task} />
            )) : (
              <div className="today-empty-card today-empty-card-compact">
                <ShieldAlert aria-hidden="true" size={20} />
                <strong>No urgent attention items.</strong>
                <span>Blocked, overdue, and review work will appear here.</span>
              </div>
            )}
          </div>
        </article>

        <article className="today-panel">
          <header>
            <span>Due next</span>
            <Link href="/appointments">Schedule</Link>
          </header>
          <div className="today-card-list">
            {dueSoonTasks.length ? dueSoonTasks.map((task) => (
              <TodayTaskCard key={task.id} label={`Due ${formatTime(task.dueAt)}`} now={now} task={task} />
            )) : (
              <div className="today-empty-card today-empty-card-compact">
                <Clock3 aria-hidden="true" size={20} />
                <strong>No tasks due in the next four hours.</strong>
                <span>Use quick actions to check appointments or inventory flow.</span>
              </div>
            )}
          </div>
        </article>

        <article className="today-panel today-panel-wide">
          <header>
            <span>My work queue</span>
            <Link href="/my-tasks">Open all</Link>
          </header>
          <div className="today-card-list today-card-list-grid">
            {sortByDueAt(openTasks).slice(0, 6).map((task) => (
              <TodayTaskCard key={task.id} now={now} task={task} />
            ))}
            {!openTasks.length ? (
              <div className="today-empty-card today-empty-card-compact">
                <CheckCircle2 aria-hidden="true" size={20} />
                <strong>No assigned open tasks.</strong>
                <span>You can still review the live board or pick up available work.</span>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
