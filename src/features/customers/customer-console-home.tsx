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
import { useEffect, useState } from "react";
import Link from "next/link";

import type { CustomerDashboardReadModel } from "@/server/services/customer-console-read-service";

type CustomerTheme = "light" | "dark";

const dashboardMetricIcons = {
  "Total Customers": Users,
  "New Leads": UserPlus,
  "Open Deals": HandCoins,
  Appointments: CalendarDays,
  "Sales This Month": CircleDollarSign
};

function applyCustomerTheme(theme: CustomerTheme) {
  document.body.classList.add("customer-console-shell");
  document.body.classList.toggle("customer-console-dark-shell", theme === "dark");
}

export function CustomerConsoleHome() {
  const [theme, setTheme] = useState<CustomerTheme>("light");
  const [readModel, setReadModel] = useState<CustomerDashboardReadModel | null>(null);
  const [readError, setReadError] = useState("");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("customer-console-theme");
    const initialTheme: CustomerTheme = storedTheme === "dark" ? "dark" : "light";
    const frame = window.requestAnimationFrame(() => {
      setTheme(initialTheme);
      applyCustomerTheme(initialTheme);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.classList.remove("customer-console-shell", "customer-console-dark-shell");
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/customers/dashboard", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Unable to load the customer dashboard.");
        return payload as CustomerDashboardReadModel;
      })
      .then(setReadModel)
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReadError(error instanceof Error ? error.message : "Unable to load the customer dashboard.");
      });
    return () => controller.abort();
  }, []);

  function selectTheme(nextTheme: CustomerTheme) {
    setTheme(nextTheme);
    applyCustomerTheme(nextTheme);
    window.localStorage.setItem("customer-console-theme", nextTheme);
  }

  return (
    <section className="customer-console customer-home" data-theme={theme} aria-label="Customer Command Center">
      <header className="customer-console-toolbar customer-home-toolbar">
        <label className="customer-console-search">
          <Search size={17} aria-hidden="true" />
          <input aria-label="Search customer command center" placeholder="Search customers, leads, vehicles, deals..." type="search" />
          <kbd>Ctrl K</kbd>
        </label>
        <nav className="customer-module-switcher" aria-label="Customer console sections">
          <Link aria-current="page" className="active" href="/customers">Overview</Link>
          <Link href="/customers/customer-360">Customer 360</Link>
          <Link href="/customers/resolutions">Resolution</Link>
        </nav>
        <button className="customer-quick-action" type="button"><Plus size={16} /> New <ChevronDown size={13} /></button>
        <button className="customer-home-toolbar-icon" aria-label="Notifications" type="button"><Bell size={17} /><span>6</span></button>
        <button className="customer-home-toolbar-icon" aria-label="Messages" type="button"><Mail size={17} /></button>
        <div className="customer-home-user"><span>EA</span><div><strong>Eli Aswan</strong><small>Owner / CEO</small></div><ChevronDown size={13} /></div>
      </header>

      <div className="customer-home-layout">
        <main className="customer-home-main">
          <section className="customer-home-welcome">
            <div><h1>Welcome back, Eli <span aria-hidden="true">&#128075;</span></h1><p>Here&apos;s what&apos;s happening with your business today.</p></div>
            <div className="customer-home-welcome-actions">
              <label><span>Date</span><input aria-label="Dashboard date" type="date" defaultValue="2025-05-30" /></label>
              <div className="customer-theme-switch" aria-label="Customer console appearance" role="group">
                <button aria-label="Use light background" aria-pressed={theme === "light"} className={theme === "light" ? "customer-theme-option active" : "customer-theme-option"} onClick={() => selectTheme("light")} type="button"><Sun size={14} /> Light</button>
                <button aria-label="Use dark background" aria-pressed={theme === "dark"} className={theme === "dark" ? "customer-theme-option active" : "customer-theme-option"} onClick={() => selectTheme("dark")} type="button"><Moon size={14} /> Dark</button>
              </div>
              <button className="customer-customize-button" type="button">Customize</button>
            </div>
          </section>
          <div className={readError ? "customer-live-status error" : "customer-live-status"} aria-live="polite">{readError || (readModel ? `Live dashboard refreshed ${new Date(readModel.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Loading live customer dashboard...")}</div>

          <section className="customer-home-metrics" aria-label="Customer business summary">
            {(readModel?.metrics ?? []).map(({ label, value, trend, tone }) => { const Icon = dashboardMetricIcons[label as keyof typeof dashboardMetricIcons] ?? Users; return <article key={label}><span className={`customer-home-metric-icon ${tone}`}><Icon size={21} /></span><div><small>{label}</small><strong>{value}</strong><p><TrendingUp size={11} /> {trend} <span>vs last month</span></p></div></article>; })}
          </section>

          <section className="customer-home-analytics">
            <article className="customer-home-card customer-pipeline-card">
              <header><strong>Sales Pipeline</strong><button type="button">This Month <ChevronDown size={12} /></button></header>
              <div className="customer-pipeline-content">
                <div className="customer-funnel">{(readModel?.pipeline ?? []).map((item) => <div key={item.label}>{item.value}</div>)}</div>
                <ul>{(readModel?.pipeline ?? []).map((item) => <li key={item.label}><i className={item.tone} />{item.label}</li>)}</ul>
              </div>
              <footer>Conversion Rate: <strong>10.7%</strong><span>+ 2.3%</span></footer>
            </article>

            <article className="customer-home-card customer-performance-card">
              <header><strong>Sales Performance</strong><button type="button">This Month <ChevronDown size={12} /></button></header>
              <div className="customer-chart-legend"><span><i />This Month</span><span><i />Last Month</span></div>
              <div className="customer-line-chart" aria-label="Sales performance chart"><span className="customer-chart-value">$487,620</span><i className="current-line" /><i className="previous-line" /></div>
              <footer><span>Goal<strong>$500,000</strong></span><span>Achieved<strong className="green-text">97.5%</strong></span><span>Remaining<strong>$12,380</strong></span></footer>
            </article>

            <article className="customer-home-card customer-sources-card">
              <header><strong>Lead Sources</strong><button type="button">This Month <ChevronDown size={12} /></button></header>
              <div className="customer-source-content"><div className="customer-donut"><span><strong>{readModel?.recentLeads.length ? "168" : "--"}</strong><small>Total Leads</small></span></div><ul>{(readModel?.leadSources ?? []).map((item) => <li key={item.label}><i />{item.label} <b>{item.value}%</b></li>)}</ul></div>
              <a href="#recent-leads">View full report &gt;</a>
            </article>
          </section>

          <section className="customer-home-tables">
            <article className="customer-home-card" id="recent-leads">
              <header><strong>Recent Leads</strong><button type="button">View all</button></header>
              <div className="customer-data-table customer-lead-table"><div className="customer-table-head"><span>Name</span><span>Source</span><span>Vehicle Interest</span><span>Date</span><span>Status</span></div>{(readModel?.recentLeads ?? []).map(({ initial, name, source, vehicle, date, status }) => <div className="customer-table-row" key={name}><span><i>{initial}</i>{name}</span><span>{source}</span><span>{vehicle}</span><span>{date}</span><span><b className={`customer-stage ${status.toLowerCase()}`}>{status}</b></span></div>)}</div>
            </article>
            <article className="customer-home-card">
              <header><strong>Top Deals</strong><button type="button">View all</button></header>
              <div className="customer-data-table customer-deal-table"><div className="customer-table-head"><span>Customer</span><span>Vehicle</span><span>Amount</span><span>Stage</span></div>{(readModel?.topDeals ?? []).map(({ customer, vehicle, amount, stage }) => <div className="customer-table-row" key={customer}><span>{customer}</span><span>{vehicle}</span><span>{amount}</span><span><b className={`customer-stage ${stage.toLowerCase()}`}>{stage}</b></span></div>)}</div>
            </article>
          </section>

          <footer className="customer-home-quick-actions"><strong>Quick Actions</strong>{["Add Lead", "Add Customer", "Schedule Appointment", "Add Deal", "Add Vehicle", "Send Message"].map((action) => <button key={action} type="button">{action === "Send Message" ? <MessageSquare size={14} /> : <Plus size={14} />}{action}</button>)}</footer>
        </main>

        <aside className="customer-home-rail" aria-label="Customer operations summary">
          <section className="customer-home-card customer-home-tasks"><header><strong>My Tasks <b>{readModel?.tasks.length ?? 0}</b></strong><button type="button">View all</button></header>{(readModel?.tasks ?? []).map(({ title, detail, priority }) => <button className="customer-home-task" key={title} type="button"><i /><span><strong>{title}</strong><small>{detail}</small></span><b className={priority.toLowerCase()}>{priority}</b></button>)}</section>
          <section className="customer-home-card customer-home-appointments"><header><strong>Today&apos;s Appointments</strong><button type="button">View calendar</button></header>{(readModel?.appointments ?? []).map(({ time, customer, detail }, index) => <div key={time}><i className={`tone-${index}`} /><time>{time}</time><span><strong>{customer}</strong><small>{detail}</small></span></div>)}</section>
          <section className="customer-home-card customer-home-activity"><header><strong>Recent Activity</strong><button type="button">View all</button></header>{(readModel?.activity ?? []).map(({ title, detail, time }, index) => <div key={title}><span className={`tone-${index}`}><CheckSquare size={13} /></span><p><strong>{title}</strong><small>{detail}</small></p><time>{time}</time></div>)}</section>
        </aside>
      </div>
    </section>
  );
}
