"use client";

import { useMemo, useState, useTransition } from "react";

import type {
  AppointmentAutomationSimulationInput,
  AppointmentCatalogAutomationAdmin
} from "@/server/services/appointment-catalog-automation-admin";

type AppointmentCatalogAutomationPanelProps = {
  initialCatalog: AppointmentCatalogAutomationAdmin;
};

type SimulationResult = Awaited<
  ReturnType<
    typeof import("@/server/services/appointment-catalog-automation-admin").simulateAppointmentCatalogAutomationForManager
  >
>;

type CatalogPurpose = AppointmentCatalogAutomationAdmin["purposes"][number];

type PurposeEditState = {
  name: string;
  description: string;
  isActive: boolean;
  defaultDurationMinutes: string;
  minimumDurationMinutes: string;
  maximumDurationMinutes: string;
  preparationBufferMinutes: string;
  cleanupBufferMinutes: string;
  startIntervalMinutes: string;
  minimumNoticeMinutes: string;
  bookingHorizonDays: string;
  approvalMode: string;
  missingInputBehavior: string;
  outcomeCodesText: string;
  followUpDispositionCodesText: string;
  reasonCodesText: string;
};

type LifecycleAction = "CREATE" | "DUPLICATE" | "DEPRECATE" | "REACTIVATE" | "DELETE";

type LifecycleState = {
  action: LifecycleAction;
  purposeCode: string;
  name: string;
  sourcePurposeCode: string;
  category: string;
  reason: string;
};

type ReviewAction = "APPROVE" | "REQUEST_CHANGES" | "REJECT";
type CatalogCodeType = "OUTCOME" | "FOLLOW_UP_DISPOSITION" | "REASON";
type CatalogCodeAction = "ADD" | "RENAME" | "REMOVE";

type CodeEditorState = {
  catalog: CatalogCodeType;
  action: CatalogCodeAction;
  code: string;
  nextCode: string;
  label: string;
  description: string;
  reason: string;
};

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toCodeText(values: string[]) {
  return values.join(", ");
}

function fromCodeText(value: string) {
  return value
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
}

function buildPurposeEditState(
  purpose: CatalogPurpose | undefined,
  catalog: AppointmentCatalogAutomationAdmin
): PurposeEditState {
  return {
    name: purpose?.name ?? "",
    description: purpose?.description ?? "",
    isActive: purpose?.isActive ?? true,
    defaultDurationMinutes: String(purpose?.defaultDurationMinutes ?? 30),
    minimumDurationMinutes: String(purpose?.minimumDurationMinutes ?? 15),
    maximumDurationMinutes: String(purpose?.maximumDurationMinutes ?? 120),
    preparationBufferMinutes: String(purpose?.preparationBufferMinutes ?? 10),
    cleanupBufferMinutes: String(purpose?.cleanupBufferMinutes ?? 10),
    startIntervalMinutes: String(purpose?.startIntervalMinutes ?? 15),
    minimumNoticeMinutes: String(purpose?.minimumNoticeMinutes ?? 30),
    bookingHorizonDays: String(purpose?.bookingHorizonDays ?? 180),
    approvalMode: purpose?.approvalMode ?? "OWNER_CAN_SCHEDULE",
    missingInputBehavior: purpose?.missingInputBehavior ?? "CREATE_DRAFT",
    outcomeCodesText: toCodeText(purpose?.outcomeCodes ?? []),
    followUpDispositionCodesText: toCodeText(purpose?.followUpDispositionCodes ?? []),
    reasonCodesText: toCodeText(catalog.catalogs.reasonCodes)
  };
}

function parseNumber(value: string) {
  return Number.parseInt(value, 10);
}

