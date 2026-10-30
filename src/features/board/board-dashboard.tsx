import type { ReactNode } from "react";
import {
  AlertCircle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Layers3,
  Search,
  ShieldAlert,
  ShieldCheck,
  Siren,
  TriangleAlert,
  UsersRound,
  Wrench
} from "lucide-react";
import Link from "next/link";

import { EmptyStateCard } from "@/components/ui/state-card";
import type { ActivityFeedEvent } from "@/server/services/activity-feed";
import type {
  BoardReadLatestGeneration,
  BoardReadModel,
  BoardReadSchedulerFailure,
  BoardReadSchedulerHealth,
  BoardReadTask
} from "@/server/services/board-read";
import type { ActiveUserSummary } from "@/server/services/user-summary";
import { listProjectCardSummaries } from "@/features/projects/project-data";
import { formatBoardEnumLabel, type BoardFilters, type BoardGroupMode, type BoardPresentation } from "./board-grouping";

type Task = Omit<BoardReadTask, "assignedUser"> & { assignedUser: BoardReadTask["assignedUser"] | null };

export function formatBoardDate(boardDate: string, short = false) {
  return new Intl.DateTimeFormat(
    "en-US",
    short
      ? { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }
      : { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }
  ).format(new Date(`${boardDate}T00:00:00.000Z`));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function timeLeft(value: string) {
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  if (minutes < 0) return `${Math.abs(minutes) < 60 ? `${Math.abs(minutes)}m` : `${Math.round(Math.abs(minutes) / 60)}h`} overdue`;
  return minutes < 60 ? `${minutes}m left` : `${Math.round(minutes / 60)}h left`;
}

function statusClass(status: string) {
  if (status === "BLOCKED") return "status-pill status-danger";
  if (status === "WAITING_ON_PARTS" || status === "WAITING_ON_APPROVAL") return "status-pill status-warning";
  if (status === "READY_FOR_REVIEW") return "status-pill status-review";
  if (status === "COMPLETED") return "status-pill status-success";
  if (status === "IN_PROGRESS") return "status-pill status-progress";
  return "status-pill status-neutral";
}

function urgency(task: Task) {
  if (task.status === "COMPLETED") return { label: "Done", className: "urgency-low" };
  const minutes = (new Date(task.dueAt).getTime() - Date.now()) / 60000;
  if (minutes < 0 || task.status === "BLOCKED") return { label: "High", className: "urgency-high" };
  if (minutes < 180) return { label: "Medium", className: "urgency-medium" };
  return { label: "Normal", className: "urgency-low" };
}

function getRecommendationSummary(task: Task) {
  if (task.recommendedUser) {
    return `Recommended: ${task.recommendedUser.name}`;
  }

  if (task.recommendation) {
    return task.recommendation.explanation;
  }

  return null;
}

function getBoardStatusLabel(
  generationStatus: string | undefined,
  latestGeneration: BoardReadModel["latestGeneration"] | undefined
) {
  if (latestGeneration?.status === "failed" || generationStatus === "FAILED") {
    return "Generation needs attention";
  }

  if (latestGeneration?.status === "running" || generationStatus === "IN_PROGRESS") {
    return "Generation running";
  }

  if (generationStatus === "GENERATED") {
    return "Board active";
  }

  return "Board pending";
}

function formatBoardDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatSchedulerHealthStatus(status: BoardReadSchedulerHealth["status"]) {
  if (status === "healthy") {
    return "Healthy";
  }

  if (status === "attention") {
    return "Needs attention";
  }

  return "Waiting";
}

function formatReadinessStatus(status: BoardReadSchedulerHealth["readiness"]["status"]) {
  if (status === "ready") {
    return "Ready";
  }

  if (status === "attention") {
    return "Needs attention";
  }

  return "Partially known";
}

function formatReadinessCheckStatus(
  status: BoardReadSchedulerHealth["readiness"]["checks"][number]["status"]
) {
  if (status === "ready") {
    return "Ready";
  }

  if (status === "attention") {
    return "Attention";
  }

  return "Unknown";
}

function formatBoardGenerationState(state: BoardReadSchedulerHealth["boardGenerationStatus"]["state"]) {
  if (state === "not_created") {
    return "No board yet";
  }

  if (state === "not_started") {
    return "Board not started";
  }

  if (state === "in_progress") {
    return "Board generating";
  }

  if (state === "generated") {
    return "Board generated";
  }

  return "Board failed";
}

function formatExpectedRunWindow(value: boolean | null) {
  if (value === null) {
    return "Expected run window unknown";
  }

  return value ? "Should have run by now" : "Run window not reached yet";
}

function formatAttemptState(state: NonNullable<BoardReadSchedulerHealth["latestScheduledAttempt"]>["attemptState"]) {
  return formatBoardEnumLabel(state);
}

function formatGenerationLabel(run: BoardReadLatestGeneration | null) {
  if (!run) {
    return "No run recorded";
  }

  return `${run.triggeredBy === "scheduled" ? "Automatic" : "Manual"} ${run.status}`;
}

function formatFailureLabel(failure: BoardReadSchedulerFailure | null) {
  if (!failure) {
    return "No failure recorded";
  }

  return `${failure.triggeredBy === "scheduled" ? "Automatic" : "Manual"} ${failure.source === "scheduled_attempt" ? "attempt" : "run"} failed`;
}

function getHealthToneClass(status: BoardReadSchedulerHealth["status"]) {
  if (status === "healthy") {
    return "scheduler-health-good";
  }

  if (status === "attention") {
    return "scheduler-health-alert";
  }

  return "scheduler-health-waiting";
}

function HealthCard({
  detail,
  eyebrow,
  icon,
  title
}: {
  detail: string;
  eyebrow: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <article className="scheduler-health-card">
      <span className="scheduler-health-card-icon">{icon}</span>
      <div className="scheduler-health-card-copy">
        <span>{eyebrow}</span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

export function SchedulerHealthPanel({
  boardDate,
  schedulerHealth
}: {
  boardDate: string;
  schedulerHealth: BoardReadSchedulerHealth;
}) {
  const guidance = schedulerHealth.guidance;
  const latestScheduledAttempt = schedulerHealth.latestScheduledAttempt;
  const latestManualRun = schedulerHealth.latestManualRun;
  const lastSuccess = schedulerHealth.lastSuccess;
  const lastFailure = schedulerHealth.lastFailure;
  const showUnauthorizedSummary = Boolean(
    schedulerHealth.unauthorizedSummary &&
      (schedulerHealth.unauthorizedSummary.repeated ||
        latestScheduledAttempt?.attemptState === "unauthorized")
  );

  return (
    <section className={`scheduler-health-panel ${getHealthToneClass(schedulerHealth.status)}`}>
      <header className="scheduler-health-header">
        <div className="scheduler-health-header-copy">
          <p className="section-kicker">Manager generation health</p>
          <h2>{formatBoardDate(boardDate, true)}</h2>
          <p>{guidance.title}</p>
          <small>{schedulerHealth.managerMessage}</small>
          <small>{schedulerHealth.nextStepMessage}</small>
        </div>
        <div className="scheduler-health-status-stack">
          <span className={`scheduler-health-badge ${getHealthToneClass(schedulerHealth.status)}`}>
            {formatSchedulerHealthStatus(schedulerHealth.status)}
          </span>
          <span className="scheduler-health-flag">
            {guidance.actionRequired ? "Manager action needed" : "No manager action needed"}
          </span>
          <span className="scheduler-health-flag scheduler-health-flag-muted">
            {formatExpectedRunWindow(schedulerHealth.expectedToHaveRunByNow)}
          </span>
          {guidance.safeToRetry ? (
            <span className="scheduler-health-flag scheduler-health-flag-muted">
              Safe to retry
            </span>
          ) : null}
        </div>
      </header>

      <div className="scheduler-health-summary-grid">
        <HealthCard
          detail={
            schedulerHealth.boardGenerationStatus.generatedAt
              ? `Completed ${formatBoardDateTime(schedulerHealth.boardGenerationStatus.generatedAt)}`
              : formatExpectedRunWindow(schedulerHealth.expectedToHaveRunByNow)
          }
          eyebrow="Board status"
          icon={<ShieldCheck size={18} />}
          title={formatBoardGenerationState(schedulerHealth.boardGenerationStatus.state)}
        />
        <HealthCard
          detail={
            latestScheduledAttempt
              ? `${formatAttemptState(latestScheduledAttempt.attemptState)} at ${formatBoardDateTime(latestScheduledAttempt.completedAt ?? latestScheduledAttempt.receivedAt)}`
              : "No scheduled attempt evidence for this board date."
          }
          eyebrow="Latest scheduled"
          icon={<CalendarClock size={18} />}
          title={
            latestScheduledAttempt
              ? latestScheduledAttempt.managerMessage
              : "No automatic run recorded"
          }
        />
        <HealthCard
          detail={
            latestManualRun
              ? `${formatBoardDateTime(latestManualRun.attemptedAt)}${latestManualRun.summary ? ` • ${latestManualRun.summary}` : ""}`
              : "No manual retry has been recorded for this board date."
          }
          eyebrow="Latest manual"
          icon={<Wrench size={18} />}
          title={formatGenerationLabel(latestManualRun)}
        />
        <HealthCard
          detail={
            lastSuccess
              ? `${formatBoardDateTime(lastSuccess.attemptedAt)}${lastSuccess.summary ? ` • ${lastSuccess.summary}` : ""}`
              : "No successful generation has been recorded for this board date."
          }
          eyebrow="Last success"
          icon={<CheckCircle2 size={18} />}
          title={
            lastSuccess
              ? `${lastSuccess.triggeredBy === "scheduled" ? "Automatic" : "Manual"} success`
              : "No success yet"
          }
        />
        <HealthCard
          detail={
            lastFailure
              ? `${formatBoardDateTime(lastFailure.occurredAt)}${lastFailure.failureCode ? ` • ${formatBoardEnumLabel(lastFailure.failureCode)}` : ""}`
              : "No failed generation is currently recorded for this board date."
          }
          eyebrow="Last failure"
          icon={<Siren size={18} />}
          title={lastFailure ? lastFailure.managerMessage : formatFailureLabel(lastFailure)}
        />
        <HealthCard
          detail={
            schedulerHealth.latestSkipReason
              ? `${formatBoardDateTime(schedulerHealth.latestSkipReason.occurredAt)} • ${schedulerHealth.latestSkipReason.managerMessage}`
              : "No skip reason is currently recorded for this board date."
          }
          eyebrow="Latest skip"
          icon={<TriangleAlert size={18} />}
          title={
            schedulerHealth.latestSkipReason
              ? formatBoardEnumLabel(schedulerHealth.latestSkipReason.code)
              : "No skip recorded"
          }
        />
      </div>

      <div className="scheduler-health-secondary-grid">
        {showUnauthorizedSummary && schedulerHealth.unauthorizedSummary ? (
          <article className="scheduler-health-detail-panel">
            <div className="scheduler-health-detail-header">
              <span className="scheduler-health-card-icon">
                <ShieldAlert size={18} />
              </span>
              <div className="scheduler-health-detail-copy">
                <span>Unauthorized scheduled requests</span>
                <strong>{schedulerHealth.unauthorizedSummary.managerMessage}</strong>
                <small>{schedulerHealth.unauthorizedSummary.nextStepMessage}</small>
              </div>
            </div>
            <div className="scheduler-readiness-list">
              <div className="scheduler-readiness-item">
                <strong>Count</strong>
                <span className="scheduler-readiness-status scheduler-readiness-status-attention">
                  {schedulerHealth.unauthorizedSummary.count}
                </span>
                <small>
                  Latest blocked request at{" "}
                  {formatBoardDateTime(schedulerHealth.unauthorizedSummary.latestOccurredAt)}
                  {schedulerHealth.unauthorizedSummary.latestReasonCode
                    ? ` • ${formatBoardEnumLabel(schedulerHealth.unauthorizedSummary.latestReasonCode)}`
                    : ""}
                </small>
              </div>
            </div>
          </article>
        ) : null}

        <article className="scheduler-health-detail-panel">
          <div className="scheduler-health-detail-header">
            <span className="scheduler-health-card-icon">
              <ShieldCheck size={18} />
            </span>
            <div className="scheduler-health-detail-copy">
              <span>Scheduler readiness</span>
              <strong>{formatReadinessStatus(schedulerHealth.readiness.status)}</strong>
              <small>{schedulerHealth.readiness.summary}</small>
            </div>
          </div>
          <div className="scheduler-readiness-list">
            {schedulerHealth.readiness.checks.map((check) => (
              <div className="scheduler-readiness-item" key={check.code}>
                <strong>{check.label}</strong>
                <span
                  className={
                    check.status === "ready"
                      ? "scheduler-readiness-status scheduler-readiness-status-ready"
                      : check.status === "attention"
                        ? "scheduler-readiness-status scheduler-readiness-status-attention"
                        : "scheduler-readiness-status scheduler-readiness-status-unknown"
                  }
                >
                  {formatReadinessCheckStatus(check.status)}
                </span>
                <small>{check.detail}</small>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

export function ManagerHealthPanelToggle({
  isOpen,
  onToggle,
  schedulerHealth
}: {
  isOpen: boolean;
  onToggle(): void;
  schedulerHealth: BoardReadSchedulerHealth;
}) {
  const statusLabel = formatSchedulerHealthStatus(schedulerHealth.status);
  const toneClass = getHealthToneClass(schedulerHealth.status);

  return (
    <div className="board-manager-panel-toggle">
      <span className={`board-manager-panel-status ${toneClass}`}>{statusLabel}</span>
      <button
        aria-expanded={isOpen}
        className="pill pill-secondary board-manager-panel-button"
        onClick={onToggle}
        type="button"
      >
        {isOpen ? "Hide health panel" : "Health Panel"}
      </button>
    </div>
  );
}

export function BoardHero({
  boardDate,
  generationStatus,
  latestGeneration,
  toolbar,
  informational = false
}: {
  boardDate: string;
  informational?: boolean;
  generationStatus?: string;
  latestGeneration?: BoardReadModel["latestGeneration"];
  toolbar: ReactNode;
}) {
  const generationDetail = latestGeneration
    ? `${latestGeneration.triggeredBy === "manual" ? "Manual" : "Automatic"} run ${latestGeneration.status === "success" ? "succeeded" : latestGeneration.status} at ${formatTime(latestGeneration.attemptedAt)}${latestGeneration.createdTaskCount !== null ? ` · ${latestGeneration.createdTaskCount} tasks created` : ""}${latestGeneration.skippedExistingTaskCount !== null ? ` · ${latestGeneration.skippedExistingTaskCount} duplicates skipped` : ""}`
    : "No generation run has been recorded for this board date.";

  return (
    <section className="board-hero">
      <div><p className="section-kicker">Daily dispatch board</p><h1>{formatBoardDate(boardDate)}</h1><p className="board-generation-summary">{informational ? "Team activity and workbook focuses, updated from your existing workspaces." : generationDetail}</p></div>
      <div className="board-hero-actions"><span className="operating-status"><span />{informational ? "Live operations" : getBoardStatusLabel(generationStatus, latestGeneration)}</span>{toolbar}</div>
    </section>
  );
}

export type DispatchBoardView = "overview" | "live";

export type Metric = {
  label: string;
  value: number;
  detail: string;
  tone: string;
  icon: "active" | "stuck" | "manager" | "review" | "done";
  metricKey: "" | "active" | "stuck" | "needs_manager" | "ready_for_review" | "completed";
};
const metricIcons = { active: Layers3, stuck: AlertCircle, manager: CircleUserRound, review: ShieldAlert, done: CheckCircle2 };

export function MetricStrip({
  activeMetricKey,
  metrics,
  onMetricSelect
}: {
  activeMetricKey: Metric["metricKey"];
  metrics: Metric[];
  onMetricSelect(metricKey: Metric["metricKey"]): void;
}) {
  return <section className="metric-strip">{metrics.map((metric) => { const Icon = metricIcons[metric.icon]; const isActive = activeMetricKey === metric.metricKey; return <button aria-pressed={isActive} className={isActive ? `metric-card metric-${metric.tone} metric-card-active` : `metric-card metric-${metric.tone}`} key={metric.label} onClick={() => onMetricSelect(metric.metricKey)} type="button"><div className="metric-icon"><Icon size={20} /></div><div><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></div></button>; })}</section>;
}

function getDutySourceLabel(dutySource: ActiveUserSummary["dutySource"]) {
  if (dutySource === "custom") return "Custom duties";
  if (dutySource === "role_default") return "Role defaults";
  return "No duties";
}

export function StaffDutyStrip({ staff }: { staff: ActiveUserSummary[] }) {
  if (!staff.length) {
    return null;
  }

  return (
    <section className="operations-strip operations-strip-single">
      <article className="staff-duty-panel">
        <header>
          <span><UsersRound size={16} /> Staff and duties</span>
          <small>{staff.length} active staff</small>
        </header>
        <div className="staff-duty-grid">
          {staff.map((person) => (
            <div className="staff-duty-card" key={person.id}>
              <span className="mini-avatar">{person.name[0]}</span>
              <div className="staff-duty-copy">
                <p className="staff-duty-name">{person.name}</p>
                <strong>{person.roles.join(" / ") || "No role"}</strong>
                <p className="staff-duty-preview">
                  {person.dutyPreview.slice(0, 2).join(" • ") || "No duties assigned"}
                </p>
                <p className="staff-duty-meta">
                  {getDutySourceLabel(person.dutySource)}
                  {person.dutyCount > 2 ? ` • +${person.dutyCount - 2} more` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

export function OperationsStrip({
  activeAssigneeId,
  boardDate,
  onAssigneeSelect,
  tasks
}: {
  activeAssigneeId: string;
  boardDate: string;
  onAssigneeSelect(assigneeId: string): void;
  tasks: Task[];
}) {
  const people = new Map<string, { count: number; id: string }>();
  for (const task of tasks) {
    const owner = task.assignedUser?.name ?? "Unassigned";
    const ownerId = task.assignedUser?.id ?? "unassigned";
    const currentOwner = people.get(owner);
    people.set(owner, {
      count: (currentOwner?.count ?? 0) + 1,
      id: currentOwner?.id ?? ownerId
    });
  }
  const team = [...people.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 4);
  const referenced = tasks.filter((task) => task.customerReference || task.vehicleReference).length;
  const projects = listProjectCardSummaries(tasks);
  const activeProjects = projects.filter(({ tasks: projectTasks }) => projectTasks.length > 0).length;
  const blockedProjects = projects.filter(({ stats }) => stats.blocked > 0).length;
  const reviewProjects = projects.filter(({ stats }) => stats.readyForReview > 0).length;
  return <section className="operations-strip">
    <article><header><span><UsersRound size={16} /> Team load</span><small>{people.size} owners</small></header><div className="team-load">{team.map(([name, owner]) => {
      const href = `/tasks?date=${encodeURIComponent(boardDate)}&owner=${encodeURIComponent(owner.id)}&queue=ALL`;
      return <Link aria-current={activeAssigneeId === owner.id ? "true" : undefined} className={activeAssigneeId === owner.id ? "team-load-chip team-load-chip-active" : "team-load-chip"} href={href} key={name} onClick={() => onAssigneeSelect(owner.id)}><span className="mini-avatar">{name[0]}</span><span>{name.split(" ")[0]}<strong>{owner.count}</strong></span></Link>;
    })}</div></article>
    <article className="projects-entry-panel"><header><span><Layers3 size={16} /> Projects</span><small>Open the project hub</small></header><div className="projects-entry-copy"><strong>{activeProjects} active project areas today</strong><p>Keep the board clean here, then open the Projects hub to choose Inventory, Shop, Advertising, Sales, Administration, Documentation, or Collections.</p></div><dl className="projects-entry-metrics"><div><dt>Active areas</dt><dd>{activeProjects}</dd></div><div><dt>Blocked</dt><dd>{blockedProjects}</dd></div><div><dt>Review</dt><dd>{reviewProjects}</dd></div></dl><Link className="pill pill-secondary projects-entry-action" href="/projects">Open Projects Hub</Link></article>
    <article><header><span><CalendarDays size={16} /> Customer / vehicle context</span><small>Visibility</small></header><div className="context-count"><strong>{referenced}</strong><span>tasks include a customer or vehicle reference</span></div></article>
  </section>;
}

const groupingOptions: Array<{ value: BoardGroupMode; label: string }> = [{ value: "assignee", label: "My Work" }, { value: "status", label: "Status" }, { value: "workflowArea", label: "Workflow" }];

export function BoardControls({ board, filters, groupMode, presentation, onFilterChange, onGroupChange, onClear }: {
  board: BoardReadModel; filters: BoardFilters; groupMode: BoardGroupMode; presentation: BoardPresentation;
  onFilterChange<Key extends keyof BoardFilters>(key: Key, value: BoardFilters[Key]): void; onGroupChange(value: BoardGroupMode): void; onClear(): void;
}) {
  const tabs = [{ value: "", label: `All (${board.taskCount})` }, { value: "IN_PROGRESS", label: `In Progress (${board.statusCounts.IN_PROGRESS ?? 0})` }, { value: "BLOCKED", label: `Stuck (${board.statusCounts.BLOCKED ?? 0})` }, { value: "READY_FOR_REVIEW", label: `Manager Review (${board.statusCounts.READY_FOR_REVIEW ?? 0})` }, { value: "COMPLETED", label: `Completed (${board.statusCounts.COMPLETED ?? 0})` }];
  return <section className="board-controls">
    <div className="board-tabs">{tabs.map((tab) => {
      const toneClass = tab.value === ""
        ? "board-tab-purple"
        : tab.value === "IN_PROGRESS"
          ? "board-tab-orange"
          : tab.value === "BLOCKED"
            ? "board-tab-red"
            : tab.value === "READY_FOR_REVIEW"
              ? "board-tab-yellow"
              : "board-tab-green";
      return <button className={filters.status === tab.value ? `board-tab ${toneClass} active` : `board-tab ${toneClass}`} key={tab.value || "all"} onClick={() => onFilterChange("status", tab.value)} type="button">{tab.label}</button>;
    })}</div>
    <div className="filter-row">
      <select aria-label="Group board" value={groupMode} onChange={(event) => onGroupChange(event.target.value as BoardGroupMode)}>{groupingOptions.map((option) => <option key={option.value} value={option.value}>Group: {option.label}</option>)}</select>
      <select aria-label="Filter workflow" value={filters.workflowArea} onChange={(event) => onFilterChange("workflowArea", event.target.value)}><option value="">All workflows</option>{presentation.filterOptions.workflowAreas.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      <select aria-label="Filter status" value={filters.status} onChange={(event) => onFilterChange("status", event.target.value)}><option value="">All statuses</option>{presentation.filterOptions.statuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      <select aria-label="Filter assignee" value={filters.assigneeId} onChange={(event) => onFilterChange("assigneeId", event.target.value)}><option value="">All assignees</option>{presentation.filterOptions.assignees.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      <label className="board-search"><Search size={17} /><input aria-label="Search board" placeholder="Search tasks, vehicles, customers…" type="search" value={filters.searchText} onChange={(event) => onFilterChange("searchText", event.target.value)} /></label>
      <button className="clear-filter" disabled={!filters.status && !filters.workflowArea && !filters.assigneeId && !filters.searchText} onClick={onClear} type="button">Clear</button>
    </div>
  </section>;
}

function TaskCard({ task, readOnly = false }: { task: Task; readOnly?: boolean }) {
  const taskUrgency = urgency(task);
  const recommendationSummary = getRecommendationSummary(task);
  return <article className="mobile-task-card"><header><div><strong>{task.title}</strong><span>{task.vehicleReference || task.customerReference || formatBoardEnumLabel(task.workflowArea)}</span></div><span className={statusClass(task.status)}>{formatBoardEnumLabel(task.status)}</span></header><dl><div><dt>Assigned</dt><dd>{task.assignedUser?.name ?? "Unassigned"}</dd></div><div><dt>Due</dt><dd>{formatTime(task.dueAt)} · {timeLeft(task.dueAt)}</dd></div><div><dt>Urgency</dt><dd className={taskUrgency.className}>{taskUrgency.label}</dd></div></dl>{recommendationSummary ? <p className="blocker-inline"><CircleUserRound size={15} /> {recommendationSummary}</p> : null}{task.blockerReason ? <p className="blocker-inline"><AlertCircle size={15} /> {task.blockerReason}</p> : null}<Link className="row-action" href={`/tasks/${task.id}`}>{readOnly ? "View work record" : task.status === "READY_FOR_REVIEW" ? "Review" : "Update"}</Link></article>;
}

export function TaskBoard({
  boardDate,
  generationStatus,
  latestGeneration,
  isFiltered,
  isManager,
  presentation,
  taskCount,
  readOnly = false
}: {
  readOnly?: boolean;
  boardDate: string;
  generationStatus: string;
  latestGeneration: BoardReadModel["latestGeneration"];
  isFiltered: boolean;
  isManager: boolean;
  presentation: BoardPresentation;
  taskCount: number;
}) {
  if (!presentation.filteredTasks.length) {
    if (taskCount === 0) {
      return (
        <section className="task-board empty-board">
          <EmptyStateCard
            eyebrow="Board empty"
            message={
              readOnly ? "No task work is recorded for this date. Team activity and workbook focuses appear above." : generationStatus === "FAILED"
                ? isManager
                  ? `Generation did not finish cleanly for this board. ${latestGeneration?.errorMessage ?? "Review the generation status above and retry the board to rebuild today's plan."}`
                  : "Generation did not finish cleanly for this board yet. A manager can retry it to rebuild today's plan."
                : isManager
                  ? "This board exists, but no tasks have been created for it yet. Generate the board again or add a manual task to get the day moving."
                  : "This board exists, but no work has been added yet. A manager can generate the board or create the first task."
            }
            title={`No tasks on ${formatBoardDate(boardDate, true)}`}
          />
        </section>
      );
    }

    return (
      <section className="task-board empty-board">
        <EmptyStateCard
          eyebrow="Filters applied"
          message={
            isFiltered
              ? "No tasks match the current filters. Clear or widen the filters to bring work back into view."
              : "No tasks are visible in this view right now."
          }
          title="No tasks match this view"
        />
      </section>
    );
  }

  return <section className="task-board" id="live-board"><header className="task-board-header"><div><span>Live Board</span><h2>{formatBoardDate(boardDate, true)}</h2></div><small>{presentation.filteredTasks.length} tasks visible</small></header>
    <div className="desktop-task-table"><table><thead><tr><th>Item / Details</th><th>Workflow / Type</th><th>Assigned To</th><th>Status</th><th>Due / Time Left</th><th>Urgency</th><th>{readOnly ? "Work record" : "Next Action"}</th></tr></thead>{presentation.groups.map((group) => <tbody key={group.key}><tr className="table-group-row"><td colSpan={7}>{group.label}<span>{group.taskCount}</span></td></tr>{group.tasks.map((task) => { const taskUrgency = urgency(task); const recommendationSummary = getRecommendationSummary(task); return <tr key={task.id} className="task-row"><td><strong>{task.title}</strong><span>{task.vehicleReference || task.customerReference || task.description || "No reference"}</span>{task.vehicleReference && task.customerReference ? <small>Customer: {task.customerReference}</small> : null}</td><td><span className="workflow-chip">{formatBoardEnumLabel(task.workflowArea)}</span><small>{formatBoardEnumLabel(task.sourceType)}</small></td><td><span className="assignee"><span className="mini-avatar">{task.assignedUser?.name[0] ?? "?"}</span>{task.assignedUser?.name ?? "Unassigned"}</span>{recommendationSummary ? <small>{recommendationSummary}</small> : null}</td><td><span className={statusClass(task.status)}>{formatBoardEnumLabel(task.status)}</span></td><td><strong>{formatTime(task.dueAt)}</strong><small>{timeLeft(task.dueAt)}</small></td><td><span className={taskUrgency.className}>↑ {taskUrgency.label}</span></td><td><Link className="row-action" href={`/tasks/${task.id}`}>{readOnly ? "View details" : task.status === "READY_FOR_REVIEW" ? "Review" : task.status === "BLOCKED" ? "Resolve" : "Update"}</Link></td></tr>; })}</tbody>)}</table></div>
    <div className="mobile-task-list">{presentation.groups.map((group) => <section key={group.key}><h3>{group.label}<span>{group.taskCount}</span></h3>{group.tasks.map((task) => <TaskCard key={task.id} task={task} readOnly={readOnly} />)}</section>)}</div>
    <footer className="task-board-footer"><span>Showing {presentation.filteredTasks.length} of {presentation.filteredTasks.length} items</span><div><button disabled type="button">‹</button><button className="active" type="button">1</button><button disabled type="button">›</button></div></footer>
  </section>;
}

function count(tasks: Task[], status: string) { return tasks.filter((task) => task.status === status).length; }

function formatActivityTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function OperationalRail({
  activeAttentionStatus,
  boardDate,
  isManager,
  onAttentionSelect,
  recentActivity,
  tasks
  }: {
    activeAttentionStatus: string;
    boardDate: string;
    isManager: boolean;
  onAttentionSelect(status: string): void;
  recentActivity: ActivityFeedEvent[];
  tasks: Task[];
}) {
  const attention = [{ label: "Blocked", detail: "Tasks are blocked", status: "BLOCKED", tone: "red" }, { label: "Waiting on Parts", detail: "Work waiting on parts", status: "WAITING_ON_PARTS", tone: "orange" }, { label: "Waiting on Approval", detail: "Awaiting manager approval", status: "WAITING_ON_APPROVAL", tone: "amber" }, { label: "Ready for Review", detail: "Ready for manager review", status: "READY_FOR_REVIEW", tone: "purple" }];
  const upcoming = [...tasks].filter((task) => task.status !== "COMPLETED").sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt)).slice(0, 4);
  const createManagerQueueHref = (status: string) =>
    `/manager-review?date=${encodeURIComponent(boardDate)}&focus=${encodeURIComponent(status)}`;
  return <aside className="operations-rail">
    <section className="rail-card"><header><h2>Needs Attention</h2><button className="rail-header-action" onClick={() => onAttentionSelect("")} type="button">View all</button></header><div className="attention-list">{attention.map((item) => <div className={activeAttentionStatus === item.status ? `attention-row-shell attention-${item.tone} attention-row-active` : `attention-row-shell attention-${item.tone}`} key={item.status}><button aria-pressed={activeAttentionStatus === item.status} className="attention-row" onClick={() => onAttentionSelect(item.status)} type="button"><span className="attention-dot">!</span><div><strong>{item.label}</strong><small>{item.detail}</small></div><b>{count(tasks, item.status)}</b></button>{isManager ? <Link className="attention-row-link" href={createManagerQueueHref(item.status)}>Open queue</Link> : null}</div>)}</div></section>
    <section className="rail-card"><header><h2>Due Next</h2><span>Today</span></header><div className="due-list">{upcoming.length ? upcoming.map((task) => <Link href={`/tasks/${task.id}`} key={task.id}><time>{formatTime(task.dueAt)}</time><span><strong>{task.title}</strong><small>{task.assignedUser?.name ?? "Unassigned"}</small></span></Link>) : <p className="rail-empty">No upcoming work.</p>}</div></section>
    <section className="rail-card"><header><h2>Today&apos;s Activity</h2><span>Live feed</span></header>{recentActivity.length ? <div className="due-list">{recentActivity.slice(0, 5).map((event) => <Link href={event.task ? `/tasks/${event.task.id}` : "/activity"} key={event.id}><time>{formatActivityTimestamp(event.createdAt)}</time><span><strong>{event.message}</strong><small>{event.actor?.name ?? "System"}</small></span></Link>)}</div> : <div className="activity-placeholder"><Clock3 size={20} /><strong>No activity yet</strong><p>Generation, status changes, and task updates will start appearing here as the day moves.</p></div>}<Link className="rail-footer-link" href="/activity">Open activity view <ChevronRight size={15} /></Link></section>
  </aside>;
}
