import type { AuthenticatedUser } from "@/server/auth/store";
import { listRecentCustomerLeads } from "@/server/services/customer-lead-service";
import { listConcernResolutionPackages } from "@/server/services/concern-resolution-service";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { canViewCustomerContact } from "@/server/policies/access";
import { createCustomer360Repository, type Customer360Repository } from "@/server/repositories/customer-360-repository";

export type CustomerConsoleReadMeta = {
  generatedAt: string;
  source: "PREVIEW_READ_MODEL" | "HYBRID_READ_MODEL";
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
  selectedCase: CustomerResolutionCase | null;
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
  summary: { openLeads: number; openCases: number; upcomingAppointments: number; openTasks: number; missingDocuments: number; highestLeadScore: number | null; slaRisk: string };
  nextBestAction: { title: string; explanation: string; target: string } | null;
  linkedVehicles: Array<{ id: string; label: string; detail: string; relationship: string }>;
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

export async function getCustomerDashboardReadModel(
  user: AuthenticatedUser | null,
  dependencies: { leadReader?: typeof listRecentCustomerLeads } = {}
): Promise<CustomerDashboardReadModel> {
  const actor = assertAuthenticated(user);
  const leadReader = dependencies.leadReader ?? listRecentCustomerLeads;
  const durableLeads = await leadReader(actor, 5);
  return {
    ...meta(actor),
    source: "HYBRID_READ_MODEL",
    metrics: [{ label: "Total Customers", value: "2,842", trend: "12.5%", tone: "blue" }, { label: "New Leads", value: "168", trend: "8.3%", tone: "green" }, { label: "Open Deals", value: "74", trend: "15.2%", tone: "purple" }, { label: "Appointments", value: "28", trend: "5.7%", tone: "orange" }, { label: "Sales This Month", value: "$487,620", trend: "18.6%", tone: "cyan" }],
    pipeline: [{ label: "New Leads", value: 168, tone: "blue" }, { label: "Contacted", value: 98, tone: "green" }, { label: "Qualified", value: 74, tone: "yellow" }, { label: "Proposal Sent", value: 42, tone: "purple" }, { label: "Won", value: 18, tone: "red" }],
    leadSources: [{ label: "Website", value: 42, tone: "blue" }, { label: "Referral", value: 25, tone: "orange" }, { label: "Facebook", value: 15, tone: "green" }, { label: "Google Ads", value: 10, tone: "red" }, { label: "Walk-In", value: 8, tone: "purple" }],
    recentLeads: durableLeads.map((lead) => ({
      initial: lead.customer.displayName.slice(0, 1).toUpperCase(),
      name: lead.customer.displayName,
      source: lead.sourceCode.replaceAll("_", " "),
      vehicle: lead.vehicleInterest ?? "No vehicle selected",
      date: new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" }),
      status: lead.stage.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (value) => value.toUpperCase())
    })),
    topDeals: [{ customer: "Ahmed H.", vehicle: "2018 Toyota Camry", amount: "$15,500", stage: "Proposal" }, { customer: "Fardowsa A.", vehicle: "2019 Honda Accord", amount: "$18,900", stage: "Proposal" }, { customer: "Mustafa K.", vehicle: "2020 Toyota RAV4", amount: "$22,750", stage: "Qualified" }, { customer: "Ibrahim D.", vehicle: "2017 Nissan Rogue", amount: "$14,800", stage: "Negotiation" }, { customer: "Mohamed A.", vehicle: "2019 Ford Escape", amount: "$13,200", stage: "Qualified" }],
    tasks: [{ title: "Follow up with Ahmed H.", detail: "2018 Toyota Camry", priority: "High" }, { title: "Call Elmi M. about financing", detail: "2019 Honda Accord", priority: "Medium" }, { title: "Confirm appointment", detail: "With Fardowsa A.", priority: "Medium" }, { title: "Send insurance documents", detail: "To Ibrahim D.", priority: "Low" }, { title: "Prepare vehicle for test drive", detail: "2017 RAV4", priority: "Low" }],
    appointments: [{ time: "10:00 AM", customer: "Ahmed H.", detail: "2018 Toyota Camry" }, { time: "1:00 PM", customer: "Fardowsa A.", detail: "Financing Discussion" }, { time: "3:30 PM", customer: "Mustafa K.", detail: "Test Drive" }],
    activity: [{ title: "New lead received", detail: "Abdirahman M. via Website", time: "5m ago" }, { title: "Deal updated", detail: "2019 Nissan Rogue - Won", time: "1h ago" }, { title: "Appointment scheduled", detail: "With Fardowsa A.", time: "2h ago" }, { title: "Customer updated", detail: "Ahmed H. - Contact Info", time: "3h ago" }]
  };
}

