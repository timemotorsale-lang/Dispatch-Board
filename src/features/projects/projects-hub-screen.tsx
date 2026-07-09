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

import { EmptyStateCard } from "@/components/ui/state-card";
import type { ActivityFeedEvent } from "@/server/services/activity-feed";

import type { ProjectCardSummary, ProjectTaskLike } from "./project-data";

type ProjectsHubScreenProps = {
  activityEvents: ActivityFeedEvent[];
  boardDate: string;
  currentUserId: string;
  currentUserName: string;
  projectCards: ProjectCardSummary[];
  rawFilter?: string;
  rawFocus?: string;
  rawQuery?: string;
  rawView?: string;
  showFiltersTray?: boolean;
  tasks: ProjectTaskLike[];
};

type ProjectsHubView = "card" | "list" | "health";
type ProjectsHubFilter = "all" | "attention" | "mine" | "healthy";
type ProjectsHubFocus =
  | "all"
  | "open"
  | "overdue"
  | "due"
  | "blocked"
  | "review"
  | "activity"
  | "health";

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
};

type AttentionItemWithScore = AttentionItem & {
  score: number;
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

function resolveProjectsHubView(rawValue: string | undefined): ProjectsHubView {
  return rawValue === "list" || rawValue === "health" ? rawValue : "card";
}

function resolveProjectsHubFilter(rawValue: string | undefined): ProjectsHubFilter {
  return rawValue === "attention" || rawValue === "mine" || rawValue === "healthy" ? rawValue : "all";
}

function resolveProjectsHubFocus(rawValue: string | undefined): ProjectsHubFocus {
  return rawValue === "open" ||
    rawValue === "overdue" ||
    rawValue === "due" ||
    rawValue === "blocked" ||
    rawValue === "review" ||
    rawValue === "activity" ||
    rawValue === "health"
    ? rawValue
    : "all";
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

function getDueTodayCount(summary: ProjectCardSummary, boardDate: string) {
  return summary.tasks.filter((task) => isTaskDueOnBoardDate(task, boardDate)).length;
}

function getProjectActivityCount(summary: ProjectCardSummary, activityEvents: ActivityFeedEvent[]) {
  const taskIds = new Set(summary.tasks.map((task) => task.id));

  return activityEvents.filter((event) => event.task && taskIds.has(event.task.id)).length;
}

function matchesProjectQuery(summary: ProjectCardSummary, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    summary.project.name,
    summary.project.shortName,
    summary.project.description,
    summary.owner,
    ...summary.tasks.flatMap((task) => [
      task.title,
      task.description,
      task.customerReference,
      task.vehicleReference
    ])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function matchesProjectFilter(
  summary: ProjectCardSummary,
  filter: ProjectsHubFilter,
  currentUserId: string
) {
  if (filter === "attention") {
    return Boolean(summary.stats.blocked || summary.stats.overdue || summary.stats.readyForReview);
  }

  if (filter === "mine") {
    return summary.tasks.some((task) => task.assignedUser?.id === currentUserId);
  }

  if (filter === "healthy") {
    return summary.health.tone === "good";
  }

  return true;
}

function matchesProjectFocus(
  summary: ProjectCardSummary,
  focus: ProjectsHubFocus,
  boardDate: string,
  activityEvents: ActivityFeedEvent[]
) {
  if (focus === "open") {
    return summary.stats.active > 0;
  }

  if (focus === "overdue") {
    return summary.stats.overdue > 0;
  }

  if (focus === "due") {
    return getDueTodayCount(summary, boardDate) > 0;
  }

  if (focus === "blocked") {
    return summary.stats.blocked > 0;
  }

  if (focus === "review") {
    return summary.stats.readyForReview > 0;
  }

  if (focus === "activity") {
    return getProjectActivityCount(summary, activityEvents) > 0;
  }

  if (focus === "health") {
    return summary.health.tone !== "good";
  }

  return true;
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
        score,
        tone
      };
    })
    .filter((item): item is AttentionItemWithScore => Boolean(item))
    .sort((left, right) => right.score - left.score)
    .map((item) => ({
      href: item.href,
      indicator: item.indicator,
      title: item.title,
      tone: item.tone
    }))
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

function buildProjectsHubHref({
  filter = "all",
  filtersOpen = false,
  focus = "all",
  query = "",
  view = "card"
}: {
  filter?: ProjectsHubFilter;
  filtersOpen?: boolean;
  focus?: ProjectsHubFocus;
  query?: string;
  view?: ProjectsHubView;
}) {
  const params = new URLSearchParams();

  if (view !== "card") {
    params.set("view", view);
  }

  if (filter !== "all") {
    params.set("filter", filter);
  }

  if (focus !== "all") {
    params.set("focus", focus);
  }

  if (query.trim()) {
    params.set("query", query.trim());
  }

  if (filtersOpen) {
    params.set("filters", "open");
  }

  const search = params.toString();

  return search ? `/projects?${search}` : "/projects";
}

export function ProjectsHubScreen({
  activityEvents,
  boardDate,
  currentUserId,
  currentUserName,
  projectCards,
  rawFilter,
  rawFocus,
  rawQuery,
  rawView,
  showFiltersTray = false,
  tasks
}: ProjectsHubScreenProps) {
  const selectedView = resolveProjectsHubView(rawView);
  const selectedFilter = resolveProjectsHubFilter(rawFilter);
  const selectedFocus = resolveProjectsHubFocus(rawFocus);
  const selectedQuery = rawQuery?.trim().toLowerCase() ?? "";
  const hubMetrics = getHubMetrics(tasks, boardDate, activityEvents, projectCards);
  const filteredProjectCards = projectCards
    .filter((summary) => matchesProjectQuery(summary, selectedQuery))
    .filter((summary) => matchesProjectFilter(summary, selectedFilter, currentUserId))
    .filter((summary) => matchesProjectFocus(summary, selectedFocus, boardDate, activityEvents))
    .sort((left, right) => {
      if (selectedView === "health" || selectedFocus === "health") {
        return left.health.score - right.health.score;
      }

      if (selectedFocus === "activity") {
        return getProjectActivityCount(right, activityEvents) - getProjectActivityCount(left, activityEvents);
      }

      if (selectedFocus === "overdue") {
        return right.stats.overdue - left.stats.overdue;
      }

      if (selectedFocus === "blocked") {
        return right.stats.blocked - left.stats.blocked;
      }

      if (selectedFocus === "review") {
        return right.stats.readyForReview - left.stats.readyForReview;
      }

      if (selectedFocus === "due") {
        return getDueTodayCount(right, boardDate) - getDueTodayCount(left, boardDate);
      }

      return left.project.name.localeCompare(right.project.name);
    });
  const attentionItems = getAttentionItems(filteredProjectCards.length ? filteredProjectCards : projectCards);
  const myTasks = getUserTasks(tasks, currentUserId, boardDate);
  const queueTasks = getProjectQueue(tasks);
  const healthSnapshot = [...filteredProjectCards]
    .sort((left, right) => left.health.score - right.health.score)
    .slice(0, 4);
  const visibleProjectCards =
    selectedView === "card" ? filteredProjectCards.slice(0, 8) : filteredProjectCards;
  const hiddenProjectCount = Math.max(0, filteredProjectCards.length - visibleProjectCards.length);
  const compactActivity = activityEvents.slice(0, 5);
  const aggregateAttention = {
    overdue: tasks.filter(isTaskOverdue).length,
    blocked: tasks.filter((task) => task.status === "BLOCKED").length,
    review: tasks.filter((task) => task.status === "READY_FOR_REVIEW").length
  };
  const primaryWorkspaceHref =
    visibleProjectCards[0]
      ? `/projects/${visibleProjectCards[0].project.slug}?view=overview`
      : "/projects/inventory-management?view=overview";

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
              <form action="/projects" className="projects-hub-search-shell">
                {selectedView !== "card" ? <input name="view" type="hidden" value={selectedView} /> : null}
                {selectedFilter !== "all" ? <input name="filter" type="hidden" value={selectedFilter} /> : null}
                {selectedFocus !== "all" ? <input name="focus" type="hidden" value={selectedFocus} /> : null}
                {showFiltersTray ? <input name="filters" type="hidden" value="open" /> : null}
                <button aria-label="Search projects hub" className="projects-hub-search-submit" type="submit">
                  <Search size={16} />
                </button>
                <input
                  aria-label="Search projects hub"
                  className="projects-hub-search-input"
                  defaultValue={rawQuery ?? ""}
                  name="query"
                  placeholder="Search projects, tasks, vehicles, customers..."
                  type="search"
                />
              </form>
              <Link className="pill pill-primary" href={primaryWorkspaceHref}>
                Open Workspace
              </Link>
            </div>
            <div className="board-toolbar-actions projects-hub-toolbar-actions">
              <Link className="pill pill-secondary" href={`/board?date=${encodeURIComponent(boardDate)}`}>
                Generate Today&apos;s Board
              </Link>
              <Link
                className="pill pill-secondary projects-hub-filter-pill"
                href={buildProjectsHubHref({
                  filter: selectedFilter,
                  filtersOpen: !showFiltersTray,
                  focus: selectedFocus,
                  query: rawQuery ?? "",
                  view: selectedView
                })}
              >
                <ListFilter size={14} />
                Filters
              </Link>
              <span className="board-page-date-pill projects-hub-date-pill">
                <CalendarDays size={15} />
                {formatBoardDate(boardDate)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {showFiltersTray || selectedFilter !== "all" || selectedFocus !== "all" || Boolean(selectedQuery) ? (
        <section className="projects-hub-filter-tray">
          <div className="projects-hub-filter-group">
            <span>Filter projects</span>
            <div className="projects-hub-filter-chips">
              {([
                ["all", "All projects"],
                ["attention", "Needs attention"],
                ["mine", "My assignments"],
                ["healthy", "Healthy only"]
              ] as const).map(([filterValue, label]) => (
                <Link
                  className={
                    selectedFilter === filterValue
                      ? "projects-hub-filter-chip projects-hub-filter-chip-active"
                      : "projects-hub-filter-chip"
                  }
                  href={buildProjectsHubHref({
                    filter: filterValue,
                    filtersOpen: showFiltersTray,
                    focus: selectedFocus,
                    query: rawQuery ?? "",
                    view: selectedView
                  })}
                  key={filterValue}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="projects-hub-filter-group">
            <span>Quick focus</span>
            <div className="projects-hub-filter-chips">
              {([
                ["all", "Everything"],
                ["open", "Open work"],
                ["overdue", "Overdue"],
                ["due", "Due today"],
                ["blocked", "Blocked"],
                ["review", "Review"],
                ["activity", "Activity"],
                ["health", "Health"]
              ] as const).map(([focusValue, label]) => (
                <Link
                  className={
                    selectedFocus === focusValue
                      ? "projects-hub-filter-chip projects-hub-filter-chip-active"
                      : "projects-hub-filter-chip"
                  }
                  href={buildProjectsHubHref({
                    filter: selectedFilter,
                    filtersOpen: showFiltersTray,
                    focus: focusValue,
                    query: rawQuery ?? "",
                    view: selectedView
                  })}
                  key={focusValue}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="projects-hub-filter-summary">
            <strong>{filteredProjectCards.length} project areas visible</strong>
            <span>
              {selectedQuery ? `Search: "${rawQuery?.trim()}"` : "No search filter"} | View: {selectedView}
            </span>
            {(selectedFilter !== "all" || selectedFocus !== "all" || Boolean(selectedQuery)) ? (
              <Link className="projects-hub-filter-reset" href="/projects">
                Clear filters
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="projects-hub-kpi-strip" aria-label="Project hub metrics">
        {hubMetrics.map((metric) => {
          const Icon = metric.icon;
          const metricFocus: ProjectsHubFocus =
            metric.label === "Open tasks"
              ? "open"
              : metric.label === "Overdue"
                ? "overdue"
                : metric.label === "Due today"
                  ? "due"
                  : metric.label === "Blocked"
                    ? "blocked"
                    : metric.label === "Ready for review"
                      ? "review"
                      : metric.label === "Activity today"
                        ? "activity"
                        : "health";
          const isMetricActive =
            (metricFocus === "health" && selectedView === "health") || selectedFocus === metricFocus;
          const metricHref = buildProjectsHubHref({
            filter: metricFocus === "health" ? selectedFilter : metricFocus === "overdue" || metricFocus === "blocked" ? "attention" : selectedFilter,
            filtersOpen: showFiltersTray,
            focus: metricFocus,
            query: rawQuery ?? "",
            view: metricFocus === "health" ? "health" : "card"
          });

          return (
            <Link
              className={`projects-hub-kpi-card projects-hub-kpi-card-${metric.tone}${isMetricActive ? " projects-hub-kpi-card-active" : ""}`}
              href={metricHref}
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
            </Link>
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
              <Link
                className={
                  selectedView === "card"
                    ? "projects-hub-view-pill projects-hub-view-pill-active"
                    : "projects-hub-view-pill"
                }
                href={buildProjectsHubHref({
                  filter: selectedFilter,
                  filtersOpen: showFiltersTray,
                  focus: selectedFocus,
                  query: rawQuery ?? "",
                  view: "card"
                })}
              >
                <LayoutGrid size={13} />
                Card
              </Link>
              <Link
                className={
                  selectedView === "list"
                    ? "projects-hub-view-pill projects-hub-view-pill-active"
                    : "projects-hub-view-pill"
                }
                href={buildProjectsHubHref({
                  filter: selectedFilter,
                  filtersOpen: showFiltersTray,
                  focus: selectedFocus,
                  query: rawQuery ?? "",
                  view: "list"
                })}
              >
                <ListFilter size={13} />
                List
              </Link>
              <Link
                className={
                  selectedView === "health"
                    ? "projects-hub-view-pill projects-hub-view-pill-active"
                    : "projects-hub-view-pill"
                }
                href={buildProjectsHubHref({
                  filter: selectedFilter,
                  filtersOpen: showFiltersTray,
                  focus: selectedFocus,
                  query: rawQuery ?? "",
                  view: "health"
                })}
              >
                <ShieldCheck size={13} />
                Health
              </Link>
            </div>
          </div>

          {filteredProjectCards.length ? null : (
            <EmptyStateCard
              actions={[
                {
                  href: "/projects",
                  label: "Clear filters",
                  tone: "secondary"
                }
              ]}
              eyebrow="No matching projects"
              message="Try clearing the current search or filter combination to bring more project areas back into view."
              title="Nothing matches this hub view yet"
            />
          )}

          {selectedView === "card" && filteredProjectCards.length ? (
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
                      <Link
                        aria-label={`Open ${summary.project.name} overview`}
                        className="projects-hub-card-menu"
                        href={`/projects/${summary.project.slug}?view=overview`}
                      >
                        <MoreHorizontal size={14} />
                      </Link>
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
                        <dd>{getDueTodayCount(summary, boardDate)}</dd>
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
          ) : null}
          {selectedView === "list" && filteredProjectCards.length ? (
            <section className="project-table-card projects-hub-list-card">
              <table className="project-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Lead</th>
                    <th>Health</th>
                    <th>Open</th>
                    <th>Due today</th>
                    <th>Overdue</th>
                    <th>Blocked</th>
                    <th>Review</th>
                    <th>Open</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProjectCards.map((summary) => (
                    <tr key={summary.project.slug}>
                      <td>
                        <strong>{summary.project.name}</strong>
                      </td>
                      <td>{summary.owner ?? "Unassigned"}</td>
                      <td>{summary.health.score}%</td>
                      <td>{summary.stats.active}</td>
                      <td>{getDueTodayCount(summary, boardDate)}</td>
                      <td>{summary.stats.overdue}</td>
                      <td>{summary.stats.blocked}</td>
                      <td>{summary.stats.readyForReview}</td>
                      <td>
                        <Link className="row-action" href={`/projects/${summary.project.slug}?view=overview`}>
                          Workspace
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
          {selectedView === "health" && filteredProjectCards.length ? (
            <section className="projects-hub-health-grid">
              {visibleProjectCards.map((summary) => {
                const Icon = summary.project.icon;

                return (
                  <Link
                    className={`projects-hub-health-card projects-hub-health-card-${summary.health.tone}`}
                    href={`/projects/${summary.project.slug}?view=overview`}
                    key={summary.project.slug}
                  >
                    <div className="projects-hub-health-card-top">
                      <span className={`projects-hub-card-icon projects-hub-card-icon-${summary.project.accent}`}>
                        <Icon size={18} />
                      </span>
                      <div>
                        <strong>{summary.project.name}</strong>
                        <p>{summary.health.reason}</p>
                      </div>
                      <small>{summary.health.score}%</small>
                    </div>
                    <div className="projects-hub-health-bar-track">
                      <span
                        className={`projects-hub-health-bar-fill projects-hub-health-bar-fill-${summary.health.tone}`}
                        style={{ width: `${summary.health.score}%` }}
                      />
                    </div>
                    <dl className="projects-hub-health-card-metrics">
                      <div>
                        <dt>Open</dt>
                        <dd>{summary.stats.active}</dd>
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
                  </Link>
                );
              })}
            </section>
          ) : null}
          {selectedView === "card" && hiddenProjectCount ? (
            <div className="projects-hub-more-row">
              <Link
                className="projects-hub-more-link"
                href={buildProjectsHubHref({
                  filter: selectedFilter,
                  filtersOpen: showFiltersTray,
                  focus: selectedFocus,
                  query: rawQuery ?? "",
                  view: "list"
                })}
              >
                Show {hiddenProjectCount} more project{hiddenProjectCount === 1 ? "" : "s"} in list view
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
              {healthSnapshot.length ? (
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
              ) : (
                <p className="projects-hub-empty-copy">No project health rows match the current view.</p>
              )}
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
