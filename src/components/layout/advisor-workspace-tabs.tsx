"use client";

import { CalendarClock, ClipboardCheck, ClipboardList, House, MessageSquareText, Search, UserRound } from "lucide-react";
import Link from "next/link";

type AdvisorTab = {
  href: string;
  icon: typeof House;
  label: string;
  active: (pathname: string, searchParams: URLSearchParams) => boolean;
};

const tabs: AdvisorTab[] = [
  {
    href: "/vehicles/advisor",
    icon: House,
    label: "My Workspace",
    active: (pathname) => pathname === "/vehicles/advisor",
  },
  {
    href: "/vehicles/recon-repair-advisor",
    icon: ClipboardCheck,
    label: "Recon/Repair",
    active: (pathname) => pathname === "/vehicles/recon-repair-advisor",
  },
  {
    href: "/vehicles/coo-workbook?workbookScope=MY",
    icon: ClipboardList,
    label: "Service Advisor Workbook",
    active: (pathname) => pathname === "/vehicles/coo-workbook" || pathname.startsWith("/vehicles/coo-workbook/"),
  },
  {
    href: "/vehicles/advisor?inbox=all",
    icon: MessageSquareText,
    label: "Inbox",
    active: (pathname, searchParams) => pathname === "/vehicles/advisor" && Boolean(searchParams.get("inbox")),
  },
  {
    href: "/vehicles/repair-orders?intakeSource=WALK_IN",
    icon: Search,
    label: "Check In",
    active: (pathname) => pathname === "/vehicles/repair-orders",
  },
  {
    href: "/appointments?view=board",
    icon: CalendarClock,
    label: "Appointments",
    active: (pathname, searchParams) => pathname === "/appointments" && searchParams.get("view") === "board",
  },
  {
    href: "/vehicles/repair-workbench?view=all",
    icon: ClipboardCheck,
    label: "Repair Orders",
    active: (pathname) => pathname.startsWith("/vehicles/repair-workbench"),
  },
  {
    href: "/vehicles/advisor?queue=authorization",
    icon: ClipboardCheck,
    label: "Approvals",
    active: (pathname, searchParams) => pathname === "/vehicles/advisor" && searchParams.get("queue") === "authorization",
  },
  {
    href: "/customers",
    icon: UserRound,
    label: "Customers",
    active: (pathname) => pathname.startsWith("/customers"),
  },
];

const advisorWorkspaceReturnTo = "/vehicles/advisor";

function withWorkspaceReturn(href: string, returnTo = advisorWorkspaceReturnTo) {
  const [hrefWithoutHash, hash] = href.split("#");
  const [pathname, query = ""] = hrefWithoutHash.split("?");
  if (!pathname.startsWith("/") || pathname === returnTo) return href;
  const params = new URLSearchParams(query);
  if (!params.has("returnTo")) params.set("returnTo", returnTo);

  return `${pathname}?${params.toString()}${hash ? `#${hash}` : ""}`;
}

export function AdvisorWorkspaceTabs({ pathname, searchParams }: { pathname: string; searchParams: URLSearchParams }) {
  return (
    <nav className="advisor-workspace-tabs" aria-label="Service Advisor workspace navigation">
      <span>Service Advisor</span>
      <div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.active(pathname, searchParams);
          return (
            <Link aria-current={active ? "page" : undefined} className={active ? "active" : ""} href={withWorkspaceReturn(tab.href)} key={tab.label}>
              <Icon />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
