export const UNIFIED_CRM_REVIEW_NOTICE =
  "Experience review — synthetic scenarios only. No customer, opportunity, communication, or task records are changed.";

export const unifiedCrmViews = [
  "home",
  "work",
  "customers",
  "pipeline",
  "conversations",
  "insights",
  "more"
] as const;

export type UnifiedCrmView = (typeof unifiedCrmViews)[number];

export type ReviewQueueItem = {
  id: string;
  customer: string;
  account: string;
  due: string;
  dueTone: "now" | "today" | "waiting";
  reason: string;
  nextAction: string;
  owner: string;
  stage: string;
  sourceLabel: string;
  sourceHref: string;
  sourceFreshness: string;
  history: string[];
};

export const reviewQueueItems: ReviewQueueItem[] = [
  {
    id: "review-alex-morgan",
    customer: "Alex Morgan",
    account: "Morgan Home Services",
    due: "Due now",
    dueTone: "now",
    reason: "A promised follow-up is due before today’s 11:30 appointment.",
    nextAction: "Review customer context",
    owner: "You",
    stage: "Appointment set",
    sourceLabel: "Customers",
    sourceHref: "/customers?returnTo=%2Fcrm",
    sourceFreshness: "Review scenario · source pattern: Customers",
    history: ["Appointment scheduled", "Vehicle interest recorded", "Follow-up promised"]
  },
  {
    id: "review-jordan-lee",
    customer: "Jordan Lee",
    account: "Lee Property Group",
    due: "10:45 AM",
    dueTone: "today",
    reason: "A sales task is due today and the next action has not been renewed.",
    nextAction: "Open sales task queue",
    owner: "You",
    stage: "Needs follow-up",
    sourceLabel: "Tasks",
    sourceHref: "/tasks?department=SALES&returnTo=%2Fcrm",
    sourceFreshness: "Review scenario · source pattern: Tasks",
    history: ["Task assigned", "Customer note added", "Next action due today"]
  },
  {
    id: "review-sam-rivera",
    customer: "Sam Rivera",
    account: "Rivera Delivery LLC",
    due: "1:15 PM",
    dueTone: "today",
    reason: "The appointment needs confirmation and the customer requested a concise update.",
    nextAction: "Open appointment board",
    owner: "Taylor B.",
    stage: "Awaiting confirmation",
    sourceLabel: "Appointments",
    sourceHref: "/appointments?returnTo=%2Fcrm",
    sourceFreshness: "Review scenario · source pattern: Appointments",
    history: ["Appointment requested", "Preferred contact noted", "Confirmation pending"]
  },
  {
    id: "review-casey-brooks",
    customer: "Casey Brooks",
    account: "Brooks Landscaping",
    due: "Waiting",
    dueTone: "waiting",
    reason: "A source-owned customer case is visible for context but remains read-only in CRM.",
    nextAction: "Review customer source",
    owner: "Customer Care",
    stage: "Waiting on customer",
    sourceLabel: "Customers",
    sourceHref: "/customers/resolutions?returnTo=%2Fcrm",
    sourceFreshness: "Review scenario · source pattern: Customer cases",
    history: ["Case opened in Customers", "Response recorded", "Waiting state set"]
  }
];

export const reviewAppointments = [
  { time: "11:30", customer: "Alex Morgan", detail: "Sales appointment · confirmation ready" },
  { time: "1:15", customer: "Sam Rivera", detail: "Follow-up · confirmation pending" },
  { time: "3:00", customer: "Jamie Chen", detail: "Customer care review" }
] as const;

export const reviewPipeline = [
  { label: "Discovery", count: 4, value: "$42K" },
  { label: "Appointment", count: 3, value: "$58K" },
  { label: "Quote review", count: 2, value: "$37K" },
  { label: "Decision", count: 1, value: "$21K" }
] as const;

export const reviewConversations = [
  { customer: "Alex Morgan", channel: "Call", outcome: "Follow-up promised", when: "Yesterday, 4:20 PM" },
  { customer: "Sam Rivera", channel: "Meeting", outcome: "Appointment requested", when: "Yesterday, 2:05 PM" },
  { customer: "Jordan Lee", channel: "Note", outcome: "Decision context recorded", when: "Monday, 10:12 AM" }
] as const;

export const reviewSourceActions = [
  {
    label: "Start a task",
    description: "Use the existing governed Task Intake workflow.",
    href: "/tasks/intake?returnTo=%2Fcrm"
  },
  {
    label: "Open appointments",
    description: "Schedule or review work in the source appointment console.",
    href: "/appointments?returnTo=%2Fcrm"
  },
  {
    label: "Find a customer",
    description: "Use the existing customer source while CRM remains in review.",
    href: "/customers?returnTo=%2Fcrm"
  }
] as const;

export function parseUnifiedCrmView(value: string | string[] | undefined): UnifiedCrmView {
  const candidate = Array.isArray(value) ? value[0] : value;
  return unifiedCrmViews.includes(candidate as UnifiedCrmView)
    ? (candidate as UnifiedCrmView)
    : "home";
}
