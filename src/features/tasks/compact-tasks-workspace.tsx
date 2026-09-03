"use client";

import { Fragment, useDeferredValue, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ClipboardList, Download, LayoutGrid, List, Plus, RefreshCw, Search, X } from "lucide-react";
import { ErrorStateCard } from "@/components/ui/state-card";
import { RichTextContent } from "@/components/ui/rich-text-composer";
import { formatTaskDisplayNumber, formatTaskEnumLabel } from "@/features/tasks/detail/task-detail-mappers";
import { TasksConsoleScreen, type TasksConsoleScreenProps } from "@/features/tasks/tasks-console-screen";
import type { BoardReadTask } from "@/server/services/board-read";
import type { TaskReadModel } from "@/server/services/task-read";
import styles from "./compact-tasks-workspace.module.css";

export type CompactTaskFilters = { queue: string; query: string; owner: string; department: string; sort: string };
const priorityRank: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, NORMAL: 2, LOW: 3 };
const departmentLabel = (value: string) => value === "SHOP" ? "Service / Recon" : formatTaskEnumLabel(value);

export function compactTaskTitle(title: string, vehicleReference?: string | null) {
  const instruction = title.replace(/^RO-[A-Z0-9]+\s*[·–—]\s*/i, "");
  // Keep the stored title intact; compose the requested label from live vehicle data.
  if (vehicleReference === undefined) return instruction;
  const ro = title.match(/^RO-[A-Z0-9]+(?=\s*[·–—])/i)?.[0];
  const context = [ro, vehicleReference?.trim()].filter(Boolean).join(" · ");
  return context || instruction;
}

function matchesQueue(task: BoardReadTask, queue: string, currentUserId: string, now: number) {
  if (queue === "MY_TASKS") return task.assignedUser?.id === currentUserId && task.status !== "COMPLETED";
  if (queue === "ALL") return true;
  if (queue === "WAITING") return task.status.startsWith("WAITING_");
  if (queue === "OVERDUE") return task.status !== "COMPLETED" && new Date(task.dueAt).getTime() < now;
  if (queue === "UNASSIGNED") return !task.assignedUser?.id;
  return task.status === queue;
}

export function filterCompactTasks(tasks: BoardReadTask[], filters: CompactTaskFilters, currentUserId: string, now = Date.now()) {
  const query = filters.query.trim().toLocaleLowerCase();
  return tasks.filter(task => matchesQueue(task, filters.queue, currentUserId, now)
    && (!filters.owner || task.assignedUser?.id === filters.owner)
    && (!filters.department || task.workflowArea === filters.department)
    && (!query || [task.title, task.description, task.vehicleReference, task.customerReference, task.assignedUser?.name,
      formatTaskDisplayNumber(task.id), departmentLabel(task.workflowArea)].filter(Boolean).join(" ").toLocaleLowerCase().includes(query)))
    .sort((a, b) => {
      if (filters.sort === "description") return compactTaskTitle(a.title).localeCompare(compactTaskTitle(b.title)) || a.id.localeCompare(b.id);
      if (filters.sort === "priority") {
        const difference = (priorityRank[a.priority] ?? 2) - (priorityRank[b.priority] ?? 2);
        if (difference) return difference;
      }
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime() || a.id.localeCompare(b.id);
    });
}

function dueLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function CompactTaskDetails({ task, currentUserId, returnTo, onClose }: {
  task: BoardReadTask; currentUserId: string; returnTo: string; onClose: () => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<TaskReadModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const href = `/tasks/${encodeURIComponent(task.id)}?returnTo=${encodeURIComponent(returnTo)}`;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/tasks/${encodeURIComponent(task.id)}`, { signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.task) throw new Error(result.error || "Unable to load additional task details.");
        if (!controller.signal.aborted) setDetail(result.task);
      }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load task details."); });
    return () => controller.abort();
  }, [task.id]);
  async function startWork() {
    setStarting(true); setError(null);
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/acquisition`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "START" })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to start this task.");
      router.push(href); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to start this task."); }
    finally { setStarting(false); }
  }
  return <div className={styles.detail} id={`task-details-${task.id}`}>
    <div className={styles.detailHeading}><h2>{compactTaskTitle(task.title, task.vehicleReference)}</h2><button onClick={onClose} type="button" aria-label="Close task details"><X size={15} /> Close</button></div>
    <div className={styles.metadata}><span>{task.title.match(/^RO-[A-Z0-9]+/i)?.[0] ?? formatTaskDisplayNumber(task.id)}</span><span>{task.vehicleReference ?? task.customerReference ?? "General task"}</span><span>{departmentLabel(task.workflowArea)}</span><span>Owner: {task.assignedUser?.name ?? "Unassigned"}</span><span>Due {dueLabel(task.dueAt)}</span></div>
    <RichTextContent value={detail?.description ?? task.description ?? "No additional description recorded."} />
    {task.blockerReason ? <p className={styles.error}>Blocker: {task.blockerReason}</p> : null}
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <div className={styles.detailActions}>
      {task.assignedUser?.id === currentUserId && task.status === "NOT_STARTED" ? <button className={styles.primary} disabled={starting} onClick={startWork} type="button">{starting ? "Starting…" : "Start work"}</button> : null}
      <Link className={styles.primary} href={href}>Open task workbench</Link>
      {detail?.repairOrderHref ? <Link href={detail.repairOrderHref}>Open repair order</Link> : null}
      <span>Assignments, status, comments, and history are available in the workbench.</span>
    </div>
  </div>;
}

