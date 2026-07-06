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
    Boolean(catalog.versioning.draftVersion) && catalog.versioning.validation.isValid;

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

  function handleCatalogResponse(payload: { catalog?: AppointmentCatalogAutomationAdmin; error?: string } | null) {
    if (!payload?.catalog) {
      setErrorMessage(payload?.error ?? "Unable to update appointment catalog right now.");
      return;
    }

    const nextCatalog = payload.catalog;
    const nextSelectedPurpose =
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
            Activate draft
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
          <strong>Versioned editor</strong>
          <h2>{selectedPurpose?.name ?? "No purpose selected"}</h2>
          <p>
            Save creates or updates a draft version. Activation is a separate audited manager action.
          </p>

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
