"use client";

import {
  Bell,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  CircleDollarSign,
  HandCoins,
  Mail,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Sun,
  TrendingUp,
  UserPlus,
  Users
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAppearance } from "@/components/layout/appearance";
import { BackToServiceAdvisorWorkspace } from "@/features/advisor/advisor-return-link";
import { CrmModeSwitch } from "@/features/crm/crm-mode-switch";
import {
  CRM_NEXT_APPOINTMENTS_HREF,
  CRM_NEXT_CUSTOMERS_HREF,
  CRM_NEXT_DEAL_START_HREF,
  CRM_NEXT_DEALS_HREF,
  CRM_NEXT_HOME_HREF,
  CRM_NEXT_INTAKE_HREF,
  CRM_NEXT_INTELLIGENCE_HREF,
  CRM_NEXT_LEAD_SOURCE_REPORT_HREF,
  CRM_NEXT_NEEDS_ATTENTION_HREF,
  CRM_NEXT_PIPELINE_HREF,
  CRM_NEXT_SEARCH_HREF,
  CRM_VENDOR_REGISTRY_HREF,
  crmNextCustomerSearchHref
} from "@/features/crm/crm-route-authority";
import { crmDashboardSourceTruth } from "@/lib/crm-source-of-truth-registry";
import type { CustomerDashboardReadModel } from "@/server/services/customer-console-read-service";

const dashboardMetricIcons = {
  "Total Customers": Users,
  "New Leads": UserPlus,
  "Open Deals": HandCoins,
  Appointments: CalendarDays,
  "Sales This Month": CircleDollarSign
};

const dashboardMetricRoutes: Record<string, string> = {
  "Total Customers": CRM_NEXT_CUSTOMERS_HREF,
  "New Leads": CRM_NEXT_PIPELINE_HREF,
  "Open Deals": CRM_NEXT_DEALS_HREF,
  Appointments: CRM_NEXT_APPOINTMENTS_HREF,
  "Sales This Month": CRM_NEXT_DEALS_HREF
};

async function readCustomerJson(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const fallback = response.redirected || response.url.includes("/login")
      ? "Please sign in again, then retry this customer action."
      : "Customer backend returned a page instead of data. Refresh the app and retry.";
    throw new Error(fallback);
  }
  return response.json() as Promise<Record<string, unknown>>;
}

