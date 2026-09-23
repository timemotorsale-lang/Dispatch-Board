"use client";

import { ArrowRight, Layers3, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  getWorkspaceDefinition,
  resolveWorkspaceForPath,
  type WorkspaceKey
} from "@/server/auth/navigation";
import { isManager } from "@/server/policies/access";
import { CRM_NEXT_CUSTOMERS_HREF } from "@/features/crm/crm-route-authority";

import { getNavigationItemsForPath } from "./navigation";

type DispatchConsoleHeaderProps = {
  preferredWorkspace?: WorkspaceKey | null;
  user: AuthenticatedUser;
};

const consoleCopy: Array<{ description: string; path: string; title: string }> = [
  { path: "/my-tasks", title: "My Tasks", description: "Your assigned work and next actions" },
  { path: "/tasks", title: "Tasks", description: "Search, organize, and manage Dispatch work" },
  { path: "/projects", title: "Projects", description: "Coordinate operational projects and work areas" },
  { path: "/appointments", title: "Appointments", description: "Manage the appointment schedule and commitments" },
  { path: "/vehicles", title: "Vehicles", description: "Operate vehicle records and readiness workflows" },
  { path: "/diagnostics", title: "Diagnostics", description: "Prioritize and execute technician diagnostic cases" },
  { path: CRM_NEXT_CUSTOMERS_HREF, title: "Customers", description: "Manage Customer records and connected work" },
  { path: "/manager-review", title: "Manager Review", description: "Review approvals, exceptions, and escalations" },
  { path: "/staff", title: "Team", description: "Manage team duties and execution context" },
  { path: "/activity", title: "Activity", description: "Review recorded Dispatch events and updates" }
];

