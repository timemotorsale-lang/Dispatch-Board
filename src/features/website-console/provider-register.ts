export type ProviderRequirement = "Foundation" | "Conditional" | "Optional" | "Deferred";
export type ProviderEntry = {
  id: string;
  title: string;
  requirement: ProviderRequirement;
  status: "Decision required" | "Reuse assessment" | "Preview only" | "Deferred";
  why: string;
  unlocks: string;
  direction: string;
  owner: string;
  dependencies: string[];
  setup: string[];
  acceptance: string;
  links: { label: string; href: string }[];
};

export const providerRegisterVersion = "1.1";
export const providerReferencesReviewed = "October 24, 2026";

export const providerRegister: ProviderEntry[] = [
  {
    id: "hosting", title: "Domain, hosting & recovery", requirement: "Foundation", status: "Reuse assessment",
    why: "Customers need a reliable public address and a production environment separate from staff-only tools and sample data.",
    unlocks: "Public website access, HTTPS, predictable capacity and recovery after failure.",
    direction: "Review existing hosting, storage and contracts before choosing a domain registrar, DNS or hosting provider. No new vendor is selected.", owner: "Owner + infrastructure administrator",
    dependencies: [], setup: ["Inventory the server, database, storage, DNS ownership and existing bills.", "Approve the public domain, TLS, production/sample separation, capacity limits and monitoring.", "Approve off-server backups, retention, recovery objectives and a restore test.", "Resolve the installed framework security advisory before public release."],
    acceptance: "A monitored production deployment, verified domain and successful restore drill—not merely a running local preview.", links: []
  },
  {
    id: "accounts", title: "Customer accounts & My Garage", requirement: "Foundation", status: "Decision required",
    why: "The anonymous preview cookie is not production authentication or cross-device account access.", unlocks: "Secure sign-in, recovery, saved requests and access to the correct customer's records.",
    direction: "Evaluate Auth0 or an approved existing identity system. Customer accounts must not grant staff access. Social sign-in is optional.", owner: "Owner + application/security lead",
    dependencies: ["hosting", "email"], setup: ["Confirm supported sign-in, recovery, MFA and account-deletion requirements.", "Obtain approved development and production tenants and integration access.", "Configure allowed origins and callbacks on the approved domain.", "Implement customer-record authorization and safe account linking; sign-in alone is not ownership verification."],
    acceptance: "Test recovery and cross-device access; an unrelated account cannot read another customer's requests or documents.", links: [{ label: "Review Auth0 passwordless options", href: "https://auth0.com/features/passwordless" }]
  },
  {
    id: "email", title: "Transactional email", requirement: "Foundation", status: "Decision required",
    why: "Customers need real confirmations and status messages; saving a preview record currently sends nothing.", unlocks: "Sign-in messages, request receipts, document requests and status notifications.",
    direction: "Evaluate SendGrid or reuse an approved transactional sender. A normal staff inbox is not automatically a reliable application-mail service.", owner: "Owner + communications/application lead",
    dependencies: ["hosting"], setup: ["Check existing email service contracts and sender-domain ownership.", "Approve the sender identity, authentication records, templates and permitted message types.", "Store credentials in the approved secret manager; configure delivery/bounce events.", "Implement retries, deduplication and suppression handling, without mixing marketing consent with service messages."],
    acceptance: "A real test receipt reaches the intended recipient; bounces and retries are observable and no sensitive financial data is emailed.", links: [{ label: "Review SendGrid transactional email", href: "https://www.twilio.com/docs/sendgrid/for-developers/sending-email/getting-started-with-transactional-emails" }]
  },
  {
    id: "sms", title: "SMS & two-way customer messages", requirement: "Conditional", status: "Decision required",
    why: "Texting needs a real sending service, approved sender setup and consent controls—not just a phone-number field.", unlocks: "Opted-in reminders and conversations when this channel is enabled.",
    direction: "Evaluate Twilio or the dealership's existing messaging service. SMS can remain disabled while email and phone-call workflows operate.", owner: "Sales/service leads + communications administrator",
    dependencies: ["hosting", "staff-bridge"], setup: ["Inventory existing dealership numbers and messaging contracts.", "Confirm business/sender registration, two-way support, costs and usage limits.", "Approve consent, opt-out, quiet-hours and routing policies with appropriate review.", "Wire delivery events, opt-outs and conversation ownership into the staff workflow."],
    acceptance: "Inbound/outbound messages route correctly; opting out prevents further messages according to the approved policy.", links: [{ label: "Review Twilio email/SMS messaging concepts", href: "https://sendgrid.com/en-us/resource/marketing-and-transactional-email" }]
  },
  {
    id: "storage", title: "Private photos & document storage", requirement: "Foundation", status: "Decision required",
    why: "Selected appraisal photos currently stay in one tab. Sensitive documents must not be placed in public website media folders.", unlocks: "Secure uploads, authorized staff review and controlled customer access.",
    direction: "Evaluate Amazon S3 or approved existing private object storage after the hosting review. Storage is only one part of the upload workflow.", owner: "Infrastructure/security lead + records owner",
    dependencies: ["hosting", "accounts"], setup: ["Approve private/public media separation, encryption, region, retention and deletion rules.", "Configure restricted storage access and short-lived upload/download permissions.", "Build file validation, malware quarantine/scanning and image-metadata handling.", "Set upload/storage limits, audit trails and backup/recovery arrangements."],
    acceptance: "Unauthorized downloads fail; unsafe files remain quarantined; expired access links fail; removal and recovery are tested.", links: [{ label: "Review Amazon S3 restricted uploads", href: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html" }]
  },
  {
    id: "staff-bridge", title: "Website-to-staff sales & service delivery", requirement: "Foundation", status: "Reuse assessment",
    why: "A website request is not operational until it reaches the accountable staff team and delivery can be confirmed.", unlocks: "Real sales/appraisal requests, service routing, assigned work and customer status updates.",
    direction: "Build the bridge into the existing app's canonical workflows. Do not buy a duplicate CRM merely to make the website form work.", owner: "Shared sales team + service team + application lead",
    dependencies: ["hosting"], setup: ["Confirm the canonical customer/request records and permission boundaries.", "Implement durable intake, duplicate protection, outbox/retries and receipt acknowledgments.", "Assign sales versus service ownership, escalation and response policies.", "Keep samples isolated; reconcile failures instead of claiming successful delivery."],
    acceptance: "An authorized staff member receives one request, retries do not create duplicates, and the customer sees truthful delivery status.", links: []
  },
  {
    id: "financing", title: "Finance applications & lender connections", requirement: "Conditional", status: "Decision required",
    why: "The 8% planning calculator is not a credit application, lender decision or confirmed APR.", unlocks: "Dealer-arranged finance applications, lender decisions and supported funding workflows.",
    direction: "Evaluate RouteOne or Dealertrack, beginning with existing contracts and participating lenders. Neither platform guarantees credit approval or custom-website API access.", owner: "Owner + designated finance manager",
    dependencies: ["accounts", "storage", "staff-bridge"], setup: ["Identify existing lender/dealer agreements and finance-platform accounts.", "Confirm custom-site API or hosted-flow rights, supported lenders, sandbox access and costs.", "Approve disclosures, application handling, roles and lender-specific requirements.", "Keep sensitive finance information in the approved flow; implement verified decisions and funding reconciliation."],
    acceptance: "A supported sandbox application reaches the right lender workflow; pending, declined and approved states stay distinct from funded.", links: [{ label: "Review RouteOne dealer services", href: "https://www.routeone.com/dealers" }, { label: "Review Dealertrack", href: "https://us.dealertrack.com/" }]
  },
  {
    id: "signing", title: "Electronic documents & signatures", requirement: "Conditional", status: "Decision required",
    why: "An electronic signature button does not establish that the transaction's documents and lender requirements support remote completion.", unlocks: "Supported remote document review, signatures, completed copies and signing evidence.",
    direction: "Assess contracting already included with the finance platform before purchasing a separate signature service. Confirm every required document's supported process.", owner: "Finance manager + approved paperwork/compliance reviewer",
    dependencies: ["accounts", "storage", "purchase-controls"], setup: ["Inventory the cash and finance document packages, originals and lender/state requirements.", "Confirm remote signing, templates, API rights and completed-document export.", "Approve signer identification, co-buyer handling and evidence retention.", "Verify signed-event authenticity; distinguish unsigned, signed, voided and superseded versions."],
    acceptance: "All required parties sign the correct approved version; completed documents and evidence can be retrieved without falsely treating signing as funding.", links: [{ label: "Review RouteOne eContracting", href: "https://www.routeone.com/dealers/contracting/econtracting" }, { label: "Review Dealertrack digital contracting", href: "https://us.dealertrack.com/content/dealertrack/en/contracting-solutions/digital-contracting-with-dealers.html" }]
  },
  {
    id: "payments", title: "Online deposits & payment processing", requirement: "Conditional", status: "Decision required",
    why: "Real payment collection needs an approved merchant account, verified transaction events and reconciliation.", unlocks: "Approved deposits or online payments, refunds and payment status—not automatic vehicle release.",
    direction: "Review the existing processor/bank first. Stripe is a candidate only after dealership eligibility, transaction types, limits and economics are confirmed. ACH is delayed and can fail or be disputed.", owner: "Owner + finance/bookkeeping lead",
    dependencies: ["hosting", "accounts", "purchase-controls"], setup: ["Approve deposit amounts, refund/cancellation rules, reservation rules and permitted payment methods.", "Confirm processor underwriting, limits, payout schedules, dispute terms and total fees.", "Use approved hosted/tokenized payment collection; never collect raw card/bank details in our forms.", "Configure signed events, duplicate protection, refunds, pending/failed states and ledger reconciliation."],
    acceptance: "Success, failure, duplicate events, refunds and disputes are tested; a browser redirect never becomes proof of cleared funds or an exclusive hold.", links: [{ label: "Review Stripe ACH behavior and eligibility", href: "https://docs.stripe.com/payments/ach-direct-debit" }]
  },
  {
    id: "bank-funding", title: "Dealership bank, lender funding & payoffs", requirement: "Foundation", status: "Reuse assessment",
    why: "Cash purchases, lender-funded sales and vehicles with outstanding loans still need a verified money-movement and reconciliation process.", unlocks: "Confirmed funds, approved seller payments/payoffs and controlled handoff.",
    direction: "Reuse the dealership's bank and lender relationships. An online payment processor is not a universal substitute for funding and payoff operations.", owner: "Owner + finance/bookkeeping lead",
    dependencies: ["purchase-controls"], setup: ["Document approved incoming-funds and outgoing-payment methods.", "Define settlement/return risks and the evidence required before vehicle release.", "Confirm lender/lessor payoff handling and who may approve seller payments.", "Determine whether any bank integration is necessary; a controlled staff process may be appropriate initially."],
    acceptance: "Money records reconcile to approved evidence and only authorized staff can approve the next financial or release step.", links: []
  },
  {
    id: "identity", title: "Transaction identity & fraud verification", requirement: "Conditional", status: "Decision required",
    why: "Remote signing or financial workflows may need more assurance than account sign-in or a scanned ID barcode.", unlocks: "The approved identity checks for sensitive transactions—not ownership proof or a browsing requirement.",
    direction: "Review checks included with finance/signing services first. Persona is a candidate if a separate service is justified. Collect only the information needed for the approved purpose.", owner: "Finance manager + security/compliance reviewer",
    dependencies: ["accounts", "storage"], setup: ["Define which actions require identity checks and the manual-review alternative.", "Confirm supported IDs, accessibility, data retention and privacy/consent requirements.", "Obtain sandbox access and approved production entitlements.", "Implement verified results, failed/inconclusive states and restricted staff review."],
    acceptance: "Passing sign-in, extracting an ID or completing a selfie is never treated as vehicle ownership, credit approval or authority to release a vehicle.", links: [{ label: "Review Persona verification types", href: "https://docs.withpersona.com/verification-types" }]
  },
  {
    id: "registration", title: "Minnesota tax, title & registration", requirement: "Foundation", status: "Reuse assessment",
    why: "Draft tax/transfer assumptions do not cover every vehicle's registration, plate, local-charge or paperwork scenario.", unlocks: "Reviewed final fees and an approved path to completed title/registration work.",
    direction: "Identify the current title/registration service, bank/lien processes and paperwork provider. Verify Minnesota support before choosing an electronic integration. A generic sales-tax plugin is not a vehicle fee engine.", owner: "Finance/title clerk + owner",
    dependencies: ["purchase-controls"], setup: ["Record the current service/vendor and approved dealership process.", "Validate Minnesota-specific fee coverage, applicability, tax exceptions and any future trade-credit rules.", "Confirm electronic submission rights, required originals and correction/rejection handling.", "Approve final quote disclosures; retain the owner and finance-manager approval gates."],
    acceptance: "Applicable fees and documents are reviewed for the actual transaction; unsupported scenarios route to staff instead of silently receiving a zero fee.", links: [{ label: "Review MN vehicle sales tax guidance", href: "https://www.revenue.state.mn.us/guide/motor-vehicle-sales" }]
  },
  {
    id: "purchase-controls", title: "Inventory, quotes, reservations & release", requirement: "Foundation", status: "Reuse assessment",
    why: "Provider subscriptions cannot prevent overselling, approve a quote or decide that a vehicle is safe and authorized for release.", unlocks: "Canonical inventory publication, governed purchase states, approved quotes and accountable handoff.",
    direction: "Implement these controls inside the existing app; keep one source of truth. No additional website builder, duplicate inventory system or new CRM is required by this design.", owner: "Owner + sales/operations leads + application lead",
    dependencies: ["staff-bridge"], setup: ["Build the approved public inventory projection, sold/withdrawn updates and freshness reconciliation.", "Define quote versions, approvals and reservation expiry/cancellation policy.", "Implement atomic/exclusive holds where approved, without confusing payment with a hold.", "Require the actual funding, title, paperwork and readiness evidence before authorized release."],
    acceptance: "Concurrent buyers cannot receive conflicting commitments, stale/sold vehicles cannot proceed, and audited staff approvals—not customer clicks—control release.", links: []
  },
  {
    id: "vin", title: "VIN decoding", requirement: "Optional", status: "Preview only",
    why: "Basic decoding reduces typing during appraisal and vehicle entry, with a manual alternative when facts are incomplete.", unlocks: "VIN-assisted year/make/model and available basic specifications.",
    direction: "The protected preview already uses NHTSA vPIC. No commercial decoder subscription is required for the current basic workflow.", owner: "Application lead",
    dependencies: ["hosting"], setup: ["Retain fixed-origin requests, timeouts, response limits, manual fallback and user confirmation.", "Review production rate limits, availability and data-sharing notices.", "Do not infer color, installed options, condition, ownership or price from missing decoder data."],
    acceptance: "Malformed, partial and unavailable results remain honest; basic decoding never grants access to private dealership history.", links: [{ label: "Review NHTSA vPIC API", href: "https://vpic.nhtsa.dot.gov/api/" }]
  },
  {
    id: "imagery", title: "Licensed VIN-associated vehicle imagery", requirement: "Optional", status: "Decision required",
    why: "VIN decoding does not provide the representative vehicle photo shown in the appraisal examples.", unlocks: "Representative year/make/model images alongside the appraisal, where a licensed match exists.",
    direction: "Evaluate EVOX. Confirm coverage, licensing, VIN mapping, custom-site access, display/caching rights and pricing before subscribing. Customer photos and the silhouette remain valid fallbacks.", owner: "Owner + merchandising/application lead",
    dependencies: ["vin"], setup: ["Request a coverage/licensing quote for the actual website and expected usage.", "Obtain documentation and test credentials; verify representative-image matching and permitted hosting.", "Keep the representative-image disclaimer and never invent vehicle-specific color or equipment.", "Keep real inventory photographs distinct from representative catalog images."],
    acceptance: "Wrong or unavailable matches fall back safely; licensing and attribution rules are respected; a customer-selected photo can take precedence.", links: [{ label: "Review EVOX imagery API and contact options", href: "https://www.evoximages.com/evox-api-ec/" }]
  },
  {
    id: "valuation", title: "Automated appraisal / valuation data", requirement: "Optional", status: "Decision required",
    why: "An instant price needs a licensed valuation source and an approved offer policy. The present workflow has neither.", unlocks: "Market-supported valuation or automated offers only after separate approval.",
    direction: "Staff-reviewed appraisals can operate without this subscription once staff delivery is built. Evaluate AccuTrade if automation is justified; custom integration rights must be confirmed.", owner: "Owner + appraisal/buying manager",
    dependencies: ["staff-bridge", "vin", "purchase-controls"], setup: ["Confirm existing appraisal subscriptions before adding another.", "Verify VIN/condition coverage, API or hosted-flow access, costs and any guarantee conditions.", "Approve who may issue offers, conditions, expiry and inspection adjustments.", "Do not show a value tracker or recurring market updates without a real data source and notification policy."],
    acceptance: "Customer-visible amounts originate from the approved source/authorized staff and carry their actual conditions and expiration—not invented sample values.", links: [{ label: "Review AccuTrade appraisal services", href: "https://www.carscommerce.inc/accutrade/" }]
  },
  {
    id: "history", title: "Vehicle-history reports", requirement: "Optional", status: "Reuse assessment",
    why: "VIN decoding and customer condition answers cannot establish accident history or replace a licensed history report.", unlocks: "Authorized vehicle-history information or report links when available.",
    direction: "Identify the dealership's current vehicle-history subscription and website-display rights before choosing a new provider.", owner: "Owner + merchandising/title lead",
    dependencies: ["purchase-controls"], setup: ["Inventory report contracts and permitted customer-facing use.", "Confirm VIN lookup, report-link/API access, update behavior and costs.", "Handle missing reports without implying a clean history; review public claims before publishing."],
    acceptance: "Only licensed, appropriately current report information is shown, with no inferred accident-free or clean-title claims.", links: []
  },
  {
    id: "scheduling", title: "Appointments & staff calendars", requirement: "Conditional", status: "Reuse assessment",
    why: "A customer's preferred time is not a confirmed test-drive, appraisal or service slot.", unlocks: "Confirmed booking only when staff availability and operating rules are connected.",
    direction: "Reuse the existing calendar where suitable. Staff-confirmed appointment requests do not require a separate booking subscription.", owner: "Sales team + service team",
    dependencies: ["staff-bridge", "email"], setup: ["Approve separate sales and service hours, staffing, buffers and booking rules.", "Confirm the calendar's integration permissions and resource ownership.", "Implement conflict checks, staff confirmation, rescheduling/cancellation and reminders."],
    acceptance: "Unavailable slots cannot be double-booked and customers can distinguish requested from confirmed appointments.", links: []
  },
  {
    id: "service-operations", title: "Service operations & repair authorization", requirement: "Conditional", status: "Preview only",
    why: "A saved service request is not an advisor-reviewed appointment, diagnosis, estimate or authorization for paid repairs.",
    unlocks: "Accountable service intake, confirmed visits and customer-approved work when the actual service operations system is connected.",
    direction: "Assess the dealership's existing service/repair-order system first. No new service-management vendor is selected; a calendar subscription alone does not complete this workflow.", owner: "Service manager + owner + application/security lead",
    dependencies: ["staff-bridge", "scheduling", "accounts", "email", "storage", "monitoring"],
    setup: ["Approve supported service work, service hours, advisor ownership, capacity and scheduling conflict rules.", "Connect a durable advisor queue with deduplication, acknowledged delivery, failure alerts and authorized customer status updates.", "Review diagnostic charges, written estimates, separate repair authorization and the record of who approved each scope change.", "Define rescheduling/cancellation, retention, customer access, collection/release and any approved transport arrangements.", "Verify that driving concerns do not silently book a drive-in visit or dispatch towing; publish an approved escalation process."],
    acceptance: "An end-to-end test proves advisor receipt, conflict-safe confirmation, separately recorded repair consent, access isolation, recovery from failed delivery and no false live status.", links: []
  },
  {
    id: "transport", title: "Delivery, pickup & transport partners", requirement: "Conditional", status: "Decision required",
    why: "Online buying does not automatically mean home delivery, nationwide pickup or towing is offered.", unlocks: "Only the delivery/pickup services and locations actually approved by the dealership.",
    direction: "No transport vendor is required if launch uses an approved in-store handoff. Add partners only if the business elects to offer transport.", owner: "Owner + operations lead",
    dependencies: ["purchase-controls", "bank-funding", "scheduling"], setup: ["Approve geographic coverage, insurance/responsibilities, pricing and cancellation terms.", "Confirm partner agreements and whether an API is needed.", "Tie dispatch and final handoff to verified release readiness."],
    acceptance: "The website promises only approved services, and no transport is dispatched before authorized release.", links: []
  },
  {
    id: "monitoring", title: "Monitoring, security & incident response", requirement: "Foundation", status: "Reuse assessment",
    why: "An enterprise website needs failures, unauthorized access, lost requests and storage growth to be noticed and recoverable.", unlocks: "Actionable alerts, incident ownership and operational confidence after launch.",
    direction: "Audit existing monitoring and security tools before adding subscriptions. Hosting and storage choices determine the appropriate services.", owner: "Infrastructure/security lead + owner",
    dependencies: ["hosting", "staff-bridge", "storage"], setup: ["Define uptime, request-delivery, storage/capacity and backup alerts.", "Configure least-privilege access, secret rotation, dependency updates and redacted logs.", "Document incident response and restore/runbook ownership.", "Approve analytics/cookie use separately; never send sensitive purchase or ID data to general analytics."],
    acceptance: "A simulated outage or failed request alerts the accountable person; logs exclude secrets/financial/ID data and recovery is demonstrated.", links: []
  },
  {
    id: "ai", title: "AI agents & advanced automation", requirement: "Deferred", status: "Deferred",
    why: "Agents may assist later, but they do not replace the transaction providers, staff accountability or approval controls.", unlocks: "Approved assistance and automation only after a separate design and vendor review.",
    direction: "No AI provider subscription is required to complete the core buying guide. Public BHPH, license-plate lookup and recurring value tracking remain outside the current launch configuration.", owner: "Owner + application/security lead",
    dependencies: ["staff-bridge", "purchase-controls"], setup: ["Define allowed tasks, data access, spending limits and human escalation.", "Select and approve a provider only after privacy, retention, quality and cost review.", "Keep pricing, credit decisions, payments, legal commitments and release actions behind explicit authorized controls."],
    acceptance: "No agent can silently approve financing, change an offer, collect money or release a vehicle.", links: []
  }
];

export function filterProviderRegister(query: string, requirement: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return providerRegister.filter(entry => (requirement === "All" || entry.requirement === requirement) && words.every(word => [entry.title, entry.why, entry.unlocks, entry.direction, entry.owner, ...entry.setup, ...entry.links.map(link => link.label)].join(" ").toLowerCase().includes(word)));
}
