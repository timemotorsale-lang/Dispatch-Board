import type { AuthenticatedUser } from "@/server/auth/store";

export type CustomerConsoleReadMeta = {
  generatedAt: string;
  source: "PREVIEW_READ_MODEL";
  viewerName: string;
};

export type CustomerDashboardReadModel = CustomerConsoleReadMeta & {
  metrics: Array<{ label: string; value: string; trend: string; tone: string }>;
  pipeline: Array<{ label: string; value: number; tone: string }>;
  leadSources: Array<{ label: string; value: number; tone: string }>;
  recentLeads: Array<{ initial: string; name: string; source: string; vehicle: string; date: string; status: string }>;
  topDeals: Array<{ customer: string; vehicle: string; amount: string; stage: string }>;
  tasks: Array<{ title: string; detail: string; priority: string }>;
  appointments: Array<{ time: string; customer: string; detail: string }>;
  activity: Array<{ title: string; detail: string; time: string }>;
};

export type CustomerResolutionCase = {
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

export type CustomerResolutionQueue = "all" | "mine" | "unassigned" | "overdue" | "escalated" | "resolved";
export type CustomerResolutionDetail = "details" | "timeline" | "customer" | "vehicle" | "related";

export type CustomerResolutionReadModel = CustomerConsoleReadMeta & {
  queue: CustomerResolutionQueue;
  query: string;
  selectedCaseId: string;
  detail: CustomerResolutionDetail;
  metrics: Array<{ label: string; value: string; trend: string; detail: string; tone: string }>;
  cases: CustomerResolutionCase[];
  selectedCase: CustomerResolutionCase;
  detailPanel: {
    title: string;
    summary: string;
    sections: Array<{ title: string; rows: Array<{ label: string; value: string; tone?: string }> }>;
  };
  analytics: {
    byStatus: Array<{ label: string; value: number }>;
    byType: Array<{ label: string; value: number }>;
    averageResolution: string;
    compliance: number;
  };
};

export type Customer360Tab = "overview" | "timeline" | "deals" | "cases" | "appointments" | "documents" | "vehicles" | "communications" | "collections" | "notes";

export type Customer360ReadModel = CustomerConsoleReadMeta & {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    owner: string;
    status: string;
    since: string;
    lifetimeValue: string;
  };
  tab: Customer360Tab;
  panel: {
    title: string;
    summary: string;
    items: Array<{ title: string; detail: string; meta: string; status?: string }>;
  };
};

function assertAuthenticated(user: AuthenticatedUser | null): AuthenticatedUser {
  if (!user) {
    throw new Error("Authentication required.");
  }
  return user;
}

function meta(user: AuthenticatedUser): CustomerConsoleReadMeta {
  return { generatedAt: new Date().toISOString(), source: "PREVIEW_READ_MODEL", viewerName: user.name };
}

