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

type CustomerTheme = "light" | "dark";

const dashboardMetrics = [
  { label: "Total Customers", value: "2,842", trend: "12.5%", icon: Users, tone: "blue" },
  { label: "New Leads", value: "168", trend: "8.3%", icon: UserPlus, tone: "green" },
  { label: "Open Deals", value: "74", trend: "15.2%", icon: HandCoins, tone: "purple" },
  { label: "Appointments", value: "28", trend: "5.7%", icon: CalendarDays, tone: "orange" },
  { label: "Sales This Month", value: "$487,620", trend: "18.6%", icon: CircleDollarSign, tone: "cyan" }
] as const;

const recentLeads = [
  ["A", "Abdirahman M.", "Website", "2019 Toyota RAV4", "May 30, 2025", "New"],
  ["H", "Hodan Y.", "Referral", "2020 Honda CR-V", "May 30, 2025", "Contacted"],
  ["O", "Omar A.", "Facebook", "2018 Ford Escape", "May 29, 2025", "New"],
  ["K", "Khalid H.", "Walk-In", "2017 Toyota Camry", "May 29, 2025", "Qualified"],
  ["S", "Sahra M.", "Google Ads", "2019 Nissan Altima", "May 29, 2025", "Contacted"]
] as const;

const topDeals = [
  ["Ahmed H.", "2018 Toyota Camry", "$15,500", "Proposal"],
  ["Fardowsa A.", "2019 Honda Accord", "$18,900", "Proposal"],
  ["Mustafa K.", "2020 Toyota RAV4", "$22,750", "Qualified"],
  ["Ibrahim D.", "2017 Nissan Rogue", "$14,800", "Negotiation"],
  ["Mohamed A.", "2019 Ford Escape", "$13,200", "Qualified"]
] as const;

const myTasks = [
  ["Follow up with Ahmed H.", "2018 Toyota Camry", "High"],
  ["Call Elmi M. about financing", "2019 Honda Accord", "Medium"],
  ["Confirm appointment", "With Fardowsa A.", "Medium"],
  ["Send insurance documents", "To Ibrahim D.", "Low"],
  ["Prepare vehicle for test drive", "2017 RAV4", "Low"]
] as const;

const appointments = [
  ["10:00 AM", "Ahmed H.", "2018 Toyota Camry"],
  ["1:00 PM", "Fardowsa A.", "Financing Discussion"],
  ["3:30 PM", "Mustafa K.", "Test Drive"]
] as const;

const activity = [
  ["New lead received", "Abdirahman M. via Website", "5m ago"],
  ["Deal updated", "2019 Nissan Rogue - Won", "1h ago"],
  ["Appointment scheduled", "With Fardowsa A.", "2h ago"],
  ["Customer updated", "Ahmed H. - Contact Info", "3h ago"]
] as const;

function applyCustomerTheme(theme: CustomerTheme) {
  document.body.classList.add("customer-console-shell");
  document.body.classList.toggle("customer-console-dark-shell", theme === "dark");
}

