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
import { type FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAppearance } from "@/components/layout/appearance";
import { BackToServiceAdvisorWorkspace } from "@/features/advisor/advisor-return-link";
import { CrmModeSwitch } from "@/features/crm/crm-mode-switch";
import type { CustomerDashboardReadModel } from "@/server/services/customer-console-read-service";

const dashboardMetricIcons = {
  "Total Customers": Users,
  "New Leads": UserPlus,
  "Open Deals": HandCoins,
  Appointments: CalendarDays,
  "Sales This Month": CircleDollarSign
};

const guardedActions = {
  leads: "/api/customers/leads?limit=1",
  messages: "/api/crm/v1/communications/conversation-envelope",
  email: "/api/crm/v1/communications/email-drafts",
  custom: "/api/crm/v1/enterprise/custom-fields"
} as const;

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

function isHealthyWorkspaceResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  return response.ok && !response.redirected && !response.url.includes("/login") && contentType.includes("text/html");
}

export function CustomerConsoleHome({ showAdvisorReturn = false }: { showAdvisorReturn?: boolean }) {
  const router = useRouter();
  const { appearance: theme, setAppearance } = useAppearance();
  const [readModel, setReadModel] = useState<CustomerDashboardReadModel | null>(null);
  const [readError, setReadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshDashboard = useCallback(async (signal?: AbortSignal) => {
    setIsRefreshing(true);
    setReadError("");
    try {
      const response = await fetch("/api/customers/dashboard", { signal });
      const payload = await readCustomerJson(response);
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Unable to load the customer dashboard.");
      setReadModel(payload as CustomerDashboardReadModel);
      setActionNotice("Customer dashboard refreshed from the backend.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setReadError(error instanceof Error ? error.message : "Unable to load the customer dashboard.");
    } finally {
      if (!signal?.aborted) setIsRefreshing(false);
    }
  }, []);

  const runGuardedAction = async (action: keyof typeof guardedActions, successMessage: string, href?: string) => {
    setActionNotice("Checking backend readiness...");
    try {
      const response = await fetch(guardedActions[action]);
      const payload = await readCustomerJson(response);
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "This action is not enabled yet.");
      setActionNotice(successMessage);
      if (href) void safeNavigate(href);
    } catch (error) {
      setActionNotice(error instanceof Error ? error.message : "This action is not available yet.");
    }
  };

  const safeNavigate = async (href: string, fallbackMessage = "That workspace is not available from this Customers screen yet.") => {
    setActionNotice("Opening workspace...");
    try {
      const response = await fetch(href, {
        method: "GET",
        cache: "no-store",
        headers: { accept: "text/html" }
      });
      if (!isHealthyWorkspaceResponse(response)) throw new Error(fallbackMessage);
      router.push(href);
    } catch (error) {
      setActionNotice(error instanceof Error ? error.message : fallbackMessage);
    }
  };

  const openSearch = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const query = searchQuery.trim();
    const parameters = new URLSearchParams();
    if (query) parameters.set("q", query);
    void safeNavigate(parameters.size ? `/customers/customer-360?${parameters.toString()}` : "/customers/customer-360", "Customer 360 is not available from this screen yet.");
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
          <Link aria-current="page" className="active" href="/customers">Overview</Link>
          <Link href="/customers/customer-360">Customer 360</Link>
          <Link href="/customers/resolutions">Resolution</Link>
        </nav>
        <CrmModeSwitch />
        <button className="customer-quick-action" onClick={() => void runGuardedAction("leads", "Lead backend responded. Use Customer 360 or the guided lead flow when creation is enabled.")} type="button"><Plus size={16} /> New <ChevronDown size={13} /></button>
        <button className="customer-home-toolbar-icon" aria-label="Notifications" onClick={() => void safeNavigate("/customers/tasks", "Customer task context is not available from this Customers screen yet.")} type="button"><Bell size={17} /><span>6</span></button>
        <button className="customer-home-toolbar-icon" aria-label="Messages" onClick={() => void runGuardedAction("email", "Email draft backend responded. Provider sending remains governed by communication readiness.")} type="button"><Mail size={17} /></button>
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
              <button className="customer-customize-button" onClick={() => void runGuardedAction("custom", "Customization readiness checked. Admin configuration remains governed before rollout.")} type="button">Customize</button>
            </div>
          </section>
          <div className={readError ? "customer-live-status error" : "customer-live-status"} aria-live="polite">{readError || actionNotice || (readModel ? `Live dashboard refreshed ${new Date(readModel.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Loading live customer dashboard...")}</div>

          <section className="customer-home-metrics" aria-label="Customer business summary">
            {(readModel?.metrics ?? []).map(({ label, value, trend, tone }) => { const Icon = dashboardMetricIcons[label as keyof typeof dashboardMetricIcons] ?? Users; return <article key={label}><span className={`customer-home-metric-icon ${tone}`}><Icon size={21} /></span><div><small>{label}</small><strong>{value}</strong><p><TrendingUp size={11} /> {trend} <span>vs last month</span></p></div></article>; })}
          </section>

          <section className="customer-home-analytics">
            <article className="customer-home-card customer-pipeline-card">
              <header><strong>Sales Pipeline</strong><button onClick={() => void runGuardedAction("leads", "Pipeline backend responded. Showing the current Customers dashboard pipeline.")} type="button">This Month <ChevronDown size={12} /></button></header>
              <div className="customer-pipeline-content">
                <div className="customer-funnel">{(readModel?.pipeline ?? []).map((item) => <div key={item.label}>{item.value}</div>)}</div>
                <ul>{(readModel?.pipeline ?? []).map((item) => <li key={item.label}><i className={item.tone} />{item.label}</li>)}</ul>
              </div>
              <footer>Conversion Rate: <strong>10.7%</strong><span>+ 2.3%</span></footer>
            </article>

            <article className="customer-home-card customer-performance-card">
              <header><strong>Sales Performance</strong><button onClick={() => void refreshDashboard()} type="button">This Month <ChevronDown size={12} /></button></header>
              <div className="customer-chart-legend"><span><i />This Month</span><span><i />Last Month</span></div>
              <div className="customer-line-chart" aria-label="Sales performance chart"><span className="customer-chart-value">$487,620</span><i className="current-line" /><i className="previous-line" /></div>
              <footer><span>Goal<strong>$500,000</strong></span><span>Achieved<strong className="green-text">97.5%</strong></span><span>Remaining<strong>$12,380</strong></span></footer>
            </article>

            <article className="customer-home-card customer-sources-card">
              <header><strong>Lead Sources</strong><button onClick={() => void refreshDashboard()} type="button">This Month <ChevronDown size={12} /></button></header>
              <div className="customer-source-content"><div className="customer-donut"><span><strong>{readModel?.recentLeads.length ? "168" : "--"}</strong><small>Total Leads</small></span></div><ul>{(readModel?.leadSources ?? []).map((item) => <li key={item.label}><i />{item.label} <b>{item.value}%</b></li>)}</ul></div>
              <button className="customer-card-link" onClick={() => void refreshDashboard()} type="button">View full report &gt;</button>
            </article>
          </section>

          <section className="customer-home-tables">
            <article className="customer-home-card" id="recent-leads">
              <header><strong>Recent Leads</strong><button onClick={() => void runGuardedAction("leads", "Recent leads checked from the backend. The visible table is refreshed from the Customers read model.")} type="button">View all</button></header>
              <div className="customer-data-table customer-lead-table"><div className="customer-table-head"><span>Name</span><span>Source</span><span>Vehicle Interest</span><span>Date</span><span>Status</span></div>{(readModel?.recentLeads ?? []).map(({ initial, name, source, vehicle, date, status }) => <div className="customer-table-row" key={name}><span><i>{initial}</i>{name}</span><span>{source}</span><span>{vehicle}</span><span>{date}</span><span><b className={`customer-stage ${status.toLowerCase()}`}>{status}</b></span></div>)}</div>
            </article>
            <article className="customer-home-card">
              <header><strong>Top Deals</strong><button onClick={() => void runGuardedAction("leads", "Deal pipeline backend responded. The Customers dashboard remains the safe source view.")} type="button">View all</button></header>
              <div className="customer-data-table customer-deal-table"><div className="customer-table-head"><span>Customer</span><span>Vehicle</span><span>Amount</span><span>Stage</span></div>{(readModel?.topDeals ?? []).map(({ customer, vehicle, amount, stage }) => <div className="customer-table-row" key={customer}><span>{customer}</span><span>{vehicle}</span><span>{amount}</span><span><b className={`customer-stage ${stage.toLowerCase()}`}>{stage}</b></span></div>)}</div>
            </article>
          </section>

          <footer className="customer-home-quick-actions"><strong>Quick Actions</strong>
            <button onClick={() => void runGuardedAction("leads", "Lead backend responded. Guided lead creation stays governed until the lead write gate is enabled.")} type="button"><Plus size={14} />Add Lead</button>
            <button onClick={() => void safeNavigate("/customers/customer-360", "Customer 360 is not available from this screen yet.")} type="button"><Plus size={14} />Add Customer</button>
            <button onClick={() => void safeNavigate("/customers/appointments", "Customer appointments are not available from this Customers screen yet.")} type="button"><Plus size={14} />Schedule Appointment</button>
            <button onClick={() => void runGuardedAction("leads", "Deal backend responded. Deal creation remains governed by the CRM opportunity gate.")} type="button"><Plus size={14} />Add Deal</button>
            <button onClick={() => void safeNavigate("/customers/vehicles", "Customer vehicle context is not available from this Customers screen yet.")} type="button"><Plus size={14} />Add Vehicle</button>
            <button onClick={() => void runGuardedAction("messages", "Conversation backend responded. Live sending remains governed by consent and provider readiness.")} type="button"><MessageSquare size={14} />Send Message</button>
          </footer>
        </main>

        <aside className="customer-home-rail" aria-label="Customer operations summary">
          <section className="customer-home-card customer-home-tasks"><header><strong>My Tasks <b>{readModel?.tasks.length ?? 0}</b></strong><button onClick={() => void safeNavigate("/customers/tasks", "Customer task context is not available from this Customers screen yet.")} type="button">View all</button></header>{(readModel?.tasks ?? []).map(({ title, detail, priority }) => <button className="customer-home-task" key={title} onClick={() => void safeNavigate(`/customers/tasks?search=${encodeURIComponent(title)}`, "That customer task context is not available from this Customers screen yet.")} type="button"><i /><span><strong>{title}</strong><small>{detail}</small></span><b className={priority.toLowerCase()}>{priority}</b></button>)}</section>
          <section className="customer-home-card customer-home-appointments"><header><strong>Today&apos;s Appointments</strong><button onClick={() => void safeNavigate("/customers/appointments", "Customer appointments are not available from this Customers screen yet.")} type="button">View calendar</button></header>{(readModel?.appointments ?? []).map(({ time, customer, detail }, index) => <button key={time} onClick={() => void safeNavigate(`/customers/appointments?search=${encodeURIComponent(customer)}`, "That customer appointment context is not available from this Customers screen yet.")} type="button"><i className={`tone-${index}`} /><time>{time}</time><span><strong>{customer}</strong><small>{detail}</small></span></button>)}</section>
          <section className="customer-home-card customer-home-activity"><header><strong>Recent Activity</strong><button disabled={isRefreshing} onClick={() => void refreshDashboard()} type="button">View all</button></header>{(readModel?.activity ?? []).map(({ title, detail, time }, index) => <button key={title} onClick={() => void refreshDashboard()} type="button"><span className={`tone-${index}`}><CheckSquare size={13} /></span><p><strong>{title}</strong><small>{detail}</small></p><time>{time}</time></button>)}</section>
        </aside>
      </div>
    </section>
  );
}
