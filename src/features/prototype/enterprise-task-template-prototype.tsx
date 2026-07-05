"use client";

import Image from "next/image";
import {
  BadgeCheck,
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CircleAlert,
  CircleHelp,
  Clock3,
  Info,
  Expand,
  FileText,
  FolderKanban,
  LayoutGrid,
  List,
  MoreHorizontal,
  MessageSquareText,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  X
} from "lucide-react";
import { useState } from "react";

type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "Blocked"
  | "Waiting on Parts"
  | "Waiting on Approval"
  | "Ready for Review"
  | "Completed";
type TaskPriority = "High" | "Normal";
type InspectorTab = "Overview" | "Update Form" | "Checklist" | "Activity" | "Manager";
type WorkspaceTab =
  | "Overview"
  | "Updates"
  | "Checklist"
  | "Subtasks"
  | "Files / Images"
  | "Dependencies"
  | "Activity"
  | "Manager";
type TaskFilter = "All" | "Open" | "Due Soon" | "Blocked" | "Waiting" | "Ready for Review" | "Completed";
type TaskListDisplay = "cards" | "list";
type MockupNavItem = {
  active?: boolean;
  label: string;
};
type SlaSignal = {
  escalation: string;
  level: "healthy" | "watch" | "risk";
  nextCheckpoint: string;
  status: string;
};

type SampleTask = {
  activity: string[];
  assignedTo: string;
  blockerRules: string[];
  brief: string;
  checklist: string[];
  completionCriteria: string[];
  dependencies: string[];
  dueTime: string;
  expectedOutcome: string;
  files: string[];
  formDefaults: Record<string, string>;
  futureModules: string[];
  id: string;
  kpiImpact: string[];
  managerActions: string[];
  managerNotes: string[];
  missingFields: string[];
  primaryAction: string;
  priority: TaskPriority;
  relatedTasks: string[];
  requiresManagerReview: boolean;
  role: string;
  sourceTemplate: string;
  status: TaskStatus;
  subtasks: string[];
  title: string;
  updateFields: string[];
  updates: string[];
  vehicleOrCustomer: string;
  whatIsExpected: string;
  whyThisMatters?: string;
  workflow: string;
};

const inspectorTabs: InspectorTab[] = ["Overview", "Update Form", "Checklist", "Activity", "Manager"];
const workspaceTabs: WorkspaceTab[] = [
  "Overview",
  "Updates",
  "Checklist",
  "Subtasks",
  "Files / Images",
  "Dependencies",
  "Activity",
  "Manager"
];
const listFilters: TaskFilter[] = ["All", "Open", "Due Soon", "Blocked", "Waiting", "Ready for Review", "Completed"];
const mockupNavItems: MockupNavItem[] = [
  { label: "My Tasks", active: true },
  { label: "Board" },
  { label: "Calendar" },
  { label: "Activity Feed" },
  { label: "Templates" },
  { label: "Reports" },
  { label: "Team" },
  { label: "Settings" }
];

