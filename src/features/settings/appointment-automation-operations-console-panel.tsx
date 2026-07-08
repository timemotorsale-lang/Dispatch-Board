"use client";

import { useMemo, useState, useTransition } from "react";

import type { getAppointmentAutomationOperationsConsoleForManager } from "@/server/services/appointment-automation-operations-console";

type ConsoleModel = Awaited<ReturnType<typeof getAppointmentAutomationOperationsConsoleForManager>>;

type Props = {
  initialConsole: ConsoleModel;
};

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function defaultRuleCode(consoleModel: ConsoleModel) {
  return consoleModel.rules[0]?.ruleCode ?? "";
}

function defaultExecutionId(consoleModel: ConsoleModel) {
  return consoleModel.failureQueue[0]?.id ?? consoleModel.executions[0]?.id ?? "";
}

export function AppointmentAutomationOperationsConsolePanel({ initialConsole }: Props) {
  const [consoleModel, setConsoleModel] = useState(initialConsole);
  const [selectedRuleCode, setSelectedRuleCode] = useState(defaultRuleCode(initialConsole));
  const [selectedExecutionId, setSelectedExecutionId] = useState(defaultExecutionId(initialConsole));
  const [draftReason, setDraftReason] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [executionReason, setExecutionReason] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedRule = useMemo(() => {
    const firstRule = consoleModel.rules[0];
    return consoleModel.rules.find((rule) => rule.ruleCode === selectedRuleCode) ?? firstRule;
  }, [consoleModel.rules, selectedRuleCode]);

  const [ruleDraft, setRuleDraft] = useState({
    ruleCode: initialConsole.rules[0]?.ruleCode ?? "",
    name: initialConsole.rules[0]?.name ?? "",
    triggerCode: initialConsole.rules[0]?.triggerCode ?? "",
    purposeCode: initialConsole.rules[0]?.purposeCode ?? "",
    description: initialConsole.rules[0]?.description ?? "",
    priority: String(initialConsole.rules[0]?.priority ?? 100)
  });

  const selectedExecution = useMemo(
    () => consoleModel.executions.find((execution) => execution.id === selectedExecutionId) ?? null,
    [consoleModel.executions, selectedExecutionId]
  );

  function selectRule(ruleCode: string) {
    const rule = consoleModel.rules.find((candidate) => candidate.ruleCode === ruleCode);
    if (!rule) return;
    setSelectedRuleCode(rule.ruleCode);
    setRuleDraft({
      ruleCode: rule.ruleCode,
      name: rule.name,
      triggerCode: rule.triggerCode,
      purposeCode: rule.purposeCode,
      description: rule.description ?? "",
      priority: String(rule.priority)
    });
  }

  function selectExecution(executionId: string) {
    const execution = consoleModel.executions.find((candidate) => candidate.id === executionId);
    if (!execution) return;
    setSelectedExecutionId(execution.id);
  }

  function applyConsole(payload: { console?: ConsoleModel; error?: string } | null, message: string) {
    if (!payload?.console) {
      setError(payload?.error ?? "Automation console update failed.");
      return;
    }

    const nextConsole = payload.console;
    setConsoleModel(nextConsole);
    setNotice(message);
    setDraftReason("");
    setTransitionReason("");
    setExecutionReason("");

    const nextRule =
      nextConsole.rules.find((rule) => rule.ruleCode === selectedRuleCode) ?? nextConsole.rules[0];
    if (nextRule) {
      setSelectedRuleCode(nextRule.ruleCode);
      setRuleDraft({
        ruleCode: nextRule.ruleCode,
        name: nextRule.name,
        triggerCode: nextRule.triggerCode,
        purposeCode: nextRule.purposeCode,
        description: nextRule.description ?? "",
        priority: String(nextRule.priority)
      });
    }

    const nextExecution =
      nextConsole.executions.find((execution) => execution.id === selectedExecutionId) ??
      nextConsole.failureQueue[0] ??
      nextConsole.executions[0] ??
      null;
    setSelectedExecutionId(nextExecution?.id ?? "");
  }

  function saveRuleDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    startTransition(async () => {
      const response = await fetch("/api/settings/appointments/automation/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ruleDraft,
          priority: Number.parseInt(ruleDraft.priority, 10),
          reason: draftReason
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { console?: ConsoleModel; error?: string }
        | null;
      if (!response.ok) {
        setError(payload?.error ?? "Unable to save automation rule draft.");
        return;
      }
      applyConsole(payload, "Automation rule draft saved.");
    });
  }

  function transitionRule(action: "ACTIVATE" | "PAUSE" | "RETIRE") {
    if (!selectedRule) return;
    setError("");
    setNotice("");
    startTransition(async () => {
      const response = await fetch("/api/settings/appointments/automation/rules/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ruleCode: selectedRule.ruleCode,
          action,
          reason: transitionReason
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { console?: ConsoleModel; error?: string }
        | null;
      if (!response.ok) {
        setError(payload?.error ?? "Unable to update automation rule.");
        return;
      }
      applyConsole(payload, `Automation rule ${formatLabel(action)}.`);
    });
  }

  function transitionExecution(action: "RETRY" | "REPLAY" | "RESOLVE" | "SKIP") {
    if (!selectedExecution) return;
    setError("");
    setNotice("");
    startTransition(async () => {
      const response = await fetch("/api/settings/appointments/automation/executions/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          executionId: selectedExecution.id,
          action,
          reason: executionReason
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { console?: ConsoleModel; error?: string }
        | null;
      if (!response.ok) {
        setError(payload?.error ?? "Unable to update automation execution.");
        return;
      }
      applyConsole(payload, `Automation execution ${formatLabel(action)}.`);
    });
  }

  return (
    <div className="appointment-catalog-admin-stack">
      <section className="appointment-catalog-metric-grid">
        <article className="settings-summary-card">
          <span>Visible rules</span>
          <strong>{consoleModel.ruleHealth.totalRules}</strong>
          <small>{consoleModel.ruleHealth.configuredRules} configured</small>
        </article>
        <article className="settings-summary-card">
          <span>Catalog candidates</span>
          <strong>{consoleModel.ruleHealth.candidateRules}</strong>
          <small>{consoleModel.ruleHealth.activeRules} active</small>
        </article>
        <article className="settings-summary-card">
          <span>Failure queue</span>
          <strong>{consoleModel.ruleHealth.failedExecutions}</strong>
          <small>{consoleModel.ruleHealth.retryableExecutions} retryable</small>
        </article>
        <article className="settings-summary-card">
          <span>Pending review</span>
          <strong>{consoleModel.ruleHealth.pendingReviewItems}</strong>
          <small>{consoleModel.executions.length} recent executions</small>
        </article>
      </section>

      <section className="settings-overview-grid">
        <article className="panel-card settings-callout-card">
          <strong>Catalog governance</strong>
          <h2>{consoleModel.catalogGovernance.displayedVersionTitle}</h2>
          <p>
            {formatLabel(consoleModel.catalogGovernance.displayedSource)} source ·{" "}
            {formatLabel(consoleModel.catalogGovernance.displayedVersionStatus)} version
          </p>
          <small>
            Approval {formatLabel(consoleModel.catalogGovernance.approvalStatus)}
            {consoleModel.catalogGovernance.activationBlocked
              ? " · catalog activation is currently blocked"
              : " · catalog activation is currently allowed"}
          </small>
        </article>

        <article className="panel-card settings-callout-card">
          <strong>Validation posture</strong>
          <h2>
            {consoleModel.catalogGovernance.validation.isValid ? "Catalog valid" : "Catalog needs review"}
          </h2>
          <p>
            {consoleModel.catalogGovernance.validation.errors.length} errors ·{" "}
            {consoleModel.catalogGovernance.validation.warnings.length} warnings
          </p>
          <small>
            Rules inherit validation context from the displayed appointment catalog and need
            simulation evidence before activation.
          </small>
        </article>
      </section>

      <section className="appointment-catalog-workspace">
        <article className="panel-card settings-main-card">
          <strong>Automation rules</strong>
          <h2>Rule lifecycle control</h2>
          <p>Review draft, active, paused, and retired rule states before runtime automation expands.</p>
          <div className="appointment-catalog-list">
            {consoleModel.rules.map((rule) => (
              <button
                className={
                  rule.ruleCode === selectedRule?.ruleCode
                    ? "appointment-catalog-row appointment-catalog-row-active"
                    : "appointment-catalog-row"
                }
                key={rule.ruleCode}
                onClick={() => selectRule(rule.ruleCode)}
                type="button"
              >
                <span>{rule.status}</span>
                <strong>{rule.name}</strong>
                <small>
                  {formatLabel(rule.triggerCode)} • {rule.purposeCode} •{" "}
                  {rule.source === "CATALOG_CANDIDATE" ? "Catalog candidate" : "Configured rule"}
                </small>
              </button>
            ))}
          </div>
        </article>

        <article className="panel-card settings-main-card">
          <strong>Draft editor</strong>
          <h2>{selectedRule?.name ?? "No rule selected"}</h2>
          <form className="settings-form" onSubmit={saveRuleDraft}>
            <div className="settings-grid">
              <label className="field">
                <span>Rule code</span>
                <input
                  value={ruleDraft.ruleCode}
                  onChange={(event) =>
                    setRuleDraft((current) => ({ ...current, ruleCode: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Name</span>
                <input
                  value={ruleDraft.name}
                  onChange={(event) =>
                    setRuleDraft((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Trigger</span>
                <input
                  value={ruleDraft.triggerCode}
                  onChange={(event) =>
                    setRuleDraft((current) => ({ ...current, triggerCode: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Purpose</span>
                <input
                  value={ruleDraft.purposeCode}
                  onChange={(event) =>
                    setRuleDraft((current) => ({ ...current, purposeCode: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>Priority</span>
                <input
                  type="number"
                  value={ruleDraft.priority}
                  onChange={(event) =>
                    setRuleDraft((current) => ({ ...current, priority: event.target.value }))
                  }
                />
              </label>
              <label className="field appointment-admin-span">
                <span>Description</span>
                <textarea
                  value={ruleDraft.description}
                  onChange={(event) =>
                    setRuleDraft((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label className="field appointment-admin-span">
                <span>Required draft reason</span>
                <input
                  value={draftReason}
                  onChange={(event) => setDraftReason(event.target.value)}
                  placeholder="Explain this automation rule change"
                />
              </label>
            </div>
            <div className="form-actions">
              <button className="pill pill-primary" disabled={isPending} type="submit">
                Save rule draft
              </button>
            </div>
          </form>

          {selectedRule ? (
            <div className="appointment-admin-record-list">
              <div className="appointment-admin-record">
                <span>Rule source</span>
                <strong>
                  {selectedRule.source === "CATALOG_CANDIDATE" ? "Catalog candidate" : "Configured rule"}
                </strong>
                <small>
                  {selectedRule.source === "CATALOG_CANDIDATE"
                    ? "Save the candidate as a draft before lifecycle actions can run."
                    : "Persisted rule with lifecycle and audit controls enabled."}
                </small>
              </div>
              <div className="appointment-admin-record">
                <span>Validation</span>
                <strong>{selectedRule.validation.isValid ? "Valid" : "Blocked"}</strong>
                <small>
                  {selectedRule.validation.errors.length} errors •{" "}
                  {selectedRule.validation.warnings.length} warnings
                </small>
              </div>
              <div className="appointment-admin-record">
                <span>Simulation evidence</span>
                <strong>{selectedRule.simulation.hasEvidence ? "Available" : "Missing"}</strong>
                <small>
                  {selectedRule.simulation.generatedTaskCount} tasks •{" "}
                  {selectedRule.simulation.generatesFollowUpAppointment
                    ? "follow-up appointment"
                    : "no appointment"}
                </small>
              </div>
            </div>
          ) : null}

          {selectedRule ? (
            <div className="appointment-admin-record-list">
              <div className="appointment-admin-record">
                <span>Activation readiness</span>
                <strong>{selectedRule.activation.canActivate ? "Ready" : "Blocked"}</strong>
                <small>
                  Missing-input behavior: {formatLabel(selectedRule.simulation.missingInputBehavior)}
                </small>
              </div>
              <div className="appointment-admin-record">
                <span>Simulation impact</span>
                <strong>
                  {selectedRule.simulation.generatedFollowUpAppointmentStatus ?? "Task-only or no appointment"}
                </strong>
                <small>
                  {selectedRule.simulation.managerReviewRequired
                    ? "Simulation predicts manager review involvement."
                    : "Simulation does not require manager review."}
                </small>
              </div>
            </div>
          ) : null}

          {selectedRule?.validation.errors.length ? (
            <div className="notice notice-danger">
              {selectedRule.validation.errors.map((errorMessage) => (
                <p key={errorMessage}>{errorMessage}</p>
              ))}
            </div>
          ) : null}

          {selectedRule?.activation.blockers.length ? (
            <div className="notice notice-danger">
              {selectedRule.activation.blockers.map((blocker) => (
                <p key={blocker}>{blocker}</p>
              ))}
            </div>
          ) : null}

          {selectedRule?.validation.warnings.length ? (
            <div className="notice">
              {selectedRule.validation.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          <div className="appointment-catalog-activation-row">
            <label className="field">
              <span>Lifecycle reason</span>
              <input
                value={transitionReason}
                onChange={(event) => setTransitionReason(event.target.value)}
                placeholder="Document why this rule is changing state"
              />
            </label>
            <div className="form-actions">
              <button
                className="pill pill-primary"
                disabled={isPending || !selectedRule || !selectedRule.activation.canActivate}
                onClick={() => transitionRule("ACTIVATE")}
                type="button"
              >
                Activate
              </button>
              <button
                className="pill pill-secondary"
                disabled={isPending || !selectedRule || !selectedRule.lifecycle.canPause}
                onClick={() => transitionRule("PAUSE")}
                type="button"
              >
                Pause
              </button>
              <button
                className="pill pill-danger"
                disabled={isPending || !selectedRule || !selectedRule.lifecycle.canRetire}
                onClick={() => transitionRule("RETIRE")}
                type="button"
              >
                Retire
              </button>
            </div>
          </div>

          {error ? (
            <div className="notice notice-danger">
              <p>{error}</p>
            </div>
          ) : null}
          {notice ? (
            <div className="notice">
              <p>{notice}</p>
            </div>
          ) : null}
        </article>
      </section>

      <section className="appointment-catalog-workspace">
        <article className="panel-card settings-main-card">
          <strong>Failure queue</strong>
          <h2>Retry, replay, and review operations</h2>
          <div className="appointment-admin-record-list">
            {consoleModel.failureQueue.length === 0 ? (
              <p>No failed or review-required automation executions are queued.</p>
            ) : (
              consoleModel.failureQueue.map((execution) => (
                <button
                  className={
                    execution.id === selectedExecution?.id
                      ? "appointment-catalog-row appointment-catalog-row-active"
                      : "appointment-catalog-row"
                  }
                  key={execution.id}
                  onClick={() => selectExecution(execution.id)}
                  type="button"
                >
                  <span>{formatLabel(execution.status)}</span>
                  <strong>{execution.automationRuleCode ?? execution.triggerCode}</strong>
                  <small>{execution.failureMessage ?? "Manager action is required."}</small>
                </button>
              ))
            )}
          </div>
        </article>

        <article className="panel-card settings-main-card">
          <strong>Execution controls</strong>
          <h2>{selectedExecution?.automationRuleCode ?? selectedExecution?.triggerCode ?? "No execution selected"}</h2>
          {selectedExecution ? (
            <>
              <div className="appointment-admin-record-list">
                <div className="appointment-admin-record">
                  <span>Status</span>
                  <strong>{formatLabel(selectedExecution.status)}</strong>
                  <small>Attempts: {selectedExecution.attemptCount} / {selectedExecution.maxAttempts}</small>
                </div>
                <div className="appointment-admin-record">
                  <span>Source</span>
                  <strong>{formatLabel(selectedExecution.sourceType)}</strong>
                  <small>{selectedExecution.sourceReference ?? "No source reference recorded"}</small>
                </div>
                <div className="appointment-admin-record">
                  <span>Last update</span>
                  <strong>{selectedExecution.updatedAt}</strong>
                  <small>
                    {selectedExecution.failureCode
                      ? `${selectedExecution.failureCode}: ${selectedExecution.failureMessage ?? "Failure recorded"}`
                      : "Runtime execution recorded without failure."}
                  </small>
                </div>
              </div>

              <div className="appointment-catalog-activation-row">
                <label className="field">
                  <span>Execution reason</span>
                  <input
                    value={executionReason}
                    onChange={(event) => setExecutionReason(event.target.value)}
                    placeholder="Document retry, replay, resolve, or skip"
                  />
                </label>
                <div className="form-actions">
                  <button
                    className="pill pill-primary"
                    disabled={isPending}
                    onClick={() => transitionExecution("RETRY")}
                    type="button"
                  >
                    Retry
                  </button>
                  <button
                    className="pill pill-secondary"
                    disabled={isPending}
                    onClick={() => transitionExecution("REPLAY")}
                    type="button"
                  >
                    Replay
                  </button>
                  <button
                    className="pill pill-secondary"
                    disabled={isPending}
                    onClick={() => transitionExecution("RESOLVE")}
                    type="button"
                  >
                    Resolve
                  </button>
                  <button
                    className="pill pill-danger"
                    disabled={isPending}
                    onClick={() => transitionExecution("SKIP")}
                    type="button"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p>Select a runtime execution to operate it.</p>
          )}
        </article>
      </section>

      <section className="appointment-catalog-workspace">
        <article className="panel-card settings-main-card">
          <strong>Runtime execution activity</strong>
          <h2>Recent runtime records</h2>
          <div className="appointment-admin-record-list">
            {consoleModel.executions.length === 0 ? (
              <p>No runtime executions have been recorded yet.</p>
            ) : (
              consoleModel.executions.map((execution) => (
                <button
                  className={
                    execution.id === selectedExecution?.id
                      ? "appointment-catalog-row appointment-catalog-row-active"
                      : "appointment-catalog-row"
                  }
                  key={execution.id}
                  onClick={() => selectExecution(execution.id)}
                  type="button"
                >
                  <span>{formatLabel(execution.status)}</span>
                  <strong>{execution.automationRuleCode ?? execution.triggerCode}</strong>
                  <small>
                    {formatLabel(execution.sourceType)} • {execution.sourceReference ?? "No source reference"}
                  </small>
                </button>
              ))
            )}
          </div>
        </article>

        <article className="panel-card settings-main-card">
          <strong>Audit trail</strong>
          <h2>Recent automation events</h2>
          <div className="appointment-admin-record-list">
            {consoleModel.recentEvents.length === 0 ? (
              <p>No persisted automation lifecycle events yet.</p>
            ) : (
              consoleModel.recentEvents.map((event) => (
                <div className="appointment-admin-record" key={event.id}>
                  <span>{formatLabel(event.action)}</span>
                  <strong>{event.reason}</strong>
                  <small>{event.occurredAt}</small>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
