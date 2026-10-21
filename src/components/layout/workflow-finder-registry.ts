import { CRM_NEXT_CUSTOMERS_HREF, CRM_NEXT_HOME_HREF } from "@/features/crm/crm-route-authority";

export type WorkflowFinderStatus = "Live" | "Limited" | "Manager" | "Pilot" | "Planned";

export type WorkflowFinderEntry = {
  aliases: string[];
  category: string;
  description: string;
  href?: string;
  keywords: string[];
  prerequisite: string;
  status: WorkflowFinderStatus;
  title: string;
};

export type WorkflowFinderResult = WorkflowFinderEntry & { score: number };

const stopWords = new Set(["a", "an", "and", "for", "in", "of", "or", "the", "to"]);

export const workflowFinderRegistry: WorkflowFinderEntry[] = [
  entry("Compliance · Lease tax", "Compliance", "/compliance", "Manager", "Record upfront lease tax once, review monthly state/local lines, and retain filing/payment evidence.", "Authorized managers only; verify upfront-tax eligibility and local rates. No automatic filing or payment.", ["compliance", "lease tax", "sales tax", "tax worksheet"], ["tax", "lease", "filing", "minnesota"]),
  entry("Money & Resources", "Workbook", "/money-resources", "Live", "Record spending, receipts, assigned cards and accountable funds in one compact tool.", "Requires active staff membership; management actions are permission checked.", ["spending", "daily journal", "expenses", "petty cash", "credit card", "accounting"], ["money", "receipt", "advance", "reimbursement", "resources"]),
  entry("Dispatch Board", "Command", "/board?view=live", "Live", "Live work board, department views, due work, and status movement.", "Available from the main console.", ["board", "live board", "dispatch", "daily board"], ["status", "due", "department", "tasks", "workload"]),
  entry("My Work", "Tasks", "/my-tasks", "Live", "Assigned tasks, technician work, and personal next actions.", "Requires assigned or claimable work.", ["my tasks", "assigned work", "technician work", "work queue"], ["task", "claimable", "repair labor", "start work"]),
  entry("Available Work", "Tasks", "/my-tasks/available", "Live", "Eligible work that staff can claim.", "Use when assigned work is empty or a manager has opened claimable work.", ["claim work", "available tasks", "eligible work"], ["technician", "tasks", "assignments"]),
  entry("Tasks", "Tasks", "/tasks", "Live", "Search, organize, and manage Dispatch work.", "Use authorized task filters for team or department work.", ["task board", "team tasks", "task search"], ["projects", "status", "department", "marketing", "sales", "collections"]),
  entry("Projects", "Tasks", "/projects", "Live", "Coordinate operational projects and work areas.", "Use for project-level work rather than single customer, vehicle, or RO actions.", ["project hub", "project board"], ["milestones", "work areas", "planning"]),

  entry("Vehicle Operations Lead Workbook", "Workbook", "/vehicles/coo-workbook", "Live", "Daily checklist, action plan, report draft, carryovers, and staff support.", "Use COO scope for manager work or My scope for personal workbook work.", ["coo workbook", "operations workbook", "daily workbook", "workday workbook"], ["checklist", "action plan", "report draft", "carryover", "staff support"]),
  entry("Workbook Checklist", "Workbook", "/vehicles/coo-workbook/checklist", "Live", "Daily checklist items, updates, completion, and carryover-ready work.", "Open from the workbook day you are working.", ["daily checklist", "workbook checklist"], ["done", "carryover", "update", "workday"]),
  entry("Workbook To-do List", "Workbook", "/vehicles/coo-workbook/to-do-list", "Live", "Workbook task list for items that need follow-through today.", "Use the active workbook day.", ["todo", "to do", "workbook tasks"], ["follow through", "task list"]),
  entry("Workbook Quick Update", "Workbook", "/vehicles/coo-workbook/quick-update", "Live", "Capture quick updates, customer/vendor notes, CRM import context, and follow-up signals.", "Use when the update belongs in the daily operating record.", ["quick update", "quick note", "workbook note"], ["customer", "vendor", "phone", "crm import", "follow up"]),
  entry("Workbook Action Plan", "Workbook", "/vehicles/coo-workbook/action-plan", "Live", "Turn active signals into the daily action plan for operations follow-through.", "Review current signals before creating commitments.", ["daily action plan", "action planner"], ["signals", "repair orders", "approvals", "exceptions"]),
  entry("Workbook Carryover", "Workbook", "/vehicles/coo-workbook/carryover", "Live", "Protect unfinished work and carry it forward without losing source context.", "Use for work that should survive day close.", ["carry over", "unfinished work", "tomorrow"], ["source context", "day close"]),
  entry("Workbook Report Seeds", "Workbook", "/vehicles/coo-workbook/report-seeds", "Live", "Collect report-relevant facts, exceptions, and outcomes before drafting the daily report.", "Add or review seeds before creating the report draft.", ["report seeds", "daily report facts"], ["exceptions", "outcomes", "report draft"]),
  entry("Workbook Staff Support", "Workbook", "/vehicles/coo-workbook/staff-support", "Manager", "Review staff workbook needs and support requests that need manager attention.", "Manager or delegated support context may be required.", ["staff support", "team support", "manager help"], ["workbook", "support requests", "coaching"]),
  entry("Workbook Drafts", "Workbook", "/vehicles/coo-workbook/drafts", "Live", "Open saved daily report drafts and closeout-ready workbook summaries.", "Generate or review a report draft from the workbook.", ["report drafts", "daily drafts"], ["closeout", "summary"]),
  entry("Workbook Bring Forward", "Workbook", "/vehicles/coo-workbook/bring-forward", "Live", "Recover prior unfinished work and decide what belongs in today’s focus.", "Review before accepting new daily commitments.", ["bring forward", "recover work", "prior assignments"], ["daily focus", "unfinished"]),
  entry("Workbook Purchase / Appraisal Capture", "Workbook", "/vehicles/coo-workbook/purchase-appraisal-capture", "Pilot", "Capture purchase and appraisal workbook details that affect the operating day.", "Use when purchase or appraisal details belong in the workbook.", ["purchase capture", "appraisal capture"], ["acquisition", "deal", "vehicle"]),
  entry("Workbook Focus Compass", "Workbook", "/vehicles/coo-workbook/focus-compass", "Pilot", "Review focus direction and daily operating priorities.", "Use with the active workbook day.", ["focus compass", "daily focus", "focus direction"], ["priorities", "calendar"]),
  entry("Workbook Effectiveness Pilot", "Workbook", "/vehicles/coo-workbook/effectiveness-pilot", "Pilot", "Start the day, approve daily focus, and review workbook effectiveness signals.", "Use during the pilot workflow.", ["effectiveness pilot", "start the day", "daily rhythm"], ["approve focus", "outcomes"]),
  entry("More Workbook Tools", "Workbook", "/vehicles/coo-workbook/more-tools", "Live", "Open the workbook tool drawer for additional operating helpers.", "Use when a specific workbook tool is not listed above.", ["workbook more tools", "tool drawer"], ["helpers", "additional tools"]),

  entry("Vehicles", "Vehicles", "/vehicles", "Live", "Operate vehicle records and readiness workflows.", "Use this as the vehicle workspace landing page.", ["vehicle console", "vehicle home", "vehicle records"], ["inventory", "repair", "readiness"]),
  entry("Vehicle Registry", "Vehicles", "/vehicles/registry", "Live", "Find, create, and validate vehicle identity records.", "Use before lifecycle or repair work when the vehicle record is missing.", ["registry", "vehicle lookup", "find vehicle", "vin"], ["stock", "plate", "odometer"]),
  entry("Vehicle 360", "Vehicles", "/vehicles/360", "Live", "Open full vehicle context, safety intelligence, photos, and operating history.", "Best opened from a selected vehicle.", ["vehicle 360", "360", "vehicle details"], ["nhtsa", "photos", "history", "odometer"]),
  entry("Inventory Lifecycle", "Inventory", "/vehicles/inventory", "Live", "Move inventory units through acquisition, recon, merchandising, readiness, sale, or disposition.", "Use for dealership-owned vehicle lifecycle work.", ["inventory lifecycle", "inventory life cycle", "vehicle lifecycle", "inventory flow", "inventory manager"], ["acquisition", "recon", "frontline", "merchandising", "readiness", "sale"]),
  entry("Inventory Units", "Inventory", "/vehicles/inventory/units", "Live", "Open inventory unit records and lifecycle detail.", "Use when staff know the inventory unit context.", ["inventory units", "unit records", "inventory records"], ["stock", "lifecycle", "vehicle"]),
  entry("Inventory Control Tower", "Inventory", "/vehicles/control-tower", "Live", "Monitor inventory exceptions, overdue work, blocked stages, and flow health.", "Use for manager/lead inventory intervention.", ["control tower", "inventory tower", "exceptions"], ["blocked", "overdue", "lifecycle", "manager"]),
  entry("Receive Vehicle", "Inventory", "/vehicles/workflows/add-vehicle", "Live", "Start vehicle intake, custody, keys, photos, and lot placement.", "Use for newly arrived or newly acquired vehicles.", ["add vehicle", "receive vehicle", "vehicle intake", "receipt"], ["custody", "keys", "photos", "lot"]),
  entry("Inventory to Frontline", "Inventory", "/vehicles/inventory-to-frontline", "Live", "Prepare inventory for frontline retail readiness.", "Use after recon and merchandising prerequisites are ready.", ["frontline", "front line", "retail readiness"], ["photos", "detail", "pricing", "listing"]),
  entry("Retail Completion", "Inventory", "/vehicles/retail-completion", "Live", "Complete sale-readiness and delivery-close work.", "Use for final retail completion steps.", ["retail completion", "sale completion", "delivery close"], ["sale", "delivery", "readiness"]),
  entry("Disposition / Wholesale", "Inventory", "/vehicles/disposition-wholesale", "Live", "Manage wholesale/disposition decisions and execution.", "Use for vehicles leaving the normal retail path.", ["wholesale", "disposition", "auction"], ["sell", "dispose", "non retail"]),
  entry("Acquisition Appraisal", "Inventory", "/vehicles/acquisition-appraisal", "Live", "Capture acquisition, appraisal, and purchase opportunity context.", "Use before or during inventory acquisition decisions.", ["acquisition", "appraisal", "purchase appraisal"], ["tai", "buy", "vehicle acquisition"]),
  entry("Inventory Planning Review", "Inventory", "/vehicles/inventory-planning", "Limited", "Review inventory planning context for a selected vehicle.", "Best opened from a vehicle-specific planning link.", ["inventory planning", "planning review"], ["vehicle", "readiness"]),

  entry("Recon / Repair Advisor", "Shop", "/vehicles/recon-repair-advisor", "Live", "One repair and recon advisor workspace for production, blockers, parts, vendors, repair status, and QC readiness.", "Use for shop and recon work across active repair orders.", ["shop recon", "shop and recon", "shop & recon", "recon", "shop production", "repair advisor"], ["production", "bottlenecks", "repair status", "qc", "readiness"]),
  entry("Shop Dispatch", "Shop", "/vehicles/shop-dispatch", "Live", "Assign authorized repair work and manage bay/technician dispatch.", "Use after repair work is authorized and ready to assign.", ["shop dispatch", "dispatch repair", "assign technician"], ["bay", "technician", "authorized work"]),
  entry("Shop Planning", "Shop", "/vehicles/shop-planning", "Live", "Select repair type, inspect, plan scope, and move toward repair readiness.", "Select an active repair order first.", ["repair planning", "shop planning", "repair type", "planning command center"], ["inspection", "bodywork", "vendor", "diagnostic", "mechanical"]),
  entry("Shop Production", "Shop", "/vehicles/shop-production", "Live", "Track production flow and work currently moving through the shop.", "Use for production-level shop visibility.", ["shop production", "production", "repair production"], ["bays", "capacity", "work in progress"]),
  entry("Repair Workbench", "Repair", "/vehicles/repair-workbench", "Live", "Open repair orders, repair jobs, execution controls, and repair history.", "Best with an RO or repair job context.", ["repair order", "repair orders", "ro", "repair jobs", "start repairs"], ["approval", "handoff", "execution", "history"]),
  entry("Repair Orders", "Repair", "/vehicles/repair-orders", "Live", "Open and coordinate governed repair orders.", "Use when searching for an RO rather than a specific job.", ["ro list", "repair order list", "service repair orders"], ["intake", "advisor", "service"]),
  entry("Repair Job Workbench", "Repair", "/vehicles/repair-jobs", "Limited", "Technician repair job workbench and job-level execution context.", "Open from My Work, a repair order, or assigned repair job.", ["repair job", "job workbench", "technician job"], ["labor clock", "evidence", "completion"]),
  entry("Quality Control", "Shop", "/vehicles/quality-control", "Live", "Review completion, rework, QC decisions, and release readiness.", "Use when repair or recon work is ready for independent check.", ["qc", "quality", "quality control", "inspection"], ["rework", "release", "completion"]),
  entry("Comebacks", "Shop", "/vehicles/comebacks", "Live", "Track comeback and follow-up repair management.", "Use when prior completed work returns with an issue.", ["comeback", "come back", "return repair"], ["follow up", "rework", "warranty"]),
  entry("Outside Vendors", "Shop", "/vehicles/outside-vendors", "Live", "Vendor profiles, offsite work, billing readiness, and QC accountability.", "Use when repair or recon work moves outside the dealership.", ["vendor", "outside vendor", "sublet", "offsite"], ["billing", "invoice", "qc", "partner"]),

  entry("Parts Operations", "Parts", "/vehicles/parts-operations", "Live", "Parts demand, ordering, receiving, sourcing, and vendor purchase follow-up.", "Use linked repair or inventory context when available.", ["parts", "parts ordering", "parts operations", "order parts"], ["demand", "sourcing", "vendor", "purchase", "readiness"]),
  entry("Parts Receiving", "Parts", "/vehicles/parts-receiving", "Live", "Record arrivals, exceptions, and accountable part placement.", "Use when parts physically arrive.", ["receive parts", "parts receiving", "arrived parts"], ["placement", "inspection", "exceptions"]),
  entry("Parts Counter", "Parts", "/vehicles/parts-counter", "Live", "Find and process authorized part activity.", "Use for counter-style parts work.", ["parts counter", "counter", "part lookup"], ["authorized", "issue", "staff"]),
  entry("Service Close Parts", "Parts", "/vehicles/service-close-parts", "Live", "Close parts loops tied to service repair completion.", "Use when service completion depends on parts closeout.", ["service close parts", "parts closeout", "close parts"], ["repair", "service", "completion"]),

  entry("Service Advisor", "Service", "/vehicles/advisor", "Live", "Arrivals, check-ins, repair-order handoffs, and customer follow-up.", "Use for service advisor customer and RO work.", ["advisor", "service advisor", "advisor home"], ["arrivals", "handoffs", "customer follow up"]),
  entry("Recon / Repair Advisor Prototype", "Service", "/vehicles/recon-repair-advisor", "Pilot", "Cockpit for recon and repair advisor execution.", "Use when the advisor is working recon/repair execution paths.", ["recon repair advisor prototype"], ["advisor", "prototype", "execution"]),
  entry("Check In Vehicle", "Service", "/vehicles/repair-orders?intakeSource=WALK_IN", "Live", "Receive a vehicle and create governed shop work.", "Use for walk-in or arrival service intake.", ["check in vehicle", "vehicle check in", "service intake", "walk in"], ["customer", "keys", "concern", "repair order"]),
  entry("Customer Lifecycle", "Service", "/vehicles/customer-lifecycle", "Live", "Track customer-owned vehicle lifecycle and service context.", "Use for customer vehicle lifecycle views.", ["customer lifecycle", "customer vehicle"], ["service", "repair", "customer"]),
  entry("Claims Desk", "Claims", "/vehicles/claims-desk", "Live", "Insurance claim intake, approvals, repair linkage, and claim follow-up.", "Claim record or customer/vehicle context recommended.", ["claim", "claims", "insurance", "adjuster", "deductible"], ["approval", "repair", "claim desk"]),
  entry("Claims Workspace", "Claims", "/vehicles/claims-workspace", "Live", "Detailed claim workbench for claim execution and repair coordination.", "Open from Claims Desk or an existing claim.", ["claim workspace", "insurance workspace"], ["repair", "approval", "adjuster"]),

  entry("Diagnostics", "Diagnostics", "/diagnostics", "Live", "Diagnostic case queue, next tests, evidence, and handoff readiness.", "Use a diagnostic case or create one from the workspace.", ["diagnosis", "diagnostic", "troubleshooting", "diagnostic case"], ["test", "technician", "evidence", "handoff"]),
  entry("Diagnostic Intake", "Diagnostics", "/diagnostics/intake", "Live", "Capture the concern and route a diagnostic case.", "Use at the start of troubleshooting.", ["diagnostic intake", "intake diagnosis"], ["concern", "case", "symptoms"]),
  entry("Troubleshooting Console", "Diagnostics", "/diagnostics/troubleshooting-console", "Live", "Guided technician troubleshooting and next-test support.", "Use from a diagnostic case or technician diagnostic workflow.", ["troubleshooting console", "next test", "master technician"], ["codes", "tests", "evidence"]),
  entry("Troubleshooting Review", "Diagnostics", "/diagnostics/troubleshooting-review", "Live", "Review diagnostic reasoning, tests, and handoff readiness.", "Use when diagnostic work needs review.", ["troubleshooting review", "diagnostic review"], ["findings", "evidence", "handoff"]),
  entry("Labor Guide / Estimate", "Diagnostics", "/diagnostics/labor-guide", "Live", "Find labor or parts, build a quote, save drafts, and prepare estimates.", "Vehicle details improve results; RO required for official presentation.", ["labor guide", "estimate", "quote", "labor", "parts estimate"], ["pricing", "authorization", "preliminary quote"]),
  entry("Advisor Review", "Diagnostics", "/diagnostics/advisor-review", "Live", "Review diagnosis-to-estimate drafts, handoff packets, customer language, and approval holds.", "Use after diagnostic findings need advisor/customer handling.", ["advisor diagnostic review", "estimate review"], ["handoff", "customer language", "approval"]),
  entry("Autobody Estimate", "Diagnostics", "/diagnostics/autobody-estimate", "Live", "Photo intake, damage mapping, bodywork drafts, supplements, and ADAS gates.", "Use for body/collision estimate drafting.", ["autobody", "body estimate", "collision estimate", "bodywork"], ["photos", "damage", "supplement", "adas"]),
  entry("Diagnostics Parts Ordering", "Diagnostics", "/diagnostics/parts-ordering", "Live", "Order and track parts from diagnostic estimate context.", "Use from the labor guide or diagnostic estimate flow.", ["diagnostic parts", "parts ordering diagnostics"], ["estimate", "repair", "source"]),
  entry("Master Technician", "Diagnostics", "/diagnostics/master-technician", "Pilot", "Master technician support and diagnostic reasoning tools.", "Use when guided diagnostic support is needed.", ["master technician", "ask technician", "diagnostic ai"], ["reasoning", "test plan"]),

  entry("Customer Console", "CRM", CRM_NEXT_CUSTOMERS_HREF, "Limited", "Customer record, check-in, messages, notes, cases, and customer timeline.", "Search or select a customer first.", ["customer", "crm", "customer console", "customer 360"], ["check in", "message", "note", "email", "call", "case", "timeline"]),
  entry("CRM Home", "CRM", CRM_NEXT_HOME_HREF, "Live", "Customer relationships, work, pipeline, conversations, and insight.", "Use for CRM command context.", ["crm", "crm next", "customer relationships"], ["pipeline", "work", "conversations"]),
  entry("Customer Search", "CRM", "/crm-next/search", "Live", "Search customer records and related work.", "Use when you need to find a customer before acting.", ["customer search", "find customer"], ["phone", "vin", "name", "customer"]),
  entry("Needs Attention", "CRM", "/crm-next/needs-attention", "Live", "Customer work that needs follow-up or attention.", "Use for customer follow-up queues.", ["needs attention", "customer follow up", "follow-up"], ["crm", "tasks", "contacts"]),
  entry("Customer Deals", "CRM", "/crm-next/deals", "Live", "Open customer deal and sales work.", "Use for CRM deal context.", ["deals", "customer deals", "sales deals"], ["pipeline", "desking", "sale"]),
  entry("Start Deal", "CRM", "/crm-next/deals/start", "Live", "Start a guided deal from customer context.", "Customer context recommended.", ["start deal", "new deal", "deal start"], ["sales", "customer", "vehicle"]),
  entry("Ownership Support", "CRM", "/crm-next/ownership-support", "Live", "Ownership, vehicle, finance, payment, title, and support context.", "Use when ownership/support issues need grouped context.", ["ownership support", "title support", "payment support"], ["finance", "vehicle", "service", "documents"]),
  entry("CRM Appointments", "CRM", "/crm-next/appointments", "Live", "Customer-linked appointment context.", "Use when appointment work starts from CRM.", ["crm appointments", "customer appointments"], ["schedule", "customer"]),

  entry("Appointments", "Appointments", "/appointments", "Live", "Schedule, inspect, reinspection, drop-off, and follow-up appointments.", "Customer or vehicle context helps prefill the appointment.", ["appointment", "appointments", "schedule", "calendar"], ["inspection", "drop off", "follow up"]),
  entry("Appointment Planning Hub", "Appointments", "/appointments?section=planning", "Live", "Shop capacity, staffing, bay availability, and promise confidence.", "Use for scheduling capacity decisions.", ["appointment planning", "capacity", "planning hub"], ["bay", "staffing", "promise"]),
  entry("Appointment Operations", "Appointments", "/appointments?section=operations", "Live", "Appointment operations, check-ins, no-shows, and day-of movement.", "Use for day-of appointment execution.", ["appointment operations", "no show", "day of"], ["check in", "arrival", "movement"]),
  entry("Appointment Follow-up", "Appointments", "/appointments?section=follow-up", "Live", "Confirmation calls, reminders, reschedules, and customer callbacks.", "Use for follow-up and reschedule work.", ["appointment follow up", "confirmations", "reschedule"], ["calls", "reminders", "callbacks"]),
  entry("Appointment Exceptions", "Appointments", "/appointments?section=exceptions", "Live", "Overbooking, conflicts, stale drafts, no-shows, and manager attention.", "Use when appointment work is blocked or risky.", ["appointment exceptions", "overbooking", "conflicts"], ["manager", "no show", "stale"]),
  entry("Appointment Templates & Rules", "Appointments", "/settings/appointments/catalog", "Manager", "Appointment purposes, templates, scheduling rules, and policy setup.", "Manager/admin access may be required.", ["appointment templates", "appointment rules", "purpose catalog"], ["settings", "automation", "policy"]),

  entry("Sales Console", "Sales", "/sales", "Live", "Enterprise sales console for leads, deal desk, inventory intelligence, and manager command.", "Use for sales and revenue execution work.", ["sales", "sales console", "deal desk", "revenue"], ["leads", "inventory", "manager command"]),
  entry("Sales Tasks", "Sales", "/tasks?department=SALES", "Live", "Task-level lead, negotiation, and delivery work.", "Use for sales department task work.", ["sales tasks", "sales queue"], ["lead", "delivery", "negotiation"]),
  entry("Growth Console", "Marketing", "/growth", "Live", "Marketing and advertising command center for campaigns, audiences, approvals, and results.", "Use for campaign and growth work.", ["growth", "marketing", "advertising", "campaigns"], ["audience", "approval", "results"]),
  entry("Marketing Tasks", "Marketing", "/tasks?department=MARKETING", "Live", "Marketing campaigns, content, and audience work.", "Use for marketing task queues.", ["marketing tasks", "campaign tasks"], ["content", "audience"]),
  entry("Advertising Tasks", "Marketing", "/tasks?department=ADVERTISING", "Live", "Vehicle listings and paid promotion work.", "Use for advertising task queues.", ["advertising tasks", "ads", "listings"], ["paid promotion", "vehicles"]),

  entry("Operations Coordinator", "Operations", "/operations-coordinator", "Live", "Front-door loop for arrivals, paperwork, routed work, and safe peeks.", "Use for coordinator workflows.", ["operations coordinator", "front desk", "coordinator"], ["arrivals", "paperwork", "routing"]),
  entry("Paperwork Center", "Operations", "/operations-coordinator#paperwork-command-center", "Live", "Prepare sales, finance, insurance, rental, payment, and document packets.", "Use from Operations Coordinator for paperwork support.", ["paperwork", "paperwork center", "packets"], ["sales", "finance", "insurance", "rental", "payment"]),
  entry("Document Library", "Documents", "/documents", "Live", "Source-of-truth packets, requirements, review, and document archive.", "Use for document lookup and archive work.", ["documents", "document library", "files", "packets"], ["requirements", "archive", "upload"]),
  entry("Upload Customer Document", "Documents", "/crm-next/actions/upload-document", "Limited", "Attach customer files through Customer Console workflow.", "Customer context is required.", ["upload document", "customer document", "upload doc"], ["crm", "file", "attachment"]),

  entry("Manager Workspace", "Management", "/manager-workspace", "Manager", "Executive direction, operating intervention, and personal execution.", "Manager access required.", ["workspace launcher", "manager workspace", "ceo coo my work"], ["decisions", "intervention", "executive"]),
  entry("Manager Review", "Management", "/manager-review", "Manager", "Approvals, exceptions, escalations, and manager decision queues.", "Manager access required for governed decisions.", ["manager review", "approval", "exception", "escalation"], ["authorize", "hold", "decision"]),
  entry("Command Center", "Management", "/command-center", "Manager", "Company-wide operating command and cross-team visibility.", "Manager access may be required.", ["ccc", "command center", "home"], ["operations", "visibility"]),
  entry("Team", "Management", "/staff", "Manager", "Team duties and execution context.", "Manager access may be required.", ["team", "staff", "duties"], ["roles", "execution"]),
  entry("Administration", "Management", "/administration", "Manager", "Staff accounts, roles, duties, templates, and access control.", "Admin access required.", ["admin", "administration", "access"], ["roles", "permissions", "templates"]),
  entry("Settings", "Management", "/settings", "Manager", "Dispatch generation and board settings.", "Admin access required.", ["settings", "configuration"], ["board", "generation"]),
  entry("Time & Attendance", "Operations", "/time-attendance", "Live", "Time cards, corrections, review, and payroll handoff.", "Use for timekeeping work.", ["time", "attendance", "time card", "clock in"], ["payroll", "corrections", "shift"]),
  entry("Activity", "Operations", "/activity", "Live", "Recorded Dispatch events and updates.", "Use for audit/history review.", ["activity", "timeline", "events", "updates"], ["history", "audit"]),
  entry("Reports", "Reports", "/reports", "Live", "Governed reporting and operating views.", "Use for reporting context.", ["reports", "reporting", "analytics"], ["scorecards", "metrics"]),
  entry("Workflow finder", "Command", undefined, "Live", "Find where a workflow or tool lives in Dispatch Board.", "Available in the Dispatch header.", ["workflow search", "tool finder", "launcher"], ["availability", "adoption", "route"])
];

