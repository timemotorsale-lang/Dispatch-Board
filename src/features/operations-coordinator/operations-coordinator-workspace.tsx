import {
  AlertTriangle,
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
          <h1>Welcome, {firstName}. Keep the front door moving.</h1>
          <span>Broad visibility, guided lightweight action, and protected routing across appointments, intake, parts, paperwork, payments, sales, rentals, and documentation.</span>
        </div>
        <nav aria-label="Operations coordinator exits and primary routes">
          <Link href="/command-center">CCC Home</Link>
          <Link href="/board">Dispatch</Link>
          <Link className="primary" href="/appointments?workspace=advisor">Service Advisor</Link>
          <Link href="/my-tasks">My Work</Link>
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
            <Link href={action.href} key={action.label}>{action.label}</Link>
          ))}
        </div>
      </section>

      <section className="oc-dock" aria-label="Start work dock">
        {dock.map(({ icon: Icon, label, href }) => (
          <Link href={href} key={label}>
            <Icon />
            <span>{label}</span>
            <ArrowRight />
          </Link>
        ))}
      </section>

      <section className="oc-panel oc-advisor-support" id="service-advisor-support">
        <header>
          <div>
          <strong>Service Advisor</strong>
          <span>Daily customer-facing repair coordination: appointments, arrivals, status questions, check-ins, and routed decisions.</span>
        </div>
          <Link href="/appointments?workspace=advisor">Open advisor workspace</Link>
        </header>
        <div>
          {model.advisorSupport.map((item) => (
            <Link href={item.href} key={item.label}>
              <ClipboardCheck />
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
              <em>{resolverLabel(item.mode)}</em>
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
            <Link href="/my-tasks">Open my work</Link>
          </header>
          <div>
            {model.actionQueue.length ? model.actionQueue.map((action) => (
              <Link className="oc-action-row" href={action.href} key={action.id}>
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

        <aside className="oc-panel oc-paperwork" id="paperwork-command-center">
          <header>
            <div>
              <strong>Paperwork command center</strong>
              <span>Prepare and attach. Final authority stays protected.</span>
            </div>
          </header>
          {model.paperworkCenter.map((item) => (
            <Link href={item.href} key={item.label}>
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
              <em>{item.status}</em>
            </Link>
          ))}
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
            <Link href={panel.href} key={panel.label}>
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
            <Link href={route.href} key={route.label}>
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
