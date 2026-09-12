"use client";

import {
  Bell, CalendarDays, ChevronDown, CircleDollarSign, Clock3, Download, Filter,
  Grid2X2, List, Mail, Moon, Plus, Search, ShieldAlert, SlidersHorizontal, Sun,
  UserRound, X
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";

import { useAppearance } from "@/components/layout/appearance";
import { CRM_NEXT_CUSTOMERS_HREF, CRM_NEXT_SEARCH_HREF } from "@/features/crm/crm-route-authority";
import type { CustomerResolutionReadModel } from "@/server/services/customer-console-read-service";
type ResolutionTab = "All Cases" | "My Cases" | "Unassigned" | "Overdue" | "Escalated" | "Resolved";
type DetailTab = "Details" | "Timeline" | "Customer" | "Vehicle" | "Related";

const queueValues: Record<ResolutionTab, string> = {
  "All Cases": "all", "My Cases": "mine", Unassigned: "unassigned",
  Overdue: "overdue", Escalated: "escalated", Resolved: "resolved"
};
const detailValues: Record<DetailTab, string> = {
  Details: "details", Timeline: "timeline", Customer: "customer",
  Vehicle: "vehicle", Related: "related"
};
const metricIcons = {
  "Open Cases": ShieldAlert, "Due Today": CalendarDays, Overdue: CalendarDays,
  "Resolved This Month": CircleDollarSign, "SLA Compliance": CircleDollarSign,
  "Avg. Resolution Time": Clock3
};

export function CustomerResolutionConsole() {
  const { appearance: theme, setAppearance } = useAppearance();
  const [activeTab, setActiveTab] = useState<ResolutionTab>("All Cases");
  const [detailTab, setDetailTab] = useState<DetailTab>("Details");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [readModel, setReadModel] = useState<CustomerResolutionReadModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [readError, setReadError] = useState("");
  const deferredSearch = useDeferredValue(search);

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
    const params = new URLSearchParams({
      queue: queueValues[activeTab],
      detail: detailValues[detailTab]
    });
    if (deferredSearch.trim()) params.set("query", deferredSearch.trim());
    if (selectedId) params.set("caseId", selectedId);
    fetch(`/api/customers/resolutions?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Unable to load customer resolutions.");
        return payload as CustomerResolutionReadModel;
      })
      .then((payload) => {
        setReadModel(payload);
        setSelectedId(payload.selectedCaseId);
        setReadError("");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReadError(error instanceof Error ? error.message : "Unable to load customer resolutions.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [activeTab, deferredSearch, detailTab, selectedId]);

  const caseRows = readModel?.cases ?? [];
  const selectedCase = readModel?.selectedCase ?? null;

  return (
    <section className="customer-console customer-resolution" data-theme={theme} aria-label="Customer Resolution Console">
      <header className="customer-console-toolbar customer-resolution-toolbar">
        <label className="customer-console-search"><Search size={16} /><input aria-label="Search customers and cases" placeholder="Search customers, tickets, vehicles, orders..." type="search" /><kbd>Ctrl K</kbd></label>
        <nav className="customer-module-switcher" aria-label="Customer console sections"><Link href={CRM_NEXT_CUSTOMERS_HREF}>CRM Next Customers</Link><Link href={CRM_NEXT_SEARCH_HREF}>Customer 360</Link><Link aria-current="page" className="active" href="/customers/resolutions">Legacy Resolution</Link></nav>
        <div className="customer-theme-switch" aria-label="Customer console appearance" role="group"><button aria-label="Use light background" aria-pressed={theme === "light"} className={theme === "light" ? "customer-theme-option active" : "customer-theme-option"} onClick={() => setAppearance("light")} type="button"><Sun size={14} /> Light</button><button aria-label="Use dark background" aria-pressed={theme === "dark"} className={theme === "dark" ? "customer-theme-option active" : "customer-theme-option"} onClick={() => setAppearance("dark")} type="button"><Moon size={14} /> Dark</button></div>
        <button className="customer-quick-action" type="button"><Plus size={15} /> New <ChevronDown size={12} /></button>
        <button className="customer-resolution-icon" aria-label="Notifications" type="button"><Bell size={17} /><span>6</span></button><button className="customer-resolution-icon" aria-label="Messages" type="button"><Mail size={17} /></button>
      </header>

      <div className="customer-resolution-layout">
        <main className="customer-resolution-main">
          <section className="customer-resolution-heading"><div><h1>Customer Resolution</h1><p>Resolve customer issues efficiently and turn every experience into loyalty.</p></div><div><button type="button"><Download size={14} /> Export</button><button type="button"><Filter size={14} /> All Teams <ChevronDown size={12} /></button><button type="button"><SlidersHorizontal size={14} /> Filters</button></div></section>
          <section className="customer-resolution-metrics" aria-label="Resolution summary">
            {(readModel?.metrics ?? []).map(({ label, value, trend, detail, tone }) => {
              const Icon = metricIcons[label as keyof typeof metricIcons] ?? ShieldAlert;
              return <article key={label}><span className={tone}><Icon size={18} /></span><div><small>{label}</small><strong>{value}</strong><p className={tone === "neutral" ? "down" : ""}>- {trend} <i>{detail}</i></p></div></article>;
            })}
          </section>

          <section className="customer-case-board" aria-label="Customer case queue" aria-busy={isLoading}>
            <nav aria-label="Resolution queues">{(Object.keys(queueValues) as ResolutionTab[]).map((tab) => <button aria-current={activeTab === tab ? "page" : undefined} className={activeTab === tab ? "active" : ""} key={tab} onClick={() => { setIsLoading(true); setReadError(""); setActiveTab(tab); setSelectedId(""); }} type="button">{tab}</button>)}</nav>
            <div className="customer-case-toolbar"><label><Search size={14} /><input aria-label="Search cases" placeholder="Search cases..." type="search" value={search} onChange={(event) => { setIsLoading(true); setReadError(""); setSearch(event.target.value); }} /></label>{["Status", "Priority", "Type", "Channel"].map((filter) => <button key={filter} type="button">{filter} <ChevronDown size={11} /></button>)}<span /><button type="button">Sort: Newest <ChevronDown size={11} /></button><button aria-label="List view" type="button"><List size={14} /></button><button aria-label="Grid view" type="button"><Grid2X2 size={14} /></button></div>
            <div className="customer-case-table">
              <div className="customer-case-table-head"><span>Case / Customer</span><span>Subject</span><span>Status</span><span>Priority</span><span>Assigned To</span><span>Updated</span><span>SLA</span></div>
              {isLoading && !readModel ? <div className="customer-case-empty">Loading live cases...</div> : readError ? <div className="customer-case-empty customer-live-error">{readError}</div> : caseRows.length ? caseRows.map((item) => <button className={selectedId === item.id ? "customer-case-row selected" : "customer-case-row"} key={item.id} onClick={() => { setIsLoading(true); setSelectedId(item.id); setDetailTab("Details"); }} type="button"><span><i>{item.initials}</i><b>{item.customer}<small>#{item.id}</small></b></span><span><b>{item.subject}</b><small>{item.category}</small></span><span><em className={`case-status ${item.status.toLowerCase().replaceAll(" ", "-")}`}>{item.status}</em></span><span><em className={`case-priority ${item.priority.toLowerCase()}`}>{item.priority}</em></span><span><i className="case-owner">{item.owner ? item.owner.split(" ").map((part) => part[0]).join("").slice(0, 2) : "?"}</i>{item.owner || "Unassigned"}</span><span>{item.updated}</span><span><b>{item.sla}%</b><i className="case-sla"><u style={{ width: `${item.sla}%` }} /></i></span></button>) : <div className="customer-case-empty">No cases match this live queue.</div>}
            </div>
            <footer><span>{caseRows.length ? `1-${caseRows.length}` : "0"} of {caseRows.length} cases {isLoading ? "- Refreshing" : ""}</span><div><button type="button">&lt;</button><button className="active" type="button">1</button><button type="button">2</button><button type="button">&gt;</button></div><button type="button">25 / page <ChevronDown size={11} /></button></footer>
          </section>

          <section className="customer-resolution-analytics">
            <article><header><strong>Case by Status</strong><span>This Month <ChevronDown size={11} /></span></header><div className="resolution-donut"><span><strong>27</strong><small>Total</small></span></div><ul>{(readModel?.analytics.byStatus ?? []).map((item) => <li key={item.label}>{item.label} <b>{item.value}</b></li>)}</ul></article>
            <article><header><strong>Case by Type</strong><span>This Month <ChevronDown size={11} /></span></header><div className="resolution-bars">{(readModel?.analytics.byType ?? []).map(({ label, value }) => <div key={label}><span>{label}</span><i><u style={{ width: `${value * 10}%` }} /></i><b>{value}</b></div>)}</div></article>
            <article className="resolution-performance"><header><strong>Resolution Performance</strong><span>This Month <ChevronDown size={11} /></span></header><div><p><strong>{readModel?.analytics.averageResolution ?? "--"}</strong><span>Average Resolution Time</span><b>- 0.4 vs last month</b></p><div className="resolution-gauge"><span><strong>{readModel?.analytics.compliance ?? 0}%</strong><small>Compliance</small></span></div></div></article>
          </section>
        </main>

        {selectedCase ? <aside className="customer-resolution-detail" aria-label="Selected case command rail" aria-busy={isLoading}>
          <header><span>CASE &nbsp; #{selectedCase.id}</span><select aria-label="Selected case status" defaultValue={selectedCase.status} key={selectedCase.id}><option>{selectedCase.status}</option></select><button aria-label="Close selected case" type="button"><X size={14} /></button><h2>{selectedCase.subject}</h2><p>{selectedCase.customer} &nbsp;-&nbsp; {selectedCase.vehicle}</p><div><span>Phone</span><span>5/30/2025 10:23 AM</span><span>{selectedCase.owner || "Unassigned"}</span><b>{selectedCase.priority}</b></div></header>
          <nav aria-label="Selected case sections">{(Object.keys(detailValues) as DetailTab[]).map((tab) => <button aria-current={detailTab === tab ? "page" : undefined} className={detailTab === tab ? "active" : ""} key={tab} onClick={() => { setIsLoading(true); setReadError(""); setDetailTab(tab); }} type="button">{tab}</button>)}</nav>
          <div className="customer-resolution-live-panel"><UserRound size={22} /><div><strong>{readModel?.detailPanel.title ?? detailTab}</strong><p>{readModel?.detailPanel.summary}</p></div>{(readModel?.detailPanel.sections ?? []).map((section) => <section key={section.title}><strong>{section.title}</strong>{section.rows.map((row) => <div key={`${row.label}-${row.value}`}><span>{row.label}</span><b className={row.tone ? `${row.tone}-text` : ""}>{row.value}</b></div>)}</section>)}</div>
        </aside> : <aside className="customer-resolution-detail customer-case-empty">Select a case to inspect its live context.</aside>}
      </div>
    </section>
  );
}
