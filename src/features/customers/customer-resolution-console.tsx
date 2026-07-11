"use client";

import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Download,
  Filter,
  Grid2X2,
  List,
  Mail,
  Moon,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sun,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type CustomerTheme = "light" | "dark";
type ResolutionTab = "All Cases" | "My Cases" | "Unassigned" | "Overdue" | "Escalated" | "Resolved";
type DetailTab = "Details" | "Timeline" | "Customer" | "Vehicle" | "Related";

type ResolutionCase = {
  id: string;
  initials: string;
  customer: string;
  subject: string;
  category: string;
  status: "Open" | "In Progress" | "Escalated" | "Pending Customer" | "Resolved";
  priority: "High" | "Medium" | "Low";
  owner: string;
  updated: string;
  sla: number;
  phone: string;
  vehicle: string;
};

const cases: ResolutionCase[] = [
  { id: "CR-2025-00641", initials: "AH", customer: "Ahmed H.", subject: "Financing approval delay", category: "Financing", status: "In Progress", priority: "High", owner: "Ancilla M.", updated: "1h ago", sla: 75, phone: "(612) 555-3489", vehicle: "2018 Toyota Camry" },
  { id: "CR-2025-00640", initials: "FA", customer: "Fardowsa A.", subject: "Monthly payment adjustment", category: "Financing", status: "Open", priority: "Medium", owner: "Eli Aswan", updated: "2h ago", sla: 90, phone: "(612) 555-2841", vehicle: "2019 Honda Accord" },
  { id: "CR-2025-00639", initials: "MK", customer: "Mustafa K.", subject: "Vehicle not starting", category: "Service", status: "Escalated", priority: "High", owner: "Walter C.", updated: "3h ago", sla: 50, phone: "(612) 555-7124", vehicle: "2020 Toyota RAV4" },
  { id: "CR-2025-00638", initials: "ID", customer: "Ibrahim D.", subject: "Missing title documents", category: "Documentation", status: "In Progress", priority: "Medium", owner: "Ancilla M.", updated: "5h ago", sla: 80, phone: "(612) 555-6390", vehicle: "2017 Nissan Rogue" },
  { id: "CR-2025-00637", initials: "SM", customer: "Sahra M.", subject: "Warranty claim follow up", category: "Warranty", status: "Open", priority: "Medium", owner: "Brock L.", updated: "6h ago", sla: 85, phone: "(612) 555-9032", vehicle: "2019 Nissan Altima" },
  { id: "CR-2025-00636", initials: "OA", customer: "Omar A.", subject: "Vehicle pick up request", category: "Logistics", status: "Pending Customer", priority: "Low", owner: "Carlos G.", updated: "Yesterday", sla: 100, phone: "(612) 555-4822", vehicle: "2018 Ford Escape" },
  { id: "CR-2025-00635", initials: "HY", customer: "Hodan Y.", subject: "Trade-in offer question", category: "Sales", status: "Open", priority: "Low", owner: "Baraka A.", updated: "Yesterday", sla: 95, phone: "(612) 555-1408", vehicle: "2020 Honda CR-V" }
];

const metrics = [
  { label: "Open Cases", value: "27", trend: "18%", detail: "vs last week", icon: ShieldAlert, tone: "purple" },
  { label: "Due Today", value: "8", trend: "33%", detail: "vs yesterday", icon: CalendarDays, tone: "blue" },
  { label: "Overdue", value: "5", trend: "29%", detail: "vs last week", icon: CalendarDays, tone: "orange" },
  { label: "Resolved This Month", value: "62", trend: "24%", detail: "vs last month", icon: CircleDollarSign, tone: "green" },
  { label: "SLA Compliance", value: "92%", trend: "8%", detail: "vs last month", icon: CircleDollarSign, tone: "cyan" },
  { label: "Avg. Resolution Time", value: "1.6 days", trend: "0.4", detail: "vs last month", icon: Clock3, tone: "neutral" }
] as const;

function applyTheme(theme: CustomerTheme) {
  document.body.classList.add("customer-console-shell");
  document.body.classList.toggle("customer-console-dark-shell", theme === "dark");
}

