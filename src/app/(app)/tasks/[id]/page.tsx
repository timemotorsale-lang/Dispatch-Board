import Link from "next/link";
import { notFound } from "next/navigation";

import { TaskAssignmentPanel } from "@/features/tasks/task-assignment-panel";
import { TaskCommentsPanel } from "@/features/tasks/task-comments-panel";
import { TaskStatusPanel } from "@/features/tasks/task-status-panel";
import { canUpdateAssignedWork } from "@/server/policies/access";
import { requireCurrentUser } from "@/server/auth/current-user";
import { isManager } from "@/server/policies/access";
import { getTaskReadModelById } from "@/server/services/task-read";
import { listActiveUserSummaries } from "@/server/services/user-summary";

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

type TaskDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const task = await getTaskReadModelById(user, id);

  if (!task) {
    notFound();
  }

  const canComment = canUpdateAssignedWork({
    actor: user,
    assignedUserId: task.assignedUser.id,
    requiresManagerApproval: task.requiresManagerApproval,
    requestedAction: "comment"
  });
  const actorIsManager = isManager(user);
  const canUpdateStatus = actorIsManager || user.id === task.assignedUser.id;
  const assignableUsers = actorIsManager ? await listActiveUserSummaries() : [];

  return (
    <section className="page-stack dashboard-page board-page task-detail-page">
      <div className="dashboard-page-header">
        <div className="dashboard-page-copy">
          <span className="eyebrow">Task detail</span>
          <h1>{task.title}</h1>
          <p>Single-task context for the existing workflow without duplicating the board.</p>
          <div className="board-page-meta">
            <span className="board-page-date-pill">{formatStatusLabel(task.status)}</span>
            <span className="status-badge status-badge-muted">{formatStatusLabel(task.workflowArea)}</span>
          </div>
        </div>

        <div className="board-toolbar">
          <div className="board-toolbar-actions">
            <Link className="pill pill-secondary" href="/my-tasks">
              Back to My Tasks
            </Link>
            <Link className="pill pill-primary" href={`/board?date=${encodeURIComponent(task.boardDate)}`}>
              Open board
            </Link>
          </div>
        </div>
      </div>

      <div className="panel-grid task-detail-grid">
        <article className="panel-card">
          <strong>Work details</strong>
          <h2>Task summary</h2>
          <dl className="task-detail-list">
            <div>
              <dt>Description</dt>
              <dd>{task.description ?? "No description added."}</dd>
            </div>
            <div>
              <dt>Due</dt>
              <dd>{formatDateTime(task.dueAt)}</dd>
            </div>
            <div>
              <dt>Assigned to</dt>
              <dd>{task.assignedUser.name}</dd>
            </div>
            <div>
              <dt>Board date</dt>
              <dd>{task.boardDate}</dd>
            </div>
          </dl>
        </article>

        <article className="panel-card">
          <strong>References</strong>
          <h2>Context</h2>
          <dl className="task-detail-list">
            <div>
              <dt>Vehicle</dt>
              <dd>{task.vehicleReference ?? "None"}</dd>
            </div>
            <div>
              <dt>Customer</dt>
              <dd>{task.customerReference ?? "None"}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{formatStatusLabel(task.sourceType)}</dd>
            </div>
            <div>
              <dt>Manager approval</dt>
              <dd>{task.requiresManagerApproval ? "Required" : "Not required"}</dd>
            </div>
          </dl>
        </article>
      </div>

      <article className="panel-card">
        <strong>Timeline</strong>
        <h2>Workflow status</h2>
        <dl className="task-detail-list">
          <div>
            <dt>Status</dt>
            <dd>{formatStatusLabel(task.status)}</dd>
          </div>
          <div>
            <dt>Blocked reason</dt>
            <dd>{task.blockerReason ?? "None"}</dd>
          </div>
          <div>
            <dt>Ready for review</dt>
            <dd>{task.readyForReviewAt ? formatDateTime(task.readyForReviewAt) : "Not yet"}</dd>
          </div>
          <div>
            <dt>Completed</dt>
            <dd>{task.completedAt ? formatDateTime(task.completedAt) : "Not completed"}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatDateTime(task.updatedAt)}</dd>
          </div>
        </dl>
      </article>

      <TaskStatusPanel actorIsManager={actorIsManager} canUpdate={canUpdateStatus} task={task} />
      {actorIsManager ? <TaskAssignmentPanel assignableUsers={assignableUsers} task={task} /> : null}
      <TaskCommentsPanel canComment={canComment} initialComments={task.comments} taskId={task.id} />
    </section>
  );
}