const sampleTasks: SampleTask[] = [
  {
    id: "repair-update",
    title: "Complete Assigned Vehicle Diagnostic / Repair Update",
    brief: "Document diagnostic findings, repair progress, parts needs, waiting reasons, QC readiness, and next step.",
    assignedTo: "Walter",
    role: "Mechanic",
    workflow: "Mechanic / Service",
    priority: "High",
    dueTime: "Due 4:30 PM",
    status: "In Progress",
    sourceTemplate: "Mechanic Daily Repair Update",
    requiresManagerReview: true,
    vehicleOrCustomer: "Vehicle: 2014 Acura MDX",
    missingFields: ["Diagnostic finding", "ETA", "Mechanic note"],
    primaryAction: "Update Repair",
    whatIsExpected:
      "Inspect, diagnose, repair, or update the assigned vehicle and leave a complete end-of-day repair record that the manager can trust without chasing more context.",
    whyThisMatters:
      "The manager needs to know whether the vehicle is moving toward completion, waiting on parts, waiting on approval, blocked, or ready for QC.",
    expectedOutcome:
      "The vehicle has a clear current repair status, next step, ETA, and QC readiness signal so service throughput stays visible.",
    updateFields: [
      "Vehicle year / make / model",
      "Stock number or VIN",
      "Customer-owned or inventory-owned",
      "Complaint / issue",
      "Diagnostic finding",
      "Repair performed today",
      "Parts needed",
      "Waiting reason",
      "Estimated completion time",
      "Ready for QC",
      "Mechanic note"
    ],
    checklist: [
      "Confirm assigned vehicle and concern",
      "Inspect or diagnose issue",
      "Document findings clearly",
      "Perform approved repair work",
      "Identify parts or approval needed",
      "Mark waiting status if work cannot continue",
      "Mark ready for QC when complete",
      "Add final repair note before completion"
    ],
    completionCriteria: [
      "Vehicle has been inspected or worked on",
      "Findings or repair progress are documented",
      "Parts, waiting, or approval issues are logged",
      "Next step is entered",
      "Vehicle is marked In Progress, Waiting, Ready for QC, or Completed"
    ],
    blockerRules: [
      "Use Blocked when the technician cannot move without a decision, missing asset, or unavailable vehicle.",
      "Use Waiting on Parts when parts have been identified and ordered or confirmed outstanding.",
      "Escalate to manager when approval or outside-shop coordination is needed before the next wrench turn."
    ],
    activity: [
      "Walter updated repair status for 2014 Acura MDX.",
      "Walter marked Acura MDX as waiting on A/C compressor.",
      "Walter added mechanic note and ETA.",
      "Brock requested QC timing once the compressor arrives."
    ],
    managerActions: [
      "Reassign task",
      "Change due time",
      "Approve completion",
      "Send back to In Progress",
      "Add directive",
      "Escalate to parts coordination"
    ],
    dependencies: [
      "Waiting on parts arrival",
      "Waiting on manager approval for added labor",
      "Blocks listing completion until repair closes"
    ],
    subtasks: [
      "Confirm vehicle concern",
      "Diagnose issue",
      "Order needed parts",
      "Complete repair",
      "QC test drive",
      "Mark ready for manager review"
    ],
    files: ["Add repair photo", "Add invoice", "Add inspection image", "Add proof of repair", "Add supporting document"],
    updates: [
      "Compressor confirmed failed. No additional leak found at this stage.",
      "Vehicle is drivable within lot but not ready for customer delivery.",
      "If part lands by noon tomorrow, QC can happen same day."
    ],
    managerNotes: [
      "Manager note: confirm ETA with parts desk before 10:00 AM tomorrow.",
      "Manager note: if compressor slips again, escalate to outside vendor option."
    ],
    relatedTasks: ["Submit Service Production Update", "Review Blocked Tasks", "Confirm Listings Complete"],
    futureModules: ["Audit trail", "Automations", "Messages", "KPI impact"],
    kpiImpact: ["Recon throughput risk", "Ready-for-sale delay", "Manager review required before close"],
    formDefaults: {
      "Vehicle year / make / model": "2014 Acura MDX",
      "Stock number or VIN": "STK-4421 / 5FRYD3H26EB012345",
      "Customer-owned or inventory-owned": "Inventory-owned",
      "Complaint / issue": "A/C warm at idle",
      "Diagnostic finding": "",
      "Repair performed today": "Pressure test and compressor verification",
      "Parts needed": "A/C compressor",
      "Waiting reason": "Part availability check in progress",
      "Estimated completion time": "",
      "Ready for QC": "No",
      "Mechanic note": ""
    }
  },
  {
    id: "blocked-tasks",
    title: "Review Blocked Tasks",
    brief: "Review blocked or waiting work and issue next-step decisions.",
    assignedTo: "Eli",
    role: "General Manager",
    workflow: "Management",
    priority: "High",
    dueTime: "Due 11:00 AM",
    status: "Not Started",
    sourceTemplate: "Management Blocked Queue Review",
    requiresManagerReview: true,
    vehicleOrCustomer: "Board scope: 7 blocked or waiting tasks",
    missingFields: [],
    primaryAction: "Review Queue",
    whatIsExpected:
      "Review each blocked or waiting task and decide the next action, assign an owner, and set an ETA. Escalate anything that needs management attention.",
    whyThisMatters: "Blocked work delays sales, recon, customer satisfaction, and cash flow. Daily review keeps the dealership moving.",
    expectedOutcome: "Every blocked task has a documented decision, next owner, next step, and ETA before the end of the day.",
    updateFields: [
      "Tasks reviewed",
      "Blocker type",
      "Decision made",
      "Next owner",
      "Next step",
      "ETA / follow-up time",
      "Manager note"
    ],
    checklist: [
      "Open blocked task queue",
      "Review each blocked task",
      "Identify blocker type",
      "Decide next action",
      "Assign next owner",
      "Set ETA or follow-up time",
      "Add manager directive if needed",
      "Mark task decision completed"
    ],
    completionCriteria: [
      "All blocked tasks reviewed",
      "A decision has been recorded for each",
      "Next owner and next step assigned",
      "ETA or follow-up time set",
      "Critical risks escalated"
    ],
    blockerRules: [
      "When marking a task as blocked or waiting, the staff must include blocker type, reason, who can resolve it, and ETA.",
      "Waiting work must still carry a next owner and follow-up time.",
      "No blocked task should remain ownerless after this review."
    ],
    activity: [
      "Eli reviewed 3 blocked tasks.",
      "Eli reassigned Acura MDX repair follow-up to Walter.",
      "Eli set ETA for Volt outside diagnosis follow-up."
    ],
    managerActions: [
      "Reassign task",
      "Change due time",
      "Override recommendation",
      "Add directive",
      "Escalate",
      "Close"
    ],
    dependencies: [
      "Waiting on manager approval",
      "Waiting on outside shop diagnosis",
      "Depends on inventory manager moving vehicle to service"
    ],
    subtasks: [
      "Review blocked task queue",
      "Classify blocker type",
      "Decide action owner",
      "Set follow-up time",
      "Escalate critical risks"
    ],
    files: ["Attach blocker report", "Attach vendor update", "Attach manager directive"],
    updates: [
      "Three tasks need new ETAs before noon.",
      "One title issue may block weekend delivery if not escalated today."
    ],
    managerNotes: [
      "Use this workspace as the future command center for cross-team bottlenecks.",
      "Prototype note: recommendation reason and audit history would surface here later."
    ],
    relatedTasks: ["Submit Inventory Movement Update", "Submit Service Production Update"],
    futureModules: ["Related tasks", "Messages", "Automations", "Audit trail"],
    kpiImpact: ["Board health", "Blocked task aging", "Escalation visibility"],
    formDefaults: {
      "Tasks reviewed": "3",
      "Blocker type": "Parts delay / outside diagnosis",
      "Decision made": "Reassign follow-up and set ETA",
      "Next owner": "Walter",
      "Next step": "Confirm vendor ETA and update queue",
      "ETA / follow-up time": "12:30 PM",
      "Manager note": "Escalate any parts slips over 24h"
    }
  },
  {
    id: "service-production",
    title: "Submit Service Production Update",
    brief: "Give a shop-wide production update across active service and recon vehicles.",
    assignedTo: "Brock",
    role: "Service Department Manager",
    workflow: "Service",
    priority: "High",
    dueTime: "Due 4:00 PM",
    status: "Waiting on Parts",
    sourceTemplate: "Combined Inventory / Service Production Log",
    requiresManagerReview: true,
    vehicleOrCustomer: "Service queue: 9 active vehicles",
    missingFields: ["Vehicles awaiting QC", "Next priority vehicle"],
    primaryAction: "Log Production",
    whatIsExpected:
      "Give the manager a clear shop-wide view of active service vehicles, repairs completed, vehicles waiting on parts, vehicles waiting for QC, and units stalled in recon.",
    whyThisMatters:
      "Without one combined production snapshot, service bottlenecks stay scattered across calls, side conversations, and memory.",
    expectedOutcome:
      "Managers can see what moved, what stalled, what needs approval, and which vehicle should be prioritized next.",
    updateFields: [
      "Vehicles currently in service",
      "Repairs completed today",
      "Vehicles awaiting parts",
      "Vehicles awaiting QC",
      "Vehicles stalled in recon",
      "Next priority vehicle",
      "Manager decision needed?"
    ],
    checklist: [
      "Review all service vehicles",
      "Confirm completed repairs",
      "Confirm waiting-on-parts vehicles",
      "Confirm waiting-on-QC vehicles",
      "Identify stalled recon units",
      "Set next priority vehicle",
      "Escalate decisions needed"
    ],
    completionCriteria: [
      "All active service / recon vehicles have current status",
      "Completed repairs are identified",
      "Waiting vehicles have reasons and ETAs",
      "QC-ready vehicles are flagged"
    ],
    blockerRules: [
      "Use Waiting on Parts when the next move depends on a confirmed part or vendor shipment.",
      "Escalate manager decisions for outside-shop work, labor approval, or delivery impact.",
      "Flag stalled recon units older than expected with a clear next owner."
    ],
    activity: [
      "Brock logged 2 repairs completed today.",
      "Service noted 3 vehicles waiting on parts.",
      "Manager requested next priority vehicle for afternoon push."
    ],
    managerActions: [
      "Approve completion",
      "Send back to In Progress",
      "Add directive",
      "Escalate vendor issue",
      "Change due time"
    ],
    dependencies: [
      "Waiting on parts arrival",
      "Waiting on manager approval",
      "Depends on mechanic repair updates landing on time"
    ],
    subtasks: [
      "Review active service board",
      "Confirm completed repairs",
      "Identify waiting vehicles",
      "Flag QC-ready units",
      "Set priority vehicle"
    ],
    files: ["Attach vendor quote", "Attach parts ETA sheet", "Attach QC checklist"],
    updates: [
      "Two units cleared repair and can enter QC after lunch.",
      "Three units remain stalled due to outstanding parts ETAs."
    ],
    managerNotes: [
      "Need a dependable production rhythm here before deeper enterprise workflow logic is built."
    ],
    relatedTasks: ["Complete Assigned Vehicle Diagnostic / Repair Update", "Review Blocked Tasks"],
    futureModules: ["Dependencies", "KPI impact", "Automations", "Audit trail"],
    kpiImpact: ["Shop throughput", "QC readiness", "Recon aging"],
    formDefaults: {
      "Vehicles currently in service": "9",
      "Repairs completed today": "2",
      "Vehicles awaiting parts": "3",
      "Vehicles awaiting QC": "",
      "Vehicles stalled in recon": "2",
      "Next priority vehicle": "",
      "Manager decision needed?": "Yes - outside vendor ETA"
    }
  },
  {
    id: "inventory-movement",
    title: "Submit Inventory Movement Update",
    brief: "Update vehicle movement through Purchased -> Inspection -> Repairs -> Detail -> Photos -> Listing -> Ready for Sale.",
    assignedTo: "Brock",
    role: "Inventory Manager",
    workflow: "Inventory",
    priority: "Normal",
    dueTime: "Due 3:30 PM",
    status: "In Progress",
    sourceTemplate: "Inventory Movement Daily Log",
    requiresManagerReview: false,
    vehicleOrCustomer: "Pipeline: 18 active inventory vehicles",
    missingFields: ["Ready-for-sale risk"],
    primaryAction: "Update Pipeline",
    whatIsExpected:
      "Review active inventory vehicles and document where each vehicle moved today, what is stuck, and what happens next.",
    expectedOutcome:
      "Each active inventory vehicle has a current stage, blockers are explained, next steps are clear, and sale-readiness risk is visible.",
    updateFields: [
      "Vehicle",
      "Current stage",
      "Movement today",
      "Blocker",
      "Next step",
      "ETA",
      "Ready-for-sale risk"
    ],
    checklist: [
      "Review purchased vehicles",
      "Review vehicles needing inspection",
      "Review vehicles waiting for repair",
      "Review vehicles waiting for detail",
      "Review vehicles ready for photos / listing",
      "Flag vehicles stuck more than expected",
      "Confirm vehicles ready for sale"
    ],
    completionCriteria: [
      "Each active inventory vehicle has a current stage",
      "Vehicles with blockers have reasons",
      "Next steps are documented",
      "Ready-for-sale candidates are flagged"
    ],
    blockerRules: [
      "Use blockers when inventory cannot move stages due to title, parts, repair, or detail constraints."
    ],
    activity: [
      "Brock moved two vehicles from Repairs to Detail.",
      "One Tahoe remains stalled pending body shop ETA."
    ],
    managerActions: ["Reassign", "Change due time", "Add directive", "Escalate", "Close"],
    dependencies: [
      "Depends on service clearing repairs",
      "Depends on detail capacity",
      "Blocks listing readiness when movement stalls"
    ],
    subtasks: [
      "Review purchased units",
      "Review inspection queue",
      "Review repair queue",
      "Review detail queue",
      "Review listing-ready units"
    ],
    files: ["Attach movement snapshot", "Attach stage exceptions", "Attach recon notes"],
    updates: [
      "Acura MDX remains in Repairs pending compressor.",
      "Two units advanced to Photos today."
    ],
    managerNotes: ["Prototype note: future vehicle-stage automations would connect here."],
    relatedTasks: ["Submit Service Production Update", "Confirm Listings Complete"],
    futureModules: ["Files / Images", "Related tasks", "Automations", "Messages"],
    kpiImpact: ["Inventory flow", "Aged inventory risk", "Listing readiness"],
    formDefaults: {
      "Vehicle": "2018 Chevy Tahoe",
      "Current stage": "Repairs",
      "Movement today": "No stage change",
      "Blocker": "Waiting on body shop estimate",
      "Next step": "Call vendor and confirm ETA",
      "ETA": "Tomorrow 10:00 AM",
      "Ready-for-sale risk": ""
    }
  },
  {
    id: "listings-complete",
    title: "Confirm Listings Complete",
    brief: "Confirm vehicle photos, descriptions, pricing, and online listing completeness.",
    assignedTo: "Baraka",
    role: "Marketing / Advertising",
    workflow: "Marketing / Advertising",
    priority: "Normal",
    dueTime: "Due 3:00 PM",
    status: "Blocked",
    sourceTemplate: "Listing Completion Verification",
    requiresManagerReview: true,
    vehicleOrCustomer: "Vehicle: 2021 Kia Telluride",
    missingFields: ["Photos complete?", "Price confirmed?"],
    primaryAction: "Confirm Listing",
    whatIsExpected:
      "Make sure vehicles ready for sale have complete listing information and missing assets are flagged before the vehicle is presented as market-ready.",
    expectedOutcome:
      "Listing is complete or missing items are clearly flagged so the manager knows exactly what is still needed.",
    updateFields: [
      "Vehicle",
      "Platform",
      "Photos complete?",
      "Listing complete?",
      "Price confirmed?",
      "Missing information",
      "Next action",
      "Leads generated"
    ],
    checklist: [
      "Confirm photos are complete",
      "Confirm listing description is complete",
      "Confirm price is correct",
      "Confirm online platform posting",
      "Flag missing info",
      "Report leads generated",
      "Set next action"
    ],
    completionCriteria: [
      "Listing is complete or missing items are clearly flagged",
      "Manager can see what is still needed",
      "Online advertising status is clear"
    ],
    blockerRules: [
      "Use Blocked when photos, pricing approval, or inventory details are missing and no listing decision can be finalized."
    ],
    activity: [
      "Baraka flagged missing photo set for 2021 Kia Telluride.",
      "Pricing approval still pending before listing can publish."
    ],
    managerActions: ["Approve completion", "Send back", "Add directive", "Escalate pricing approval"],
    dependencies: [
      "Waiting on manager approval",
      "Waiting on photos from lot / detail",
      "Depends on inventory movement to Ready for Sale"
    ],
    subtasks: [
      "Review photos",
      "Confirm pricing",
      "Check listing copy",
      "Confirm platform publish"
    ],
    files: ["Add photo set", "Add pricing sheet", "Add listing proof"],
    updates: [
      "Draft copy is ready, but final publish is blocked by missing hero shots."
    ],
    managerNotes: [
      "If pricing approval does not land by 2:00 PM, escalate to manager before listings batch closes."
    ],
    relatedTasks: ["Submit Inventory Movement Update", "Review Blocked Tasks"],
    futureModules: ["Audit trail", "Files / Images", "KPI impact", "Messages"],
    kpiImpact: ["Listing completion rate", "Lead readiness", "Time-to-market risk"],
    formDefaults: {
      "Vehicle": "2021 Kia Telluride",
      "Platform": "Cars.com + Website",
      "Photos complete?": "",
      "Listing complete?": "Drafted",
      "Price confirmed?": "",
      "Missing information": "Exterior hero photos and pricing approval",
      "Next action": "Follow up with manager and photo team",
      "Leads generated": "0"
    }
  },
  {
    id: "hot-leads",
    title: "Follow Up With Hot Leads",
    brief: "Contact active leads, update sales stage, document result, and set next follow-up.",
    assignedTo: "Baraka",
    role: "Salesperson",
    workflow: "Sales",
    priority: "Normal",
    dueTime: "Due 5:00 PM",
    status: "Completed",
    sourceTemplate: "Daily Hot Lead Follow-Up",
    requiresManagerReview: false,
    vehicleOrCustomer: "Customer: Jasmine R. / 2020 Honda Accord",
    missingFields: [],
    primaryAction: "Log Follow-Up",
    whatIsExpected:
      "Contact assigned hot leads and document the outcome so no lead is lost without a next action.",
    expectedOutcome:
      "Each hot lead has a result, each open lead has a next follow-up time, and manager help requests are flagged.",
    updateFields: [
      "Customer",
      "Vehicle",
      "Lead source",
      "Sales stage",
      "Contact attempt",
      "Contact result",
      "Next follow-up time",
      "Manager help needed?"
    ],
    checklist: [
      "Review assigned hot leads",
      "Contact customer",
      "Update sales stage",
      "Document result",
      "Set next follow-up",
      "Flag manager help needed",
      "Mark lost, sold, or pending when appropriate"
    ],
    completionCriteria: [
      "Each hot lead has a result",
      "Each open lead has a next follow-up time",
      "Manager help requests are flagged"
    ],
    blockerRules: [
      "Use manager help when pricing, trade, or approval is needed to keep the lead moving."
    ],
    activity: [
      "Baraka contacted three hot leads.",
      "Jasmine R. scheduled a return call for 6:15 PM.",
      "One lead moved to pending deposit."
    ],
    managerActions: ["Reassign", "Add directive", "Escalate", "Close"],
    dependencies: ["Waiting on manager help for trade question"],
    subtasks: [
      "Review lead queue",
      "Contact customer",
      "Update sales stage",
      "Set next follow-up"
    ],
    files: ["Attach quote", "Attach text screenshot", "Attach trade notes"],
    updates: [
      "Strong interest after payment discussion.",
      "Customer asked for confirmation on warranty add-on."
    ],
    managerNotes: ["Use this as the future workspace for lead context, notes, and approvals."],
    relatedTasks: ["Review Blocked Tasks"],
    futureModules: ["Messages", "Automations", "Related tasks"],
    kpiImpact: ["Lead response rate", "Appointment conversion"],
    formDefaults: {
      "Customer": "Jasmine R.",
      "Vehicle": "2020 Honda Accord",
      "Lead source": "Marketplace",
      "Sales stage": "Hot",
      "Contact attempt": "Phone call",
      "Contact result": "Reached customer",
      "Next follow-up time": "6:15 PM",
      "Manager help needed?": "Warranty pricing question"
    }
  }
];

