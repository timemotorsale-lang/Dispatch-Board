export type CrmSourceTruthStatus = "Live" | "Read-only" | "Preview" | "Not wired" | "Hidden";

export type CrmSourceTruthEntry = {
  id: string;
  label: string;
  owner: string;
  status: CrmSourceTruthStatus;
  source: string;
  staffMessage: string;
};

export const CRM_ACTION_SOURCE_TRUTH = [
  {
    id: "log-call",
    label: "Phone Call",
    owner: "Communications provider",
    source: "Customer interactions",
    staffMessage: "Phone calling is not wired yet. Staff should not see a fake call workflow.",
    status: "Not wired"
  },
  {
    id: "send-text",
    label: "Send SMS",
    owner: "Communications provider",
    source: "Customer messaging",
    staffMessage: "SMS is not wired yet. Staff should get a clear not-wired state.",
    status: "Not wired"
  },
  {
    id: "send-email",
    label: "Send Email",
    owner: "Email provider",
    source: "Customer email",
    staffMessage: "Email is not wired yet. Staff should get a clear not-wired state.",
    status: "Not wired"
  },
  {
    id: "schedule-appointment",
    label: "Schedule Appointment",
    owner: "Appointment Console",
    source: "Appointments",
    staffMessage: "Appointments open the appointment console with customer context.",
    status: "Live"
  },
  {
    id: "new-task",
    label: "CRM Task",
    owner: "Customer task bridge",
    source: "CRM customer task list and staff queue",
    staffMessage: "CRM tasks save to the customer record and staff task queue.",
    status: "Live"
  },
  {
    id: "add-note",
    label: "Add Note",
    owner: "Customer notes",
    source: "Customer notes and timeline",
    staffMessage: "Notes save to the customer CRM timeline.",
    status: "Live"
  },
  {
    id: "new-case",
    label: "New Case",
    owner: "Concern resolution engine",
    source: "Customer cases, reminders, escalation, and generated tasks",
    staffMessage: "Cases create a governed customer concern package when the user is authorized.",
    status: "Live"
  },
  {
    id: "upload-document",
    label: "Upload Doc",
    owner: "Document storage",
    source: "Customer documents",
    staffMessage: "Document storage is not wired yet.",
    status: "Not wired"
  },
  {
    id: "disposition",
    label: "Disposition",
    owner: "CRM outcome engine",
    source: "Customer next action and timeline",
    staffMessage: "Disposition is still a preview workflow until outcome write-back is approved.",
    status: "Preview"
  }
] as const satisfies readonly CrmSourceTruthEntry[];

export const CRM_DASHBOARD_SOURCE_TRUTH = [
  {
    id: "total-customers",
    label: "Total Customers",
    owner: "Customers",
    source: "Customer records",
    staffMessage: "Measured from authorized live customer records.",
    status: "Live"
  },
  {
    id: "new-leads",
    label: "New Leads",
    owner: "Customers",
    source: "Durable customer lead records",
    staffMessage: "Measured from recent live lead records.",
    status: "Live"
  },
  {
    id: "open-deals",
    label: "Open Deals",
    owner: "Sales",
    source: "Durable lead/opportunity records",
    staffMessage: "Open deal counts are measured from active customer lead and opportunity stages.",
    status: "Live"
  },
  {
    id: "appointments",
    label: "Appointments",
    owner: "Appointment Console",
    source: "Appointments",
    staffMessage: "Appointment counts and today rail come from the live appointment console reader.",
    status: "Live"
  },
  {
    id: "sales-this-month",
    label: "Sales This Month",
    owner: "Sales",
    source: "Won lead records in the recent customer window",
    staffMessage: "Monthly sales visibility is source-limited until completed-sale accounting is connected.",
    status: "Read-only"
  },
  {
    id: "recent-leads",
    label: "Recent Leads",
    owner: "Customers",
    source: "Durable leads and customer updates",
    staffMessage: "Recent lead rows are source-backed.",
    status: "Live"
  },
  {
    id: "recent-activity",
    label: "Recent Activity",
    owner: "Customers",
    source: "Durable leads and customer updates",
    staffMessage: "Activity rows only show source-backed customer or lead updates.",
    status: "Live"
  },
  {
    id: "top-deals",
    label: "Top Deals",
    owner: "Sales",
    source: "Durable lead/opportunity records",
    staffMessage: "Top deal rows show active customer lead opportunities; amounts stay empty unless a trusted amount source exists.",
    status: "Read-only"
  },
  {
    id: "my-tasks",
    label: "My Tasks",
    owner: "Tasks",
    source: "Staff task queue",
    staffMessage: "The customer console task rail is hidden until it reads the staff task queue directly.",
    status: "Not wired"
  }
] as const satisfies readonly CrmSourceTruthEntry[];

export function crmActionSourceTruth(id: string): CrmSourceTruthEntry {
  return CRM_ACTION_SOURCE_TRUTH.find((entry) => entry.id === id) ??
    { id, label: id, owner: "Customer Console", source: "Unknown", staffMessage: "This customer action has no source-of-truth registry entry.", status: "Hidden" };
}

export function crmDashboardSourceTruth(id: string): CrmSourceTruthEntry {
  return CRM_DASHBOARD_SOURCE_TRUTH.find((entry) => entry.id === id) ??
    { id, label: id, owner: "Customer Console", source: "Unknown", staffMessage: "This dashboard section has no source-of-truth registry entry.", status: "Hidden" };
}
