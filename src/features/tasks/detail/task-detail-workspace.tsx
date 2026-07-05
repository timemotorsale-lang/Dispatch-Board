import Link from "next/link";

import type { ActiveUserSummary } from "@/server/services/user-summary";
import type { ActivityFeedEvent } from "@/server/services/activity-feed";
import type { TaskReadModel } from "@/server/services/task-read";
import { TaskAssignmentPanel } from "@/features/tasks/task-assignment-panel";
import { TaskStatusPanel } from "@/features/tasks/task-status-panel";
import {
  buildAssociatedUnit,
  buildDefinitionOfDone,
  buildPlanningFields,
  buildSubtasks,
  buildTaskActivity,
  buildTaskTags,
  formatTaskDisplayNumber,
  formatTaskDetailDateTime,
  formatTaskEnumLabel
} from "@/features/tasks/detail/task-detail-mappers";
import { TaskMetadataPanel } from "@/features/tasks/detail/task-metadata-panel";
import { TaskWorkspaceExecutionPanels } from "@/features/tasks/detail/task-workspace-execution-panels";

type TaskDetailWorkspaceProps = {
  activityEvents: ActivityFeedEvent[];
  actorIsManager: boolean;
  assignableUsers: ActiveUserSummary[];
  canComment: boolean;
  canUpdateStatus: boolean;
  task: TaskReadModel;
};

