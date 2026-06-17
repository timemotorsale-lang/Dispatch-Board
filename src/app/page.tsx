import Link from "next/link";

import { PlaceholderCard } from "@/components/ui/placeholder-card";

import { APP_NAME, placeholderRoutes } from "./config";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <span className="eyebrow">v0.2.0 identity</span>
        <h1>{APP_NAME}</h1>
        <p>
          The app now includes seeded staff accounts, secure server-side sessions, protected app
          routes, and reusable permission helpers for the manager and staff workflow foundation.
        </p>
        <div className="hero-actions">
          <Link className="pill pill-primary" href="/board">
            Open protected board
          </Link>
          <Link className="pill pill-secondary" href="/login">
            Open login
          </Link>
        </div>
        <div className="pill-list">
          <span className="pill pill-muted">Next.js App Router</span>
          <span className="pill pill-muted">TypeScript</span>
          <span className="pill pill-muted">Prisma + PostgreSQL</span>
          <span className="pill pill-muted">Session auth + policies</span>
        </div>
      </section>

      <section className="panel-grid" aria-label="Application routes">
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