const resolutionCases: CustomerResolutionCase[] = [
  { id: "CR-2025-00641", initials: "AH", customer: "Ahmed H.", subject: "Financing approval delay", category: "Financing", status: "In Progress", priority: "High", owner: "Ancilla M.", updated: "1h ago", sla: 75, phone: "(612) 555-3489", vehicle: "2018 Toyota Camry" },
  { id: "CR-2025-00640", initials: "FA", customer: "Fardowsa A.", subject: "Monthly payment adjustment", category: "Financing", status: "Open", priority: "Medium", owner: "Eli Aswan", updated: "2h ago", sla: 90, phone: "(612) 555-2841", vehicle: "2019 Honda Accord" },
  { id: "CR-2025-00639", initials: "MK", customer: "Mustafa K.", subject: "Vehicle not starting", category: "Service", status: "Escalated", priority: "High", owner: "Walter C.", updated: "3h ago", sla: 50, phone: "(612) 555-7124", vehicle: "2020 Toyota RAV4" },
  { id: "CR-2025-00638", initials: "ID", customer: "Ibrahim D.", subject: "Missing title documents", category: "Documentation", status: "In Progress", priority: "Medium", owner: "Ancilla M.", updated: "5h ago", sla: 80, phone: "(612) 555-6390", vehicle: "2017 Nissan Rogue" },
  { id: "CR-2025-00637", initials: "SM", customer: "Sahra M.", subject: "Warranty claim follow up", category: "Warranty", status: "Open", priority: "Medium", owner: "Brock L.", updated: "6h ago", sla: 85, phone: "(612) 555-9032", vehicle: "2019 Nissan Altima" },
  { id: "CR-2025-00636", initials: "OA", customer: "Omar A.", subject: "Vehicle pick up request", category: "Logistics", status: "Pending Customer", priority: "Low", owner: "Carlos G.", updated: "Yesterday", sla: 100, phone: "(612) 555-4822", vehicle: "2018 Ford Escape" },
  { id: "CR-2025-00635", initials: "HY", customer: "Hodan Y.", subject: "Trade-in offer question", category: "Sales", status: "Open", priority: "Low", owner: "Baraka A.", updated: "Yesterday", sla: 95, phone: "(612) 555-1408", vehicle: "2020 Honda CR-V" },
  { id: "CR-2025-00634", initials: "NA", customer: "Nasra A.", subject: "Delivery confirmation", category: "Delivery", status: "Resolved", priority: "Low", owner: "Ancilla M.", updated: "2 days ago", sla: 100, phone: "(612) 555-8821", vehicle: "2021 Kia Sorento" },
  { id: "CR-2025-00633", initials: "UN", customer: "Unassigned intake", subject: "Website complaint follow up", category: "Customer Care", status: "Open", priority: "High", owner: "", updated: "30m ago", sla: 40, phone: "(612) 555-1104", vehicle: "No linked vehicle" }
];

const detailPanels: Record<CustomerResolutionDetail, (item: CustomerResolutionCase) => CustomerResolutionReadModel["detailPanel"]> = {
  details: (item) => ({
    title: "Case Details",
    summary: `Operational facts and SLA context for ${item.id}.`,
    sections: [
      { title: "Case Information", rows: [{ label: "Type", value: item.category }, { label: "Channel", value: "Phone" }, { label: "Source", value: "Inbound Call" }, { label: "SLA", value: `${item.sla}% remaining`, tone: item.sla <= 50 ? "danger" : "success" }] },
      { title: "Customer Information", rows: [{ label: "Customer", value: item.customer }, { label: "Phone", value: item.phone }, { label: "Open Cases", value: "1" }, { label: "Lifetime Value", value: "$28,450" }] },
      { title: "Next Steps", rows: [{ label: "Completed", value: "Verify financing documents" }, { label: "Due today", value: "Check status with current owner" }, { label: "Tomorrow", value: "Update customer with resolution" }] }
    ]
  }),
  timeline: (item) => ({ title: "Case Timeline", summary: `Chronological case activity for ${item.customer}.`, sections: [{ title: "Today", rows: [{ label: "10:45 AM", value: "Required documents verified" }, { label: "10:23 AM", value: "Inbound customer call recorded" }, { label: "9:50 AM", value: `Case assigned to ${item.owner || "Unassigned queue"}` }] }, { title: "Yesterday", rows: [{ label: "4:10 PM", value: "SLA warning generated" }, { label: "2:35 PM", value: "Customer requested status update" }] }] }),
  customer: (item) => ({ title: "Customer Context", summary: `Customer 360 summary for ${item.customer}.`, sections: [{ title: "Identity", rows: [{ label: "Customer", value: item.customer }, { label: "Phone", value: item.phone }, { label: "Customer Since", value: "Feb 18, 2023" }] }, { title: "Relationship", rows: [{ label: "Lifetime Value", value: "$28,450" }, { label: "Purchases", value: "2" }, { label: "Preferred Contact", value: "Phone" }] }] }),
  vehicle: (item) => ({ title: "Vehicle Context", summary: `Vehicle facts linked to ${item.id}.`, sections: [{ title: item.vehicle, rows: [{ label: "Relationship", value: "Customer vehicle" }, { label: "VIN", value: "4T1B11HKXJU045678" }, { label: "Service Status", value: "No active repair order" }, { label: "Last Visit", value: "May 12, 2025" }] }] }),
  related: (item) => ({ title: "Related Work", summary: `Tasks, appointments, and documents correlated to ${item.id}.`, sections: [{ title: "Tasks", rows: [{ label: "TMS-1048", value: "Financing follow-up - In Progress" }, { label: "TMS-1051", value: "Customer status update - Not Started" }] }, { title: "Appointments", rows: [{ label: "APT-10245", value: "Financing discussion - May 31, 10:00 AM" }] }, { title: "Documents", rows: [{ label: "Proof of income", value: "Received" }, { label: "Lender decision", value: "Pending" }] }] })
};

