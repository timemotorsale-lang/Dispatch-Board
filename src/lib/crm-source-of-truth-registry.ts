export type CrmSourceTruthStatus = "Live" | "Read-only" | "Preview" | "Not wired" | "Hidden";
export type CrmLifecycleStage = "CUSTOMER" | "PROSPECT" | "LEAD" | "QUALIFIED_OPPORTUNITY" | "SOLD" | "LOST";

export type CrmLifecycleDefinition = {
  stage: CrmLifecycleStage;
  label: string;
  definition: string;
  entersWhen: string;
  countedBy: string;
};

export type CrmLifecycleScope = {
  counts: CrmLifecycleStage[];
  excludes?: CrmLifecycleStage[];
  rule: string;
};

export type CrmSourceTruthEntry = {
  id: string;
  label: string;
  owner: string;
  status: CrmSourceTruthStatus;
  source: string;
  staffMessage: string;
  lifecycleScope?: CrmLifecycleScope;
};

export const CRM_LIFECYCLE_DICTIONARY = [
  {
    stage: "CUSTOMER",
    label: "Customer",
    definition: "The durable identity record for a person or business.",
    entersWhen: "A customer/prospect intake record is saved or an existing customer record is linked.",
    countedBy: "Customer record counts, customer search, Customer 360, and customer activity."
  },
  {
    stage: "PROSPECT",
    label: "Prospect",
    definition: "A customer record with possible buying intent, before a qualified sales lead is confirmed.",
    entersWhen: "Staff captures a walk-in, referral, phone/web inquiry, or manual prospect without confirmed lead qualification.",
    countedBy: "Prospect/intake views, not deal or sale totals."
  },
  {
    stage: "LEAD",
    label: "Lead",
    definition: "A customer or prospect with a sales signal that needs follow-up, but is not yet a qualified deal.",
    entersWhen: "The record has a lead source, owner or queue, next action, and an early lead stage.",
    countedBy: "New Leads, Recent Leads, lead source reporting, and lead follow-up queues."
  },
  {
    stage: "QUALIFIED_OPPORTUNITY",
    label: "Qualified Opportunity / Deal",
    definition: "A lead that has qualified buying intent and has moved into appointment, on-site, proposal, negotiation, or working-deal activity.",
    entersWhen: "Staff qualifies the customer need or begins deal work such as appointment set, on-site, proposal, working deal, or negotiation.",
    countedBy: "Open Deals, Top Deals, pipeline, forecast, and deal work queues."
  },
  {
    stage: "SOLD",
    label: "Sold",
    definition: "A won opportunity with accepted outcome evidence.",
    entersWhen: "The lead/opportunity is closed won or is linked to a trusted completed-sale record.",
    countedBy: "Sales This Month, sold counts, conversion reporting, and completed-sale reporting."
  },
  {
    stage: "LOST",
    label: "Lost",
    definition: "A closed opportunity that did not convert.",
    entersWhen: "Staff closes the lead/opportunity lost with an outcome reason.",
    countedBy: "Lost counts, conversion reporting, and follow-up learning reports."
  }
] as const satisfies readonly CrmLifecycleDefinition[];

export const CRM_CUSTOMER_LEAD_STAGE_LIFECYCLE = {
  NEW: "LEAD",
  CONTACT_ATTEMPTED: "LEAD",
  ENGAGED: "LEAD",
  NURTURE: "LEAD",
  APPOINTMENT_SET: "QUALIFIED_OPPORTUNITY",
  ON_SITE: "QUALIFIED_OPPORTUNITY",
  QUALIFIED: "QUALIFIED_OPPORTUNITY",
  NEGOTIATION: "QUALIFIED_OPPORTUNITY",
  WON: "SOLD",
  LOST: "LOST"
} as const satisfies Record<string, CrmLifecycleStage>;

export function crmLifecycleDefinition(stage: CrmLifecycleStage): CrmLifecycleDefinition {
  return CRM_LIFECYCLE_DICTIONARY.find((entry) => entry.stage === stage)!;
}

export function crmLifecycleStageForCustomerLeadStage(stage: string): CrmLifecycleStage {
  return CRM_CUSTOMER_LEAD_STAGE_LIFECYCLE[stage.toUpperCase() as keyof typeof CRM_CUSTOMER_LEAD_STAGE_LIFECYCLE] ?? "LEAD";
}