export async function getCustomerResolutionReadModel(user: AuthenticatedUser | null, input: { queue?: string | null; query?: string | null; caseId?: string | null; detail?: string | null }, dependencies: { caseReader?: typeof listConcernResolutionPackages; now?: () => Date } = {}): Promise<CustomerResolutionReadModel> {
  const actor = assertAuthenticated(user);
  const queue = (["all", "mine", "unassigned", "overdue", "escalated", "resolved"].includes(input.queue ?? "") ? input.queue : "all") as CustomerResolutionQueue;
  const detail = (["details", "timeline", "customer", "vehicle", "related"].includes(input.detail ?? "") ? input.detail : "details") as CustomerResolutionDetail;
  const query = input.query?.trim().toLowerCase() ?? "";
  const now = dependencies.now?.() ?? new Date();
  const packages = await (dependencies.caseReader ?? listConcernResolutionPackages)(actor);
  const durableCases: CustomerResolutionCase[] = packages.map(({ concern }) => {
    const dueAt = new Date(concern.dueAt); const createdAt = new Date(concern.createdAt);
    const total = Math.max(1, dueAt.getTime() - createdAt.getTime()); const remaining = Math.max(0, dueAt.getTime() - now.getTime());
    const status: CustomerResolutionCase["status"] = concern.status === "CLOSED" ? "Resolved" : concern.status === "ESCALATED" ? "Escalated" : concern.status === "IN_PROGRESS" || concern.status === "READY_FOR_CLOSURE" ? "In Progress" : "Open";
    const priority: CustomerResolutionCase["priority"] = concern.priority === "CRITICAL" || concern.priority === "HIGH" ? "High" : concern.priority === "MEDIUM" ? "Medium" : "Low";
    return { id: concern.concernNumber, initials: concern.customerReference?.split(/\s+/).map((part: string) => part[0]).join("").slice(0, 2).toUpperCase() || "CU", customer: concern.customerReference ?? "Customer", subject: concern.title, category: concern.category, status, priority, owner: concern.owner?.name ?? "", updated: new Date(concern.updatedAt).toLocaleString("en-US", { timeZone: "America/Chicago" }), sla: Math.round((remaining / total) * 100), phone: "Restricted", vehicle: concern.vehicleReference ?? "No linked vehicle" };
  });
  const filtered = durableCases.filter((item) => {
    const queueMatch = queue === "all" || (queue === "mine" && packages.find((itemPackage) => itemPackage.concern.concernNumber === item.id)?.concern.owner?.id === actor.id) || (queue === "unassigned" && !item.owner) || (queue === "overdue" && item.sla === 0 && item.status !== "Resolved") || (queue === "escalated" && item.status === "Escalated") || (queue === "resolved" && item.status === "Resolved");
    return queueMatch && (!query || `${item.customer} ${item.subject} ${item.id} ${item.category}`.toLowerCase().includes(query));
  });
  const selectedCase = filtered.find((item) => item.id === input.caseId) ?? filtered[0] ?? durableCases[0];
  if (!selectedCase) {
    return { ...meta(actor), source: "HYBRID_READ_MODEL", queue, query, selectedCaseId: "", detail,
      metrics: [{ label: "Open Cases", value: "0", trend: "0%", detail: "current", tone: "purple" }, { label: "Due Today", value: "0", trend: "0%", detail: "current", tone: "blue" }, { label: "Overdue", value: "0", trend: "0%", detail: "current", tone: "orange" }, { label: "Resolved This Month", value: "0", trend: "0%", detail: "current", tone: "green" }, { label: "SLA Compliance", value: "100%", trend: "0%", detail: "current", tone: "cyan" }, { label: "Avg. Resolution Time", value: "--", trend: "0", detail: "current", tone: "neutral" }],
      cases: [], selectedCase: null,
      detailPanel: { title: "No customer case selected", summary: "No durable customer cases match this queue.", sections: [] },
      analytics: { byStatus: [], byType: [], averageResolution: "--", compliance: 100 } };
  }
  const selectedPackage = packages.find((item) => item.concern.concernNumber === selectedCase.id);
  const dynamicPanel = detail === "details" ? { title: "Case Details", summary: `Operational facts and SLA context for ${selectedCase.id}.`, sections: [{ title: "Case Information", rows: [{ label: "Type", value: selectedCase.category }, { label: "Priority", value: selectedCase.priority }, { label: "SLA", value: `${selectedCase.sla}% remaining` }] }, { title: "Customer Promises", rows: (selectedPackage?.concern.promises ?? []).map((promise) => ({ label: promise.status, value: `${promise.type} due ${new Date(promise.dueAt).toLocaleString("en-US", { timeZone: "America/Chicago" })}` })) }] } : detailPanels[detail](selectedCase);
  return {
    ...meta(actor), source: "HYBRID_READ_MODEL", queue, query, selectedCaseId: selectedCase.id, detail,
    metrics: [{ label: "Open Cases", value: String(durableCases.filter((item) => item.status !== "Resolved").length), trend: "0%", detail: "current", tone: "purple" }, { label: "Due Today", value: String(durableCases.filter((item) => item.sla > 0 && item.sla <= 25).length), trend: "0%", detail: "current", tone: "blue" }, { label: "Overdue", value: String(durableCases.filter((item) => item.sla === 0 && item.status !== "Resolved").length), trend: "0%", detail: "current", tone: "orange" }, { label: "Resolved This Month", value: String(durableCases.filter((item) => item.status === "Resolved").length), trend: "0%", detail: "current", tone: "green" }, { label: "SLA Compliance", value: `${durableCases.length ? Math.round(100 * durableCases.filter((item) => item.sla > 0 || item.status === "Resolved").length / durableCases.length) : 100}%`, trend: "0%", detail: "current", tone: "cyan" }, { label: "Avg. Resolution Time", value: "--", trend: "0", detail: "current", tone: "neutral" }],
    cases: filtered, selectedCase, detailPanel: dynamicPanel,
    analytics: { byStatus: [...new Set(durableCases.map((item) => item.status))].map((label) => ({ label, value: durableCases.filter((item) => item.status === label).length })), byType: [...new Set(durableCases.map((item) => item.category))].map((label) => ({ label, value: durableCases.filter((item) => item.category === label).length })), averageResolution: "--", compliance: durableCases.length ? Math.round(100 * durableCases.filter((item) => item.sla > 0 || item.status === "Resolved").length / durableCases.length) : 100 }
  };
}
export async function getCustomer360ReadModel(user: AuthenticatedUser | null, input: { tab?: string | null; customerId?: string | null }, dependencies: { repository?: Customer360Repository; organizationId?: string } = {}): Promise<Customer360ReadModel> {
  const actor = assertAuthenticated(user);
  const tab = (["overview", "timeline", "deals", "cases", "appointments", "documents", "vehicles", "communications", "collections", "notes"].includes(input.tab ?? "") ? input.tab : "overview") as Customer360Tab;
  const record = await (dependencies.repository ?? createCustomer360Repository()).findCustomer(dependencies.organizationId ?? INITIAL_ORGANIZATION.id, input.customerId);
  if (!record) throw new Error("Customer not found.");
  const showContact = canViewCustomerContact(actor, record.ownerUserId);
  const date = (value: Date | null | undefined) => value ? value.toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Not scheduled";
  const item = (title: string, detail: string, metaValue: string, status?: string) => ({ title, detail, meta: metaValue, ...(status ? { status } : {}) });
  const panels: Record<Customer360Tab, Customer360ReadModel["panel"]> = {
    overview: { title: "Customer Overview", summary: "Current relationship summary and next operational actions.", items: [
      ...record.tasks.filter((task) => task.status !== "COMPLETED").slice(0, 4).map((task) => item(task.title, `Owned by ${task.assignedUser.name}`, date(task.dueAt), task.status)),
      ...record.concernCases.filter((customerCase) => customerCase.status !== "CLOSED").slice(0, 3).map((customerCase) => item(customerCase.title, customerCase.concernNumber, date(customerCase.dueAt), customerCase.severityBand)),
      ...record.documentRequirements.filter((document) => document.status !== "COMPLETE").slice(0, 3).map((document) => item(document.type, document.sourceType, date(document.dueAt), document.status))
    ] },
    timeline: { title: "Timeline", summary: "Calls, appointments, cases, leads, and documents in chronological order.", items: [
      ...record.interactions.map((interaction) => ({ sort: interaction.occurredAt, value: item(`${interaction.channel} ${interaction.direction}`, interaction.summary, date(interaction.occurredAt), interaction.outcome ?? undefined) })),
      ...record.leads.map((lead) => ({ sort: lead.createdAt, value: item(`Lead ${lead.leadNumber}`, lead.vehicleInterest ?? lead.sourceCode, date(lead.createdAt), lead.stage) })),
      ...record.concernCases.map((customerCase) => ({ sort: customerCase.createdAt, value: item(customerCase.title, customerCase.concernNumber, date(customerCase.createdAt), customerCase.status) })),
      ...record.appointmentParticipants.map(({ appointment }) => ({ sort: appointment.startsAt ?? new Date(0), value: item(appointment.title, appointment.id, date(appointment.startsAt), appointment.bookingStatus) }))
    ].sort((left, right) => right.sort.getTime() - left.sort.getTime()).slice(0, 30).map(({ value }) => value) },
    deals: { title: "Leads and Deals", summary: "Open and historical purchase opportunities connected to this customer.", items: record.leads.map((lead) => item(lead.vehicleInterest ?? "General vehicle interest", `${lead.leadNumber} - ${lead.ownerUser.name}`, date(lead.nextActionAt), lead.stage)) },
    cases: { title: "Cases", summary: "Customer issues, SLA state, ownership, and resolution evidence.", items: record.concernCases.map((customerCase) => item(customerCase.title, `${customerCase.concernNumber} - ${customerCase.assignedOwner?.name ?? "Unassigned"}`, date(customerCase.resolutionDueAt ?? customerCase.dueAt), `${customerCase.status} / ${customerCase.slaStage}`)) },
    appointments: { title: "Appointments", summary: "Upcoming and completed dealership visits.", items: record.appointmentParticipants.map(({ appointment }) => item(appointment.title, appointment.id, date(appointment.startsAt), `${appointment.bookingStatus} / ${appointment.confirmationStatus}`)) },
    documents: { title: "Documents", summary: "Requirements, received evidence, and missing customer documents.", items: record.documentRequirements.map((document) => item(document.type, `${document.sourceType}${document.sourceId ? ` - ${document.sourceId}` : ""}`, date(document.dueAt), document.status)) },
    vehicles: { title: "Vehicles", summary: "Interested, purchased, traded, and serviced vehicle relationships.", items: record.vehicleRelationships.map((relationship) => item([relationship.vehicle.year, relationship.vehicle.make, relationship.vehicle.model].filter(Boolean).join(" ") || relationship.vehicle.vehicleNumber, showContact ? `VIN ${relationship.vehicle.vin ?? "not recorded"} - Stock ${relationship.vehicle.stockNumber ?? "not recorded"}` : `Vehicle ${relationship.vehicle.vehicleNumber}`, date(relationship.effectiveFrom), relationship.relationshipType)) },
    communications: { title: "Communications", summary: "Channel preferences, consent, and recent outreach outcomes.", items: [
      ...record.contactPoints.map((point) => item(point.type, showContact ? point.value : "Restricted", point.isPrimary ? "Primary" : "Alternate", point.consentStatus)),
      ...record.interactions.map((interaction) => item(interaction.summary, `${interaction.channel} ${interaction.direction}`, date(interaction.occurredAt), interaction.outcome ?? undefined))
    ] },
    collections: { title: "Collections", summary: "Policy-filtered account signals requiring customer follow-up.", items: [] },
    notes: { title: "Notes", summary: "Internal customer context with author and timestamp evidence.", items: record.notes.map((note) => item(note.body, note.authorUser.name, date(note.createdAt), note.visibility)) }
  };
  const openCases = record.concernCases.filter((customerCase) => customerCase.status !== "CLOSED");
  const latestDecision = record.crmDecisionRecords.find((decision) => decision.recommendedActionCode);
  return { ...meta(actor), source: "HYBRID_READ_MODEL", customer: { id: record.id, name: record.displayName, phone: showContact ? record.phoneNumber ?? "Not recorded" : "Restricted", email: showContact ? record.email ?? "Not recorded" : "Restricted", address: showContact ? record.address ?? "Not recorded" : "Restricted", owner: record.ownerUser?.name ?? "Unassigned", status: record.status, since: date(record.createdAt), lifetimeValue: "Not calculated" }, summary: { openLeads: record.leads.filter((lead) => lead.stage !== "WON" && lead.stage !== "LOST").length, openCases: openCases.length, upcomingAppointments: record.appointmentParticipants.filter(({ appointment }) => appointment.startsAt && appointment.startsAt > new Date() && appointment.bookingStatus !== "CANCELLED").length, openTasks: record.tasks.filter((task) => task.status !== "COMPLETED").length, missingDocuments: record.documentRequirements.filter((document) => document.status !== "COMPLETE").length, highestLeadScore: record.leads.length ? Math.max(...record.leads.map((lead) => lead.score)) : null, slaRisk: openCases.some((customerCase) => customerCase.slaStage === "BREACHED" || customerCase.slaStage === "REPEATED_BREACH") ? "High" : openCases.some((customerCase) => customerCase.slaStage === "AT_RISK" || customerCase.slaStage === "WATCH") ? "Medium" : "Low" }, nextBestAction: latestDecision ? { title: latestDecision.recommendedActionCode!.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (value) => value.toUpperCase()), explanation: latestDecision.explanation, target: latestDecision.subjectType === "CASE" ? "/customers/resolutions" : "/customers" } : null, linkedVehicles: record.vehicleRelationships.map((relationship) => ({ id: relationship.vehicle.id, label: [relationship.vehicle.year, relationship.vehicle.make, relationship.vehicle.model].filter(Boolean).join(" ") || relationship.vehicle.vehicleNumber, detail: showContact ? `VIN: ${relationship.vehicle.vin ?? "Not recorded"}` : `Vehicle: ${relationship.vehicle.vehicleNumber}`, relationship: relationship.relationshipType })), tab, panel: panels[tab] };
}
