import Link from "next/link";
import type { ReactNode } from "react";

import { resolveCollectionsMode } from "../config/flags";
import styles from "./collections.module.css";

export const COLLECTIONS_SECTIONS = [
  { key: "queue", href: "/collections", label: "Queue" },
  { key: "inbox", href: "/collections/inbox", label: "Inbox" },
  { key: "accounts", href: "/collections/accounts", label: "Accounts" },
  { key: "dashboard", href: "/collections/dashboard", label: "Dashboard" },
  { key: "reconciliation", href: "/collections/reconciliation", label: "Reconciliation" },
  { key: "import", href: "/collections/import", label: "Import" },
  { key: "settings", href: "/collections/settings", label: "Settings" }
] as const;

export type CollectionsSectionKey = (typeof COLLECTIONS_SECTIONS)[number]["key"];

/** Shared page frame: title, Collections menu, and a REVIEW-mode reminder. */
export function CollectionsFrame({ section, title, description, actions, children }: {
  section: CollectionsSectionKey;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const mode = resolveCollectionsMode();
  return (
    <main className={styles.page}>
      {mode === "REVIEW" ? (
        <p className={styles.modeBanner} role="note">
          Collections is in REVIEW mode: only admins can see it, and texts/emails are never really sent (dry run only).
        </p>
      ) : null}
      <nav aria-label="Collections">
        <ul className={styles.subnav}>
          {COLLECTIONS_SECTIONS.map(item => (
            <li key={item.key}>
              <Link href={item.href} aria-current={item.key === section ? "page" : undefined}>{item.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <header className={styles.header}>
        <div>
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      {children}
    </main>
  );
}
