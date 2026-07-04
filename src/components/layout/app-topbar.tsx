"use client";

import { Bell, Menu, Search } from "lucide-react";
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
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

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!topbarActionsRef.current?.contains(event.target as Node)) {
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
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  return (
    <header className="app-topbar">
      <button className="topbar-icon topbar-menu" aria-label="Open navigation" onClick={onMenuOpen} type="button"><Menu size={21} /></button>
      <div className="topbar-title"><strong>{title}</strong><span>{item?.description ?? "One board. Everyone in the loop."}</span></div>
      <div className="topbar-actions" ref={topbarActionsRef}>
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
