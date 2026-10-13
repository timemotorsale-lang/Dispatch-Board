"use client";

import { ChevronDown, ChevronsLeft, ChevronsRight, LogOut, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";
import { LogoutButton } from "@/features/auth/logout-button";
import type { AuthenticatedUser } from "@/server/auth/store";

import { getNavigationGroups } from "./navigation";

type AppSidebarProps = {
  compact: boolean;
  isOpen: boolean;
  onClose(): void;
  onToggleCompact(): void;
  user: AuthenticatedUser;
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function AppSidebar({ compact, isOpen, onClose, onToggleCompact, user }: AppSidebarProps) {
  const pathname = usePathname();
  const navigationGroups = getNavigationGroups(user);

  return (
    <aside className={["app-sidebar", compact ? "app-sidebar-compact" : "", isOpen ? "app-sidebar-open" : ""].filter(Boolean).join(" ")}>
      <div className="sidebar-brand-row">
        <Link aria-label="Time Motor Sales" className="sidebar-brand" href="/board" onClick={onClose} title={compact ? "Time Motor Sales" : undefined}>
          <TimeMotorSalesLogo className={compact ? "sidebar-brand-logo sidebar-brand-logo-mark" : "sidebar-brand-logo"} decorative={compact} variant={compact ? "mark" : "horizontal-reversed"} />
        </Link>
        <button
          aria-label={compact ? "Expand navigation" : "Collapse navigation"}
          className="sidebar-collapse-button"
          onClick={onToggleCompact}
          title={compact ? "Expand navigation" : "Collapse navigation"}
          type="button"
        >
          {compact ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
        <button className="sidebar-close" aria-label="Close navigation" onClick={onClose} type="button"><X size={20} /></button>
      </div>

      <div className="sidebar-navigation">
        {navigationGroups.map((group) => (
          <section className="sidebar-group" key={group.label || "primary"}>
            {group.label ? <p className="sidebar-group-label">{group.label}</p> : null}
            <nav aria-label={group.label || "Primary navigation"}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (!item.matchExact && pathname.startsWith(`${item.href}/`));
                const parentCurrent = item.matchExact && pathname.startsWith(`${item.href}/`);
                const className = [
                  "sidebar-link",
                  item.parentHref ? "sidebar-link-child" : "",
                  active ? "sidebar-link-active" : "",
                  parentCurrent ? "sidebar-link-parent-current" : ""
                ].filter(Boolean).join(" ");
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={className}
                    href={item.href}
                    key={item.href}
                    onClick={onClose}
                    title={compact ? item.title : undefined}
                  >
                    <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                    <span>{item.title}</span>
                    {item.badge ? <small className="sidebar-badge">{item.badge}</small> : null}
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
    </aside>
  );
}
