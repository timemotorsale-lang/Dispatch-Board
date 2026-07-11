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
  { label: "Open Deals", value: "1", detail: "$12,500", icon: CircleDollarSign, tone: "green" },
  { label: "Open Cases", value: "2", detail: "High Priority", icon: AlertTriangle, tone: "red" },
  { label: "Appointments", value: "1", detail: "Upcoming", icon: CalendarDays, tone: "purple" },
  { label: "Tasks", value: "3", detail: "Due Soon", icon: CheckSquare, tone: "blue" },
  { label: "Documents", value: "2", detail: "Missing", icon: FileText, tone: "orange" }
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

export function CustomerCommandCenter() {
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
    fetch(`/api/customers/customer-360?tab=${activeTab}`, { signal: controller.signal })
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
  }, [activeTab]);

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

          <section className="customer-metric-grid" aria-label="Customer summary">{summaryMetrics.map(({ label, value, detail, icon: Icon, tone }) => <article key={label}><span className={`customer-metric-icon ${tone}`}><Icon size={17} /></span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>)}<article className="customer-risk-metric"><span className="customer-metric-icon red"><ShieldAlert size={17} /></span><div><small>Risk Score</small><strong>High</strong><p>Needs attention</p></div></article></section>

          <nav className="customer-record-tabs" aria-label="Customer record sections">{tabs.map((tab) => <button aria-current={activeTab === tab.value ? "page" : undefined} className={activeTab === tab.value ? "active" : ""} key={tab.value} onClick={() => { setIsLoading(true); setReadError(""); setActiveTab(tab.value); }} type="button">{tab.label}</button>)}</nav>
          <div className={readError ? "customer-live-status error" : "customer-live-status"} aria-live="polite">{readError || (isLoading ? `Loading live ${activeTab}...` : `Live ${activeTab} refreshed`)}</div>

          <section className="customer-360-live-workspace" aria-label="Active customer record panel" aria-busy={isLoading}>
            <header><div><p>Customer workspace</p><h2>{readModel?.panel.title ?? "Loading..."}</h2><small>{readModel?.panel.summary}</small></div><span>{readModel?.panel.items.length ?? 0} items</span></header>
            <div>{(readModel?.panel.items ?? []).map((item) => <article key={item.title}><span className="customer-item-marker" /><div><strong>{item.title}</strong><small>{item.detail}</small></div><time>{item.meta}</time>{item.status ? <b>{item.status}</b> : null}</article>)}</div>
          </section>

          <section className="customer-insight-grid" aria-label="Customer insights"><article><small>Customer Value</small><strong>{customer?.lifetimeValue ?? "--"}</strong><span>Lifetime Value</span><i className="spark green" /></article><article><small>Engagement Score</small><strong>85</strong><span className="blue-text">High</span><i className="spark blue" /></article><article><small>Open Cases</small><strong>2</strong><span className="red-text">High Priority</span><i className="spark red" /></article><article><small>Payment Status</small><strong className="red-text">Past Due</strong><span>15 Days</span><i className="spark orange" /></article><article><small>Lead Score</small><strong>78</strong><span className="purple-text">Hot Lead</span><i className="spark purple" /></article></section>
        </main>

        <aside className="customer-command-rail" aria-label="Customer command panel">
          <section className="customer-rail-card"><header><strong>Quick Actions</strong></header><div className="customer-action-grid">{quickActions.map(({ label, icon: Icon }) => <button key={label} type="button"><Icon size={20} /><span>{label}</span></button>)}</div></section>
          <section className="customer-rail-card customer-next-action"><header><strong>Next Best Action</strong></header><div><span><Gift size={17} /></span><p><strong>Follow up on title issue</strong><small>High priority case requires attention</small></p></div><Link className="customer-rail-link-button" href="/customers/resolutions">Take Action</Link></section>
          <section className="customer-rail-card customer-risk-card"><header><strong>Customer Risk</strong></header><h3>High</h3><strong>Risk Factors</strong><ul><li>Title issue open &gt; 7 days</li><li>Missed appointment (1)</li><li>Payment past due (15 days)</li></ul><button type="button">View Risk Details</button></section>
          <section className="customer-rail-card customer-vehicles-card"><header><strong>Linked Vehicles (2)</strong></header><div><span><Car size={25} /></span><p><strong>2024 Toyota RAV4</strong><small>VIN: 2T3P1RFV4RW123456</small><b>Interested</b></p></div><div><span><Car size={25} /></span><p><strong>2019 Honda Accord</strong><small>VIN: 1HGCV1F3XKA123456</small><em>Traded In</em></p></div></section>
        </aside>
      </div>
    </section>
  );
}
