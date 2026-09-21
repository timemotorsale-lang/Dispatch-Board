"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useRef, useState } from "react";

import { INSURANCE_CLAIM_INTAKE_FORM_PACKET } from "@/lib/insurance-claim-intake-form-packet";
import type { ClaimsDeskReadModel } from "@/server/claims-workspace/service";

import styles from "./claims-desk.module.css";

type DeskClaimCandidate = ClaimsDeskReadModel["claims"][number];
type DeskQueueFilter = ClaimsDeskReadModel["filters"][number]["id"] | "needsAction";
type DeskWorkbenchTool = "start" | "find" | "documents";

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

function Badge({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "good" | "warning" | "danger" }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

export function ClaimsDesk({ model }: { model?: ClaimsDeskReadModel }) {
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<DeskQueueFilter>("all");
  const [activeTool, setActiveTool] = useState<DeskWorkbenchTool>("start");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const customerNameRef = useRef<HTMLInputElement>(null);
  const intakeRef = useRef<HTMLElement>(null);
  const workbenchRef = useRef<HTMLElement>(null);
  const candidates = model?.claims ?? claimCandidates.map((candidate) => ({ ...candidate, href: "/vehicles/claims-workspace" }));
  const filters = model?.filters ?? [
    { count: candidates.length, id: "all", label: "All" },
    { count: candidates.filter((candidate) => candidate.queueTags.includes("blocked")).length, id: "blocked", label: "Blocked" },
    { count: candidates.filter((candidate) => candidate.queueTags.includes("waitingCarrier")).length, id: "waitingCarrier", label: "Waiting carrier" },
    { count: candidates.filter((candidate) => candidate.queueTags.includes("readyHandoff")).length, id: "readyHandoff", label: "Ready handoff" },
    { count: 0, id: "paymentWatch", label: "Payment watch" },
    { count: 0, id: "aging", label: "Aging" }
  ] satisfies ClaimsDeskReadModel["filters"];
  const needsActionCount = candidates.filter((candidate) => candidate.blocker !== "Ready for repair order" && !candidate.queueTags.includes("readyHandoff")).length;
  const visibleCandidates = activeFilter === "all"
    ? candidates
    : activeFilter === "needsAction"
      ? candidates.filter((candidate) => candidate.blocker !== "Ready for repair order" && !candidate.queueTags.includes("readyHandoff"))
      : candidates.filter((candidate) => candidate.queueTags.includes(activeFilter));
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
      window.location.assign(claimId ? `/vehicles/claims-workspace?claimId=${encodeURIComponent(claimId)}` : "/vehicles/claims-workspace");
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

      <div className={styles.workspace}>
        <section className={`${styles.panel} ${styles.workbench}`} ref={workbenchRef}>
          <div className={styles.workbenchContent}>
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
                  <div className={styles.searchBox}>
                    <span>Customer, VIN, plate, phone, claim #, RO #</span>
                    <strong>Search</strong>
                  </div>
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
                  Showing {visibleCandidates.length} {activeFilter === "all" ? "active claim candidate" : `${activeFilter === "needsAction" ? "claim needing action" : "matching claim candidate"}`}{visibleCandidates.length === 1 ? "" : "s"}.
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