export function isCustomerLeadStageInLifecycle(stage: string, lifecycleStages: readonly CrmLifecycleStage[]) {
  return lifecycleStages.includes(crmLifecycleStageForCustomerLeadStage(stage));
}

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
    lifecycleScope: {
      counts: ["CUSTOMER"],
      rule: "Count authorized durable customer identity records once per customer."
    },
    status: "Live"
  },
  {
    id: "new-leads",
    label: "New Leads",
    owner: "Customers",
    source: "Durable customer lead records",
    staffMessage: "Measured from recent live lead records that have not yet become deals or terminal outcomes.",
    lifecycleScope: {
      counts: ["LEAD"],
      excludes: ["QUALIFIED_OPPORTUNITY", "SOLD", "LOST"],
      rule: "Count only early lead stages: NEW, CONTACT_ATTEMPTED, ENGAGED, and NURTURE."
    },
    status: "Live"
  },
  {
    id: "open-deals",
    label: "Open Deals",
    owner: "Sales",
    source: "Durable lead/opportunity records",
    staffMessage: "Open deal counts are measured from active customer lead and opportunity stages.",
    lifecycleScope: {
      counts: ["QUALIFIED_OPPORTUNITY"],
      excludes: ["LEAD", "SOLD", "LOST"],
      rule: "Count only qualified/open opportunity stages: APPOINTMENT_SET, ON_SITE, QUALIFIED, and NEGOTIATION."
    },
    status: "Live"
  },
  {
    id: "appointments",
    label: "Appointments",
    owner: "Appointment Console",
    source: "Appointments",
    staffMessage: "Appointment counts and today rail come from the live appointment console reader.",
    lifecycleScope: {
      counts: ["CUSTOMER", "PROSPECT", "LEAD", "QUALIFIED_OPPORTUNITY"],
      rule: "Count live appointment records by schedule window, not by sales lifecycle stage."
    },
    status: "Live"
  },
  {
    id: "sales-this-month",
    label: "Sales This Month",
    owner: "Sales",
    source: "Won lead records in the recent customer window",
    staffMessage: "Monthly sales visibility is source-limited until completed-sale accounting is connected.",
    lifecycleScope: {
      counts: ["SOLD"],
      excludes: ["LEAD", "QUALIFIED_OPPORTUNITY", "LOST"],
      rule: "Count only WON lead records in the current month until completed-sale accounting is connected."
    },
    status: "Read-only"
  },
  {
    id: "recent-leads",
    label: "Recent Leads",
    owner: "Customers",
    source: "Durable leads and customer updates",
    staffMessage: "Recent lead rows are source-backed.",
    lifecycleScope: {
      counts: ["LEAD", "QUALIFIED_OPPORTUNITY", "SOLD", "LOST"],
      rule: "Show recent durable lead records across lifecycle stages; do not use this as a deal or sale total."
    },
    status: "Live"
  },
  {
    id: "recent-activity",
    label: "Recent Activity",
    owner: "Customers",
    source: "Durable leads and customer updates",
    staffMessage: "Activity rows only show source-backed customer or lead updates.",
    lifecycleScope: {
      counts: ["CUSTOMER", "LEAD", "QUALIFIED_OPPORTUNITY", "SOLD", "LOST"],
      rule: "Show source-backed activity events only; never create fabricated lifecycle activity."
    },
    status: "Live"
  },
  {
    id: "top-deals",
    label: "Top Deals",
    owner: "Sales",
    source: "Durable lead/opportunity records",
    staffMessage: "Top deal rows show active customer lead opportunities; amounts stay empty unless a trusted amount source exists.",
    lifecycleScope: {
      counts: ["QUALIFIED_OPPORTUNITY"],
      excludes: ["LEAD", "SOLD", "LOST"],
      rule: "Show only qualified/open opportunity stages; amounts require a trusted amount source."
    },
    status: "Read-only"
  },
  {
    id: "my-tasks",
    label: "My Tasks",
    owner: "Tasks",
    source: "Staff task queue",
    staffMessage: "The customer console task rail is hidden until it reads the staff task queue directly.",
    lifecycleScope: {
      counts: ["CUSTOMER", "PROSPECT", "LEAD", "QUALIFIED_OPPORTUNITY"],
      rule: "Count staff-owned CRM tasks when the staff task queue source is connected."
    },
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