const customer360Panels: Record<Customer360Tab, Customer360ReadModel["panel"]> = {
  overview: { title: "Customer Overview", summary: "Current relationship summary and next operational actions.", items: [{ title: "Title Issue - Follow Up", detail: "Case CR-2025-00641 assigned to Ancilla M.", meta: "Due today", status: "High" }, { title: "Missing Document", detail: "Driver license copy is still required.", meta: "Due in 2 days", status: "Medium" }, { title: "Test Drive Appointment", detail: "2024 Toyota RAV4 with Brock Peterson.", meta: "Upcoming", status: "Low" }] },
  timeline: { title: "Timeline", summary: "Calls, appointments, documents, cases, and messages in chronological order.", items: [{ title: "Outbound call logged", detail: "Discussed vehicle and financing options.", meta: "Today 10:15 AM" }, { title: "Appointment scheduled", detail: "Test Drive - 2024 Toyota RAV4.", meta: "Today 9:30 AM" }, { title: "Document uploaded", detail: "Paystub - Proof of Income.", meta: "Today 9:00 AM" }] },
  deals: { title: "Deals", summary: "Open and historical opportunities connected to this customer.", items: [{ title: "2024 Toyota RAV4", detail: "Retail purchase opportunity.", meta: "$12,500 - Proposal", status: "Open" }, { title: "2019 Honda Accord", detail: "Completed trade relationship.", meta: "$8,900 - Closed", status: "Won" }] },
  cases: { title: "Cases", summary: "Customer issues, SLA state, ownership, and resolution evidence.", items: [{ title: "Financing approval delay", detail: "CR-2025-00641 - Ancilla M.", meta: "75% SLA", status: "In Progress" }, { title: "Title issue follow-up", detail: "CR-2025-00582 - Resolved by Eli Aswan.", meta: "Resolved May 12", status: "Resolved" }] },
  appointments: { title: "Appointments", summary: "Upcoming and completed dealership visits.", items: [{ title: "Test Drive", detail: "2024 Toyota RAV4 - Brock Peterson.", meta: "May 31, 10:00 AM", status: "Confirmed" }, { title: "Financing Discussion", detail: "Manager office - Eli Aswan.", meta: "May 20, 1:00 PM", status: "Completed" }] },
  documents: { title: "Documents", summary: "Requirements, received evidence, and missing customer documents.", items: [{ title: "Proof of Income", detail: "Paystub uploaded by Maria Santos.", meta: "Received today", status: "Complete" }, { title: "Driver License", detail: "Customer copy required.", meta: "Due in 2 days", status: "Missing" }] },
  vehicles: { title: "Vehicles", summary: "Interested, purchased, traded, and serviced vehicle relationships.", items: [{ title: "2024 Toyota RAV4", detail: "VIN 2T3P1RFV4RW123456", meta: "Interested", status: "Active" }, { title: "2019 Honda Accord", detail: "VIN 1HGCV1F3XKA123456", meta: "Traded In", status: "Historical" }] },
  communications: { title: "Communications", summary: "Channel preferences and recent outreach outcomes.", items: [{ title: "Phone", detail: "Preferred channel - Evenings.", meta: "Consent active", status: "Preferred" }, { title: "Email", detail: "Financing pre-approval information sent.", meta: "Yesterday 2:15 PM", status: "Delivered" }] },
  collections: { title: "Collections", summary: "Policy-filtered account signals requiring customer follow-up.", items: [{ title: "Payment Status", detail: "Payment is 15 days past due.", meta: "Manual follow-up", status: "Past Due" }, { title: "Promise to Pay", detail: "No active promise recorded.", meta: "Review required", status: "Open" }] },
  notes: { title: "Notes", summary: "Internal customer context with author and timestamp evidence.", items: [{ title: "Vehicle preference", detail: "Prefers reliable family SUVs.", meta: "Jessica Miller - May 28" }, { title: "Contact preference", detail: "Best reached by phone during evenings.", meta: "Ancilla M. - May 20" }] }
};

