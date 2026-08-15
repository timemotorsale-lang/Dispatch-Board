import { UnifiedCrmShell, UnifiedCrmUnavailable } from "@/features/unified-crm/unified-crm-shell";
import { parseUnifiedCrmView } from "@/features/unified-crm/unified-crm-shell-review-model";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getUnifiedCrmCustomerList } from "@/server/services/unified-crm-customer-read-service";
import { getUnifiedCrmOpportunityDiscovery } from "@/server/services/unified-crm-opportunity-discovery-service";
import { getUnifiedCrmOpportunityPipelinePreview } from "@/server/services/unified-crm-opportunity-read-service";
import { getUnifiedCrmWorkQueue } from "@/server/services/unified-crm-work-queue-service";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

type CrmPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function safeFallback(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/my-tasks";
}

function unavailableMessage(reason: string) {
  if (reason === "SHELL_OFF") return "Unified CRM is turned off. Your existing workspace remains available.";
  if (reason === "WORKSPACE_NOT_ELIGIBLE" || reason === "CAPABILITY_NOT_GRANTED") {
    return "This CRM experience is not enabled for your current workspace.";
  }
  if (reason === "INACTIVE_USER" || reason === "AUTHENTICATION_REQUIRED") {
    return "Your current session cannot open this CRM experience.";
  }
  return "Unified CRM is temporarily unavailable. Your existing workspace remains available.";
}

export default async function CrmPage({ searchParams }: CrmPageProps) {
  const user = await requireCurrentUser();
  const [parameters, access] = await Promise.all([
    searchParams,
    resolveUnifiedCrmShellAccess(user)
  ]);

  if (!access.allowed || access.mode !== "REVIEW") {
    return (
      <UnifiedCrmUnavailable
        fallbackHref={safeFallback(access.fallbackHref)}
        reason={unavailableMessage(access.reason)}
      />
    );
  }

  const activeView = parseUnifiedCrmView(parameters.view);
  let workQueue;
  let workQueueError: string | undefined;
  let workQueueFailureKind: "error" | "restricted" | "unavailable" | undefined;
  let opportunityDiscovery;
  let customerList;
  let customerListError: string | undefined;
  let customerListFailureKind: "error" | "restricted" | "unavailable" | undefined;
  let opportunityPreview;
  let opportunityPreviewError: string | undefined;
  let opportunityPreviewFailureKind: "error" | "restricted" | "unavailable" | undefined;

  if (activeView === "home" || activeView === "work") {
    try {
      workQueue = await getUnifiedCrmWorkQueue(user);
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (["AUTHENTICATION_REQUIRED", "CRM_WORK_NOT_AUTHORIZED", "ORGANIZATION_SCOPE_UNAVAILABLE"].includes(code)) {
        workQueueFailureKind = "restricted";
        workQueueError = "Your current access does not include CRM work records.";
      } else if (["CRM_WORK_OFF", "CRM_WORK_SOURCE_UNAVAILABLE", "ORGANIZATION_SCOPE_AMBIGUOUS"].includes(code)) {
        workQueueFailureKind = "unavailable";
        workQueueError = "The CRM work queue is temporarily unavailable. No work records were displayed.";
      } else {
        workQueueFailureKind = "error";
        workQueueError = "The CRM work queue could not be loaded safely. No work records were displayed.";
      }
    }

    try {
      opportunityDiscovery = await getUnifiedCrmOpportunityDiscovery(user);
    } catch {
      opportunityDiscovery = undefined;
    }
  }

  if (activeView === "customers") {
    try {
      customerList = await getUnifiedCrmCustomerList(user, {
        cursor: parameters.cursor,
        owner: access.workspace === "SALES" ? "mine" : parameters.owner,
        q: parameters.q,
        status: parameters.status
      });
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (["AUTHENTICATION_REQUIRED", "CUSTOMER_READ_NOT_AUTHORIZED", "ORGANIZATION_SCOPE_UNAVAILABLE"].includes(code)) {
        customerListFailureKind = "restricted";
        customerListError = "Your current access does not include CRM customer records.";
      } else if (["CUSTOMER_READ_OFF", "CUSTOMER_SOURCE_UNAVAILABLE", "ORGANIZATION_SCOPE_AMBIGUOUS"].includes(code)) {
        customerListFailureKind = "unavailable";
        customerListError = "The customer source is temporarily unavailable. No customer data was displayed.";
      } else {
        customerListFailureKind = "error";
        customerListError = "The customer list could not be loaded safely. No customer data was displayed.";
      }
    }
  }

  if (activeView === "pipeline") {
    try {
      opportunityPreview = await getUnifiedCrmOpportunityPipelinePreview(user);
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (["AUTHENTICATION_REQUIRED", "OPPORTUNITY_NOT_AUTHORIZED", "ORGANIZATION_SCOPE_UNAVAILABLE"].includes(code)) {
        opportunityPreviewFailureKind = "restricted";
        opportunityPreviewError = "Your current access does not include CRM opportunity review.";
      } else if (["OPPORTUNITY_OFF", "ORGANIZATION_SCOPE_AMBIGUOUS"].includes(code)) {
        opportunityPreviewFailureKind = "unavailable";
        opportunityPreviewError = "The opportunity review is temporarily unavailable. No opportunity review data was displayed.";
      } else {
        opportunityPreviewFailureKind = "error";
        opportunityPreviewError = "The opportunity review could not be loaded safely. No opportunity review data was displayed.";
      }
    }
  }

  return (
    <UnifiedCrmShell
      activeView={activeView}
      capabilities={access.capabilities}
      customerList={customerList}
      customerListError={customerListError}
      customerListFailureKind={customerListFailureKind}
      initialSelectedId={Array.isArray(parameters.selected) ? parameters.selected[0] : parameters.selected}
      opportunityDiscovery={opportunityDiscovery}
      opportunityPreview={opportunityPreview}
      opportunityPreviewError={opportunityPreviewError}
      opportunityPreviewFailureKind={opportunityPreviewFailureKind}
      workQueue={workQueue}
      workQueueError={workQueueError}
      workQueueFailureKind={workQueueFailureKind}
      userName={user.name}
    />
  );
}
