import {
  ArrowRight,
  BadgeDollarSign,
  CalendarDays,
  CarFront,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderCheck,
  PackageCheck,
  Route,
  Search,
  ShieldAlert,
  Sparkles,
  UserRoundPlus
} from "lucide-react";
import Link from "next/link";

import type { OperationsCoordinatorWorkspaceModel } from "@/server/operations-coordinator/service";

function stateLabel(state: string) {
  if (state === "READY") return "Live";
  if (state === "EMPTY") return "Clear";
  return "Placeholder";
}

function resolverLabel(value: string) {
  if (value === "COMPLETE_SAFELY") return "Safe action";
  if (value === "PREPARE_CANONICAL_WORKFLOW") return "Prepare";
  if (value === "ROUTE_TO_AUTHORITY") return "Route";
  return "Peek";
}

const operationsCoordinatorReturnTo = "/operations-coordinator";

function withWorkspaceReturn(href: string, returnTo = operationsCoordinatorReturnTo) {
  const [hrefWithoutHash, hash] = href.split("#");
  const [pathname, query = ""] = hrefWithoutHash.split("?");
  if (!pathname.startsWith("/") || pathname === returnTo) return href;
  const params = new URLSearchParams(query);
  if (!params.has("returnTo")) params.set("returnTo", returnTo);

  return `${pathname}?${params.toString()}${hash ? `#${hash}` : ""}`;
}

