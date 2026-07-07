"use client";

import { useState, useTransition } from "react";

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

export function AppointmentAutomationOperationsConsolePanel({ initialConsole }: Props) {
  const [consoleModel, setConsoleModel] = useState(initialConsole);
  const firstRule = consoleModel.rules[0];
  const [selectedRuleCode, setSelectedRuleCode] = useState(firstRule?.ruleCode ?? "");
  const selectedRule =
    consoleModel.rules.find((rule) => rule.ruleCode === selectedRuleCode) ?? firstRule;
  const [draftReason, setDraftReason] = useState("");
  const [transitionReason, setTransitionReason] = useState("");
  const [ruleDraft, setRuleDraft] = useState({
    ruleCode: firstRule?.ruleCode ?? "",
    name: firstRule?.name ?? "",
    triggerCode: firstRule?.triggerCode ?? "",
    purposeCode: firstRule?.purposeCode ?? "",
    description: firstRule?.description ?? "",
    priority: String(firstRule?.priority ?? 100)
  });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

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

  function applyConsole(payload: { console?: ConsoleModel; error?: string } | null, message: string) {
    if (!payload?.console) {
      setError(payload?.error ?? "Automation console update failed.");
      return;
    }
    setConsoleModel(payload.console);
    setNotice(message);
    setDraftReason("");
    setTransitionReason("");
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

  return (
    <div className="appointment-catalog-admin-stack">
      <section className="appointment-catalog-metric-grid">
        <article className="settings-summary-card">
          <span>Total rules</span>
          <strong>{consoleModel.ruleHealth.totalRules}</strong>
          <small>{consoleModel.ruleHealth.activeRules} active</small>
        </article>
        <article className="settings-summary-card">
          <span>Paused</span>
          <strong>{consoleModel.ruleHealth.pausedRules}</strong>
          <small>{consoleModel.ruleHealth.draftRules} draft</small>
        </article>
        <article className="settings-summary-card">
          <span>Failure queue</span>
          <strong>{consoleModel.ruleHealth.failedExecutions}</strong>
          <small>{consoleModel.ruleHealth.retryableExecutions} retryable</small>
        </article>
        <article className="settings-summary-card">
          <span>Pending review</span>
          <strong>{consoleModel.ruleHealth.pendingReviewItems}</strong>
          <small>manager review items</small>
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
                <small>{formatLabel(rule.triggerCode)} • {rule.purposeCode}</small>
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
                <input value={ruleDraft.ruleCode} onChange={(event) => setRuleDraft((current) => ({ ...current, ruleCode: event.target.value }))} />
              </label>
              <label className="field">
                <span>Name</span>
                <input value={ruleDraft.name} onChange={(event) => setRuleDraft((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="field">
                <span>Trigger</span>
                <input value={ruleDraft.triggerCode} onChange={(event) => setRuleDraft((current) => ({ ...current, triggerCode: event.target.value }))} />
              </label>
              <label className="field">
                <span>Purpose</span>
                <input value={ruleDraft.purposeCode} onChange={(event) => setRuleDraft((current) => ({ ...current, purposeCode: event.target.value }))} />
              </label>
              <label className="field">
                <span>Priority</span>
                <input type="number" value={ruleDraft.priority} onChange={(event) => setRuleDraft((current) => ({ ...current, priority: event.target.value }))} />
              </label>
              <label className="field appointment-admin-span">
                <span>Description</span>
                <textarea value={ruleDraft.description} onChange={(event) => setRuleDraft((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <label className="field appointment-admin-span">
                <span>Required draft reason</span>
                <input value={draftReason} onChange={(event) => setDraftReason(event.target.value)} placeholder="Explain this automation rule change" />
              </label>
            </div>
            <div className="form-actions">
              <button className="pill pill-primary" disabled={isPending} type="submit">
                Save rule draft
              </button>
            </div>
          </form>

          <div className="appointment-catalog-activation-row">
            <label className="field">
              <span>Lifecycle reason</span>
              <input value={transitionReason} onChange={(event) => setTransitionReason(event.target.value)} placeholder="Document why this rule is changing state" />
            </label>
            <div className="form-actions">
              <button className="pill pill-primary" disabled={isPending || !selectedRule} onClick={() => transitionRule("ACTIVATE")} type="button">Activate</button>
              <button className="pill pill-secondary" disabled={isPending || !selectedRule} onClick={() => transitionRule("PAUSE")} type="button">Pause</button>
              <button className="pill pill-danger" disabled={isPending || !selectedRule} onClick={() => transitionRule("RETIRE")} type="button">Retire</button>
            </div>
          </div>

          {error ? <div className="notice notice-danger"><p>{error}</p></div> : null}
          {notice ? <div className="notice"><p>{notice}</p></div> : null}
        </article>
      </section>

      <section className="appointment-catalog-workspace">
        <article className="panel-card settings-main-card">
          <strong>Failure queue</strong>
          <h2>Retry, replay, and review foundation</h2>
          <div className="appointment-admin-record-list">
            {consoleModel.failureQueue.length === 0 ? (
              <p>No failed or review-required automation executions are queued.</p>
            ) : (
              consoleModel.failureQueue.map((execution) => (
                <div className="appointment-admin-record" key={execution.id}>
                  <span>{formatLabel(execution.status)}</span>
                  <strong>{execution.failureCode ?? execution.triggerCode}</strong>
                  <small>{execution.failureMessage ?? "Awaiting manager action"}</small>
                </div>
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
