import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  CalendarDays,
  CarFront,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  FileText,
  Gauge,
  Grid3X3,
  Home,
  Mail,
  Megaphone,
  MessageCircle,
  MessageSquareText,
  Phone,
  Settings,
  ShieldAlert,
  UserRound,
  UsersRound,
  WalletCards,
  Wrench
} from "lucide-react";
import Link from "next/link";

import type { ActivityFeedEvent } from "@/server/services/activity-feed";
import type { ActiveUserSummary } from "@/server/services/user-summary";
import type { TaskReadModel } from "@/server/services/task-read";
import { TaskAssignmentPanel } from "@/features/tasks/task-assignment-panel";
import { TaskStatusPanel } from "@/features/tasks/task-status-panel";
import {
  buildAssociatedUnit,
  buildDefinitionOfDone,
  buildSubtasks,
  buildPlanningFields,
  buildTaskActivity,
  buildTaskTags,
  formatTaskDetailDateTime,
  formatTaskDisplayNumber,
  formatTaskEnumLabel
} from "@/features/tasks/detail/task-detail-mappers";
import { TaskAppointmentPanel } from "@/features/tasks/detail/task-appointment-panel";
import { TaskCollaboratorPanel } from "@/features/tasks/detail/task-collaborator-panel";
import { TaskMetadataPanel } from "@/features/tasks/detail/task-metadata-panel";
import { TaskResolutionAccordion } from "@/features/tasks/detail/task-resolution-accordion";
import { TaskWorkbenchActionBar } from "@/features/tasks/detail/task-workbench-action-bar";
import { TaskUpdatesCommentsCard } from "@/features/tasks/detail/task-updates-comments-card";
import type { TaskCompletionReadiness } from "@/server/services/task-execution-readiness";

type TaskDetailWorkspaceProps = {
  activityEvents: ActivityFeedEvent[];
  actorIsManager: boolean;
  assignableUsers: ActiveUserSummary[];
  canComment: boolean;
  canManageCollaborators: boolean;
  canCreateAppointment: boolean;
  canUpdateStatus: boolean;
  readiness?: TaskCompletionReadiness | null;
  returnTo?: string;
  task: TaskReadModel;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === "COMPLETED") return "complete";
  if (status === "BLOCKED" || status === "ESCALATED") return "danger";
  if (status === "IN_PROGRESS" || status === "READY_FOR_REVIEW") return "active";
  return "pending";
}

