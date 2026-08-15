"use client";

import { AlertTriangle, CheckCircle2, Link2, ShieldCheck } from "lucide-react";
import Link from "next/link";

import type {
  UnifiedCrmOpportunityHeldReadModel,
  UnifiedCrmOpportunityPreviewModel
} from "@/server/unified-crm/opportunity-read-contract";

import { UnifiedCrmOpportunityActions } from "./unified-crm-opportunity-actions";
import { UnifiedCrmOpportunityWorkspaceOrientation } from "./unified-crm-opportunity-workspace-orientation";
import styles from "./unified-crm-shell.module.css";

const previewModel: UnifiedCrmOpportunityPreviewModel = {
  contractVersion: "ucrm.opportunity-read/v1",
  generatedAt: "2026-08-14T00:00:00.000Z",
  state: "PREVIEW",
  visibility: "organization",
  cards: [
    {
      id: "foundation",
      label: "Foundation",
      value: "Ready",
      detail: "Opportunity access, validation, and bridge contracts are in place.",
      tone: "ready"
    },
    {
      id: "stage-policy",
      label: "Stage policy",
      value: "Held",
      detail: "Exact stage names, order, and evidence rules are still awaiting business approval.",
      tone: "held"
    },
    {
      id: "bridges",
      label: "Owning-system bridges",
      value: "Prepared",
      detail: "Task, Appointment, and Dispatch packets are contract-ready but not active.",
      tone: "neutral"
    }
  ],
  columns: [
    {
      id: "intake",
      label: "Intake review",
      itemCountLabel: "2 scenarios",
      valueLabel: "No governed stage yet",
        items: [
          {
            id: "review01",
            customerLabel: "Customer appears after approved create path",
            detailHref: "/crm/opportunities/new?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
            nextActionLabel: "Review create contract",
            ownerLabel: "Team-owned preview",
            reason: "First secure create path will surface here after lifecycle approval.",
            state: "HELD_REVIEW"
          }
      ]
    }
  ],
  constraints: [
    "No opportunity record is created in this preview.",
    "No stage transition is available before approval.",
    "Task, Appointment, and Dispatch remain authoritative in their own consoles."
  ],
  listPreview: {
    heading: "What the first live list will surface",
    emptyMessage: "No live opportunities are shown while lifecycle rules are held.",
    items: [
      {
        id: "list-review01",
        title: "Customer and owner at a glance",
        ownerLabel: "Organization visibility",
        reason: "Every live record row will show the next action, owner, and due state before any deeper details.",
        state: "HELD_REVIEW"
      }
    ]
  }
};

const heldModel: UnifiedCrmOpportunityHeldReadModel = {
  contractVersion: "ucrm.opportunity-read/v1",
  detail: "The governed opportunity lifecycle is intentionally held until stage names, order, and evidence are approved.",
  generatedAt: "2026-08-14T00:00:00.000Z",
  nextStep: "Approve stage definitions and transition evidence to unlock operational opportunity slices.",
  state: "HELD"
};

function toneClass(tone: UnifiedCrmOpportunityPreviewModel["cards"][number]["tone"]) {
  if (tone === "ready") return styles.insightPositive;
  if (tone === "held") return styles.insightWarning;
  return styles.insightNeutral;
}

function previewItemStateLabel(state?: "HELD_REVIEW" | "LIVE_READ_ONLY") {
  return state === "LIVE_READ_ONLY" ? "Live read-only" : "Held review";
}

function listPreviewCollection(model: UnifiedCrmOpportunityPreviewModel) {
  const persistedReadOnly = model.listPreview.items.filter((item) => item.state === "LIVE_READ_ONLY" && item.href);
  const heldRows = model.listPreview.items.filter((item) => item.state !== "LIVE_READ_ONLY");
  return { heldRows, persistedReadOnly };
}

export function UnifiedCrmOpportunityPreview() {
  return <UnifiedCrmOpportunityPipelinePreview model={previewModel} />;
}

