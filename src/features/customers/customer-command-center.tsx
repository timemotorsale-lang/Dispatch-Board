"use client";

import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckSquare,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Gift,
  Mail,
  Moon,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  Star,
  Sun,
  Upload,
  UserRound
} from "lucide-react";
import { useEffect, useState } from "react";

type CustomerTheme = "light" | "dark";

const metrics = [
  { label: "Open Deals", value: "1", detail: "$12,500", icon: CircleDollarSign, tone: "green" },
  { label: "Open Cases", value: "2", detail: "High Priority", icon: AlertTriangle, tone: "red" },
  { label: "Appointments", value: "1", detail: "Upcoming", icon: CalendarDays, tone: "purple" },
  { label: "Tasks", value: "3", detail: "Due Soon", icon: CheckSquare, tone: "blue" },
  { label: "Documents", value: "2", detail: "Missing", icon: FileText, tone: "orange" }
] as const;

const tabs = [
  "Overview",
  "Timeline",
  "Deals",
  "Cases",
  "Appointments",
  "Documents",
  "Vehicles",
  "Communications",
  "Collections",
  "Notes"
] as const;

const timeline = [
  ["Outbound call logged", "Discussed financing options", "10:15 AM"],
  ["Appointment scheduled", "Test Drive - 2024 Toyota RAV4", "9:30 AM"],
  ["Document uploaded", "Paystub - Proof of Income", "9:00 AM"],
  ["Case updated", "Title issue follow-up required", "Yesterday"],
  ["Email sent", "Financing pre-approval information", "Yesterday"]
] as const;

const openItems = [
  ["Title Issue - Follow Up", "High", "Due today"],
  ["Missing Document", "Medium", "Due in 2 days"],
  ["Follow Up Call", "Medium", "Due in 2 days"],
  ["Test Drive Appointment", "Low", "Upcoming"]
] as const;

const quickActions = [
  { label: "Log Call", icon: Phone },
  { label: "Send Email", icon: Mail },
  { label: "New Task", icon: CheckSquare },
  { label: "New Case", icon: AlertTriangle },
  { label: "Schedule Appt", icon: CalendarDays },
  { label: "Upload Doc", icon: Upload }
] as const;

function setDocumentTheme(theme: CustomerTheme) {
  document.body.classList.add("customer-console-shell");
  document.body.classList.toggle("customer-console-dark-shell", theme === "dark");
}

