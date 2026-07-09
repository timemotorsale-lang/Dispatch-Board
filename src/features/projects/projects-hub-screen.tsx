import type { CSSProperties } from "react";

import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  CircleSlash,
  Clock3,
  LayoutGrid,
  ListFilter,
  FolderKanban,
  MoreHorizontal,
  Search,
  ShieldCheck,
  TriangleAlert
} from "lucide-react";
import Link from "next/link";

import type { ActivityFeedEvent } from "@/server/services/activity-feed";

import type { ProjectCardSummary, ProjectTaskLike } from "./project-data";

type ProjectsHubScreenProps = {
  activityEvents: ActivityFeedEvent[];
  boardDate: string;
  currentUserId: string;
  currentUserName: string;
  projectCards: ProjectCardSummary[];
  tasks: ProjectTaskLike[];
};

type HubMetric = {
  label: string;
  value: string;
  detail: string;
  tone: "brand" | "danger" | "warning" | "blocked" | "review" | "success" | "health";
  icon: typeof FolderKanban;
};

type AttentionItem = {
  href: string;
  title: string;
  indicator: string;
  tone: "risk" | "watch" | "steady";
  count: number;
};

function formatCompactTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatBoardDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00Z`));
}

function getGreeting(name: string) {
  const firstName = name.split(" ")[0] ?? name;
  const hour = new Date().getHours();

  if (hour < 12) {
    return `Good morning, ${firstName}.`;
  }

  if (hour < 18) {
    return `Good afternoon, ${firstName}.`;
  }

  return `Good evening, ${firstName}.`;
}

function isTaskOpen(task: ProjectTaskLike) {
  return task.status !== "COMPLETED";
}

function isTaskOverdue(task: ProjectTaskLike) {
  return isTaskOpen(task) && new Date(task.dueAt).getTime() < Date.now();
}

function isTaskDueOnBoardDate(task: ProjectTaskLike, boardDate: string) {
  return isTaskOpen(task) && task.dueAt.slice(0, 10) === boardDate;
}

function getHubMetrics(
  tasks: ProjectTaskLike[],
  boardDate: string,
  activityEvents: ActivityFeedEvent[],
  projectCards: ProjectCardSummary[]
): HubMetric[] {
  const activeTasks = tasks.filter(isTaskOpen);
  const overdueTasks = tasks.filter(isTaskOverdue);
  const dueTodayTasks = tasks.filter((task) => isTaskDueOnBoardDate(task, boardDate));
  const blockedTasks = tasks.filter((task) => task.status === "BLOCKED");
  const reviewTasks = tasks.filter((task) => task.status === "READY_FOR_REVIEW");
  const averageHealth = projectCards.length
    ? Math.round(
        projectCards.reduce((total, summary) => total + summary.health.score, 0) / projectCards.length
      )
    : 100;

  return [
    {
      label: "Open tasks",
      value: String(activeTasks.length),
      detail: "Live work across all project areas",
      tone: "brand",
      icon: FolderKanban
    },
    {
      label: "Overdue",
      value: String(overdueTasks.length),
      detail: "Tasks that missed their target time",
      tone: "danger",
      icon: CircleSlash
    },
    {
      label: "Due today",
      value: String(dueTodayTasks.length),
      detail: "Open work scheduled for this board date",
      tone: "warning",
      icon: Clock3
    },
    {
      label: "Blocked",
      value: String(blockedTasks.length),
      detail: "Items waiting on intervention",
      tone: "blocked",
      icon: TriangleAlert
    },
    {
      label: "Ready for review",
      value: String(reviewTasks.length),
      detail: "Manager-visible handoff queue",
      tone: "review",
      icon: CheckCheck
    },
    {
      label: "Activity today",
      value: String(activityEvents.length),
      detail: "Events flowing from board and appointment work",
      tone: "success",
      icon: Activity
    },
    {
      label: "Project health",
      value: `${averageHealth}%`,
      detail: "Average score across visible project areas",
      tone: "health",
      icon: ShieldCheck
    }
  ];
}

function getAttentionItems(projectCards: ProjectCardSummary[]): AttentionItem[] {
  return projectCards
    .map((summary) => {
      const blocked = summary.stats.blocked;
      const overdue = summary.stats.overdue;
      const review = summary.stats.readyForReview;
      const score = blocked * 4 + overdue * 3 + review;

      if (!score) {
        return null;
      }

      const tone: AttentionItem["tone"] =
        blocked || overdue > 1 ? "risk" : review ? "watch" : "steady";
      const detailParts = [
        blocked ? `${blocked} blocked` : null,
        overdue ? `${overdue} overdue` : null,
        review ? `${review} review-ready` : null
      ].filter(Boolean);
      const indicator =
        overdue ? `${overdue} overdue` : blocked ? `${blocked} blocked` : `${review} review`;

      return {
        href: `/projects/${summary.project.slug}?view=overview`,
        title: summary.project.name,
        indicator: indicator || detailParts[0] || "Watching",
        tone,
        count: score
      } satisfies AttentionItem;
    })
    .filter((item): item is AttentionItem => Boolean(item))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);
}

function getUserTasks(tasks: ProjectTaskLike[], currentUserId: string, boardDate: string) {
  return tasks
    .filter(
      (task) =>
        task.assignedUser?.id === currentUserId &&
        isTaskOpen(task) &&
        isTaskDueOnBoardDate(task, boardDate)
    )
    .sort((left, right) => +new Date(left.dueAt) - +new Date(right.dueAt))
    .slice(0, 4);
}

function getProjectQueue(tasks: ProjectTaskLike[]) {
  return tasks
    .filter(isTaskOpen)
    .sort((left, right) => +new Date(left.dueAt) - +new Date(right.dueAt))
    .slice(0, 4);
}

function getHealthColor(tone: ProjectCardSummary["health"]["tone"]) {
  if (tone === "good") {
    return "#16a34a";
  }

  if (tone === "watch") {
    return "#f59e0b";
  }

  return "#ef4444";
}

function getPriorityLabel(summary: ProjectCardSummary) {
  if (summary.stats.blocked || summary.stats.overdue > 1) {
    return { label: "High priority", tone: "risk" as const };
  }

  if (summary.stats.readyForReview || summary.stats.waiting) {
    return { label: "Medium priority", tone: "watch" as const };
  }

  return { label: "Low friction", tone: "steady" as const };
}

function getProjectSubtitle(summary: ProjectCardSummary) {
  if (summary.owner) {
    return `Lead: ${summary.owner}`;
  }

  return "Lead not assigned yet";
}

function getRecentActivityTitle(event: ActivityFeedEvent) {
  if (event.task?.title) {
    return event.task.title;
  }

  if (event.appointment?.title) {
    return event.appointment.title;
  }

  return "Project activity";
}

function getAttentionIconTone(tone: AttentionItem["tone"]) {
  if (tone === "risk") {
    return TriangleAlert;
  }

  if (tone === "watch") {
    return Clock3;
  }

  return ShieldCheck;
}

export function ProjectsHubScreen({
  activityEvents,
  boardDate,
  currentUserId,
  currentUserName,
  projectCards,
  tasks
}: ProjectsHubScreenProps) {
  const hubMetrics = getHubMetrics(tasks, boardDate, activityEvents, projectCards);
  const attentionItems = getAttentionItems(projectCards);
  const myTasks = getUserTasks(tasks, currentUserId, boardDate);
  const queueTasks = getProjectQueue(tasks);
  const healthSnapshot = [...projectCards]
    .sort((left, right) => left.health.score - right.health.score)
    .slice(0, 4);
  const visibleProjectCards = projectCards.slice(0, 8);
  const hiddenProjectCount = Math.max(0, projectCards.length - visibleProjectCards.length);
  const compactActivity = activityEvents.slice(0, 5);
  const aggregateAttention = {
    overdue: tasks.filter(isTaskOverdue).length,
    blocked: tasks.filter((task) => task.status === "BLOCKED").length,
    review: tasks.filter((task) => task.status === "READY_FOR_REVIEW").length
  };

  return (
    <section className="page-stack dashboard-page board-page project-page projects-hub-page">
      <section className="board-page-header projects-hub-hero">
        <div className="dashboard-page-header">
          <div className="dashboard-page-copy projects-hub-copy">
            <span className="eyebrow">Projects hub</span>
            <h1>{getGreeting(currentUserName)}</h1>
            <p>Here&apos;s what&apos;s happening across the dealership today.</p>
          </div>

          <div className="board-toolbar projects-hub-toolbar">
            <div className="projects-hub-toolbar-top">
              <div className="projects-hub-search-shell" aria-label="Search shell">
                <Search size={16} />
                <span>Search projects, tasks, vehicles, customers...</span>
              </div>
              <Link className="pill pill-primary" href="/projects/inventory-management?view=overview">
                Open Workspace
              </Link>
            </div>
            <div className="board-toolbar-actions projects-hub-toolbar-actions">
              <Link className="pill pill-secondary" href={`/board?date=${encodeURIComponent(boardDate)}`}>
                Generate Today&apos;s Board
              </Link>
              <span className="pill pill-secondary projects-hub-filter-pill">
                <ListFilter size={14} />
                Filters
              </span>
              <span className="board-page-date-pill projects-hub-date-pill">
                <CalendarDays size={15} />
                {formatBoardDate(boardDate)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="projects-hub-kpi-strip" aria-label="Project hub metrics">
        {hubMetrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <article
              className={`projects-hub-kpi-card projects-hub-kpi-card-${metric.tone}`}
              key={metric.label}
            >
              <span className="projects-hub-kpi-icon">
                <Icon size={18} />
              </span>
              <div className="projects-hub-kpi-copy">
                <small>{metric.label}</small>
                <strong>{metric.value}</strong>
                <p>{metric.detail}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="projects-hub-main-grid">
        <div className="projects-hub-stage">
          <div className="projects-hub-section-heading">
            <div>
              <span>Projects</span>
              <h2>Project command center</h2>
            </div>
            <div className="projects-hub-view-pills" aria-label="View options">
              <span className="projects-hub-view-pill projects-hub-view-pill-active">
                <LayoutGrid size={13} />
                Card
              </span>
              <span className="projects-hub-view-pill">
                <ListFilter size={13} />
                List
              </span>
              <span className="projects-hub-view-pill">
                <ShieldCheck size={13} />
                Health
              </span>
            </div>
          </div>

          <section className="projects-hub-card-grid">
            {visibleProjectCards.map((summary) => {
              const Icon = summary.project.icon;
              const priority = getPriorityLabel(summary);
              const healthColor = getHealthColor(summary.health.tone);
              const ringStyle = {
                background: `conic-gradient(${healthColor} 0 ${summary.health.score}%, #e7edf5 ${summary.health.score}% 100%)`
              } satisfies CSSProperties;

              return (
                <article
                  className={`projects-hub-card projects-hub-card-${summary.project.accent}`}
                  key={summary.project.slug}
                >
                  <div className="projects-hub-card-top">
                    <div className="projects-hub-card-title">
                      <span className={`projects-hub-card-icon projects-hub-card-icon-${summary.project.accent}`}>
                        <Icon size={18} />
                      </span>
                      <div>
                        <strong>{summary.project.name}</strong>
                        <p>{getProjectSubtitle(summary)}</p>
                      </div>
                    </div>
                    <div className="projects-hub-card-actions">
                      <span className={`projects-hub-priority projects-hub-priority-${priority.tone}`}>
                        {priority.label}
                      </span>
                      <span className="projects-hub-card-menu">
                        <MoreHorizontal size={14} />
                      </span>
                    </div>
                  </div>

                  <div className="projects-hub-card-body">
                    <div className="projects-hub-health-ring">
                      <div className="projects-hub-health-ring-outer" style={ringStyle}>
                        <div className="projects-hub-health-ring-inner">
                          <strong>{summary.health.score}%</strong>
                          <span>{summary.health.label}</span>
                        </div>
                      </div>
                    </div>

                    <dl className="projects-hub-card-metric-list">
                      <div>
                        <dt>Open</dt>
                        <dd>{summary.stats.active}</dd>
                      </div>
                      <div>
                        <dt>Due today</dt>
                        <dd>{summary.tasks.filter((task) => isTaskDueOnBoardDate(task, boardDate)).length}</dd>
                      </div>
                      <div>
                        <dt>Overdue</dt>
                        <dd>{summary.stats.overdue}</dd>
                      </div>
                      <div>
                        <dt>Blocked</dt>
                        <dd>{summary.stats.blocked}</dd>
                      </div>
                      <div>
                        <dt>Review</dt>
                        <dd>{summary.stats.readyForReview}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="projects-hub-card-footer">
                    <Link
                      className={`projects-hub-card-action projects-hub-card-action-${summary.project.accent} projects-hub-card-action-full`}
                      href={`/projects/${summary.project.slug}?view=overview`}
                    >
                      Open Workspace
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
          {hiddenProjectCount ? (
            <div className="projects-hub-more-row">
              <Link className="projects-hub-more-link" href="/projects/management-review?view=overview">
                Show {hiddenProjectCount} more project{hiddenProjectCount === 1 ? "" : "s"}
                <ChevronRight size={14} />
              </Link>
            </div>
          ) : null}

          <section className="projects-hub-support-grid">
            <article className="projects-hub-support-card">
              <div className="projects-hub-support-heading">
                <div>
                  <span>My work</span>
                  <h2>Due today</h2>
                </div>
              </div>
              {myTasks.length ? (
                <>
                  <div className="projects-hub-support-list">
                    {myTasks.map((task) => (
                      <Link className="projects-hub-support-item" href={`/tasks/${task.id}`} key={task.id}>
                        <strong>{task.title}</strong>
                        <small>{formatCompactTime(task.dueAt)}</small>
                      </Link>
                    ))}
                  </div>
                  <Link className="projects-hub-support-footer-link" href="/my-tasks">
                    View all my tasks
                    <ChevronRight size={14} />
                  </Link>
                </>
              ) : (
                <p className="projects-hub-empty-copy">No open tasks assigned to you are due today.</p>
              )}
            </article>

            <article className="projects-hub-support-card">
              <div className="projects-hub-support-heading">
                <div>
                  <span>Today&apos;s calendar</span>
                  <h2>Upcoming due work</h2>
                </div>
                <Link className="projects-hub-support-link" href="/appointments">
                  View full calendar
                </Link>
              </div>
              {queueTasks.length ? (
                <div className="projects-hub-support-list">
                  {queueTasks.map((task) => (
                    <Link className="projects-hub-support-item" href={`/tasks/${task.id}`} key={task.id}>
                      <strong>{task.title}</strong>
                      <small>{formatCompactTime(task.dueAt)}</small>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="projects-hub-empty-copy">No open project-linked tasks are queued right now.</p>
              )}
            </article>

            <article className="projects-hub-support-card">
              <div className="projects-hub-support-heading">
                <div>
                  <span>Project health</span>
                  <h2>Current snapshot</h2>
                </div>
              </div>
              <div className="projects-hub-health-bars">
                {healthSnapshot.map((summary) => (
                  <Link
                    className="projects-hub-health-bar"
                    href={`/projects/${summary.project.slug}?view=overview`}
                    key={summary.project.slug}
                  >
                    <div className="projects-hub-health-bar-top">
                      <strong>{summary.project.shortName}</strong>
                      <small>{summary.health.score}%</small>
                    </div>
                    <div className="projects-hub-health-bar-track">
                      <span
                        className={`projects-hub-health-bar-fill projects-hub-health-bar-fill-${summary.health.tone}`}
                        style={{ width: `${summary.health.score}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </article>
          </section>
        </div>

        <aside className="projects-hub-rail">
          <section className="projects-hub-rail-card">
            <div className="projects-hub-rail-heading">
              <div>
                <span>Needs your attention</span>
                <h2>Focus next</h2>
              </div>
            </div>
            {attentionItems.length ? (
              <div className="projects-hub-attention-list">
                {attentionItems.map((item) => (
                  <Link
                    className={`projects-hub-attention-item projects-hub-attention-item-${item.tone}`}
                    href={item.href}
                    key={item.title}
                  >
                    <div className={`projects-hub-rail-icon projects-hub-rail-icon-${item.tone}`}>
                      {(() => {
                        const Icon = getAttentionIconTone(item.tone);
                        return <Icon size={15} />;
                      })()}
                    </div>
                    <strong className="projects-hub-attention-title">{item.title}</strong>
                    <span className="projects-hub-attention-indicator">{item.indicator}</span>
                    <span className="projects-hub-attention-arrow">
                      <ChevronRight size={14} />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="projects-hub-summary-list">
                <div><span>Overdue tasks</span><strong>{aggregateAttention.overdue}</strong></div>
                <div><span>Blocked tasks</span><strong>{aggregateAttention.blocked}</strong></div>
                <div><span>Ready for review</span><strong>{aggregateAttention.review}</strong></div>
                <div><span>Escalations</span><strong>{Math.max(0, aggregateAttention.blocked + aggregateAttention.overdue - 1)}</strong></div>
              </div>
            )}
          </section>

          <section className="projects-hub-rail-card">
            <div className="projects-hub-rail-heading">
              <div>
                <span>Recent activity</span>
                <h2>What changed</h2>
              </div>
            </div>
            {compactActivity.length ? (
              <div className="projects-hub-activity-list">
                {compactActivity.map((event) => (
                  <article className="projects-hub-activity-item" key={event.id}>
                    <div className="projects-hub-rail-icon projects-hub-rail-icon-activity">
                      <Activity size={15} />
                    </div>
                    <strong className="projects-hub-activity-title">{getRecentActivityTitle(event)}</strong>
                    <span className="projects-hub-activity-actor">{event.actor?.name ?? "System"}</span>
                    <small>{formatCompactTime(event.createdAt)}</small>
                  </article>
                ))}
              </div>
            ) : (
              <p className="projects-hub-empty-copy">Activity for this board date has not started yet.</p>
            )}
          </section>
        </aside>
      </section>
    </section>
  );
}
