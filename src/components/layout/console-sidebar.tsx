"use client";

import { CarFront, ChevronDown, LogOut, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { LogoutButton } from "@/features/auth/logout-button";
import type { AuthenticatedUser } from "@/server/auth/store";
import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";
import { withManagerWorkspaceContext, type ManagerWorkspaceContext } from "@/lib/manager-workspace-context";

import type { ConsoleNavigationDefinition } from "./console-navigation";

type ConsoleSidebarProps = {
  console: ConsoleNavigationDefinition;
  isOpen: boolean;
  managerContext?: ManagerWorkspaceContext | null;
  onClose(): void;
  preserveAdvisorLaunch?: boolean;
  user: AuthenticatedUser;
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function isActive(pathname: string, searchParams: Pick<URLSearchParams, "get">, item: ConsoleNavigationDefinition["items"][number]) {
  const { activePaths, activeQuery, href, matchExact } = item;
  const baseHref = href.split(/[?#]/, 1)[0];
  const itemQuery = href.includes("?") ? new URLSearchParams(href.split("?", 2)[1]) : null;

  if (pathname !== baseHref && !activePaths?.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return false;
  if (href.includes("#")) return false;
  if (activeQuery && !Object.entries(activeQuery).every(([key, value]) => value === null ? !searchParams.get(key) : searchParams.get(key) === value)) return false;
  if (itemQuery && !Array.from(itemQuery.entries()).every(([key, value]) => searchParams.get(key) === value)) return false;
  if (activePaths?.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return true;
  if (matchExact) return pathname === baseHref;
  return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
}

function preserveBoardDate(href: string, selectedBoardDate: string | null) {
  if (!selectedBoardDate || href.includes("date=")) return href;
  const [destination, hash] = href.split("#", 2);
  const datedDestination = `${destination}${destination.includes("?") ? "&" : "?"}date=${encodeURIComponent(selectedBoardDate)}`;
  return hash ? `${datedDestination}#${hash}` : datedDestination;
}

export function ConsoleSidebar({ console, isOpen, managerContext, onClose, preserveAdvisorLaunch = false, user }: ConsoleSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedBoardDate = searchParams.get("date");
  const containedHref = (href: string) => managerContext
    ? withManagerWorkspaceContext(href, managerContext.mode, {
        launch: preserveAdvisorLaunch && href.split(/[?#]/, 1)[0] === "/vehicles/advisor" ? "advisor" : undefined
      })
    : href;

  return (
    <aside className={["app-sidebar", "console-sidebar", isOpen ? "app-sidebar-open" : ""].filter(Boolean).join(" ")}>
      <div className="sidebar-brand-row">
        <Link aria-label={`${console.subtitle} home`} className="sidebar-brand" href={containedHref(console.homeHref)} onClick={onClose}>
          <span className="sidebar-logo" aria-hidden="true"><TimeMotorSalesLogo decorative priority variant="mark" /></span>
          <span><strong>{console.title}</strong><small>{console.subtitle}</small></span>
        </Link>
        <button className="sidebar-close" aria-label="Close navigation" onClick={onClose} type="button"><X size={20} /></button>
      </div>

      <div className="console-sidebar-status">
        <span><i aria-hidden="true" />{console.subtitle}</span>
        {console.badge ? <small>{console.badge}</small> : null}
      </div>

      <nav aria-label={`${console.subtitle} navigation`} className="sidebar-navigation console-sidebar-navigation">
        {console.inventoryMenu?.length ? <details className="console-inventory-menu" open>
          <summary className="sidebar-link"><CarFront aria-hidden="true" size={18} strokeWidth={1.8} /><span>Inventory</span><ChevronDown className="console-inventory-chevron" aria-hidden="true" size={14} /></summary>
          <div aria-label="Inventory tools">
            {console.inventoryMenu.map(item => {
              const active = isActive(pathname, searchParams, item);
              return <Link aria-current={active ? "page" : undefined} className={`sidebar-link sidebar-link-child${active ? " sidebar-link-active" : ""}`} href={containedHref(preserveBoardDate(item.href, selectedBoardDate))} key={item.title} onClick={onClose}><span>{item.title}</span></Link>;
            })}
          </div>
        </details> : null}
        {console.items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, searchParams, item);
          const href = containedHref(preserveBoardDate(item.href, selectedBoardDate));

          const className = ["sidebar-link", item.isNested ? "sidebar-link-child" : "", active ? "sidebar-link-active" : ""].filter(Boolean).join(" ");

          return (
            <Link aria-current={active ? "page" : undefined} className={className} href={href} key={item.title} onClick={onClose}>
              <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

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
