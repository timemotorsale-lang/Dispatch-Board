import Link from "next/link";

import { APP_NAME } from "@/app/config";
import { LogoutButton } from "@/features/auth/logout-button";
import type { AuthenticatedUser } from "@/server/auth/store";

type SiteHeaderProps = {
  user: AuthenticatedUser;
};

const authenticatedRoutes = [
  {
    href: "/board",
    title: "Board"
  },
  {
    href: "/tasks",
    title: "Tasks"
  },
  {
    href: "/settings",
    title: "Settings"
  }
] as const;

export function SiteHeader({ user }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div>
        <strong>{APP_NAME}</strong>
        <span>{user.email}</span>
      </div>
      <nav className="site-nav" aria-label="Primary">
        <Link href="/">Home</Link>
        {authenticatedRoutes.map((route) => (
          <Link key={route.href} href={route.href}>
            {route.title}
          </Link>
        ))}
        <LogoutButton />
      </nav>
    </header>
  );
}

