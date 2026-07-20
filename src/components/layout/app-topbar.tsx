"use client";

import { Bell, Building2, CalendarDays, Columns3, House, Menu, Moon, Search, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { AuthenticatedUser } from "@/server/auth/store";
import { isManager } from "@/server/policies/access";
import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";

import { getDispatchNavigationItems, getNavigationGroups, isDispatchConsolePath } from "./navigation";
import { isInventoryConsolePath } from "./console-navigation";
import { useAppearance } from "./appearance";

type AppTopbarProps = { commandCenterHome: boolean; onMenuOpen(): void; showNavigationMenu: boolean; user: AuthenticatedUser };

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

function getBreadcrumb(pathname: string, dispatchView: "overview" | "live") {
  if (pathname === "/command-center") return ["Command Control Center"];
  if (pathname === "/board") return ["Command Control Center", "Dispatch", dispatchView === "live" ? "Live Board" : "Overview"];
  if (pathname === "/activity") return ["Command Control Center", "Dispatch", "Activity"];
  if (pathname === "/staff") return ["Command Control Center", "Dispatch", "Team"];
  if (pathname === "/my-tasks") return ["Command Control Center", "Dispatch", "My Tasks"];
  if (pathname.startsWith("/tasks")) return ["Command Control Center", "Dispatch", "Tasks"];
  if (pathname.startsWith("/projects")) return ["Command Control Center", "Dispatch", "Projects"];
  if (pathname.startsWith("/appointments")) return ["Command Control Center", "Dispatch", "Appointments"];
  if (pathname === "/vehicles") return ["Command Control Center", "Inventory Console", "Home"];
  if (pathname.startsWith("/vehicles/control-tower")) return ["Command Control Center", "Inventory Console", "Inventory Lifecycle", "Control Tower"];
  if (pathname.startsWith("/vehicles/disposition-wholesale")) return ["Command Control Center", "Inventory Console", "Inventory Lifecycle", "Disposition & Wholesale"];
  if (pathname.startsWith("/vehicles/workflow-operations")) return ["Command Control Center", "Inventory Console", "Workflow Operations"];
  if (pathname.startsWith("/vehicles/workflows")) return ["Command Control Center", "Inventory Console", "Start Workflow"];
  if (pathname.startsWith("/vehicles")) return ["Command Control Center", "Inventory Console", pathname.startsWith("/vehicles/parts-operations") ? "Parts Operations" : "Vehicles"];
  if (pathname.startsWith("/customers")) return ["Command Control Center", "Dispatch", "Customers"];
  if (pathname.startsWith("/manager-review")) return ["Command Control Center", "Dispatch", "Manager Review"];
  if (pathname.startsWith("/administration")) return ["Command Control Center", "Administration"];
  if (pathname.startsWith("/settings")) return ["Command Control Center", "Settings"];
  return ["Command Control Center", "Dispatch", "Workspace"];
}

export function AppTopbar({ commandCenterHome, onMenuOpen, showNavigationMenu, user }: AppTopbarProps) {
  const { appearance, setAppearance } = useAppearance();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatchView = searchParams.get("view") === "live" ? "live" : "overview";
  const inventoryConsole = isInventoryConsolePath(pathname);
  const dispatchConsole = isDispatchConsolePath(pathname) && !inventoryConsole;
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const navigationItems = [
    ...getNavigationGroups(user).flatMap((group) => group.items),
    ...getDispatchNavigationItems(user)
  ].filter((item) => !item.disabled);
  const breadcrumb = getBreadcrumb(pathname, dispatchView);
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
    { href: "/board?view=live", label: "Live Board", detail: "Return to today’s operating work." }
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
      {showNavigationMenu ? (
        <button className="topbar-icon topbar-menu" aria-label="Open navigation" onClick={onMenuOpen} type="button">
          <Menu size={20} />
        </button>
      ) : null}
      <Link aria-label="Time Motor Sales Command Control Center Home" className="ccc-topbar-brand" href="/command-center">
        <TimeMotorSalesLogo className="ccc-topbar-brand-horizontal" decorative priority variant="horizontal-reversed" />
        <TimeMotorSalesLogo className="ccc-topbar-brand-mark" decorative priority variant="mark" />
      </Link>
      {!commandCenterHome ? (
        <Link aria-label="Command Center Home" className="ccc-home-link" href="/command-center">
          <House size={15} /><span>CCC Home</span>
        </Link>
      ) : null}
      {inventoryConsole ? (
        <Link aria-label="Open Dispatch Board console" className="ccc-home-link ccc-dispatch-link" href="/board">
          <Columns3 size={15} /><span>Dispatch</span>
        </Link>
      ) : null}

      <nav aria-label="Workspace breadcrumb" className="ccc-breadcrumb">
        {breadcrumb.map((part, index) => (
          <span className={index === breadcrumb.length - 1 ? "ccc-breadcrumb-current" : ""} key={part}>
            {index === 0 && breadcrumb.length > 1 ? <Link href="/command-center">{part}</Link> : part}
            {index < breadcrumb.length - 1 ? <i aria-hidden="true">/</i> : null}
          </span>
        ))}
      </nav>

      <span className="ccc-dispatch-status"><i aria-hidden="true" />{commandCenterHome ? "CCC online" : inventoryConsole ? "Inventory live" : dispatchConsole ? "Dispatch online" : "Console active"}</span>

      <div className="topbar-actions" ref={actionsRef}>
        <div aria-label="Application appearance" className="app-appearance-switch" role="group">
          <button aria-label="Use light appearance" aria-pressed={appearance === "light"} className={appearance === "light" ? "active" : ""} onClick={() => setAppearance("light")} title="Light appearance" type="button"><Sun size={14} /><span>Light</span></button>
          <button aria-label="Use dark appearance" aria-pressed={appearance === "dark"} className={appearance === "dark" ? "active" : ""} onClick={() => setAppearance("dark")} title="Dark appearance" type="button"><Moon size={14} /><span>Dark</span></button>
        </div>
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
