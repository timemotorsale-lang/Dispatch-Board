"use client";

import { CalendarClock, ClipboardCheck, House, MessageSquareText, Search, UserRound } from "lucide-react";
import Link from "next/link";

type AdvisorTab = {
  href: string;
  icon: typeof House;
  label: string;
  active: (pathname: string, searchParams: URLSearchParams) => boolean;
};

const tabs: AdvisorTab[] = [
  {
    href: "/appointments",
    icon: House,
    label: "My Workspace",
    active: (pathname, searchParams) => pathname === "/appointments" && !searchParams.get("view") && !searchParams.get("queue") && !searchParams.get("inbox"),
  },
  {
    href: "/appointments?inbox=all",
    icon: MessageSquareText,
    label: "Inbox",
    active: (pathname, searchParams) => pathname === "/appointments" && Boolean(searchParams.get("inbox")),
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
    href: "/appointments?queue=authorization",
    icon: ClipboardCheck,
    label: "Approvals",
    active: (pathname, searchParams) => pathname === "/appointments" && searchParams.get("queue") === "authorization",
  },
  {
    href: "/customers",
    icon: UserRound,
    label: "Customers",
    active: (pathname) => pathname.startsWith("/customers"),
  },
];

export function AdvisorWorkspaceTabs({ pathname, searchParams }: { pathname: string; searchParams: URLSearchParams }) {
  return (
    <nav className="advisor-workspace-tabs" aria-label="Service Advisor workspace navigation">
      <span>Service Advisor</span>
      <div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.active(pathname, searchParams);
          return (
            <Link aria-current={active ? "page" : undefined} className={active ? "active" : ""} href={tab.href} key={tab.label}>
              <Icon />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
