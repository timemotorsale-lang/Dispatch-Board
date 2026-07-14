"use client";

import { Bell, ChevronDown, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { AuthenticatedUser } from "@/server/auth/store";
import { isManager } from "@/server/policies/access";

import { getNavigationGroups } from "./navigation";

type AppTopbarProps = { onMenuOpen(): void; user: AuthenticatedUser };

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function AppTopbar({ onMenuOpen, user }: AppTopbarProps) {
  const pathname = usePathname();
  const topbarActionsRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const navigationGroups = getNavigationGroups(user);
  const item = navigationGroups.flatMap((group) => group.items).find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`));
  const title = pathname === "/board" ? "Time Motor Sales Dispatch Board" : item?.title ?? "Dispatch Board";
  const isTasksPage = pathname === "/tasks";
  const isTaskDetailPage = pathname.startsWith("/tasks/");
  const isMyTasksPage = pathname === "/my-tasks";
  const isProjectsPage = pathname === "/projects" || pathname.startsWith("/projects/");
  const isAppointmentsPage = pathname === "/appointments";
  const isCustomersPage = pathname === "/customers" || pathname.startsWith("/customers/");
  const isManagerReviewPage = pathname === "/manager-review";
  const isCompactTopbar = isTasksPage || isMyTasksPage || isProjectsPage || isAppointmentsPage || isCustomersPage || isManagerReviewPage;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const navigationItems = navigationGroups.flatMap((group) => group.items);
  const quickResults = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return navigationItems.slice(0, 6);
    }

    return navigationItems.filter((entry) =>
      `${entry.title} ${entry.description}`.toLowerCase().includes(query)
    );
  }, [navigationItems, searchText]);
  const notificationLinks = [
    {
      href: "/activity",
      label: "Activity feed",
      detail: "Open the latest board updates and operating events."
    },
    ...(isManager(user)
      ? [
          {
            href: "/manager-review",
            label: "Manager review",
            detail: "Check approvals and work waiting for review."
          }
        ]
      : []),
    {
      href: "/board",
      label: "Full board",
      detail: "Return to the live dispatch board."
    }
  ];
  const notificationCount = notificationLinks.length;
  const workspaces = [
    { href: "/board", label: "Command Center", detail: "Exceptions and priorities" },
    { href: "/inventory-manager", label: "Inventory Manager", detail: "Cross-functional inventory decisions" },
    { href: "/vehicles/inventory", label: "Inventory Operations", detail: "Acquisition and readiness" },
    { href: "/vehicles/shop-dispatch", label: "Service Operations", detail: "Dispatch and execution" },
    { href: "/vehicles/parts-counter", label: "Parts Operations", detail: "Availability and shortages" },
    { href: "/customers", label: "Customer Operations", detail: "Lifecycle and promises" },
    { href: "/appointments", label: "Appointment Workspace", detail: "Schedule and resource commitments" },
    { href: "/tasks", label: "Task Workspace", detail: "Shared work and accountability" },
    { href: "/insights", label: "Insights", detail: "Scorecards and forecasts" },
    { href: "/integrations", label: "Integrations", detail: "Provider health and reconciliation" },
    ...(isManager(user) ? [{ href: "/administration", label: "Administration", detail: "Governance and access" }] : [])
  ];
  const activeWorkspace = workspaces.find((workspace) => pathname === workspace.href || pathname.startsWith(`${workspace.href}/`)) ?? workspaces[0];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!topbarActionsRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
        setIsWorkspaceOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
        setIsWorkspaceOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const topbarClassName = isTaskDetailPage
    ? "app-topbar app-topbar-task-workbench"
    : isTasksPage
      ? "app-topbar app-topbar-minimal app-topbar-tasks"
    : isAppointmentsPage
      ? "app-topbar app-topbar-minimal app-topbar-appointments"
      : isManagerReviewPage
        ? "app-topbar app-topbar-minimal app-topbar-manager-review"
      : isCustomersPage
        ? "app-topbar app-topbar-minimal app-topbar-customers"
      : isCompactTopbar
        ? "app-topbar app-topbar-minimal"
        : "app-topbar";

  return (
    <header className={topbarClassName}>
      <button className="topbar-icon topbar-menu" aria-label="Open navigation" onClick={onMenuOpen} type="button"><Menu size={21} /></button>
      {!isCompactTopbar ? (
        <div className="topbar-title"><strong>{title}</strong><span>{item?.description ?? "One board. Everyone in the loop."}</span></div>
      ) : (
        <div className="topbar-spacer" aria-hidden="true" />
      )}
      <div className="topbar-actions" ref={topbarActionsRef}>
        <div className="topbar-popover-shell topbar-workspace-switcher">
          <button
            aria-expanded={isWorkspaceOpen}
            className="workspace-switcher-button"
            onClick={() => {
              setIsWorkspaceOpen((current) => !current);
              setIsSearchOpen(false);
              setIsNotificationsOpen(false);
            }}
            type="button"
          >
            <span className="workspace-switcher-label"><small>WORKSPACE</small><strong>{activeWorkspace.label}</strong></span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          {isWorkspaceOpen ? (
            <div className="topbar-popover workspace-switcher-popover">
              <div className="topbar-popover-header"><strong>Switch workspace</strong><span>Your identity and permissions stay the same.</span></div>
              <div className="topbar-popover-list">
                {workspaces.map((workspace) => (
                  <Link className={`topbar-popover-link ${workspace.href === activeWorkspace.href ? "workspace-link-active" : ""}`} href={workspace.href} key={workspace.href} onClick={() => setIsWorkspaceOpen(false)}>
                    <strong>{workspace.label}</strong><span>{workspace.detail}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="topbar-popover-shell">
          <button
            aria-expanded={isSearchOpen}
            className="topbar-icon"
            aria-label="Search"
            onClick={() => {
              setIsSearchOpen((current) => !current);
              setIsNotificationsOpen(false);
            }}
            type="button"
          >
            <Search size={20} />
          </button>
          {isSearchOpen ? (
            <div className="topbar-popover topbar-search-popover">
              <div className="topbar-popover-header">
                <strong>Quick search</strong>
                <span>Jump to a live area</span>
              </div>
              <label className="topbar-search-field">
                <Search size={16} />
                <input
                  aria-label="Search navigation"
                  placeholder="Search board, tasks, team, settings..."
                  ref={searchInputRef}
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </label>
              <div className="topbar-popover-list">
                {quickResults.length ? (
                  quickResults.map((entry) => (
                    <Link
                      className="topbar-popover-link"
                      href={entry.href}
                      key={entry.href}
                      onClick={() => setIsSearchOpen(false)}
                    >
                      <strong>{entry.title}</strong>
                      <span>{entry.description}</span>
                    </Link>
                  ))
                ) : (
                  <p className="topbar-popover-empty">No matching areas found.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
        <div className="topbar-popover-shell">
          <button
            aria-expanded={isNotificationsOpen}
            className="topbar-icon topbar-notifications"
            aria-label="Notifications"
            onClick={() => {
              setIsNotificationsOpen((current) => !current);
              setIsSearchOpen(false);
            }}
            type="button"
          >
            <Bell size={20} />
            <span>{notificationCount}</span>
          </button>
          {isNotificationsOpen ? (
            <div className="topbar-popover topbar-notifications-popover">
              <div className="topbar-popover-header">
                <strong>Notifications</strong>
                <span>Open the area that needs attention.</span>
              </div>
              <div className="topbar-popover-list">
                {notificationLinks.map((entry) => (
                  <Link
                    className="topbar-popover-link"
                    href={entry.href}
                    key={entry.href}
                    onClick={() => setIsNotificationsOpen(false)}
                  >
                    <strong>{entry.label}</strong>
                    <span>{entry.detail}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="topbar-profile"><div className="user-avatar">{initials(user.name)}</div><div><strong>{user.name}</strong><span>{user.roles[0] ?? "Staff"}</span></div></div>
      </div>
    </header>
  );
}
