"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import type { AuthenticatedUser } from "@/server/auth/store";

import { getDispatchNavigationItems } from "./navigation";

type DispatchConsoleHeaderProps = {
  user: AuthenticatedUser;
};

const consoleCopy: Array<{ description: string; path: string; title: string }> = [
  { path: "/my-tasks", title: "My Tasks", description: "Your assigned work and next actions" },
  { path: "/tasks", title: "Tasks", description: "Search, organize, and manage Dispatch work" },
  { path: "/projects", title: "Projects", description: "Coordinate operational projects and work areas" },
  { path: "/appointments", title: "Appointments", description: "Manage the appointment schedule and commitments" },
  { path: "/vehicles", title: "Vehicles", description: "Operate vehicle records and readiness workflows" },
  { path: "/diagnostics", title: "Diagnostics", description: "Prioritize and execute technician diagnostic cases" },
  { path: "/customers", title: "Customers", description: "Manage customer records and connected work" },
  { path: "/manager-review", title: "Manager Review", description: "Review approvals, exceptions, and escalations" },
  { path: "/staff", title: "Team", description: "Manage team duties and execution context" },
  { path: "/activity", title: "Activity", description: "Review recorded Dispatch events and updates" }
];

function getConsoleCopy(pathname: string, live: boolean) {
  if (pathname === "/board") {
    return live
      ? { title: "Live Board", description: "Operate and update today’s work" }
      : { title: "Dispatch Overview", description: "Today’s operating command" };
  }

  return consoleCopy.find((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`)) ?? {
    title: "Dispatch Board",
    description: "Time Motor Sales operating console"
  };
}

function isActiveDestination(pathname: string, live: boolean, href: string) {
  const baseHref = href.split(/[?#]/, 1)[0];

  if (href === "/board") return pathname === "/board" && !live;
  if (href.startsWith("/board?view=live")) return pathname === "/board" && live;
  return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
}

export function DispatchConsoleHeader({ user }: DispatchConsoleHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const live = pathname === "/board" && searchParams.get("view") === "live";
  const boardDate = searchParams.get("date");
  const department = searchParams.get("department");

  return <DispatchConsoleHeaderView boardDate={boardDate} department={department} live={live} pathname={pathname} user={user} />;
}

export function DispatchConsoleHeaderView({
  boardDate,
  department = null,
  live,
  pathname,
  user
}: DispatchConsoleHeaderProps & {
  boardDate: string | null;
  department?: string | null;
  live: boolean;
  pathname: string;
}) {
  const dateQuery = boardDate ? `date=${encodeURIComponent(boardDate)}` : "";
  const items = getDispatchNavigationItems(user);
  const dispatchHref = dateQuery ? `/board?${dateQuery}` : "/board";
  const activeItem = items.find((item) => {
    if (!isActiveDestination(pathname, live, item.href)) return false;
    const expectedDepartment = item.activeQuery?.department;
    return expectedDepartment === undefined || (expectedDepartment === null ? !department : expectedDepartment === department);
  });
  const workspaceItem = activeItem?.href === "/board" ? null : activeItem;
  const copy = workspaceItem && ["Sales", "Marketing", "Advertising"].includes(workspaceItem.title)
    ? { title: workspaceItem.title, description: workspaceItem.description }
    : getConsoleCopy(pathname, live);

  const getWorkspaceHref = (href: string) => {
    if (href.startsWith("/board?view=live")) return `/board?${["view=live", dateQuery].filter(Boolean).join("&")}`;
    if (!dateQuery || href.includes("date=")) return href;
    return `${href}${href.includes("?") ? "&" : "?"}${dateQuery}`;
  };

  return (
    <header className="dispatch-console-header">
      <div className="dispatch-console-title">
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
      <nav aria-label="Dispatch console" className="dispatch-console-tabs">
        <Link href="/command-center">CCC Home</Link>
        <span aria-hidden="true" className="dispatch-console-tab-separator">/</span>
        <Link
          aria-current={!workspaceItem ? "page" : undefined}
          className={!workspaceItem ? "active dispatch-console-root" : "dispatch-console-root"}
          href={dispatchHref}
        >
          Dispatch Board <small>Live</small>
        </Link>
        {workspaceItem ? (
          <>
            <span aria-hidden="true" className="dispatch-console-tab-separator">/</span>
            <Link aria-current="page" className="active" href={getWorkspaceHref(workspaceItem.href)}>
              {workspaceItem.title}
            </Link>
          </>
        ) : null}
      </nav>
    </header>
  );
}
