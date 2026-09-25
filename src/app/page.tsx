import Link from "next/link";
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  CarFront,
  ClipboardCheck,
  ClipboardList,
  ContactRound,
  FileText,
  Gauge,
  Menu,
  MessageSquare,
  PackageCheck,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Wrench,
  type LucideIcon
} from "lucide-react";

import { CRM_NEXT_CUSTOMERS_HREF, LEGACY_CUSTOMER_ARCHIVE_HREF } from "@/features/crm/crm-route-authority";
import { getCurrentUser } from "@/server/auth/current-user";
import { getPermittedWorkspaces, getWorkspaceKey, type WorkspaceKey } from "@/server/auth/navigation";
import { isManager } from "@/server/policies/access";

import { APP_NAME } from "./config";
import styles from "./home.module.css";

type MobileCard = {
  accent: "blue" | "green" | "gold" | "red" | "violet" | "slate";
  count?: string;
  description: string;
  href: string;
  icon: LucideIcon;
  label: string;
  managerOnly?: boolean;
  permissions?: WorkspaceKey[];
};

type MobileSection = {
  actionHref?: string;
  actionLabel?: string;
  cards: MobileCard[];
  eyebrow?: string;
  title: string;
};

const sections: MobileSection[] = [
  {
    actionHref: "/board",
    actionLabel: "Dashboard",
    eyebrow: "Start here",
    title: "My Day",
    cards: [
      { accent: "blue", count: "Open", description: "Assigned work and next actions.", href: "/my-tasks", icon: ClipboardCheck, label: "My Tasks" },
      { accent: "gold", count: "Today", description: "Appointments and promises due today.", href: "/appointments", icon: CalendarDays, label: "Appointments" },
      { accent: "red", count: "Live", description: "Active board work and operating pressure.", href: "/board", icon: Gauge, label: "Today's Board" },
      { accent: "violet", count: "Scan", description: "Open camera capture for photos, IDs, cards, and documents.", href: "/capture", icon: Camera, label: "Photos" },
      { accent: "green", description: "Log a quick update or route a new action.", href: "/tasks/intake", icon: ClipboardList, label: "Quick Ops Log" },
      { accent: "violet", description: "Signals, updates, and recent movement.", href: "/activity", icon: Activity, label: "Activity" },
      { accent: "slate", description: "Approvals and stuck work needing help.", href: "/manager-review", icon: ShieldCheck, label: "Manager Review", managerOnly: true }
    ]
  },
  {
    actionHref: "/crm-next",
    actionLabel: "CRM",
    title: "Customers & Sales",
    cards: [
      { accent: "blue", description: "Customer command center.", href: "/crm-next", icon: ContactRound, label: "Customer Console", permissions: ["SALES", "MANAGEMENT", "OPERATIONS_COORDINATOR", "OFFICE"] },
      { accent: "green", description: "Find records, Customer 360, and leads.", href: CRM_NEXT_CUSTOMERS_HREF, icon: Users, label: "Customers", permissions: ["SALES", "MANAGEMENT", "OPERATIONS_COORDINATOR", "OFFICE", "ADVISOR"] },
      { accent: "gold", count: "Due", description: "Follow-ups and next customer actions.", href: "/crm-next/needs-attention", icon: Bell, label: "Follow-Ups", permissions: ["SALES", "MANAGEMENT", "OPERATIONS_COORDINATOR"] },
      { accent: "violet", description: "Customer conversations and history.", href: "/crm-next/timeline", icon: MessageSquare, label: "Communications", permissions: ["SALES", "MANAGEMENT", "OPERATIONS_COORDINATOR", "OFFICE"] },
      { accent: "red", description: "Active opportunities and deal work.", href: "/crm-next/deals", icon: BriefcaseBusiness, label: "Deals", permissions: ["SALES", "MANAGEMENT"] },
      { accent: "slate", description: "Fallback archive for legacy records.", href: LEGACY_CUSTOMER_ARCHIVE_HREF, icon: FileText, label: "Customer Archive", permissions: ["SALES", "MANAGEMENT", "OPERATIONS_COORDINATOR", "OFFICE"] }
    ]
  },
  {
    actionHref: "/vehicles",
    actionLabel: "Inventory",
    title: "Inventory",
    cards: [
      { accent: "blue", description: "Inventory operating home.", href: "/vehicles", icon: CarFront, label: "Inventory", permissions: ["INVENTORY", "MANAGEMENT", "VEHICLE_OPERATIONS_LEAD", "SALES"] },
      { accent: "green", description: "Start vehicle intake and custody.", href: "/vehicles/workflows/add-vehicle", icon: UserPlus, label: "Vehicle Intake", permissions: ["INVENTORY", "MANAGEMENT", "VEHICLE_OPERATIONS_LEAD", "OPERATIONS_COORDINATOR"] },
      { accent: "gold", description: "One repair and recon advisor workspace.", href: "/vehicles/recon-repair-advisor", icon: Wrench, label: "Recon / Repair", permissions: ["INVENTORY", "SERVICE", "MANAGEMENT", "VEHICLE_OPERATIONS_LEAD"] },
      { accent: "violet", description: "Photos, listing, and sale readiness.", href: "/tasks?department=ADVERTISING", icon: Sparkles, label: "Photos / Listings", permissions: ["INVENTORY", "MARKETING", "MANAGEMENT", "VEHICLE_OPERATIONS_LEAD"] }
    ]
  },
  {
    actionHref: "/vehicles/recon-repair-advisor",
    actionLabel: "Recon / Repair",
    title: "Service / Shop",
    cards: [
      { accent: "blue", description: "Open repair orders and governed work.", href: "/vehicles/repair-workbench", icon: ClipboardCheck, label: "Work Orders", permissions: ["SERVICE", "TECHNICIAN", "ADVISOR", "MANAGEMENT", "VEHICLE_OPERATIONS_LEAD"] },
      { accent: "gold", description: "Parts constraints and demand.", href: "/vehicles/parts-operations", icon: PackageCheck, label: "Waiting on Parts", permissions: ["PARTS", "SERVICE", "TECHNICIAN", "MANAGEMENT", "VEHICLE_OPERATIONS_LEAD"] },
      { accent: "green", description: "Quality, release, and rework decisions.", href: "/vehicles/quality-control", icon: ShieldCheck, label: "Ready for Review", permissions: ["QUALITY", "SERVICE", "MANAGEMENT", "VEHICLE_OPERATIONS_LEAD"] },
      { accent: "violet", description: "Diagnostic cases and advisor review.", href: "/diagnostics", icon: Wrench, label: "Diagnostics", permissions: ["TECHNICIAN", "ADVISOR", "SERVICE", "MANAGEMENT"] }
    ]
  },
  {
    actionHref: "/operations-coordinator",
    actionLabel: "Ops",
    title: "Operations",
    cards: [
      { accent: "blue", description: "Front-door coordination workspace.", href: "/operations-coordinator", icon: BriefcaseBusiness, label: "Coordinator", permissions: ["OPERATIONS_COORDINATOR", "OFFICE", "MANAGEMENT"] },
      { accent: "green", description: "Create, search, and route task work.", href: "/tasks", icon: ClipboardList, label: "Tasks" },
      { accent: "gold", description: "Projects and operational ownership.", href: "/projects", icon: FileText, label: "Projects" },
      { accent: "slate", description: "Staff, duties, and workspace setup.", href: "/settings/team", icon: Users, label: "Staff / Roles", managerOnly: true }
    ]
  }
];

