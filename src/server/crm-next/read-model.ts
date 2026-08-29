import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveCrmNextAccess } from "@/server/crm-next/access";

export type CrmNextAttentionLevel = "High" | "Medium" | "Low";

export type CrmNextAttentionItem = {
  id: string;
  customerId: string;
  customerName: string;
  reason: string;
  age: string;
  area: "Sales" | "Finance" | "Service" | "Support";
  owner: string;
  level: CrmNextAttentionLevel;
  nextAction: string;
  workHref: string;
  customerHref: string;
};

export type CrmNextCustomer360 = {
  id: string;
  name: string;
  status: "Active";
  phone: string;
  email: string;
  address: string;
  customerSince: string;
  lifetimeValue: string;
  vehiclesOwned: number;
  openDeals: number;
  openCases: number;
  riskLevel: CrmNextAttentionLevel;
  nextAction: string;
  vehicles: Array<{ id: string; label: string; vin: string; status: string }>;
  glance: Array<{ label: string; value: string; href: string }>;
  communications: Array<{ id: string; channel: "Phone" | "Text" | "Email" | "Appointment"; detail: string; occurredAt: string }>;
};

export type CrmNextCommandCenter = {
  contractVersion: "crm-next-command-center/v1";
  generatedAt: string;
  userName: string;
  mode: "REVIEW";
  summary: Array<{ label: string; value: string; trend: string; tone: "blue" | "green" | "red" }>;
  attention: CrmNextAttentionItem[];
  pipeline: Array<{ label: string; value: number }>;
  revenue: { monthToDate: string; trend: string };
  nextActions: Array<{ id: string; label: string; detail: string; impact: CrmNextAttentionLevel; href: string }>;
  customers: CrmNextCustomer360[];
  bridge: {
    liveTaskCreationEnabled: false;
    previewEnabled: true;
    message: string;
  };
};

const attentionItems: CrmNextAttentionItem[] = [
  {
    id: "attn-michael-overdue-follow-up",
    customerId: "michael-johnson",
    customerName: "Michael Johnson",
    reason: "Overdue follow-up",
    age: "2h",
    area: "Sales",
    owner: "John Smith",
    level: "High",
    nextAction: "Call Michael Johnson",
    workHref: "/crm-next/work/attn-michael-overdue-follow-up",
    customerHref: "/crm-next/customers/michael-johnson"
  },
  {
    id: "attn-sarah-payment",
    customerId: "sarah-williams",
    customerName: "Sarah Williams",
    reason: "Payment overdue",
    age: "4h",
    area: "Finance",
    owner: "Lisa Jones",
    level: "High",
    nextAction: "Send payment reminder",
    workHref: "/crm-next/work/attn-sarah-payment",
    customerHref: "/crm-next/customers/sarah-williams"
  },
  {
    id: "attn-david-title",
    customerId: "david-brown",
    customerName: "David Brown",
    reason: "Title pending",
    age: "1d",
    area: "Sales",
    owner: "Mark Davis",
    level: "Medium",
    nextAction: "Review title status",
    workHref: "/crm-next/work/attn-david-title",
    customerHref: "/crm-next/customers/david-brown"
  },
  {
    id: "attn-jessica-service",
    customerId: "jessica-davis",
    customerName: "Jessica Davis",
    reason: "Service due",
    age: "1d",
    area: "Service",
    owner: "Tom Wilson",
    level: "Medium",
    nextAction: "Schedule service",
    workHref: "/crm-next/work/attn-jessica-service",
    customerHref: "/crm-next/customers/jessica-davis"
  },
  {
    id: "attn-robert-insurance",
    customerId: "robert-miller",
    customerName: "Robert Miller",
    reason: "Insurance claim update",
    age: "2d",
    area: "Support",
    owner: "John Smith",
    level: "Low",
    nextAction: "Send insurance follow-up",
    workHref: "/crm-next/work/attn-robert-insurance",
    customerHref: "/crm-next/customers/robert-miller"
  }
];

