import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-access";
import type { UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import {
  UNIFIED_CRM_OPPORTUNITY_READ_CONTRACT_VERSION,
  type UnifiedCrmOpportunityPreviewModel
} from "@/server/unified-crm/opportunity-read-contract";
import {
  buildUnifiedCrmOpportunityReviewHref,
  createUnifiedCrmOpportunityWorkspaceOrientation
} from "@/server/unified-crm/opportunity-workspace-orientation";

type Dependencies = {
  accessContext?: UnifiedCrmOpportunityAccessContext;
  mode?: unknown;
  nodeEnv?: string;
  now?: () => Date;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
};

export async function getUnifiedCrmOpportunityPipelinePreview(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityPreviewModel> {
  const access = dependencies.accessContext ?? await getUnifiedCrmOpportunityAccessContext(actor, "read", dependencies);
  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const orientation = createUnifiedCrmOpportunityWorkspaceOrientation(access, {
    generatedAt,
    sourceLabel: "Unified CRM opportunity pipeline review"
  });
  const visibility = orientation.visibility;

  return {
    contractVersion: UNIFIED_CRM_OPPORTUNITY_READ_CONTRACT_VERSION,
    generatedAt,
    state: "PREVIEW",
    visibility,
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
            detailHref: buildUnifiedCrmOpportunityReviewHref("detail", "review01"),
            nextActionLabel: "Review create contract",
            ownerLabel: visibility === "organization" ? "Team-owned preview" : "Owned preview",
            reason: "First secure create path will surface here after lifecycle approval."
          },
          {
            id: "review02",
            customerLabel: "Source lead remains authoritative",
            detailHref: buildUnifiedCrmOpportunityReviewHref("detail", "review02"),
            nextActionLabel: "Review lead bridge",
            ownerLabel: visibility === "organization" ? "Team-owned preview" : "Owned preview",
            reason: "Lead correlation is prepared without rewriting source lead stages or scores."
          }
        ]
      },
      {
        id: "planning",
        label: "Planning review",
        itemCountLabel: "2 scenarios",
        valueLabel: "Movement held",
        items: [
          {
            id: "review03",
            customerLabel: "No forecast math is shown",
            detailHref: buildUnifiedCrmOpportunityReviewHref("detail", "review03"),
            nextActionLabel: "Review detail state",
            ownerLabel: visibility === "organization" ? "Team-owned preview" : "Owned preview",
            reason: "Amounts, probability, and stage movement stay off until approved."
          },
          {
            id: "review04",
            customerLabel: "Appointments stay source-owned",
            detailHref: buildUnifiedCrmOpportunityReviewHref("detail", "review04"),
            nextActionLabel: "Review appointment bridge",
            ownerLabel: visibility === "organization" ? "Team-owned preview" : "Owned preview",
            reason: "Appointment linkage is contract-ready but no live handoff is enabled here yet."
          }
        ]
      },
      {
        id: "handoff",
        label: "Handoff review",
        itemCountLabel: "1 scenario",
        valueLabel: "Dispatch held",
        items: [
          {
            id: "review05",
            customerLabel: "Dispatch remains authoritative",
            detailHref: buildUnifiedCrmOpportunityReviewHref("detail", "review05"),
            nextActionLabel: "Review dispatch bridge",
            ownerLabel: visibility === "organization" ? "Team-owned preview" : "Owned preview",
            reason: "CRM will link or hand off work without taking over the dispatch lifecycle."
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
      heading: visibility === "organization" ? "What the first live list will surface" : "What your owned opportunity list will surface",
      emptyMessage: "No live opportunities are shown while lifecycle rules are held.",
      items: [
        {
          id: "list-review01",
          title: "Customer and owner at a glance",
          ownerLabel: visibility === "organization" ? "Organization visibility" : "Owned visibility",
          reason: "Every live record row will show the next action, owner, and due state before any deeper details."
        },
        {
          id: "list-review02",
          title: "Safe path into detail",
          ownerLabel: "Review only",
          reason: "Open detail stays one click away, but the detail remains read-only until activation is approved."
        }
      ]
    }
  };
}
