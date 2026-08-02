"use client";

import {
  BadgeCheck,
  Check,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileArchive,
  FileText,
  ShieldCheck,
  Vault,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";

export type FlgWorkflowProgress = {
  blockerCount: number;
  fileAssemblyComplete: boolean;
  filingLockComplete: boolean;
  financialComplete: boolean;
  recommendation: "Assemble file" | "Reconcile versions" | "Verify signatures" | "Reconcile money" | "Classify retention" | "Lock file" | "Ready for Post-Sale";
  retentionComplete: boolean;
  signaturesComplete: boolean;
  trailCount: number;
  versionComplete: boolean;
};

type StepKey = "assembly" | "versions" | "signatures" | "financial" | "retention" | "lock";
type TrailEntry = { actor: string; evidence: string; result: string; step: StepKey; timestamp: string };
type RetentionState = "Unclassified" | "Classified" | "Exception review";
type FileLockState = "Open" | "Ready to lock" | "Locked";

type FilingInput = {
  acquisitionTransportInventoryRecordsPresent: boolean;
  dealAndTitleRecordsPresent: boolean;
  finalAppraisalAndEstimateMatch: boolean;
  finalContractAndTitleMatch: boolean;
  fundingAndReceiptsReconciled: boolean;
  inventoryDispositionBalanced: boolean;
  privacyAndTaxRetentionClassified: boolean;
  repairAndSafetyRetentionClassified: boolean;
  requiredApprovalsVerified: boolean;
  requiredSignaturesVerified: boolean;
  retentionState: RetentionState;
  missingDocumentOwnerRecorded: boolean;
  fileLockState: FileLockState;
  completenessAuditPassed: boolean;
};

const initialInput: FilingInput = {
  acquisitionTransportInventoryRecordsPresent: false,
  completenessAuditPassed: false,
  dealAndTitleRecordsPresent: false,
  fileLockState: "Open",
  finalAppraisalAndEstimateMatch: false,
  finalContractAndTitleMatch: false,
  fundingAndReceiptsReconciled: false,
  inventoryDispositionBalanced: false,
  missingDocumentOwnerRecorded: false,
  privacyAndTaxRetentionClassified: false,
  repairAndSafetyRetentionClassified: false,
  requiredApprovalsVerified: false,
  requiredSignaturesVerified: false,
  retentionState: "Unclassified",
};

function timeStamp() {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date());
}

function evaluateFiling(input: FilingInput) {
  const fileAssemblyComplete = input.acquisitionTransportInventoryRecordsPresent && input.dealAndTitleRecordsPresent;
  const versionComplete = input.finalAppraisalAndEstimateMatch && input.finalContractAndTitleMatch;
  const signaturesComplete = input.requiredSignaturesVerified && input.requiredApprovalsVerified;
  const financialComplete = input.fundingAndReceiptsReconciled && input.inventoryDispositionBalanced;
  const retentionComplete = input.retentionState === "Classified" && input.privacyAndTaxRetentionClassified && input.repairAndSafetyRetentionClassified;
  const filingLockComplete = input.fileLockState === "Locked" && input.completenessAuditPassed && input.missingDocumentOwnerRecorded;

  const blockers = [
    !fileAssemblyComplete ? "The full deal file has not yet been assembled." : null,
    !versionComplete ? "Authoritative versions do not yet fully reconcile." : null,
    !signaturesComplete ? "Required signatures or approvals are still incomplete." : null,
    !financialComplete ? "Money, receipts, or inventory disposition are not yet fully reconciled." : null,
    !retentionComplete ? "Retention classification is still incomplete." : null,
    !filingLockComplete ? "File closure controls are still incomplete." : null,
  ].filter((item): item is string => Boolean(item));

  const recommendation: FlgWorkflowProgress["recommendation"] =
    !fileAssemblyComplete ? "Assemble file"
      : !versionComplete ? "Reconcile versions"
        : !signaturesComplete ? "Verify signatures"
          : !financialComplete ? "Reconcile money"
            : !retentionComplete ? "Classify retention"
              : !filingLockComplete ? "Lock file"
                : "Ready for Post-Sale";

  const positiveDrivers = [
    fileAssemblyComplete ? "Acquisition, transport, inventory, deal, and title records are present." : null,
    versionComplete ? "Final appraisal, estimate, contract, and title versions reconcile." : null,
    signaturesComplete ? "Required signatures and approvals are verified." : null,
    financialComplete ? "Funding, receipts, and inventory disposition balance." : null,
    retentionComplete ? "Privacy, tax, repair, and safety records are classified for retention." : null,
    filingLockComplete ? "Completeness audit passed and the deal file is locked." : null,
  ].filter((item): item is string => Boolean(item));

  return {
    blockerCount: blockers.length,
    blockers,
    fileAssemblyComplete,
    filingLockComplete,
    financialComplete,
    positiveDrivers,
    recommendation,
    retentionComplete,
    signaturesComplete,
    versionComplete,
  };
}

