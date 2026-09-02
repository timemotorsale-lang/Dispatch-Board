"use client";

import {
  Activity,
  Building2,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Grid3X3,
  ListChecks,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { TASK_CHECKLIST_ITEM_KIND } from "@/lib/task-checklist-kind";
import type { TaskDetailChecklistItem, TaskDetailSubtaskItem } from "@/features/tasks/detail/task-detail-mappers";
import { TaskExecutionChecklistCard } from "@/features/tasks/detail/task-execution-checklist-card";
import { TaskStatusPanel } from "@/features/tasks/task-status-panel";
import { TaskUpdatesCommentsCard } from "@/features/tasks/detail/task-updates-comments-card";
import type { TaskCompletionReadiness } from "@/server/services/task-execution-readiness";
import type { TaskReadModel } from "@/server/services/task-read";

type TaskWorkspaceView = "simple" | "workbench";
type SummaryPanel = "progress" | "next" | "checklist" | "comments" | "signals";

type TaskSimpleSummaryCardProps = {
  actorIsManager: boolean;
  canComment: boolean;
  canUpdateStatus: boolean;
  checklist: TaskDetailChecklistItem[];
  commentCount: number;
  dueLabel: string;
  dueAt: string;
  feedItems: Array<{
    actorName: string;
    createdAt: string;
    id: string;
    kind: "comment" | "event";
    message: string;
  }>;
  missingUpdateLabels: string[];
  nextStep: string;
  priorityLabel: string;
  progressShortcuts: Array<{ label: string; text: string }>;
  readiness?: TaskCompletionReadiness | null;
  recordDescription: string;
  recordNumber: string;
  recordTitle: string;
  returnTo: string;
  roleLabel: string;
  sourceLabel: string;
  statusLabel: string;
  subtaskItems: TaskDetailSubtaskItem[];
  task: TaskReadModel;
  taskCategory: string;
};

function viewHref(taskId: string, view: TaskWorkspaceView, returnTo: string) {
  const params = new URLSearchParams({ view });
  if (returnTo && returnTo !== "/tasks") params.set("returnTo", returnTo);

  return `/tasks/${encodeURIComponent(taskId)}?${params.toString()}`;
}

function parseValidDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDueLabel(value: string) {
  const date = parseValidDate(value);
  if (!date) return "Due date needs review";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function toDateTimeLocalValue(value: string) {
  const date = parseValidDate(value);
  if (!date) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 16);
}

function isClosedStatus(status: string) {
  return status === "COMPLETED";
}

function getCardTone(task: TaskReadModel) {
  const dueDate = parseValidDate(task.dueAt);
  const isPastDue = !isClosedStatus(task.status) && Boolean(dueDate && dueDate.getTime() < Date.now());

  if (task.status === "COMPLETED") return "complete";
  if (task.status === "BLOCKED" || isPastDue) return "danger";
  if (
    task.status === "WAITING_ON_APPROVAL" ||
    task.status === "WAITING_ON_PARTS" ||
    task.priority === "CRITICAL" ||
    task.priority === "HIGH"
  ) {
    return "elevated";
  }
  if (task.status === "IN_PROGRESS" || task.status === "READY_FOR_REVIEW") return "active";

  return "pending";
}

function getDisplayStatusItems(task: TaskReadModel, statusLabel: string, priorityLabel: string) {
  const items = [{ label: statusLabel, tone: getCardTone(task) }];
  const dueDate = parseValidDate(task.dueAt);
  const isPastDue = !isClosedStatus(task.status) && Boolean(dueDate && dueDate.getTime() < Date.now());
  const isElevated =
    !isClosedStatus(task.status) &&
    (task.status === "BLOCKED" ||
      task.status === "WAITING_ON_APPROVAL" ||
      task.status === "WAITING_ON_PARTS" ||
      task.priority === "CRITICAL" ||
      task.priority === "HIGH");

  if (isPastDue) items.push({ label: "Past due", tone: "danger" });
  if (isElevated) items.push({ label: "Elevated", tone: "elevated" });
  items.push({ label: priorityLabel.replace(/ priority$/i, ""), tone: "priority" });

  return items;
}

function DueDateEditor({
  canEdit,
  dueAt,
  dueLabel,
  taskId
}: {
  canEdit: boolean;
  dueAt: string;
  dueLabel: string;
  taskId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [currentDueAt, setCurrentDueAt] = useState(dueAt);
  const [currentDueLabel, setCurrentDueLabel] = useState(dueLabel);
  const [draftDueAt, setDraftDueAt] = useState(toDateTimeLocalValue(dueAt));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const draftDate = parseValidDate(draftDueAt);
  const canSaveDraft = draftDate ? draftDate.toISOString() !== currentDueAt : false;

  async function saveDueDate() {
    const parsedDate = parseValidDate(draftDueAt);

    if (!parsedDate) {
      setErrorMessage("Choose a valid due date and time.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueAt: parsedDate.toISOString() })
      });
      const result = (await response.json().catch(() => null)) as { task?: { dueAt: string }; error?: string } | null;

      if (!response.ok || !result?.task) {
        setErrorMessage(result?.error ?? "Unable to change the due date right now.");
        return;
      }

      setCurrentDueAt(result.task.dueAt);
      setCurrentDueLabel(formatDueLabel(result.task.dueAt));
      setDraftDueAt(toDateTimeLocalValue(result.task.dueAt));
      setEditing(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to change the due date right now.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!editing) {
    return (
      <dd className="etw-compact-due-line">
        <span>{currentDueLabel}</span>
        {canEdit ? <button onClick={() => setEditing(true)} type="button">Change</button> : null}
      </dd>
    );
  }

  return (
    <dd className="etw-compact-due-editor">
      <input
        aria-label="Task due date"
        disabled={isSaving}
        onChange={(event) => {
          setDraftDueAt(event.target.value);
          if (errorMessage) setErrorMessage(null);
        }}
        type="datetime-local"
        value={draftDueAt}
      />
      <span>
        <button disabled={isSaving || !canSaveDraft} onClick={() => void saveDueDate()} type="button">
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button
          disabled={isSaving}
          onClick={() => {
            setDraftDueAt(toDateTimeLocalValue(currentDueAt));
            setErrorMessage(null);
            setEditing(false);
          }}
          type="button"
        >
          Cancel
        </button>
      </span>
      {errorMessage ? <small role="alert">{errorMessage}</small> : null}
    </dd>
  );
}

const executionPathOptions = [
  { value: "SHOP", label: "Shop & Recon" },
  { value: "SERVICE_ADVISOR", label: "Service Advisor" },
  { value: "INVENTORY", label: "Inventory / Parts" },
  { value: "SALES", label: "Sales" },
  { value: "MARKETING", label: "Marketing" },
  { value: "ADVERTISING", label: "Advertising" },
  { value: "COLLECTIONS", label: "Collections" },
  { value: "ADMIN", label: "Admin" },
  { value: "GENERAL_MANAGER", label: "Management" }
];

function executionPathLabel(value: string) {
  return executionPathOptions.find((option) => option.value === value)?.label ?? value.replaceAll("_", " ");
}

function ExecutionPathSwitch({
  canEdit,
  taskId,
  workflowArea
}: {
  canEdit: boolean;
  taskId: string;
  workflowArea: string;
}) {
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState(workflowArea);
  const [draftPath, setDraftPath] = useState(workflowArea);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function initiatePath(nextPath: string) {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowArea: nextPath })
      });
      const result = (await response.json().catch(() => null)) as { task?: { workflowArea: string }; error?: string } | null;

      if (!response.ok || !result?.task) {
        setDraftPath(currentPath);
        setErrorMessage(result?.error ?? "Unable to initiate the execution path right now.");
        return;
      }

      setCurrentPath(result.task.workflowArea);
      setDraftPath(result.task.workflowArea);
      router.refresh();
    } catch (error) {
      setDraftPath(currentPath);
      setErrorMessage(error instanceof Error ? error.message : "Unable to initiate the execution path right now.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!canEdit) {
    return <dd>{executionPathLabel(currentPath)}</dd>;
  }

  return (
    <dd className="etw-compact-path-switch">
      <span>
        <select
          aria-label="Task execution path"
          disabled={isSaving}
          onChange={(event) => {
            setDraftPath(event.target.value);
            if (errorMessage) setErrorMessage(null);
          }}
          value={draftPath}
        >
          {executionPathOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button
          disabled={isSaving}
          onClick={() => void initiatePath(draftPath)}
          type="button"
        >
          {isSaving ? "Initiating..." : draftPath === currentPath ? "Initiate path" : "Activate path"}
        </button>
      </span>
      {isSaving ? <small>Initiating...</small> : null}
      {errorMessage ? <small role="alert">{errorMessage}</small> : null}
    </dd>
  );
}

export function TaskSimpleSummaryCard({
  actorIsManager,
  canComment,
  canUpdateStatus,
  checklist,
  commentCount,
  dueAt,
  dueLabel,
  feedItems,
  missingUpdateLabels,
  nextStep,
  priorityLabel,
  progressShortcuts,
  readiness = null,
  recordDescription,
  recordNumber,
  recordTitle,
  returnTo,
  roleLabel,
  sourceLabel,
  statusLabel,
  subtaskItems,
  task,
  taskCategory
}: TaskSimpleSummaryCardProps) {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<SummaryPanel | null>(null);
  const togglePanel = (panel: SummaryPanel) => {
    setActivePanel((currentPanel) => currentPanel === panel ? null : panel);
  };
  const openChecklist = checklist.filter((item) => !item.completed);
  const openSubtasks = subtaskItems.filter((item) => !item.completed);
  const checklistCount = missingUpdateLabels.length + openChecklist.length;
  const signals = [
    { label: "Source backed", state: "ready" },
    { label: "Role aware", state: "ready" },
    { label: "Audit ready", state: "ready" },
    { label: "SLA watched", state: "watch" },
    { label: `${commentCount} comment${commentCount === 1 ? "" : "s"}`, state: commentCount > 0 ? "ready" : "open" },
    { label: `${checklistCount} open checklist`, state: checklistCount > 0 ? "watch" : "ready" },
    { label: statusLabel, state: task.status === "COMPLETED" ? "ready" : "open" }
  ];
  const readySignalCount = signals.filter((signal) => signal.state === "ready").length;
  const cardTone = getCardTone(task);
  const displayStatusItems = getDisplayStatusItems(task, statusLabel, priorityLabel);

  return (
    <section className={`etw-compact-task-card etw-compact-tone-${cardTone}`} aria-label="Task summary card">
      <div className="etw-compact-task-body">
        <header className="etw-compact-task-header">
          <div>
            <div className="etw-compact-title-row">
              <strong>{sourceLabel}</strong>
              <span>{recordNumber}</span>
              <em><Building2 size={14} />Category: {taskCategory}</em>
              {displayStatusItems.map((item) => (
                <b className={`etw-compact-state-${item.tone}`} key={`${item.tone}-${item.label}`}>
                  <Circle size={10} />
                  {item.label}
                </b>
              ))}
            </div>
            <h1>{recordTitle}</h1>
          </div>
          <nav className="etw-view-switcher" aria-label="Task view switch">
            <Link aria-current="page" href={viewHref(task.id, "simple", returnTo)}><Sparkles size={14} />Simple View</Link>
            <Link href={viewHref(task.id, "workbench", returnTo)}><Grid3X3 size={14} />Full Workbench</Link>
          </nav>
        </header>

        <p className="etw-compact-task-description"><b>Description:</b> {recordDescription}</p>

        <dl className="etw-compact-task-fields" aria-label="Task details">
          <div><dt><UserRound size={17} />Owner</dt><dd>{task.assignedUser.name}</dd></div>
          <div><dt><CalendarDays size={17} />Due</dt><DueDateEditor canEdit={actorIsManager} dueAt={dueAt} dueLabel={dueLabel} taskId={task.id} /></div>
          <div><dt><ShieldCheck size={17} />Role</dt><dd>{roleLabel}</dd></div>
          <div><dt><Grid3X3 size={17} />Path</dt><ExecutionPathSwitch canEdit={canUpdateStatus} taskId={task.id} workflowArea={task.workflowArea} /></div>
        </dl>

        <section className="etw-compact-next-action" aria-label="Next action">
          <div>
            <MessageSquareText size={18} />
            <strong>Next Action:</strong>
            <span>{nextStep}</span>
          </div>
          <nav aria-label="Tools for this next action">
            <button onClick={() => togglePanel("comments")} type="button"><Activity size={14} />Record update</button>
            <button onClick={() => togglePanel("next")} type="button"><ListChecks size={14} />Add subtask</button>
            <button onClick={() => togglePanel("checklist")} type="button"><ClipboardCheck size={14} />Open checklist</button>
            <Link href={viewHref(task.id, "workbench", returnTo)}><Grid3X3 size={14} />Full tools</Link>
          </nav>
        </section>
      </div>

      <nav className="etw-compact-task-links" aria-label="Open task sections">
        <button aria-pressed={activePanel === "progress"} onClick={() => togglePanel("progress")} type="button"><Activity size={14} />Progress / Updates</button>
        <button aria-pressed={activePanel === "next"} onClick={() => togglePanel("next")} type="button"><ListChecks size={14} />Subtasks <span>{openSubtasks.length}</span></button>
        <button aria-pressed={activePanel === "checklist"} onClick={() => togglePanel("checklist")} type="button"><ClipboardCheck size={14} />Checklist <span>{checklistCount}</span></button>
        <button aria-pressed={activePanel === "comments"} onClick={() => togglePanel("comments")} type="button"><MessageSquareText size={14} />Comments <span>{commentCount}</span></button>
        <button aria-pressed={activePanel === "signals"} onClick={() => togglePanel("signals")} type="button"><Tag size={14} />Signals <span>{readySignalCount}/{signals.length}</span></button>
      </nav>

      {activePanel ? <div className="etw-compact-expanded-panel">
        {activePanel === "progress" ? (
          <TaskStatusPanel actorIsManager={actorIsManager} canUpdate={canUpdateStatus} initialReadiness={readiness} task={task} />
        ) : null}

        {activePanel === "next" ? (
          <section className="etw-compact-action-panel">
            <strong>{nextStep}</strong>
            <TaskExecutionChecklistCard
              allowCreate
              allowDelete
              allowExpandToTask
              createPlaceholder="Add a subtask..."
              embedded
              initialItems={subtaskItems}
              kind={TASK_CHECKLIST_ITEM_KIND.SUBTASK}
              onActivityChanged={() => router.refresh()}
              taskId={task.id}
              title="Subtasks"
            />
          </section>
        ) : null}

        {activePanel === "checklist" ? (
          <section className="etw-compact-action-panel">
            <strong>Checklist</strong>
            {missingUpdateLabels.length ? (
              <ul>
                {missingUpdateLabels.map((label) => <li key={label}><Circle size={13} />Required update: {label}</li>)}
              </ul>
            ) : null}
            <TaskExecutionChecklistCard
              allowCreate
              createPlaceholder="Add checklist item..."
              embedded
              initialItems={checklist}
              kind={TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE}
              onActivityChanged={() => router.refresh()}
              taskId={task.id}
              title="Checklist"
            />
          </section>
        ) : null}

        {activePanel === "comments" ? (
          <TaskUpdatesCommentsCard
            canComment={canComment}
            compact
            heading="Progress Updates"
            initialFeedItems={feedItems}
            onActivityChanged={() => router.refresh()}
            quickNoteShortcuts={progressShortcuts}
            taskId={task.id}
          />
        ) : null}

        {activePanel === "signals" ? (
          <section className="etw-compact-action-panel">
            <strong>Backend Signals</strong>
            <ul>
              {signals.map((signal) => (
                <li key={signal.label}>{signal.state === "ready" ? <CheckCircle2 size={14} /> : <Circle size={13} />}{signal.label}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div> : null}
    </section>
  );
}
