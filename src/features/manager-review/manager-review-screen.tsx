"use client";

import { TaskStatus } from "@prisma/client";
import {
  AlertTriangle,
  ArrowDownUp,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  FileQuestion,
  Gauge,
  Info,
  ListFilter,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRoundCog
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { EmptyStateCard, ErrorStateCard } from "@/components/ui/state-card";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import {
  getAllowedMyTaskStatuses,
  getTaskActionLabel
} from "@/features/tasks/my-tasks-helpers";
import type { BoardReadTask } from "@/server/services/board-read";
import type {
  ManagerReviewCommandItem,
  ManagerReviewCommandQueue,
  ManagerReviewFocus
} from "@/server/services/manager-review";
import type { TeamExecutionHealthItem } from "@/server/services/team-execution-health";
import type { ActiveUserSummary } from "@/server/services/user-summary";

type ManagerReviewScreenProps = {
  boardDate: string;
  boardExists: boolean;
  errorMessage?: string | null;
  fullBoardHref: string;
  generatedAt: string | null;
  generationStatus: string | null;
  initialCommandItems: ManagerReviewCommandItem[];
  initialFocus: ManagerReviewFocus;
  assignableUsers: ActiveUserSummary[];
  nowIso?: string;
  initialExecutionHealth?: TeamExecutionHealthItem[];
};

type ManagerCommandFilter =
  | "ALL"
  | "CRITICAL"
  | "CUSTOMER_RISK"
  | "OVERDUE"
  | "BLOCKED_INTERVENTION"
  | "EVIDENCE_REQUIRED"
  | "RETURNED_WORK"
  | "WAITING_ON_APPROVAL"
  | "READY_FOR_REVIEW"
  | "NEEDS_ASSIGNMENT"
  | "REVIEW_SLA";

type StatusUpdateResponse =
  | {
      task?: {
        id: string;
        status: TaskStatus;
        blockerReason?: string | null;
      };
      error?: string;
    }
  | null;

type TaskAssignmentResponse =
  | {
      task?: {
        id: string;
        assignedUser: {
          id: string;
          name: string;
        };
      };
      error?: string;
    }
  | null;

function formatBoardDateLabel(boardDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${boardDate}T00:00:00.000Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDueTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getElapsedAgeCopy(value: string, now: Date) {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(value).getTime()) / 60000));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.round(hours / 24)}d`;
}

function getDueState(task: BoardReadTask, now: Date) {
  const minutesUntilDue = Math.round((new Date(task.dueAt).getTime() - now.getTime()) / 60000);

  if (minutesUntilDue < 0) {
    const overdueMinutes = Math.abs(minutesUntilDue);
    return {
      label: `${overdueMinutes < 60 ? `${overdueMinutes}m` : `${Math.round(overdueMinutes / 60)}h`} past due`,
      tone: "danger" as const
    };
  }

  if (minutesUntilDue <= 120) {
    return {
      label: `${minutesUntilDue < 60 ? `${minutesUntilDue}m` : `${Math.round(minutesUntilDue / 60)}h`} left`,
      tone: "warning" as const
    };
  }

  return {
    label: `Due ${formatDueTime(task.dueAt)}`,
    tone: "neutral" as const
  };
}

function isRequiredUpdateComplete(
  field: BoardReadTask["requiredUpdateFields"][number],
  value: string | boolean | undefined
) {
  if (field.type === "boolean") {
    return typeof value === "boolean";
  }

  return typeof value === "string" && Boolean(value.trim());
}

function getInitialFilter(initialFocus: ManagerReviewFocus): ManagerCommandFilter {
  if (initialFocus === "READY_FOR_REVIEW") {
    return "READY_FOR_REVIEW";
  }

  if (initialFocus === "WAITING_ON_APPROVAL") {
    return "WAITING_ON_APPROVAL";
  }

  if (initialFocus === "BLOCKED" || initialFocus === "WAITING_ON_PARTS") {
    return "BLOCKED_INTERVENTION";
  }

  if (initialFocus === "NEEDS_ASSIGNMENT") {
    return "NEEDS_ASSIGNMENT";
  }

  return "ALL";
}

function matchesFilter(item: ManagerReviewCommandItem, filter: ManagerCommandFilter) {
  if (filter === "ALL") {
    return true;
  }

  if (filter === "CRITICAL") {
    return item.task.priority === "CRITICAL";
  }

  if (filter === "OVERDUE") {
    return item.isPastTaskDue;
  }

  if (filter === "BLOCKED_INTERVENTION") {
    return item.queue === "BLOCKED" || item.queue === "WAITING_ON_PARTS";
  }

  if (filter === "EVIDENCE_REQUIRED") {
    return item.missingRequiredUpdateCount > 0;
  }

  if (filter === "WAITING_ON_APPROVAL") {
    return item.queue === "WAITING_ON_APPROVAL";
  }

  if (filter === "READY_FOR_REVIEW") {
    return item.queue === "READY_FOR_REVIEW";
  }

  if (filter === "NEEDS_ASSIGNMENT") {
    return item.queue === "NEEDS_ASSIGNMENT";
  }

  return false;
}

function getDecisionPrompt(queue: ManagerReviewCommandQueue) {
  if (queue === "READY_FOR_REVIEW") {
    return "Approve completion or return this work for correction.";
  }

  if (queue === "BLOCKED") {
    return "Remove the blocker, redirect the work, or establish the next accountable action.";
  }

  if (queue === "WAITING_ON_PARTS") {
    return "Confirm the parts path, ownership, and next follow-up time.";
  }

  if (queue === "WAITING_ON_APPROVAL") {
    return "Make or route the approval decision holding this work.";
  }

  return "Assign an accountable owner so this work can begin.";
}

function getContextReference(task: BoardReadTask) {
  return task.vehicleReference ?? task.customerReference ?? "No vehicle or customer reference";
}

function getPriorityTone(priority: string) {
  if (priority === "CRITICAL") {
    return "critical";
  }

  if (priority === "HIGH") {
    return "high";
  }

  if (priority === "MEDIUM") {
    return "medium";
  }

  return "low";
}

function ReviewDecisionActions({
  item,
  onTaskRemoved,
  onToggleReassign
}: {
  item: ManagerReviewCommandItem;
  onTaskRemoved(taskId: string): void;
  onToggleReassign(): void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const approvalBlocked = item.missingRequiredUpdateCount > 0;

  async function submit(nextStatus: TaskStatus) {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(item.task.id)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const result = (await response.json().catch(() => null)) as StatusUpdateResponse;

      if (!response.ok || !result?.task) {
        setErrorMessage(result?.error ?? "Unable to update this review right now.");
        return;
      }

      onTaskRemoved(item.task.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update this review right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {approvalBlocked ? (
        <div className="manager-command-action-warning" role="status">
          <CircleAlert aria-hidden="true" size={16} />
          <span>
            Approval is unavailable until {item.missingRequiredUpdateCount} required submission update
            {item.missingRequiredUpdateCount === 1 ? " is" : "s are"} complete.
          </span>
        </div>
      ) : null}
      <div className="manager-command-action-bar" role="group" aria-label="Manager review decisions">
        <button
          className="manager-command-button manager-command-button-primary"
          disabled={isSubmitting || approvalBlocked}
          onClick={() => void submit(TaskStatus.COMPLETED)}
          title={approvalBlocked ? "Required submission updates are incomplete." : undefined}
          type="button"
        >
          <Check aria-hidden="true" size={16} />
          {isSubmitting ? "Saving..." : "Approve"}
        </button>
        <button
          className="manager-command-button"
          disabled={isSubmitting}
          onClick={() => void submit(TaskStatus.IN_PROGRESS)}
          type="button"
        >
          <RotateCcw aria-hidden="true" size={16} />
          Return to work
        </button>
        <button
          className="manager-command-button"
          disabled
          title="Formal evidence requests are planned in milestone MR-2."
          type="button"
        >
          <FileQuestion aria-hidden="true" size={16} />
          Request evidence
        </button>
        <button className="manager-command-button" onClick={onToggleReassign} type="button">
          <UserRoundCog aria-hidden="true" size={16} />
          Reassign
        </button>
        <button
          className="manager-command-button"
          disabled
          title="Formal escalation commands are planned in milestone MR-6."
          type="button"
        >
          <AlertTriangle aria-hidden="true" size={16} />
          Escalate
        </button>
      </div>
      {errorMessage ? (
        <div className="notice notice-danger manager-command-inline-notice" role="alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}
    </>
  );
}

function ReassignTaskControl({
  assignableUsers,
  onTaskChanged,
  task
}: {
  assignableUsers: ActiveUserSummary[];
  onTaskChanged(message: string): void;
  task: BoardReadTask;
}) {
  const [assignedUserId, setAssignedUserId] = useState(task.assignedUser.id);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function saveAssignment() {
    if (assignedUserId === task.assignedUser.id) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/assignment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ assignedUserId })
      });
      const result = (await response.json().catch(() => null)) as TaskAssignmentResponse;

      if (!response.ok || !result?.task) {
        setErrorMessage(result?.error ?? "Unable to reassign this task right now.");
        return;
      }

      onTaskChanged(`Assigned ${task.title} to ${result.task.assignedUser.name}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to reassign this task right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="manager-command-reassign-panel" aria-label="Reassign selected work">
      <div>
        <strong>Reassign owner</strong>
        <span>Current owner: {task.assignedUser.name}</span>
      </div>
      <label>
        <span>New owner</span>
        <select
          disabled={isSubmitting}
          value={assignedUserId}
          onChange={(event) => {
            setAssignedUserId(event.target.value);
            setErrorMessage(null);
          }}
        >
          {assignableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>
      <button
        className="manager-command-button manager-command-button-primary"
        disabled={isSubmitting || assignedUserId === task.assignedUser.id}
        onClick={() => void saveAssignment()}
        type="button"
      >
        {isSubmitting ? "Saving..." : "Save assignment"}
      </button>
      {errorMessage ? <p className="manager-command-error">{errorMessage}</p> : null}
    </section>
  );
}