function sortTasks(tasks: SampleTask[]) {
  return [...tasks].sort((left, right) => {
    const priorityRank = { High: 0, Normal: 1 };
    if (priorityRank[left.priority] !== priorityRank[right.priority]) {
      return priorityRank[left.priority] - priorityRank[right.priority];
    }

    return left.dueTime.localeCompare(right.dueTime);
  });
}

function buildInitialFormState(tasks: SampleTask[]) {
  return tasks.reduce<Record<string, Record<string, string>>>((accumulator, task) => {
    accumulator[task.id] = task.formDefaults;
    return accumulator;
  }, {});
}

function buildInitialChecklistState(tasks: SampleTask[]) {
  return tasks.reduce<Record<string, Record<string, boolean>>>((accumulator, task) => {
    accumulator[task.id] = task.checklist.reduce<Record<string, boolean>>((checklistAccumulator, item, index) => {
      checklistAccumulator[item] = index < 2;
      return checklistAccumulator;
    }, {});
    return accumulator;
  }, {});
}

function filterTasks(tasks: SampleTask[], filter: TaskFilter) {
  if (filter === "All") {
    return tasks;
  }

  if (filter === "Open") {
    return tasks.filter((task) => task.status !== "Completed");
  }

  if (filter === "Due Soon") {
    return tasks.filter((task) => task.priority === "High" || task.status === "Blocked");
  }

  if (filter === "Blocked") {
    return tasks.filter((task) => task.status === "Blocked");
  }

  if (filter === "Waiting") {
    return tasks.filter((task) => task.status === "Waiting on Parts" || task.status === "Waiting on Approval");
  }

  if (filter === "Ready for Review") {
    return tasks.filter((task) => task.status === "Ready for Review");
  }

  return tasks.filter((task) => task.status === "Completed");
}

