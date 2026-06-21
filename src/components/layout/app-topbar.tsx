"use client";

import { Bell, Menu, Search } from "lucide-react";
import { usePathname } from "next/navigation";

import type { AuthenticatedUser } from "@/server/auth/store";

import { navigationGroups } from "./navigation";

type AppTopbarProps = { onMenuOpen(): void; user: AuthenticatedUser };

function initials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function AppTopbar({ onMenuOpen, user }: AppTopbarProps) {
  const pathname = usePathname();
  const item = navigationGroups.flatMap((group) => group.items).find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`));
  const title = pathname === "/board" ? "Time Motor Sales Dispatch Board" : item?.title ?? "Dispatch Board";

  return (
    <header className="app-topbar">
      <button className="topbar-icon topbar-menu" aria-label="Open navigation" onClick={onMenuOpen} type="button"><Menu size={21} /></button>
      <div className="topbar-title"><strong>{title}</strong><span>{item?.description ?? "One board. Everyone in the loop."}</span></div>
      <div className="topbar-actions">
        <button className="topbar-icon" aria-label="Search" type="button"><Search size={20} /></button>
        <button className="topbar-icon topbar-notifications" aria-label="Notifications" type="button"><Bell size={20} /><span>3</span></button>
        <div className="topbar-profile"><div className="user-avatar">{initials(user.name)}</div><div><strong>{user.name}</strong><span>{user.roles[0] ?? "Staff"}</span></div></div>
      </div>
    </header>
  );
}