export function CompactTasksList(props: TasksConsoleScreenProps & { onAdvanced: (filters: CompactTaskFilters) => void }) {
  const router = useRouter();
  const tasks = props.board?.tasks ?? [];
  const [filters, setFilters] = useState<CompactTaskFilters>({ queue: props.initialQueueFilter ?? (props.consoleBaseHref === "/my-tasks" ? "MY_TASKS" : "ALL"), query: "", owner: "", department: props.initialDepartmentFilter ?? "", sort: "priority" });
  const [page, setPage] = useState(Math.max(1, props.initialPage ?? 1));
  const [pageSize, setPageSize] = useState("25");
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [contextVisible, setContextVisible] = useState(false);
  const [comfortable, setComfortable] = useState(false);
  const [view, setView] = useState(props.initialView === "board" ? "board" : "list");
  const allCheckbox = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(filters.query);
  const visible = filterCompactTasks(tasks, { ...filters, query: deferredQuery }, props.currentUserId);
  const size = pageSize === "all" ? Math.max(1, visible.length) : Number(pageSize);
  const pages = Math.max(1, Math.ceil(visible.length / size));
  const activePage = Math.min(page, pages);
  const start = (activePage - 1) * size;
  const rows = visible.slice(start, start + size);
  const checkedTasks = tasks.filter(task => checked.has(task.id));
  const allChecked = rows.length > 0 && rows.every(task => checked.has(task.id));
  const partiallyChecked = !allChecked && rows.some(task => checked.has(task.id));
  useEffect(() => { if (allCheckbox.current) allCheckbox.current.indeterminate = partiallyChecked; }, [partiallyChecked]);
  const departments = [...new Set(tasks.map(task => task.workflowArea))].sort();
  const owners = [...new Map(tasks.filter(task => task.assignedUser?.id).map(task => [task.assignedUser.id, task.assignedUser])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const base = props.consoleBaseHref ?? "/tasks";
  const returnTo = `${base}?date=${encodeURIComponent(props.boardDate)}&queue=${encodeURIComponent(filters.queue)}&department=${encodeURIComponent(filters.department)}&page=${activePage}&view=${view}`;
  const boardGroups = [...new Set(rows.map(task => task.status))];
  function changeView(next: string) {
    setView(next); setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  function changeFilter(key: keyof CompactTaskFilters, value: string) {
    setFilters(current => ({ ...current, [key]: value })); setPage(1); setSelected(null);
    // Native history updates keep the shared sidebar in sync without reloading the list.
    if (key === "queue" || key === "department") {
      const url = new URL(window.location.href);
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
      url.searchParams.delete("page");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }
  function toggleCheck(id: string) { setChecked(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function closeDetails(id: string) { setSelected(null); document.getElementById(`task-open-${id}`)?.focus(); }
  function exportTasks() {
    const exported = checkedTasks.length ? checkedTasks : visible;
    const cell = (value: string) => `"${(/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`;
    const csv = [["Task description", "Priority", "Status", "Owner", "Department", "Due", "Vehicle / Customer", "Task #"], ...exported.map(task => [task.title, task.priority, task.status, task.assignedUser?.name ?? "Unassigned", departmentLabel(task.workflowArea), task.dueAt, [task.vehicleReference, task.customerReference].filter(Boolean).join(" / "), formatTaskDisplayNumber(task.id)])].map(row => row.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "tasks.csv"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (props.errorMessage) return <ErrorStateCard title="Tasks could not load" message={props.errorMessage} actions={[{ label: "Open Dispatch Board", href: "/board" }]} />;
  return <section className={`${styles.workspace} ${comfortable ? styles.comfortable : ""}`} aria-label="Compact task workspace">
    <header className={styles.heading}><div><h1>Tasks</h1><span>{tasks.length} tasks · {props.boardDate}</span></div><div className={styles.headingActions}><Link className={styles.primary} href={`/tasks/intake?returnTo=${encodeURIComponent(returnTo)}`}><Plus size={15} /> Task intake</Link><button onClick={() => props.onAdvanced(filters)} type="button">Advanced tools</button></div></header>
    <nav className={styles.tabs} aria-label="Task queues">{([['ALL', 'All tasks'], ['MY_TASKS', 'My tasks'], ['BLOCKED', 'Blocked'], ['READY_FOR_REVIEW', 'Needs review']] as const).map(([queue, label]) => <button key={queue} aria-pressed={filters.queue === queue} onClick={() => changeFilter("queue", queue)} type="button">{label}<span>{tasks.filter(task => matchesQueue(task, queue, props.currentUserId, Date.now())).length}</span></button>)}</nav>
    <div className={styles.toolbar}><div className={styles.viewSwitch} role="group" aria-label="Task display"><button type="button" aria-pressed={view === "list"} onClick={() => changeView("list")}><List size={15} /> List</button><button type="button" aria-pressed={view === "board"} onClick={() => changeView("board")}><LayoutGrid size={15} /> Board</button></div><label className={styles.search}><Search size={16} /><input aria-label="Search tasks" placeholder="Search description, RO, vehicle, or task #…" value={filters.query} onChange={event => changeFilter("query", event.target.value)} /></label>
      <select aria-label="Filter department" value={filters.department} onChange={event => changeFilter("department", event.target.value)}><option value="">All departments</option>{departments.map(value => <option key={value} value={value}>{departmentLabel(value)}</option>)}</select>
      <select aria-label="Filter owner" value={filters.owner} onChange={event => changeFilter("owner", event.target.value)}><option value="">All owners</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select>
      <select aria-label="Sort tasks" value={filters.sort} onChange={event => changeFilter("sort", event.target.value)}><option value="priority">Priority first</option><option value="description">Description A–Z</option><option value="due">Due date</option></select>
      <details className={styles.options}><summary>More</summary><div>
        <label>Status<select aria-label="Filter status" value={filters.queue} onChange={event => changeFilter("queue", event.target.value)}>{["ALL", "MY_TASKS", "NOT_STARTED", "IN_PROGRESS", "BLOCKED", "WAITING", "WAITING_ON_PARTS", "WAITING_ON_APPROVAL", "READY_FOR_REVIEW", "OVERDUE", "COMPLETED", "UNASSIGNED"].map(value => <option key={value} value={value}>{value === "ALL" ? "All tasks" : formatTaskEnumLabel(value)}</option>)}</select></label>
        <label><input type="checkbox" checked={contextVisible} onChange={event => setContextVisible(event.target.checked)} /> Show vehicle / RO context</label><label><input type="checkbox" checked={comfortable} onChange={event => setComfortable(event.target.checked)} /> Comfortable row spacing</label>
        <button onClick={exportTasks} type="button"><Download size={14} /> {checkedTasks.length ? `Export ${checkedTasks.length} selected` : "Export filtered tasks"}</button><button onClick={() => router.refresh()} type="button"><RefreshCw size={14} /> Refresh tasks</button><button onClick={() => { setFilters({ queue: base === "/my-tasks" ? "MY_TASKS" : "ALL", query: "", department: "", owner: "", sort: "priority" }); setPage(1); setSelected(null); }} type="button">Reset filters</button>
      </div></details>
    </div>
    {filters.queue !== "ALL" || filters.owner || filters.department || filters.query ? <div className={styles.filterSummary}>View: {formatTaskEnumLabel(filters.queue)}{filters.owner ? ` · ${owners.find(owner => owner.id === filters.owner)?.name ?? "Selected owner"}` : ""}{filters.department ? ` · ${departmentLabel(filters.department)}` : ""}{filters.query ? ` · “${filters.query}”` : ""}</div> : null}
    {view === "board" ? <div className={styles.cardBoard} aria-label="Task board">
      {boardGroups.map(status => <details key={status} open className={styles.boardGroup}>
        <summary><ClipboardList size={18} /><span>{status === "READY_FOR_REVIEW" ? "Needs review" : formatTaskEnumLabel(status)}</span><span className={styles.groupCount}>{rows.filter(task => task.status === status).length} on this page</span></summary>
        <div className={styles.cardGrid}>{rows.filter(task => task.status === status).map(task => <article className={styles.taskCard} key={task.id} data-task-card={task.id}>
          <div className={styles.cardHeading}><span className={styles.cardIcon}><ClipboardList size={22} /></span><h2><button type="button" id={`task-open-${task.id}`} aria-expanded={selected === task.id} aria-controls={selected === task.id ? `task-details-${task.id}` : undefined} onClick={() => setSelected(selected === task.id ? null : task.id)}>{compactTaskTitle(task.title, task.vehicleReference)}</button></h2></div>
          <div className={styles.cardMeta}><span>{task.assignedUser?.name ?? "Unassigned"}</span><span>{departmentLabel(task.workflowArea)}</span><span>Due {dueLabel(task.dueAt)}</span></div>
          {contextVisible ? <p className={styles.cardContext}>{[task.title.match(/^RO-[A-Z0-9]+/i)?.[0], task.vehicleReference, task.customerReference].filter(Boolean).join(" · ")}</p> : null}
          <div className={styles.cardFooter}><span className={task.priority === "CRITICAL" ? styles.urgent : undefined}>{task.priority === "CRITICAL" ? "Urgent" : formatTaskEnumLabel(task.priority)}</span><label><input type="checkbox" aria-label={`Select ${compactTaskTitle(task.title, task.vehicleReference)}`} checked={checked.has(task.id)} onChange={() => toggleCheck(task.id)} /> Select</label></div>
          <Link className={styles.primary} href={`/tasks/${encodeURIComponent(task.id)}?returnTo=${encodeURIComponent(returnTo)}`}>Open task</Link>
          <Link className={styles.cardNumber} href={`/tasks/${encodeURIComponent(task.id)}?returnTo=${encodeURIComponent(returnTo)}`}>{formatTaskDisplayNumber(task.id)}</Link>
          {selected === task.id ? <CompactTaskDetails task={task} currentUserId={props.currentUserId} returnTo={returnTo} onClose={() => closeDetails(task.id)} /> : null}
        </article>)}</div>
      </details>)}
      {!rows.length ? <p className={styles.empty}>No tasks match this view. Adjust the filters or choose All tasks.</p> : null}
    </div> : <div className={styles.tableWrap}><table><thead><tr><th className={styles.check}><input ref={allCheckbox} aria-label="Select all visible tasks" type="checkbox" checked={allChecked} onChange={event => { const value = event.target.checked; setChecked(current => { const next = new Set(current); rows.forEach(task => { if (value) next.add(task.id); else next.delete(task.id); }); return next; }); }} /></th><th>Task description</th><th className={styles.priority}>Priority</th><th className={styles.status}>Status</th><th className={styles.owner}>Owner</th><th className={styles.due}>Due</th><th className={styles.number}>Task #</th></tr></thead><tbody>
      {rows.map(task => <Fragment key={task.id}><tr className={selected === task.id ? styles.selected : undefined} data-task-row={task.id}>
        <td className={styles.check}><input type="checkbox" aria-label={`Select ${compactTaskTitle(task.title, task.vehicleReference)}`} checked={checked.has(task.id)} onChange={() => toggleCheck(task.id)} /></td>
        <td><button id={`task-open-${task.id}`} className={styles.title} title={compactTaskTitle(task.title, task.vehicleReference)} aria-expanded={selected === task.id} aria-controls={selected === task.id ? `task-details-${task.id}` : undefined} onClick={() => setSelected(selected === task.id ? null : task.id)} type="button">{compactTaskTitle(task.title, task.vehicleReference)}</button>{contextVisible ? <span className={styles.context}>{[task.title.match(/^RO-[A-Z0-9]+/i)?.[0], task.vehicleReference, task.customerReference, departmentLabel(task.workflowArea)].filter(Boolean).join(" · ")}</span> : null}<span className={styles.mobileMeta}>{task.assignedUser?.name ?? "Unassigned"} · {dueLabel(task.dueAt)} · {formatTaskEnumLabel(task.priority)}</span></td>
        <td className={`${styles.priority} ${task.priority === "CRITICAL" ? styles.urgent : ""}`}>{task.priority === "CRITICAL" ? "Urgent" : formatTaskEnumLabel(task.priority)}</td><td className={styles.status}><span className={`${styles.badge} ${task.status === "BLOCKED" ? styles.blocked : task.status === "IN_PROGRESS" ? styles.progress : task.status === "READY_FOR_REVIEW" ? styles.review : ""}`}>{task.status === "READY_FOR_REVIEW" ? "Needs review" : formatTaskEnumLabel(task.status)}</span></td>
        <td className={styles.owner} title={task.assignedUser?.name}>{task.assignedUser?.name ?? "Unassigned"}</td><td className={styles.due} title={dueLabel(task.dueAt)}>{dueLabel(task.dueAt)}</td><td className={styles.number}><Link href={`/tasks/${encodeURIComponent(task.id)}?returnTo=${encodeURIComponent(returnTo)}`}>{formatTaskDisplayNumber(task.id)}</Link></td>
      </tr>{selected === task.id ? <tr><td colSpan={7} className={styles.detailCell}><CompactTaskDetails task={task} currentUserId={props.currentUserId} returnTo={returnTo} onClose={() => closeDetails(task.id)} /></td></tr> : null}</Fragment>)}
      {!rows.length ? <tr><td colSpan={7} className={styles.empty}>No tasks match this view. Adjust the filters or choose All tasks.</td></tr> : null}
    </tbody></table></div>}
    <footer className={styles.footer}><span aria-live="polite">Showing {visible.length ? start + 1 : 0}–{Math.min(start + size, visible.length)} of {visible.length} tasks</span>{checkedTasks.length ? <button onClick={exportTasks} type="button">Export {checkedTasks.length} selected</button> : null}<div><button aria-label="Previous page" disabled={activePage === 1} onClick={() => { setPage(activePage - 1); setSelected(null); }} type="button"><ChevronLeft size={16} /></button><span>Page {activePage} of {pages}</span><button aria-label="Next page" disabled={activePage === pages} onClick={() => { setPage(activePage + 1); setSelected(null); }} type="button"><ChevronRight size={16} /></button><label>Rows <select aria-label="Rows per page" value={pageSize} onChange={event => { setPageSize(event.target.value); setPage(1); setSelected(null); }}><option value="25">25</option><option value="50">50</option><option value="all">All</option></select></label></div></footer>
  </section>;
}

export function TasksWorkspace(props: TasksConsoleScreenProps) {
  const [advanced, setAdvanced] = useState(Boolean(props.initialView && ["advanced", "available", "my-requests", "needs-help", "manager-requests"].includes(props.initialView) || props.initialQuickCreateOpen || props.initialConcernIntakeOpen || props.initialGroupBy && props.initialGroupBy !== "none"));
  const [advancedFilters, setAdvancedFilters] = useState<CompactTaskFilters | null>(null);
  if (advanced) return <><div className={styles.back}><button onClick={() => setAdvanced(false)} type="button">← Compact task list</button><span>Advanced tools · Board, assignment requests, saved views, and automation</span></div><TasksConsoleScreen {...props} initialQueueFilter={advancedFilters?.queue ?? props.initialQueueFilter} initialDepartmentFilter={advancedFilters?.department ?? props.initialDepartmentFilter} /></>;
  return <CompactTasksList {...props} onAdvanced={filters => { setAdvancedFilters(filters); setAdvanced(true); }} />;
}
