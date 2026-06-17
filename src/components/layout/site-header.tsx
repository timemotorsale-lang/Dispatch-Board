import Link from "next/link";

import { APP_NAME, placeholderRoutes } from "@/app/config";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div>
        <strong>{APP_NAME}</strong>
        <span>Foundation shell for upcoming dispatch workflows.</span>
      </div>
      <nav className="site-nav" aria-label="Primary">
        <Link href="/">Home</Link>
        {placeholderRoutes.map((route) => (
          <Link key={route.href} href={route.href}>
            {route.title}
          </Link>
        ))}
      </nav>
    </header>
  );
}