export function TaskDetailWorkspace({
  activityEvents,
  actorIsManager,
  assignableUsers,
  canComment,
  canUpdateStatus,
  task
}: TaskDetailWorkspaceProps) {
  const definitionOfDone = buildDefinitionOfDone(task);
  const subtasks = buildSubtasks(task);
  const tags = buildTaskTags(task);
  const associatedUnit = buildAssociatedUnit(task);
  const planning = buildPlanningFields(task);
  const feedItems = buildTaskActivity(activityEvents, task);
  const taskDisplayNumber = formatTaskDisplayNumber(task.id);
  const workStreamLabel =
    task.workflowArea === "GENERAL_MANAGER" ? "Service Dept." : formatTaskEnumLabel(task.workflowArea);

  return (
    <section className="page-stack dashboard-page board-page task-detail-page task-workspace-page">
      <div className="task-workspace-shell">
        <header className="task-workspace-topbar">
          <div className="task-workspace-branding">
            <strong>Time Motor Sales</strong>
            <span>Dispatch Board</span>
          </div>
          <div className="task-workspace-topbar-actions">
            <Link className="pill pill-secondary" href="/tasks">
              Back to Task List
            </Link>
            <Link className="pill pill-primary" href={`/board?date=${encodeURIComponent(task.boardDate)}`}>
              Split View
            </Link>
          </div>
        </header>

        <div className="task-workspace-body">
          <section className="task-workspace-main">
            <div className="task-workspace-header">
              <div>
                <span className="task-workspace-breadcrumb">
                  Time Motor Sales Dispatch Board
                </span>
                <div className="task-workspace-record-line">
                  <span className="task-workspace-ticket-pill">{taskDisplayNumber}</span>
                  <span>{workStreamLabel}</span>
                  <span>{task.createdAt.slice(0, 10)}</span>
                </div>
                <h1>{task.title}</h1>
              </div>
              <div className="task-workspace-header-chips">
                <span className={task.status === "BLOCKED" ? "enterprise-status-chip enterprise-status-chip-danger" : "enterprise-status-chip enterprise-status-chip-default"}>
                  {formatTaskEnumLabel(task.status)}
                </span>
                <span className="enterprise-priority-chip enterprise-priority-chip-high">
                  {planning.priority}
                </span>
              </div>
            </div>

            <div className="task-workspace-grid">
              <section className="enterprise-detail-card enterprise-workspace-module">
                <div className="enterprise-workspace-module-header">
                  <strong>Description</strong>
                  <span>{definitionOfDone.filter((item) => item.completed).length}/{definitionOfDone.length}</span>
                </div>
                <div className="task-workspace-description-copy">
                  <p>{task.description ?? "No description has been added to this task yet."}</p>
                  {task.vehicleReference ? <p>{task.vehicleReference}</p> : null}
                  {task.customerReference ? <p>{task.customerReference}</p> : null}
                </div>
                <div className="task-workspace-definition-of-done">
                  <span className="task-workspace-inline-note">
                    Definition of Done is tracked as a live checklist in the execution workspace below.
                  </span>
                </div>
              </section>

              <TaskWorkspaceExecutionPanels
                canComment={canComment}
                definitionOfDone={definitionOfDone}
                initialFeedItems={feedItems}
                subtasks={subtasks}
                taskId={task.id}
              />

              <div className="task-workspace-main-actions">
                <TaskStatusPanel actorIsManager={actorIsManager} canUpdate={canUpdateStatus} task={task} />
              </div>

              <section className="enterprise-detail-card enterprise-workspace-module task-workspace-attachments">
                <div className="enterprise-workspace-module-header">
                  <strong>Attachments</strong>
                  <span>Files & Media</span>
                </div>
                <div className="task-workspace-dropzone">
                  <p>Upload photos/files here</p>
                  <small>
                    Attachment persistence is not available yet in the current backend, so this remains a UI shell for now.
                  </small>
                  <button className="pill pill-secondary" disabled type="button">
                    Upload coming soon
                  </button>
                </div>
              </section>
            </div>
          </section>

          <aside className="task-workspace-rail">
            <div className="task-workspace-rail-header">
              <div>
                <strong>Metadata & Configuration</strong>
                <span>Operational task record</span>
              </div>
            </div>

            <section className="enterprise-detail-card task-workspace-rail-card">
              <span className="task-workspace-rail-eyebrow">Ticket</span>
              <h2>Ticket Details</h2>
              <div className="task-workspace-field-grid">
                <label className="field">
                  <span>Number</span>
                  <div className="task-workspace-static-field task-workspace-id-field" title={taskDisplayNumber}>
                    {taskDisplayNumber}
                  </div>
                </label>
                <label className="field">
                  <span>Opened</span>
                  <div className="task-workspace-static-field">{task.createdAt.slice(0, 10)}</div>
                </label>
                <label className="field">
                  <span>Work Stream</span>
                  <div className="task-workspace-static-field">{workStreamLabel}</div>
                </label>
                <label className="field">
                  <span>Stock #</span>
                  <div className="task-workspace-static-field">{task.vehicleReference ?? "Not linked"}</div>
                </label>
              </div>
            </section>

            <section className="enterprise-detail-card task-workspace-rail-card">
              <span className="task-workspace-rail-eyebrow">Ownership</span>
              <h2>People</h2>
              {actorIsManager ? (
                <TaskAssignmentPanel assignableUsers={assignableUsers} task={task} />
              ) : (
                <div className="task-workspace-readonly-group">
                  <strong>Assignee</strong>
                  <p>{task.assignedUser.name}</p>
                  <strong>Collaborators</strong>
                  <p>Collaborator editing is not available yet in the current backend.</p>
                </div>
              )}
            </section>

            <section className="enterprise-detail-card task-workspace-rail-card">
              <span className="task-workspace-rail-eyebrow">Schedule</span>
              <h2>Dates</h2>
              <div className="task-workspace-field-grid">
                <label className="field">
                  <span>Start Date</span>
                  <div className="task-workspace-static-field">{task.createdAt.slice(0, 10)}</div>
                </label>
                <label className="field">
                  <span>Due Date</span>
                  <div className="task-workspace-static-field">{task.dueAt.slice(0, 10)}</div>
                </label>
              </div>
            </section>

            <TaskMetadataPanel actorIsManager={actorIsManager} task={task} />

            <section className="enterprise-detail-card task-workspace-rail-card">
              <span className="task-workspace-rail-eyebrow">Classification</span>
              <h2>Tags & Classification</h2>
              <div className="task-workspace-tag-row">
                {tags.map((tag) => (
                  <span className="board-chip" key={tag.id}>{tag.label}</span>
                ))}
              </div>
              <p className="task-workspace-rail-note">Structured tag persistence is a future backend enhancement.</p>
            </section>

            <section className="enterprise-detail-card task-workspace-rail-card">
              <span className="task-workspace-rail-eyebrow">Unit</span>
              <h2>Associated Unit</h2>
              {associatedUnit ? (
                <div className="task-workspace-associated-unit">
                  <strong>{associatedUnit.summary}</strong>
                  {associatedUnit.stockNumber ? <span>Stock: {associatedUnit.stockNumber}</span> : null}
                  {associatedUnit.vin ? <span>VIN: {associatedUnit.vin}</span> : null}
                  {associatedUnit.ownershipType ? <small>{associatedUnit.ownershipType === "internal" ? "Internal unit" : "Customer-owned"}</small> : null}
                </div>
              ) : (
                <p className="task-workspace-rail-note">No unit is linked to this task.</p>
              )}
            </section>

            <section className="enterprise-detail-card task-workspace-rail-card">
              <span className="task-workspace-rail-eyebrow">Planning</span>
              <h2>Planning</h2>
              <div className="task-workspace-field-grid">
                <label className="field">
                  <span>Priority</span>
                  <div className="task-workspace-static-field">{planning.priority}</div>
                </label>
                <label className="field">
                  <span>Estimated Time</span>
                  <div className="task-workspace-static-field">{planning.estimatedTime}</div>
                </label>
                <label className="field">
                  <span>Actual Time</span>
                  <div className="task-workspace-static-field">{planning.actualTime}</div>
                </label>
                {planning.maxRecommendedBidCap ? (
                  <label className="field">
                    <span>Max Recommended Bid/Cap</span>
                    <div className="task-workspace-static-field">{planning.maxRecommendedBidCap}</div>
                  </label>
                ) : null}
              </div>
            </section>

            <section className="enterprise-detail-card task-workspace-rail-card">
              <span className="task-workspace-rail-eyebrow">Timeline</span>
              <h2>Recent Timing</h2>
              <div className="task-workspace-readonly-group">
                <strong>Updated</strong>
                <p>{formatTaskDetailDateTime(task.updatedAt)}</p>
                <strong>Ready for Review</strong>
                <p>{task.readyForReviewAt ? formatTaskDetailDateTime(task.readyForReviewAt) : "Not yet"}</p>
                <strong>Completed</strong>
                <p>{task.completedAt ? formatTaskDetailDateTime(task.completedAt) : "Not completed"}</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
