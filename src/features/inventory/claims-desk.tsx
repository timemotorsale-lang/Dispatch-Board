"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useRef, useState } from "react";

import { INSURANCE_CLAIM_INTAKE_FORM_PACKET } from "@/lib/insurance-claim-intake-form-packet";
import type { ClaimsDeskReadModel } from "@/server/claims-workspace/service";

import styles from "./claims-desk.module.css";

type DeskClaimCandidate = ClaimsDeskReadModel["claims"][number];
type DeskQueueFilter = ClaimsDeskReadModel["filters"][number]["id"] | "needsAction";
type DeskWorkbenchTool = "start" | "find" | "documents";
type DeskInsightPanel = "tasks" | "status" | "guardrails" | "timeline" | "documents" | "money" | "templates";

const claimCandidates: Array<Omit<DeskClaimCandidate, "href">> = [
  {
    action: "Open",
    blocker: "Adjuster needed",
    blockerTone: "warning",
    claim: "MN-48291",
    customer: "Deqo Roble",
    detail: "2018 Toyota Camry - 4T1B11HK",
    provider: "State Farm",
    queueTags: ["waitingCarrier"]
  },
  {
    action: "Resume",
    blocker: "Identity gap",
    blockerTone: "danger",
    claim: "Draft",
    customer: "Abdi Hassan",
    detail: "2016 Honda Accord - plate HJA-221",
    provider: "Carrier unknown",
    queueTags: ["blocked"]
  },
  {
    action: "Open",
    blocker: "Ready for RO",
    blockerTone: "good",
    claim: "IL-22804",
    customer: "Maria Lopez",
    detail: "2020 Nissan Rogue - RO-10482",
    provider: "Progressive",
    queueTags: ["readyHandoff"]
  }
] as const;