export function CustomerConsoleHome() {
  const [theme, setTheme] = useState<CustomerTheme>("light");

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

          <section className="customer-home-metrics" aria-label="Customer business summary">
            {dashboardMetrics.map(({ label, value, trend, icon: Icon, tone }) => (
              <article key={label}><span className={`customer-home-metric-icon ${tone}`}><Icon size={21} /></span><div><small>{label}</small><strong>{value}</strong><p><TrendingUp size={11} /> {trend} <span>vs last month</span></p></div></article>
            ))}
          </section>

          <section className="customer-home-analytics">
            <article className="customer-home-card customer-pipeline-card">
              <header><strong>Sales Pipeline</strong><button type="button">This Month <ChevronDown size={12} /></button></header>
              <div className="customer-pipeline-content">
                <div className="customer-funnel"><div>168</div><div>98</div><div>74</div><div>42</div><div>18</div></div>
                <ul><li><i className="blue" />New Leads</li><li><i className="green" />Contacted</li><li><i className="yellow" />Qualified</li><li><i className="purple" />Proposal Sent</li><li><i className="red" />Won</li></ul>
              </div>
              <footer>Conversion Rate: <strong>10.7%</strong><span>↑ 2.3%</span></footer>
            </article>

            <article className="customer-home-card customer-performance-card">
              <header><strong>Sales Performance</strong><button type="button">This Month <ChevronDown size={12} /></button></header>
              <div className="customer-chart-legend"><span><i />This Month</span><span><i />Last Month</span></div>
              <div className="customer-line-chart" aria-label="Sales performance chart"><span className="customer-chart-value">$487,620</span><i className="current-line" /><i className="previous-line" /></div>
              <footer><span>Goal<strong>$500,000</strong></span><span>Achieved<strong className="green-text">97.5%</strong></span><span>Remaining<strong>$12,380</strong></span></footer>
            </article>

            <article className="customer-home-card customer-sources-card">
              <header><strong>Lead Sources</strong><button type="button">This Month <ChevronDown size={12} /></button></header>
              <div className="customer-source-content"><div className="customer-donut"><span><strong>168</strong><small>Total Leads</small></span></div><ul><li><i />Website <b>42%</b></li><li><i />Referral <b>25%</b></li><li><i />Facebook <b>15%</b></li><li><i />Google Ads <b>10%</b></li><li><i />Walk-In <b>8%</b></li></ul></div>
              <a href="#recent-leads">View full report →</a>
            </article>
          </section>

          <section className="customer-home-tables">
            <article className="customer-home-card" id="recent-leads">
              <header><strong>Recent Leads</strong><button type="button">View all</button></header>
              <div className="customer-data-table customer-lead-table"><div className="customer-table-head"><span>Name</span><span>Source</span><span>Vehicle Interest</span><span>Date</span><span>Status</span></div>{recentLeads.map(([initial, name, source, vehicle, date, status]) => <div className="customer-table-row" key={name}><span><i>{initial}</i>{name}</span><span>{source}</span><span>{vehicle}</span><span>{date}</span><span><b className={`customer-stage ${status.toLowerCase()}`}>{status}</b></span></div>)}</div>
            </article>
            <article className="customer-home-card">
              <header><strong>Top Deals</strong><button type="button">View all</button></header>
              <div className="customer-data-table customer-deal-table"><div className="customer-table-head"><span>Customer</span><span>Vehicle</span><span>Amount</span><span>Stage</span></div>{topDeals.map(([customer, vehicle, amount, stage]) => <div className="customer-table-row" key={customer}><span>{customer}</span><span>{vehicle}</span><span>{amount}</span><span><b className={`customer-stage ${stage.toLowerCase()}`}>{stage}</b></span></div>)}</div>
            </article>
          </section>

          <footer className="customer-home-quick-actions"><strong>Quick Actions</strong>{["Add Lead", "Add Customer", "Schedule Appointment", "Add Deal", "Add Vehicle", "Send Message"].map((action) => <button key={action} type="button">{action === "Send Message" ? <MessageSquare size={14} /> : <Plus size={14} />}{action}</button>)}</footer>
        </main>

        <aside className="customer-home-rail" aria-label="Customer operations summary">
          <section className="customer-home-card customer-home-tasks"><header><strong>My Tasks <b>6</b></strong><button type="button">View all</button></header>{myTasks.map(([title, detail, priority]) => <button className="customer-home-task" key={title} type="button"><i /><span><strong>{title}</strong><small>{detail}</small></span><b className={priority.toLowerCase()}>{priority}</b></button>)}</section>
          <section className="customer-home-card customer-home-appointments"><header><strong>Today&apos;s Appointments</strong><button type="button">View calendar</button></header>{appointments.map(([time, customer, detail], index) => <div key={time}><i className={`tone-${index}`} /><time>{time}</time><span><strong>{customer}</strong><small>{detail}</small></span></div>)}</section>
          <section className="customer-home-card customer-home-activity"><header><strong>Recent Activity</strong><button type="button">View all</button></header>{activity.map(([title, detail, time], index) => <div key={title}><span className={`tone-${index}`}><CheckSquare size={13} /></span><p><strong>{title}</strong><small>{detail}</small></p><time>{time}</time></div>)}</section>
        </aside>
      </div>
    </section>
  );
}
