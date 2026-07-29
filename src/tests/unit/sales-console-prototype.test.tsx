import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SalesConsoleError from "@/app/(app)/sales/error";
import SalesConsoleLoading from "@/app/(app)/sales/loading";
import SalesPage from "@/app/(app)/sales/page";
import { salesConsoleMvpDefinition } from "@/features/sales/sales-console-mvp-definition";
import { salesConsoleMvpExecution } from "@/features/sales/sales-console-mvp-execution";
import { salesConsoleMvpLiveDataContract } from "@/features/sales/sales-console-mvp-live-data-contract";
import { salesConsoleAuthAccessExamples } from "@/features/sales/sales-console-m10-auth-access";
import { salesConsoleM10AdminOperationalSeparation } from "@/features/sales/sales-console-m10-admin-operational-separation";
import { salesConsoleM10ManagerReviewRequestFoundation } from "@/features/sales/sales-console-m10-manager-review-request";
import { salesConsoleM10ReadOnlySourceWiring } from "@/features/sales/sales-console-m10-read-only-source-wiring";
import { salesConsoleRoleProductionViews } from "@/features/sales/sales-console-m10-production-views";
import { salesConsoleM11AuthRoleSeedingPlan } from "@/features/sales/sales-console-m11-auth-role-seeding";
import { salesConsoleM11ReadOnlyFeatureFlags } from "@/features/sales/sales-console-m11-read-only-feature-flags";
import { salesConsoleM11RoleFeatureAccess } from "@/features/sales/sales-console-m11-role-feature-access";
import { salesConsoleM11RoleVerificationSummary } from "@/features/sales/sales-console-m11-role-verification";
import { salesConsoleM11StaffRoleModel } from "@/features/sales/sales-console-m11-staff-role-model";
import { salesConsoleM12AdminDogfoodLandingSummary } from "@/features/sales/sales-console-m12-admin-dogfood-landing-summary";
import { salesConsoleM12DefaultRoleLandingHeader } from "@/features/sales/sales-console-m12-role-landing-header";
import { salesConsoleM12RoleLandingExperiences } from "@/features/sales/sales-console-m12-role-landing-model";
import { salesConsoleM12RoleEmptyPlannedStates } from "@/features/sales/sales-console-m12-role-empty-planned-states";
import { salesConsoleM12RoleStartCards } from "@/features/sales/sales-console-m12-role-start-cards";
import { salesConsoleM13DogfoodReadiness } from "@/features/sales/sales-console-m13-dogfood-readiness";
import { salesConsoleM13FeedbackCategories } from "@/features/sales/sales-console-m13-feedback-categories";
import { salesConsoleM13DogfoodGates } from "@/features/sales/sales-console-m13-dogfood-gates";
import { salesConsoleM13ReleaseObservability } from "@/features/sales/sales-console-m13-release-observability";
import { salesConsoleM13StaffPilotGuide } from "@/features/sales/sales-console-m13-staff-pilot-guide";
import { salesConsoleM14DealInventoryDepth } from "@/features/sales/sales-console-m14-deal-inventory-depth";
import { salesConsoleM14LeadOperationsDepth } from "@/features/sales/sales-console-m14-lead-operations-depth";
import { salesConsoleM14OperationalTabAudit } from "@/features/sales/sales-console-m14-operational-tab-audit";
import { salesConsoleM14PlaceholderDemotion } from "@/features/sales/sales-console-m14-placeholder-demotion";
import { salesConsoleM14SalespersonTodayDepth } from "@/features/sales/sales-console-m14-salesperson-today-depth";
import { salesConsoleM15EmptyStateClarity } from "@/features/sales/sales-console-m15-empty-state-clarity";
import { salesConsoleM15ManagerCommandPolish } from "@/features/sales/sales-console-m15-manager-command-polish";
import { salesConsoleM15OperatingSectionPolish } from "@/features/sales/sales-console-m15-operating-section-polish";
import { salesConsoleM15RoleFirstNavigation } from "@/features/sales/sales-console-m15-role-first-navigation";
import { salesConsoleM15StaffReviewReadiness } from "@/features/sales/sales-console-m15-staff-review-readiness";
import { salesConsoleM16ActivationDecisionGate } from "@/features/sales/sales-console-m16-activation-decision-gate";
import { salesConsoleM16AuditGuardrails } from "@/features/sales/sales-console-m16-audit-guardrails";
import { salesConsoleM16ManagerReviewContract } from "@/features/sales/sales-console-m16-manager-review-contract";
import { salesConsoleM16ManagerReviewDisabledPreview } from "@/features/sales/sales-console-m16-manager-review-disabled-preview";
import { salesConsoleM16WorkflowSelection } from "@/features/sales/sales-console-m16-workflow-selection";
import { salesConsoleM17AuditSafeSubmitPlaceholder } from "@/features/sales/sales-console-m17-audit-safe-submit-placeholder";
import { salesConsoleM17ReleaseGate } from "@/features/sales/sales-console-m17-release-gate";
import { salesConsoleM17RequestFormShell } from "@/features/sales/sales-console-m17-request-form-shell";
import { salesConsoleM17RequestStateModel } from "@/features/sales/sales-console-m17-request-state-model";
import { salesConsoleM17ValidationPermissions } from "@/features/sales/sales-console-m17-validation-permissions";
import { salesConsoleM18BackendContract } from "@/features/sales/sales-console-m18-backend-contract";
import { salesConsoleM18ServerValidation } from "@/features/sales/sales-console-m18-server-validation";
import { salesConsoleAuditReadModel } from "@/features/sales/sales-console-m9-audit-trails";
import { salesConsoleAiNextBestActionReadModel } from "@/features/sales/sales-console-m9-ai-next-best-action";
import { salesConsoleEnterpriseIntegrationReadModel } from "@/features/sales/sales-console-m9-crm-dms-integration-contracts";
import { salesConsoleCustomerMessagingReadModel } from "@/features/sales/sales-console-m9-customer-messaging";
import { salesConsoleDealWorkflowReadModel } from "@/features/sales/sales-console-m9-deal-workflow";
import { salesConsoleEnterprisePermissionReadModel } from "@/features/sales/sales-console-m9-enterprise-permissions";
import { salesConsoleFinanceHandoffReadModel } from "@/features/sales/sales-console-m9-finance-handoff";
import { salesConsoleForecastReadModel } from "@/features/sales/sales-console-m9-forecasting";
import { salesConsoleManagerApprovalReadModel } from "@/features/sales/sales-console-m9-manager-approvals";
import { salesConsoleMultiStoreReportingReadModel } from "@/features/sales/sales-console-m9-multi-store-reporting";
import { salesConsoleQuoteScenarioReadModel } from "@/features/sales/sales-console-m9-quote-scenario-builder";
import { salesConsoleSalesCoachingReadModel } from "@/features/sales/sales-console-m9-sales-coaching";
import { salesConsoleVehicleHoldReadModel } from "@/features/sales/sales-console-m9-vehicle-holds";
import { salesConsolePilotReadiness } from "@/features/sales/sales-console-mvp-pilot-readiness";
import { salesConsoleProductionReadiness } from "@/features/sales/sales-console-mvp-production-readiness";
import { salesConsoleReadAdapterPreview } from "@/features/sales/sales-console-mvp-read-adapters";
import { salesConsoleMvpRealDataWiring } from "@/features/sales/sales-console-mvp-real-data-wiring";
import { salesConsoleRoleViews } from "@/features/sales/sales-console-mvp-role-views";
import { SalesConsolePrototype } from "@/features/sales/sales-console-prototype";