const desktopLinks = [
  { description: "Open the daily command center for active dispatch work, queues, and team execution.", href: "/board", label: "Open Dispatch Board", title: "Dispatch Board", tone: "primary" },
  { description: "Work customers, prospects, leads, follow-ups, appointments, and CRM actions.", href: "/crm-next", label: "Open Customer Console", title: "Customer Console", tone: "primary" },
  { description: "Open Customer records, Customer 360, search, and relationship work.", href: CRM_NEXT_CUSTOMERS_HREF, label: "Open Customer Records", title: "Customers", tone: "primary" },
  { description: "Legacy fallback access for historical customer records when Customer Console cannot complete the workflow yet.", href: LEGACY_CUSTOMER_ARCHIVE_HREF, label: "Open Customer Archive", title: "Legacy Customer Archive", tone: "secondary" },
  { description: "See assigned work and complete the next action for your role.", href: "/my-tasks", label: "Open My Tasks", title: "My Tasks", tone: "secondary" },
  { description: "Create, review, and manage formal tasks that need ownership and tracking.", href: "/tasks", label: "Open Tasks", title: "Tasks", tone: "secondary" },
  { description: "Sign in or switch staff session before entering protected workspaces.", href: "/login", label: "Open Login", title: "Login", tone: "secondary" }
];

