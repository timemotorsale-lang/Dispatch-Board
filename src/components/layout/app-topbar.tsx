"use client";

import { Bell, Building2, CalendarDays, Menu, Search } from "lucide-react";
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

function formatBusinessDate() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  }).format(new Date());
}

function getBreadcrumb(pathname: string) {
  if (pathname === "/board") return ["Command Control Center", "Dispatch", "Overview"];
  if (pathname === "/activity") return ["Command Control Center", "Dispatch", "Activity"];
  if (pathname === "/staff") return ["Command Control Center", "Dispatch", "Team"];
  if (pathname === "/my-tasks") return ["Command Control Center", "Dispatch", "My Tasks"];
  if (pathname.startsWith("/tasks")) return ["Command Control Center", "Dispatch", "Tasks"];
  if (pathname.startsWith("/administration")) return ["Command Control Center", "Administration"];
  if (pathname.startsWith("/settings")) return ["Command Control Center", "Settings"];
  return ["Command Control Center", "Dispatch", "Workspace"];
}

export function AppTopbar({ onMenuOpen, user }: AppTopbarProps) {
  const pathname = usePathname();
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const navigationItems = getNavigationGroups(user).flatMap((group) => group.items).filter((item) => !item.disabled);
  const breadcrumb = getBreadcrumb(pathname);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const quickResults = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const uniqueItems = navigationItems.filter((entry, index, items) => items.findIndex((item) => item.href === entry.href) === index);
    if (!query) return uniqueItems.slice(0, 6);
    return uniqueItems.filter((entry) => `${entry.title} ${entry.description}`.toLowerCase().includes(query));
  }, [navigationItems, searchText]);
  const notificationLinks = [
    { href: "/activity", label: "Activity", detail: "Review the latest Dispatch events." },
    ...(isManager(user)
      ? [{ href: "/manager-review", label: "Manager review", detail: "Open approvals and work waiting for review." }]
      : []),
    { href: "/board#live-board", label: "Live Board", detail: "Return to today’s operating work." }
  ];

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
        setIsNotificationsOpen(false);
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
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  return (
    <header className="app-topbar ccc-topbar">
      <button className="topbar-icon topbar-menu" aria-label="Open navigation" onClick={onMenuOpen} type="button">
        <Menu size={20} />
      </button>

      <nav aria-label="Workspace breadcrumb" className="ccc-breadcrumb">
        {breadcrumb.map((part, index) => (
          <span className={index === breadcrumb.length - 1 ? "ccc-breadcrumb-current" : ""} key={part}>
            {part}{index < breadcrumb.length - 1 ? <i aria-hidden="true">/</i> : null}
          </span>
        ))}
      </nav>

      <span className="ccc-dispatch-status"><i aria-hidden="true" />Dispatch online</span>

      <div className="topbar-actions" ref={actionsRef}>
        <div className="topbar-popover-shell ccc-search-shell">
          <button
            aria-expanded={isSearchOpen}
            className="ccc-search-trigger"
            onClick={() => {
              setIsSearchOpen((current) => !current);
              setIsNotificationsOpen(false);
            }}
            type="button"
          >
            <Search size={16} /><span>Search work, stock #, customer…</span><kbd>/</kbd>
          </button>
          {isSearchOpen ? (
            <div className="topbar-popover topbar-search-popover">
              <div className="topbar-popover-header"><strong>Quick search</strong><span>Jump to a live Dispatch area.</span></div>
              <label className="topbar-search-field">
                <Search size={16} />
                <input aria-label="Search navigation" placeholder="Search Dispatch…" ref={searchInputRef} type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
              </label>
              <div className="topbar-popover-list">
                {quickResults.length ? quickResults.map((entry) => (
                  <Link className="topbar-popover-link" href={entry.href} key={entry.href} onClick={() => setIsSearchOpen(false)}>
                    <strong>{entry.title}</strong><span>{entry.description}</span>
                  </Link>
                )) : <p className="topbar-popover-empty">No matching live areas found.</p>}
              </div>
            </div>
          ) : null}
        </div>

        <span className="ccc-store-context"><Building2 size={15} />TMS-001</span>
        <span className="ccc-business-date" suppressHydrationWarning><CalendarDays size={15} />{formatBusinessDate()}</span>

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
            <Bell size={18} /><span>{notificationLinks.length}</span>
          </button>
          {isNotificationsOpen ? (
            <div className="topbar-popover topbar-notifications-popover">
              <div className="topbar-popover-header"><strong>Dispatch attention</strong><span>Open the area that needs action.</span></div>
              <div className="topbar-popover-list">
                {notificationLinks.map((entry) => (
                  <Link className="topbar-popover-link" href={entry.href} key={entry.href} onClick={() => setIsNotificationsOpen(false)}>
                    <strong>{entry.label}</strong><span>{entry.detail}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="topbar-profile" title={`${user.name} · ${user.roles[0] ?? "Staff"}`}>
          <div className="user-avatar">{initials(user.name)}</div>
        </div>
      </div>
    </header>
  );
}