export function CustomerConsoleHome({ showAdvisorReturn = false }: { showAdvisorReturn?: boolean }) {
  const router = useRouter();
  const { appearance: theme, setAppearance } = useAppearance();
  const [readModel, setReadModel] = useState<CustomerDashboardReadModel | null>(null);
  const [readError, setReadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionNotice, setActionNotice] = useState("");

  const openCrmNext = (href: string) => {
    setActionNotice("Opening Customer Console...");
    router.push(href);
  };

  const topDealsTruth = crmDashboardSourceTruth("top-deals");
  const tasksTruth = crmDashboardSourceTruth("my-tasks");
  const activityTruth = crmDashboardSourceTruth("recent-activity");

  const openSearch = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const query = searchQuery.trim();
    openCrmNext(query ? crmNextCustomerSearchHref(query) : CRM_NEXT_SEARCH_HREF);
  };

  useEffect(() => {
    document.body.classList.add("customer-console-shell");
    return () => {
      document.body.classList.remove("customer-console-shell", "customer-console-dark-shell");
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("customer-console-dark-shell", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/customers/dashboard", { signal: controller.signal })
      .then(async (response) => {
        const payload = await readCustomerJson(response);
        if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Unable to load the customer dashboard.");
        return payload as CustomerDashboardReadModel;
      })
      .then(setReadModel)
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReadError(error instanceof Error ? error.message : "Unable to load the customer dashboard.");
      });
    return () => controller.abort();
  }, []);

  return (
    <section className="customer-console customer-home" data-theme={theme} aria-label="Customer Command Center">
      <header className="customer-console-toolbar customer-home-toolbar">
        {showAdvisorReturn ? <BackToServiceAdvisorWorkspace className="advisor-return-link customer-advisor-return" /> : null}
        <form className="customer-console-search" onSubmit={openSearch} role="search">
          <Search size={17} aria-hidden="true" />
          <input aria-label="Search customer command center" onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search customers, leads, vehicles, deals..." type="search" value={searchQuery} />
          <kbd>Ctrl K</kbd>
        </form>
        <nav className="customer-module-switcher" aria-label="Customer console sections">
          <Link href={CRM_NEXT_CUSTOMERS_HREF}>Customer Records</Link>
          <Link href={CRM_NEXT_SEARCH_HREF}>Customer 360</Link>
          <Link href="/customers/resolutions">Resolution</Link>
          <Link href={CRM_VENDOR_REGISTRY_HREF}>Vendors</Link>
        </nav>
        <CrmModeSwitch />
        <button className="customer-quick-action" onClick={() => openCrmNext(CRM_NEXT_INTAKE_HREF)} type="button"><Plus size={16} /> New <ChevronDown size={13} /></button>
        <button className="customer-home-toolbar-icon" aria-label="Notifications" onClick={() => openCrmNext(CRM_NEXT_NEEDS_ATTENTION_HREF)} type="button"><Bell size={17} /><span>6</span></button>
        <button className="customer-home-toolbar-icon" aria-label="Messages" onClick={() => openCrmNext(CRM_NEXT_SEARCH_HREF)} type="button"><Mail size={17} /></button>
        <div className="customer-home-user"><span>EA</span><div><strong>Eli Aswan</strong><small>Owner / CEO</small></div><ChevronDown size={13} /></div>
      </header>

      <div className="customer-home-layout">
        <main className="customer-home-main">
          <section className="customer-home-welcome">
            <div><h1>Welcome back, Eli <span aria-hidden="true">&#128075;</span></h1><p>Here&apos;s what&apos;s happening with your business today.</p></div>
            <div className="customer-home-welcome-actions">
              <label><span>Date</span><input aria-label="Dashboard date" type="date" defaultValue="2025-05-30" /></label>
              <div className="customer-theme-switch" aria-label="Customer console appearance" role="group">
                <button aria-label="Use light background" aria-pressed={theme === "light"} className={theme === "light" ? "customer-theme-option active" : "customer-theme-option"} onClick={() => setAppearance("light")} type="button"><Sun size={14} /> Light</button>
                <button aria-label="Use dark background" aria-pressed={theme === "dark"} className={theme === "dark" ? "customer-theme-option active" : "customer-theme-option"} onClick={() => setAppearance("dark")} type="button"><Moon size={14} /> Dark</button>
              </div>
              <button className="customer-customize-button" onClick={() => openCrmNext(CRM_NEXT_HOME_HREF)} type="button">Customize</button>
            </div>
          </section>
          <div className={readError ? "customer-live-status error" : "customer-live-status"} aria-live="polite">{readError || actionNotice || (readModel ? `Live dashboard refreshed ${new Date(readModel.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Loading live customer dashboard...")}</div>

          <section className="customer-home-metrics" aria-label="Customer business summary">
            {(readModel?.metrics ?? []).map(({ label, sourceDetail, sourceStatus, value, tone }) => { const Icon = dashboardMetricIcons[label as keyof typeof dashboardMetricIcons] ?? Users; return <button className="customer-home-metric-card" data-source-status={sourceStatus} key={label} onClick={() => openCrmNext(dashboardMetricRoutes[label] ?? CRM_NEXT_HOME_HREF)} type="button"><span className={`customer-home-metric-icon ${tone}`}><Icon size={21} /></span><div><small>{label} · {sourceStatus}</small><strong>{value}</strong><p><TrendingUp size={11} /> {sourceDetail}</p></div></button>; })}
          </section>

          <section className="customer-home-analytics">
            <article className="customer-home-card customer-pipeline-card">
              <header><strong>Sales Pipeline</strong><button onClick={() => openCrmNext(CRM_NEXT_PIPELINE_HREF)} type="button">This Month <ChevronDown size={12} /></button></header>
              {(readModel?.pipeline ?? []).length ? (
                <div className="customer-pipeline-content">
                  <div className="customer-funnel">{(readModel?.pipeline ?? []).map((item) => <div key={item.label}>{item.value}</div>)}</div>
                  <ul>{(readModel?.pipeline ?? []).map((item) => <li key={item.label}><i className={item.tone} />{item.label}</li>)}</ul>
                </div>
              ) : <p className="customer-empty-source">No source data available for pipeline stages yet.</p>}
              <footer>Source: <strong>{crmDashboardSourceTruth("new-leads").status}</strong><span>{crmDashboardSourceTruth("new-leads").source}</span></footer>
            </article>

            <article className="customer-home-card customer-performance-card">
              <header><strong>Sales Performance</strong><button onClick={() => openCrmNext(CRM_NEXT_DEALS_HREF)} type="button">This Month <ChevronDown size={12} /></button></header>
              <p className="customer-empty-source">No source data available for sales performance yet.</p>
              <footer><span>Status<strong>{crmDashboardSourceTruth("sales-this-month").status}</strong></span><span>Source<strong>{crmDashboardSourceTruth("sales-this-month").source}</strong></span></footer>
            </article>

            <article className="customer-home-card customer-sources-card">
              <header><strong>Lead Sources</strong><button onClick={() => openCrmNext(CRM_NEXT_INTELLIGENCE_HREF)} type="button">This Month <ChevronDown size={12} /></button></header>
              {(readModel?.leadSources ?? []).length ? (
                <div className="customer-source-content"><div className="customer-donut"><span><strong>{readModel?.metrics.find((item) => item.label === "New Leads")?.value ?? "--"}</strong><small>Total Leads</small></span></div><ul>{(readModel?.leadSources ?? []).map((item) => <li key={item.label}><i />{item.label} <b>{item.value}%</b></li>)}</ul></div>
              ) : <p className="customer-empty-source">No source data available for lead sources yet.</p>}
              <Link className="customer-card-link" href={CRM_NEXT_LEAD_SOURCE_REPORT_HREF}>View full report &gt;</Link>
            </article>
          </section>

          <section className="customer-home-tables">
            <article className="customer-home-card" id="recent-leads">
              <header><strong>Recent Leads</strong><button onClick={() => openCrmNext(CRM_NEXT_PIPELINE_HREF)} type="button">View all</button></header>
              {(readModel?.recentLeads ?? []).length ? (
                <div className="customer-data-table customer-lead-table"><div className="customer-table-head"><span>Name</span><span>Source</span><span>Vehicle Interest</span><span>Date</span><span>Status</span></div>{(readModel?.recentLeads ?? []).map(({ initial, name, source, vehicle, date, status, href }) => <button className="customer-table-row" key={`${name}-${href}`} onClick={() => openCrmNext(href)} type="button"><span><i>{initial}</i>{name}</span><span>{source}</span><span>{vehicle}</span><span>{date}</span><span><b className={`customer-stage ${status.toLowerCase()}`}>{status}</b></span></button>)}</div>
              ) : <p className="customer-empty-source">No source data available for recent leads yet.</p>}
            </article>
            <article className="customer-home-card">
              <header><strong>Top Deals</strong><button onClick={() => openCrmNext(CRM_NEXT_DEALS_HREF)} type="button">View all</button></header>
              {(readModel?.topDeals ?? []).length ? <div className="customer-data-table customer-deal-table"><div className="customer-table-head"><span>Customer</span><span>Vehicle</span><span>Amount</span><span>Stage</span></div>{(readModel?.topDeals ?? []).map(({ customer, vehicle, amount, stage }) => <button className="customer-table-row" key={customer} onClick={() => openCrmNext(crmNextCustomerSearchHref(customer))} type="button"><span>{customer}</span><span>{vehicle}</span><span>{amount}</span><span><b className={`customer-stage ${stage.toLowerCase()}`}>{stage}</b></span></button>)}</div> : <p className="customer-empty-source">{topDealsTruth.staffMessage}</p>}
            </article>
          </section>

          <footer className="customer-home-quick-actions"><strong>Quick Actions</strong>
            <button onClick={() => openCrmNext(CRM_NEXT_PIPELINE_HREF)} type="button"><Plus size={14} />Add Lead</button>
            <button onClick={() => openCrmNext(CRM_NEXT_INTAKE_HREF)} type="button"><Plus size={14} />Add Customer</button>
            <button onClick={() => openCrmNext(CRM_NEXT_APPOINTMENTS_HREF)} type="button"><Plus size={14} />Schedule Appointment</button>
            <button onClick={() => openCrmNext(CRM_NEXT_DEAL_START_HREF)} type="button"><Plus size={14} />Add Deal</button>
            <button onClick={() => openCrmNext(CRM_NEXT_SEARCH_HREF)} type="button"><Plus size={14} />Add Vehicle</button>
            <button onClick={() => openCrmNext(CRM_NEXT_SEARCH_HREF)} type="button"><MessageSquare size={14} />Send Message</button>
          </footer>
        </main>

        <aside className="customer-home-rail" aria-label="Customer operations summary">
          <section className="customer-home-card customer-home-tasks"><header><strong>My Tasks <b>{readModel?.tasks.length ?? 0}</b></strong><button onClick={() => openCrmNext(CRM_NEXT_NEEDS_ATTENTION_HREF)} type="button">View all</button></header>{(readModel?.tasks ?? []).length ? (readModel?.tasks ?? []).map(({ title, detail, priority }) => <button className="customer-home-task" key={title} onClick={() => openCrmNext(crmNextCustomerSearchHref(title))} type="button"><i /><span><strong>{title}</strong><small>{detail}</small></span><b className={priority.toLowerCase()}>{priority}</b></button>) : <p className="customer-empty-source">{tasksTruth.staffMessage}</p>}</section>
          <section className="customer-home-card customer-home-appointments"><header><strong>Today&apos;s Appointments</strong><button onClick={() => openCrmNext(CRM_NEXT_APPOINTMENTS_HREF)} type="button">View calendar</button></header>{(readModel?.appointments ?? []).length ? (readModel?.appointments ?? []).map(({ time, customer, detail }, index) => <button key={`${time}-${customer}-${detail}`} onClick={() => openCrmNext(crmNextCustomerSearchHref(customer))} type="button"><i className={`tone-${index}`} /><time>{time}</time><span><strong>{customer}</strong><small>{detail}</small></span></button>) : <p className="customer-empty-source">No live appointments are available in this dashboard. Open the appointment console for the full schedule.</p>}</section>
          <section className="customer-home-card customer-home-activity"><header><strong>Recent Activity <b>{activityTruth.status}</b></strong><button onClick={() => openCrmNext(CRM_NEXT_CUSTOMERS_HREF)} type="button">View all</button></header>{(readModel?.activity ?? []).length ? (readModel?.activity ?? []).map(({ title, detail, time, href }, index) => <button key={`${title}-${detail}`} onClick={() => openCrmNext(href)} type="button"><span className={`tone-${index}`}><CheckSquare size={13} /></span><p><strong>{title}</strong><small>{detail}</small></p><time>{time}</time></button>) : <p className="customer-empty-source">No source-backed customer activity yet.</p>}</section>
        </aside>
      </div>
    </section>
  );
}
