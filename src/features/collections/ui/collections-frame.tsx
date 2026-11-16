import Link from "next/link";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/server/auth/current-user";

import { resolveCollectionsMode } from "../config/flags";
import { hasCollectionsPermission, type CollectionsPermission } from "../config/permissions";
import styles from "./collections.module.css";

export const COLLECTIONS_SECTIONS = [
  { key: "queue", href: "/collections", label: "Queue", ready: true, permission: "VIEW" },
  { key: "inbox", href: "/collections/inbox", label: "Inbox", ready: true, permission: "VIEW" },
  { key: "accounts", href: "/collections/accounts", label: "Accounts", ready: true, permission: "VIEW" },
  // Not built yet: shown as "coming soon" until its stage lands (Reconciliation: Stage 15).
  { key: "dashboard", href: "/collections/dashboard", label: "Dashboard", ready: true, permission: "VIEW_DASHBOARD" },
  { key: "reconciliation", href: "/collections/reconciliation", label: "Reconciliation", ready: false, permission: "VIEW_DASHBOARD" },
  { key: "import", href: "/collections/import", label: "Import", ready: true, permission: "IMPORT" },
  { key: "playbook", href: "/collections/playbook", label: "Playbook", ready: true, permission: "EDIT_SETTINGS" },
  { key: "settings", href: "/collections/settings", label: "Settings", ready: true, permission: "EDIT_SETTINGS" }
] as const satisfies ReadonlyArray<{ key: string; href: string; label: string; ready: boolean; permission: CollectionsPermission }>;

export type CollectionsSectionKey = (typeof COLLECTIONS_SECTIONS)[number]["key"];

/** Shared page frame: title, Collections menu, and a REVIEW-mode reminder. */
export async function CollectionsFrame({ section, title, description, actions, children }: {
  section: CollectionsSectionKey;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const mode = resolveCollectionsMode();
  // Only show menu links this person can open.
  const user = await getCurrentUser();
  const sections = COLLECTIONS_SECTIONS.filter(item => hasCollectionsPermission(user, item.permission));
  return (
    <div className={styles.page} data-collections-page="">
      {mode === "REVIEW" ? (
        <p className={styles.modeBanner} role="note">
          Collections is in REVIEW mode: only admins can see it, and texts/emails are never really sent (dry run only).
        </p>
      ) : null}
      <nav aria-label="Collections">
        <ul className={styles.subnav}>
          {sections.map(item => (
            <li key={item.key}>
              {item.ready
                ? <Link href={item.href} aria-current={item.key === section ? "page" : undefined}>{item.label}</Link>
                : <span aria-disabled="true" title="Coming in a later build stage" style={{ opacity: 0.55, cursor: "default" }}>{item.label} (coming soon)</span>}
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
    </div>
  );
}
