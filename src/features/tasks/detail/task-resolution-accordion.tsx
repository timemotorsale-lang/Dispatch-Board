"use client";

import { CalendarClock, ChevronDown, ChevronRight, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { TaskDetailChecklistItem, TaskDetailSubtaskItem } from "@/features/tasks/detail/task-detail-mappers";
import { formatTaskDetailDateTime, formatTaskEnumLabel } from "@/features/tasks/detail/task-detail-mappers";
import { TaskExecutionChecklistCard } from "@/features/tasks/detail/task-execution-checklist-card";
import { TASK_CHECKLIST_ITEM_KIND } from "@/lib/task-checklist-kind";
import type { TaskConcernWorkspaceReadModel } from "@/server/services/task-read";

type ResolutionTask = TaskConcernWorkspaceReadModel["tasks"][number];

function statusTone(status: string) {
  if (status === "COMPLETED") return "complete";
  if (status === "BLOCKED" || status === "ESCALATED") return "danger";
  if (status === "IN_PROGRESS" || status === "READY_FOR_REVIEW") return "active";
  return "pending";
}

export function TaskResolutionAccordion({
  checklist,
  concernId,
  selectedTaskDescription,
  selectedTaskId,
  subtasks,
  tasks
}: {
  checklist: TaskDetailChecklistItem[];
  concernId: string | null;
  selectedTaskDescription: string | null;
  selectedTaskId: string;
  subtasks: TaskDetailSubtaskItem[];
  tasks: ResolutionTask[];
}) {
  const [expandedIds, setExpandedIds] = useState(() => new Set([selectedTaskId]));
  const completedTasks = tasks.filter((item) => item.status === "COMPLETED").length;
  const completionPercent = Math.round(completedTasks / Math.max(tasks.length, 1) * 100);

  function toggle(taskId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  }

  return (
    <section className="etw-card etw-resolution-card" id="resolution-tasks">
      <header>
        <div><h2>Generated Resolution Tasks ({tasks.length})</h2><p>{completedTasks} complete / {tasks.length - completedTasks} remaining</p></div>
        <div className="etw-resolution-actions">
          <button onClick={() => setExpandedIds(new Set(tasks.map((item) => item.id)))} type="button">Expand All</button>
          <button onClick={() => setExpandedIds(new Set())} type="button">Collapse All</button>
          <Link className="primary" href={`/tasks/intake?returnTo=${encodeURIComponent(`/tasks/${selectedTaskId}`)}${concernId ? `&concern=${encodeURIComponent(concernId)}` : ""}`}><Plus size={13} /> Task Intake</Link>
        </div>
        <div className="etw-progress" aria-label={`${completionPercent}% complete`}><span style={{ width: `${completionPercent}%` }} /></div>
      </header>
      <div className="etw-resolution-list">
        {tasks.map((item) => {
          const expanded = expandedIds.has(item.id);
          const selected = item.id === selectedTaskId;
          return <article className={selected ? "etw-resolution-task selected" : "etw-resolution-task"} key={item.id}>
            <div className="etw-resolution-row">
              <button aria-label={`${expanded ? "Collapse" : "Expand"} ${item.title}`} onClick={() => toggle(item.id)} type="button">{expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>
              <span className="etw-task-number">{item.sortOrder + (concernId ? 1 : 0)}</span>
              <Link href={`/tasks/${encodeURIComponent(item.id)}`}><strong>{item.title}</strong></Link>
              <span className={`etw-status etw-status-${statusTone(item.status)}`}>{formatTaskEnumLabel(item.status)}</span>
              <span className="etw-owner"><UserRound size={13} />{item.assignedUser.name}</span>
              <span><CalendarClock size={13} />{formatTaskDetailDateTime(item.dueAt)}</span>
              <span>{item.checklistTotal ? `${Math.round(item.checklistCompleted / item.checklistTotal * 100)}%` : "Open"}</span>
            </div>
            {expanded ? <div className={selected ? "etw-selected-task" : "etw-selected-task etw-selected-task-summary"} id={selected ? "selected-checklist" : undefined}>
              {selected ? <div className="etw-selected-checklist"><TaskExecutionChecklistCard embedded initialItems={checklist} kind={TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE} taskId={item.id} title="Checklist" /></div> : null}
              <div className="etw-selected-description"><strong>Description</strong><p>{selected ? selectedTaskDescription ?? "No description has been added." : item.title}</p><span>Completion Criteria</span><p>{item.completionCriteria}</p>{item.dependsOnStepCodes.length ? <small>Depends on: {item.dependsOnStepCodes.join(", ")}</small> : null}</div>
              {selected ? <div className="etw-selected-subtasks"><TaskExecutionChecklistCard allowCreate allowDelete createPlaceholder="Add a subtask..." embedded initialItems={subtasks} kind={TASK_CHECKLIST_ITEM_KIND.SUBTASK} taskId={item.id} title="Subtasks" /></div> : null}
            </div> : null}
          </article>;
        })}
      </div>
    </section>
  );
}