describe("Sales Console", () => {
  it("renders the /sales route shell for the MVP execution foundation", () => {
    const markup = renderToStaticMarkup(<SalesPage />);

    expect(markup).toContain("Enterprise Sales Console");
    expect(markup).toContain("Read-only production MVP shell");
  });

  it("renders the first sales console slice with the required operating surfaces", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Enterprise Sales Console");
    expect(markup).toContain("Salesperson Today");
    expect(markup).toContain("Deal Desk");
    expect(markup).toContain("Inventory Intelligence");
    expect(markup).toContain("Manager Command Center");
    expect(markup).toContain("Lead Operations");
  });

  it("labels inactive dogfood controls as planned or read-only", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Search planned for dogfood");
    expect(markup).toContain("Alerts");
    expect(markup).toContain("read-only");
    expect(markup).toContain("Messages");
    expect(markup).toContain("planned");
    expect(markup).toContain("Dogfood UX cleanup: controls marked planned/read-only are intentionally inactive");
    expect(markup).toContain("Pipeline filters are planned");
    expect(markup).toContain("More actions are intentionally unavailable");
  });

  it("keeps the first slice non-destructive and production-MVP scoped", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Definition");
    expect(markup).toContain(salesConsoleMvpDefinition.operatingBoundary);
    expect(markup).toContain("Customer messaging automation");
    expect(markup).toContain("Quote submission");
    expect(markup).toContain("Vehicle holds or reservations");
    expect(markup).toContain("Finance decisions");
    expect(markup).toContain("Discount approvals");
  });

  it("renders the MVP principles that guide future expansion", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Principles");
    for (const principle of salesConsoleMvpDefinition.principles) {
      expect(markup).toContain(principle.name);
      expect(markup).toContain(principle.meaning);
    }
  });

  it("renders the MVP milestone roadmap for implementation planning", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Milestone Roadmap");
    expect(salesConsoleMvpDefinition.milestoneRoadmap).toHaveLength(13);
    for (const milestone of salesConsoleMvpDefinition.milestoneRoadmap) {
      expect(markup).toContain(milestone.id);
    }
    expect(markup).toContain("Approval and scope lock");
    expect(markup).toContain("Pilot review and stabilize");
  });

  it("renders what is included in the MVP for scope review", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("What Is Included In The MVP");
    expect(salesConsoleMvpDefinition.includedInMvp).toHaveLength(8);
    for (const item of salesConsoleMvpDefinition.includedInMvp) {
      expect(markup).toContain(item.area);
      expect(markup).toContain(item.outcome);
    }
    expect(markup).toContain("Console shell and navigation");
    expect(markup).toContain("Enterprise guardrails");
  });

  it("renders the recommended MVP boundary for release control", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Recommended MVP Boundary");
    expect(markup).toContain(salesConsoleMvpDefinition.recommendedMvpBoundary.recommendation);
    expect(markup).toContain(salesConsoleMvpDefinition.recommendedMvpBoundary.releaseLine);
    expect(salesConsoleMvpDefinition.recommendedMvpBoundary.nonNegotiables).toHaveLength(6);
    for (const item of salesConsoleMvpDefinition.recommendedMvpBoundary.nonNegotiables) {
      expect(markup).toContain(item);
    }
  });

  it("renders the MVP execution shell health and role placeholders", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Sales Console production MVP foundation");
    expect(markup).toContain("Read-only production MVP shell");
    expect(salesConsoleMvpExecution.shellChecks).toHaveLength(4);
    for (const check of salesConsoleMvpExecution.shellChecks) {
      expect(markup).toContain(check.check);
      expect(markup).toContain(check.proof);
    }
    for (const role of salesConsoleRoleViews) {
      expect(markup).toContain(role.label);
      expect(markup).toContain(role.defaultSurface);
    }
  });

  it("renders role-based console visibility without enabling excluded actions", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Role-Based Console");
    expect(markup).toContain("Active production MVP role: Sales Manager");
    expect(markup).toContain("Source records stay as the system of record");
    for (const role of salesConsoleRoleViews) {
      expect(markup).toContain(role.label);
      expect(markup).toContain(`Default: ${role.defaultSurface}`);
      expect(markup).toContain(role.placeholderBehavior);
      expect(markup).toContain(`${role.blockedActionCount} actions disabled/planned`);
      expect(role.futureActions.every((action) => action.enabled === false)).toBe(true);
    }
    expect(markup).toContain("Restricted: Manager Command Center");
    expect(markup).toContain("Restricted: None in read-only pilot");
  });

  it("renders production MVP readiness and separates admin review panels from operations", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Production MVP");
    expect(markup).toContain("Stable read-only operating console");
    expect(markup).toContain("Production Surface Boundary");
    expect(markup).toContain("Production Empty States");
    expect(markup).toContain("Messages");
    expect(markup).toContain("planned");
    for (const check of salesConsoleProductionReadiness.productionChecks) {
      expect(markup).toContain(check.check);
      expect(markup).toContain(check.evidence);
    }
    for (const surface of salesConsoleProductionReadiness.operationalSurfaces) {
      expect(markup).toContain(surface.surface);
      expect(markup).toContain(surface.reason);
    }
    for (const surface of salesConsoleProductionReadiness.adminReviewSurfaces) {
      expect(markup).toContain(surface.surface);
      expect(markup).toContain(surface.reason);
    }
    for (const state of salesConsoleProductionReadiness.emptyStates) {
      expect(markup).toContain(state.userMessage);
      expect(markup).toContain(state.verification);
    }
  });

  it("renders role-specific production views with admin review restricted from ordinary roles", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Role-Specific Production Views");
    expect(markup).toContain("Admin panels restricted from operating roles");
    expect(markup).toContain("Ordinary roles do not see Admin Review");
    expect(markup).toContain("Role-specific empty states present");
    for (const view of salesConsoleRoleProductionViews) {
      expect(markup).toContain(view.label);
      expect(markup).toContain(`Primary: ${view.primarySurface}`);
      expect(markup).toContain(view.emptyState);
    }
  });

  it("renders the M11 staff role model for read-only dogfooding", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M11 Staff Role Model");
    expect(markup).toContain("Required staff roles covered");
    expect(markup).toContain("Role model remains read-only");
    expect(markup).toContain("Planned roles do not create admin access");
    for (const role of salesConsoleM11StaffRoleModel) {
      expect(markup).toContain(role.label);
      expect(markup).toContain(role.readOnlyBoundary);
    }
  });

  it("renders M11 role-to-feature access for safe read-only dogfooding", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M11 Role-to-Feature Access");
    expect(markup).toContain("Feature access remains read-only");
    expect(markup).toContain("Only Admin / Owner sees Admin Review Panels");
    expect(markup).toContain("Finance visibility cannot decide finance");
    for (const access of salesConsoleM11RoleFeatureAccess) {
      expect(markup).toContain(access.role);
      expect(markup).toContain(access.emptyStateGuidance);
    }
  });

  it("renders M11 auth role seeding evidence without mutating real staff", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M11 Auth Role Seeding Evidence");
    expect(markup).toContain("Dogfood fixtures are non-destructive");
    expect(markup).toContain("Unknown roles remain restricted");
    for (const fixture of salesConsoleM11AuthRoleSeedingPlan.fixtures) {
      expect(markup).toContain(fixture.label);
      expect(markup).toContain(fixture.userId);
    }
  });

  it("renders M11 read-only feature flags without enabling excluded actions", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M11 Read-Only Feature Flags");
    expect(markup).toContain("Feature flags are visibility-only");
    expect(markup).toContain("Excluded actions remain blocked");
    for (const flag of salesConsoleM11ReadOnlyFeatureFlags) {
      expect(markup).toContain(flag.flag);
      expect(markup).toContain(flag.status);
    }
  });

  it("renders the M11 role verification summary before dogfooding", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M11 Role Verification Summary");
    expect(markup).toContain("Pre-dogfood role verification passes");
    expect(markup).toContain("Source systems remain read-only");
    expect(markup).toContain(`${salesConsoleM11RoleVerificationSummary.dogfoodReadinessEstimate}% dogfood readiness estimate`);
    for (const guardrail of salesConsoleM11RoleVerificationSummary.guardrails) {
      expect(markup).toContain(guardrail);
    }
  });

  it("renders the M12 role landing model inside the sales console", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M12 Role Landing Model");
    expect(markup).toContain("Every role has a landing experience");
    expect(markup).toContain("Landings stay inside /sales");
    for (const landing of salesConsoleM12RoleLandingExperiences) {
      expect(markup).toContain(landing.role);
      expect(markup).toContain(landing.startHereLabel);
    }
  });

  it("renders the M12 role-aware landing header with an internal target", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain(salesConsoleM12DefaultRoleLandingHeader.eyebrow);
    expect(markup).toContain(salesConsoleM12DefaultRoleLandingHeader.headline);
    expect(markup).toContain(salesConsoleM12DefaultRoleLandingHeader.readOnlyReminder);
    expect(markup).toContain("Go to default section");
    expect(markup).toContain("Landing header remains read-only");
    expect(markup).toContain("Headers target internal sections");
  });

  it("renders M12 role start cards as internal read-only orientation cards", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Role start cards");
    expect(markup).toContain("Start cards cover every landing");
    expect(markup).toContain("Start cards remain read-only");
    for (const card of salesConsoleM12RoleStartCards) {
      expect(markup).toContain(card.title);
      expect(markup).toContain(card.caution);
    }
  });

  it("renders M12 role empty and planned-state guidance", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M12 Role Empty / Planned States");
    expect(markup).toContain("Every role has empty/planned guidance");
    expect(markup).toContain("Planned states keep risky actions disabled");
    for (const state of salesConsoleM12RoleEmptyPlannedStates) {
      expect(markup).toContain(state.emptyState);
      expect(markup).toContain(state.plannedNext);
    }
  });

  it("renders the M12 admin dogfood landing readiness summary", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M12 Admin Dogfood Landing Summary");
    expect(markup).toContain("Role landing summary passes");
    expect(markup).toContain("Separate role routes remain deferred");
    expect(markup).toContain(`${salesConsoleM12AdminDogfoodLandingSummary.dogfoodReadinessEstimate}% role landing readiness`);
    for (const item of salesConsoleM12AdminDogfoodLandingSummary.remainingBeforeDogfood) {
      expect(markup).toContain(item);
    }
  });

  it("renders M13 dogfood readiness controls before staff trial", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M13 Dogfood Readiness");
    expect(markup).toContain("Owner review required before dogfood");
    expect(markup).toContain("Dogfood audience is controlled");
    expect(markup).toContain("Write workflows remain disabled");
    for (const audience of salesConsoleM13DogfoodReadiness.audience) {
      expect(markup).toContain(audience.label);
      expect(markup).toContain(audience.reason);
    }
  });

  it("renders the M13 staff pilot guide", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M13 Staff Pilot Guide");
    expect(markup).toContain("Guide explains what it is/is not");
    expect(markup).toContain("Guide covers staff and managers");
    expect(markup).toContain(salesConsoleM13StaffPilotGuide.whatItIsNot);
    for (const item of salesConsoleM13StaffPilotGuide.guideItems) {
      expect(markup).toContain(item.title);
      expect(markup).toContain(item.instruction);
    }
  });

  it("renders M13 feedback categories without enabling capture writes", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M13 Feedback Categories");
    expect(markup).toContain("Feedback categories cover dogfood risks");
    expect(markup).toContain("Feedback capture remains read-only");
    for (const item of salesConsoleM13FeedbackCategories) {
      expect(markup).toContain(item.category);
      expect(markup).toContain(item.example);
    }
  });

  it("renders M13 release observability signals", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M13 Release Observability");
    expect(markup).toContain("Core health signals present");
    expect(markup).toContain("Fallback/unavailable counts visible");
    expect(markup).toContain("Disabled action coverage visible");
    for (const signal of salesConsoleM13ReleaseObservability.healthSignals) {
      expect(markup).toContain(signal.label);
    }
  });

  it("renders M13 dogfood go/no-go gates", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M13 Dogfood Go/No-Go Gates");
    expect(markup).toContain("Dogfood gates cover release path");
    expect(markup).toContain("Each gate requires evidence");
    expect(markup).toContain("Production pilot still waits");
    for (const gate of salesConsoleM13DogfoodGates) {
      expect(markup).toContain(gate.gate);
      expect(markup).toContain(gate.mergeGate);
    }
  });

  it("renders the M14 operational tab audit", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M14 Operational Tab Audit");
    expect(markup).toContain("Placeholder-heavy surfaces identified");
    expect(markup).toContain("Planning panels marked for demotion");
    expect(markup).toContain("Future write actions remain planned");
    for (const item of salesConsoleM14OperationalTabAudit) {
      expect(markup).toContain(item.surface);
      expect(markup).toContain(item.action);
    }
  });

  it("renders M14 Salesperson Today operating depth", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Salesperson Today has operating groups");
    expect(markup).toContain("Salesperson Today remains read-only");
    expect(markup).toContain("Blockers/freshness explained");
    for (const group of salesConsoleM14SalespersonTodayDepth.groups) {
      expect(markup).toContain(group.group);
      expect(markup).toContain(group.manualAction);
    }
  });

  it("renders M14 Lead Operations operating depth", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Lead Operations has operating groups");
    expect(markup).toContain("Lead Operations remains read-only");
    expect(markup).toContain("SLA and assignment explained");
    for (const group of salesConsoleM14LeadOperationsDepth.groups) {
      expect(markup).toContain(group.group);
      expect(markup).toContain(group.verifyPrompt);
    }
  });

  it("renders M14 Deal Desk and Inventory operating depth", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Deal Desk has operating rows");
    expect(markup).toContain("Inventory has readiness rows");
    expect(markup).toContain("Deal and inventory remain read-only");
    for (const deal of salesConsoleM14DealInventoryDepth.dealOperatingRows) {
      expect(markup).toContain(deal.managerReviewNeed);
      expect(markup).toContain(deal.sourcePrompt);
    }
    for (const vehicle of salesConsoleM14DealInventoryDepth.inventoryOperatingRows) {
      expect(markup).toContain(vehicle.readiness);
      expect(markup).toContain(vehicle.sourcePrompt);
    }
  });

  it("renders M14 placeholder demotion for staff-facing operating focus", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M14 Placeholder Demotion");
    expect(markup).toContain("Staff starts with operating views");
    expect(markup).toContain("Admin review panels preserved");
    expect(markup).toContain("Placeholder writes remain disabled");
    expect(markup).toContain(salesConsoleM14PlaceholderDemotion.staffStartMessage);
    for (const item of salesConsoleM14PlaceholderDemotion.items) {
      expect(markup).toContain(item.surface);
      expect(markup).toContain(item.handling);
    }
  });

  it("renders M15 role-first daily navigation", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M15 role-first navigation covers core roles");
    expect(markup).toContain("M15 navigation uses internal sections");
    expect(markup).toContain("M15 role navigation remains read-only");
    for (const item of salesConsoleM15RoleFirstNavigation.items) {
      expect(markup).toContain(item.staffCue);
      expect(markup).toContain(item.guardrail);
    }
  });

  it("renders M15 operating section polish", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M15 operating polish covers daily sections");
    expect(markup).toContain("M15 operating polish explains staff use");
    expect(markup).toContain("M15 operating polish remains read-only");
    for (const item of salesConsoleM15OperatingSectionPolish.items) {
      expect(markup).toContain(item.dailyUse);
      expect(markup).toContain(item.scanTarget);
      expect(markup).toContain(item.verificationRule);
    }
  });

  it("renders M15 empty and fallback clarity", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M15 empty states cover operating sections");
    expect(markup).toContain("M15 fallback labels explain next verification");
    expect(markup).toContain("M15 empty states remain read-only");
    for (const item of salesConsoleM15EmptyStateClarity.items) {
      expect(markup).toContain(item.staffMessage);
      expect(markup).toContain(item.verificationStep);
    }
  });

  it("renders M15 manager daily command polish", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M15 Manager Daily Command");
    expect(markup).toContain("M15 manager command has daily priorities");
    expect(markup).toContain("M15 manager command explains action");
    expect(markup).toContain("M15 manager command remains read-only");
    for (const priority of salesConsoleM15ManagerCommandPolish.priorities) {
      expect(markup).toContain(priority.priority);
      expect(markup).toContain(priority.managerMeaning);
      expect(markup).toContain(priority.readOnlyBoundary);
    }
  });

  it("renders M15 staff review readiness", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M15 Staff Review Readiness");
    expect(markup).toContain("M15 staff review covers release concerns");
    expect(markup).toContain("M15 staff review gates ready");
    expect(markup).toContain("M15 staff review remains read-only");
    expect(markup).toContain(salesConsoleM15StaffReviewReadiness.reviewRecommendation);
    for (const gate of salesConsoleM15StaffReviewReadiness.gates) {
      expect(markup).toContain(gate.gate);
      expect(markup).toContain(gate.evidence);
    }
  });

  it("renders M16 controlled workflow selection", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M16 Workflow Selection");
    expect(markup).toContain("M16 selects Manager Review first");
    expect(markup).toContain("M16 risky workflows remain not selected");
    expect(markup).toContain("M16 workflow selection remains planning-only");
    expect(markup).toContain(salesConsoleM16WorkflowSelection.selectedWorkflow);
    for (const candidate of salesConsoleM16WorkflowSelection.candidates) {
      expect(markup).toContain(candidate.candidate);
      expect(markup).toContain(candidate.activationPosture);
    }
  });

  it("renders M16 Manager Review Request contract", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M16 Manager Review Contract");
    expect(markup).toContain("M16 manager review contract has required fields");
    expect(markup).toContain("M16 manager review permissions defined");
    expect(markup).toContain("M16 manager review audit shape defined");
    expect(markup).toContain("M16 manager review remains disabled");
    expect(markup).toContain(salesConsoleM16ManagerReviewContract.writeActivation);
    for (const field of salesConsoleM16ManagerReviewContract.fields) {
      expect(markup).toContain(field.field);
      expect(markup).toContain(field.source);
    }
  });

  it("renders M16 disabled Manager Review Request preview", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M16 manager review preview is disabled");
    expect(markup).toContain("M16 manager review shows unavailable states");
    expect(markup).toContain("M16 manager review preview lives in Deal Desk");
    expect(markup).toContain(salesConsoleM16ManagerReviewDisabledPreview.ctaLabel);
    expect(markup).toContain(salesConsoleM16ManagerReviewDisabledPreview.disabledReason);
    expect(markup).toContain("disabled");
  });

  it("renders M16 audit readiness and excluded-action guardrails", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M16 Audit &amp; Guardrails");
    expect(markup).toContain("M16 audit readiness covers request shape");
    expect(markup).toContain("M16 excluded actions remain blocked");
    expect(markup).toContain("M16 audit guardrails remain planning-only");
    for (const guardrail of salesConsoleM16AuditGuardrails.excludedActionGuardrails) {
      expect(markup).toContain(guardrail.guardrail);
      expect(markup).toContain(guardrail.evidence);
    }
  });

  it("renders M16 activation decision gate", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M16 Activation Decision Gate");
    expect(markup).toContain("M16 activation gate covers core concerns");
    expect(markup).toContain("M16 ready for M17 planning");
    expect(markup).toContain("M16 keeps workflow disabled");
    expect(markup).toContain(salesConsoleM16ActivationDecisionGate.m17Recommendation);
    for (const gate of salesConsoleM16ActivationDecisionGate.gates) {
      expect(markup).toContain(gate.gate);
      expect(markup).toContain(gate.evidence);
    }
  });

  it("renders M17 request state model", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M17 Request State Model");
    expect(markup).toContain("M17 request state model defines statuses");
    expect(markup).toContain("M17 submit blocks without backend");
    expect(markup).toContain("M17 state model stays internal");
    expect(markup).toContain(salesConsoleM17RequestStateModel.currentStatus);
    for (const transition of salesConsoleM17RequestStateModel.allowedTransitions) {
      expect(markup).toContain(transition.reason);
    }
  });

  it("renders M17 disabled request form shell", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Manager Review Request Form");
    expect(markup).toContain("M17 request form has required fields");
    expect(markup).toContain("M17 request form controls disabled");
    expect(markup).toContain("M17 request form explains disabled state");
    expect(markup).toContain(salesConsoleM17RequestFormShell.helperText);
    expect(markup).toContain(salesConsoleM17RequestFormShell.submitLabel);
    for (const field of salesConsoleM17RequestFormShell.fields) {
      expect(markup).toContain(field.label);
    }
  });

  it("renders M17 validation and permissions", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M17 Validation &amp; Permissions");
    expect(markup).toContain("M17 salesperson request permission scoped");
    expect(markup).toContain("M17 manager review permission scoped");
    expect(markup).toContain("M17 validation blocks submit until backend");
    for (const decision of salesConsoleM17ValidationPermissions.decisions) {
      expect(markup).toContain(decision.role);
      expect(markup).toContain(decision.reason);
    }
  });

  it("renders M17 audit-safe submit placeholder", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M17 Audit-Safe Submit Placeholder");
    expect(markup).toContain("M17 submit placeholder blocks writes");
    expect(markup).toContain("M17 submit placeholder names missing backend");
    expect(markup).toContain("M17 submit placeholder includes audit fields");
    expect(markup).toContain(salesConsoleM17AuditSafeSubmitPlaceholder.placeholderResult);
    for (const blocker of salesConsoleM17AuditSafeSubmitPlaceholder.submitBlockers) {
      expect(markup).toContain(blocker);
    }
  });

  it("renders M17 release gate", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M17 Release Gate");
    expect(markup).toContain("M17 activation shell ready");
    expect(markup).toContain("M17 release gate blocks live submit");
    expect(markup).toContain("M17 names backend endpoint next");
    expect(markup).toContain(salesConsoleM17ReleaseGate.releaseRecommendation);
    for (const gate of salesConsoleM17ReleaseGate.gates) {
      expect(markup).toContain(gate.gate);
      expect(markup).toContain(gate.evidence);
    }
  });

  it("renders M18 backend contract", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M18 Backend Contract");
    expect(markup).toContain("M18 backend contract defines endpoint");
    expect(markup).toContain("M18 backend contract requires audit fields");
    expect(markup).toContain("M18 backend contract blocks writes");
    expect(markup).toContain(salesConsoleM18BackendContract.endpoint);
    for (const field of salesConsoleM18BackendContract.requestFields) {
      expect(markup).toContain(field.field);
      expect(markup).toContain(field.source);
    }
  });

  it("renders M18 server validation", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("M18 Server Validation");
    expect(markup).toContain("M18 server validation covers payload");
    expect(markup).toContain("M18 server validation requires source snapshot");
    expect(markup).toContain("M18 server validation keeps submit blocked");
    expect(markup).toContain(salesConsoleM18ServerValidation.headline);
    for (const rule of salesConsoleM18ServerValidation.validationRules) {
      expect(markup).toContain(rule.rule);
      expect(markup).toContain(rule.evidence);
    }
  });

  it("renders real auth access mapping with blocked and mapped route states", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Auth Access Mapping");
    expect(markup).toContain("Unauthenticated users are blocked");
    expect(markup).toContain("Unknown roles deny by default");
    expect(markup).toContain("Admin Review requires Admin / Owner");
    for (const decision of salesConsoleAuthAccessExamples) {
      expect(markup).toContain(decision.reason);
    }
  });

  it("renders real read-only source wiring without enabling unavailable sources", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Real Read-Only Source Wiring");
    expect(markup).toContain("MVP real data sources covered");
    expect(markup).toContain("Unavailable sources remain blocked");
    for (const wire of salesConsoleM10ReadOnlySourceWiring) {
      expect(markup).toContain(wire.sourceSystem);
      expect(markup).toContain(wire.guardrail);
      expect(wire.writeEnabled).toBe(false);
    }
  });

  it("renders admin operational separation for production review", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Admin / Operational Separation");
    expect(markup).toContain("Operating roles do not see Admin Review");
    expect(markup).toContain("Admin panels require Admin / Owner");
    expect(markup).toContain("Finance remains visibility-only");
    for (const guardrail of salesConsoleM10AdminOperationalSeparation.guardrails) {
      expect(markup).toContain(guardrail);
    }
  });

  it("renders manager review request foundation without enabling submissions", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Manager Review Request Foundation");
    expect(markup).toContain("Review requests remain disabled");
    expect(markup).toContain("Fallback placeholders block submission");
    for (const contract of salesConsoleM10ManagerReviewRequestFoundation.contracts) {
      expect(markup).toContain(contract.requestType);
      expect(contract.requestEnabled).toBe(false);
      expect(contract.decisionEnabled).toBe(false);
      expect(contract.sourceWriteEnabled).toBe(false);
    }
  });

  it("renders enterprise audit trail foundation without enabling sensitive actions", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Audit Trail Foundation");
    expect(markup).toContain("Sensitive actions require audit coverage");
    expect(markup).toContain("Enterprise actions stay disabled");
    for (const coverage of salesConsoleAuditReadModel.futureActionCoverage) {
      expect(markup).toContain(coverage.action);
      expect(markup).toContain(coverage.auditEventType);
      expect(markup).toContain(coverage.coverage);
      expect(coverage.enabled).toBe(false);
    }
    for (const event of salesConsoleAuditReadModel.events) {
      expect(markup).toContain(event.auditId);
      expect(markup).toContain(event.reason);
      expect(markup).toContain(event.beforeSummary);
      expect(markup).toContain(event.afterSummary);
    }
  });

  it("renders enterprise permission gates and role scopes without enabling actions", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Enterprise Permissions");
    expect(markup).toContain("Deny-by-default action gates");
    expect(markup).toContain("Permission gates deny by default");
    expect(markup).toContain("Sensitive workflows have audit and permission coverage");
    for (const gate of salesConsoleEnterprisePermissionReadModel.gates) {
      expect(markup).toContain(gate.capability);
      expect(markup).toContain(gate.defaultDecision);
      expect(markup).toContain(gate.requiredScope);
      expect(gate.enabled).toBe(false);
    }
    for (const scope of salesConsoleEnterprisePermissionReadModel.roleScopes) {
      expect(markup).toContain(scope.label);
      expect(markup).toContain(scope.storePlaceholder);
      expect(markup).toContain(scope.teamPlaceholder);
      expect(markup).toContain(scope.ownershipPlaceholder);
    }
  });

  it("renders CRM/DMS integration contracts while preserving source systems", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("CRM/DMS Integration Contracts");
    expect(markup).toContain("Sources remain systems of record");
    expect(markup).toContain("Missing sources block writes");
    for (const contract of salesConsoleEnterpriseIntegrationReadModel.contracts) {
      expect(markup).toContain(contract.recordType);
      expect(markup).toContain(contract.owner);
      expect(markup).toContain(contract.fallbackLabel);
      expect(markup).toContain(contract.freshnessRule);
      expect(markup).toContain(contract.sourceLinkPattern);
    }
  });

  it("renders deal workflow foundation without enabling approvals or source writes", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Deal Workflow Foundation");
    expect(markup).toContain("Deal workflow remains read-only");
    expect(markup).toContain("Salesperson cannot approve or finance");
    for (const transition of salesConsoleDealWorkflowReadModel.transitions) {
      expect(markup).toContain(transition.label);
      expect(markup).toContain(transition.from);
      expect(markup).toContain(transition.to);
      expect(transition.enabled).toBe(false);
      expect(transition.sourceWrite).toBe(false);
    }
    for (const review of salesConsoleDealWorkflowReadModel.managerReviewPlaceholders) {
      expect(markup).toContain(review.dealId);
      expect(markup).toContain(review.auditEventType);
      expect(review.enabled).toBe(false);
    }
  });

  it("renders manager approval foundation without enabling approval decisions", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Manager Approval Foundation");
    expect(markup).toContain("Approval execution disabled");
    expect(markup).toContain("Audit, threshold, and reason required");
    expect(markup).toContain("Only managers/admins can decide later");
    for (const approval of salesConsoleManagerApprovalReadModel.requestContracts) {
      expect(markup).toContain(approval.approvalType);
      expect(markup).toContain(`Request role: ${approval.requestRole}`);
      expect(approval.enabled).toBe(false);
      expect(approval.managerDecisionEnabled).toBe(false);
    }
    for (const gate of salesConsoleManagerApprovalReadModel.decisionGates) {
      expect(markup).toContain(`${gate.approvalType} decision`);
      expect(gate.decisionEnabled).toBe(false);
      expect(gate.denyByDefault).toBe(true);
    }
  });

  it("renders quote scenario builder foundation as estimate-only", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Quote Scenario Builder Foundation");
    expect(markup).toContain("Estimate-only scenarios");
    expect(markup).toContain("Review and finance verification required");
    expect(markup).toContain("Audit and permission coverage present");
    for (const scenario of salesConsoleQuoteScenarioReadModel.scenarios) {
      expect(markup).toContain(scenario.scenarioId);
      expect(markup).toContain(scenario.version);
      expect(scenario.enabled).toBe(false);
      expect(scenario.estimateOnly).toBe(true);
    }
    expect(salesConsoleQuoteScenarioReadModel.submissionEnabled).toBe(false);
  });

  it("renders finance handoff foundation without exposing restricted finance decisions", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Finance Handoff Foundation");
    expect(markup).toContain("Finance handoff remains read-only");
    expect(markup).toContain("Salespeople cannot see restricted finance fields");
    expect(markup).toContain("Audit and permission coverage present");
    for (const handoff of salesConsoleFinanceHandoffReadModel.packages) {
      expect(markup).toContain(handoff.handoffId);
      expect(handoff.decisionEnabled).toBe(false);
      expect(handoff.enabled).toBe(false);
    }
    for (const rule of salesConsoleFinanceHandoffReadModel.visibilityRules) {
      expect(markup).toContain(rule.field);
      if (rule.restricted) expect(rule.visibleTo).not.toContain("salesperson");
    }
  });

  it("renders customer messaging foundation without enabling sends or automation", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Customer Messaging Foundation");
    expect(markup).toContain("Messaging send and automation disabled");
    expect(markup).toContain("Consent, preview, opt-out, and rate limit required");
    expect(markup).toContain("Audit and permission coverage present");
    for (const draft of salesConsoleCustomerMessagingReadModel.drafts) {
      expect(markup).toContain(draft.draftId);
      expect(draft.sendEnabled).toBe(false);
      expect(draft.automationEnabled).toBe(false);
    }
    for (const template of salesConsoleCustomerMessagingReadModel.templates) {
      expect(markup).toContain(template.templateId);
    }
  });

  it("renders vehicle holds foundation without creating reservations", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Vehicle Holds Foundation");
    expect(markup).toContain("Vehicle holds disabled");
    expect(markup).toContain("Manager approval, expiry, and verification required");
    expect(markup).toContain("Verify-first inventory blocks holds");
    for (const hold of salesConsoleVehicleHoldReadModel.requests) {
      expect(markup).toContain(hold.holdId);
      expect(markup).toContain(hold.stockNumber);
      expect(hold.enabled).toBe(false);
      expect(hold.sourceWrite).toBe(false);
    }
    for (const limit of salesConsoleVehicleHoldReadModel.limits) {
      expect(markup).toContain(`${limit.scope} hold limit`);
      expect(markup).toContain(limit.reason);
    }
  });

  it("renders enterprise forecasting foundation with confidence and role-limited restricted metrics", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Enterprise Forecasting Foundation");
    expect(markup).toContain("Confidence and freshness visible");
    expect(markup).toContain("Restricted metrics role-limited");
    expect(markup).toContain("Stale inputs lower confidence");
    for (const row of salesConsoleForecastReadModel.forecastRows) {
      expect(markup).toContain(row.metric);
      expect(markup).toContain(row.value);
      expect(markup).toContain(row.inputSummary);
      if (row.restricted) expect(row.visibleTo).not.toContain("salesperson");
    }
  });

  it("renders AI next-best-action foundation without automatic execution", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("AI Next-Best-Action Foundation");
    expect(markup).toContain("AI is advisory only");
    expect(markup).toContain("Evidence, reason, and confidence required");
    expect(markup).toContain("AI cannot execute risky actions");
    for (const recommendation of salesConsoleAiNextBestActionReadModel.recommendations) {
      expect(markup).toContain(recommendation.recommendationId);
      expect(markup).toContain(recommendation.reason);
      expect(recommendation.autoExecute).toBe(false);
      expect(recommendation.humanConfirmationRequired).toBe(true);
    }
  });

  it("renders sales coaching foundation without hidden scoring or punitive automation", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Sales Coaching Foundation");
    expect(markup).toContain("Coaching insights are explainable");
    expect(markup).toContain("No hidden scoring or punitive automation");
    expect(markup).toContain("Coaching visibility role-limited");
    for (const insight of salesConsoleSalesCoachingReadModel.insights) {
      expect(markup).toContain(insight.insightId);
      expect(markup).toContain(insight.evidence);
      expect(markup).toContain(insight.suggestedTopic);
      expect(insight.hiddenScore).toBe(false);
      expect(insight.punitiveAutomation).toBe(false);
    }
  });

  it("renders multi-store reporting foundation with exports disabled", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Multi-Store Reporting Foundation");
    expect(markup).toContain("Reporting is read-only");
    expect(markup).toContain("Aggregation and freshness visible");
    expect(markup).toContain("Unauthorized store visibility blocked");
    expect(markup).toContain("Exports disabled");
    for (const row of salesConsoleMultiStoreReportingReadModel.rows) {
      expect(markup).toContain(row.metric);
      expect(markup).toContain(row.storeId);
      expect(markup).toContain(row.aggregationRule);
    }
    expect(salesConsoleMultiStoreReportingReadModel.exportEnabled).toBe(false);
  });

  it("renders read-only guardrails for every excluded risky MVP action", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Read-Only Action Guardrails");
    expect(salesConsoleMvpExecution.readOnlyGuardrails).toHaveLength(5);
    for (const guardrail of salesConsoleMvpExecution.readOnlyGuardrails) {
      expect(markup).toContain(guardrail.action);
      expect(markup).toContain(guardrail.reason);
    }
    expect(salesConsoleMvpExecution.readOnlyGuardrails.every((guardrail) => guardrail.status !== "ready")).toBe(true);
  });

  it("renders typed data-contract placeholders with freshness labels", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Execution Data Contract");
    expect(salesConsoleMvpExecution.dataContractFields).toHaveLength(6);
    for (const field of salesConsoleMvpExecution.dataContractFields) {
      expect(markup).toContain(field.field);
      expect(markup).toContain(field.fallbackLabel);
    }
    expect(markup).toContain("verify-first");
    expect(markup).toContain("placeholder");
    expect(markup).toContain("stale");
  });

  it("renders the live data contract without enabling writes", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Live Data Contract");
    expect(markup).toContain(salesConsoleMvpLiveDataContract.boundary);
    expect(salesConsoleMvpLiveDataContract.liveSources).toHaveLength(6);
    for (const source of salesConsoleMvpLiveDataContract.liveSources) {
      expect(source.mode).toBe("read-only");
      expect(markup).toContain(source.name);
      expect(markup).toContain(source.fallback);
    }
  });

  it("renders real data wiring evidence with safe fallback labels", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Real Data Wiring");
    expect(markup).toContain(salesConsoleMvpRealDataWiring.boundary);
    for (const source of salesConsoleMvpRealDataWiring.connectedSources) {
      expect(markup).toContain(source.source);
      expect(markup).toContain(source.fallback);
    }
    expect(markup).toContain("Board/task read model");
    expect(markup).toContain("Customer lead read model");
    expect(markup).toContain("Vehicle registry read model");
    expect(markup).toContain("Appointment context remains fallback");
  });

  it("renders read model contracts for every MVP operating surface", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Read Model Contracts");
    expect(salesConsoleMvpLiveDataContract.readModels).toHaveLength(6);
    for (const model of salesConsoleMvpLiveDataContract.readModels) {
      expect(markup).toContain(model.surface);
      expect(markup).toContain(model.recordKey);
      expect(model.requiredFields.length).toBeGreaterThan(4);
    }
    expect(markup).toContain("No quote submission is allowed from placeholder deal data.");
  });

  it("renders source link contracts with freshness and unavailable labels", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Source Link Contracts");
    expect(salesConsoleMvpLiveDataContract.sourceLinks).toHaveLength(5);
    for (const link of salesConsoleMvpLiveDataContract.sourceLinks) {
      expect(markup).toContain(link.label);
      expect(markup).toContain(link.routePattern);
      expect(markup).toContain(link.unavailableLabel);
    }
  });

  it("keeps adapter safety rules read-only and non-escalating", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Adapter Safety Rules");
    expect(salesConsoleMvpLiveDataContract.adapterRules).toHaveLength(4);
    for (const rule of salesConsoleMvpLiveDataContract.adapterRules) {
      expect(markup).toContain(rule.rule);
      expect(markup).toContain(rule.enforcement);
    }
    expect(markup).toContain("Data presence cannot enable messaging, quote submission, vehicle holds, finance decisions, or discount approvals in MVP.");
  });

  it("renders read adapter preview output without changing source records", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Read Adapter Preview");
    expect(markup).toContain("Read-only adapter output from mock source-shaped records.");
    expect(salesConsoleReadAdapterPreview.readOnly).toBe(true);
    expect(markup).toContain(`${salesConsoleReadAdapterPreview.sellerQueue.length} normalized items`);
    expect(markup).toContain(`${salesConsoleReadAdapterPreview.leadOperations.length} lead signals`);
    expect(markup).toContain(`${salesConsoleReadAdapterPreview.inventoryMatches.length} vehicle matches`);
    expect(markup).toContain(`${salesConsoleReadAdapterPreview.managerRisks.length} aggregated risks`);
  });

  it("uses the read adapter model for the visible operating UI", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain(`Showing ${salesConsoleReadAdapterPreview.sellerQueue.length} adapter-ranked work items`);
    expect(markup).toContain("Quote scenarios are visibility-only from the adapter.");
    expect(markup).toContain("Adapter Deals");
    expect(markup).toContain("Seller Items");
    expect(markup).toContain("Lead Risks");
    expect(markup).toContain("Verify Vehicles");
    for (const item of salesConsoleReadAdapterPreview.sellerQueue) {
      expect(markup).toContain(item.customer);
      expect(markup).toContain(item.nextAction);
      expect(markup).toContain(item.freshness);
      expect(markup).toContain(item.sourceLinks[0]?.unavailableLabel);
    }
    for (const deal of salesConsoleReadAdapterPreview.deals) {
      expect(markup).toContain(deal.dealId);
      expect(markup).toContain(deal.scenario);
    }
    for (const vehicle of salesConsoleReadAdapterPreview.inventoryMatches) {
      expect(markup).toContain(vehicle.vehicle);
      expect(markup).toContain(vehicle.status);
    }
    expect(markup).toContain("Adapter Source Links");
    expect(markup).toContain("Blocked:");
    expect(markup).toContain("Verify First");
  });

  it("renders pilot readiness smoke checks for safe review", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Pilot Readiness Smoke");
    expect(salesConsoleMvpExecution.pilotReadinessChecks).toHaveLength(4);
    for (const check of salesConsoleMvpExecution.pilotReadinessChecks) {
      expect(markup).toContain(check.check);
      expect(markup).toContain(check.evidence);
    }
    expect(markup).toContain("Read-only guardrails");
  });

  it("renders pilot-ready MVP checks, priority brief, state verification, and fallback states", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("Pilot-Ready MVP");
    expect(markup).toContain("30 seconds");
    expect(markup).toContain("Pilot State Verification");
    expect(markup).toContain("Pilot Acceptance Tracking");
    expect(markup).toContain("Pilot Empty &amp; Fallback States");
    for (const priority of salesConsolePilotReadiness.priorityBrief) {
      expect(markup).toContain(priority);
    }
    for (const state of salesConsolePilotReadiness.stateVerification) {
      expect(markup).toContain(state.label);
      expect(markup).toContain(state.meaning);
    }
    for (const fallback of salesConsolePilotReadiness.fallbackStates) {
      expect(markup).toContain(fallback.emptyLabel);
      expect(markup).toContain(fallback.fallbackAction);
    }
    expect(salesConsolePilotReadiness.pilotBlockers).toHaveLength(0);
  });

  it("renders MVP roles and permissions for pilot access review", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Roles &amp; Permissions");
    expect(salesConsoleMvpDefinition.rolesAndPermissions).toHaveLength(4);
    for (const role of salesConsoleMvpDefinition.rolesAndPermissions) {
      expect(markup).toContain(role.role);
      expect(markup).toContain(role.mvpControl);
    }
    expect(markup).toContain("Sales Manager");
    expect(markup).toContain("BDC / Lead Coordinator");
  });

  it("renders the MVP data source map for data-trust review", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Data Source Map");
    expect(salesConsoleMvpDefinition.dataSourceMap).toHaveLength(6);
    for (const source of salesConsoleMvpDefinition.dataSourceMap) {
      expect(markup).toContain(source.surface);
      expect(markup).toContain(source.fallback);
    }
    expect(markup).toContain("Inventory Intelligence");
    expect(markup).toContain("Customer and source links");
  });

  it("renders the MVP pilot acceptance checklist for release readiness", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Pilot Acceptance Checklist");
    expect(salesConsoleMvpDefinition.pilotAcceptanceChecklist).toHaveLength(7);
    for (const check of salesConsoleMvpDefinition.pilotAcceptanceChecklist) {
      expect(markup).toContain(check.item);
      expect(markup).toContain(check.owner);
    }
    expect(markup).toContain("No risky write actions are active");
  });

  it("renders MVP exclusions so the pilot scope stays controlled", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("What Is Excluded From The MVP");
    expect(salesConsoleMvpDefinition.excludedFromMvp).toHaveLength(6);
    for (const item of salesConsoleMvpDefinition.excludedFromMvp) {
      expect(markup).toContain(item.capability);
      expect(markup).toContain(item.reason);
    }
    expect(markup).toContain("Full CRM replacement");
  });

  it("renders the MVP build order for implementation sequencing", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Build Order");
    expect(salesConsoleMvpDefinition.buildOrder).toHaveLength(7);
    for (const item of salesConsoleMvpDefinition.buildOrder) {
      expect(markup).toContain(item.step);
      expect(markup).toContain(item.name);
    }
    expect(markup).toContain("Pilot, measure, and stabilize");
  });

  it("renders MVP decision gates for review checkpoints", () => {
    const markup = renderToStaticMarkup(<SalesConsolePrototype />);

    expect(markup).toContain("MVP Decision Gates");
    expect(salesConsoleMvpDefinition.decisionGates).toHaveLength(6);
    for (const item of salesConsoleMvpDefinition.decisionGates) {
      expect(markup).toContain(item.gate);
      expect(markup).toContain(item.passSignal);
    }
    expect(markup).toContain("Gate 6: Expansion readiness");
  });

  it("uses sales-specific loading and error states for protected route failures", () => {
    const loadingMarkup = renderToStaticMarkup(<SalesConsoleLoading />);
    const errorMarkup = renderToStaticMarkup(
      <SalesConsoleError error={new Error("smoke failure")} reset={() => undefined} />
    );

    expect(loadingMarkup).toContain("Opening Sales Console");
    expect(errorMarkup).toContain("Couldn&#x27;t open Sales Console");
    expect(errorMarkup).toContain("Retry Sales Console");
    expect(errorMarkup).toContain("Open Dispatch Board");
  });
});