export function UnifiedCrmOpportunityPipelinePreview({ model }: { model: UnifiedCrmOpportunityPreviewModel }) {
  const hasLiveReadOnlyTargets = model.columns.some((column) => column.items.some((item) => item.state === "LIVE_READ_ONLY"))
    || model.listPreview.items.some((item) => item.state === "LIVE_READ_ONLY");
  const { heldRows, persistedReadOnly } = listPreviewCollection(model);

  return (
    <section className={styles.opportunityPreview} aria-label="Opportunity foundation preview">
      <div className={styles.opportunityPreviewHeader}>
        <div>
          <span className={styles.eyebrow}>Opportunity workspace</span>
          <h2>Foundation is ready. Lifecycle rules are intentionally held.</h2>
          <p>{hasLiveReadOnlyTargets
            ? "Lifecycle commands remain intentionally held, but the workspace can now point to a same-scope persisted opportunity in read-only mode when one is available."
            : heldModel.detail}</p>
        </div>
        <div className={styles.reviewBadge}>
          <ShieldCheck aria-hidden="true" size={16} />
          <span>{hasLiveReadOnlyTargets ? "Read-only detail available; writes still off" : "Feature off for operational use"}</span>
        </div>
      </div>

      <div className={styles.opportunityPreviewGrid}>
        {model.cards.map((card) => (
          <article className={`${styles.opportunityPreviewCard} ${toneClass(card.tone)}`} key={card.id}>
            <header>
              <strong>{card.label}</strong>
              <span>{card.value}</span>
            </header>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>

      <UnifiedCrmOpportunityWorkspaceOrientation
        current="pipeline"
        visibilityLabel={model.visibility === "owned" ? "Owned review" : "Organization review"}
      />

      <section className={styles.pipelinePreviewBoard} aria-labelledby="pipeline-preview-heading">
        <header className={styles.pipelinePreviewHeader}>
          <div>
            <span className={styles.eyebrow}>Board review</span>
            <h3 id="pipeline-preview-heading">How the first opportunity board will feel</h3>
          </div>
          <span className={styles.reviewBadge}>{model.visibility === "owned" ? "Owned review" : "Organization review"}</span>
        </header>
        <div className={styles.pipelinePreviewColumns}>
          {model.columns.map((column) => (
            <article className={styles.pipelinePreviewColumn} key={column.id}>
              <header>
                <strong>{column.label}</strong>
                <span>{column.itemCountLabel}</span>
              </header>
              <small>{column.valueLabel}</small>
              <div className={styles.pipelinePreviewItems}>
                {column.items.map((item) => (
                  <Link className={styles.pipelinePreviewItem} href={item.detailHref} key={item.id}>
                    <div className={styles.previewItemHeader}>
                      <strong>{item.nextActionLabel}</strong>
                      <span className={styles.statePill}>{previewItemStateLabel(item.state)}</span>
                    </div>
                    <span>{item.customerLabel}</span>
                    <small>{item.ownerLabel}</small>
                    <p>{item.reason}</p>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.pipelineListPreview} aria-labelledby="pipeline-list-preview-heading">
        <header>
          <div>
            <span className={styles.eyebrow}>List review</span>
            <h3 id="pipeline-list-preview-heading">{model.listPreview.heading}</h3>
          </div>
          <span>{heldRows.length} held review row{heldRows.length === 1 ? "" : "s"}</span>
        </header>
        {heldRows.length ? (
          <div className={styles.pipelineListItems}>
            {heldRows.map((item) => (
              item.href ? (
                <Link className={styles.pipelineListItem} href={item.href} key={item.id}>
                  <div className={styles.previewItemHeader}>
                    <strong>{item.title}</strong>
                    <span className={styles.statePill}>{previewItemStateLabel(item.state)}</span>
                  </div>
                  <span>{item.ownerLabel}</span>
                  {item.customerLabel ? <small>{item.customerLabel}</small> : null}
                  <p>{item.reason}</p>
                </Link>
              ) : (
                <article className={styles.pipelineListItem} key={item.id}>
                  <div className={styles.previewItemHeader}>
                    <strong>{item.title}</strong>
                    <span className={styles.statePill}>{previewItemStateLabel(item.state)}</span>
                  </div>
                  <span>{item.ownerLabel}</span>
                  {item.customerLabel ? <small>{item.customerLabel}</small> : null}
                  <p>{item.reason}</p>
                </article>
              )
            ))}
          </div>
        ) : <p>{model.listPreview.emptyMessage}</p>}
      </section>

      <section className={styles.pipelineListPreview} aria-labelledby="pipeline-live-collection-heading">
        <header>
          <div>
            <span className={styles.eyebrow}>Visible collection</span>
            <h3 id="pipeline-live-collection-heading">Same-scope persisted read-only opportunities</h3>
          </div>
          <span>{persistedReadOnly.length ? `${persistedReadOnly.length} visible read-only record${persistedReadOnly.length === 1 ? "" : "s"}` : "Read-only visibility pending"}</span>
        </header>
        {model.listPreview.observation ? (
          <>
            <p className={styles.sectionDetail}>{model.listPreview.observation.detail}</p>
            <p className={styles.sectionDetail}>{model.listPreview.observation.freshnessLabel}</p>
          </>
        ) : null}
        <p className={styles.sectionDetail}>
          {persistedReadOnly.length
            ? "These links open permitted persisted opportunity records in read-only mode. Lifecycle movement and operational writes remain intentionally off."
            : "No same-scope persisted read-only opportunity is visible in this preview snapshot yet. Keep using held review surfaces until one is available."}
        </p>
        {persistedReadOnly.length ? (
          <div className={styles.pipelineListItems}>
            {persistedReadOnly.map((item) => (
              <Link className={styles.pipelineListItem} href={item.href!} key={item.id}>
                <div className={styles.previewItemHeader}>
                  <strong>{item.title}</strong>
                  <span className={styles.statePill}>{previewItemStateLabel(item.state)}</span>
                </div>
                <span>{item.ownerLabel}</span>
                {item.customerLabel ? <small>{item.customerLabel}</small> : null}
                <p>{item.reason}</p>
              </Link>
            ))}
          </div>
        ) : <p>{model.listPreview.emptyMessage}</p>}
      </section>

      <section className={styles.pipelineActionPanel}>
        <UnifiedCrmOpportunityActions
          title="Review the core opportunity flow"
          actions={[
            {
              label: "Open guided journey",
              description: "Start with the intended review sequence if you want one simple path through the full opportunity experience.",
              href: "/crm/opportunities/guided?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
              state: "REVIEW"
            },
            {
              label: "Open opportunity hub",
              description: "Review pipeline, queue, create, detail, and transition from one held page before any live opportunity action exists.",
              href: "/crm/opportunities?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
              state: "REVIEW"
            },
            {
              label: "Review queue flow",
              description: "See how owned, overdue, waiting, and at-risk work should stay understandable before live prioritization exists.",
              href: "/crm/opportunities/queue?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
              state: "REVIEW"
            },
            {
              label: "Review create flow",
              description: "See the first governed opportunity create experience before any live record can be written.",
              href: "/crm/opportunities/new?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
              state: "REVIEW"
            },
            {
              label: "Review detail flow",
              description: "Open the held opportunity detail surface and inspect what the first live record page will show.",
              href: "/crm/opportunities/review01?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
              state: "REVIEW"
            },
            {
              label: "Review transition flow",
              description: "Inspect the governed stage-movement checks before any transition can run live.",
              href: "/crm/opportunities/review01/transition?crmReturnTo=%2Fcrm%3Fview%3Dpipeline",
              state: "REVIEW"
            }
          ]}
        />
      </section>

      <section className={styles.opportunityConstraints}>
        <header>
          <AlertTriangle aria-hidden="true" size={16} />
          <strong>Current constraints</strong>
        </header>
        <ul>
          {model.constraints.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className={styles.opportunityNextSteps}>
        <article>
          <CheckCircle2 aria-hidden="true" size={16} />
          <div>
            <strong>Ready to activate next</strong>
            <p>{heldModel.nextStep}</p>
          </div>
        </article>
        <article>
          <Link2 aria-hidden="true" size={16} />
          <div>
            <strong>Bridge path already prepared</strong>
            <p>Appointment and Dispatch linkage will attach to approved opportunities without taking ownership away from their source systems.</p>
          </div>
        </article>
      </section>
    </section>
  );
}
