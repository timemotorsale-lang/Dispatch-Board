"use client";

import { BarChart3, ChevronDown, Gauge, Inbox, Landmark, ListChecks, LogOut, Route, Search, Sparkles, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";
import { LogoutButton } from "@/features/auth/logout-button";
import type { AuthenticatedUser } from "@/server/auth/store";
import { captureToolHref, MOBILE_HOME_HREF } from "@/features/mobile-capture/capture-navigation";

type ManagerMode = "CEO" | "COO" | "WORK";
type Props = { isOpen: boolean; onClose(): void; user: AuthenticatedUser };

const views = [
  { href: "/manager-workspace?mode=ceo", label: "CEO Direction", mode: "CEO" as const, icon: Landmark },
  { href: "/manager-workspace?mode=coo", label: "COO Operations", mode: "COO" as const, icon: Gauge },
  { href: "/manager-workspace?mode=work", label: "My Work", mode: "WORK" as const, icon: Wrench }
];

const pageSections: Record<ManagerMode, Array<{ hash: string; label: string; icon: typeof Search }>> = {
  CEO: [
    { hash: "manager-search", label: "Executive Search", icon: Search },
    { hash: "manager-focus", label: "Highest-Value Decision", icon: Sparkles },
    { hash: "manager-summary", label: "Business Health", icon: BarChart3 },
    { hash: "manager-action-queue", label: "Executive Decisions", icon: ListChecks },
    { hash: "manager-inbox", label: "Executive Inbox", icon: Inbox },
    { hash: "manager-fast-routes", label: "Executive Routes", icon: Route }
  ],
  COO: [
    { hash: "manager-search", label: "Operations Search", icon: Search },
    { hash: "manager-focus", label: "Priority Intervention", icon: Sparkles },
    { hash: "manager-summary", label: "Operating Pulse", icon: BarChart3 },
    { hash: "manager-action-queue", label: "Intervention Queue", icon: ListChecks },
    { hash: "manager-inbox", label: "Operations Inbox", icon: Inbox },
    { hash: "manager-fast-routes", label: "Team & Workflow Routes", icon: Route }
  ],
  WORK: [
    { hash: "manager-search", label: "Work Search", icon: Search },
    { hash: "manager-focus", label: "Do This Next", icon: Sparkles },
    { hash: "manager-summary", label: "My Workload", icon: BarChart3 },
    { hash: "manager-action-queue", label: "My Action Queue", icon: ListChecks },
    { hash: "manager-inbox", label: "My Inbox", icon: Inbox },
    { hash: "manager-fast-routes", label: "My Work Routes", icon: Route }
  ]
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function ManagerWorkspaceSidebar({ isOpen, onClose, user }: Props) {
  const searchParams = useSearchParams();
  const requestedMode = String(searchParams.get("mode") ?? "CEO").toUpperCase();
  const activeMode: ManagerMode = requestedMode === "COO" || requestedMode === "WORK" ? requestedMode : "CEO";
  const modeQuery = activeMode.toLowerCase();

  return (
    <aside className={["app-sidebar", "manager-workspace-sidebar", isOpen ? "app-sidebar-open" : ""].filter(Boolean).join(" ")}>
      <div className="sidebar-brand-row">
        <Link aria-label="Time Motor Sales Manager Workspace" className="sidebar-brand" href={`/manager-workspace?mode=${modeQuery}`} onClick={onClose}>
          <span className="sidebar-logo" aria-hidden="true"><TimeMotorSalesLogo decorative priority variant="mark" /></span>
          <span><strong>TIME MOTOR SALES</strong><small>MANAGER WORKSPACE</small></span>
        </Link>
        <button className="sidebar-close" aria-label="Close navigation" onClick={onClose} type="button"><X size={20} /></button>
      </div>

      <div className="sidebar-navigation">
        <section className="sidebar-group"><p className="sidebar-group-label">Mobile tools</p><nav aria-label="Mobile tools"><Link className="sidebar-link" href={MOBILE_HOME_HREF} onClick={onClose}><Route aria-hidden="true" size={18} /><span>Mobile home · navigation icons</span></Link><Link className="sidebar-link" href={captureToolHref(null, `/manager-workspace?mode=${modeQuery}`)} onClick={onClose}><Search aria-hidden="true" size={18} /><span>Scan &amp; capture</span></Link></nav></section>
        <section className="sidebar-group">
          <p className="sidebar-group-label">Workspace views</p>
          <nav aria-label="Manager workspace views">
            {views.map((view) => {
              const Icon = view.icon;
              const active = activeMode === view.mode;
              return <Link aria-current={active ? "page" : undefined} className={["sidebar-link", active ? "sidebar-link-active" : ""].filter(Boolean).join(" ")} href={view.href} key={view.mode} onClick={onClose}><Icon aria-hidden="true" size={18} strokeWidth={1.8} /><span>{view.label}</span></Link>;
            })}
          </nav>
        </section>

        <section className="sidebar-group">
          <p className="sidebar-group-label">On this page</p>
          <nav aria-label="Manager page sections">
            {pageSections[activeMode].map((section) => {
              const Icon = section.icon;
              return <Link className="sidebar-link" href={`/manager-workspace?mode=${modeQuery}#${section.hash}`} key={section.hash} onClick={onClose}><Icon aria-hidden="true" size={18} strokeWidth={1.8} /><span>{section.label}</span></Link>;
            })}
          </nav>
        </section>
      </div>

      <div className="sidebar-account">
        <div className="user-avatar user-avatar-light">{initials(user.name)}</div>
        <div className="sidebar-account-copy"><strong>{user.name}</strong><span>{user.roles[0] ?? "Manager"}</span></div>
        <ChevronDown size={16} aria-hidden="true" />
        <div className="sidebar-logout"><LogOut size={15} aria-hidden="true" /><LogoutButton /></div>
        <small className="sidebar-store">Store ID: TMS-001</small>
      </div>
    </aside>
  );
}
