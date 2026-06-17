import Link from "next/link";

import { PlaceholderCard } from "@/components/ui/placeholder-card";

import { APP_NAME, placeholderRoutes } from "./config";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <span className="eyebrow">v0.1.0 foundation</span>
        <h1>{APP_NAME}</h1>
        <p>
          The project now boots as a minimal Next.js application with a PostgreSQL + Prisma
          baseline, route placeholders, and core quality commands for safe milestone work.
        </p>
        <div className="hero-actions">
          <Link className="pill pill-primary" href="/board">
            Open board placeholder
          </Link>
          <Link className="pill pill-secondary" href="/login">
            Open login placeholder
          </Link>
        </div>
        <div className="pill-list">
          <span className="pill pill-muted">Next.js App Router</span>
          <span className="pill pill-muted">TypeScript</span>
          <span className="pill pill-muted">Prisma + PostgreSQL</span>
          <span className="pill pill-muted">Vitest baseline</span>
        </div>
      </section>

      <section className="panel-grid" aria-label="Foundation routes">
        {placeholderRoutes.map((route) => (
          <PlaceholderCard
            key={route.href}
            title={route.title}
            description={route.description}
            href={route.href}
            ctaLabel={`Open ${route.title.toLowerCase()}`}
          />
        ))}
      </section>
    </main>
  );
}

