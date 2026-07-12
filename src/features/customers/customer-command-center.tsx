"use client";

import {
  AlertTriangle, CalendarDays, Car, CheckSquare, CircleDollarSign,
  FileText, Gift, Mail, Moon, MoreHorizontal, Phone, Plus, Search, ShieldAlert,
  Star, Sun, Upload
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { Customer360ReadModel, Customer360Tab } from "@/server/services/customer-console-read-service";

type CustomerTheme = "light" | "dark";
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
const quickActions = [
  { label: "Log Call", icon: Phone }, { label: "Send Email", icon: Mail },
  { label: "New Task", icon: CheckSquare }, { label: "New Case", icon: AlertTriangle },
  { label: "Schedule Appt", icon: CalendarDays }, { label: "Upload Doc", icon: Upload }
] as const;

function setDocumentTheme(theme: CustomerTheme) {
  document.body.classList.add("customer-console-shell");
  document.body.classList.toggle("customer-console-dark-shell", theme === "dark");
}

export function CustomerCommandCenter({ customerId }: { customerId?: string } = {}) {
  const [theme, setTheme] = useState<CustomerTheme>("light");
  const [activeTab, setActiveTab] = useState<Customer360Tab>("overview");
  const [readModel, setReadModel] = useState<Customer360ReadModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [readError, setReadError] = useState("");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("customer-console-theme");
    const initialTheme: CustomerTheme = savedTheme === "dark" ? "dark" : "light";
    const frame = window.requestAnimationFrame(() => {
      setTheme(initialTheme);
      setDocumentTheme(initialTheme);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.classList.remove("customer-console-shell", "customer-console-dark-shell");
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const parameters = new URLSearchParams({ tab: activeTab });
    if (customerId) parameters.set("customerId", customerId);
    fetch(`/api/customers/customer-360?${parameters.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Unable to load Customer 360.");
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

  function selectTheme(nextTheme: CustomerTheme) {
    setTheme(nextTheme);
    setDocumentTheme(nextTheme);
    window.localStorage.setItem("customer-console-theme", nextTheme);
  }

  const customer = readModel?.customer;
  return (
    <section className="customer-console" data-theme={theme} aria-label="Customer 360 Console">
      <header className="customer-console-toolbar">
        <label className="customer-console-search"><Search size={17} /><input aria-label="Search Customer 360" placeholder="Search customers, leads, vehicles, cases, appointments..." type="search" /><kbd>Ctrl K</kbd></label>
        <nav className="customer-module-switcher" aria-label="Customer console sections"><Link href="/customers">Overview</Link><Link aria-current="page" className="active" href="/customers/customer-360">Customer 360</Link><Link href="/customers/resolutions">Resolution</Link></nav>
        <div className="customer-theme-switch" aria-label="Customer console appearance" role="group"><button aria-label="Use light background" aria-pressed={theme === "light"} className={theme === "light" ? "customer-theme-option active" : "customer-theme-option"} onClick={() => selectTheme("light")} type="button"><Sun size={15} /> Light</button><button aria-label="Use dark background" aria-pressed={theme === "dark"} className={theme === "dark" ? "customer-theme-option active" : "customer-theme-option"} onClick={() => selectTheme("dark")} type="button"><Moon size={15} /> Dark</button></div>
        <button className="customer-quick-action" type="button"><Plus size={16} /> Quick Action</button>
      </header>

      <div className="customer-console-layout">
        <main className="customer-console-main">
          <section className="customer-profile-card">
            <div className="customer-avatar"><span>MS</span><i /></div>
            <div className="customer-profile-identity"><div><h1>{customer?.name ?? "Loading customer..."}</h1><span className="customer-preferred"><Star size={13} fill="currentColor" /> Preferred Customer</span></div><p>{customer?.phone ?? "--"} <b>-</b> {customer?.email ?? "--"}</p><small>{customer?.address ?? "Loading address..."}</small></div>
            <dl className="customer-profile-facts"><div><dt>Customer Since</dt><dd>{customer?.since ?? "--"}</dd></div><div><dt>Lifetime Value</dt><dd>{customer?.lifetimeValue ?? "--"}</dd></div><div><dt>Owner</dt><dd><span className="customer-mini-avatar">JM</span> {customer?.owner ?? "--"}</dd></div><div><dt>Status</dt><dd><i className="customer-active-dot" /> {customer?.status ?? "--"}</dd></div></dl>
            <button className="customer-icon-button" aria-label="More customer actions" type="button"><MoreHorizontal size={18} /></button>
          </section>

          <section className="customer-metric-grid" aria-label="Customer summary">{summaryMetrics.map(({ label, key, detail, icon: Icon, tone }) => <article key={label}><span className={`customer-metric-icon ${tone}`}><Icon size={17} /></span><div><small>{label}</small><strong>{readModel?.summary[key] ?? "--"}</strong><p>{detail}</p></div></article>)}<article className="customer-risk-metric"><span className="customer-metric-icon red"><ShieldAlert size={17} /></span><div><small>SLA Risk</small><strong>{readModel?.summary.slaRisk ?? "--"}</strong><p>Current cases</p></div></article></section>

          <nav className="customer-record-tabs" aria-label="Customer record sections">{tabs.map((tab) => <button aria-current={activeTab === tab.value ? "page" : undefined} className={activeTab === tab.value ? "active" : ""} key={tab.value} onClick={() => { setIsLoading(true); setReadError(""); setActiveTab(tab.value); }} type="button">{tab.label}</button>)}</nav>
          <div className={readError ? "customer-live-status error" : "customer-live-status"} aria-live="polite">{readError || (isLoading ? `Loading live ${activeTab}...` : `Live ${activeTab} refreshed`)}</div>

          <section className="customer-360-live-workspace" aria-label="Active customer record panel" aria-busy={isLoading}>
            <header><div><p>Customer workspace</p><h2>{readModel?.panel.title ?? "Loading..."}</h2><small>{readModel?.panel.summary}</small></div><span>{readModel?.panel.items.length ?? 0} items</span></header>
            <div>{(readModel?.panel.items ?? []).map((item) => <article key={item.title}><span className="customer-item-marker" /><div><strong>{item.title}</strong><small>{item.detail}</small></div><time>{item.meta}</time>{item.status ? <b>{item.status}</b> : null}</article>)}</div>
          </section>

          <section className="customer-insight-grid" aria-label="Customer insights"><article><small>Customer Value</small><strong>{customer?.lifetimeValue ?? "--"}</strong><span>Not yet calculated</span><i className="spark green" /></article><article><small>Open Tasks</small><strong>{readModel?.summary.openTasks ?? "--"}</strong><span className="blue-text">Current</span><i className="spark blue" /></article><article><small>Open Cases</small><strong>{readModel?.summary.openCases ?? "--"}</strong><span className="red-text">Current</span><i className="spark red" /></article><article><small>Missing Documents</small><strong>{readModel?.summary.missingDocuments ?? "--"}</strong><span>Required</span><i className="spark orange" /></article><article><small>Lead Score</small><strong>{readModel?.summary.highestLeadScore ?? "--"}</strong><span className="purple-text">Highest active score</span><i className="spark purple" /></article></section>
        </main>

        <aside className="customer-command-rail" aria-label="Customer command panel">
          <section className="customer-rail-card"><header><strong>Quick Actions</strong></header><div className="customer-action-grid">{quickActions.map(({ label, icon: Icon }) => <button key={label} type="button"><Icon size={20} /><span>{label}</span></button>)}</div></section>
          <section className="customer-rail-card customer-next-action"><header><strong>Next Best Action</strong></header><div><span><Gift size={17} /></span><p><strong>{readModel?.nextBestAction?.title ?? "No recommendation"}</strong><small>{readModel?.nextBestAction?.explanation ?? "No current decision requires action."}</small></p></div>{readModel?.nextBestAction ? <Link className="customer-rail-link-button" href={readModel.nextBestAction.target}>Take Action</Link> : null}</section>
          <section className="customer-rail-card customer-risk-card"><header><strong>Customer Risk</strong></header><h3>{readModel?.summary.slaRisk ?? "--"}</h3><strong>Current Signals</strong><ul><li>{readModel?.summary.openCases ?? 0} open cases</li><li>{readModel?.summary.openTasks ?? 0} open tasks</li><li>{readModel?.summary.missingDocuments ?? 0} missing documents</li></ul><Link href="/customers/resolutions">View Risk Details</Link></section>
          <section className="customer-rail-card customer-vehicles-card"><header><strong>Linked Vehicles ({readModel?.linkedVehicles.length ?? 0})</strong></header>{(readModel?.linkedVehicles ?? []).map((vehicle) => <div key={vehicle.id}><span><Car size={25} /></span><p><strong>{vehicle.label}</strong><small>{vehicle.detail}</small><b>{vehicle.relationship}</b></p></div>)}</section>
        </aside>
      </div>
    </section>
  );
}
