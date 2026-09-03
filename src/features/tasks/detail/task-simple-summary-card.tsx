"use client";

import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarDays,
  CarFront,
  Circle,
  ClipboardCheck,
  Grid3X3,
  ListChecks,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Wrench,
  UserPlus,
  UserRound
} from "lucide-react";
import { TaskStatus } from "@prisma/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { TASK_CHECKLIST_ITEM_KIND } from "@/lib/task-checklist-kind";
import type { TaskDetailChecklistItem, TaskDetailSubtaskItem } from "@/features/tasks/detail/task-detail-mappers";
import { TaskExecutionChecklistCard } from "@/features/tasks/detail/task-execution-checklist-card";
import { TaskStatusPanel } from "@/features/tasks/task-status-panel";
import { TaskUpdatesCommentsCard } from "@/features/tasks/detail/task-updates-comments-card";
import type { TaskCompletionReadiness } from "@/server/services/task-execution-readiness";
import type { TaskReadModel } from "@/server/services/task-read";
import type { ActiveUserSummary } from "@/server/services/user-summary";

type TaskWorkspaceView = "simple" | "workbench";
type SummaryPanel = "progress" | "next" | "checklist" | "comments" | "repairDetails";

type TaskSimpleSummaryCardProps = {
  actorIsManager: boolean;
  assignableUsers: ActiveUserSummary[];
  canComment: boolean;
  canManageCollaborators: boolean;
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

function getCardTone(task: TaskReadModel, status = task.status) {
  const dueDate = parseValidDate(task.dueAt);
  const isPastDue = !isClosedStatus(status) && Boolean(dueDate && dueDate.getTime() < Date.now());

  if (status === "COMPLETED") return "complete";
  if (status === "BLOCKED" || isPastDue) return "danger";
  if (
    status === "WAITING_ON_APPROVAL" ||
    status === "WAITING_ON_PARTS" ||
    task.priority === "CRITICAL" ||
    task.priority === "HIGH"
  ) {
    return "elevated";
  }
  if (status === "IN_PROGRESS" || status === "READY_FOR_REVIEW") return "active";

  return "pending";
}

function getDisplayStatusItems(task: TaskReadModel, status: TaskStatus, priorityLabel: string) {
  const items = [{ label: statusLabelFromValue(status), tone: getCardTone(task, status) }];
  const dueDate = parseValidDate(task.dueAt);
  const isPastDue = !isClosedStatus(status) && Boolean(dueDate && dueDate.getTime() < Date.now());
  const isElevated =
    !isClosedStatus(status) &&
    (status === "BLOCKED" ||
      status === "WAITING_ON_APPROVAL" ||
      status === "WAITING_ON_PARTS" ||
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

function executionPathValue(value: string) {
  const normalizedValue = value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const matchingOption = executionPathOptions.find((option) =>
    option.value === value ||
    option.value === normalizedValue ||
    option.label === value ||
    option.label.toUpperCase() === value.trim().toUpperCase() ||
    option.label.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") === normalizedValue
  );

  return matchingOption?.value ?? value;
}

function formatSourceType(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildRepairDetails(task: TaskReadModel, roleLabel: string, dueLabel: string, currentStatus: TaskStatus) {
  return {
    linkedCount: [
      task.vehicleReference,
      task.customerReference,
      task.workflowArea,
      task.sourceType
    ].filter(Boolean).length,
    overview: [
      { label: "Vehicle", value: task.vehicleReference ?? "Not linked yet" },
      { label: "Customer", value: task.customerReference ?? "Not linked yet" },
      { label: "Due", value: dueLabel },
      { label: "Source", value: formatSourceType(task.sourceType) }
    ],
    workflow: [
      { label: "Repair path", value: executionPathLabel(executionPathValue(task.workflowArea)) },
      { label: "Role", value: roleLabel },
      { label: "Status", value: statusLabelFromValue(currentStatus) },
      { label: "Priority", value: formatSourceType(task.priority) }
    ]
  };
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
  const currentPath = executionPathValue(workflowArea);
  const [draftPath, setDraftPath] = useState(executionPathValue(workflowArea));
  const draftPathRef = useRef(executionPathValue(workflowArea));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updateDraftPath(nextPath: string) {
    const normalizedNextPath = executionPathValue(nextPath);

    draftPathRef.current = normalizedNextPath;
    setDraftPath(normalizedNextPath);
  }

  async function initiatePath(nextPath: string) {
    const normalizedNextPath = executionPathValue(nextPath);

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowArea: normalizedNextPath })
      });
      const result = (await response.json().catch(() => null)) as { task?: { workflowArea: string }; error?: string } | null;

      if (!response.ok || !result?.task) {
        setErrorMessage(result?.error ?? "Unable to initiate the execution path right now.");
        return;
      }

      updateDraftPath(result.task.workflowArea);
      router.refresh();
    } catch (error) {
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
            updateDraftPath(event.target.value);
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
          onClick={() => void initiatePath(draftPathRef.current)}
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

type SimpleOwner = {
  id: string;
  name: string;
  email?: string;
};

type SimpleCollaborator = SimpleOwner & {
  addedAt: string;
  addedBy: SimpleOwner | null;
  isActive: boolean;
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "??";
}

function TaskPeopleControls({
  assignableUsers,
  canManageCollaborators,
  canReassign,
  task
}: {
  assignableUsers: ActiveUserSummary[];
  canManageCollaborators: boolean;
  canReassign: boolean;
  task: TaskReadModel;
}) {
  const router = useRouter();
  const [owner, setOwner] = useState<SimpleOwner>(task.assignedUser);
  const [ownerDraftId, setOwnerDraftId] = useState(task.assignedUser.id);
  const [collaborators, setCollaborators] = useState<SimpleCollaborator[]>(task.collaborators ?? []);
  const [collaboratorDraftId, setCollaboratorDraftId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSavingOwner, setIsSavingOwner] = useState(false);
  const [isSavingCollaborators, setIsSavingCollaborators] = useState(false);

  async function saveCollaborators(nextIds: string[], successMessage = "Collaborators updated.") {
    setIsSavingCollaborators(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/collaborators`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collaboratorIds: nextIds })
      });
      const result = (await response.json().catch(() => null)) as {
        collaborators?: SimpleCollaborator[];
        error?: string;
      } | null;

      if (!response.ok || !result?.collaborators) {
        throw new Error(result?.error ?? "Unable to update collaborators right now.");
      }

      setCollaborators(result.collaborators);
      setCollaboratorDraftId("");
      setMessage(successMessage);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update collaborators right now.");
    } finally {
      setIsSavingCollaborators(false);
    }
  }

  async function saveOwner() {
    if (ownerDraftId === owner.id) return;

    setIsSavingOwner(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedUserId: ownerDraftId })
      });
      const result = (await response.json().catch(() => null)) as {
        task?: { assignedUser: SimpleOwner };
        error?: string;
      } | null;

      if (!response.ok || !result?.task) {
        throw new Error(result?.error ?? "Unable to change the task owner right now.");
      }

      const nextOwner = result.task.assignedUser;
      setOwner(nextOwner);
      setOwnerDraftId(nextOwner.id);
      setMessage(`Owner changed to ${nextOwner.name}.`);

      if (collaborators.some((item) => item.id === nextOwner.id)) {
        await saveCollaborators(
          collaborators.filter((item) => item.id !== nextOwner.id).map((item) => item.id),
          `Owner changed to ${nextOwner.name}. Collaborators updated.`
        );
      } else {
        router.refresh();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to change the task owner right now.");
    } finally {
      setIsSavingOwner(false);
    }
  }

  const availableCollaborators = assignableUsers.filter(
    (user) => user.id !== owner.id && !collaborators.some((item) => item.id === user.id)
  );
  const canSaveOwner = canReassign && !isSavingOwner && ownerDraftId !== owner.id;
  const canAddCollaborator = canManageCollaborators && !isSavingCollaborators && Boolean(collaboratorDraftId);

  return (
    <dd className="etw-compact-people-control">
      <div className="etw-compact-owner-row">
        <b>{owner.name}</b>
        {canReassign ? (
          <>
            <select
              aria-label="Change task owner"
              disabled={isSavingOwner}
              onChange={(event) => {
                setOwnerDraftId(event.target.value);
                setErrorMessage(null);
                setMessage(null);
              }}
              value={ownerDraftId}
            >
              {assignableUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            <button disabled={!canSaveOwner} onClick={() => void saveOwner()} type="button">
              {isSavingOwner ? "Saving..." : "Change"}
            </button>
          </>
        ) : null}
      </div>
      <div className="etw-compact-collaborator-row">
        <span>Collaborators</span>
        {collaborators.length ? (
          <ul aria-label="Task collaborators">
            {collaborators.map((collaborator) => (
              <li key={collaborator.id}>
                <b>{initials(collaborator.name)}</b>
                <span>{collaborator.name}</span>
                {canManageCollaborators ? (
                  <button
                    aria-label={`Remove ${collaborator.name}`}
                    disabled={isSavingCollaborators}
                    onClick={() => void saveCollaborators(
                      collaborators.filter((item) => item.id !== collaborator.id).map((item) => item.id)
                    )}
                    type="button"
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <em>No collaborators</em>
        )}
        {canManageCollaborators ? (
          <div>
            <select
              aria-label="Add task collaborator"
              disabled={isSavingCollaborators}
              onChange={(event) => {
                setCollaboratorDraftId(event.target.value);
                setErrorMessage(null);
                setMessage(null);
              }}
              value={collaboratorDraftId}
            >
              <option value="">Add collaborator</option>
              {availableCollaborators.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            <button
              disabled={!canAddCollaborator}
              onClick={() => void saveCollaborators([...collaborators.map((item) => item.id), collaboratorDraftId])}
              type="button"
            >
              <UserPlus size={13} />Add
            </button>
          </div>
        ) : null}
      </div>
      {message ? <small>{message}</small> : null}
      {errorMessage ? <small role="alert">{errorMessage}</small> : null}
    </dd>
  );
}

const statusActionOptions = [
  {
    action: "IN_PROGRESS",
    description: "Work has started and should keep moving.",
    label: "In progress",
    nextStatus: TaskStatus.IN_PROGRESS,
    requiresReason: false
  },
  {
    action: "BLOCKED",
    description: "Work cannot continue until the blocker is cleared.",
    label: "Blocked",
    nextStatus: TaskStatus.BLOCKED,
    requiresReason: true
  },
  {
    action: "COMPLETED",
    description: "The work is done and ready to leave the active queue.",
    label: "Completed",
    nextStatus: TaskStatus.COMPLETED,
    requiresReason: false
  },
  {
    action: "CLOSE",
    description: "Close this task with a reason saved to the history.",
    label: "Close",
    nextStatus: TaskStatus.COMPLETED,
    requiresReason: true
  }
] as const;

type StatusAction = typeof statusActionOptions[number]["action"];

function statusLabelFromValue(status: TaskStatus) {
  return status.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function TaskStatusActionMenu({
  canComment,
  canUpdate,
  currentStatus,
  onStatusChanged,
  task
}: {
  canComment: boolean;
  canUpdate: boolean;
  currentStatus: TaskStatus;
  onStatusChanged: (status: TaskStatus) => void;
  task: TaskReadModel;
}) {
  const router = useRouter();
  const [pendingReasonAction, setPendingReasonAction] = useState<StatusAction | null>(null);
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const pendingReasonOption = statusActionOptions.find((option) => option.action === pendingReasonAction) ?? null;
  const trimmedReason = reason.trim();
  const canApplyPendingStatus = canUpdate && !isSaving && Boolean(
    pendingReasonOption && (!pendingReasonOption.requiresReason || trimmedReason)
  );

  function actionFromStatus(status: TaskStatus): StatusAction {
    if (status === TaskStatus.BLOCKED) return "BLOCKED";
    if (status === TaskStatus.COMPLETED) return "COMPLETED";

    return "IN_PROGRESS";
  }

  async function saveCloseComment(action: StatusAction) {
    if (!canComment || action !== "CLOSE" || !trimmedReason) {
      return;
    }

    const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: `Closed task: ${trimmedReason}` })
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      throw new Error(result?.error ?? "Unable to save the close reason right now.");
    }
  }

  async function patchStatus(status: TaskStatus, action: StatusAction) {
    const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        ...(status === TaskStatus.BLOCKED ? { blockerReason: trimmedReason } : {}),
        ...(trimmedReason ? { progressNote: action === "CLOSE" ? `Closed task: ${trimmedReason}` : trimmedReason } : {})
      })
    });
    const result = (await response.json().catch(() => null)) as { task?: { status: TaskStatus }; error?: string } | null;

    if (!response.ok || !result?.task) {
      throw new Error(result?.error ?? "Unable to update the task status right now.");
    }

    return result.task;
  }

  async function applyStatus(action: StatusAction) {
    const option = statusActionOptions.find((item) => item.action === action) ?? statusActionOptions[0];
    const actionNeedsReason = option.requiresReason;
    const actionCanApply = canUpdate && !isSaving && (!actionNeedsReason || Boolean(trimmedReason));

    if (!actionCanApply) {
      setErrorMessage(actionNeedsReason ? "Add a reason before applying this status." : null);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await saveCloseComment(action);
      let updatedTask: { status: TaskStatus };

      try {
        updatedTask = await patchStatus(option.nextStatus, action);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (
          option.nextStatus === TaskStatus.COMPLETED &&
          message === "Approval-required tasks must move through Ready for Review before Completed."
        ) {
          await patchStatus(TaskStatus.READY_FOR_REVIEW, action);
          updatedTask = await patchStatus(TaskStatus.COMPLETED, action);
        } else {
          throw error;
        }
      }

      onStatusChanged(updatedTask.status);
      setReason("");
      setPendingReasonAction(null);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update the task status right now.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <dd className="etw-compact-status-menu">
      <select
        aria-label="Task status"
        disabled={!canUpdate}
        onChange={(event) => {
          const nextAction = event.target.value as StatusAction;
          const nextOption = statusActionOptions.find((option) => option.action === nextAction);

          setErrorMessage(null);
          setReason("");
          if (nextOption) {
            setPendingReasonAction(nextAction);
          }
        }}
        value={pendingReasonAction ?? actionFromStatus(currentStatus)}
      >
        {statusActionOptions.map((option) => (
          <option key={option.action} value={option.action}>{option.label}</option>
        ))}
      </select>
      {pendingReasonOption ? (
        <div className="etw-compact-status-popover" role="menu">
          <strong>{pendingReasonOption.label}</strong>
          <p>{pendingReasonOption.description}</p>
          <label>
            <span>
              {pendingReasonAction === "BLOCKED"
                ? "Blocker reason"
                : pendingReasonAction === "CLOSE"
                  ? "Close reason"
                  : "Progress note"}
              {pendingReasonOption.requiresReason ? "" : " (optional)"}
            </span>
            <textarea
              disabled={isSaving}
              onChange={(event) => {
                setReason(event.target.value);
                setErrorMessage(null);
              }}
              placeholder={
                pendingReasonAction === "BLOCKED"
                  ? "What is blocking this task?"
                  : pendingReasonAction === "CLOSE"
                    ? "Why is this task being closed?"
                    : "Add a short reason or progress note..."
              }
              rows={3}
              value={reason}
            />
          </label>
          <div className="etw-compact-people-field">
            <button
              disabled={!canApplyPendingStatus}
              onClick={() => {
                if (pendingReasonAction) void applyStatus(pendingReasonAction);
              }}
              type="button"
            >
              {isSaving ? "Saving..." : pendingReasonAction === "CLOSE" ? "Close task" : "Apply status"}
            </button>
            <button
              disabled={isSaving}
              onClick={() => {
                setPendingReasonAction(null);
                setReason("");
                setErrorMessage(null);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
          {errorMessage ? (
            <small role="alert"><AlertTriangle size={13} />{errorMessage}</small>
          ) : null}
        </div>
      ) : null}
    </dd>
  );
}

export function TaskSimpleSummaryCard({
  actorIsManager,
  assignableUsers,
  canComment,
  canManageCollaborators,
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
  subtaskItems,
  task,
  taskCategory
}: TaskSimpleSummaryCardProps) {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<SummaryPanel | null>(null);
  const [currentStatus, setCurrentStatus] = useState(task.status as TaskStatus);

  const togglePanel = (panel: SummaryPanel) => {
    setActivePanel((currentPanel) => currentPanel === panel ? null : panel);
  };
  const openChecklist = checklist.filter((item) => !item.completed);
  const openSubtasks = subtaskItems.filter((item) => !item.completed);
  const checklistCount = missingUpdateLabels.length + openChecklist.length;
  const repairDetails = buildRepairDetails(task, roleLabel, dueLabel, currentStatus);
  const cardTone = getCardTone(task, currentStatus);
  const displayStatusItems = getDisplayStatusItems(task, currentStatus, priorityLabel);

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
          <div className="etw-compact-people-field">
            <dt><UserRound size={17} />Owner</dt>
            <TaskPeopleControls
              assignableUsers={assignableUsers}
              canManageCollaborators={canManageCollaborators}
              canReassign={actorIsManager}
              task={task}
            />
          </div>
          <div><dt><CalendarDays size={17} />Due</dt><DueDateEditor canEdit={actorIsManager} dueAt={dueAt} dueLabel={dueLabel} taskId={task.id} /></div>
          <div><dt><ShieldCheck size={17} />Role</dt><dd>{roleLabel}</dd></div>
          <div><dt><Grid3X3 size={17} />Path</dt><ExecutionPathSwitch canEdit={canUpdateStatus} taskId={task.id} workflowArea={task.workflowArea} /></div>
          <div>
            <dt><Activity size={17} />Status</dt>
            <TaskStatusActionMenu
              canComment={canComment}
              canUpdate={canUpdateStatus}
              currentStatus={currentStatus}
              onStatusChanged={setCurrentStatus}
              task={task}
            />
          </div>
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
        <button aria-pressed={activePanel === "repairDetails"} onClick={() => togglePanel("repairDetails")} type="button"><Wrench size={14} />Repair Details <span>{repairDetails.linkedCount}</span></button>
      </nav>

      {activePanel ? <div className="etw-compact-expanded-panel">
        {activePanel === "progress" ? (
          <TaskStatusPanel
            actorIsManager={actorIsManager}
            canUpdate={canUpdateStatus}
            initialReadiness={readiness}
            onStatusChanged={setCurrentStatus}
            task={task}
          />
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

        {activePanel === "repairDetails" ? (
          <section className="etw-compact-action-panel etw-compact-repair-details">
            <header>
              <strong><Wrench size={15} />Repair Details</strong>
              <span>Review vehicle, customer, path, and task source before opening the full workbench.</span>
            </header>
            <div className="etw-compact-repair-grid">
              <article>
                <small><CarFront size={14} />Vehicle / Customer</small>
                <dl>
                  {repairDetails.overview.map((item) => (
                    <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
                  ))}
                </dl>
              </article>
              <article>
                <small><Wrench size={14} />Workflow</small>
                <dl>
                  {repairDetails.workflow.map((item) => (
                    <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
                  ))}
                </dl>
              </article>
            </div>
            <Link href={viewHref(task.id, "workbench", returnTo)}><Grid3X3 size={14} />Open full repair/workbench details</Link>
          </section>
        ) : null}
      </div> : null}
    </section>
  );
}
