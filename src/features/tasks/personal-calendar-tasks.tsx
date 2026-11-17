"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CalendarTaskDetails, formatTaskClock, QuickCalendarTaskDialog, useCalendarTasks, type CalendarTask } from "./quick-calendar-task";
import styles from "./quick-calendar-task.module.css";

const sortOptions = [["manual", "My order"], ["date", "Scheduled date"], ["deadline", "Deadline"], ["star", "Starred recently"], ["title", "Title"]] as const;
type SortOrder = typeof sortOptions[number][0];

function compareTasks(left: CalendarTask, right: CalendarTask, order: SortOrder) {
  switch (order) {
    case "date": return (left.localDate ?? "9999").localeCompare(right.localDate ?? "9999") || (left.localTime ?? "").localeCompare(right.localTime ?? "");
    case "deadline": return (left.deadline ?? "9999").localeCompare(right.deadline ?? "9999");
    case "star": return (right.starredAt ?? "").localeCompare(left.starredAt ?? "");
    case "title": return left.title.localeCompare(right.title);
    default: return (right.position ?? 0) - (left.position ?? 0);
  }
}

export function PersonalCalendarTasks({ date }: { date: string }) {
  const tasks = useCalendarTasks("", true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<CalendarTask | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [list, setList] = useState("all");
  const [order, setOrder] = useState<SortOrder>("manual");
  const [listForm, setListForm] = useState<"createList" | "renameList" | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const listId = list === "default" ? null : list;
  const listName = list === "all" ? "All personal tasks" : tasks.lists.find(item => item.id === list)?.name ?? "Personal";
  const visible = tasks.tasks.filter(task => task.scope === "personal" &&
    (list === "all" || (task.listId ?? null) === listId) && (showCompleted || !task.completed) &&
    (showArchived || !task.archivedAt) && (!starredOnly || task.starredAt)
  ).sort((left, right) => compareTasks(left, right, order));

  async function change(method: string, body: object, success: string, after?: (data: { list?: { id: string } }) => void) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/tasks/calendar", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Unable to update your list.");
      tasks.refresh();
      setMessage(typeof data?.count === "number" ? `${data.count} tasks updated.` : success);
      after?.(data ?? {});
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update your list.");
    } finally {
      setBusy(false);
    }
  }

  function saveList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void change("POST", { action: listForm, listId, name: new FormData(event.currentTarget).get("name") }, "List saved.", data => {
      if (data.list) setList(data.list.id);
      setListForm(null);
    });
  }

  function move(index: number, delta: number) {
    const ids = visible.map(task => task.seriesId ?? task.id);
    const target = index + delta;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void change("POST", { action: "reorder", listId, ids }, "Task order saved.");
  }

  return <section className={styles.list} aria-label="Personal tasks">
    <header>
      <Link href="/my-tasks">Back to My Tasks</Link>
      <Link href="/appointments?view=calendar">Open Calendar</Link>
      <h1>Personal tasks</h1>
      <p>Only you can see these tasks.</p>
      <button type="button" onClick={() => setCreating(true)}>+ New task</button>
      <button type="button" onClick={() => setListForm("createList")}>+ New list</button>
      <label>List <select value={list} onChange={event => { setList(event.target.value); setListForm(null); }}>
        <option value="all">All lists</option><option value="default">Personal</option>
        {tasks.lists.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      <label>Sort by <select value={order} onChange={event => setOrder(event.target.value as SortOrder)}>
        {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <details className={styles.extra}><summary>List options</summary>
        <label><input type="checkbox" checked={starredOnly} onChange={event => setStarredOnly(event.target.checked)} /> Starred only</label>
        <label><input type="checkbox" checked={showCompleted} onChange={event => setShowCompleted(event.target.checked)} /> Show completed</label>
        <label><input type="checkbox" checked={showArchived} onChange={event => { setShowArchived(event.target.checked); if (event.target.checked) setShowCompleted(true); }} /> Show archived</label>
        <button type="button" onClick={() => window.print()}>Print current view</button>
        {list !== "all" && <>
          {listId && <>
            <button type="button" onClick={() => setListForm("renameList")}>Rename list</button>
            <button type="button" disabled={busy} onClick={() => {
              if (window.confirm(`Delete ${listName} and move its tasks to Personal?`)) void change("DELETE", { action: "deleteList", listId }, "List deleted.", () => setList("default"));
            }}>Delete list</button>
          </>}
          <button type="button" disabled={busy} onClick={() => void change("DELETE", { action: "archiveOld", listId }, "Old completed tasks archived.")}>Archive tasks completed over 30 days ago</button>
          <button type="button" disabled={busy} onClick={() => {
            if (window.confirm("Permanently delete completed one-time tasks in this list?")) void change("DELETE", { action: "deleteCompleted", listId }, "Completed tasks deleted.");
          }}>Delete completed one-time tasks</button>
        </>}
      </details>
    </header>
    {listForm && <form className={styles.listForm} onSubmit={saveList} key={listForm}>
      <label>List name <input name="name" required maxLength={60} defaultValue={listForm === "renameList" ? listName : ""} /></label>
      <button type="submit" disabled={busy}>Save list</button><button type="button" onClick={() => setListForm(null)}>Cancel</button>
    </form>}
    {message && <p role="status">{message}</p>}
    <h2>{listName}</h2>
    {tasks.loading ? <p role="status">Loading tasks…</p> : tasks.unavailable ? <p role="status">Tasks unavailable. <button type="button" onClick={tasks.refresh}>Retry</button></p> : visible.length ? (
      <ul>{visible.map((task, index) => <li key={task.id}><button className={styles.listTask} type="button" onClick={() => setSelected(task)}>
        <strong>{task.completed ? "✓" : "☐"} {task.title}</strong>
        <span>{task.localDate ? `${task.localDate} · ${task.localTime ? formatTaskClock(task.localTime) : "All day"}` : "No date"}{task.deadline ? ` · Due ${task.deadline}` : ""}</span>
      </button>
        <button type="button" aria-pressed={Boolean(task.starredAt)} aria-label={`Star ${task.title}`} disabled={busy} onClick={() => void change("PATCH", { id: task.seriesId ?? task.id, starred: !task.starredAt }, "Star updated.")}>{task.starredAt ? "★" : "☆"}</button>
        {task.archivedAt && <button type="button" disabled={busy} onClick={() => void change("PATCH", { action: "restore", id: task.id }, "Task restored.")}>Restore</button>}
        {order === "manual" && list !== "all" && !starredOnly && <>
          <button type="button" aria-label={`Move ${task.title} up`} disabled={busy || index === 0} onClick={() => move(index, -1)}>↑</button>
          <button type="button" aria-label={`Move ${task.title} down`} disabled={busy || index === visible.length - 1} onClick={() => move(index, 1)}>↓</button>
        </>}
      </li>)}</ul>
    ) : <p>No personal tasks to show.</p>}
    {creating && <QuickCalendarTaskDialog date={date} defaultScope="personal" lists={tasks.lists} defaultListId={list !== "all" ? listId ?? undefined : undefined} onClose={() => setCreating(false)} onSaved={tasks.refresh} />}
    {selected && <CalendarTaskDetails task={selected} onClose={() => setSelected(null)} onChanged={tasks.refresh} />}
  </section>;
}
