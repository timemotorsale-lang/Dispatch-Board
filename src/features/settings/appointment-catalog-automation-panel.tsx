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

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AppointmentCatalogAutomationPanel({
  initialCatalog
}: AppointmentCatalogAutomationPanelProps) {
  const [catalog] = useState(initialCatalog);
  const firstPurpose = catalog.purposes[0];
  const [selectedPurposeCode, setSelectedPurposeCode] = useState(firstPurpose?.code ?? "");
  const selectedPurpose =
    catalog.purposes.find((purpose) => purpose.code === selectedPurposeCode) ?? firstPurpose;
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

  function selectPurpose(purposeCode: string) {
    const purpose = catalog.purposes.find((candidate) => candidate.code === purposeCode);

    if (!purpose) {
      return;
    }

    setSelectedPurposeCode(purpose.code);
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
          <span>Purposes</span>
          <strong>{catalog.governance.purposeCount}</strong>
          <small>{catalog.governance.activePurposeCount} active day-one templates</small>
        </article>
        <article className="settings-summary-card">
          <span>Automation rules</span>
          <strong>{catalog.governance.automationRuleCount}</strong>
          <small>{catalog.governance.enabledAutomationRuleCount} enabled hooks</small>
        </article>
        <article className="settings-summary-card">
          <span>Blueprints</span>
          <strong>{catalog.governance.taskBlueprintCount}</strong>
          <small>linked-task actions prepared by templates</small>
        </article>
        <article className="settings-summary-card">
          <span>Reason codes</span>
          <strong>{catalog.governance.reasonCodeCount}</strong>
          <small>hard, warning, and operational reasons</small>
        </article>
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
                  {purpose.defaultDurationMinutes} min · {formatLabel(purpose.approvalMode)} · v
                  {purpose.version}
                </small>
              </button>
            ))}
          </div>
        </article>

        <article className="panel-card settings-main-card">
          <strong>Selected purpose</strong>
          <h2>{selectedPurpose?.name ?? "No purpose selected"}</h2>
          {selectedPurpose ? (
            <>
              <p>{selectedPurpose.description}</p>
              <div className="appointment-catalog-detail-grid">
                <div>
                  <span>Duration</span>
                  <strong>
                    {selectedPurpose.minimumDurationMinutes}–
                    {selectedPurpose.maximumDurationMinutes} min
                  </strong>
                  <small>Default {selectedPurpose.defaultDurationMinutes} min</small>
                </div>
                <div>
                  <span>Buffers</span>
                  <strong>
                    {selectedPurpose.preparationBufferMinutes} /{" "}
                    {selectedPurpose.cleanupBufferMinutes}
                  </strong>
                  <small>prep / cleanup minutes</small>
                </div>
                <div>
                  <span>Sensitivity</span>
                  <strong>{formatLabel(selectedPurpose.dataSensitivity)}</strong>
                  <small>{selectedPurpose.requiredContextFields.length} required fields</small>
                </div>
              </div>

              <div className="appointment-admin-code-list">
                {selectedPurpose.requiredContextFields.map((field) => (
                  <span key={field}>{field}</span>
                ))}
              </div>

              <div className="appointment-catalog-two-column">
                <div>
                  <h3>Outcome codes</h3>
                  <div className="appointment-admin-code-list">
                    {selectedPurpose.outcomeCodes.map((code) => (
                      <span key={code}>{formatLabel(code)}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3>Follow-up dispositions</h3>
                  <div className="appointment-admin-code-list">
                    {selectedPurpose.followUpDispositionCodes.map((code) => (
                      <span key={code}>{formatLabel(code)}</span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </article>
      </section>

      <section className="appointment-catalog-workspace">
        <article className="panel-card settings-main-card">
          <strong>Automation simulation</strong>
          <h2>Preview generated work before activation</h2>
          <p>
            Choose a purpose, outcome, follow-up disposition, and optional missing fields to see
            what the current rules would create.
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
                <small>task actions predicted by template + disposition</small>
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
                      {formatLabel(action.creationTiming)} · {formatLabel(action.ownerPolicy)} ·{" "}
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
          These hooks are derived from the approved appointment templates and show what is ready for
          future activation/version controls.
        </p>
        <div className="appointment-catalog-rule-grid">
          {activeRules.map((rule) => (
            <article className="appointment-admin-record" key={rule.id}>
              <span>{formatLabel(rule.trigger)}</span>
              <strong>{rule.purposeName}</strong>
              <small>
                {formatLabel(rule.missingInputBehavior)} · {rule.taskBlueprintCount} blueprints ·{" "}
                {rule.outcomeBlueprintCount} outcome actions
              </small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