function canShowCard(card: MobileCard, workspace: WorkspaceKey | null, permittedWorkspaces: WorkspaceKey[], manager: boolean) {
  if (card.managerOnly) return manager;
  if (!card.permissions?.length) return true;
  if (workspace && card.permissions.includes(workspace)) return true;
  return card.permissions.some((permission) => permittedWorkspaces.includes(permission));
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const currentWorkspace = user ? getWorkspaceKey(user) : null;
  const permittedWorkspaces = user ? getPermittedWorkspaces(user).map((workspace) => workspace.key) : [];
  const manager = user ? isManager(user) : false;
  const displayName = user?.name?.split(" ")[0] ?? "Team";
  const visibleSections = sections
    .map((section) => ({
      ...section,
      cards: section.cards.filter((card) => canShowCard(card, currentWorkspace, permittedWorkspaces, manager))
    }))
    .filter((section) => section.cards.length > 0);

  return (
    <main aria-labelledby="home-launcher-title" className={styles.page}>
      <section className={styles.mobileShell} aria-label="Mobile operational launcher">
        <header className={styles.mobileTopbar}>
          <button aria-label="Open navigation" type="button"><Menu size={21} /></button>
          <div>
            <strong>{APP_NAME}</strong>
            <span>{displayName} workspace</span>
          </div>
          <Link aria-label="Search" href="/crm-next/search"><Search size={21} /></Link>
        </header>

        <section className={styles.mobileHero}>
          <span>Operational home</span>
          <h1>What needs attention now?</h1>
          <p>Start with today’s work, then jump into customers, inventory, shop, or management without hunting through menus.</p>
        </section>

        {visibleSections.map((section) => (
          <section className={styles.mobileSection} key={section.title}>
            <header>
              <div>
                {section.eyebrow ? <span>{section.eyebrow}</span> : null}
                <h2>{section.title}</h2>
              </div>
              {section.actionHref ? <Link href={section.actionHref}>{section.actionLabel ?? "Open"}</Link> : null}
            </header>
            <div className={styles.mobileGrid}>
              {section.cards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link className={styles.mobileCard} data-accent={card.accent} href={card.href} key={`${section.title}-${card.href}-${card.label}`}>
                    <span><Icon size={22} /></span>
                    <b>{card.count ? <><strong>{card.count}</strong> {card.label}</> : card.label}</b>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </section>

      <section className={styles.desktopShell}>
        <header className={styles.desktopHero}>
          <div>
            <p>Workspace launcher</p>
            <h1 id="home-launcher-title">{APP_NAME}</h1>
            <span>Choose the workspace you need and continue working from a safe, protected route.</span>
          </div>
          <strong><i /> System ready</strong>
        </header>

        <nav aria-label="Primary workspace links" className={styles.desktopGrid}>
          {desktopLinks.map((link) => (
            <Link className={styles.desktopCard} data-tone={link.tone} href={link.href} key={link.href}>
              <span>{link.title}</span>
              <strong>{link.label}</strong>
              <small>{link.description}</small>
              <b>Continue</b>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