export function CustomerCommandCenter() {
  const [theme, setTheme] = useState<CustomerTheme>("light");
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("customer-console-theme");
    const initialTheme: CustomerTheme = savedTheme === "dark" ? "dark" : "light";
    const frame = window.requestAnimationFrame(() => {
      setTheme(initialTheme);
      setDocumentTheme(initialTheme);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.classList.remove("customer-console-shell");
      document.body.classList.remove("customer-console-dark-shell");
    };
  }, []);

  function selectTheme(nextTheme: CustomerTheme) {
    setTheme(nextTheme);
    setDocumentTheme(nextTheme);
    window.localStorage.setItem("customer-console-theme", nextTheme);
  }

  return (
    <section className="customer-console" data-theme={theme} aria-label="Customer Command Center">
      <header className="customer-console-toolbar">
        <label className="customer-console-search">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Search customer command center"
            placeholder="Search customers, leads, vehicles, cases, appointments..."
            type="search"
          />
          <kbd>Ctrl K</kbd>
        </label>
        <div className="customer-theme-switch" aria-label="Customer console appearance" role="group">
          <button
            aria-label="Use light background"
            aria-pressed={theme === "light"}
            className={theme === "light" ? "customer-theme-option active" : "customer-theme-option"}
            onClick={() => selectTheme("light")}
            type="button"
          >
            <Sun size={15} />
            Light
          </button>
          <button
            aria-label="Use dark background"
            aria-pressed={theme === "dark"}
            className={theme === "dark" ? "customer-theme-option active" : "customer-theme-option"}
            onClick={() => selectTheme("dark")}
            type="button"
          >
            <Moon size={15} />
            Dark
          </button>
        </div>
        <button className="customer-quick-action" type="button"><Plus size={16} /> Quick Action</button>
        <div className="customer-console-user">
          <span>EM</span>
          <div><strong>Eli Manager</strong><small>General Manager</small></div>
          <ChevronDown size={14} />
        </div>
      </header>

      <div className="customer-console-layout">
        <main className="customer-console-main">
          <section className="customer-profile-card">
            <div className="customer-avatar"><span>MS</span><i aria-hidden="true" /></div>
            <div className="customer-profile-identity">
              <div><h1>Maria Santos</h1><span className="customer-preferred"><Star size={13} fill="currentColor" /> Preferred Customer</span></div>
              <p>(555) 555-0198 <b>•</b> maria.santos@email.com</p>
              <small>123 Main St, Houston, TX 77001</small>
            </div>
            <dl className="customer-profile-facts">
              <div><dt>Customer Since</dt><dd>Mar 12, 2022</dd></div>
              <div><dt>Lifetime Value</dt><dd>$18,650</dd></div>
              <div><dt>Owner</dt><dd><span className="customer-mini-avatar">JM</span> Jessica Miller</dd></div>
              <div><dt>Status</dt><dd><i className="customer-active-dot" /> Active</dd></div>
            </dl>
            <button className="customer-icon-button" aria-label="More customer actions" type="button"><MoreHorizontal size={18} /></button>
          </section>

          <section className="customer-metric-grid" aria-label="Customer summary">
            {metrics.map(({ label, value, detail, icon: Icon, tone }) => (
              <article key={label}>
                <span className={`customer-metric-icon ${tone}`}><Icon size={17} /></span>
                <div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div>
              </article>
            ))}
            <article className="customer-risk-metric">
              <span className="customer-metric-icon red"><ShieldAlert size={17} /></span>
              <div><small>Risk Score</small><strong>High</strong><p>Needs attention</p></div>
            </article>
          </section>

          <nav className="customer-record-tabs" aria-label="Customer record sections">
            {tabs.map((tab) => (
              <button
                aria-current={activeTab === tab ? "page" : undefined}
                className={activeTab === tab ? "active" : ""}
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {tab}
              </button>
            ))}
          </nav>

          {activeTab === "Overview" ? (
            <div className="customer-overview-grid">
              <article className="customer-panel">
                <header><strong>Timeline</strong><button type="button">Filter <ChevronDown size={13} /></button></header>
                <div className="customer-timeline">
                  {timeline.map(([title, detail, time], index) => (
                    <div key={title}><span className={`customer-timeline-dot tone-${index % 3}`} /><div><strong>{title}</strong><small>{detail}</small></div><time>{time}</time></div>
                  ))}
                </div>
                <button className="customer-panel-footer" type="button">View All Timeline</button>
              </article>

              <article className="customer-panel">
                <header><strong>Open Items</strong></header>
                <div className="customer-open-items">
                  {openItems.map(([title, priority, due]) => (
                    <button key={title} type="button"><span className="customer-item-marker" /><div><strong>{title}</strong><small>Customer follow-up workflow</small></div><b className={`priority-${priority.toLowerCase()}`}>{priority}</b><time>{due}</time></button>
                  ))}
                </div>
                <button className="customer-panel-footer" type="button">View All Open Items</button>
              </article>

              <article className="customer-panel customer-snapshot">
                <header><strong>Customer Snapshot</strong></header>
                <dl>
                  <div><dt>Customer Type</dt><dd>Retail</dd></div>
                  <div><dt>Preferred Contact</dt><dd>Phone</dd></div>
                  <div><dt>Best Time to Contact</dt><dd>Evenings</dd></div>
                  <div><dt>Language</dt><dd>English</dd></div>
                  <div><dt>Employer</dt><dd>Texas Medical Center</dd></div>
                  <div><dt>Notes</dt><dd>Prefers SUVs. Interested in reliable family vehicles.</dd></div>
                </dl>
                <button className="customer-panel-footer" type="button">Edit</button>
              </article>
            </div>
          ) : (
            <section className="customer-selected-workspace">
              <span><UserRound size={22} /></span>
              <div><p>Customer workspace</p><h2>{activeTab}</h2><small>This section is ready for its focused MVP workflow while the Customer 360 context remains visible.</small></div>
              <button type="button">Open {activeTab}</button>
            </section>
          )}

          <section className="customer-insight-grid" aria-label="Customer insights">
            <article><small>Customer Value</small><strong>$18,650</strong><span>Lifetime Value</span><i className="spark green" /></article>
            <article><small>Engagement Score</small><strong>85</strong><span className="blue-text">High</span><i className="spark blue" /></article>
            <article><small>Open Cases</small><strong>2</strong><span className="red-text">High Priority</span><i className="spark red" /></article>
            <article><small>Payment Status</small><strong className="red-text">Past Due</strong><span>15 Days</span><i className="spark orange" /></article>
            <article><small>Lead Score</small><strong>78</strong><span className="purple-text">Hot Lead</span><i className="spark purple" /></article>
          </section>
        </main>

        <aside className="customer-command-rail" aria-label="Customer command panel">
          <section className="customer-rail-card">
            <header><strong>Quick Actions</strong></header>
            <div className="customer-action-grid">
              {quickActions.map(({ label, icon: Icon }) => <button key={label} type="button"><Icon size={20} /><span>{label}</span></button>)}
            </div>
          </section>
          <section className="customer-rail-card customer-next-action">
            <header><strong>Next Best Action</strong></header>
            <div><span><Gift size={17} /></span><p><strong>Follow up on title issue</strong><small>High priority case requires attention</small></p></div>
            <button type="button">Take Action</button>
          </section>
          <section className="customer-rail-card customer-risk-card">
            <header><strong>Customer Risk</strong></header>
            <h3>High</h3><strong>Risk Factors</strong>
            <ul><li>Title issue open &gt; 7 days</li><li>Missed appointment (1)</li><li>Payment past due (15 days)</li></ul>
            <button type="button">View Risk Details</button>
          </section>
          <section className="customer-rail-card customer-vehicles-card">
            <header><strong>Linked Vehicles (2)</strong></header>
            <div><span><Car size={25} /></span><p><strong>2024 Toyota RAV4</strong><small>VIN: 2T3P1RFV4RW123456</small><b>Interested</b></p></div>
            <div><span><Car size={25} /></span><p><strong>2019 Honda Accord</strong><small>VIN: 1HGCV1F3XKA123456</small><em>Traded In</em></p></div>
          </section>
        </aside>
      </div>
    </section>
  );
}
