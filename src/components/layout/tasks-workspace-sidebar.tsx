"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, CircleDot, Clock3, Inbox, ListChecks, LogOut, PackageSearch, ShieldQuestion, UserRoundCheck, UsersRound, Wrench, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";
import { LogoutButton } from "@/features/auth/logout-button";
import type { AuthenticatedUser } from "@/server/auth/store";
import { isManager } from "@/server/policies/access";

type Props = { compact: boolean; isOpen: boolean; onClose(): void; user: AuthenticatedUser };

const workViews = [
  { href: "/tasks?queue=ALL", key: "team", label: "Team Queue", icon: UsersRound },
  { href: "/my-tasks", key: "mine", label: "My Tasks", icon: UserRoundCheck },
  { href: "/tasks?view=available", key: "available", label: "Available Work", icon: PackageSearch },
  { href: "/tasks?view=my-requests", key: "my-requests", label: "My Requests", icon: Inbox },
  { href: "/tasks?view=needs-help", key: "needs-help", label: "Needs Help", icon: ShieldQuestion },
  { href: "/tasks?view=manager-requests", key: "manager-requests", label: "Assignment Requests", icon: ListChecks, managerOnly: true }
];

const statusViews = [
  { href: "/tasks?queue=NOT_STARTED", key: "NOT_STARTED", label: "Not Started", icon: CircleDot },
  { href: "/tasks?queue=IN_PROGRESS", key: "IN_PROGRESS", label: "In Progress", icon: Wrench },
  { href: "/tasks?queue=BLOCKED", key: "BLOCKED", label: "Blocked", icon: AlertTriangle },
  { href: "/tasks?queue=WAITING", key: "WAITING", label: "Waiting", icon: Clock3 },
  { href: "/tasks?queue=READY_FOR_REVIEW", key: "READY_FOR_REVIEW", label: "Ready for Review", icon: ListChecks },
  { href: "/tasks?queue=OVERDUE", key: "OVERDUE", label: "Overdue", icon: AlertTriangle },
  { href: "/tasks?queue=COMPLETED", key: "COMPLETED", label: "Completed", icon: CheckCircle2 }
];

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function TasksWorkspaceSidebar({ compact, isOpen, onClose, user }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view");
  const activeQueue = searchParams.get("queue") ?? (pathname === "/my-tasks" ? "MY_TASKS" : "ALL");

  return (
    <aside className={["app-sidebar", "tasks-workspace-app-sidebar", compact ? "app-sidebar-compact" : "", isOpen ? "app-sidebar-open" : ""].filter(Boolean).join(" ")}>
      <div className="sidebar-brand-row">
        <Link aria-label="Time Motor Sales Tasks Workspace" className="sidebar-brand" href="/tasks" onClick={onClose} title={compact ? "Tasks Workspace" : undefined}>
          <span className="sidebar-logo" aria-hidden="true"><TimeMotorSalesLogo decorative priority variant="mark" /></span>
          <span><strong>TIME MOTOR SALES</strong><small>TASKS WORKSPACE</small></span>
        </Link>
        <button className="sidebar-close" aria-label="Close navigation" onClick={onClose} type="button"><X size={20} /></button>
      </div>

      <div className="sidebar-navigation">
        <section className="sidebar-group">
          <p className="sidebar-group-label">Work views</p>
          <nav aria-label="Task work views">
            {workViews.filter((item) => !item.managerOnly || isManager(user)).map((item) => {
              const Icon = item.icon;
              const active = item.key === "team" ? !activeView && activeQueue === "ALL" : item.key === "mine" ? !activeView && activeQueue === "MY_TASKS" : activeView === item.key;
              return <Link aria-current={active ? "page" : undefined} className={["sidebar-link", active ? "sidebar-link-active" : ""].filter(Boolean).join(" ")} href={item.href} key={item.key} onClick={onClose} title={compact ? item.label : undefined}><Icon aria-hidden="true" size={18} strokeWidth={1.8} /><span>{item.label}</span></Link>;
            })}
          </nav>
        </section>

        <section className="sidebar-group">
          <p className="sidebar-group-label">Task status</p>
          <nav aria-label="Task status views">
            {statusViews.map((item) => {
              const Icon = item.icon;
              const active = !activeView && activeQueue === item.key;
              return <Link aria-current={active ? "page" : undefined} className={["sidebar-link", active ? "sidebar-link-active" : ""].filter(Boolean).join(" ")} href={item.href} key={item.key} onClick={onClose} title={compact ? item.label : undefined}><Icon aria-hidden="true" size={18} strokeWidth={1.8} /><span>{item.label}</span></Link>;
            })}
          </nav>
        </section>
      </div>

      <div className="sidebar-account">
        <div className="user-avatar user-avatar-light">{initials(user.name)}</div>
        <div className="sidebar-account-copy"><strong>{user.name}</strong><span>{user.roles[0] ?? "Staff"}</span></div>
        <ChevronDown size={16} aria-hidden="true" />
        <div className="sidebar-logout"><LogOut size={15} aria-hidden="true" /><LogoutButton /></div>
        <small className="sidebar-store">Store ID: TMS-001</small>
      </div>
    </aside>
  );
}