const workflowReviewIndex: Array<{
  description: string;
  href?: string;
  keywords: string;
  prerequisite: string;
  status: "Live" | "Limited" | "Manager" | "Planned" | "Review";
  title: string;
}> = [
  { title: "Dispatch Board", description: "Live work board, department views, due work, and status movement.", href: "/board?view=live", keywords: "dispatch board live board status due department tasks", prerequisite: "Available from the main console.", status: "Live" },
  { title: "My Work", description: "Assigned tasks, technician work, and personal next actions.", href: "/my-tasks", keywords: "my work tasks technician assigned start repair labor", prerequisite: "Requires assigned or claimable work.", status: "Live" },
  { title: "Vehicle Operations Lead Workbook", description: "Daily checklist, action plan, report draft, carryovers, and staff support.", href: "/vehicles/coo-workbook", keywords: "workbook coo workbook vehicle operations lead daily checklist action plan report draft carryover staff support", prerequisite: "Use COO scope for manager work or My scope for personal workbook work.", status: "Live" },
  { title: "Workbook Checklist", description: "Daily checklist items, updates, completion, and carryover-ready work.", href: "/vehicles/coo-workbook/checklist", keywords: "workbook checklist daily checklist done carryover update workday", prerequisite: "Open from the workbook day you are working.", status: "Live" },
  { title: "Workbook To-do List", description: "Workbook task list for items that need follow-through today.", href: "/vehicles/coo-workbook/to-do-list", keywords: "workbook todo to do list task follow through workday", prerequisite: "Use the active workbook day.", status: "Live" },
  { title: "Workbook Quick Update", description: "Capture quick updates, customer/vendor notes, CRM import context, and follow-up signals.", href: "/vehicles/coo-workbook/quick-update", keywords: "workbook quick update note customer vendor phone crm import follow up signal", prerequisite: "Use when the update belongs in the daily operating record.", status: "Live" },
  { title: "Workbook Action Plan", description: "Turn active signals into the daily action plan for operations follow-through.", href: "/vehicles/coo-workbook/action-plan", keywords: "workbook action plan daily plan signals repair orders approvals exceptions", prerequisite: "Review current signals before creating commitments.", status: "Live" },
  { title: "Workbook Carryover", description: "Protect unfinished work and carry it forward without losing source context.", href: "/vehicles/coo-workbook/carryover", keywords: "workbook carryover unfinished tomorrow protect source context", prerequisite: "Use for work that should survive day close.", status: "Live" },
  { title: "Workbook Report Seeds", description: "Collect report-relevant facts, exceptions, and outcomes before drafting the daily report.", href: "/vehicles/coo-workbook/report-seeds", keywords: "workbook report seeds daily report facts exceptions outcomes", prerequisite: "Add or review seeds before creating the report draft.", status: "Live" },
  { title: "Workbook Staff Support", description: "Review staff workbook needs and support requests that need manager attention.", href: "/vehicles/coo-workbook/staff-support", keywords: "workbook staff support team help manager attention", prerequisite: "Manager or delegated support context may be required.", status: "Manager" },
  { title: "Workbook Drafts", description: "Open saved daily report drafts and closeout-ready workbook summaries.", href: "/vehicles/coo-workbook/drafts", keywords: "workbook drafts report draft daily report closeout summary", prerequisite: "Generate or review a report draft from the workbook.", status: "Live" },
  { title: "Workbook Bring Forward", description: "Recover prior unfinished work and decide what belongs in today’s focus.", href: "/vehicles/coo-workbook/bring-forward", keywords: "workbook bring forward recover unfinished prior assignments focus", prerequisite: "Review before accepting new daily commitments.", status: "Live" },
  { title: "Workbook Purchase / Appraisal Capture", description: "Capture purchase and appraisal workbook details that affect the operating day.", href: "/vehicles/coo-workbook/purchase-appraisal-capture", keywords: "workbook purchase appraisal acquisition capture deal vehicle", prerequisite: "Use when purchase or appraisal details belong in the workbook.", status: "Review" },
  { title: "Workbook Focus Compass", description: "Review focus direction and daily operating priorities.", href: "/vehicles/coo-workbook/focus-compass", keywords: "workbook focus compass priorities direction daily focus", prerequisite: "Use with the active workbook day.", status: "Review" },
  { title: "Workbook Effectiveness Pilot", description: "Start the day, approve daily focus, and review workbook effectiveness signals.", href: "/vehicles/coo-workbook/effectiveness-pilot", keywords: "workbook effectiveness pilot start the day daily focus approve outcomes rhythm", prerequisite: "Use during the review/pilot workflow.", status: "Review" },
  { title: "More Workbook Tools", description: "Open the workbook tool drawer for additional operating helpers.", href: "/vehicles/coo-workbook/more-tools", keywords: "workbook more tools drawer additional helpers", prerequisite: "Use when a specific workbook tool is not listed above.", status: "Live" },
  { title: "Customer Console", description: "Customer record, check-in, messages, notes, cases, and customer timeline.", href: CRM_NEXT_CUSTOMERS_HREF, keywords: "customer crm check in message note email call case timeline customer 360", prerequisite: "Search or select a customer first.", status: "Limited" },
  { title: "Diagnostics", description: "Diagnostic case queue, next tests, evidence, and handoff readiness.", href: "/diagnostics", keywords: "diagnosis diagnostic test troubleshooting technician evidence handoff", prerequisite: "Use a diagnostic case or create one from the workspace.", status: "Live" },
  { title: "Labor Guide / Estimate", description: "Find labor or parts, build a quote, save drafts, and prepare estimates.", href: "/diagnostics/labor-guide", keywords: "labor guide estimate quote parts pricing authorization preliminary quote", prerequisite: "Vehicle details improve results; RO required for official presentation.", status: "Review" },
  { title: "Repair Planning", description: "Select repair type, inspect, plan scope, and move toward repair readiness.", href: "/vehicles/shop-planning", keywords: "repair planning repair type inspection scope bodywork vendor diagnostic mechanical", prerequisite: "Select an active repair order first.", status: "Review" },
  { title: "Repair Workbench", description: "Open repair orders, repair jobs, execution controls, and repair history.", href: "/vehicles/repair-workbench", keywords: "repair order ro repairs jobs execution start repairs approval handoff", prerequisite: "Best with an RO or repair job context.", status: "Live" },
  { title: "Parts Operations", description: "Parts demand, ordering, receiving, sourcing, and vendor purchase follow-up.", href: "/vehicles/parts-operations", keywords: "parts order ordering receiving source vendor purchase demand", prerequisite: "Use linked repair or inventory context when available.", status: "Live" },
  { title: "Claims Desk", description: "Insurance claim intake, approvals, repair linkage, and claim follow-up.", href: "/vehicles/claims-desk", keywords: "claim claims insurance adjuster approval deductible repair claim desk", prerequisite: "Claim record or customer/vehicle context recommended.", status: "Review" },
  { title: "Manager Review", description: "Approvals, exceptions, escalations, and manager decision queues.", href: "/manager-review", keywords: "manager review approval exception escalation authorize hold", prerequisite: "Manager access required for governed decisions.", status: "Manager" },
  { title: "Appointments", description: "Schedule, inspect, reinspection, drop-off, and follow-up appointments.", href: "/appointments", keywords: "appointment schedule inspection drop off follow up calendar", prerequisite: "Customer or vehicle context helps prefill the appointment.", status: "Live" },
  { title: "Workflow availability search", description: "Review-only helper for finding where a workflow lives in Dispatch Board.", keywords: "workflow search tool finder launcher availability adoption", prerequisite: "Under review before adoption.", status: "Planned" }
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

function WorkflowReviewLauncher() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!normalizedQuery) return [];
    return workflowReviewIndex
      .filter((workflow) => `${workflow.title} ${workflow.description} ${workflow.keywords} ${workflow.status}`.toLowerCase().includes(normalizedQuery))
      .slice(0, 14);
  }, [normalizedQuery]);

  return (
    <div className="dispatch-workflow-review-launcher">
      <label>
        <Search aria-hidden="true" size={15} />
        <span className="sr-only">Find workflow or tool</span>
        <input
          aria-label="Find workflow or tool"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find workflow or tool..."
          value={query}
        />
        <b>Review</b>
      </label>
      <div className="dispatch-workflow-review-results" role="listbox">
        <header>
          <strong>{normalizedQuery ? "Matching workflows" : "Workflow finder review"}</strong>
          <small>{normalizedQuery ? `${matches.length} shown` : "Type a task, tool, or workflow name"}</small>
        </header>
        {matches.length ? matches.map((workflow) => {
          const content = (
            <>
              <span><strong>{workflow.title}</strong><b data-status={workflow.status}>{workflow.status}</b></span>
              <small>{workflow.description}</small>
              <em>{workflow.prerequisite}</em>
            </>
          );
          return workflow.href ? (
            <Link href={workflow.href} key={workflow.title} role="option">
              {content}
              <ArrowRight aria-hidden="true" size={14} />
            </Link>
          ) : (
            <span className="dispatch-workflow-review-disabled" key={workflow.title} role="option">
              {content}
            </span>
          );
        }) : (
          <p>{normalizedQuery ? "No workflow match yet. Try “workbook,” “parts,” “approval,” “diagnosis,” “claim,” or “appointment.”" : "Search by task or workflow, like workbook, parts, approval, diagnosis, claim, appointment, or repair."}</p>
        )}
      </div>
    </div>
  );
}