export function AppointmentCatalogAutomationPanel({
  initialCatalog
}: AppointmentCatalogAutomationPanelProps) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const firstPurpose = catalog.purposes[0];
  const [selectedPurposeCode, setSelectedPurposeCode] = useState(firstPurpose?.code ?? "");
  const selectedPurpose =
    catalog.purposes.find((purpose) => purpose.code === selectedPurposeCode) ?? firstPurpose;
  const [editState, setEditState] = useState(() =>
    buildPurposeEditState(firstPurpose, initialCatalog)
  );
  const [changeReason, setChangeReason] = useState("");
  const [activationReason, setActivationReason] = useState("");
  const [reviewAction, setReviewAction] = useState<ReviewAction>("APPROVE");
  const [reviewReason, setReviewReason] = useState("");
  const [codeEditorState, setCodeEditorState] = useState<CodeEditorState>({
    catalog: "OUTCOME",
    action: "ADD",
    code: "",
    nextCode: "",
    label: "",
    description: "",
    reason: ""
  });
  const [lifecycleState, setLifecycleState] = useState<LifecycleState>({
    action: "DUPLICATE",
    purposeCode: "",
    name: "",
    sourcePurposeCode: firstPurpose?.code ?? "",
    category: firstPurpose?.category ?? "GENERAL",
    reason: ""
  });
  const [simulationDraft, setSimulationDraft] = useState<AppointmentAutomationSimulationInput>({
    purposeCode: firstPurpose?.code ?? "",
    outcomeCode: firstPurpose?.outcomeCodes[0] ?? "COMPLETED",
    followUpDispositionCode:
      firstPurpose?.followUpDispositionCodes.includes("FOLLOW_UP_APPOINTMENT_REQUIRED")
        ? "FOLLOW_UP_APPOINTMENT_REQUIRED"
        : firstPurpose?.followUpDispositionCodes[0] ?? "NO_FOLLOW_UP_REQUIRED",
    missingRequiredFields: []
  });
  const [missingInputText, setMissingInputText] = useState("");
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const activeRules = useMemo(
    () => catalog.automationRules.filter((rule) => rule.enabled),
    [catalog.automationRules]
  );
  const canActivateDraft =
    Boolean(catalog.versioning.draftVersion) &&
    catalog.versioning.validation.isValid &&
    catalog.versioning.approval.status === "APPROVED";
  const selectedPurposeUsage = selectedPurpose
    ? catalog.purposeUsage.find((usage) => usage.purposeCode === selectedPurpose.code)
    : null;
  const editableCatalogCodes =
    codeEditorState.catalog === "OUTCOME"
      ? selectedPurpose?.outcomeCodes ?? []
      : codeEditorState.catalog === "FOLLOW_UP_DISPOSITION"
        ? selectedPurpose?.followUpDispositionCodes ?? []
        : catalog.catalogs.reasonCodes;

  function selectPurpose(purposeCode: string) {
    const purpose = catalog.purposes.find((candidate) => candidate.code === purposeCode);

    if (!purpose) {
      return;
    }

    setSelectedPurposeCode(purpose.code);
    setEditState(buildPurposeEditState(purpose, catalog));
    setSimulation(null);
    setSimulationDraft((current) => ({
      ...current,
      purposeCode: purpose.code,
      outcomeCode: purpose.outcomeCodes.includes(current.outcomeCode)
        ? current.outcomeCode
        : purpose.outcomeCodes[0] ?? "COMPLETED",
      followUpDispositionCode: purpose.followUpDispositionCodes.includes(
        current.followUpDispositionCode
      )
        ? current.followUpDispositionCode
        : purpose.followUpDispositionCodes[0] ?? "NO_FOLLOW_UP_REQUIRED"
    }));
  }

  function handleCatalogResponse(
    payload: { catalog?: AppointmentCatalogAutomationAdmin; error?: string } | null,
    preferredPurposeCode = selectedPurposeCode
  ) {
    if (!payload?.catalog) {
      setErrorMessage(payload?.error ?? "Unable to update appointment catalog right now.");
      return;
    }

    const nextCatalog = payload.catalog;
    const nextSelectedPurpose =
      nextCatalog.purposes.find((purpose) => purpose.code === preferredPurposeCode) ??
      nextCatalog.purposes.find((purpose) => purpose.code === selectedPurposeCode) ??
      nextCatalog.purposes[0];

    setCatalog(nextCatalog);
    if (nextSelectedPurpose) {
      setSelectedPurposeCode(nextSelectedPurpose.code);
      setEditState(buildPurposeEditState(nextSelectedPurpose, nextCatalog));
    }
    setSimulation(null);
  }

  function saveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPurpose) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const response = await fetch("/api/settings/appointments/catalog/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          purposeCode: selectedPurpose.code,
          reason: changeReason,
          changes: {
            name: editState.name,
            description: editState.description,
            isActive: editState.isActive,
            defaultDurationMinutes: parseNumber(editState.defaultDurationMinutes),
            minimumDurationMinutes: parseNumber(editState.minimumDurationMinutes),
            maximumDurationMinutes: parseNumber(editState.maximumDurationMinutes),
            preparationBufferMinutes: parseNumber(editState.preparationBufferMinutes),
            cleanupBufferMinutes: parseNumber(editState.cleanupBufferMinutes),
            startIntervalMinutes: parseNumber(editState.startIntervalMinutes),
            minimumNoticeMinutes: parseNumber(editState.minimumNoticeMinutes),
            bookingHorizonDays: parseNumber(editState.bookingHorizonDays),
            approvalMode: editState.approvalMode,
            missingInputBehavior: editState.missingInputBehavior,
            outcomeCodes: fromCodeText(editState.outcomeCodesText),
            followUpDispositionCodes: fromCodeText(editState.followUpDispositionCodesText),
            reasonCodes: fromCodeText(editState.reasonCodesText)
          }
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            catalog?: AppointmentCatalogAutomationAdmin;
          }
        | null;

      if (!response.ok) {
        setErrorMessage(payload?.error ?? "Unable to save appointment catalog draft right now.");
        return;
      }

      handleCatalogResponse(payload);
      setSuccessMessage("Catalog draft saved with documented reason.");
      setChangeReason("");
    });
  }

  function activateDraft() {
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const response = await fetch("/api/settings/appointments/catalog/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reason: activationReason
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            catalog?: AppointmentCatalogAutomationAdmin;
          }
        | null;

      if (!response.ok) {
        setErrorMessage(payload?.error ?? "Unable to activate appointment catalog draft right now.");
        return;
      }

      handleCatalogResponse(payload);
      setSuccessMessage("Catalog draft activated. New scheduling behavior is now the active version.");
      setActivationReason("");
    });
  }

  function reviewDraft() {
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const response = await fetch("/api/settings/appointments/catalog/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: reviewAction,
          reason: reviewReason
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            catalog?: AppointmentCatalogAutomationAdmin;
          }
        | null;

      if (!response.ok) {
        setErrorMessage(payload?.error ?? "Unable to review appointment catalog draft right now.");
        return;
      }

      handleCatalogResponse(payload);
      setSuccessMessage(`Catalog draft review saved: ${formatLabel(reviewAction)}.`);
      setReviewReason("");
    });
  }

  function updatePurposeLifecycle() {
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const payload =
        lifecycleState.action === "CREATE"
          ? {
              action: lifecycleState.action,
              purposeCode: lifecycleState.purposeCode,
              name: lifecycleState.name,
              category: lifecycleState.category,
              sourcePurposeCode: lifecycleState.sourcePurposeCode || undefined,
              reason: lifecycleState.reason
            }
          : lifecycleState.action === "DUPLICATE"
            ? {
                action: lifecycleState.action,
                sourcePurposeCode: lifecycleState.sourcePurposeCode,
                purposeCode: lifecycleState.purposeCode,
                name: lifecycleState.name,
                reason: lifecycleState.reason
              }
            : {
                action: lifecycleState.action,
                purposeCode: selectedPurpose?.code ?? lifecycleState.purposeCode,
                reason: lifecycleState.reason
              };
      const response = await fetch("/api/settings/appointments/catalog/lifecycle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const responsePayload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            catalog?: AppointmentCatalogAutomationAdmin;
          }
        | null;

      if (!response.ok) {
        setErrorMessage(
          responsePayload?.error ?? "Unable to update appointment purpose lifecycle right now."
        );
        return;
      }

      const preferredPurposeCode =
        lifecycleState.action === "DELETE" ? selectedPurposeCode : lifecycleState.purposeCode;
      handleCatalogResponse(responsePayload, preferredPurposeCode);
      setSuccessMessage("Purpose lifecycle draft updated with documented reason.");
      setLifecycleState((current) => ({
        ...current,
        purposeCode: "",
        name: "",
        reason: ""
      }));
    });
  }

  function updateCatalogCode() {
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const response = await fetch("/api/settings/appointments/catalog/codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          catalog: codeEditorState.catalog,
          action: codeEditorState.action,
          purposeCode:
            codeEditorState.catalog === "REASON" ? undefined : selectedPurpose?.code,
          code: codeEditorState.code,
          nextCode: codeEditorState.nextCode || undefined,
          label: codeEditorState.label || undefined,
          description: codeEditorState.description || undefined,
          reason: codeEditorState.reason
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            catalog?: AppointmentCatalogAutomationAdmin;
          }
        | null;

      if (!response.ok) {
        setErrorMessage(payload?.error ?? "Unable to update appointment catalog code right now.");
        return;
      }

      handleCatalogResponse(payload);
      setSuccessMessage("Structured catalog code draft updated with documented reason.");
      setCodeEditorState((current) => ({
        ...current,
        code: "",
        nextCode: "",
        label: "",
        description: "",
        reason: ""
      }));
    });
  }

  function runSimulation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setSimulation(null);

    startTransition(async () => {
      const response = await fetch("/api/settings/appointments/catalog/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...simulationDraft,
          purposeCode: selectedPurpose?.code ?? simulationDraft.purposeCode,
          missingRequiredFields: missingInputText
            .split(",")
            .map((field) => field.trim())
            .filter(Boolean)
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            simulation?: SimulationResult;
          }
        | null;

      if (!response.ok || !payload?.simulation) {
        setErrorMessage(payload?.error ?? "Unable to simulate automation right now.");
        return;
      }

      setSimulation(payload.simulation);
      setSuccessMessage("Automation simulation complete.");
    });
  }

  return (
    <div className="appointment-catalog-admin-stack">
      <section className="appointment-catalog-metric-grid">
        <article className="settings-summary-card">
          <span>Displayed version</span>
          <strong>v{catalog.versioning.displayedVersion.version}</strong>
          <small>{formatLabel(catalog.versioning.displayedSource)}</small>
        </article>
        <article className="settings-summary-card">
          <span>Purposes</span>
          <strong>{catalog.governance.purposeCount}</strong>
          <small>{catalog.governance.activePurposeCount} active templates</small>
        </article>
        <article className="settings-summary-card">
          <span>Automation rules</span>
          <strong>{catalog.governance.automationRuleCount}</strong>
          <small>{catalog.governance.enabledAutomationRuleCount} enabled hooks</small>
        </article>
        <article className="settings-summary-card">
          <span>Validation</span>
          <strong>{catalog.versioning.validation.isValid ? "Pass" : "Blocked"}</strong>
          <small>{catalog.versioning.validation.errors.length} blocking issues</small>
        </article>
      </section>

      <section className="panel-card settings-main-card">
        <strong>Version control</strong>
        <h2>Active and draft catalog governance</h2>
        <div className="appointment-catalog-detail-grid">
          <div>
            <span>Active version</span>
            <strong>
              {catalog.versioning.activeVersion
                ? `v${catalog.versioning.activeVersion.version}`
                : "Baseline"}
            </strong>
            <small>{catalog.versioning.activeVersion?.reason ?? "Code-approved baseline"}</small>
          </div>
          <div>
            <span>Draft version</span>
            <strong>
              {catalog.versioning.draftVersion
                ? `v${catalog.versioning.draftVersion.version}`
                : "None"}
            </strong>
            <small>
              {catalog.versioning.draftVersion
                ? "Draft changes are visible here before activation."
                : "Saving an edit creates the next draft version."}
            </small>
          </div>
          <div>
            <span>Recent changes</span>
            <strong>{catalog.versioning.recentChanges.length}</strong>
            <small>append-only catalog change events</small>
          </div>
          <div>
            <span>Approval</span>
            <strong>{formatLabel(catalog.versioning.approval.status)}</strong>
            <small>
              {catalog.versioning.approval.activationBlocked
                ? "Activation is blocked until approval is recorded."
                : "Approved for activation."}
            </small>
          </div>
        </div>

        {catalog.versioning.validation.errors.length > 0 ? (
          <div className="notice notice-danger">
            {catalog.versioning.validation.errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}

        {catalog.versioning.validation.warnings.length > 0 ? (
          <div className="notice">
            {catalog.versioning.validation.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        <div className="appointment-catalog-activation-row">
          <label className="field">
            <span>Review action</span>
            <select
              value={reviewAction}
              onChange={(event) => setReviewAction(event.target.value as ReviewAction)}
              disabled={!catalog.versioning.draftVersion || isPending}
            >
              <option value="APPROVE">Approve draft</option>
              <option value="REQUEST_CHANGES">Request changes</option>
              <option value="REJECT">Reject draft</option>
            </select>
          </label>
          <label className="field">
            <span>Review reason</span>
            <input
              value={reviewReason}
              onChange={(event) => setReviewReason(event.target.value)}
              placeholder="Document approval or requested changes"
              disabled={!catalog.versioning.draftVersion || isPending}
            />
          </label>
          <button
            className="pill pill-secondary"
            disabled={!catalog.versioning.draftVersion || isPending}
            onClick={reviewDraft}
            type="button"
          >
            Save review
          </button>
          <label className="field">
            <span>Activation reason</span>
            <input
              value={activationReason}
              onChange={(event) => setActivationReason(event.target.value)}
              placeholder="Approved catalog update for day-one scheduling"
            />
          </label>
          <button
            className="pill pill-primary"
            disabled={!canActivateDraft || isPending}
            onClick={activateDraft}
            type="button"
          >
            {catalog.versioning.approval.status === "APPROVED"
              ? "Activate draft"
              : "Approval required"}
          </button>
        </div>
      </section>

      <section className="appointment-catalog-workspace">
        <article className="panel-card settings-main-card">
          <strong>Purpose catalog</strong>
          <h2>Approved appointment purposes</h2>
          <p>
            These purpose templates govern duration, buffers, context, conflicts, outcomes, and
            automation hooks.
          </p>

          <div className="appointment-catalog-list">
            {catalog.purposes.map((purpose) => (
              <button
                className={
                  purpose.code === selectedPurpose?.code
                    ? "appointment-catalog-row appointment-catalog-row-active"
                    : "appointment-catalog-row"
                }
                key={purpose.code}
                onClick={() => selectPurpose(purpose.code)}
                type="button"
              >
                <span>{purpose.category}</span>
                <strong>{purpose.name}</strong>
                <small>
                  {purpose.defaultDurationMinutes} min • {formatLabel(purpose.approvalMode)} • v
                  {purpose.version}
                </small>
              </button>
            ))}
          </div>
        </article>

        <article className="panel-card settings-main-card">
          <strong>Purpose lifecycle</strong>
          <h2>Create, duplicate, deprecate, or remove draft-only purposes</h2>
          <p>
            Lifecycle changes create a governed draft catalog. Published purposes are protected
            from hard delete; managers should deprecate them so existing appointment history remains
            intact.
          </p>

          <div className="settings-form">
            <div className="settings-grid">
              <label className="field">
                <span>Lifecycle action</span>
                <select
                  value={lifecycleState.action}
                  onChange={(event) =>
                    setLifecycleState((current) => ({
                      ...current,
                      action: event.target.value as LifecycleAction
                    }))
                  }
                >
                  <option value="DUPLICATE">Duplicate existing purpose</option>
                  <option value="CREATE">Create new purpose</option>
                  <option value="DEPRECATE">Deprecate selected purpose</option>
                  <option value="REACTIVATE">Reactivate selected purpose</option>
                  <option value="DELETE">Delete draft-only purpose</option>
                </select>
              </label>

              {lifecycleState.action === "CREATE" || lifecycleState.action === "DUPLICATE" ? (
                <>
                  <label className="field">
                    <span>New purpose code</span>
                    <input
                      value={lifecycleState.purposeCode}
                      onChange={(event) =>
                        setLifecycleState((current) => ({
                          ...current,
                          purposeCode: event.target.value.toUpperCase()
                        }))
                      }
                      placeholder="APT-CUSTOM-INSPECTION"
                    />
                  </label>
                  <label className="field">
                    <span>New purpose name</span>
                    <input
                      value={lifecycleState.name}
                      onChange={(event) =>
                        setLifecycleState((current) => ({
                          ...current,
                          name: event.target.value
                        }))
                      }
                      placeholder="Custom Inspection"
                    />
                  </label>
                  <label className="field">
                    <span>Source purpose</span>
                    <select
                      value={lifecycleState.sourcePurposeCode}
                      onChange={(event) =>
                        setLifecycleState((current) => ({
                          ...current,
                          sourcePurposeCode: event.target.value
                        }))
                      }
                    >
                      <option value="">Use default baseline</option>
                      {catalog.purposes.map((purpose) => (
                        <option key={purpose.code} value={purpose.code}>
                          {purpose.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {lifecycleState.action === "CREATE" ? (
                    <label className="field">
                      <span>Category</span>
                      <select
                        value={lifecycleState.category}
                        onChange={(event) =>
                          setLifecycleState((current) => ({
                            ...current,
                            category: event.target.value
                          }))
                        }
                      >
                        {[
                          "SALES",
                          "DELIVERY",
                          "SERVICE",
                          "CUSTOMER_SERVICE",
                          "ADMINISTRATION",
                          "COLLECTIONS",
                          "INVENTORY",
                          "MARKETING",
                          "INTERNAL",
                          "CROSS_WORKFLOW",
                          "GENERAL"
                        ].map((category) => (
                          <option key={category} value={category}>
                            {formatLabel(category)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </>
              ) : (
                <div className="appointment-admin-record appointment-admin-span">
                  <span>Selected purpose</span>
                  <strong>{selectedPurpose?.name ?? "No purpose selected"}</strong>
                  <small>
                    {selectedPurpose?.code} •{" "}
                    {selectedPurpose?.isActive ? "active" : "inactive/deprecated"}
                  </small>
                </div>
              )}

              <label className="field appointment-admin-span">
                <span>Required lifecycle reason</span>
                <input
                  value={lifecycleState.reason}
                  onChange={(event) =>
                    setLifecycleState((current) => ({
                      ...current,
                      reason: event.target.value
                    }))
                  }
                  placeholder="Document the manager-approved lifecycle reason"
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                className="pill pill-primary"
                disabled={isPending || !selectedPurpose}
                onClick={updatePurposeLifecycle}
                type="button"
              >
                Apply lifecycle draft
              </button>
            </div>
          </div>
        </article>

        <article className="panel-card settings-main-card">
          <strong>Structured code editors</strong>
          <h2>Outcome, follow-up, and reason catalogs</h2>
          <p>
            Add, rename, or remove governed catalog codes without editing comma-separated lists.
            Every change creates a draft and requires approval before activation.
          </p>

          <div className="settings-form">
            <div className="settings-grid">
              <label className="field">
                <span>Catalog</span>
                <select
                  value={codeEditorState.catalog}
                  onChange={(event) =>
                    setCodeEditorState((current) => ({
                      ...current,
                      catalog: event.target.value as CatalogCodeType,
                      code: ""
                    }))
                  }
                >
                  <option value="OUTCOME">Selected purpose outcomes</option>
                  <option value="FOLLOW_UP_DISPOSITION">Selected purpose follow-ups</option>
                  <option value="REASON">Global reason catalog</option>
                </select>
              </label>

              <label className="field">
                <span>Action</span>
                <select
                  value={codeEditorState.action}
                  onChange={(event) =>
                    setCodeEditorState((current) => ({
                      ...current,
                      action: event.target.value as CatalogCodeAction
                    }))
                  }
                >
                  <option value="ADD">Add code</option>
                  <option value="RENAME">Rename code</option>
                  <option value="REMOVE">Remove code</option>
                </select>
              </label>

              {codeEditorState.action === "ADD" ? (
                <label className="field">
                  <span>New code</span>
                  <input
                    value={codeEditorState.code}
                    onChange={(event) =>
                      setCodeEditorState((current) => ({
                        ...current,
                        code: event.target.value.toUpperCase()
                      }))
                    }
                    placeholder="CUSTOMER_APPROVED"
                  />
                </label>
              ) : (
                <label className="field">
                  <span>Existing code</span>
                  <select
                    value={codeEditorState.code}
                    onChange={(event) =>
                      setCodeEditorState((current) => ({
                        ...current,
                        code: event.target.value
                      }))
                    }
                  >
                    <option value="">Select code</option>
                    {editableCatalogCodes.map((code) => (
                      <option key={code} value={code}>
                        {catalog.catalogs.codeDetails[
                          `${codeEditorState.catalog}:${code}`
                        ]?.label ?? formatLabel(code)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {codeEditorState.action === "RENAME" ? (
                <label className="field">
                  <span>Replacement code</span>
                  <input
                    value={codeEditorState.nextCode}
                    onChange={(event) =>
                      setCodeEditorState((current) => ({
                        ...current,
                        nextCode: event.target.value.toUpperCase()
                      }))
                    }
                    placeholder="CUSTOMER_APPROVED_WITH_NOTES"
                  />
                </label>
              ) : null}

              {codeEditorState.action !== "REMOVE" ? (
                <>
                  <label className="field">
                    <span>Display label</span>
                    <input
                      value={codeEditorState.label}
                      onChange={(event) =>
                        setCodeEditorState((current) => ({
                          ...current,
                          label: event.target.value
                        }))
                      }
                      placeholder="Customer approved"
                    />
                  </label>
                  <label className="field appointment-admin-span">
                    <span>Description</span>
                    <textarea
                      value={codeEditorState.description}
                      onChange={(event) =>
                        setCodeEditorState((current) => ({
                          ...current,
                          description: event.target.value
                        }))
                      }
                      placeholder="Explain when managers should use this catalog code."
                    />
                  </label>
                </>
              ) : null}

              <label className="field appointment-admin-span">
                <span>Required code-change reason</span>
                <input
                  value={codeEditorState.reason}
                  onChange={(event) =>
                    setCodeEditorState((current) => ({
                      ...current,
                      reason: event.target.value
                    }))
                  }
                  placeholder="Document why this catalog code is changing"
                />
              </label>
            </div>

            <div className="appointment-admin-record-list">
              {editableCatalogCodes.slice(0, 8).map((code) => {
                const detail = catalog.catalogs.codeDetails[`${codeEditorState.catalog}:${code}`];

                return (
                  <div className="appointment-admin-record" key={code}>
                    <span>{formatLabel(codeEditorState.catalog)}</span>
                    <strong>{detail?.label ?? formatLabel(code)}</strong>
                    <small>
                      {code}
                      {detail?.systemRequired ? " • system required" : ""}
                    </small>
                  </div>
                );
              })}
            </div>

            <div className="form-actions">
              <button
                className="pill pill-primary"
                disabled={
                  isPending ||
                  !selectedPurpose ||
                  (codeEditorState.catalog !== "REASON" && !selectedPurpose)
                }
                onClick={updateCatalogCode}
                type="button"
              >
                Apply code draft
              </button>
            </div>
          </div>
        </article>

        <article className="panel-card settings-main-card">
          <strong>Versioned editor</strong>
          <h2>{selectedPurpose?.name ?? "No purpose selected"}</h2>
          <p>
            Save creates or updates a draft version. Activation is a separate audited manager action.
          </p>

          {selectedPurposeUsage ? (
            <div className="appointment-catalog-detail-grid">
              <div>
                <span>Reference count</span>
                <strong>{selectedPurposeUsage.referenceCount}</strong>
                <small>{formatLabel(selectedPurposeUsage.recommendation)}</small>
              </div>
              <div>
                <span>Delete risk</span>
                <strong>{formatLabel(selectedPurposeUsage.deleteRisk)}</strong>
                <small>
                  {selectedPurposeUsage.deleteRisk === "PUBLISHED_REFERENCES"
                    ? "Use deprecation to preserve history."
                    : "Hard delete allowed only while draft-only."}
                </small>
              </div>
              <div>
                <span>Automation links</span>
                <strong>{selectedPurposeUsage.enabledAutomationRuleCount}</strong>
                <small>{selectedPurposeUsage.automationRuleCount} total rule hooks</small>
              </div>
            </div>
          ) : null}

          {selectedPurposeUsage?.warnings.length ? (
            <div className="notice">
              {selectedPurposeUsage.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          <form className="settings-form" onSubmit={saveDraft}>
            <div className="settings-grid">
              <label className="field">
                <span>Name</span>
                <input
                  value={editState.name}
                  onChange={(event) =>
                    setEditState((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Active</span>
                <select
                  value={editState.isActive ? "true" : "false"}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      isActive: event.target.value === "true"
                    }))
                  }
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <label className="field appointment-admin-span">
                <span>Description</span>
                <textarea
                  value={editState.description}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      description: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Default duration</span>
                <input
                  type="number"
                  value={editState.defaultDurationMinutes}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      defaultDurationMinutes: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Minimum duration</span>
                <input
                  type="number"
                  value={editState.minimumDurationMinutes}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      minimumDurationMinutes: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Maximum duration</span>
                <input
                  type="number"
                  value={editState.maximumDurationMinutes}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      maximumDurationMinutes: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Prep buffer</span>
                <input
                  type="number"
                  value={editState.preparationBufferMinutes}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      preparationBufferMinutes: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Cleanup buffer</span>
                <input
                  type="number"
                  value={editState.cleanupBufferMinutes}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      cleanupBufferMinutes: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Start interval</span>
                <input
                  type="number"
                  value={editState.startIntervalMinutes}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      startIntervalMinutes: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Minimum notice</span>
                <input
                  type="number"
                  value={editState.minimumNoticeMinutes}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      minimumNoticeMinutes: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Booking horizon</span>
                <input
                  type="number"
                  value={editState.bookingHorizonDays}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      bookingHorizonDays: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Approval mode</span>
                <select
                  value={editState.approvalMode}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      approvalMode: event.target.value
                    }))
                  }
                >
                  {catalog.editor.editableApprovalModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {formatLabel(mode)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Missing input behavior</span>
                <select
                  value={editState.missingInputBehavior}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      missingInputBehavior: event.target.value
                    }))
                  }
                >
                  <option value="CREATE_DRAFT">Create draft</option>
                  <option value="CREATE_REVIEW_ITEM">Create review item</option>
                  <option value="BLOCK_AUTOMATION">Block automation</option>
                </select>
              </label>
              <label className="field appointment-admin-span">
                <span>Outcome codes</span>
                <textarea
                  value={editState.outcomeCodesText}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      outcomeCodesText: event.target.value
                    }))
                  }
                />
                <small className="field-hint">Comma-separated enterprise codes.</small>
              </label>
              <label className="field appointment-admin-span">
                <span>Follow-up disposition codes</span>
                <textarea
                  value={editState.followUpDispositionCodesText}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      followUpDispositionCodesText: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field appointment-admin-span">
                <span>Reason code catalog</span>
                <textarea
                  value={editState.reasonCodesText}
                  onChange={(event) =>
                    setEditState((current) => ({
                      ...current,
                      reasonCodesText: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field appointment-admin-span">
                <span>Required change reason</span>
                <input
                  value={changeReason}
                  onChange={(event) => setChangeReason(event.target.value)}
                  placeholder="Explain why this catalog draft is changing"
                />
              </label>
            </div>

            <div className="form-actions">
              <button className="pill pill-primary" disabled={isPending} type="submit">
                {isPending ? "Saving..." : "Save draft version"}
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="appointment-catalog-workspace">
        <article className="panel-card settings-main-card">
          <strong>Automation simulation</strong>
          <h2>Preview generated work before activation</h2>
          <p>
            Choose a purpose, outcome, follow-up disposition, and optional missing fields to see
            what the displayed catalog would create.
          </p>

          <form className="settings-form" onSubmit={runSimulation}>
            <div className="settings-grid">
              <label className="field">
                <span>Outcome</span>
                <select
                  value={simulationDraft.outcomeCode}
                  onChange={(event) =>
                    setSimulationDraft((current) => ({
                      ...current,
                      outcomeCode: event.target.value
                    }))
                  }
                >
                  {(selectedPurpose?.outcomeCodes ?? catalog.catalogs.outcomeCodes).map((code) => (
                    <option key={code} value={code}>
                      {formatLabel(code)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Follow-up disposition</span>
                <select
                  value={simulationDraft.followUpDispositionCode}
                  onChange={(event) =>
                    setSimulationDraft((current) => ({
                      ...current,
                      followUpDispositionCode: event.target.value
                    }))
                  }
                >
                  {(selectedPurpose?.followUpDispositionCodes ??
                    catalog.catalogs.followUpDispositionCodes
                  ).map((code) => (
                    <option key={code} value={code}>
                      {formatLabel(code)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field appointment-admin-span">
                <span>Missing required fields</span>
                <input
                  value={missingInputText}
                  onChange={(event) => setMissingInputText(event.target.value)}
                  placeholder="customer, vehicle, owner"
                />
                <small className="field-hint">Comma-separated. Leave blank for a complete input.</small>
              </label>
            </div>

            <div className="form-actions">
              <button className="pill pill-primary" disabled={isPending} type="submit">
                {isPending ? "Simulating..." : "Run simulation"}
              </button>
            </div>
          </form>

          {errorMessage ? (
            <div className="notice notice-danger" role="alert">
              <p>{errorMessage}</p>
            </div>
          ) : null}

          {successMessage ? (
            <div className="notice" role="status">
              <p>{successMessage}</p>
            </div>
          ) : null}
        </article>

        <article className="panel-card settings-main-card">
          <strong>Simulation result</strong>
          <h2>{simulation ? "Automation impact" : "Waiting for simulation"}</h2>
          {simulation ? (
            <div className="appointment-catalog-simulation">
              <div>
                <span>Missing input behavior</span>
                <strong>{formatLabel(simulation.missingInputBehavior.behavior)}</strong>
                <small>
                  {simulation.missingInputBehavior.blocked
                    ? "Automation is blocked until required input is completed."
                    : "Automation may proceed under the current rule."}
                </small>
              </div>

              <div>
                <span>Generated tasks</span>
                <strong>{simulation.actions.generatedTaskActions.length}</strong>
                <small>task actions predicted by template plus disposition</small>
              </div>

              <div>
                <span>Follow-up appointment</span>
                <strong>{simulation.actions.generatedAppointmentAction ? "Yes" : "No"}</strong>
                <small>
                  {simulation.actions.generatedAppointmentAction?.status ??
                    "No follow-up appointment generated"}
                </small>
              </div>

              {simulation.validation.warnings.length > 0 ? (
                <div className="notice notice-danger">
                  {simulation.validation.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                </div>
              ) : null}

              <div className="appointment-admin-record-list">
                {simulation.actions.generatedTaskActions.map((action) => (
                  <div className="appointment-admin-record" key={`${action.source}-${action.code}`}>
                    <span>{formatLabel(action.source)}</span>
                    <strong>{action.title}</strong>
                    <small>
                      {formatLabel(action.creationTiming)} • {formatLabel(action.ownerPolicy)} •{" "}
                      {formatLabel(action.blockingEffect)}
                    </small>
                  </div>
                ))}
                {simulation.actions.generatedAppointmentAction ? (
                  <div className="appointment-admin-record">
                    <span>{formatLabel(simulation.actions.generatedAppointmentAction.source)}</span>
                    <strong>{simulation.actions.generatedAppointmentAction.title}</strong>
                    <small>{simulation.actions.generatedAppointmentAction.reason}</small>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <p>
              Run a simulation to see task creation, follow-up appointment behavior, missing-input
              handling, and audit reason output.
            </p>
          )}
        </article>
      </section>

      <section className="panel-card settings-main-card">
        <strong>Automation rules</strong>
        <h2>Enabled rule hooks</h2>
        <p>
          These hooks are derived from the displayed appointment catalog and show what is ready for
          activation/version controls.
        </p>
        <div className="appointment-catalog-rule-grid">
          {activeRules.map((rule) => (
            <article className="appointment-admin-record" key={rule.id}>
              <span>{formatLabel(rule.trigger)}</span>
              <strong>{rule.purposeName}</strong>
              <small>
                {formatLabel(rule.missingInputBehavior)} • {rule.taskBlueprintCount} blueprints •{" "}
                {rule.outcomeBlueprintCount} outcome actions
              </small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
