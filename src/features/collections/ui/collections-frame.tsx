import Link from "next/link";
import type { ReactNode } from "react";

import { BarChart3, House, Inbox, ListChecks, PhoneCall, Plug, Scale, Settings, Upload, Users, type LucideIcon } from "lucide-react";

import { getCurrentUser } from "@/server/auth/current-user";

import { resolveCollectionsMode } from "../config/flags";
import { hasCollectionsPermission, type CollectionsPermission } from "../config/permissions";
import styles from "./collections.module.css";

export const COLLECTIONS_SECTIONS = [
  { key: "home", href: "/collections", label: "Home", ready: true, permission: "VIEW" },
  { key: "queue", href: "/collections/queue", label: "Queue", ready: true, permission: "VIEW" },
  { key: "inbox", href: "/collections/inbox", label: "Inbox", ready: true, permission: "VIEW" },
  { key: "accounts", href: "/collections/accounts", label: "Accounts", ready: true, permission: "VIEW" },
  { key: "dashboard", href: "/collections/dashboard", label: "Dashboard", ready: true, permission: "VIEW_DASHBOARD" },
  { key: "reconciliation", href: "/collections/reconciliation", label: "Reconciliation", ready: true, permission: "VIEW_DASHBOARD" },
  { key: "import", href: "/collections/import", label: "Import", ready: true, permission: "IMPORT" },
  { key: "playbook", href: "/collections/playbook", label: "Playbook", ready: true, permission: "EDIT_SETTINGS" },
  { key: "integrations", href: "/collections/integrations", label: "Integrations", ready: true, permission: "EDIT_SETTINGS" },
  { key: "settings", href: "/collections/settings", label: "Settings", ready: true, permission: "EDIT_SETTINGS" }
] as const satisfies ReadonlyArray<{ key: string; href: string; label: string; ready: boolean; permission: CollectionsPermission }>;

export type CollectionsSectionKey = (typeof COLLECTIONS_SECTIONS)[number]["key"];

const SECTION_ICONS: Record<CollectionsSectionKey, LucideIcon> = {
  home: House, queue: PhoneCall, inbox: Inbox, accounts: Users, dashboard: BarChart3, reconciliation: Scale, import: Upload, playbook: ListChecks, integrations: Plug, settings: Settings
};

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
      <div className={styles.moduleBar}>
        <nav aria-label="Collections" className={styles.moduleNav}>
          <ul>
            {sections.map(item => {
              const Icon = SECTION_ICONS[item.key];
              return (
                <li key={item.key}>
                  <Link href={item.href} aria-current={item.key === section ? "page" : undefined}><Icon size={16} aria-hidden="true" />{item.label}</Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {mode === "REVIEW" ? <span className={styles.modePill} role="note" title="Only admins can see Collections, and texts and emails are saved as dry runs, never sent.">Review mode · dry run</span> : null}
      </div>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Collections</p>
          <h1>{title}</h1>
          {description ? <p className={styles.pageDescription}>{description}</p> : null}
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}