export async function getCustomerDashboardReadModel(user: AuthenticatedUser | null): Promise<CustomerDashboardReadModel> {
  const actor = assertAuthenticated(user);
  return {
    ...meta(actor),
    metrics: [{ label: "Total Customers", value: "2,842", trend: "12.5%", tone: "blue" }, { label: "New Leads", value: "168", trend: "8.3%", tone: "green" }, { label: "Open Deals", value: "74", trend: "15.2%", tone: "purple" }, { label: "Appointments", value: "28", trend: "5.7%", tone: "orange" }, { label: "Sales This Month", value: "$487,620", trend: "18.6%", tone: "cyan" }],
    pipeline: [{ label: "New Leads", value: 168, tone: "blue" }, { label: "Contacted", value: 98, tone: "green" }, { label: "Qualified", value: 74, tone: "yellow" }, { label: "Proposal Sent", value: 42, tone: "purple" }, { label: "Won", value: 18, tone: "red" }],
    leadSources: [{ label: "Website", value: 42, tone: "blue" }, { label: "Referral", value: 25, tone: "orange" }, { label: "Facebook", value: 15, tone: "green" }, { label: "Google Ads", value: 10, tone: "red" }, { label: "Walk-In", value: 8, tone: "purple" }],
    recentLeads: [{ initial: "A", name: "Abdirahman M.", source: "Website", vehicle: "2019 Toyota RAV4", date: "May 30, 2025", status: "New" }, { initial: "H", name: "Hodan Y.", source: "Referral", vehicle: "2020 Honda CR-V", date: "May 30, 2025", status: "Contacted" }, { initial: "O", name: "Omar A.", source: "Facebook", vehicle: "2018 Ford Escape", date: "May 29, 2025", status: "New" }, { initial: "K", name: "Khalid H.", source: "Walk-In", vehicle: "2017 Toyota Camry", date: "May 29, 2025", status: "Qualified" }, { initial: "S", name: "Sahra M.", source: "Google Ads", vehicle: "2019 Nissan Altima", date: "May 29, 2025", status: "Contacted" }],
    topDeals: [{ customer: "Ahmed H.", vehicle: "2018 Toyota Camry", amount: "$15,500", stage: "Proposal" }, { customer: "Fardowsa A.", vehicle: "2019 Honda Accord", amount: "$18,900", stage: "Proposal" }, { customer: "Mustafa K.", vehicle: "2020 Toyota RAV4", amount: "$22,750", stage: "Qualified" }, { customer: "Ibrahim D.", vehicle: "2017 Nissan Rogue", amount: "$14,800", stage: "Negotiation" }, { customer: "Mohamed A.", vehicle: "2019 Ford Escape", amount: "$13,200", stage: "Qualified" }],
    tasks: [{ title: "Follow up with Ahmed H.", detail: "2018 Toyota Camry", priority: "High" }, { title: "Call Elmi M. about financing", detail: "2019 Honda Accord", priority: "Medium" }, { title: "Confirm appointment", detail: "With Fardowsa A.", priority: "Medium" }, { title: "Send insurance documents", detail: "To Ibrahim D.", priority: "Low" }, { title: "Prepare vehicle for test drive", detail: "2017 RAV4", priority: "Low" }],
    appointments: [{ time: "10:00 AM", customer: "Ahmed H.", detail: "2018 Toyota Camry" }, { time: "1:00 PM", customer: "Fardowsa A.", detail: "Financing Discussion" }, { time: "3:30 PM", customer: "Mustafa K.", detail: "Test Drive" }],
    activity: [{ title: "New lead received", detail: "Abdirahman M. via Website", time: "5m ago" }, { title: "Deal updated", detail: "2019 Nissan Rogue - Won", time: "1h ago" }, { title: "Appointment scheduled", detail: "With Fardowsa A.", time: "2h ago" }, { title: "Customer updated", detail: "Ahmed H. - Contact Info", time: "3h ago" }]
  };
}

