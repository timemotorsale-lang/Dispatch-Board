"use client";

import { ChevronDown, ChevronsRight, LockKeyhole, LogOut, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { LogoutButton } from "@/features/auth/logout-button";
import type { AuthenticatedUser } from "@/server/auth/store";

import { getNavigationGroups } from "./navigation";

type AppSidebarProps = {
  compact: boolean;
  isOpen: boolean;
  onClose(): void;
  user: AuthenticatedUser;
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function AppSidebar({ compact, isOpen, onClose, user }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatchView = searchParams.get("view") === "live" ? "live" : "overview";
  const selectedBoardDate = searchParams.get("date");
  const navigationGroups = getNavigationGroups(user);

  return (
    <aside className={["app-sidebar", compact ? "app-sidebar-compact" : "", isOpen ? "app-sidebar-open" : ""].filter(Boolean).join(" ")}>
      <div className="sidebar-brand-row">
        <Link aria-label="Time Motor Sales Command Control Center" className="sidebar-brand" href="/command-center" onClick={onClose} title={compact ? "Time Motor Sales" : undefined}>
          <span className="sidebar-logo" aria-hidden="true">T</span>
          <span><strong>TIME MOTOR SALES</strong><small>COMMAND CONTROL CENTER</small></span>
        </Link>
        <button className="sidebar-close" aria-label="Close navigation" onClick={onClose} type="button"><X size={20} /></button>
      </div>

      <div className="sidebar-navigation">
        {navigationGroups.map((group) => (
          <section className="sidebar-group" key={group.label || "primary"}>
            {group.label ? <p className="sidebar-group-label">{group.label}</p> : null}
            <nav aria-label={group.label || "Primary navigation"}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const baseHref = item.href.split(/[?#]/, 1)[0];
                const resolvedHref = item.title === "Overview" && selectedBoardDate
                  ? `/board?date=${encodeURIComponent(selectedBoardDate)}`
                  : item.title === "Live Board" && selectedBoardDate
                    ? `/board?view=live&date=${encodeURIComponent(selectedBoardDate)}`
                    : item.href;
                const active = item.title === "Dispatch Board"
                  ? pathname === "/board"
                  : item.title === "Overview"
                    ? pathname === "/board" && dispatchView === "overview"
                    : item.title === "Live Board"
                      ? pathname === "/board" && dispatchView === "live"
                      : pathname === baseHref || (!item.matchExact && pathname.startsWith(`${baseHref}/`));
                const parentCurrent = item.matchExact && pathname.startsWith(`${baseHref}/`);
                const className = [
                  "sidebar-link",
                  item.title === "Dispatch Board" ? "sidebar-link-module" : "",
                  item.parentHref ? "sidebar-link-child" : "",
                  active ? "sidebar-link-active" : "",
                  parentCurrent ? "sidebar-link-parent-current" : ""
                ].filter(Boolean).join(" ");
                const content = (
                  <>
                    <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                    <span>{item.title}</span>
                    {item.badge ? <small className={item.disabled ? "sidebar-badge sidebar-badge-planned" : "sidebar-badge sidebar-badge-live"}>{item.badge}</small> : null}
                    {item.disabled ? <LockKeyhole className="sidebar-planned-lock" aria-hidden="true" size={12} /> : null}
                  </>
                );

                return item.disabled ? (
                  <div aria-disabled="true" className={`${className} sidebar-link-disabled`} key={item.href} title={`${item.title} is planned`}>
                    {content}
                  </div>
                ) : (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={className}
                    href={resolvedHref}
                    key={`${item.href}-${item.title}`}
                    onClick={onClose}
                    title={compact ? item.title : undefined}
                  >
                    {content}
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>

      <div className="sidebar-account">
        <div className="user-avatar user-avatar-light">{initials(user.name)}</div>
        <div className="sidebar-account-copy"><strong>{user.name}</strong><span>{user.roles[0] ?? "Staff"}</span></div>
        <ChevronDown size={16} aria-hidden="true" />
        <div className="sidebar-logout"><LogOut size={15} aria-hidden="true" /><LogoutButton /></div>
        <small className="sidebar-store">Store ID: TMS-001</small>
      </div>
      {compact ? (
        <div className="sidebar-compact-hint" title="Use Workspace View in Tasks to expand navigation">
          <ChevronsRight size={17} />
          <span>Expand navigation</span>
        </div>
      ) : null}
    </aside>
  );
}