function getStatusTone(status: SampleTask["status"]) {
  if (status === "Not Started") {
    return "enterprise-status-chip enterprise-status-chip-neutral";
  }

  if (status === "Blocked") {
    return "enterprise-status-chip enterprise-status-chip-danger";
  }

  if (status === "Waiting on Parts" || status === "Waiting on Approval") {
    return "enterprise-status-chip enterprise-status-chip-warning";
  }

  if (status === "Ready for Review") {
    return "enterprise-status-chip enterprise-status-chip-review";
  }

  if (status === "Completed") {
    return "enterprise-status-chip enterprise-status-chip-success";
  }

  return "enterprise-status-chip enterprise-status-chip-default";
}

function getFilterTone(filter: TaskFilter) {
  if (filter === "Blocked") {
    return "enterprise-filter-chip enterprise-filter-chip-danger";
  }

  if (filter === "Waiting") {
    return "enterprise-filter-chip enterprise-filter-chip-warning";
  }

  if (filter === "Ready for Review") {
    return "enterprise-filter-chip enterprise-filter-chip-review";
  }

  if (filter === "Completed") {
    return "enterprise-filter-chip enterprise-filter-chip-success";
  }

  if (filter === "All") {
    return "enterprise-filter-chip enterprise-filter-chip-brand";
  }

  return "enterprise-filter-chip";
}

function getPriorityTone(priority: TaskPriority) {
  return priority === "High"
    ? "enterprise-priority-chip enterprise-priority-chip-high"
    : "enterprise-priority-chip enterprise-priority-chip-normal";
}

function getTaskCardFacts(task: SampleTask) {
  if (task.id === "blocked-tasks") {
    return ["3 blocked", "1 update"];
  }

  if (task.id === "repair-update") {
    return ["2014 Acura MDX", "Missing: 3 fields"];
  }

  if (task.id === "service-production") {
    return ["5 in service", "2 waiting on parts"];
  }

  if (task.id === "inventory-movement") {
    return ["8 vehicles", "1 blocker"];
  }

  if (task.id === "listings-complete") {
    return ["6 listings", "1 missing info"];
  }

  return ["4 hot leads", "2 callbacks"];
}

function getTaskInformation(task: SampleTask) {
  if (task.id === "blocked-tasks") {
    return {
      created: "Today, 8:02 AM",
      createdBy: "Elia Aswan",
      category: "Management",
      signalType: "Operational Review"
    };
  }

  return {
    created: "Today, 9:14 AM",
    createdBy: task.assignedTo,
    category: task.workflow,
    signalType: task.requiresManagerReview ? "Approval Needed" : "Daily Update"
  };
}

function getQuickActions(task: SampleTask) {
  if (task.id === "blocked-tasks") {
    return ["Send to Review", "Mark Complete", "Block This Task"];
  }

  if (task.requiresManagerReview) {
    return ["Send to Review", "Mark Complete", "Request Manager Help"];
  }

  return ["Mark Complete", task.primaryAction, "More Actions"];
}

function getBlockedQueue() {
  return [
    { assignee: "Walter", label: "2014 Acura MDX - Waiting on Parts" },
    { assignee: "Brock", label: "2016 Chevrolet Volt - Outside Diagnosis" },
    { assignee: "Walter", label: "2012 Dodge Caravan - Waiting on Approval" }
  ];
}

function getSlaSignal(task: SampleTask): SlaSignal {
  if (task.id === "blocked-tasks") {
    return {
      level: "risk",
      status: "Escalation due by 11:30 AM",
      nextCheckpoint: "11:30 AM manager sweep",
      escalation: "Escalate any blocked task older than 24h or without a next owner."
    };
  }

  if (task.id === "repair-update") {
    return {
      level: "risk",
      status: "Past expected mechanic update window",
      nextCheckpoint: "10:00 AM parts ETA check",
      escalation: "Escalate to parts coordination if ETA is still missing after the morning check."
    };
  }

  if (task.id === "service-production") {
    return {
      level: "watch",
      status: "Due today with missing QC confirmation",
      nextCheckpoint: "2:00 PM production pulse",
      escalation: "Escalate if two or more active units remain ownerless or without ETA."
    };
  }

  if (task.id === "inventory-movement") {
    return {
      level: "watch",
      status: "Stage movement aging above normal",
      nextCheckpoint: "3:00 PM inventory review",
      escalation: "Escalate if a vehicle remains stalled across two stage reviews."
    };
  }

  if (task.id === "listings-complete") {
    return {
      level: "watch",
      status: "Waiting on pricing and photo completion",
      nextCheckpoint: "1:00 PM listing publish cutoff",
      escalation: "Escalate if hero photos or pricing approval remain open at cutoff."
    };
  }

  return {
    level: "healthy",
    status: "Within expected response window",
    nextCheckpoint: "Next follow-up by 4:30 PM",
    escalation: "Escalate only if customer contact is missed twice."
  };
}

function renderFieldLabel(field: string) {
  return (
    <>
      {field}
      <span aria-hidden="true"> *</span>
    </>
  );
}

