"use client";

import { ChevronDown, LogOut, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/features/auth/logout-button";
import type { AuthenticatedUser } from "@/server/auth/store";

import { navigationGroups } from "./navigation";

type AppSidebarProps = {
  isOpen: boolean;
  onClose(): void;
  user: AuthenticatedUser;
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function AppSidebar({ isOpen, onClose, user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={isOpen ? "app-sidebar app-sidebar-open" : "app-sidebar"}>
      <div className="sidebar-brand-row">
        <Link className="sidebar-brand" href="/board" onClick={onClose}>
          <span className="sidebar-logo" aria-hidden="true">T</span>
          <span><strong>TIME</strong><small>MOTOR SALES</small></span>
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
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={active ? "sidebar-link sidebar-link-active" : "sidebar-link"}
                    href={item.href}
                    key={item.href}
                    onClick={onClose}
                  >
                    <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                    <span>{item.title}</span>
                    {item.badge ? <small className="sidebar-badge">{item.badge}</small> : null}
                    {item.placeholder ? <small className="sidebar-soon">Soon</small> : null}
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
