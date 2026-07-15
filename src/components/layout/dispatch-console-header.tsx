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

  return <DispatchConsoleHeaderView boardDate={boardDate} live={live} pathname={pathname} user={user} />;
}

export function DispatchConsoleHeaderView({
  boardDate,
  live,
  pathname,
  user
}: DispatchConsoleHeaderProps & {
  boardDate: string | null;
  live: boolean;
  pathname: string;
}) {
  const dateQuery = boardDate ? `date=${encodeURIComponent(boardDate)}` : "";
  const copy = getConsoleCopy(pathname, live);
  const items = getDispatchNavigationItems(user);

  return (
    <header className="dispatch-console-header">
      <div className="dispatch-console-title">
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
      <nav aria-label="Dispatch console" className="dispatch-console-tabs">
        <span className="dispatch-console-context">Dispatch Board <small>Live</small></span>
        {items.map((item) => {
          const href = item.href === "/board"
            ? dateQuery ? `/board?${dateQuery}` : "/board"
            : item.href.startsWith("/board?view=live")
              ? `/board?${["view=live", dateQuery].filter(Boolean).join("&")}`
              : item.href;
          const active = isActiveDestination(pathname, live, item.href);

          return (
            <Link aria-current={active ? "page" : undefined} className={active ? "active" : undefined} href={href} key={item.title}>
              {item.title}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