export function FlgFilingTool({
  onProgressChange,
  onReturnToLifecycle,
}: {
  onProgressChange: (progress: FlgWorkflowProgress) => void;
  onReturnToLifecycle: () => void;
}) {
  const [input, setInput] = useState(initialInput);
  const [completedSteps, setCompletedSteps] = useState<Record<StepKey, boolean>>({
    assembly: false,
    financial: false,
    lock: false,
    retention: false,
    signatures: false,
    versions: false,
  });
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [notice, setNotice] = useState("Start Filing by assembling the full authoritative deal record before close and retention controls are applied.");
  const result = useMemo(() => evaluateFiling(input), [input]);
  const stepCount = Object.values(completedSteps).filter(Boolean).length;

  useEffect(() => {
    onProgressChange({
      blockerCount: result.blockerCount,
      fileAssemblyComplete: completedSteps.assembly && result.fileAssemblyComplete,
      filingLockComplete: completedSteps.lock && result.filingLockComplete,
      financialComplete: completedSteps.financial && result.financialComplete,
      recommendation: result.recommendation,
      retentionComplete: completedSteps.retention && result.retentionComplete,
      signaturesComplete: completedSteps.signatures && result.signaturesComplete,
      trailCount: trail.length,
      versionComplete: completedSteps.versions && result.versionComplete,
    });
  }, [completedSteps, onProgressChange, result, trail.length]);

  function appendTrail(step: StepKey, actor: string, resultText: string, evidence: string) {
    setTrail((current) => [{ actor, evidence, result: resultText, step, timestamp: timeStamp() }, ...current]);
  }

  function invalidateFrom(step: StepKey, message: string) {
    let reopened = false;
    setCompletedSteps((current) => {
      const next = { ...current };
      const order: StepKey[] = ["assembly", "versions", "signatures", "financial", "retention", "lock"];
      const startIndex = order.indexOf(step);
      order.forEach((key, index) => {
        if (index >= startIndex && current[key]) {
          next[key] = false;
          reopened = true;
        }
      });
      return next;
    });
    if (reopened) appendTrail(step, "System", message, "Filing control reopened");
    setNotice(message);
  }

  function updateBoolean<K extends keyof FilingInput>(field: K, value: FilingInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Filing facts changed. Reconfirm this step and every downstream file-control gate.");
  }

  function updateValue<K extends keyof FilingInput>(field: K, value: FilingInput[K], step: StepKey) {
    setInput((current) => ({ ...current, [field]: value }));
    invalidateFrom(step, "Filing facts changed. Reconfirm this step and every downstream file-control gate.");
  }

  function completeAssembly() {
    if (!result.fileAssemblyComplete) return;
    setCompletedSteps((current) => ({ ...current, assembly: true }));
    appendTrail("assembly", "File coordinator", "Acquisition, transport, inventory, deal, and title records were assembled into the authoritative file.", "Document index");
    setNotice("File assembly is complete. Reconcile the authoritative versions next.");
  }

  function completeVersions() {
    if (!completedSteps.assembly || !result.versionComplete) return;
    setCompletedSteps((current) => ({ ...current, versions: true }));
    appendTrail("versions", "Auditor", "Final appraisal, estimate, contract, and title versions were reconciled.", "Version audit");
    setNotice("Version reconciliation is complete. Verify signatures and approvals next.");
  }

  function completeSignatures() {
    if (!completedSteps.versions || !result.signaturesComplete) return;
    setCompletedSteps((current) => ({ ...current, signatures: true }));
    appendTrail("signatures", "Auditor", "Required signatures and approvals were verified against the final deal file.", "Approval audit");
    setNotice("Approval verification is complete. Reconcile the financial record next.");
  }

  function completeFinancial() {
    if (!completedSteps.signatures || !result.financialComplete) return;
    setCompletedSteps((current) => ({ ...current, financial: true }));
    appendTrail("financial", "Accounting", "Funding, receipts, and inventory disposition were reconciled.", "Financial reconcile");
    setNotice("Financial reconciliation is complete. Apply retention controls next.");
  }

  function completeRetention() {
    if (!completedSteps.financial || !result.retentionComplete) return;
    setCompletedSteps((current) => ({ ...current, retention: true }));
    appendTrail("retention", "File coordinator", "Privacy, tax, repair, and safety records were classified for retention.", "Retention record");
    setNotice("Retention classification is complete. Lock the completed file next.");
  }

  function completeLock() {
    if (!completedSteps.retention || !result.filingLockComplete) return;
    setCompletedSteps((current) => ({ ...current, lock: true }));
    appendTrail("lock", "Compliance", "Completeness audit passed and the authoritative deal file was locked.", "File closure");
    setNotice("Filing is complete. The lifecycle can now move into Post-Sale.");
  }

  return <section className={styles.wopWorkspace} aria-label="TMS Filing workspace">
    <header className={styles.wopHeader}>
      <div>
        <span><FileArchive size={15} />TMS Filing</span>
        <h3>FLG authoritative file workspace</h3>
        <p>Guide the team through assembling the complete record, reconciling versions, verifying approvals, balancing money, classifying retention, and locking the final file.</p>
        <div className={styles.wopHeaderActions}>
          <button className={`${styles.wopHeaderLink} ${styles.wopHeaderButton}`} onClick={onReturnToLifecycle} type="button"><FileText size={14} />Return to lifecycle</button>
        </div>
      </div>
      <div className={styles.wopVersion}>
        <small>File state</small>
        <strong>{result.recommendation}</strong>
      </div>
    </header>

    <div className={styles.wopBody}>
      <div className={styles.wopSteps}>
        <section className={styles.wopStepCard}>
          <header><div><span>Step 1</span><h4>Assemble the complete record</h4></div><em className={completedSteps.assembly ? styles.wopComplete : ""}>{completedSteps.assembly ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.acquisitionTransportInventoryRecordsPresent} onChange={(event) => updateBoolean("acquisitionTransportInventoryRecordsPresent", event.target.checked, "assembly")} type="checkbox" /><span>Acquisition, transport, and inventory records are present</span></label>
            <label><input checked={input.dealAndTitleRecordsPresent} onChange={(event) => updateBoolean("dealAndTitleRecordsPresent", event.target.checked, "assembly")} type="checkbox" /><span>Deal, title, payment, and transfer records are present</span></label>
          </div>
          <button className={styles.wopAction} disabled={!result.fileAssemblyComplete || completedSteps.assembly} onClick={completeAssembly} type="button">Lock file assembly</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 2</span><h4>Reconcile authoritative versions</h4></div><em className={completedSteps.versions ? styles.wopComplete : ""}>{completedSteps.versions ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.finalAppraisalAndEstimateMatch} onChange={(event) => updateBoolean("finalAppraisalAndEstimateMatch", event.target.checked, "versions")} type="checkbox" /><span>Final appraisal and estimate versions agree</span></label>
            <label><input checked={input.finalContractAndTitleMatch} onChange={(event) => updateBoolean("finalContractAndTitleMatch", event.target.checked, "versions")} type="checkbox" /><span>Final contract and title versions agree</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.assembly || !result.versionComplete || completedSteps.versions} onClick={completeVersions} type="button">Lock version audit</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 3</span><h4>Verify signatures and approvals</h4></div><em className={completedSteps.signatures ? styles.wopComplete : ""}>{completedSteps.signatures ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.requiredSignaturesVerified} onChange={(event) => updateBoolean("requiredSignaturesVerified", event.target.checked, "signatures")} type="checkbox" /><span>Required signatures are verified</span></label>
            <label><input checked={input.requiredApprovalsVerified} onChange={(event) => updateBoolean("requiredApprovalsVerified", event.target.checked, "signatures")} type="checkbox" /><span>Required approvals are verified</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.versions || !result.signaturesComplete || completedSteps.signatures} onClick={completeSignatures} type="button">Lock approval audit</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 4</span><h4>Reconcile money and inventory</h4></div><em className={completedSteps.financial ? styles.wopComplete : ""}>{completedSteps.financial ? "Locked" : "Required"}</em></header>
          <div className={styles.wopChecks}>
            <label><input checked={input.fundingAndReceiptsReconciled} onChange={(event) => updateBoolean("fundingAndReceiptsReconciled", event.target.checked, "financial")} type="checkbox" /><span>Funding and receipts are reconciled</span></label>
            <label><input checked={input.inventoryDispositionBalanced} onChange={(event) => updateBoolean("inventoryDispositionBalanced", event.target.checked, "financial")} type="checkbox" /><span>Inventory disposition balances to the transaction</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.signatures || !result.financialComplete || completedSteps.financial} onClick={completeFinancial} type="button">Lock financial reconcile</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 5</span><h4>Classify and retain records</h4></div><em className={completedSteps.retention ? styles.wopComplete : ""}>{completedSteps.retention ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>Retention state</span><select onChange={(event) => updateValue("retentionState", event.target.value as RetentionState, "retention")} value={input.retentionState}><option>Unclassified</option><option>Classified</option><option>Exception review</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.privacyAndTaxRetentionClassified} onChange={(event) => updateBoolean("privacyAndTaxRetentionClassified", event.target.checked, "retention")} type="checkbox" /><span>Privacy and tax records are classified</span></label>
            <label><input checked={input.repairAndSafetyRetentionClassified} onChange={(event) => updateBoolean("repairAndSafetyRetentionClassified", event.target.checked, "retention")} type="checkbox" /><span>Repair and safety records are classified</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.financial || !result.retentionComplete || completedSteps.retention} onClick={completeRetention} type="button">Lock retention record</button>
        </section>

        <section className={styles.wopStepCard}>
          <header><div><span>Step 6</span><h4>Lock the completed file</h4></div><em className={completedSteps.lock ? styles.wopComplete : ""}>{completedSteps.lock ? "Locked" : "Required"}</em></header>
          <div className={styles.wopFieldGrid}>
            <label><span>File lock state</span><select onChange={(event) => updateValue("fileLockState", event.target.value as FileLockState, "lock")} value={input.fileLockState}><option>Open</option><option>Ready to lock</option><option>Locked</option></select></label>
          </div>
          <div className={styles.wopChecks}>
            <label><input checked={input.completenessAuditPassed} onChange={(event) => updateBoolean("completenessAuditPassed", event.target.checked, "lock")} type="checkbox" /><span>Completeness audit passed</span></label>
            <label><input checked={input.missingDocumentOwnerRecorded} onChange={(event) => updateBoolean("missingDocumentOwnerRecorded", event.target.checked, "lock")} type="checkbox" /><span>Missing-document owner and status were recorded</span></label>
          </div>
          <button className={styles.wopAction} disabled={!completedSteps.retention || !result.filingLockComplete || completedSteps.lock} onClick={completeLock} type="button">Release file closure</button>
        </section>
      </div>

      <aside className={styles.wopDecision}>
        <header><Vault size={18} /><div><span>Filing recommendation</span><strong>{result.recommendation}</strong></div><em className={result.recommendation === "Ready for Post-Sale" ? styles.wopComplete : result.recommendation === "Lock file" ? styles.wopHold : ""}>{stepCount}/6</em></header>
        <dl>
          <div><dt>Controls complete</dt><dd>{stepCount}/6</dd></div>
          <div><dt>Open blockers</dt><dd>{result.blockerCount}</dd></div>
          <div><dt>Work trail entries</dt><dd>{trail.length}</dd></div>
          <div><dt>Retention state</dt><dd>{input.retentionState}</dd></div>
          <div><dt>File lock state</dt><dd>{input.fileLockState}</dd></div>
          <div><dt>Completeness audit</dt><dd>{input.completenessAuditPassed ? "Passed" : "Pending"}</dd></div>
        </dl>
        <p className={styles.wopExplanation}>{result.recommendation === "Ready for Post-Sale" ? "Filing is complete. The authoritative deal file is reconciled, retained, and locked for Post-Sale follow-through." : "Filing should remain controlled until the exact missing file, version, approval, financial, or retention issue is resolved."}</p>
        <div className={styles.wopDrivers}>
          <div>
            <strong>What is working</strong>
            {(result.positiveDrivers.length ? result.positiveDrivers : ["No confirmed filing strength yet."]).map((item) => <span key={item}>{result.positiveDrivers.length ? <Check size={14} /> : <CircleAlert size={14} />}{item}</span>)}
          </div>
          <div>
            <strong>What still needs attention</strong>
            {result.blockers.map((item) => <span key={item}><CircleAlert size={14} />{item}</span>)}
          </div>
        </div>
        <section className={styles.wopTrail}>
          <header><Clock3 size={18} /><h4>Operational work trail</h4></header>
          {trail.length ? <ul>{trail.map((item, index) => <li key={`${item.step}-${item.timestamp}-${index}`}><strong>{item.timestamp}</strong><span>{item.actor}</span><div>{item.result}</div><small>{item.evidence}</small></li>)}</ul> : <p>No filing action has been recorded yet.</p>}
        </section>
      </aside>
    </div>

    <section className={styles.wopApproval}>
      <div>
        <span><ClipboardCheck size={14} />Authoritative record</span>
        <strong>{completedSteps.versions ? "File versions reconciled" : "Assembly or versions still active"}</strong>
        <small>All authoritative records and final versions should agree before money and retention controls are closed.</small>
      </div>
      <div>
        <span><ShieldCheck size={14} />Audit and retention</span>
        <strong>{completedSteps.retention ? "Retention classified" : "Retention still active"}</strong>
        <small>Approvals, money, retention, and completeness audit should be explicit before the file is locked.</small>
      </div>
      <div>
        <span><BadgeCheck size={14} />Stage readiness</span>
        <strong>{completedSteps.lock ? "Ready for Post-Sale" : "Filing still active"}</strong>
        <small>{completedSteps.lock ? "This deal can now hand off into the Post-Sale stage." : "Finish file closure and completeness audit before the lifecycle handoff opens."}</small>
      </div>
    </section>

    <footer className={styles.wopNotice} aria-live="polite"><CircleAlert size={14} />{notice}</footer>
  </section>;
}