const customers: CrmNextCustomer360[] = [
  {
    id: "michael-johnson",
    name: "Michael Johnson",
    status: "Active",
    phone: "(817) 555-0198",
    email: "michael.johnson@email.com",
    address: "1234 Maple St, Fort Worth, TX 76107",
    customerSince: "Jan 15, 2022",
    lifetimeValue: "$38,650",
    vehiclesOwned: 2,
    openDeals: 1,
    openCases: 2,
    riskLevel: "Medium",
    nextAction: "Call Michael about overdue follow-up.",
    vehicles: [
      { id: "veh-rav4", label: "2021 Toyota RAV4 XLE", vin: "2T3P1RFV0LW123456", status: "Owned" },
      { id: "veh-f150", label: "2018 Ford F-150 XLT", vin: "1FTEW1CPXJKD12345", status: "Owned" }
    ],
    glance: [
      { label: "Next appointment", value: "May 16, 2025 · 10:00 AM", href: "/appointments" },
      { label: "Next payment due", value: "May 20, 2025 · $487.32", href: "/crm-next#finance-held" },
      { label: "Current opportunity", value: "Vehicle upgrade", href: "/crm-next#pipeline" }
    ],
    communications: [
      { id: "comm-phone-1", channel: "Phone", detail: "Spoke with customer about title status.", occurredAt: "May 12, 2025" },
      { id: "comm-text-1", channel: "Text", detail: "Sent payment reminder.", occurredAt: "May 10, 2025" },
      { id: "comm-email-1", channel: "Email", detail: "Sent insurance documents.", occurredAt: "May 8, 2025" },
      { id: "comm-appt-1", channel: "Appointment", detail: "Test drove 2021 Toyota RAV4.", occurredAt: "May 2, 2025" }
    ]
  }
];

export function getCrmNextCommandCenter(actor: AuthenticatedUser | null, now: Date = new Date()): CrmNextCommandCenter {
  const access = resolveCrmNextAccess(actor);
  if (!access.allowed) {
    throw Object.assign(new Error("CRM Next is not enabled for this user."), { code: access.reason });
  }

  return {
    contractVersion: "crm-next-command-center/v1",
    generatedAt: now.toISOString(),
    userName: actor?.name ?? "CRM user",
    mode: "REVIEW",
    summary: [
      { label: "Needs Attention", value: "48", trend: "12 from yesterday", tone: "blue" },
      { label: "Hot Leads", value: "26", trend: "8 from yesterday", tone: "red" },
      { label: "Appointments Today", value: "12", trend: "3 from yesterday", tone: "green" },
      { label: "Deals in Progress", value: "37", trend: "5 from yesterday", tone: "green" },
      { label: "Overdue Follow-ups", value: "19", trend: "4 from yesterday", tone: "red" }
    ],
    attention: attentionItems,
    pipeline: [
      { label: "Leads", value: 76 },
      { label: "Contacted", value: 42 },
      { label: "Qualified", value: 24 },
      { label: "Proposal", value: 15 },
      { label: "Negotiation", value: 10 },
      { label: "Won", value: 7 }
    ],
    revenue: { monthToDate: "$1,245,800", trend: "18% vs last month" },
    nextActions: [
      { id: "nba-call-michael", label: "Call Michael Johnson", detail: "Overdue follow-up. High conversion likelihood.", impact: "High", href: "/crm-next/work/attn-michael-overdue-follow-up" },
      { id: "nba-payment-sarah", label: "Send payment reminder to Sarah Williams", detail: "Payment due in 5 days.", impact: "High", href: "/crm-next/work/attn-sarah-payment" },
      { id: "nba-test-drive-david", label: "Schedule test drive with David Brown", detail: "Interested in 2021 Toyota RAV4.", impact: "Medium", href: "/crm-next/work/attn-david-title" }
    ],
    customers,
    bridge: {
      liveTaskCreationEnabled: false,
      previewEnabled: true,
      message: "Action-to-task dispatch bridge is in review mode. No Dispatch Board task is created yet."
    }
  };
}

export function getCrmNextCustomer360(actor: AuthenticatedUser | null, customerId: string) {
  const model = getCrmNextCommandCenter(actor);
  return model.customers.find((customer) => customer.id === customerId) ?? model.customers[0];
}

export function getCrmNextAttentionItem(actor: AuthenticatedUser | null, itemId: string) {
  const model = getCrmNextCommandCenter(actor);
  return model.attention.find((item) => item.id === itemId) ?? model.attention[0];
}