export function DispatchConsoleHeader({ preferredWorkspace, user }: DispatchConsoleHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const live = pathname === "/board" && searchParams.get("view") === "live";
  const boardDate = searchParams.get("date");
  const department = searchParams.get("department");

  return <DispatchConsoleHeaderView boardDate={boardDate} department={department} live={live} pathname={pathname} preferredWorkspace={preferredWorkspace} returnTo={searchParams.get("returnTo")} user={user} />;
}

export function DispatchConsoleHeaderView({
  boardDate,
  department = null,
  live,
  pathname,
  preferredWorkspace,
  returnTo = null,
  user
}: DispatchConsoleHeaderProps & {
  boardDate: string | null;
  department?: string | null;
  live: boolean;
  pathname: string;
  returnTo?: string | null;
}) {
  const dateQuery = boardDate ? `date=${encodeURIComponent(boardDate)}` : "";
  const items = getNavigationItemsForPath(user, pathname, preferredWorkspace);
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
  const workspace = resolveWorkspaceForPath(user, pathname, preferredWorkspace);
  const workspaceDefinition = getWorkspaceDefinition(workspace);
  const roleWorkspace = workspace !== "MANAGEMENT";
  const canOpenManagerWorkspace = isManager(user);
  const roleCopy = workspace === "TECHNICIAN" && pathname === "/my-tasks/available"
    ? { title: "Available Work", description: "Eligible work ready for you to claim" }
    : workspace === "TECHNICIAN" && pathname.startsWith("/diagnostics")
      ? { title: "Diagnostics & Tools", description: "Guided diagnostic support for assigned work" }
      : workspace === "TECHNICIAN"
        ? { title: "My Work", description: "Your assigned repairs and next actions" }
        : activeItem
          ? { title: activeItem.title, description: activeItem.description }
          : { title: workspaceDefinition.label, description: workspaceDefinition.description };
  const isDiagnosticsPartsOrdering = pathname === "/diagnostics/parts-ordering";
  const diagnosticsReturnHref = returnTo ?? "/diagnostics/labor-guide";

  const getWorkspaceHref = (href: string) => {
    if (href.startsWith("/board?view=live")) return `/board?${["view=live", dateQuery].filter(Boolean).join("&")}`;
    if (!dateQuery || href.includes("date=")) return href;
    return `${href}${href.includes("?") ? "&" : "?"}${dateQuery}`;
  };

  return (
    <header className="dispatch-console-header dispatch-console-header-with-launcher">
      <div className="dispatch-console-title">
        <h1>{roleWorkspace ? roleCopy.title : copy.title}</h1>
        <p>{roleWorkspace ? roleCopy.description : copy.description}</p>
      </div>
      {roleWorkspace ? (
        <nav aria-label={`${workspaceDefinition.label} navigation`} className="dispatch-console-tabs">
          <Link href={workspaceDefinition.landingRoute}>{workspaceDefinition.label}</Link>
          <span aria-hidden="true" className="dispatch-console-tab-separator">/</span>
          <Link aria-current="page" className="active" href={pathname}>
            {roleCopy.title}
          </Link>
        </nav>
      ) : (
        isDiagnosticsPartsOrdering ? (
          <nav aria-label="Diagnostics parts ordering navigation" className="dispatch-console-tabs">
            <Link className="dispatch-console-return-link" href={diagnosticsReturnHref}>Return to labor guide</Link>
            <span aria-hidden="true" className="dispatch-console-tab-separator">/</span>
            <Link href="/diagnostics">Diagnostics</Link>
            <span aria-hidden="true" className="dispatch-console-tab-separator">/</span>
            <Link aria-current="page" className="active" href={pathname}>Parts ordering</Link>
          </nav>
        ) : (
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
        )
      )}
      <div className="dispatch-console-header-actions">
        <WorkflowReviewLauncher />
        {canOpenManagerWorkspace ? (
          <Link className="dispatch-workspace-launcher" href="/manager-workspace">
            <Layers3 aria-hidden="true" size={16} />
            <span><strong>Workspace Launcher</strong><small>CEO · COO · My Work</small></span>
          </Link>
        ) : null}
      </div>
    </header>
  );
}
