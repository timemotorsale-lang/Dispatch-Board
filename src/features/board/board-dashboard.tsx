import type { ReactNode } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, ChevronRight, CircleUserRound, Layers3, Search, ShieldAlert, UsersRound } from "lucide-react";
import Link from "next/link";

import { formatBoardEnumLabel, type BoardFilters, type BoardGroupMode, type BoardPresentation } from "./board-grouping";
import type { BoardReadModel, BoardReadTask } from "@/server/services/board-read";
import { ActivityFeedPanel } from "@/features/activity/activity-feed-panel";

type Task = Omit<BoardReadTask, "assignedUser"> & { assignedUser: BoardReadTask["assignedUser"] | null };

export function formatBoardDate(boardDate: string, short = false) {
  return new Intl.DateTimeFormat("en-US", short ? { weekday: "short", month: "short", day: "numeric" } : { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${boardDate}T00:00:00.000Z`));
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

export function BoardHero({ boardDate, status, toolbar }: { boardDate: string; status?: string; toolbar: ReactNode }) {
  return (
    <section className="board-hero">
      <div><p className="section-kicker">Daily dispatch board</p><h1>{formatBoardDate(boardDate)}</h1><p>One board. Everyone in the loop.</p></div>
      <div className="board-hero-actions"><span className="operating-status"><span />{status === "GENERATED" ? "Board active" : "Board pending"}</span>{toolbar}</div>
    </section>
  );
}

export type Metric = { label: string; value: number; detail: string; tone: string; icon: "active" | "stuck" | "manager" | "review" | "done" };
const metricIcons = { active: Layers3, stuck: AlertCircle, manager: CircleUserRound, review: ShieldAlert, done: CheckCircle2 };

export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return <section className="metric-strip">{metrics.map((metric) => { const Icon = metricIcons[metric.icon]; return <article className={`metric-card metric-${metric.tone}`} key={metric.label}><div className="metric-icon"><Icon size={20} /></div><div><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></div></article>; })}</section>;
}

export function OperationsStrip({ tasks }: { tasks: Task[] }) {
  const people = new Map<string, number>();
  const workflow = new Map<string, number>();
  for (const task of tasks) {
    const owner = task.assignedUser?.name ?? "Unassigned";
    people.set(owner, (people.get(owner) ?? 0) + 1);
    workflow.set(task.workflowArea, (workflow.get(task.workflowArea) ?? 0) + 1);
  }
  const team = [...people.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const flow = [...workflow.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const referenced = tasks.filter((task) => task.customerReference || task.vehicleReference).length;
  return <section className="operations-strip">
    <article><header><span><UsersRound size={16} /> Team load</span><small>{people.size} owners</small></header><div className="team-load">{team.map(([name, count]) => <div key={name}><span className="mini-avatar">{name[0]}</span><span>{name.split(" ")[0]}<strong>{count}</strong></span></div>)}</div></article>
    <article><header><span><Layers3 size={16} /> Workflow flow</span><small>Current board</small></header><div className="flow-list">{flow.map(([name, count], index) => <div key={name}><span>{formatBoardEnumLabel(name)}</span><strong>{count}</strong>{index < flow.length - 1 ? <ChevronRight size={14} /> : null}</div>)}</div></article>
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
    <div className="board-tabs">{tabs.map((tab) => <button className={filters.status === tab.value ? "board-tab active" : "board-tab"} key={tab.value || "all"} onClick={() => onFilterChange("status", tab.value)} type="button">{tab.label}</button>)}</div>
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

function TaskCard({ task }: { task: Task }) {
  const taskUrgency = urgency(task);
  return <article className="mobile-task-card"><header><div><strong>{task.title}</strong><span>{task.vehicleReference || task.customerReference || formatBoardEnumLabel(task.workflowArea)}</span></div><span className={statusClass(task.status)}>{formatBoardEnumLabel(task.status)}</span></header><dl><div><dt>Assigned</dt><dd>{task.assignedUser?.name ?? "Unassigned"}</dd></div><div><dt>Due</dt><dd>{formatTime(task.dueAt)} · {timeLeft(task.dueAt)}</dd></div><div><dt>Urgency</dt><dd className={taskUrgency.className}>{taskUrgency.label}</dd></div></dl>{task.blockerReason ? <p className="blocker-inline"><AlertCircle size={15} /> {task.blockerReason}</p> : null}<Link className="row-action" href={`/tasks/${task.id}`}>{task.status === "READY_FOR_REVIEW" ? "Review" : "Update"}</Link></article>;
}

export function TaskBoard({ presentation, boardDate }: { presentation: BoardPresentation; boardDate: string }) {
  if (!presentation.filteredTasks.length) return <section className="task-board empty-board"><h2>No tasks match this view</h2><p>Adjust the filters to bring work back into view.</p></section>;
  return <section className="task-board"><header className="task-board-header"><div><span>Board tasks</span><h2>{formatBoardDate(boardDate, true)}</h2></div><small>{presentation.filteredTasks.length} tasks visible</small></header>
    <div className="desktop-task-table"><table><thead><tr><th>Item / Details</th><th>Workflow / Type</th><th>Assigned To</th><th>Status</th><th>Due / Time Left</th><th>Urgency</th><th>Next Action</th></tr></thead>{presentation.groups.map((group) => <tbody key={group.key}><tr className="table-group-row"><td colSpan={7}>{group.label}<span>{group.taskCount}</span></td></tr>{group.tasks.map((task) => { const taskUrgency = urgency(task); return <tr key={task.id} className="task-row"><td><strong>{task.title}</strong><span>{task.vehicleReference || task.customerReference || task.description || "No reference"}</span>{task.vehicleReference && task.customerReference ? <small>Customer: {task.customerReference}</small> : null}</td><td><span className="workflow-chip">{formatBoardEnumLabel(task.workflowArea)}</span><small>{formatBoardEnumLabel(task.sourceType)}</small></td><td><span className="assignee"><span className="mini-avatar">{task.assignedUser?.name[0] ?? "?"}</span>{task.assignedUser?.name ?? "Unassigned"}</span></td><td><span className={statusClass(task.status)}>{formatBoardEnumLabel(task.status)}</span></td><td><strong>{formatTime(task.dueAt)}</strong><small>{timeLeft(task.dueAt)}</small></td><td><span className={taskUrgency.className}>↑ {taskUrgency.label}</span></td><td><Link className="row-action" href={`/tasks/${task.id}`}>{task.status === "READY_FOR_REVIEW" ? "Review" : task.status === "BLOCKED" ? "Resolve" : "Update"}</Link></td></tr>; })}</tbody>)}</table></div>
    <div className="mobile-task-list">{presentation.groups.map((group) => <section key={group.key}><h3>{group.label}<span>{group.taskCount}</span></h3>{group.tasks.map((task) => <TaskCard key={task.id} task={task} />)}</section>)}</div>
    <footer className="task-board-footer"><span>Showing {presentation.filteredTasks.length} of {presentation.filteredTasks.length} items</span><div><button disabled type="button">‹</button><button className="active" type="button">1</button><button disabled type="button">›</button></div></footer>
  </section>;
}

function count(tasks: Task[], status: string) { return tasks.filter((task) => task.status === status).length; }

export function OperationalRail({ tasks, boardDate }: { tasks: Task[]; boardDate: string }) {
  const attention = [{ label: "Blocked", detail: "Tasks are blocked", status: "BLOCKED", tone: "red" }, { label: "Waiting on Parts", detail: "Work waiting on parts", status: "WAITING_ON_PARTS", tone: "orange" }, { label: "Waiting on Approval", detail: "Awaiting manager approval", status: "WAITING_ON_APPROVAL", tone: "amber" }, { label: "Ready for Review", detail: "Ready for manager review", status: "READY_FOR_REVIEW", tone: "purple" }];
  const upcoming = [...tasks].filter((task) => task.status !== "COMPLETED").sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt)).slice(0, 4);
  return <aside className="operations-rail">
    <section className="rail-card"><header><h2>Needs Attention</h2><Link href="/manager-review">View all</Link></header><div className="attention-list">{attention.map((item) => <div className={`attention-row attention-${item.tone}`} key={item.status}><span className="attention-dot">!</span><div><strong>{item.label}</strong><small>{item.detail}</small></div><b>{count(tasks, item.status)}</b></div>)}</div></section>
    <section className="rail-card"><header><h2>Due Next</h2><span>Today</span></header><div className="due-list">{upcoming.length ? upcoming.map((task) => <Link href={`/tasks/${task.id}`} key={task.id}><time>{formatTime(task.dueAt)}</time><span><strong>{task.title}</strong><small>{task.assignedUser?.name ?? "Unassigned"}</small></span></Link>) : <p className="rail-empty">No upcoming work.</p>}</div></section>
    <ActivityFeedPanel boardDate={boardDate} />
  </aside>;
}