export function OperationsCoordinatorWorkspace({ model }: { model: OperationsCoordinatorWorkspaceModel }) {
  const firstName = model.coordinator.name.split(" ")[0] ?? "Coordinator";
  const kpis = [
    { icon: CalendarDays, label: "Arrivals", value: model.counts.todaysAppointments, detail: "Today schedule" },
    { icon: ClipboardCheck, label: "Repair Orders", value: model.counts.activeRepairOrders, detail: "Open customer/shop work" },
    { icon: PackageCheck, label: "Parts Touches", value: model.counts.partsActions, detail: "Demand, receive, exceptions" },
    { icon: FileText, label: "Paperwork", value: model.counts.paperworkItems, detail: "Documents and packets" },
    { icon: ShieldAlert, label: "Escalations", value: model.counts.escalations, detail: "Route to authority" }
  ];

  const dock = [
    { icon: CalendarDays, label: "New Appointment", href: "/appointments" },
    { icon: ClipboardCheck, label: "Check In Vehicle", href: "/vehicles/repair-orders?intakeSource=WALK_IN" },
    { icon: UserRoundPlus, label: "Add Customer / Vehicle", href: "/customers" },
    { icon: PackageCheck, label: "Receive Parts", href: "/vehicles/parts-receiving" },
    { icon: FileText, label: "Upload Document", href: "/tasks?department=OFFICE" },
    { icon: CarFront, label: "Upload Photos", href: "/tasks?department=ADVERTISING" },
    { icon: BadgeDollarSign, label: "Sales / Finance Packet", href: "/tasks?department=SALES" },
    { icon: FolderCheck, label: "Payment / Collection Note", href: "/tasks?department=COLLECTIONS" }
  ];

  return (
    <section className="operations-coordinator-home">
      <header className="oc-hero">
        <div>
          <p>Operations Coordinator Workspace</p>
          <h1>Welcome, {firstName}. Keep paperwork moving.</h1>
          <span>Documentation, packets, payments, and clean handoffs come first. Use the rest of the workspace for intake support, customer lookup, parts touches, and protected routing.</span>
        </div>
        <nav aria-label="Operations coordinator work choices">
          <Link className="primary" href={withWorkspaceReturn("/my-tasks")}>My Work</Link>
          <Link href={withWorkspaceReturn("/vehicles/coo-workbook?workbookScope=MY")}>Operations Coordinator Workbook</Link>
        </nav>
      </header>

      <section className="oc-command-strip" aria-label="Today command strip">
        {kpis.map(({ icon: Icon, label, value, detail }) => (
          <article key={label}>
            <Icon />
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>

      <section className="oc-search" aria-label="Universal search">
        <Search />
        <div>
          <strong>Universal search first</strong>
          <span>{model.universalSearch.placeholder}</span>
          <small>No match? Prepare the missing canonical record without leaving the loop.</small>
        </div>
        <div>
          {model.universalSearch.noResultActions.map((action) => (
            <Link href={withWorkspaceReturn(action.href)} key={action.label}>{action.label}</Link>
          ))}
        </div>
      </section>

      <section className="oc-dock" aria-label="Start work dock">
        {dock.map(({ icon: Icon, label, href }) => (
          <Link href={withWorkspaceReturn(href)} key={label}>
            <Icon />
            <span>{label}</span>
            <ArrowRight />
          </Link>
        ))}
      </section>

      <section className="oc-panel oc-paperwork oc-paperwork-priority" id="paperwork-command-center">
        <header>
          <div>
            <strong>Documentation / Paperwork command center</strong>
            <span>Prepare packets, attach evidence, verify documents, and route final approval without turning every office duty into a manager detour.</span>
          </div>
          <Link href={withWorkspaceReturn("/tasks?department=OFFICE")}>Open paperwork work</Link>
        </header>
        <div>
          {model.paperworkCenter.map((item) => (
            <Link href={withWorkspaceReturn(item.href)} key={item.label}>
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
              <em>{item.status}</em>
            </Link>
          ))}
        </div>
      </section>

      <div className="oc-main-grid">
        <section className="oc-panel oc-queue">
          <header>
            <div>
              <strong>My coordination queue</strong>
              <span>Ranked by waiting customer, appointment time, due soon, blocker severity, missing document, payment risk, promise risk, and escalation state.</span>
            </div>
            <Link href={withWorkspaceReturn("/my-tasks")}>Open my work</Link>
          </header>
          <div>
            {model.actionQueue.length ? model.actionQueue.map((action) => (
              <Link className="oc-action-row" href={withWorkspaceReturn(action.href)} key={action.id}>
                <b>{action.rank}</b>
                <span>
                  <strong>{action.label}</strong>
                  <small>{action.detail}</small>
                  <small>{action.source} · {resolverLabel(action.resolver)}</small>
                </span>
                <em>{action.type.replaceAll("_", " ")}</em>
                <ArrowRight />
              </Link>
            )) : (
              <p className="oc-empty"><CheckCircle2 /> No coordination actions need attention right now.</p>
            )}
          </div>
        </section>

        <aside className="oc-panel oc-advisor-support oc-advisor-support-secondary" id="service-advisor-support">
          <header>
            <div>
              <strong>Service Advisor support</strong>
              <span>Use only when front-desk paperwork depends on arrivals, RO status, customer updates, or routed repair decisions.</span>
            </div>
            <Link href={withWorkspaceReturn("/vehicles/advisor")}>Open advisor workspace</Link>
          </header>
          <div>
          {model.advisorSupport.slice(0, 4).map((item) => (
            <Link href={withWorkspaceReturn(item.href)} key={item.label}>
              <ClipboardCheck />
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
              <em>{resolverLabel(item.mode)}</em>
            </Link>
          ))}
          </div>
        </aside>
      </div>

      <section className="oc-panel oc-departments">
        <header>
          <div>
            <strong>Department peek panels</strong>
            <span>Fast context without dumping full manager consoles into the front desk role.</span>
          </div>
        </header>
        <div>
          {model.departmentPanels.map((panel) => (
            <Link href={withWorkspaceReturn(panel.href)} key={panel.label}>
              <span>{stateLabel(panel.state)}</span>
              <strong>{panel.label}</strong>
              <b>{panel.value ?? "—"}</b>
              <small>{panel.detail}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="oc-panel oc-escalation">
        <header>
          <div>
            <strong>Escalation router</strong>
            <span>Protected actions are visible so the coordinator knows where to send the work, not so she can override authority.</span>
          </div>
        </header>
        <div>
          {model.escalationRouter.map((route) => (
            <Link href={withWorkspaceReturn(route.href)} key={route.label}>
              <Route />
              <span>
                <strong>{route.label}</strong>
                <small>{route.detail}</small>
              </span>
              <em>{route.blocked ? "Protected" : "Open"}</em>
            </Link>
          ))}
        </div>
      </section>

      <footer className="oc-guardrail">
        <Sparkles />
        <span>Coordinator rule: complete safe intake/documentation steps, prepare canonical workflows, and route protected decisions to the right authority.</span>
      </footer>
    </section>
  );
}
