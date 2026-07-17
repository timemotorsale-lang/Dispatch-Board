"use client";

import { ChevronDown, House, LogOut, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { LogoutButton } from "@/features/auth/logout-button";
import type { AuthenticatedUser } from "@/server/auth/store";
import { TimeMotorSalesLogo } from "@/components/brand/time-motor-sales-logo";

import type { ConsoleNavigationDefinition } from "./console-navigation";

type ConsoleSidebarProps = {
  console: ConsoleNavigationDefinition;
  isOpen: boolean;
  onClose(): void;
  user: AuthenticatedUser;
};

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function isActive(pathname: string, dispatchView: "overview" | "live", item: ConsoleNavigationDefinition["items"][number]) {
  const { activePaths, href, matchExact } = item;
  const baseHref = href.split(/[?#]/, 1)[0];

  if (href === "/board") return pathname === "/board" && dispatchView === "overview";
  if (href.startsWith("/board?view=live")) return pathname === "/board" && dispatchView === "live";
  if (activePaths?.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return true;
  if (matchExact) return pathname === baseHref;
  return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
}

export function ConsoleSidebar({ console, isOpen, onClose, user }: ConsoleSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatchView = searchParams.get("view") === "live" ? "live" : "overview";
  const selectedBoardDate = searchParams.get("date");

  return (
    <aside className={["app-sidebar", "console-sidebar", isOpen ? "app-sidebar-open" : ""].filter(Boolean).join(" ")}>
      <div className="sidebar-brand-row">
        <Link aria-label={`${console.subtitle} home`} className="sidebar-brand" href={console.homeHref} onClick={onClose}>
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
        {console.items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, dispatchView, item);
          const href = item.href === "/board" && selectedBoardDate
            ? `/board?date=${encodeURIComponent(selectedBoardDate)}`
            : item.href.startsWith("/board?view=live") && selectedBoardDate
              ? `/board?view=live&date=${encodeURIComponent(selectedBoardDate)}`
              : item.href;

          return (
            <Link aria-current={active ? "page" : undefined} className={`sidebar-link${active ? " sidebar-link-active" : ""}`} href={href} key={item.title} onClick={onClose}>
              <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <Link className="console-sidebar-ccc-home" href="/command-center" onClick={onClose}>
        <House size={16} /><span>Command Center Home</span>
      </Link>

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