const defaultDeskInsights = {
  commandCenter: {
    indexedRecords: claimCandidates.length,
    placeholder: "Search claim, customer, VIN, plate, carrier, blocker, invoice, rental, or document...",
    scopes: ["Claims", "Vehicles", "Documents", "Money", "Tasks", "Timeline"]
  },
  documentShortcuts: [
    { actionLabel: "Open authorization queue", count: 2, detail: "Signed authorization needed before repair handoff.", label: "Authorizations", tone: "warning" },
    { actionLabel: "Open photo queue", count: 1, detail: "Damage, VIN, and odometer evidence for handoff.", label: "Photo evidence", tone: "warning" },
    { actionLabel: "Open estimate queue", count: 2, detail: "Carrier estimate, supplement, or internal appraisal support.", label: "Estimates", tone: "warning" },
    { actionLabel: "Open payment queue", count: 3, detail: "Payment proof, deductible support, and closeout recovery.", label: "Payment proof", tone: "info" }
  ],
  executionCards: [
    { actionLabel: "Send / upload authorization", detail: "Deqo Roble - Repair handoff is blocked until authorization is complete.", id: "claim-demo-1", ownerRole: "Service advisor", title: "Missing authorization", tone: "warning" },
    { actionLabel: "Assign owner", detail: "Abdi Hassan - Claim has no accountable owner.", id: "claim-demo-2", ownerRole: "Manager", title: "Missing owner", tone: "danger" },
    { actionLabel: "Open repair order", detail: "Maria Lopez - Required intake and evidence gates are satisfied.", id: "claim-demo-3", ownerRole: "Service advisor", title: "Ready for repair order", tone: "good" }
  ],
  financialExceptions: [
    { actionLabel: "Review rentals", amountLabel: "0 open", detail: "Rental support exists without approved-days or extension documentation.", label: "Daily rental risk", tone: "good" },
    { actionLabel: "Complete packets", amountLabel: "3 blocked", detail: "Invoice packet still missing payer, authorization, estimate, or final RO support.", label: "Blocked billing", tone: "warning" },
    { actionLabel: "Send invoices", amountLabel: "0 ready", detail: "Recovery packets ready for carrier or warranty billing.", label: "Ready to bill", tone: "info" },
    { actionLabel: "Audit short-pay", amountLabel: "0 watch", detail: "Payment proof exists before the recovery packet is complete.", label: "Short-pay watch", tone: "good" }
  ],
  guardrails: [
    { enforced: true, label: "Repair handoff gate", reason: "Authorization, photos, claim identity, and owner must be complete before repair handoff.", tone: "warning" },
    { enforced: false, label: "Duplicate claim prevention", reason: "Exact claim numbers and strong VIN matches require review before creating another record.", tone: "good" },
    { enforced: true, label: "Invoice packet gate", reason: "Carrier billing stays blocked until payer contact, authorization, estimate, and final invoice support are ready.", tone: "warning" }
  ],
  statusSignals: [
    { count: 1, detail: "Claims blocked before repair handoff.", label: "Authorization gaps", tone: "warning" },
    { count: 1, detail: "Claims without an accountable owner.", label: "Owner gaps", tone: "danger" },
    { count: 1, detail: "Claims ready to move into repair order execution.", label: "Ready handoffs", tone: "good" },
    { count: 0, detail: "Daily rentals needing extension or approved-days support.", label: "Rental risk", tone: "good" }
  ],
  templates: [
    { body: "Call carrier, confirm adjuster contact, claim status, estimate timing, rental responsibility, and next approval step.", channel: "Call", label: "Carrier adjuster call", requiredContext: ["Carrier", "Claim number", "Policy number", "Vehicle"] },
    { body: "Please sign the repair authorization so we can communicate with the carrier and move the claim toward repair handoff.", channel: "SMS", label: "Authorization request", requiredContext: ["Customer", "Claim", "Authorization document"] },
    { body: "Invoice packet is ready for review: estimate, authorization, final repair support, deductible status, and rental support.", channel: "Email", label: "Carrier invoice packet", requiredContext: ["Estimate", "Authorization", "Final invoice", "Payment instructions"] },
    { body: "Manager review requested for claim exception before handoff, billing, or closeout proceeds.", channel: "Internal", label: "Manager exception", requiredContext: ["Blocker", "Reason", "Requested owner"] }
  ],
  timeline: [
    { atLabel: "Now", detail: "Deqo Roble - Repair handoff is blocked until authorization is complete.", label: "Get authorization signed", tone: "warning" },
    { atLabel: "Today", detail: "Abdi Hassan - Claim has no accountable owner.", label: "Assign claim owner", tone: "danger" },
    { atLabel: "Today", detail: "Maria Lopez - Required intake and evidence gates are satisfied.", label: "Open or link repair order", tone: "good" }
  ]
} satisfies Pick<ClaimsDeskReadModel, "commandCenter" | "documentShortcuts" | "executionCards" | "financialExceptions" | "guardrails" | "statusSignals" | "templates" | "timeline">;

