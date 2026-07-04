import Link from "next/link";
import { notFound } from "next/navigation";

import { TaskActivityPanel } from "@/features/tasks/task-activity-panel";
import { TaskAssignmentPanel } from "@/features/tasks/task-assignment-panel";
import { TaskCommentsPanel } from "@/features/tasks/task-comments-panel";
import { TaskStatusPanel } from "@/features/tasks/task-status-panel";
import { requireCurrentUser } from "@/server/auth/current-user";
import { canCommentOnTask, isManager } from "@/server/policies/access";
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

function formatCriteriaMode(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (match) => match.toUpperCase());
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

  const canComment = canCommentOnTask(user);
  const actorIsManager = isManager(user);
  const canUpdateStatus = actorIsManager || user.id === task.assignedUser.id;
  const assignableUsers = actorIsManager ? await listActiveUserSummaries() : [];
  const checklistLabels = new Map(task.checklistItems.map((item) => [item.key, item.label]));
  const updateFieldLabels = new Map(task.requiredUpdateFields.map((field) => [field.key, field.label]));
  const showManagerReviewSection =
    task.requiresManagerApproval || Boolean(task.readyForReviewAt) || Boolean(task.reviewedByUser);

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

      <div className="panel-grid task-detail-grid">
        <article className="panel-card">
          <strong>SOP guide</strong>
          <h2>Checklist and completion</h2>
          {task.checklistItems.length === 0 && !task.completionCriteria ? (
            <p className="task-comments-readonly-copy">
              No checklist or completion criteria were captured on this task snapshot.
            </p>
          ) : (
            <div className="task-detail-section-stack">
              {task.checklistItems.length > 0 ? (
                <section className="task-detail-guidance-card">
                  <div className="task-detail-guidance-header">
                    <strong>SOP checklist</strong>
                    <span>{task.checklistItems.length} item(s)</span>
                  </div>
                  <ul className="task-detail-checklist">
                    {task.checklistItems.map((item) => (
                      <li key={item.key}>
                        <div>
                          <span>{item.label}</span>
                          {item.required ? <small>Required</small> : <small>Optional</small>}
                        </div>
                        {item.description ? <p>{item.description}</p> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {task.completionCriteria ? (
                <section className="task-detail-guidance-card">
                  <div className="task-detail-guidance-header">
                    <strong>Completion criteria</strong>
                    <span>{formatCriteriaMode(task.completionCriteria.mode)}</span>
                  </div>
                  <dl className="task-detail-list">
                    <div>
                      <dt>Checklist items required</dt>
                      <dd>
                        {task.completionCriteria.requiredChecklistKeys.length > 0
                          ? task.completionCriteria.requiredChecklistKeys
                              .map((key) => checklistLabels.get(key) ?? key)
                              .join(", ")
                          : "None"}
                      </dd>
                    </div>
                    <div>
                      <dt>Update fields required</dt>
                      <dd>
                        {task.completionCriteria.requiredFieldKeys.length > 0
                          ? task.completionCriteria.requiredFieldKeys
                              .map((key) => updateFieldLabels.get(key) ?? key)
                              .join(", ")
                          : "None"}
                      </dd>
                    </div>
                  </dl>
                </section>
              ) : null}
            </div>
          )}
        </article>

        {showManagerReviewSection ? (
          <article className="panel-card">
            <strong>Manager review</strong>
            <h2>Approval and escalation</h2>
            <dl className="task-detail-list">
              <div>
                <dt>Approval path</dt>
                <dd>
                  {task.requiresManagerApproval
                    ? "Manager review is required before final completion."
                    : "This task can complete without manager review."}
                </dd>
              </div>
              <div>
                <dt>Review rule</dt>
                <dd>
                  {task.approvalRules?.readyForReviewRequired
                    ? "Must move through Ready for Review."
                    : "No ready-for-review rule captured."}
                </dd>
              </div>
              <div>
                <dt>Ready for review</dt>
                <dd>{task.readyForReviewAt ? formatDateTime(task.readyForReviewAt) : "Not yet"}</dd>
              </div>
              <div>
                <dt>Reviewed by</dt>
                <dd>{task.reviewedByUser?.name ?? "Not reviewed yet"}</dd>
              </div>
              <div>
                <dt>Intelligence signal</dt>
                <dd>{task.intelligenceSignalType ?? "None"}</dd>
              </div>
            </dl>
          </article>
        ) : null}
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
      <TaskActivityPanel events={task.activityHistory} />
      <TaskCommentsPanel canComment={canComment} initialComments={task.comments} taskId={task.id} />
    </section>
  );
}