export function TaskDetailWorkspace({
  activityEvents,
  actorIsManager,
  assignableUsers,
  canComment,
  canManageCollaborators,
  canCreateAppointment,
  canUpdateStatus,
  readiness = null,
  returnTo = "/tasks",
  task
}: TaskDetailWorkspaceProps) {
  const concern = task.concernWorkspace;
  const checklist = buildDefinitionOfDone(task);
  const subtasks = buildSubtasks(task);
  const feedItems = buildTaskActivity(activityEvents, task);
  const associatedUnit = buildAssociatedUnit(task);
  const planning = buildPlanningFields(task);
  const tags = buildTaskTags(task);
  const recordNumber = concern?.concernNumber ?? formatTaskDisplayNumber(task.id);
  const recordTitle = concern?.title ?? task.title;
  const recordDescription = concern?.description ?? task.description ?? "No case summary has been recorded.";
  const dueAt = concern?.dueAt ?? task.dueAt;
  const overdueDays = Math.max(0, Math.floor((new Date(task.updatedAt).getTime() - new Date(dueAt).getTime()) / 86_400_000));
  const resolutionTasks = concern?.tasks ?? [{
    id: task.id,
    stepCode: "PRIMARY_TASK",
    sortOrder: 1,
    title: task.title,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt,
    required: true,
    requiresManagerApproval: task.requiresManagerApproval,
    dependsOnStepCodes: [],
    completionCriteria: task.description ?? "Complete the task and record the result.",
    assignedUser: task.assignedUser,
    checklistCompleted: checklist.filter((item) => item.completed).length,
    checklistTotal: checklist.length
  }];

  return (
    <section className="enterprise-task-workbench" aria-label="Enterprise task workbench">
      <aside className="etw-local-sidebar" aria-label="Task workbench navigation">
        <div className="etw-local-brand"><ClipboardCheck size={20} /><strong>Workbench</strong></div>
        <nav>
          <Link className="active" href={`/tasks/${encodeURIComponent(task.id)}`}><Grid3X3 size={15} />Workbench</Link>
          <Link href="/my-tasks"><CalendarDays size={15} />My Day</Link>
          <Link href="/tasks"><ClipboardCheck size={15} />Tasks</Link>
          <Link href="/tasks?queue=concerns"><ShieldAlert size={15} />Cases</Link>
          <Link href="/manager-review"><CheckCircle2 size={15} />Approvals</Link>
          <Link href="/appointments"><CalendarDays size={15} />Calendar</Link>
          <Link href="/activity"><Activity size={15} />Activity Feed</Link>
          <Link href="/customers"><UsersRound size={15} />Customers</Link>
          <Link href="/vehicles"><CarFront size={15} />Vehicles</Link>
          <Link href="/reports"><ChartNoAxesCombined size={15} />Reports</Link>
        </nav>
        <section>
          <strong>Quick Actions</strong>
          <Link href="/tasks?concern=1"><AlertTriangle size={14} />Log Concern</Link>
          <Link href={`/tasks/intake?returnTo=${encodeURIComponent(`/tasks/${task.id}`)}`}><ClipboardCheck size={14} />Task Intake</Link>
          <a href="#notes"><MessageSquareText size={14} />Add Note</a>
          <a href="#documents"><FileText size={14} />Upload Doc</a>
          <a href="#customer-comms"><Mail size={14} />Send Update</a>
          <Link href="/appointments"><CalendarDays size={14} />Schedule Follow-up</Link>
        </section>
      </aside>
      <header className="etw-command-bar">
        <div className="etw-brand"><ClipboardCheck size={20} /><div><strong>Time Motor Sales</strong><span>Task Resolution Workbench</span></div></div>
        <label className="etw-search"><span aria-hidden="true">/</span><input aria-label="Search workbench" placeholder="Search customers, vehicles, tasks, cases, VIN, anything..." /></label>
        <div className="etw-command-actions"><Link href={returnTo}>Return to Tasks</Link><Link className="etw-new-action" href="/tasks?create=1">+ New</Link></div>
      </header>

      <nav className="etw-module-nav" aria-label="Workbench modules">
        <Link href="/board"><Home size={15} />Home</Link><Link href="/board"><Grid3X3 size={15} />Dispatch Board</Link><Link className="active" href="/tasks"><ClipboardCheck size={15} />Cases &amp; Tasks</Link><Link href="/vehicles"><CarFront size={15} />Inventory</Link><Link href="/tasks?department=SALES"><BadgeDollarSign size={15} />Sales</Link><Link href="/customers"><UsersRound size={15} />Customers</Link><Link href="/tasks?department=ADVERTISING"><Megaphone size={15} />Marketing</Link><Link href="/tasks?department=COLLECTIONS"><WalletCards size={15} />Collections</Link><Link href="/tasks?department=SHOP"><Wrench size={15} />Repair Shop</Link><Link href="/reports"><ChartNoAxesCombined size={15} />Reports</Link><Link href="/admin"><Settings size={15} />Admin</Link>
      </nav>

      <div className="etw-breadcrumb"><Link href={returnTo}>Cases &amp; Tasks</Link><ChevronRight size={13} /><span>Case #{recordNumber}</span></div>
      <TaskWorkbenchActionBar canComplete={canUpdateStatus} returnTo={returnTo} status={task.status} taskId={task.id} />

      <div className="etw-layout">
        <aside className="etw-context-rail">
          <section className="etw-card etw-record-card">
            <div className="etw-record-heading"><span className="etw-alert-icon"><AlertTriangle size={18} /></span><div><h1>{recordTitle}</h1><span>Case #{recordNumber}</span></div><b>{formatTaskEnumLabel(concern?.priority ?? task.priority)}</b></div>
            <dl className="etw-facts">
              <div><dt>Status</dt><dd><span className={`etw-status etw-status-${statusTone(concern?.status ?? task.status)}`}>{formatTaskEnumLabel(concern?.status ?? task.status)}</span></dd></div>
              <div><dt>Severity</dt><dd>{formatTaskEnumLabel(concern?.priority ?? task.priority)}</dd></div>
              <div><dt>SLA</dt><dd className={overdueDays ? "etw-danger-text" : undefined}>{overdueDays ? `Overdue (${overdueDays} days)` : `Due ${dateLabel(dueAt)}`}</dd></div>
              <div><dt>Created</dt><dd>{formatTaskDetailDateTime(concern?.createdAt ?? task.createdAt)}</dd></div>
              <div><dt>Reported By</dt><dd>{concern?.reportedByUser.name ?? task.createdByUser?.name ?? "System"}</dd></div>
              <div><dt>Owner</dt><dd>{concern?.assignedOwner?.name ?? task.assignedUser.name}</dd></div>
              <div><dt>Manager Review</dt><dd>{resolutionTasks.some((item) => item.requiresManagerApproval) ? "Required" : "Not required"}</dd></div>
              <div><dt>Estimated Time</dt><dd>{planning.estimatedTime}</dd></div>
              <div><dt>Escalation</dt><dd>{concern?.escalationRequired ? "Monitored" : "Standard"}</dd></div>
            </dl>
          </section>

          <section className="etw-card"><h2><UsersRound size={16} /> Customer &amp; Vehicle</h2><dl className="etw-facts compact"><div><dt>Customer</dt><dd>{concern?.customerReference ?? task.customerReference ?? "Not linked"}</dd></div><div><dt>Vehicle</dt><dd>{concern?.vehicleReference ?? task.vehicleReference ?? "Not linked"}</dd></div>{associatedUnit?.stockNumber ? <div><dt>Stock / Unit</dt><dd>{associatedUnit.stockNumber}</dd></div> : null}<div><dt>Current Delay</dt><dd className={overdueDays ? "etw-danger-text" : undefined}>{overdueDays ? `${overdueDays} days` : "Within SLA"}</dd></div></dl></section>
          <div id="task-collaborators"><TaskCollaboratorPanel canManage={canManageCollaborators} staff={assignableUsers} task={task} /></div>
          <section className="etw-card"><h2><FileText size={16} /> Case Summary</h2><p className="etw-summary">{recordDescription}</p></section>
          <section className="etw-card"><h2>Tags</h2><div className="etw-tags">{tags.map((tag) => <span key={tag.id}>{tag.label}</span>)}</div></section>
          <TaskMetadataPanel actorIsManager={actorIsManager} task={task} />
        </aside>

        <main className="etw-main">
          <nav className="etw-tabs" aria-label="Workbench sections"><a className="active" href="#overview">Overview</a><a href="#resolution-tasks">Tasks ({resolutionTasks.length})</a><a href="#selected-checklist">Checklist</a><a href="#timeline">Timeline</a><a href="#documents">Documents</a><a href="#notes">Notes ({task.comments.length})</a><a href="#customer-comms">Customer Comms</a><a href="#approvals">Approvals</a></nav>

          <section className="etw-lifecycle" id="overview" aria-label="Resolution lifecycle">
            {["Case Created", "Classified & Scored", "Tasks Generated", "In Progress", "Manager Review", "Resolved", "Closed"].map((label, index) => {
              const reached = index < 3 || task.status !== "NOT_STARTED" && index === 3 || task.readyForReviewAt && index === 4 || task.status === "COMPLETED" && index <= 6;
              return <div className={reached ? "reached" : ""} key={label}><span>{reached ? <CheckCircle2 size={14} /> : <Circle size={13} />}</span><b>{label}</b><small>{index < 3 ? formatTaskDetailDateTime(concern?.createdAt ?? task.createdAt) : ""}</small></div>;
            })}
          </section>

          <TaskResolutionAccordion checklist={checklist} concernId={concern?.id ?? null} selectedTaskDescription={task.description} selectedTaskId={task.id} subtasks={subtasks} tasks={resolutionTasks} />

          <section id="notes"><TaskUpdatesCommentsCard canComment={canComment} compact initialFeedItems={feedItems} taskId={task.id} /></section>
        </main>

        <aside className="etw-command-rail">
          <section className="etw-card etw-risk-card"><h2><ShieldAlert size={16} /> SLA &amp; Risk</h2><div className="etw-risk-grid"><div><span>SLA Clock</span><strong>{overdueDays || "On"}</strong><small>{overdueDays ? "Days Overdue" : "Track"}</small></div><div className="etw-risk-ring" style={{ "--risk": `${Math.max(12, Math.min(96, overdueDays * 4 + (concern?.escalationRequired ? 35 : 12)))}%` } as React.CSSProperties}><b>{concern?.escalationRequired ? "High" : "Active"}</b><span>Risk</span></div></div><p>Impact: <b>{formatTaskEnumLabel(concern?.priority ?? task.priority)}</b></p><p>Compliance Risk: <b>{concern?.escalationRequired ? "High" : "Monitored"}</b></p></section>
          <section className="etw-card" id="timeline"><h2><Activity size={16} /> Activity Feed</h2><div className="etw-side-feed">{feedItems.slice(0, 6).map((item) => <article key={item.id}><span /><div><small>{formatTaskDetailDateTime(item.createdAt)}</small><b>{item.message}</b><em>{item.actorName}</em></div></article>)}{feedItems.length === 0 ? <p>No activity recorded yet.</p> : null}</div></section>
          <section className="etw-card" id="approvals"><h2><Gauge size={16} /> Workflow Command</h2><TaskStatusPanel actorIsManager={actorIsManager} canUpdate={canUpdateStatus} initialReadiness={readiness} task={task} /></section>
          {actorIsManager ? <section className="etw-card etw-assignment-card"><h2><UserRound size={16} /> Ownership</h2><TaskAssignmentPanel assignableUsers={assignableUsers} task={task} /></section> : null}
          <section id="customer-comms"><TaskAppointmentPanel canCreateAppointment={canCreateAppointment} task={task} /></section>
          <section className="etw-card" id="documents"><h2><FileText size={16} /> Documents</h2><div className="etw-document-shell"><p>No documents are linked to this task yet.</p><button disabled type="button">+ Upload coming soon</button></div></section>
          <section className="etw-card etw-communication-card"><h2><MessageSquareText size={16} /> Customer Communication</h2><div className="etw-communication-channels"><button aria-label="WhatsApp customer" disabled type="button"><MessageCircle size={18} /></button><button aria-label="Call customer" disabled type="button"><Phone size={18} /></button><button aria-label="Email customer" disabled type="button"><Mail size={18} /></button></div><p>{task.customerReference ? `Last update for ${task.customerReference}` : "Link a customer to enable direct communication."}</p><span className="etw-update-sent">Update Sent</span><button disabled type="button">Send Customer Update</button></section>
        </aside>
      </div>
    </section>
  );
}