function Badge({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "good" | "warning" | "danger" }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

function normalizeClaimSearch(value: string) {
  return value.trim().toLowerCase();
}

function claimCandidateMatches(candidate: DeskClaimCandidate, query: string) {
  const terms = normalizeClaimSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const searchableText = [
    candidate.action,
    candidate.blocker,
    candidate.claim,
    candidate.customer,
    candidate.detail,
    candidate.provider,
    ...candidate.queueTags
  ].join(" ").toLowerCase();

  return terms.every((term) => searchableText.includes(term));
}

export function ClaimsDesk({ initialTool = "start", model }: { initialTool?: DeskWorkbenchTool; model?: ClaimsDeskReadModel }) {
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<DeskQueueFilter>("all");
  const [activeTool, setActiveTool] = useState<DeskWorkbenchTool>(initialTool);
  const [activeInsight, setActiveInsight] = useState<DeskInsightPanel>("tasks");
  const [claimSearchInput, setClaimSearchInput] = useState("");
  const [claimSearchQuery, setClaimSearchQuery] = useState("");
  const [commandSearchInput, setCommandSearchInput] = useState("");
  const [commandSearchQuery, setCommandSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const customerNameRef = useRef<HTMLInputElement>(null);
  const intakeRef = useRef<HTMLElement>(null);
  const workbenchRef = useRef<HTMLElement>(null);
  const candidates = model?.claims ?? claimCandidates.map((candidate) => ({ ...candidate, href: "/vehicles/claims-workspace" }));
  const commandCenter = model?.commandCenter ?? defaultDeskInsights.commandCenter;
  const documentShortcuts = model?.documentShortcuts ?? defaultDeskInsights.documentShortcuts;
  const executionCards = model?.executionCards ?? defaultDeskInsights.executionCards;
  const financialExceptions = model?.financialExceptions ?? defaultDeskInsights.financialExceptions;
  const guardrails = model?.guardrails ?? defaultDeskInsights.guardrails;
  const statusSignals = model?.statusSignals ?? defaultDeskInsights.statusSignals;
  const templates = model?.templates ?? defaultDeskInsights.templates;
  const timeline = model?.timeline ?? defaultDeskInsights.timeline;
  const filters = model?.filters ?? [
    { count: candidates.length, id: "all", label: "All" },
    { count: candidates.filter((candidate) => candidate.queueTags.includes("blocked")).length, id: "blocked", label: "Blocked" },
    { count: candidates.filter((candidate) => candidate.queueTags.includes("waitingCarrier")).length, id: "waitingCarrier", label: "Waiting carrier" },
    { count: candidates.filter((candidate) => candidate.queueTags.includes("readyHandoff")).length, id: "readyHandoff", label: "Ready handoff" },
    { count: 0, id: "paymentWatch", label: "Payment watch" },
    { count: 0, id: "aging", label: "Aging" }
  ] satisfies ClaimsDeskReadModel["filters"];
  const needsActionCount = candidates.filter((candidate) => candidate.blocker !== "Ready for repair order" && !candidate.queueTags.includes("readyHandoff")).length;
  const queueCandidates = activeFilter === "all"
    ? candidates
    : activeFilter === "needsAction"
      ? candidates.filter((candidate) => candidate.blocker !== "Ready for repair order" && !candidate.queueTags.includes("readyHandoff"))
      : candidates.filter((candidate) => candidate.queueTags.includes(activeFilter));
  const visibleCandidates = claimSearchQuery
    ? queueCandidates.filter((candidate) => claimCandidateMatches(candidate, claimSearchQuery))
    : queueCandidates;
  const queueLabel = activeFilter === "all"
    ? "active claim candidate"
    : activeFilter === "needsAction"
      ? "claim needing action"
      : "matching claim candidate";
  const commandMatches = commandSearchQuery
    ? candidates.filter((candidate) => claimCandidateMatches(candidate, commandSearchQuery))
    : candidates.slice(0, 3);

  function showQueue(filter: DeskQueueFilter) {
    setActiveTool("find");
    setActiveFilter(filter);
    workbenchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showIntakeForm() {
    setActiveTool("start");
    workbenchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => customerNameRef.current?.focus(), 250);
  }

  function showTool(tool: DeskWorkbenchTool) {
    setActiveTool(tool);
    workbenchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (tool === "start") window.setTimeout(() => customerNameRef.current?.focus(), 250);
  }

  function searchExistingClaims(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveTool("find");
    setClaimSearchQuery(claimSearchInput.trim());
  }

  function searchCommandCenter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCommandSearchQuery(commandSearchInput.trim());
    setClaimSearchInput(commandSearchInput.trim());
    setClaimSearchQuery(commandSearchInput.trim());
    setActiveTool("find");
    setActiveInsight("tasks");
    workbenchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearClaimSearch() {
    setClaimSearchInput("");
    setClaimSearchQuery("");
  }

  function openInsight(panel: DeskInsightPanel, tool: DeskWorkbenchTool = "find") {
    setActiveInsight(panel);
    setActiveTool(tool);
    workbenchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function startClaim(formData: FormData) {
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/claims-workspace/claims", {
        body: JSON.stringify(Object.fromEntries(formData.entries())),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Claim could not be started.");
      const claimId = payload?.readModel?.claim?.id;
      window.location.assign(claimId ? `/vehicles/claims-workspace?claimId=${encodeURIComponent(claimId)}&authorization=1` : "/vehicles/claims-workspace");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Claim could not be started.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.topbar}>
        <span className={styles.eyebrow}>Service Console / Desk a Claim</span>
        <div className={styles.topActions}>
          <button aria-pressed={activeTool === "find"} onClick={() => showTool("find")} type="button">Find existing</button>
          <button aria-pressed={activeTool === "documents"} onClick={() => showTool("documents")} type="button">Claim documents</button>
          <button aria-pressed={activeTool === "start"} onClick={showIntakeForm} type="button">Start new claim</button>
        </div>
      </div>

      <header className={styles.hero}>
        <div>
          <h1>Claim Desk Workbench</h1>
          <p>Use the buttons above to start a claim, find an existing claim, or review documents. The selected tool stays in this workspace.</p>
        </div>
      </header>

      <section className={styles.commandCenter} aria-label="Claim Desk execution intelligence">
        <div className={styles.commandHeader}>
          <div>
            <span className={styles.cardEyebrow}>Command search</span>
            <h2>Find the work, then execute the next step</h2>
          </div>
          <Badge>{commandCenter.indexedRecords} indexed records</Badge>
        </div>
        <form className={styles.commandSearch} onSubmit={searchCommandCenter} role="search" aria-label="Search across Claim Desk operations">
          <input
            onChange={(event) => setCommandSearchInput(event.target.value)}
            placeholder={commandCenter.placeholder}
            type="search"
            value={commandSearchInput}
          />
          <button type="submit">Search workspace</button>
        </form>
        <div className={styles.scopeRail} aria-label="Indexed command scopes">
          {commandCenter.scopes.map((scope) => <span key={scope}>{scope}</span>)}
        </div>
        {commandSearchQuery ? (
          <div className={styles.commandResults} aria-live="polite">
            <strong>{commandMatches.length} command result{commandMatches.length === 1 ? "" : "s"} for &quot;{commandSearchQuery}&quot;</strong>
            {commandMatches.slice(0, 3).map((candidate) => (
              <Link href={candidate.href} key={`${candidate.customer}-${candidate.claim}`}>
                <span>{candidate.customer}</span>
                <small>{candidate.claim} - {candidate.provider} - {candidate.blocker}</small>
              </Link>
            ))}
          </div>
        ) : null}
        <div className={styles.intelligenceGrid}>
          <button aria-pressed={activeInsight === "tasks"} onClick={() => openInsight("tasks")} type="button">
            <span>1</span>
            <strong>Next-action engine</strong>
            <small>{executionCards[0]?.actionLabel ?? "Review work queue"}</small>
          </button>
          <button aria-pressed={activeInsight === "status"} onClick={() => openInsight("status")} type="button">
            <span>2</span>
            <strong>Status intelligence</strong>
            <small>{statusSignals.filter((signal) => signal.count > 0).length} active signals</small>
          </button>
          <button aria-pressed={activeInsight === "guardrails"} onClick={() => openInsight("guardrails")} type="button">
            <span>3</span>
            <strong>Workflow guardrails</strong>
            <small>{guardrails.filter((guardrail) => guardrail.enforced).length} enforced gates</small>
          </button>
          <button aria-pressed={activeInsight === "timeline"} onClick={() => openInsight("timeline")} type="button">
            <span>4</span>
            <strong>Unified timeline</strong>
            <small>{timeline.length} operational events</small>
          </button>
          <button aria-pressed={activeInsight === "documents"} onClick={() => openInsight("documents", "documents")} type="button">
            <span>5</span>
            <strong>Document shortcuts</strong>
            <small>{documentShortcuts.reduce((total, item) => total + item.count, 0)} document tasks</small>
          </button>
          <button aria-pressed={activeInsight === "money"} onClick={() => openInsight("money")} type="button">
            <span>6</span>
            <strong>Money exceptions</strong>
            <small>{financialExceptions.filter((item) => item.tone === "warning" || item.tone === "danger").length} need review</small>
          </button>
          <button aria-pressed={activeInsight === "templates"} onClick={() => openInsight("templates")} type="button">
            <span>7</span>
            <strong>Execution templates</strong>
            <small>{templates.length} staff-ready scripts</small>
          </button>
          <button aria-pressed={activeInsight === "tasks"} onClick={() => showQueue("needsAction")} type="button">
            <span>8</span>
            <strong>Role-simple queue</strong>
            <small>{needsActionCount} claims need action</small>
          </button>
        </div>
      </section>

      <div className={styles.workspace}>
        <section className={`${styles.panel} ${styles.workbench}`} ref={workbenchRef}>
          <div className={styles.workbenchContent}>
            <section className={styles.insightPanel} aria-label="Selected Claim Desk intelligence panel">
              {activeInsight === "tasks" ? (
                <>
                  <div className={styles.panelHeader}>
                    <div>
                      <h2>Next-action engine</h2>
                      <p>Recommended execution cards keep staff on the next useful action, not the whole claim at once.</p>
                    </div>
                    <Badge tone="info">Preview</Badge>
                  </div>
                  <div className={styles.actionCardGrid}>
                    {executionCards.map((card) => (
                      <article className={`${styles.actionCard} ${styles[card.tone]}`} key={card.id}>
                        <span>{card.ownerRole}</span>
                        <strong>{card.title}</strong>
                        <p>{card.detail}</p>
                        <button type="button" onClick={() => showQueue("needsAction")}>{card.actionLabel}</button>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}

              {activeInsight === "status" ? (
                <>
                  <div className={styles.panelHeader}>
                    <div>
                      <h2>Status intelligence</h2>
                      <p>Operational states are grouped into signals that explain what needs attention.</p>
                    </div>
                    <Badge tone="info">Signals</Badge>
                  </div>
                  <div className={styles.signalGrid}>
                    {statusSignals.map((signal) => (
                      <article className={`${styles.signalCard} ${styles[signal.tone]}`} key={signal.label}>
                        <strong>{signal.count}</strong>
                        <span>{signal.label}</span>
                        <p>{signal.detail}</p>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}

              {activeInsight === "guardrails" ? (
                <>
                  <div className={styles.panelHeader}>
                    <div>
                      <h2>Workflow guardrails</h2>
                      <p>Staff can move fast, while required gates stay visible before risky actions.</p>
                    </div>
                    <Badge tone="warning">Governed</Badge>
                  </div>
                  <div className={styles.guardrailStack}>
                    {guardrails.map((guardrail) => (
                      <article className={`${styles.guardrailRow} ${styles[guardrail.tone]}`} key={guardrail.label}>
                        <strong>{guardrail.label}</strong>
                        <p>{guardrail.reason}</p>
                        <span>{guardrail.enforced ? "Gate active" : "Clear"}</span>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}

              {activeInsight === "timeline" ? (
                <>
                  <div className={styles.panelHeader}>
                    <div>
                      <h2>Unified timeline</h2>
                      <p>Claim activity, next actions, and audit-friendly history appear as one operational story.</p>
                    </div>
                    <Badge>Timeline</Badge>
                  </div>
                  <div className={styles.timelineStack}>
                    {timeline.map((item, index) => (
                      <article className={`${styles.timelineItem} ${styles[item.tone]}`} key={`${item.label}-${index}`}>
                        <span>{item.atLabel}</span>
                        <strong>{item.label}</strong>
                        <p>{item.detail}</p>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}

              {activeInsight === "documents" ? (
                <>
                  <div className={styles.panelHeader}>
                    <div>
                      <h2>Document shortcuts</h2>
                      <p>Documents are grouped by the work they unlock: authorization, photos, estimates, and payment proof.</p>
                    </div>
                    <Badge>Library-ready</Badge>
                  </div>
                  <div className={styles.shortcutGrid}>
                    {documentShortcuts.map((shortcut) => (
                      <article className={`${styles.shortcutCard} ${styles[shortcut.tone]}`} key={shortcut.label}>
                        <span>{shortcut.count}</span>
                        <strong>{shortcut.label}</strong>
                        <p>{shortcut.detail}</p>
                        <button type="button" onClick={() => showTool("documents")}>{shortcut.actionLabel}</button>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}

              {activeInsight === "money" ? (
                <>
                  <div className={styles.panelHeader}>
                    <div>
                      <h2>Money exceptions</h2>
                      <p>Billing, recovery, rental risk, and short-pay watch stay visible before money leaks.</p>
                    </div>
                    <Badge tone="warning">Recovery</Badge>
                  </div>
                  <div className={styles.moneyGrid}>
                    {financialExceptions.map((exception) => (
                      <article className={`${styles.moneyCard} ${styles[exception.tone]}`} key={exception.label}>
                        <span>{exception.amountLabel}</span>
                        <strong>{exception.label}</strong>
                        <p>{exception.detail}</p>
                        <button type="button" onClick={() => showQueue("paymentWatch")}>{exception.actionLabel}</button>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}

              {activeInsight === "templates" ? (
                <>
                  <div className={styles.panelHeader}>
                    <div>
                      <h2>Execution templates</h2>
                      <p>Reusable scripts simplify carrier calls, authorization requests, invoice follow-up, and manager review.</p>
                    </div>
                    <Badge>Templates</Badge>
                  </div>
                  <div className={styles.templateGrid}>
                    {templates.map((template) => (
                      <article className={styles.templateCard} key={template.label}>
                        <span>{template.channel}</span>
                        <strong>{template.label}</strong>
                        <p>{template.body}</p>
                        <small>{template.requiredContext.join(" / ")}</small>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}
            </section>

            {activeTool === "start" ? (
              <section id="start-claim-intake" ref={intakeRef}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2>Start claim intake</h2>
                    <p>Enter the basic customer, vehicle, and claim facts. The workspace opens after the claim is created.</p>
                  </div>
                  <Badge>Focused intake</Badge>
                </div>
                <form action={startClaim} className={styles.intakeForm}>
                  <fieldset>
                    <legend>Customer</legend>
                    <label>
                      <span>Customer name</span>
                      <input name="customerName" placeholder="Customer full name" ref={customerNameRef} required />
                    </label>
                    <label>
                      <span>Phone</span>
                      <input name="customerPhone" placeholder="Phone number" />
                    </label>
                    <label>
                      <span>Email</span>
                      <input name="customerEmail" placeholder="Email address" type="email" />
                    </label>
                    <label className={styles.fullField}>
                      <span>Address line 1</span>
                      <input name="customerAddressLine1" placeholder="Street address" />
                    </label>
                    <label>
                      <span>Address line 2</span>
                      <input name="customerAddressLine2" placeholder="Apt, suite, unit" />
                    </label>
                    <label>
                      <span>City</span>
                      <input name="customerCity" placeholder="City" />
                    </label>
                    <label>
                      <span>State</span>
                      <input name="customerState" placeholder="State" />
                    </label>
                    <label>
                      <span>ZIP</span>
                      <input name="customerPostalCode" placeholder="ZIP code" />
                    </label>
                  </fieldset>
                  <fieldset>
                    <legend>Vehicle</legend>
                    <label>
                      <span>VIN</span>
                      <input name="vehicleVin" placeholder="VIN" required />
                    </label>
                    <label>
                      <span>Year</span>
                      <input name="vehicleYear" placeholder="Year" />
                    </label>
                    <label>
                      <span>Make</span>
                      <input name="vehicleMake" placeholder="Make" />
                    </label>
                    <label>
                      <span>Model</span>
                      <input name="vehicleModel" placeholder="Model" />
                    </label>
                    <label>
                      <span>Color</span>
                      <input name="vehicleColor" placeholder="Color" />
                    </label>
                    <label>
                      <span>Mileage</span>
                      <input name="vehicleMileage" placeholder="Mileage" />
                    </label>
                    <label>
                      <span>Plate</span>
                      <input name="vehiclePlate" placeholder="Plate" />
                    </label>
                    <label>
                      <span>Stock #</span>
                      <input name="vehicleStockNumber" placeholder="Stock number" />
                    </label>
                  </fieldset>
                  <fieldset>
                    <legend>Claim and loss</legend>
                    <label>
                      <span>Carrier</span>
                      <input name="carrierName" placeholder="Insurance carrier" />
                    </label>
                    <label>
                      <span>Claim number</span>
                      <input name="claimNumber" placeholder="Claim number or leave draft" />
                    </label>
                    <label>
                      <span>Policy #</span>
                      <input name="policyNumber" placeholder="Policy number" />
                    </label>
                    <label>
                      <span>Deductible</span>
                      <input name="deductible" placeholder="Deductible" />
                    </label>
                    <label>
                      <span>Loss date</span>
                      <input name="lossDate" type="date" />
                    </label>
                    <label>
                      <span>Loss location</span>
                      <input name="lossLocation" placeholder="Where loss happened" />
                    </label>
                    <label className={styles.fullField}>
                      <span>First loss summary</span>
                      <textarea name="description" placeholder="Short description of loss, damage, drivability, tow/storage, and customer needs" rows={3} />
                    </label>
                  </fieldset>
                  <div className={styles.formFooter}>
                    {error ? <strong>{error}</strong> : <span>Creates a controlled claim record and opens the workspace.</span>}
                    <button disabled={isSubmitting} type="submit">{isSubmitting ? "Starting..." : "Start claim workspace"}</button>
                  </div>
                </form>
              </section>
            ) : null}

            {activeTool === "find" ? (
              <section>
                <div className={styles.panelHeader}>
                  <div>
                    <h2>Find an existing claim</h2>
                    <p>Use this before creating another record. Open the active workspace when a matching claim already exists.</p>
                  </div>
                  <button
                    aria-pressed={activeFilter === "needsAction"}
                    className={styles.badgeButton}
                    onClick={() => showQueue("needsAction")}
                    type="button"
                  >
                    <Badge tone="warning">{needsActionCount} need action</Badge>
                  </button>
                </div>
                <aside className={styles.searchPanel}>
                  <span className={styles.cardEyebrow}>Find before creating</span>
                  <form aria-label="Search existing claims" className={styles.searchBox} onSubmit={searchExistingClaims} role="search">
                    <label className={styles.searchField}>
                      <span className={styles.visuallyHidden}>Customer, VIN, plate, phone, claim number, or repair order number</span>
                      <input
                        onChange={(event) => setClaimSearchInput(event.target.value)}
                        placeholder="Customer, VIN, plate, phone, claim #, RO #"
                        type="search"
                        value={claimSearchInput}
                      />
                    </label>
                    {claimSearchQuery ? (
                      <button className={styles.clearSearchButton} onClick={clearClaimSearch} type="button">
                        Clear
                      </button>
                    ) : null}
                    <button type="submit">Search</button>
                  </form>
                  <p>Search prevents duplicate claims and routes staff to an existing workspace when one is already open.</p>
                </aside>
                <div className={styles.queue}>
                  <div className={styles.filterBar}>
                    {filters.map((filter) => (
                      <button
                        aria-pressed={activeFilter === filter.id}
                        className={activeFilter === filter.id ? styles.activeFilter : undefined}
                        key={filter.id}
                        onClick={() => showQueue(filter.id)}
                        type="button"
                      >
                        <span>{filter.label}</span>
                        <strong>{filter.count}</strong>
                      </button>
                    ))}
                  </div>
                  <div className={styles.queueHead}>
                    <span>Customer / vehicle</span>
                    <span>Claim</span>
                    <span>Blocker</span>
                    <span>Action</span>
                  </div>
                  {visibleCandidates.map((candidate) => (
                    <div className={styles.claimRow} key={`${candidate.customer}-${candidate.claim}`}>
                      <div>
                        <strong>{candidate.customer}</strong>
                        <span>{candidate.detail}</span>
                      </div>
                      <div>
                        <strong>{candidate.claim}</strong>
                        <small>{candidate.provider}</small>
                      </div>
                      <div>
                        <Badge tone={candidate.blockerTone}>{candidate.blocker}</Badge>
                      </div>
                      <Link className={candidate.action === "Open" ? styles.primaryAction : styles.secondaryAction} href={candidate.href}>
                        {candidate.action}
                      </Link>
                    </div>
                  ))}
                  {visibleCandidates.length === 0 ? <div className={styles.emptyQueue}>No claims in this view.</div> : null}
                </div>
                <p className={styles.queueSummary} aria-live="polite">
                  Showing {visibleCandidates.length} {queueLabel}{visibleCandidates.length === 1 ? "" : "s"}{claimSearchQuery ? ` for "${claimSearchQuery}"` : ""}.
                </p>
              </section>
            ) : null}

            {activeTool === "documents" ? (
              <section id="claim-intake-documents">
                <div className={styles.panelHeader}>
                  <div>
                    <h2>Claim documents</h2>
                    <p>Review the insurance claim packet only when staff need document guidance.</p>
                  </div>
                  <Badge>Packet</Badge>
                </div>
                <div className={styles.documentList}>
                  {INSURANCE_CLAIM_INTAKE_FORM_PACKET.map((form) => (
                    <article className={styles.documentCard} key={form.id}>
                      <div>
                        <strong>{form.label}</strong>
                        <small>{form.description}</small>
                      </div>
                      <Badge tone={form.category === "Required" ? "info" : "warning"}>{form.category}</Badge>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