export async function getCustomerResolutionReadModel(user: AuthenticatedUser | null, input: { queue?: string | null; query?: string | null; caseId?: string | null; detail?: string | null }): Promise<CustomerResolutionReadModel> {
  const actor = assertAuthenticated(user);
  const queue = (["all", "mine", "unassigned", "overdue", "escalated", "resolved"].includes(input.queue ?? "") ? input.queue : "all") as CustomerResolutionQueue;
  const detail = (["details", "timeline", "customer", "vehicle", "related"].includes(input.detail ?? "") ? input.detail : "details") as CustomerResolutionDetail;
  const query = input.query?.trim().toLowerCase() ?? "";
  const filtered = resolutionCases.filter((item) => {
    const queueMatch = queue === "all" || (queue === "mine" && item.owner === "Ancilla M.") || (queue === "unassigned" && !item.owner) || (queue === "overdue" && item.sla <= 50) || (queue === "escalated" && item.status === "Escalated") || (queue === "resolved" && item.status === "Resolved");
    return queueMatch && (!query || `${item.customer} ${item.subject} ${item.id} ${item.category}`.toLowerCase().includes(query));
  });
  const selectedCase = filtered.find((item) => item.id === input.caseId) ?? filtered[0] ?? resolutionCases[0];
  return {
    ...meta(actor), queue, query, selectedCaseId: selectedCase.id, detail,
    metrics: [{ label: "Open Cases", value: "27", trend: "18%", detail: "vs last week", tone: "purple" }, { label: "Due Today", value: "8", trend: "33%", detail: "vs yesterday", tone: "blue" }, { label: "Overdue", value: "5", trend: "29%", detail: "vs last week", tone: "orange" }, { label: "Resolved This Month", value: "62", trend: "24%", detail: "vs last month", tone: "green" }, { label: "SLA Compliance", value: "92%", trend: "8%", detail: "vs last month", tone: "cyan" }, { label: "Avg. Resolution Time", value: "1.6 days", trend: "0.4", detail: "vs last month", tone: "neutral" }],
    cases: filtered, selectedCase, detailPanel: detailPanels[detail](selectedCase),
    analytics: { byStatus: [{ label: "Open", value: 9 }, { label: "In Progress", value: 8 }, { label: "Pending Customer", value: 4 }, { label: "Escalated", value: 3 }, { label: "Resolved", value: 3 }], byType: [{ label: "Financing", value: 9 }, { label: "Service", value: 7 }, { label: "Documentation", value: 4 }, { label: "Warranty", value: 3 }, { label: "Sales", value: 2 }, { label: "Logistics", value: 2 }], averageResolution: "1.6 days", compliance: 92 }
  };
}

export async function getCustomer360ReadModel(user: AuthenticatedUser | null, input: { tab?: string | null }): Promise<Customer360ReadModel> {
  const actor = assertAuthenticated(user);
  const tab = (["overview", "timeline", "deals", "cases", "appointments", "documents", "vehicles", "communications", "collections", "notes"].includes(input.tab ?? "") ? input.tab : "overview") as Customer360Tab;
  return { ...meta(actor), customer: { id: "customer-preview-maria", name: "Maria Santos", phone: "(555) 555-0198", email: "maria.santos@email.com", address: "123 Main St, Houston, TX 77001", owner: "Jessica Miller", status: "Active", since: "Mar 12, 2022", lifetimeValue: "$18,650" }, tab, panel: customer360Panels[tab] };
}