function InterventionControls({
  item,
  onTaskChanged,
  onToggleReassign
}: {
  item: ManagerReviewCommandItem;
  onTaskChanged(message: string): void;
  onToggleReassign(): void;
}) {
  const task = item.task;
  const [selectedStatus, setSelectedStatus] = useState(task.status as TaskStatus);
  const [blockerReason, setBlockerReason] = useState(task.blockerReason ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const allowedStatuses = getAllowedMyTaskStatuses(task, true);
  const requiresBlockerReason = selectedStatus === TaskStatus.BLOCKED;

  async function saveStatus() {
    const trimmedBlockerReason = blockerReason.trim();

    if (requiresBlockerReason && !trimmedBlockerReason) {
      setErrorMessage("Blocked tasks require a blocker reason.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: selectedStatus,
          ...(selectedStatus === TaskStatus.BLOCKED ? { blockerReason: trimmedBlockerReason } : {})
        })
      });
      const result = (await response.json().catch(() => null)) as StatusUpdateResponse;

      if (!response.ok || !result?.task) {
        setErrorMessage(result?.error ?? "Unable to update this task right now.");
        return;
      }

      onTaskChanged(`${task.title} moved to ${formatStatusLabel(result.task.status)}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update this task right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="manager-command-intervention" aria-label="Intervention controls">
      <div className="manager-command-section-heading">
        <div>
          <strong>Intervention controls</strong>
          <span>Use the current task workflow while formal intervention commands are built.</span>
        </div>
      </div>
      <div className="manager-command-intervention-grid">
        <label>
          <span>Next status</span>
          <select
            disabled={isSubmitting}
            value={selectedStatus}
            onChange={(event) => {
              setSelectedStatus(event.target.value as TaskStatus);
              setErrorMessage(null);
            }}
          >
            {allowedStatuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {requiresBlockerReason ? (
          <label className="manager-command-intervention-wide">
            <span>Blocker reason</span>
            <input
              disabled={isSubmitting}
              placeholder="What is blocking this work?"
              value={blockerReason}
              onChange={(event) => {
                setBlockerReason(event.target.value);
                setErrorMessage(null);
              }}
            />
          </label>
        ) : null}
        <button
          className="manager-command-button manager-command-button-primary"
          disabled={isSubmitting}
          onClick={() => void saveStatus()}
          type="button"
        >
          {isSubmitting
            ? "Saving..."
            : getTaskActionLabel(selectedStatus, task.status as TaskStatus, task.requiresManagerApproval)}
        </button>
      </div>
      <div className="manager-command-action-bar" role="group" aria-label="Manager intervention decisions">
        <button className="manager-command-button" onClick={onToggleReassign} type="button">
          <UserRoundCog aria-hidden="true" size={16} />
          Reassign
        </button>
        <button
          className="manager-command-button"
          disabled
          title="Formal evidence requests are planned in milestone MR-2."
          type="button"
        >
          <FileQuestion aria-hidden="true" size={16} />
          Request evidence
        </button>
        <button
          className="manager-command-button"
          disabled
          title="Formal escalation commands are planned in milestone MR-6."
          type="button"
        >
          <AlertTriangle aria-hidden="true" size={16} />
          Escalate
        </button>
      </div>
      {errorMessage ? <p className="manager-command-error">{errorMessage}</p> : null}
    </section>
  );
}

export function ManagerReviewScreen({
  boardDate,
  boardExists,
  errorMessage,
  fullBoardHref,
  generatedAt,
  generationStatus,
  initialCommandItems,
  initialFocus,
  assignableUsers,
  nowIso,
  initialExecutionHealth = []
}: ManagerReviewScreenProps) {
  const router = useRouter();
  const [isRefreshPending, startRefreshTransition] = useTransition();
  const [removedTaskIds, setRemovedTaskIds] = useState<Record<string, true>>({});
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ManagerCommandFilter>(() => getInitialFilter(initialFocus));
  const [searchText, setSearchText] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("ALL");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(() => {
    const initialFilter = getInitialFilter(initialFocus);
    return initialCommandItems.find((item) => matchesFilter(item, initialFilter))?.task.id ??
      initialCommandItems[0]?.task.id ??
      null;
  });
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [showReviewHealth, setShowReviewHealth] = useState(initialFocus === "NEEDS_ASSIGNMENT");
  const now = useMemo(() => new Date(nowIso ?? new Date().toISOString()), [nowIso]);
  const commandItems = useMemo(
    () => initialCommandItems.filter((item) => !removedTaskIds[item.task.id]),
    [initialCommandItems, removedTaskIds]
  );
  const workflowOptions = useMemo(
    () => [...new Set(commandItems.map((item) => item.task.workflowArea))].sort(),
    [commandItems]
  );
  const visibleItems = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return commandItems.filter((item) => {
      if (!matchesFilter(item, activeFilter)) {
        return false;
      }

      if (workflowFilter !== "ALL" && item.task.workflowArea !== workflowFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        item.task.title,
        item.task.description,
        item.task.assignedUser.name,
        item.task.vehicleReference,
        item.task.customerReference,
        item.task.blockerReason,
        item.attentionReason
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [activeFilter, commandItems, searchText, workflowFilter]);
  const selectedItem =
    visibleItems.find((item) => item.task.id === selectedTaskId) ?? visibleItems[0] ?? null;

  const summary = useMemo(
    () => ({
      awaiting: commandItems.length,
      critical: commandItems.filter((item) => item.task.priority === "CRITICAL").length,
      overdue: commandItems.filter((item) => item.isPastTaskDue).length,
      blocked: commandItems.filter(
        (item) => item.queue === "BLOCKED" || item.queue === "WAITING_ON_PARTS"
      ).length,
      missingUpdates: commandItems.filter((item) => item.missingRequiredUpdateCount > 0).length,
      waitingApproval: commandItems.filter((item) => item.queue === "WAITING_ON_APPROVAL").length,
      readyReview: commandItems.filter((item) => item.queue === "READY_FOR_REVIEW").length,
      needsAssignment: commandItems.filter((item) => item.queue === "NEEDS_ASSIGNMENT").length
    }),
    [commandItems]
  );

  function refreshQueue() {
    startRefreshTransition(() => router.refresh());
  }

  useLiveRefresh(refreshQueue);

  function handleTaskRemoved(taskId: string) {
    setRemovedTaskIds((current) => ({ ...current, [taskId]: true }));
    setSelectedTaskId(null);
    setIsReassignOpen(false);
    setLastActionMessage("Decision saved. The queue and selected workbench have advanced.");
  }

  function handleTaskChanged(message: string) {
    setLastActionMessage(message);
    refreshQueue();
  }

  function selectFilter(filter: ManagerCommandFilter) {
    setActiveFilter(filter);
    setSelectedTaskId(null);
    setIsReassignOpen(false);
  }

  const queueDefinitions: Array<{
    key: ManagerCommandFilter;
    label: string;
    count: number | null;
    detail: string;
    disabled?: boolean;
  }> = [
    { key: "ALL", label: "All attention", count: summary.awaiting, detail: "Current manager work" },
    {
      key: "CRITICAL",
      label: "Critical priorities",
      count: summary.critical,
      detail: "Task priority only"
    },
    {
      key: "CUSTOMER_RISK",
      label: "Customer risk",
      count: null,
      detail: "Risk model planned",
      disabled: true
    },
    { key: "OVERDUE", label: "Past task due", count: summary.overdue, detail: "Task due time" },
    {
      key: "BLOCKED_INTERVENTION",
      label: "Blocked intervention",
      count: summary.blocked,
      detail: "Blocked or waiting parts"
    },
    {
      key: "EVIDENCE_REQUIRED",
      label: "Evidence / updates",
      count: summary.missingUpdates,
      detail: "Required submission gaps"
    },
    {
      key: "RETURNED_WORK",
      label: "Returned work",
      count: null,
      detail: "Review cycles planned",
      disabled: true
    },
    {
      key: "WAITING_ON_APPROVAL",
      label: "Waiting approval",
      count: summary.waitingApproval,
      detail: "Decision holding progress"
    },
    {
      key: "READY_FOR_REVIEW",
      label: "Ready for review",
      count: summary.readyReview,
      detail: "Completion decision"
    },
    {
      key: "NEEDS_ASSIGNMENT",
      label: "Needs assignment",
      count: summary.needsAssignment,
      detail: "Claimable work"
    }
  ];

  return (
    <section className="manager-review-command-center" aria-label="Manager Review Command Center">
      <header className="manager-command-header">
        <div className="manager-command-title">
          <h1>Manager Review Command Center</h1>
          <div className="manager-command-live-meta">
            <span>{formatBoardDateLabel(boardDate)}</span>
            <span aria-hidden="true">•</span>
            <span className="manager-command-live-state">
              <i aria-hidden="true" />
              {isRefreshPending ? "Updating operations" : "Live operations"}
            </span>
            {generatedAt ? <span>Board generated {formatDateTime(generatedAt)}</span> : null}
          </div>
        </div>
        <div className="manager-command-header-actions">
          <button
            aria-expanded={showReviewHealth}
            className="manager-command-button"
            onClick={() => setShowReviewHealth((current) => !current)}
            type="button"
          >
            <Gauge aria-hidden="true" size={16} />
            Review health
          </button>
          <Link className="manager-command-button manager-command-button-primary" href="/tasks?create=1">
            <Plus aria-hidden="true" size={16} />
            Create directive
          </Link>
          <Link className="manager-command-button" href={fullBoardHref}>
            <ClipboardCheck aria-hidden="true" size={16} />
            Open board
          </Link>
          <button className="manager-command-button" onClick={refreshQueue} type="button">
            <RefreshCw aria-hidden="true" size={16} />
            Refresh
          </button>
        </div>
      </header>

      <div className="manager-command-toolbar">
        <label className="manager-command-search">
          <span>Search manager work</span>
          <div>
            <Search aria-hidden="true" size={16} />
            <input
              placeholder="Task, vehicle, customer, or owner"
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
        </label>
        <label>
          <span>Workflow</span>
          <select value={workflowFilter} onChange={(event) => setWorkflowFilter(event.target.value)}>
            <option value="ALL">All workflows</option>
            {workflowOptions.map((workflow) => (
              <option key={workflow} value={workflow}>
                {formatStatusLabel(workflow)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Saved view</span>
          <select aria-label="Saved view" defaultValue="LIVE_COMMAND">
            <option value="LIVE_COMMAND">Live Command</option>
          </select>
        </label>
      </div>

      <section className="manager-command-brief" aria-label="Manager operating brief">
        <article>
          <span>Command posture</span>
          <strong>{summary.awaiting > 0 ? `${summary.awaiting} decision${summary.awaiting === 1 ? "" : "s"} waiting` : "Queue controlled"}</strong>
          <small>{summary.critical > 0 ? `${summary.critical} critical priority item${summary.critical === 1 ? "" : "s"}` : "No critical priority waiting"}</small>
        </article>
        <article>
          <span>Operating risk</span>
          <strong>{summary.blocked + summary.overdue}</strong>
          <small>Blocked or past due items requiring attention</small>
        </article>
        <article>
          <span>Decision quality</span>
          <strong>{summary.missingUpdates > 0 ? `${summary.missingUpdates} gap${summary.missingUpdates === 1 ? "" : "s"}` : "Evidence clean"}</strong>
          <small>Submissions with missing decision fields</small>
        </article>
        <article>
          <span>Manager move</span>
          <strong>{summary.awaiting > 0 ? "Work highest risk first" : "Monitor live flow"}</strong>
          <small>{isRefreshPending ? "Refreshing queue now" : "Review health or return to Sales Console"}</small>
        </article>
      </section>

      {summary.critical > 0 ? (
        <div className="manager-command-critical-alert" role="status">
          <div>
            <AlertTriangle aria-hidden="true" size={18} />
            <p>
              <strong>{summary.critical} critical-priority task{summary.critical === 1 ? "" : "s"} require review.</strong>
              <span>Critical risk classification will replace this task-priority proxy after MAE-1 is approved.</span>
            </p>
          </div>
          <button className="manager-command-text-action" onClick={() => selectFilter("CRITICAL")} type="button">
            View critical priorities <ChevronRight aria-hidden="true" size={16} />
          </button>
        </div>
      ) : null}

      <section className="manager-command-summary" aria-label="Manager review summary">
        <button aria-pressed={activeFilter === "ALL"} onClick={() => selectFilter("ALL")} type="button">
          <strong>{summary.awaiting}</strong>
          <span>Awaiting decision</span>
          <small>All current manager work</small>
        </button>
        <button aria-pressed={activeFilter === "CRITICAL"} onClick={() => selectFilter("CRITICAL")} type="button">
          <strong>{summary.critical}</strong>
          <span>Critical priority</span>
          <small>Existing task priority</small>
        </button>
        <button aria-pressed={activeFilter === "OVERDUE"} onClick={() => selectFilter("OVERDUE")} type="button">
          <strong>{summary.overdue}</strong>
          <span>Past task due</span>
          <small>Not review SLA</small>
        </button>
        <button
          aria-pressed={activeFilter === "BLOCKED_INTERVENTION"}
          onClick={() => selectFilter("BLOCKED_INTERVENTION")}
          type="button"
        >
          <strong>{summary.blocked}</strong>
          <span>Blocked</span>
          <small>Includes waiting parts</small>
        </button>
        <button
          aria-pressed={activeFilter === "EVIDENCE_REQUIRED"}
          onClick={() => selectFilter("EVIDENCE_REQUIRED")}
          type="button"
        >
          <strong>{summary.missingUpdates}</strong>
          <span>Submission gaps</span>
          <small>Required update fields</small>
        </button>
        <article aria-label="Returned work planned metric">
          <strong>—</strong>
          <span>Returned work</span>
          <small>Review history planned</small>
        </article>
        <article aria-label="Review SLA planned metric">
          <strong>—</strong>
          <span>Within review SLA</span>
          <small>Review SLA planned</small>
        </article>
      </section>

      {lastActionMessage ? (
        <div className="notice manager-command-success-notice" role="status">
          <p>{lastActionMessage}</p>
        </div>
      ) : null}

      {errorMessage ? (
        <ErrorStateCard
          actions={[{ label: "Refresh", onClick: refreshQueue }]}
          eyebrow="Review queue unavailable"
          message={`${errorMessage} Existing board data may still be available elsewhere in the app.`}
          title="Couldn't load the manager review queue"
        />
      ) : null}

      {!errorMessage && !boardExists ? (
        <EmptyStateCard
          actions={[{ href: fullBoardHref, label: "Open full board", tone: "secondary" }]}
          eyebrow="No board yet"
          message="Generate or open today's board first, then manager-attention work will appear here automatically."
          title="Today's board has not been generated"
        />
      ) : null}

      {!errorMessage && boardExists && commandItems.length === 0 ? (
        <section className="manager-command-clear-state" aria-label="Manager queue clear">
          <div className="manager-command-clear-icon">
            <FileQuestion aria-hidden="true" size={30} />
          </div>
          <div className="manager-command-clear-copy">
            <span>Queue clear</span>
            <h2>The manager queue is clear</h2>
            <p>No approval-ready, blocked, waiting, or claimable work is asking for manager attention right now.</p>
          </div>
          <div className="manager-command-clear-grid">
            <article>
              <strong>Watch next</strong>
              <span>Critical priority, blocked work, past-due work, and submission gaps.</span>
            </article>
            <article>
              <strong>Operating check</strong>
              <span>Use Review Health to confirm team flow, load, and source freshness.</span>
            </article>
            <article>
              <strong>Return path</strong>
              <span>Go back to Sales Console or open the full board when manager work appears.</span>
            </article>
          </div>
          <div className="manager-command-clear-actions">
            <button className="manager-command-button" onClick={() => setShowReviewHealth(true)} type="button">
              <Gauge aria-hidden="true" size={16} />
              Review health
            </button>
            <Link className="manager-command-button" href={fullBoardHref}>Back to board</Link>
          </div>
        </section>
      ) : null}

      {!errorMessage && boardExists && commandItems.length > 0 ? (
        <div className="manager-review-command-layout">
          <nav className="manager-review-command-queue-rail" aria-label="Manager review queues">
            <div className="manager-command-pane-heading">
              <div>
                <strong>Work queues</strong>
                <span>One primary operating intent</span>
              </div>
              <ListFilter aria-hidden="true" size={16} />
            </div>
            <div className="manager-command-queue-list">
              {queueDefinitions.map((queue) => queue.disabled ? (
                <article className="manager-command-queue-button manager-command-queue-planned" key={queue.key}>
                  <span>{queue.label}</span>
                  <strong>{queue.count ?? "—"}</strong>
                  <small>{queue.detail}</small>
                </article>
              ) : (
                <button
                  aria-pressed={activeFilter === queue.key}
                  className="manager-command-queue-button"
                  key={queue.key}
                  onClick={() => selectFilter(queue.key)}
                  type="button"
                >
                  <span>{queue.label}</span>
                  <strong>{queue.count ?? "—"}</strong>
                  <small>{queue.detail}</small>
                </button>
              ))}
            </div>
          </nav>

          <section className="manager-review-command-worklist" aria-label="Ranked manager worklist">
            <div className="manager-command-pane-heading">
              <div>
                <strong>{queueDefinitions.find((queue) => queue.key === activeFilter)?.label ?? "All attention"}</strong>
                <span>
                  {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"} · current task-priority and due-time order
                </span>
              </div>
              <span className="manager-command-order-label">
                <ArrowDownUp aria-hidden="true" size={14} /> Current order
              </span>
            </div>

            <div
              aria-label={activeFilter === "NEEDS_ASSIGNMENT" ? "Needs Assignment queue" : undefined}
              className="manager-command-work-rows"
              role={activeFilter === "NEEDS_ASSIGNMENT" ? "region" : undefined}
            >
              {visibleItems.length ? (
                visibleItems.map((item) => {
                  const dueState = getDueState(item.task, now);
                  const selected = selectedItem?.task.id === item.task.id;

                  return (
                    <button
                      aria-pressed={selected}
                      aria-label={`Select ${item.task.title}`}
                      className="manager-review-command-work-row"
                      key={item.task.id}
                      onClick={() => {
                        setSelectedTaskId(item.task.id);
                        setIsReassignOpen(false);
                      }}
                      type="button"
                    >
                      <span className="manager-command-work-main">
                        <strong>{item.task.title}</strong>
                        <small>{getContextReference(item.task)}</small>
                      </span>
                      <span className="manager-command-work-owner">
                        <strong>{item.task.assignedUser.name}</strong>
                        <small>Current owner: {item.task.assignedUser.name}</small>
                      </span>
                      <span className={`manager-command-due manager-command-due-${dueState.tone}`}>
                        <strong>{dueState.label}</strong>
                        <small>{formatStatusLabel(item.queue)}</small>
                      </span>
                      <span className="manager-command-evidence-state">
                        <strong>
                          {item.requiredUpdateCount
                            ? `${item.completedRequiredUpdateCount}/${item.requiredUpdateCount}`
                            : "Not configured"}
                        </strong>
                        <small>Required updates</small>
                      </span>
                      <span className={`manager-command-priority manager-command-priority-${getPriorityTone(item.task.priority)}`}>
                        {formatStatusLabel(item.task.priority)}
                      </span>
                      <span className="manager-command-work-reason">
                        <Info aria-hidden="true" size={14} />
                        {item.attentionReason}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="manager-command-no-results" role="status">
                  <ListFilter aria-hidden="true" size={20} />
                  <strong>No work matches this view</strong>
                  <span>Change the queue, workflow, or search to continue.</span>
                </div>
              )}
            </div>
          </section>

          <aside className="manager-review-command-workbench" aria-label="Selected review workbench">
            {selectedItem ? (
              <div className="manager-command-workbench-inner">
                <div className="manager-command-selected-header">
                  <div>
                    <span>{formatStatusLabel(selectedItem.queue)}</span>
                    <h2>{selectedItem.task.title}</h2>
                    <p>{getContextReference(selectedItem.task)}</p>
                  </div>
                  <span className={`manager-command-priority manager-command-priority-${getPriorityTone(selectedItem.task.priority)}`}>
                    {formatStatusLabel(selectedItem.task.priority)}
                  </span>
                </div>

                <div className="manager-command-decision-prompt">
                  <span>Decision required</span>
                  <strong>{getDecisionPrompt(selectedItem.queue)}</strong>
                </div>

                <div className="manager-command-workbench-meta">
                  <div>
                    <span>Task due</span>
                    <strong>{formatDateTime(selectedItem.task.dueAt)}</strong>
                    <small>{getDueState(selectedItem.task, now).label}</small>
                  </div>
                  <div>
                    <span>Owner</span>
                    <strong>{selectedItem.task.assignedUser.name}</strong>
                    <small>{selectedItem.task.assignedUser.email ?? "Active staff"}</small>
                  </div>
                  <div>
                    <span>Workflow</span>
                    <strong>{formatStatusLabel(selectedItem.task.workflowArea)}</strong>
                    <small>{formatStatusLabel(selectedItem.task.sourceType)}</small>
                  </div>
                  <div>
                    <span>Last update</span>
                    <strong>{getElapsedAgeCopy(selectedItem.task.updatedAt, now)} ago</strong>
                    <small>{formatDateTime(selectedItem.task.updatedAt)}</small>
                  </div>
                </div>

                {selectedItem.task.description ? (
                  <section className="manager-command-workbench-section">
                    <div className="manager-command-section-heading">
                      <div>
                        <strong>Requested outcome</strong>
                        <span>Current task description</span>
                      </div>
                    </div>
                    <p>{selectedItem.task.description}</p>
                  </section>
                ) : null}

                <section className="manager-command-workbench-section">
                  <div className="manager-command-section-heading">
                    <div>
                      <strong>Definition of done</strong>
                      <span>
                        {selectedItem.requiredUpdateCount
                          ? `${selectedItem.completedRequiredUpdateCount} of ${selectedItem.requiredUpdateCount} required updates complete`
                          : "No structured submission fields configured"}
                      </span>
                    </div>
                  </div>
                  {selectedItem.task.requiredUpdateFields.length ? (
                    <ul className="manager-command-requirement-list">
                      {selectedItem.task.requiredUpdateFields.map((field) => {
                        const complete = isRequiredUpdateComplete(
                          field,
                          selectedItem.task.updateFieldValues[field.key]
                        );
                        const value = selectedItem.task.updateFieldValues[field.key];

                        return (
                          <li className={complete ? "is-complete" : "is-missing"} key={field.key}>
                            {complete ? (
                              <CheckCircle2 aria-hidden="true" size={16} />
                            ) : (
                              <CircleAlert aria-hidden="true" size={16} />
                            )}
                            <span>
                              <strong>{field.label}</strong>
                              <small>
                                {complete
                                  ? typeof value === "boolean"
                                    ? value
                                      ? "Confirmed"
                                      : "Recorded as No"
                                    : String(value)
                                  : field.required
                                    ? "Required update missing"
                                    : "Optional update not supplied"}
                              </small>
                            </span>
                            <em>{complete ? "Ready" : field.required ? "Missing" : "Optional"}</em>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="manager-command-configuration-gap">
                      <Info aria-hidden="true" size={16} />
                      <p>
                        This task has no structured submission fields. Open the task workspace to inspect its checklist,
                        comments, and activity before deciding.
                      </p>
                    </div>
                  )}
                  <Link className="manager-command-text-link" href={`/tasks/${selectedItem.task.id}`}>
                    Open complete task workspace <ChevronRight aria-hidden="true" size={15} />
                  </Link>
                </section>

                <section className="manager-command-explanation">
                  <span>Why this needs attention</span>
                  <strong>{selectedItem.attentionReason}</strong>
                  <p>
                    Current ordering uses authoritative task priority and task due time. MAE-1 risk scoring and review SLA
                    explanations remain planned.
                  </p>
                </section>

                {isReassignOpen ? (
                  <ReassignTaskControl
                    assignableUsers={assignableUsers}
                    key={selectedItem.task.id}
                    onTaskChanged={handleTaskChanged}
                    task={selectedItem.task}
                  />
                ) : null}

                {selectedItem.queue === "READY_FOR_REVIEW" ? (
                  <ReviewDecisionActions
                    item={selectedItem}
                    onTaskRemoved={handleTaskRemoved}
                    onToggleReassign={() => setIsReassignOpen((current) => !current)}
                  />
                ) : (
                  <InterventionControls
                    item={selectedItem}
                    key={selectedItem.task.id}
                    onTaskChanged={handleTaskChanged}
                    onToggleReassign={() => setIsReassignOpen((current) => !current)}
                  />
                )}
              </div>
            ) : (
              <div className="manager-command-no-selection">
                <ShieldCheck aria-hidden="true" size={24} />
                <strong>Select manager work to begin</strong>
                <span>The workbench will show decision context and available actions.</span>
              </div>
            )}
          </aside>
        </div>
      ) : null}

      {initialExecutionHealth.length ? (
        <section
          aria-label="Team Execution Health"
          className={showReviewHealth ? "manager-command-health is-open" : "manager-command-health"}
          hidden={!showReviewHealth}
        >
          <div className="manager-command-health-header">
            <div>
              <span>Explainable operating conditions</span>
              <h2>Team Execution Health</h2>
              <p>Operating facts only—no employee ranking or passive activity scoring.</p>
            </div>
          </div>
          <div className="manager-command-health-grid">
            {initialExecutionHealth.map((item) => (
              <article key={item.staffDayId}>
                <div>
                  <strong>{item.user.name}</strong>
                  <span>{formatStatusLabel(item.condition)}</span>
                </div>
                <p>{item.explanation}</p>
                <small>
                  Active {item.counts.active} · Blocked {item.counts.blocked} · Waiting {item.counts.waiting} · Review{" "}
                  {item.counts.readyForReview} · Carryover {item.counts.carryover}
                </small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="manager-command-footer">
        <span>
          <ShieldCheck aria-hidden="true" size={14} /> Existing actions remain server-authorized and activity-backed.
        </span>
        <span>
          {generationStatus ? formatStatusLabel(generationStatus) : "Board not generated"} · {summary.awaiting} active manager
          items
        </span>
      </footer>
    </section>
  );
}