export function searchWorkflowFinder(query: string, limit = 18): WorkflowFinderResult[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];

  return workflowFinderRegistry
    .map((workflow) => ({ ...workflow, score: scoreWorkflow(workflow, tokens, normalize(query)) }))
    .filter((workflow) => workflow.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, limit);
}

function entry(
  title: string,
  category: string,
  href: string | undefined,
  status: WorkflowFinderStatus,
  description: string,
  prerequisite: string,
  aliases: string[],
  keywords: string[]
): WorkflowFinderEntry {
  return { aliases, category, description, href, keywords, prerequisite, status, title };
}

function normalize(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(value: string) {
  return normalize(value).split(/\s+/).filter((token) => token && !stopWords.has(token));
}

function scoreWorkflow(workflow: WorkflowFinderEntry, tokens: string[], normalizedQuery: string) {
  const title = normalize(workflow.title);
  const category = normalize(workflow.category);
  const status = normalize(workflow.status);
  const description = normalize(workflow.description);
  const aliases = workflow.aliases.map(normalize);
  const keywords = workflow.keywords.map(normalize);
  const titleTokens = tokenize(workflow.title);
  const aliasTokens = aliases.flatMap(tokenize);
  const keywordTokens = keywords.flatMap(tokenize);
  const descriptionTokens = tokenize(workflow.description);

  let score = 0;
  if (title === normalizedQuery) score += 140;
  else if (title.includes(normalizedQuery)) score += 90;
  if (aliases.some((alias) => alias === normalizedQuery)) score += 130;
  else if (aliases.some((alias) => alias.includes(normalizedQuery))) score += 85;
  if (keywords.some((keyword) => keyword.includes(normalizedQuery))) score += 60;

  for (const token of tokens) {
    const tokenScore = Math.max(
      tokenScoreFor(token, title, titleTokens, 34, 24),
      tokenScoreFor(token, aliases.join(" "), aliasTokens, 30, 22),
      tokenScoreFor(token, keywords.join(" "), keywordTokens, 24, 18),
      tokenScoreFor(token, category, tokenize(category), 18, 14),
      tokenScoreFor(token, status, tokenize(status), 12, 8),
      tokenScoreFor(token, description, descriptionTokens, 10, 7)
    );
    if (tokenScore === 0) return 0;
    score += tokenScore;
  }
  return score;
}

function tokenScoreFor(token: string, text: string, words: string[], exactScore: number, fuzzyScore: number) {
  if (text.includes(token)) return exactScore;
  if (token.length < 5) return 0;
  return words.some((word) => isCloseToken(token, word)) ? fuzzyScore : 0;
}

function isCloseToken(input: string, candidate: string) {
  if (candidate.includes(input) || input.includes(candidate)) return true;
  const maxDistance = input.length > 8 ? 2 : 1;
  return levenshtein(input, candidate) <= maxDistance;
}

function levenshtein(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const oldDiagonal = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (left[i - 1] === right[j - 1] ? 0 : 1)
      );
      diagonal = oldDiagonal;
    }
  }
  return previous[right.length];
}