export function CustomerResolutionConsole() {
  const [theme, setTheme] = useState<CustomerTheme>("light");
  const [activeTab, setActiveTab] = useState<ResolutionTab>("All Cases");
  const [detailTab, setDetailTab] = useState<DetailTab>("Details");
  const [selectedId, setSelectedId] = useState(cases[0].id);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem("customer-console-theme");
    const initial: CustomerTheme = stored === "dark" ? "dark" : "light";
    const frame = window.requestAnimationFrame(() => {
      setTheme(initial);
      applyTheme(initial);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.classList.remove("customer-console-shell", "customer-console-dark-shell");
    };
  }, []);

  const filteredCases = useMemo(() => {
    const query = search.trim().toLowerCase();
    return cases.filter((item) => {
      const matchesTab =
        activeTab === "All Cases" ||
        (activeTab === "My Cases" && item.owner === "Ancilla M.") ||
        (activeTab === "Unassigned" && !item.owner) ||
        (activeTab === "Overdue" && item.sla <= 50) ||
        (activeTab === "Escalated" && item.status === "Escalated") ||
        (activeTab === "Resolved" && item.status === "Resolved");
      return matchesTab && (!query || `${item.customer} ${item.subject} ${item.id} ${item.category}`.toLowerCase().includes(query));
    });
  }, [activeTab, search]);

  const selectedCase = cases.find((item) => item.id === selectedId) ?? cases[0];

  function selectTheme(nextTheme: CustomerTheme) {
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem("customer-console-theme", nextTheme);
  }

  return (
    <section className="customer-console customer-resolution" data-theme={theme} aria-label="Customer Resolution Console">
      <header className="customer-console-toolbar customer-resolution-toolbar">
        <label className="customer-console-search"><Search size={16} /><input aria-label="Search customers and cases" placeholder="Search customers, tickets, vehicles, orders..." type="search" /><kbd>Ctrl K</kbd></label>
        <div className="customer-theme-switch" aria-label="Customer console appearance" role="group">
          <button aria-label="Use light background" aria-pressed={theme === "light"} className={theme === "light" ? "customer-theme-option active" : "customer-theme-option"} onClick={() => selectTheme("light")} type="button"><Sun size={14} /> Light</button>
          <button aria-label="Use dark background" aria-pressed={theme === "dark"} className={theme === "dark" ? "customer-theme-option active" : "customer-theme-option"} onClick={() => selectTheme("dark")} type="button"><Moon size={14} /> Dark</button>
        </div>
        <button className="customer-quick-action" type="button"><Plus size={15} /> New <ChevronDown size={12} /></button>
        <button className="customer-resolution-icon" aria-label="Notifications" type="button"><Bell size={17} /><span>6</span></button>
        <button className="customer-resolution-icon" aria-label="Messages" type="button"><Mail size={17} /></button>
      </header>

      <div className="customer-resolution-layout">
        <main className="customer-resolution-main">
          <section className="customer-resolution-heading">
            <div><h1>Customer Resolution</h1><p>Resolve customer issues efficiently and turn every experience into loyalty.</p></div>
            <div><button type="button"><Download size={14} /> Export</button><button type="button"><Filter size={14} /> All Teams <ChevronDown size={12} /></button><button type="button"><SlidersHorizontal size={14} /> Filters</button></div>
          </section>

          <section className="customer-resolution-metrics" aria-label="Resolution summary">
            {metrics.map(({ label, value, trend, detail, icon: Icon, tone }) => <article key={label}><span className={tone}><Icon size={18} /></span><div><small>{label}</small><strong>{value}</strong><p className={tone === "neutral" ? "down" : ""}>↓ {trend} <i>{detail}</i></p></div></article>)}
          </section>

          <section className="customer-case-board" aria-label="Customer case queue">
            <nav aria-label="Resolution queues">{(["All Cases", "My Cases", "Unassigned", "Overdue", "Escalated", "Resolved"] as ResolutionTab[]).map((tab) => <button aria-current={activeTab === tab ? "page" : undefined} className={activeTab === tab ? "active" : ""} key={tab} onClick={() => setActiveTab(tab)} type="button">{tab}</button>)}</nav>
            <div className="customer-case-toolbar"><label><Search size={14} /><input aria-label="Search cases" placeholder="Search cases..." type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>{["Status", "Priority", "Type", "Channel"].map((filter) => <button key={filter} type="button">{filter} <ChevronDown size={11} /></button>)}<span /><button type="button">Sort: Newest <ChevronDown size={11} /></button><button aria-label="List view" type="button"><List size={14} /></button><button aria-label="Grid view" type="button"><Grid2X2 size={14} /></button></div>
            <div className="customer-case-table">
              <div className="customer-case-table-head"><span>Case / Customer</span><span>Subject</span><span>Status</span><span>Priority</span><span>Assigned To</span><span>Updated</span><span>SLA</span></div>
              {filteredCases.length ? filteredCases.map((item) => <button className={selectedId === item.id ? "customer-case-row selected" : "customer-case-row"} key={item.id} onClick={() => { setSelectedId(item.id); setDetailTab("Details"); }} type="button"><span><i>{item.initials}</i><b>{item.customer}<small>#{item.id}</small></b></span><span><b>{item.subject}</b><small>{item.category}</small></span><span><em className={`case-status ${item.status.toLowerCase().replace(" ", "-")}`}>{item.status}</em></span><span><em className={`case-priority ${item.priority.toLowerCase()}`}>{item.priority}</em></span><span><i className="case-owner">{item.owner.split(" ").map((part) => part[0]).join("").slice(0, 2)}</i>{item.owner}</span><span>{item.updated}</span><span><b>{item.sla}%</b><i className="case-sla"><u style={{ width: `${item.sla}%` }} /></i></span></button>) : <div className="customer-case-empty">No cases match this queue and search.</div>}
            </div>
            <footer><span>1-{filteredCases.length} of {filteredCases.length || 0} cases</span><div><button type="button">‹</button><button className="active" type="button">1</button><button type="button">2</button><button type="button">›</button></div><button type="button">25 / page <ChevronDown size={11} /></button></footer>
          </section>

          <section className="customer-resolution-analytics">
            <article><header><strong>Case by Status</strong><span>This Month <ChevronDown size={11} /></span></header><div className="resolution-donut"><span><strong>27</strong><small>Total</small></span></div><ul><li>Open <b>9 (33%)</b></li><li>In Progress <b>8 (30%)</b></li><li>Pending Customer <b>4 (15%)</b></li><li>Escalated <b>3 (11%)</b></li><li>Resolved <b>3 (11%)</b></li></ul></article>
            <article><header><strong>Case by Type</strong><span>This Month <ChevronDown size={11} /></span></header><div className="resolution-bars">{[["Financing",9],["Service",7],["Documentation",4],["Warranty",3],["Sales",2],["Logistics",2]].map(([label,value]) => <div key={label}><span>{label}</span><i><u style={{ width: `${Number(value) * 10}%` }} /></i><b>{value}</b></div>)}</div></article>
            <article className="resolution-performance"><header><strong>Resolution Performance</strong><span>This Month <ChevronDown size={11} /></span></header><div><p><strong>1.6 days</strong><span>Average Resolution Time</span><b>↓ 0.4 vs last month</b></p><div className="resolution-gauge"><span><strong>92%</strong><small>Compliance</small></span></div></div></article>
          </section>
        </main>

        <aside className="customer-resolution-detail" aria-label="Selected case command rail">
          <header><span>CASE &nbsp; #{selectedCase.id}</span><select aria-label="Selected case status" defaultValue={selectedCase.status} key={selectedCase.id}><option>{selectedCase.status}</option></select><button aria-label="Close selected case" type="button"><X size={14} /></button><h2>{selectedCase.subject}</h2><p>{selectedCase.customer} &nbsp;•&nbsp; {selectedCase.vehicle}</p><div><span>Phone</span><span>5/30/2025 10:23 AM</span><span>{selectedCase.owner}</span><b>{selectedCase.priority}</b></div></header>
          <nav aria-label="Selected case sections">{(["Details", "Timeline", "Customer", "Vehicle", "Related"] as DetailTab[]).map((tab) => <button aria-current={detailTab === tab ? "page" : undefined} className={detailTab === tab ? "active" : ""} key={tab} onClick={() => setDetailTab(tab)} type="button">{tab}</button>)}</nav>
          {detailTab === "Details" ? <div className="customer-resolution-detail-content">
            <section className="resolution-info-grid"><article><strong>Case Information</strong><dl><div><dt>Type</dt><dd>{selectedCase.category}</dd></div><div><dt>Category</dt><dd>{selectedCase.subject}</dd></div><div><dt>Channel</dt><dd>Phone</dd></div><div><dt>Source</dt><dd>Inbound Call</dd></div><div><dt>SLA Due</dt><dd className="green-text">May 31, 2025<br />10:23 AM (Today)</dd></div></dl></article><article><strong>Customer Information</strong><div className="resolution-customer"><i>{selectedCase.initials}</i><p><strong>{selectedCase.customer}</strong><span>{selectedCase.phone}</span><a>{selectedCase.customer.toLowerCase().replace(" ", ".")}@email.com</a></p></div><dl><div><dt>Customer Since</dt><dd>Feb 18, 2023</dd></div><div><dt>Total Purchases</dt><dd>2</dd></div><div><dt>Lifetime Value</dt><dd>$28,450</dd></div><div><dt>Open Cases</dt><dd>1</dd></div></dl></article></section>
            <section><strong>Case Description</strong><p>Customer is experiencing a delay in {selectedCase.subject.toLowerCase()}. Requested an update on the status.</p></section>
            <section><strong>Internal Notes</strong><div className="resolution-note"><input aria-label="Add internal note" placeholder="Add internal note..." /><button type="button">Add Note</button></div></section>
            <section className="resolution-next-steps"><strong>Next Steps / To Do</strong><label><span className="done"><Check size={12} /></span><p><s>Verify financing documents</s><small>{selectedCase.owner} • May 30, 10:45 AM</small></p></label><label><span /><p>Check with lender for status update<small>Eli Aswan • Due today 3:00 PM</small></p><b>High</b></label><label><span /><p>Update customer with resolution<small>{selectedCase.owner} • Due tomorrow 10:00 AM</small></p><b>Medium</b></label><button type="button"><Plus size={12} /> Add Next Step</button></section>
          </div> : <div className="customer-resolution-tab-placeholder"><UserRound size={24} /><strong>{detailTab}</strong><p>This case context panel is reserved for the {detailTab.toLowerCase()} read model in the CRM-5 implementation milestone.</p></div>}
        </aside>
      </div>
    </section>
  );
}
