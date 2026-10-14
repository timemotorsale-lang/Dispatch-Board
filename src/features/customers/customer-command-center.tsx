"use client";

import {
  AlertTriangle, CalendarDays, Car, CheckSquare, CircleDollarSign,
  FileText, Gift, Mail, Moon, MoreHorizontal, Phone, Plus, Search, ShieldAlert,
  Star, Sun, Upload
} from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAppearance } from "@/components/layout/appearance";
import { CRM_NEXT_CUSTOMERS_HREF, CRM_NEXT_SEARCH_HREF, crmNextCustomer360Href, crmNextCustomerSearchHref } from "@/features/crm/crm-route-authority";
import type { Customer360ReadModel, Customer360Tab } from "@/server/services/customer-console-read-service";
const tabs: Array<{ label: string; value: Customer360Tab }> = [
  { label: "Overview", value: "overview" }, { label: "Timeline", value: "timeline" },
  { label: "Deals", value: "deals" }, { label: "Cases", value: "cases" },
  { label: "Appointments", value: "appointments" }, { label: "Documents", value: "documents" },
  { label: "Vehicles", value: "vehicles" }, { label: "Communications", value: "communications" },
  { label: "Collections", value: "collections" }, { label: "Notes", value: "notes" }
];
const summaryMetrics = [
  { label: "Open Leads", key: "openLeads", detail: "Active", icon: CircleDollarSign, tone: "green" },
  { label: "Open Cases", key: "openCases", detail: "Active", icon: AlertTriangle, tone: "red" },
  { label: "Appointments", key: "upcomingAppointments", detail: "Upcoming", icon: CalendarDays, tone: "purple" },
  { label: "Tasks", key: "openTasks", detail: "Open", icon: CheckSquare, tone: "blue" },
  { label: "Documents", key: "missingDocuments", detail: "Missing", icon: FileText, tone: "orange" }
] as const;
const guardedActionEndpoints = {
  call: "/api/crm/v1/communications/manual-call-disposition",
  email: "/api/crm/v1/communications/email-drafts"
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

export function CustomerCommandCenter({
  customerId,
  initialTab = "overview"
}: {
  customerId?: string;
  initialTab?: Customer360Tab;
} = {}) {
  const router = useRouter();
  const { appearance: theme, setAppearance } = useAppearance();
  const [activeTab, setActiveTab] = useState<Customer360Tab>(initialTab);
  const [readModel, setReadModel] = useState<Customer360ReadModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [readError, setReadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionNotice, setActionNotice] = useState("");

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
    const parameters = new URLSearchParams({ tab: activeTab });
    if (customerId) parameters.set("customerId", customerId);
    fetch(`/api/customers/customer-360?${parameters.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await readCustomerJson(response);
        if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Unable to load Customer 360.");
        return payload as Customer360ReadModel;
      })
      .then((payload) => {
        setReadModel(payload);
        setReadError("");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReadError(error instanceof Error ? error.message : "Unable to load Customer 360.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [activeTab, customerId]);

  const safeNavigate = async (href: string, fallbackMessage = "That customer workspace is not available yet.") => {
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

  const goToCustomerSearch = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const query = searchQuery.trim();
    void safeNavigate(query ? crmNextCustomerSearchHref(query) : CRM_NEXT_SEARCH_HREF, "Customer search is not available yet.");
  };

  const guardedCommunicationAction = async (action: keyof typeof guardedActionEndpoints, successMessage: string) => {
    setActionNotice("Checking backend readiness...");
    try {
      const response = await fetch(guardedActionEndpoints[action]);
      const payload = await readCustomerJson(response);
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "This action is not enabled yet.");
      setActionNotice(successMessage);
      setActiveTab("communications");
    } catch (error) {
      setActionNotice(error instanceof Error ? error.message : "This action is not available yet.");
    }
  };

  const goToTab = (tab: Customer360Tab, notice: string) => {
    setReadError("");
    setActionNotice(notice);
    setIsLoading(true);
    setActiveTab(tab);
  };

  const customer = readModel?.customer;
  return (
    <section className="customer-console" data-theme={theme} aria-label="Customer 360 Console">
      <header className="customer-console-toolbar">
        <form className="customer-console-search" onSubmit={goToCustomerSearch} role="search"><Search size={17} /><input aria-label="Search Customer 360" onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search customers, leads, vehicles, cases, appointments..." type="search" value={searchQuery} /><kbd>Ctrl K</kbd></form>
        <nav className="customer-module-switcher" aria-label="Customer console sections"><Link href={CRM_NEXT_CUSTOMERS_HREF}>Customer Records</Link><Link aria-current="page" className="active" href={customerId ? crmNextCustomer360Href(customerId) : CRM_NEXT_CUSTOMERS_HREF}>Customer 360</Link><Link href="/customers/resolutions">Resolution</Link></nav>
        <div className="customer-theme-switch" aria-label="Customer console appearance" role="group"><button aria-label="Use light background" aria-pressed={theme === "light"} className={theme === "light" ? "customer-theme-option active" : "customer-theme-option"} onClick={() => setAppearance("light")} type="button"><Sun size={15} /> Light</button><button aria-label="Use dark background" aria-pressed={theme === "dark"} className={theme === "dark" ? "customer-theme-option active" : "customer-theme-option"} onClick={() => setAppearance("dark")} type="button"><Moon size={15} /> Dark</button></div>
        <button className="customer-quick-action" onClick={() => goToTab("communications", "Quick actions are ready. Choose call, email, task, case, appointment, or document.")} type="button"><Plus size={16} /> Quick Action</button>
      </header>

      <div className="customer-console-layout">
        <main className="customer-console-main">
          <section className="customer-profile-card">
            <div className="customer-avatar"><span>MS</span><i /></div>
            <div className="customer-profile-identity"><div><h1>{customer?.name ?? "Loading customer..."}</h1><span className="customer-preferred"><Star size={13} fill="currentColor" /> Preferred Customer</span></div><p>{customer?.phone ?? "--"} <b>-</b> {customer?.email ?? "--"}</p><small>{customer?.address ?? "Loading address..."}</small></div>
            <dl className="customer-profile-facts"><div><dt>Customer Since</dt><dd>{customer?.since ?? "--"}</dd></div><div><dt>Lifetime Value</dt><dd>{customer?.lifetimeValue ?? "--"}</dd></div><div><dt>Owner</dt><dd><span className="customer-mini-avatar">JM</span> {customer?.owner ?? "--"}</dd></div><div><dt>Status</dt><dd><i className="customer-active-dot" /> {customer?.status ?? "--"}</dd></div></dl>
            <button className="customer-icon-button" aria-label="More customer actions" onClick={() => goToTab("overview", "More customer actions are available from the quick action panel.")} type="button"><MoreHorizontal size={18} /></button>
          </section>

          <section className="customer-metric-grid" aria-label="Customer summary">{summaryMetrics.map(({ label, key, detail, icon: Icon, tone }) => <article key={label}><span className={`customer-metric-icon ${tone}`}><Icon size={17} /></span><div><small>{label}</small><strong>{readModel?.summary[key] ?? "--"}</strong><p>{detail}</p></div></article>)}<article className="customer-risk-metric"><span className="customer-metric-icon red"><ShieldAlert size={17} /></span><div><small>SLA Risk</small><strong>{readModel?.summary.slaRisk ?? "--"}</strong><p>Current cases</p></div></article></section>

          <nav className="customer-record-tabs" aria-label="Customer record sections">{tabs.map((tab) => <button aria-current={activeTab === tab.value ? "page" : undefined} className={activeTab === tab.value ? "active" : ""} key={tab.value} onClick={() => { setIsLoading(true); setReadError(""); setActiveTab(tab.value); }} type="button">{tab.label}</button>)}</nav>
          <div className={readError ? "customer-live-status error" : "customer-live-status"} aria-live="polite">{readError || actionNotice || (isLoading ? `Loading live ${activeTab}...` : `Live ${activeTab} refreshed`)}</div>

          <section className="customer-360-live-workspace" aria-label="Active customer record panel" aria-busy={isLoading}>
            <header><div><p>Customer workspace</p><h2>{readError ? "Customer workspace needs attention" : readModel?.panel.title ?? "Loading..."}</h2><small>{readError ? "The tab responded, but the customer read model could not be loaded. Use the safe source workspaces below." : readModel?.panel.summary}</small></div><span>{readModel?.panel.items.length ?? 0} items</span></header>
            {readError ? (
              <div className="customer-tab-fallback">
                <article><span className="customer-item-marker" /><div><strong>Open customer source</strong><small>Customer Records, Customer 360, and search are the default customer workspace.</small></div><Link href={CRM_NEXT_CUSTOMERS_HREF}>Customer Records</Link></article>
                <article><span className="customer-item-marker" /><div><strong>Continue with connected work</strong><small>Use the source console so staff can keep working without waiting on CRM rollout flags.</small></div><Link href="/customers/resolutions">Resolution</Link></article>
              </div>
            ) : (
              <div>{(readModel?.panel.items ?? []).map((item) => <article key={item.title}><span className="customer-item-marker" /><div><strong>{item.title}</strong><small>{item.detail}</small></div><time>{item.meta}</time>{item.status ? <b>{item.status}</b> : null}</article>)}</div>
            )}
          </section>

          <section className="customer-insight-grid" aria-label="Customer insights"><article><small>Customer Value</small><strong>{customer?.lifetimeValue ?? "--"}</strong><span>Not yet calculated</span><i className="spark green" /></article><article><small>Open Tasks</small><strong>{readModel?.summary.openTasks ?? "--"}</strong><span className="blue-text">Current</span><i className="spark blue" /></article><article><small>Open Cases</small><strong>{readModel?.summary.openCases ?? "--"}</strong><span className="red-text">Current</span><i className="spark red" /></article><article><small>Missing Documents</small><strong>{readModel?.summary.missingDocuments ?? "--"}</strong><span>Required</span><i className="spark orange" /></article><article><small>Lead Score</small><strong>{readModel?.summary.highestLeadScore ?? "--"}</strong><span className="purple-text">Highest active score</span><i className="spark purple" /></article></section>
        </main>

        <aside className="customer-command-rail" aria-label="Customer command panel">
          <section className="customer-rail-card"><header><strong>Quick Actions</strong></header><div className="customer-action-grid">
            <button onClick={() => void guardedCommunicationAction("call", "Call logging is ready. Customer communications are open.")} type="button"><Phone size={20} /><span>Log Call</span></button>
            <button onClick={() => void guardedCommunicationAction("email", "Email draft readiness checked. Customer communications are open.")} type="button"><Mail size={20} /><span>Send Email</span></button>
            <button onClick={() => goToTab("overview", "Task context opened. Use the visible task list first; governed task creation stays behind the task bridge gate.")} type="button"><CheckSquare size={20} /><span>New Task</span></button>
            <button onClick={() => goToTab("cases", "Case context opened. Use Customer Resolutions when a full case workflow is needed.")} type="button"><AlertTriangle size={20} /><span>New Case</span></button>
            <button onClick={() => goToTab("appointments", "Appointment context opened. Scheduling stays connected to the appointments source workspace.")} type="button"><CalendarDays size={20} /><span>Schedule Appt</span></button>
            <button onClick={() => goToTab("documents", "Document workspace opened. Upload will stay governed by the document workflow.")} type="button"><Upload size={20} /><span>Upload Doc</span></button>
          </div></section>
          <section className="customer-rail-card customer-next-action"><header><strong>Next Best Action</strong></header><div><span><Gift size={17} /></span><p><strong>{readModel?.nextBestAction?.title ?? "No recommendation"}</strong><small>{readModel?.nextBestAction?.explanation ?? "No current decision requires action."}</small></p></div>{readModel?.nextBestAction ? <button className="customer-rail-link-button" onClick={() => goToTab("overview", "Next best action opened in Customer 360 context.")} type="button">Take Action</button> : null}</section>
          <section className="customer-rail-card customer-risk-card"><header><strong>Customer Risk</strong></header><h3>{readModel?.summary.slaRisk ?? "--"}</h3><strong>Current Signals</strong><ul><li>{readModel?.summary.openCases ?? 0} open cases</li><li>{readModel?.summary.openTasks ?? 0} open tasks</li><li>{readModel?.summary.missingDocuments ?? 0} missing documents</li></ul><button onClick={() => goToTab("cases", "Risk details opened from Customer 360 cases.")} type="button">View Risk Details</button></section>
          <section className="customer-rail-card customer-vehicles-card"><header><strong>Linked Vehicles ({readModel?.linkedVehicles.length ?? 0})</strong></header>{(readModel?.linkedVehicles ?? []).map((vehicle) => <div key={vehicle.id}><span><Car size={25} /></span><p><strong>{vehicle.label}</strong><small>{vehicle.detail}</small><b>{vehicle.relationship}</b></p></div>)}</section>
        </aside>
      </div>
    </section>
  );
}