export function EnterpriseTaskTemplatePrototype() {
  const orderedTasks = sortTasks(sampleTasks);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>("All");
  const [selectedTaskId, setSelectedTaskId] = useState(orderedTasks[0]?.id ?? "");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("Overview");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("Overview");
  const [taskListDisplay, setTaskListDisplay] = useState<TaskListDisplay>("list");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [formState, setFormState] = useState<Record<string, Record<string, string>>>(() => buildInitialFormState(orderedTasks));
  const [checklistState, setChecklistState] = useState<Record<string, Record<string, boolean>>>(() =>
    buildInitialChecklistState(orderedTasks)
  );

  const visibleTasks = filterTasks(orderedTasks, activeFilter);
  const selectedTask = orderedTasks.find((task) => task.id === selectedTaskId) ?? orderedTasks[0];
  const selectedFormValues = formState[selectedTask.id] ?? {};
  const selectedChecklist = checklistState[selectedTask.id] ?? {};
  const selectedSla = getSlaSignal(selectedTask);
  function handleTaskSelect(taskId: string) {
    setSelectedTaskId(taskId);
    setInspectorTab("Overview");
  }

  function toggleChecklistItem(taskId: string, item: string) {
    setChecklistState((currentState) => ({
      ...currentState,
      [taskId]: {
        ...(currentState[taskId] ?? {}),
        [item]: !(currentState[taskId]?.[item] ?? false)
      }
    }));
  }

  function updateField(taskId: string, field: string, value: string) {
    setFormState((currentState) => ({
      ...currentState,
      [taskId]: {
        ...(currentState[taskId] ?? {}),
        [field]: value
      }
    }));
  }

  return (
    <>
      <section className="page-stack dashboard-page enterprise-prototype-page">
        <div className="dashboard-page-header enterprise-prototype-header">
          <div className="dashboard-page-copy">
            <span className="eyebrow">Prototype route</span>
            <h1>Enterprise Task Template Prototype</h1>
            <p>
              Prototype only - static visual design for review before implementation.
              This route explores compact task cards, a persistent desktop inspector, and an expanded workspace for deeper enterprise task handling.
            </p>
          </div>
          <div className="enterprise-header-callout panel-card">
            <strong>Option 1 direction</strong>
            <h2>Compact list + right inspector + expandable workspace</h2>
            <p>
              The selected task opens immediately, keeps daily actions visible, and expands into a richer command-center style workspace when needed.
            </p>
          </div>
        </div>

        <section className="panel-card enterprise-source-of-truth-card">
          <div className="enterprise-list-header">
            <div>
              <strong>Source-of-truth visual</strong>
              <h2>Final target UI mockup</h2>
            </div>
            <p>
              This image is now the visual reference for the My Tasks template review.
              The interactive prototype below remains the clickable working draft.
            </p>
          </div>

          <div className="enterprise-source-of-truth-frame">
            <Image
              alt="Source-of-truth enterprise My Tasks mockup"
              className="enterprise-source-of-truth-image"
              height={1024}
              priority
              src="/prototypes/enterprise-task-template-source-of-truth.png"
              width={1536}
            />
          </div>
        </section>

          <div className="enterprise-summary-strip">
            <article className="panel-card enterprise-summary-card">
              <strong>Tasks in prototype</strong>
              <h2>{orderedTasks.length}</h2>
              <p>Six static dealership templates representing management, inventory, service, mechanic, marketing, and sales work.</p>
            </article>
            <article className="panel-card enterprise-summary-card">
              <strong>Inspector behavior</strong>
              <h2>Persistent</h2>
              <p>Desktop keeps the selected task visible on the right by default. Tablet and mobile stack it cleanly without overflow.</p>
            </article>
            <article className="panel-card enterprise-summary-card">
              <strong>Enterprise upgrades added</strong>
              <h2>Inspector + workspace</h2>
              <p>Enterprise depth now stays inside the task detail experience so the main board can remain much closer to the mockup.</p>
            </article>
          </div>

        <section className="enterprise-prototype-stage">
          <div className="enterprise-canvas">
            <aside className="enterprise-canvas-sidebar">
              <div className="enterprise-canvas-brand">
                <div className="enterprise-canvas-brand-mark">T</div>
                <div>
                  <strong>Time Motor Sales</strong>
                  <span>Dispatch Board</span>
                </div>
              </div>

              <nav className="enterprise-canvas-nav" aria-label="Prototype mockup navigation">
                {mockupNavItems.map((item) => (
                  <button
                    key={item.label}
                    className={item.active ? "enterprise-canvas-nav-item enterprise-canvas-nav-item-active" : "enterprise-canvas-nav-item"}
                    type="button"
                  >
                    <LayoutGrid size={17} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="enterprise-canvas-sidebar-footer">
                <strong>Today</strong>
                <span>June 10, 2025</span>
                <small>9:42 AM</small>
              </div>
            </aside>

            <div className="enterprise-canvas-main">
              <div className="enterprise-canvas-topbar">
                <div className="enterprise-stage-header">
                  <div className="enterprise-stage-title">
                    <h2>My Tasks</h2>
                    <span>Interactive prototype restyled to follow the mockup more closely.</span>
                  </div>
                </div>

                <div className="enterprise-canvas-topbar-tools">
                  <label className="enterprise-canvas-search">
                    <Search size={16} />
                    <input aria-label="Search tasks" placeholder="Search tasks..." />
                    <span>K</span>
                  </label>
                  <button className="enterprise-canvas-topbar-icon" type="button" aria-label="Notifications">
                    <Bell size={16} />
                    <strong>3</strong>
                  </button>
                  <button className="enterprise-canvas-profile" type="button">
                    <span className="enterprise-canvas-avatar">EA</span>
                    <span className="enterprise-canvas-profile-copy">
                      <strong>Elia Aswan</strong>
                      <small>General Manager</small>
                    </span>
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>

              <div className="enterprise-stage-body">
                <div className="enterprise-stage-controls">
                  <div className="enterprise-filter-row" aria-label="Prototype task filters">
                    {listFilters.map((filter) => (
                      <button
                        key={filter}
                        className={
                          filter === activeFilter
                            ? `${getFilterTone(filter)} enterprise-filter-chip-active`
                            : getFilterTone(filter)
                        }
                        onClick={() => setActiveFilter(filter)}
                        type="button"
                      >
                        <span>{filter}</span>
                        <strong>{filterTasks(orderedTasks, filter).length}</strong>
                      </button>
                    ))}
                  </div>

                  <div className="enterprise-display-toggle" aria-label="Task list display mode">
                    <button
                      className={
                        taskListDisplay === "list"
                          ? "enterprise-display-toggle-button enterprise-display-toggle-button-active"
                          : "enterprise-display-toggle-button"
                      }
                      onClick={() => setTaskListDisplay("list")}
                      type="button"
                    >
                      <List size={15} />
                      List
                    </button>
                    <button
                      className={
                        taskListDisplay === "cards"
                          ? "enterprise-display-toggle-button enterprise-display-toggle-button-active"
                          : "enterprise-display-toggle-button"
                      }
                      onClick={() => setTaskListDisplay("cards")}
                      type="button"
                    >
                      <LayoutGrid size={15} />
                      Cards
                    </button>
                  </div>
                </div>

                <div className="enterprise-shell enterprise-shell-mockup">
            <section className="enterprise-task-list-panel enterprise-task-list-panel-mockup">
              <div className="enterprise-list-toolbar">
                <button className="enterprise-sort-button" type="button">
                  <Clock3 size={14} />
                  Sort by: Due Time
                </button>
                <button className="enterprise-menu-button" type="button" aria-label="More list options">
                  <MoreHorizontal size={18} />
                </button>
              </div>

              <div
                className={
                  taskListDisplay === "cards"
                    ? "enterprise-card-list enterprise-card-list-mockup"
                    : "enterprise-card-list enterprise-card-list-mockup enterprise-card-list-compact"
                }
              >
                {visibleTasks.length === 0 ? (
                  <div className="enterprise-list-empty-state">
                    <strong>No tasks in this filter</strong>
                    <p>Try a different view or filter to bring matching work back into the queue.</p>
                  </div>
                ) : visibleTasks.map((task) => {
                    const isSelected = task.id === selectedTask.id;
                    const facts = getTaskCardFacts(task);

                  if (taskListDisplay === "list") {
                    return (
                      <article
                        className={isSelected ? "enterprise-list-row enterprise-list-row-selected" : "enterprise-list-row"}
                        key={task.id}
                      >
                        <button
                          aria-pressed={isSelected}
                          className="enterprise-list-row-hit"
                          onClick={() => handleTaskSelect(task.id)}
                          type="button"
                        >
                          <div className="enterprise-list-row-top">
                            <span className={getPriorityTone(task.priority)}>{task.priority}</span>
                            <span className="enterprise-role-copy">{task.role}</span>
                            <span className="enterprise-list-row-due">{task.dueTime}</span>
                          </div>
                          <div className="enterprise-list-row-main">
                            <div className="enterprise-list-row-copy">
                              <h3>{task.title}</h3>
                              <p>{task.brief}</p>
                            </div>
                            <span className={`${getStatusTone(task.status)} enterprise-card-status-chip`}>{task.status}</span>
                          </div>
                            <div className="enterprise-list-row-meta">
                              <span>{facts[0]}</span>
                              <span>{facts[1]}</span>
                              <span>{task.vehicleOrCustomer}</span>
                            </div>
                          </button>
                        <div className="enterprise-list-row-actions">
                          <button className="pill pill-primary" onClick={() => handleTaskSelect(task.id)} type="button">
                            {task.primaryAction}
                          </button>
                          <button className="pill pill-secondary" onClick={() => handleTaskSelect(task.id)} type="button">
                            Open
                          </button>
                        </div>
                      </article>
                    );
                  }

                  return (
                    <article
                      className={isSelected ? "enterprise-task-card enterprise-task-card-selected" : "enterprise-task-card"}
                      key={task.id}
                    >
                      <button
                        aria-pressed={isSelected}
                        className="enterprise-task-card-hit"
                        onClick={() => handleTaskSelect(task.id)}
                        type="button"
                      >
                        <div className="enterprise-task-topline">
                          <div className="enterprise-card-labels">
                            <span className={getPriorityTone(task.priority)}>{task.priority}</span>
                            <span className="enterprise-role-copy">{task.role}</span>
                          </div>
                          <span className="enterprise-due-copy">
                            <Clock3 size={14} />
                            {task.dueTime}
                          </span>
                        </div>

                        <div className="enterprise-task-copy">
                          <h3>{task.title}</h3>
                          <p>{task.brief}</p>
                        </div>

                        <div className="enterprise-card-facts">
                          <span>{facts[0]}</span>
                          <span>{facts[1]}</span>
                        </div>

                        {task.id === "repair-update" || task.id === "listings-complete" ? (
                          <div className="enterprise-warning-row">
                            <CircleAlert size={14} />
                            <span>Missing: {task.missingFields.length} fields</span>
                          </div>
                        ) : null}
                      </button>

                      <div className="enterprise-task-actions enterprise-task-actions-mockup">
                        <button className="pill pill-primary" onClick={() => handleTaskSelect(task.id)} type="button">
                          {task.primaryAction}
                        </button>
                        <button className="pill pill-secondary" onClick={() => handleTaskSelect(task.id)} type="button">
                          Open
                        </button>
                        <span className={`${getStatusTone(task.status)} enterprise-card-status-chip`}>{task.status}</span>
                      </div>
                    </article>
                  );
                  })}
              </div>
            </section>

            <aside className="enterprise-inspector enterprise-inspector-mockup">
              <div className="enterprise-inspector-header enterprise-inspector-header-mockup">
                <div className="enterprise-inspector-title enterprise-inspector-title-mockup">
                  <div className="enterprise-title-row">
                    <Star size={18} className="enterprise-title-star" />
                    <h2>{selectedTask.title}</h2>
                  </div>
                  <div className="enterprise-summary-grid-detail enterprise-summary-grid-detail-mockup">
                    <div>
                      <dt>Status</dt>
                      <dd><span className={getStatusTone(selectedTask.status)}>{selectedTask.status}</span></dd>
                    </div>
                    <div>
                      <dt>Priority</dt>
                      <dd><span className={getPriorityTone(selectedTask.priority)}>{selectedTask.priority}</span></dd>
                    </div>
                    <div>
                      <dt>Workflow</dt>
                      <dd>{selectedTask.workflow}</dd>
                    </div>
                    <div>
                      <dt>Assigned To</dt>
                      <dd>{selectedTask.assignedTo}</dd>
                    </div>
                    <div>
                      <dt>Due</dt>
                      <dd>Today, {selectedTask.dueTime.replace("Due ", "")}</dd>
                    </div>
                      <div>
                        <dt>Requires Review</dt>
                        <dd>{selectedTask.requiresManagerReview ? "Yes" : "No"}</dd>
                      </div>
                    </div>
                  </div>
                <div className="enterprise-header-actions">
                  <button className="enterprise-icon-button" onClick={() => setWorkspaceOpen(true)} type="button" aria-label="Expand workspace">
                    <Expand size={17} />
                  </button>
                  <button className="enterprise-icon-button" type="button" aria-label="Close preview">
                    <X size={17} />
                  </button>
                </div>
              </div>

              <div className="enterprise-tab-row enterprise-tab-row-mockup" aria-label="Task inspector tabs">
                {inspectorTabs.map((tab) => (
                  <button
                    key={tab}
                    className={tab === inspectorTab ? "enterprise-tab enterprise-tab-active" : "enterprise-tab"}
                    onClick={() => setInspectorTab(tab)}
                    type="button"
                  >
                    {tab === "Checklist" ? `Checklist (${selectedTask.checklist.length > 4 ? 4 : selectedTask.checklist.length})` : tab}
                  </button>
                ))}
              </div>

              {inspectorTab === "Overview" ? (
                <div className="enterprise-overview-board">
                  <div className="enterprise-overview-main">
                    <section className="enterprise-overview-stack">
                      <article className="enterprise-overview-card enterprise-overview-card-icon">
                        <div className="enterprise-overview-card-head">
                          <CircleAlert size={18} />
                          <h3>What is Expected</h3>
                        </div>
                        <p>{selectedTask.whatIsExpected}</p>
                      </article>
                      {selectedTask.whyThisMatters ? (
                        <article className="enterprise-overview-card enterprise-overview-card-icon">
                          <div className="enterprise-overview-card-head enterprise-overview-card-head-info">
                            <Info size={18} />
                            <h3>Why This Matters</h3>
                          </div>
                          <p>{selectedTask.whyThisMatters}</p>
                        </article>
                      ) : null}
                      <article className="enterprise-overview-card enterprise-overview-card-icon">
                        <div className="enterprise-overview-card-head enterprise-overview-card-head-success">
                          <BadgeCheck size={18} />
                          <h3>Expected Outcome</h3>
                        </div>
                        <p>{selectedTask.expectedOutcome}</p>
                      </article>
                      <article className="enterprise-overview-card enterprise-overview-card-icon">
                        <div className="enterprise-overview-card-head enterprise-overview-card-head-review">
                          <FileText size={18} />
                          <h3>Completion Criteria</h3>
                        </div>
                        <ul>
                          {selectedTask.completionCriteria.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </article>
                        <article className="enterprise-overview-card enterprise-overview-card-icon">
                          <div className="enterprise-overview-card-head enterprise-overview-card-head-danger">
                            <ShieldAlert size={18} />
                            <h3>Blocker Rules</h3>
                          </div>
                          <p>{selectedTask.blockerRules[0]}</p>
                        </article>
                        <article className="enterprise-overview-card enterprise-overview-card-icon">
                          <div className="enterprise-overview-card-head enterprise-overview-card-head-warning">
                            <Clock3 size={18} />
                            <h3>SLA & Escalation</h3>
                          </div>
                          <p>{selectedSla.status}</p>
                          <ul>
                            <li>{selectedSla.nextCheckpoint}</li>
                            <li>{selectedSla.escalation}</li>
                          </ul>
                        </article>
                      </section>

                    <section className="enterprise-detail-card enterprise-required-update-card">
                      <div className="enterprise-card-heading">
                        <h3>Required Update</h3>
                      </div>
                      <div className="enterprise-form-grid enterprise-form-grid-mockup">
                        {selectedTask.updateFields.slice(0, 6).map((field) => {
                          const value = selectedFormValues[field] ?? "";
                          const useSelect = field === "Blocker type" || field === "Decision made" || field === "Next owner";
                          const useTextArea = field === "Next step" || field === "Manager note";

                          return (
                            <label className="field" key={field}>
                              <span>{renderFieldLabel(field)}</span>
                              {useSelect ? (
                                <select value={value} onChange={(event) => updateField(selectedTask.id, field, event.target.value)}>
                                  <option value={value || "Select option"}>{value || "Select option"}</option>
                                </select>
                              ) : useTextArea ? (
                                <textarea value={value} onChange={(event) => updateField(selectedTask.id, field, event.target.value)} />
                              ) : (
                                <input value={value} onChange={(event) => updateField(selectedTask.id, field, event.target.value)} />
                              )}
                            </label>
                          );
                        })}
                        <label className="field">
                          <span>Manager Note</span>
                          <textarea
                            value={selectedFormValues["Manager note"] ?? ""}
                            onChange={(event) => updateField(selectedTask.id, "Manager note", event.target.value)}
                          />
                        </label>
                      </div>
                      <button className="pill pill-primary enterprise-save-button" type="button">Save Update</button>
                    </section>

                    <aside className="enterprise-side-panel-stack">
                      <section className="enterprise-detail-card enterprise-side-card">
                        <div className="enterprise-card-heading">
                          <ClipboardList size={18} />
                          <h3>Task Information</h3>
                        </div>
                          <dl className="enterprise-information-list">
                            <div><dt>Source Template</dt><dd>{selectedTask.sourceTemplate}</dd></div>
                            <div><dt>Created</dt><dd>{getTaskInformation(selectedTask).created}</dd></div>
                            <div><dt>Created By</dt><dd>{getTaskInformation(selectedTask).createdBy}</dd></div>
                            <div><dt>Template Category</dt><dd>{getTaskInformation(selectedTask).category}</dd></div>
                            <div><dt>Signal Type</dt><dd>{getTaskInformation(selectedTask).signalType}</dd></div>
                            <div><dt>Next Checkpoint</dt><dd>{selectedSla.nextCheckpoint}</dd></div>
                          </dl>
                        </section>

                      <section className="enterprise-detail-card enterprise-side-card">
                        <div className="enterprise-card-heading">
                          <CircleHelp size={18} />
                          <h3>Quick Actions</h3>
                        </div>
                        <div className="enterprise-quick-actions">
                          {getQuickActions(selectedTask).map((action, index) => (
                            <button
                              className={
                                index === 0
                                  ? "enterprise-quick-action enterprise-quick-action-review"
                                  : index === 1
                                    ? "enterprise-quick-action enterprise-quick-action-success"
                                    : "enterprise-quick-action enterprise-quick-action-warning"
                              }
                              key={action}
                              type="button"
                            >
                              {action}
                            </button>
                          ))}
                          <button className="enterprise-more-action" type="button">More Actions</button>
                        </div>
                      </section>
                    </aside>
                  </div>

                  <div className="enterprise-overview-footer">
                    <section className="enterprise-detail-card">
                      <div className="enterprise-card-heading">
                        <h3>Activity Preview</h3>
                        <span>(Today)</span>
                      </div>
                      <ul className="enterprise-activity-preview-list">
                        {selectedTask.activity.slice(0, 3).map((item, index) => (
                          <li key={item}>
                            <span className={`enterprise-activity-dot enterprise-activity-dot-${index + 1}`} />
                            <span>{index === 0 ? "8:02 AM" : index === 1 ? "8:15 AM" : "8:27 AM"}</span>
                            <p>{item}</p>
                          </li>
                        ))}
                      </ul>
                    </section>
                    <section className="enterprise-detail-card">
                      <div className="enterprise-card-heading">
                        <h3>Blocked Tasks (3)</h3>
                      </div>
                      <div className="enterprise-blocked-queue">
                        {getBlockedQueue().map((item) => (
                          <div className="enterprise-blocked-queue-item" key={item.label}>
                            <span>{item.label}</span>
                            <strong>{item.assignee}</strong>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              ) : null}

              {inspectorTab === "Update Form" ? (
                <div className="enterprise-tab-panel">
                  <div className="enterprise-form-grid">
                    {selectedTask.updateFields.map((field) => (
                      <label className="field" key={field}>
                        <span>{renderFieldLabel(field)}</span>
                        <input
                          value={selectedFormValues[field] ?? ""}
                          onChange={(event) => updateField(selectedTask.id, field, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="enterprise-form-footer">
                    <p>Static guided form only. Required fields and structure are shown for template review, with no backend submission.</p>
                    <button className="pill pill-secondary" type="button">Prototype Save State</button>
                  </div>
                </div>
              ) : null}

              {inspectorTab === "Checklist" ? (
                <div className="enterprise-tab-panel">
                  <div className="enterprise-checklist-list">
                    {selectedTask.checklist.map((item) => (
                      <label className="enterprise-checklist-item" key={item}>
                        <input
                          checked={selectedChecklist[item] ?? false}
                          onChange={() => toggleChecklistItem(selectedTask.id, item)}
                          type="checkbox"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {inspectorTab === "Activity" ? (
                <div className="enterprise-tab-panel">
                  <ul className="enterprise-timeline">
                    {selectedTask.activity.map((item) => (
                      <li key={item}>
                        <span className="enterprise-timeline-dot" aria-hidden="true" />
                        <div>
                          <strong>Activity event</strong>
                          <p>{item}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {inspectorTab === "Manager" ? (
                <div className="enterprise-tab-panel">
                  <div className="enterprise-action-grid">
                    {selectedTask.managerActions.map((action) => (
                      <button className="enterprise-manager-action" key={action} type="button">
                        {action}
                      </button>
                    ))}
                  </div>
                  <section className="enterprise-detail-card">
                    <strong>Prototype manager notes</strong>
                    <ul>
                      {selectedTask.managerNotes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              ) : null}
            </aside>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>

      {workspaceOpen ? (
        <div className="enterprise-workspace-backdrop" role="dialog" aria-modal="true" aria-label="Expanded task workspace">
          <section className="enterprise-workspace">
            <div className="enterprise-workspace-header">
              <div className="enterprise-workspace-heading">
                <div className="enterprise-chip-row">
                  <span className={getStatusTone(selectedTask.status)}>{selectedTask.status}</span>
                  <span className={getPriorityTone(selectedTask.priority)}>{selectedTask.priority}</span>
                  <span className="enterprise-meta-chip">{selectedTask.workflow}</span>
                </div>
                <h2>{selectedTask.title}</h2>
                <p>
                  {selectedTask.assignedTo} | {selectedTask.dueTime} | {selectedTask.vehicleOrCustomer} | Requires review: {selectedTask.requiresManagerReview ? "Yes" : "No"}
                </p>
              </div>
              <button className="enterprise-workspace-close" onClick={() => setWorkspaceOpen(false)} type="button">
                <X size={18} />
                Close
              </button>
            </div>

            <div className="enterprise-workspace-tabs" aria-label="Expanded task workspace tabs">
              {workspaceTabs.map((tab) => (
                <button
                  key={tab}
                  className={tab === workspaceTab ? "enterprise-tab enterprise-tab-active" : "enterprise-tab"}
                  onClick={() => setWorkspaceTab(tab)}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="enterprise-workspace-body">
              {workspaceTab === "Overview" ? (
                <div className="enterprise-workspace-grid">
                  <section className="enterprise-workspace-main">
                    <div className="enterprise-content-block">
                      <strong>What is expected</strong>
                      <p>{selectedTask.whatIsExpected}</p>
                    </div>
                    {selectedTask.whyThisMatters ? (
                      <div className="enterprise-content-block">
                        <strong>Why this matters</strong>
                        <p>{selectedTask.whyThisMatters}</p>
                      </div>
                    ) : null}
                    <div className="enterprise-content-block">
                      <strong>Expected outcome</strong>
                      <p>{selectedTask.expectedOutcome}</p>
                    </div>
                    <div className="enterprise-two-column">
                      <section className="enterprise-detail-card">
                        <strong>Completion criteria</strong>
                        <ul>
                          {selectedTask.completionCriteria.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </section>
                      <section className="enterprise-detail-card">
                        <strong>Blocker rules</strong>
                        <ul>
                          {selectedTask.blockerRules.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </section>
                    </div>
                  </section>
                  <aside className="enterprise-workspace-side">
                    <section className="enterprise-detail-card">
                      <strong>Template source</strong>
                      <p>{selectedTask.sourceTemplate}</p>
                    </section>
                    <section className="enterprise-detail-card">
                      <strong>KPI impact</strong>
                      <ul>
                        {selectedTask.kpiImpact.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="enterprise-detail-card">
                      <strong>SLA and escalation</strong>
                      <ul>
                        <li>{selectedSla.status}</li>
                        <li>{selectedSla.nextCheckpoint}</li>
                        <li>{selectedSla.escalation}</li>
                      </ul>
                    </section>
                    <section className="enterprise-detail-card enterprise-future-card">
                      <strong>Future-ready modules</strong>
                      <div className="enterprise-future-list">
                        {selectedTask.futureModules.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    </section>
                  </aside>
                </div>
              ) : null}

              {workspaceTab === "Updates" ? (
                <div className="enterprise-workspace-grid">
                  <section className="enterprise-workspace-main">
                    <div className="enterprise-composer">
                      <strong>Comment / update composer</strong>
                      <textarea defaultValue={`Update for ${selectedTask.title}`} />
                      <div className="enterprise-composer-actions">
                        <button className="pill pill-primary" type="button">Add Update</button>
                        <button className="pill pill-secondary" type="button">Mark as Important</button>
                      </div>
                    </div>
                    <section className="enterprise-detail-card">
                      <strong>Example staff updates</strong>
                      <ul className="enterprise-activity-list">
                        {selectedTask.updates.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  </section>
                  <aside className="enterprise-workspace-side">
                    <section className="enterprise-detail-card">
                      <strong>Example manager notes</strong>
                      <ul>
                        {selectedTask.managerNotes.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  </aside>
                </div>
              ) : null}

              {workspaceTab === "Checklist" ? (
                <div className="enterprise-checklist-list">
                  {selectedTask.checklist.map((item) => (
                    <label className="enterprise-checklist-item" key={item}>
                      <input
                        checked={selectedChecklist[item] ?? false}
                        onChange={() => toggleChecklistItem(selectedTask.id, item)}
                        type="checkbox"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                  {selectedTask.completionCriteria.map((item) => (
                    <div className="enterprise-criteria-item" key={item}>
                      <CheckCheck size={16} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {workspaceTab === "Subtasks" ? (
                <div className="enterprise-workspace-grid">
                  <section className="enterprise-detail-card">
                    <strong>Future-ready subtasks</strong>
                    <div className="enterprise-subtask-list">
                      {selectedTask.subtasks.map((item, index) => (
                        <div className="enterprise-subtask-item" key={item}>
                          <span>{index + 1}</span>
                          <div>
                            <h3>{item}</h3>
                            <p>Prototype-only subtask row for deeper execution tracking inside the future enterprise workspace.</p>
                          </div>
                          <button className="pill pill-secondary" type="button">Open</button>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              ) : null}

              {workspaceTab === "Files / Images" ? (
                <div className="enterprise-file-grid">
                  {selectedTask.files.map((item) => (
                    <article className="enterprise-file-card" key={item}>
                      <FolderKanban size={18} />
                      <strong>{item}</strong>
                      <p>Prototype placeholder for attachments, photos, invoices, and proof artifacts.</p>
                      <button className="pill pill-secondary" type="button">Future Upload</button>
                    </article>
                  ))}
                </div>
              ) : null}

              {workspaceTab === "Dependencies" ? (
                <div className="enterprise-workspace-grid">
                  <section className="enterprise-detail-card">
                    <strong>Dependencies</strong>
                    <ul>
                      {selectedTask.dependencies.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                  <section className="enterprise-detail-card">
                    <strong>Related tasks</strong>
                    <ul>
                      {selectedTask.relatedTasks.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              ) : null}

              {workspaceTab === "Activity" ? (
                <ul className="enterprise-timeline enterprise-timeline-expanded">
                  {selectedTask.activity.map((item) => (
                    <li key={item}>
                      <span className="enterprise-timeline-dot" aria-hidden="true" />
                      <div>
                        <strong>Timeline event</strong>
                        <p>{item}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              {workspaceTab === "Manager" ? (
                <div className="enterprise-workspace-grid">
                  <section className="enterprise-detail-card">
                    <strong>Enterprise manager controls</strong>
                    <div className="enterprise-action-grid">
                      {["Reassign task", "Change due time", "Add manager directive", "Send back", "Approve", "Escalate", "Mark complete"].map((action) => (
                        <button className="enterprise-manager-action" key={action} type="button">
                          {action}
                        </button>
                      ))}
                    </div>
                  </section>
                  <aside className="enterprise-workspace-side">
                    <section className="enterprise-detail-card enterprise-future-card">
                      <strong>Audit trail placeholder</strong>
                      <p>Future approval reasons, override history, and manager decision logs would be surfaced here.</p>
                    </section>
                    <section className="enterprise-detail-card enterprise-future-card">
                      <strong>Recommendation reason placeholder</strong>
                      <p>Future-ready space for why this task landed with this owner, what changed, and who overrode it.</p>
                    </section>
                  </aside>
                </div>
              ) : null}
            </div>

            <div className="enterprise-workspace-footer">
              <div className="enterprise-future-pill-row">
                <span><ShieldCheck size={14} /> Audit trail</span>
                <span><Sparkles size={14} /> Automations</span>
                <span><MessageSquareText size={14} /> Messages</span>
                <span><ChevronRight size={14} /> KPI impact</span>
              </div>
              <button className="pill pill-secondary" onClick={() => setWorkspaceOpen(false)} type="button">
                Return to Inspector
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

