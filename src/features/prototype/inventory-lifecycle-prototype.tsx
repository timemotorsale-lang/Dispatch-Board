"use client";

import {
  ArrowRight,
  CarFront,
  Check,
  CircleAlert,
  ClipboardCheck,
  LockKeyhole,
  MapPin,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { completionKey, lifecycleStages } from "@/features/inventory/lifecycle/stage-config";
import {
  buildLifecycleUnitContext,
  buildInventoryLifecycleHref,
  summarizeLifecycleHistory,
  withLifecycleReturnTo,
} from "@/features/inventory/lifecycle/shell";
import type {
  InventoryLifecycleStageSnapshot,
  InventoryLifecycleUnitContext,
} from "@/features/inventory/lifecycle/types";

import styles from "./inventory-lifecycle-prototype.module.css";
import { DtgDetailingTool, type DtgWorkflowProgress } from "./dtg-detailing-tool";
import { FlgFilingTool, type FlgWorkflowProgress } from "./flg-filing-tool";
import { FqcFinalQcTool, type FqcWorkflowProgress } from "./fqc-final-qc-tool";
import { IgiInspectionTool, type IgiWorkflowProgress } from "./igi-inspection-tool";
import { IiiIntakeTool, type IiiWorkflowProgress } from "./iii-intake-tool";
import { IqiQualityTool, type IqiWorkflowProgress } from "./iqi-quality-tool";
import { PmmPhotosMarketingTool, type PmmWorkflowProgress } from "./pmm-photos-marketing-tool";
import { PslPostSaleTool, type PslWorkflowProgress } from "./psl-post-sale-tool";
import { RbiReceivingTool, type RbiWorkflowProgress } from "./rbi-receiving-tool";
import { RnrReconTool, type RnrWorkflowProgress } from "./rnr-recon-tool";
import { SlgSellingTool, type SlgWorkflowProgress } from "./slg-selling-tool";
import { StlSaleTitlingTool, type StlWorkflowProgress } from "./stl-sale-titling-tool";
import { TaiAcquisitionTool, type TaiWorkflowProgress } from "./tai-acquisition-tool";
import { TciTransportTool, type TciWorkflowProgress } from "./tci-transport-tool";
import { TlrTitleReadinessTool, type TlrWorkflowProgress } from "./tlr-title-readiness-tool";
import { WopWorkOrderTool, type WopWorkflowProgress } from "./wop-work-order-tool";

type StageProgressPacket = {
  actionStates: boolean[];
  blockerCount: number;
  recommendation: string;
  readyForHandoff: boolean;
  trailCount: number;
};

function buildHandoffLabel(stageIndex: number) {
  return lifecycleStages[stageIndex + 1]?.label ?? "Lifecycle closure";
}

export function InventoryLifecyclePrototype({
  embedded = false,
  initialStage = 0,
  initialUnitContext,
}: {
  embedded?: boolean;
  initialStage?: number;
  initialUnitContext?: InventoryLifecycleUnitContext | null;
}) {
  const currentUnit = useMemo(() => buildLifecycleUnitContext(initialUnitContext), [initialUnitContext]);
  const [selectedStage, setSelectedStage] = useState(() => Math.max(0, Math.min(lifecycleStages.length - 1, initialStage)));
  const [completed, setCompleted] = useState<Set<string>>(() => new Set());
  const [prototypeVersion, setPrototypeVersion] = useState(0);
  const [iiiProgress, setIiiProgress] = useState<IiiWorkflowProgress>({ blockerCount: 0, canonicalComplete: false, custodyComplete: false, decodedComplete: false, objectiveComplete: false, readinessGateComplete: false, recommendation: "Hold", safetyComplete: false, trailCount: 0 });
  const [igiProgress, setIgiProgress] = useState<IgiWorkflowProgress>({ blockerCount: 0, findingsComplete: false, identityAndSafetyComplete: false, mechanicalComplete: false, readinessGateComplete: false, recommendation: "Hold", roadTestComplete: false, trailCount: 0 });
  const [rbiProgress, setRbiProgress] = useState<RbiWorkflowProgress>({ arrivalFactsComplete: false, baselinePhotosComplete: false, blockerCount: 0, custodyAccepted: false, recommendation: "Hold", trailCount: 0, varianceControlled: false, vinComplete: false });
  const [iqiProgress, setIqiProgress] = useState<IqiWorkflowProgress>({ blockerCount: 0, dispositionComplete: false, inspectionPackageComplete: false, readinessGateComplete: false, recommendation: "Hold", reviewComplete: false, trailCount: 0 });
  const [taiProgress, setTaiProgress] = useState<TaiWorkflowProgress>({ appraisalComplete: false, authorityComplete: false, commitmentComplete: false, economicsComplete: false, identityComplete: false, titleComplete: false });
  const [tciProgress, setTciProgress] = useState<TciWorkflowProgress>({ blockerCount: 0, deliveryComplete: false, movementComplete: false, pickupComplete: false, planComplete: false, recommendation: "Hold", releaseComplete: false, sourceComplete: false, trackingComplete: false, trailCount: 0 });
  const [wopProgress, setWopProgress] = useState<WopWorkflowProgress>({ assignmentComplete: false, authorizationComplete: false, blockerCount: 0, estimateComplete: false, jobsComplete: false, readinessComplete: false, recommendation: "Hold", sequencingComplete: false, trailCount: 0 });
  const [rnrProgress, setRnrProgress] = useState<RnrWorkflowProgress>({ acceptanceComplete: false, blockerCount: 0, changeApprovalComplete: false, completionProofComplete: false, diagnosisComplete: false, executionComplete: false, reconciliationComplete: false, recommendation: "Acknowledge job", trailCount: 0 });
  const [fqcProgress, setFqcProgress] = useState<FqcWorkflowProgress>({ blockerCount: 0, decisionComplete: false, diagnosisScanComplete: false, jobsVerifiedComplete: false, leaksAndWorkmanshipComplete: false, recommendation: "Verify jobs", roadTestComplete: false, safetyComplete: false, trailCount: 0 });
  const [dtgProgress, setDtgProgress] = useState<DtgWorkflowProgress>({ blockerCount: 0, exteriorComplete: false, interiorComplete: false, qcComplete: false, recommendation: "Confirm detail scope", scopeComplete: false, specialtyComplete: false, stageComplete: false, trailCount: 0 });
  const [pmmProgress, setPmmProgress] = useState<PmmWorkflowProgress>({ blockerCount: 0, complianceComplete: false, listingComplete: false, mediaComplete: false, pricingComplete: false, publicationComplete: false, recommendation: "Capture media", specsComplete: false, trailCount: 0 });
  const [tlrProgress, setTlrProgress] = useState<TlrWorkflowProgress>({ blockerCount: 0, brandLienComplete: false, custodyComplete: false, decisionComplete: false, identityComplete: false, odometerComplete: false, ownershipComplete: false, recommendation: "Match title identity", trailCount: 0 });
  const [slgProgress, setSlgProgress] = useState<SlgWorkflowProgress>({ approvalsComplete: false, availabilityComplete: false, blockerCount: 0, engagementComplete: false, offerComplete: false, recommendation: "Confirm availability", reservationComplete: false, testDriveComplete: false, trailCount: 0 });
  const [stlProgress, setStlProgress] = useState<StlWorkflowProgress>({ blockerCount: 0, buyerComplete: false, figuresComplete: false, packetComplete: false, qcComplete: false, recommendation: "Verify buyer", signaturesComplete: false, submissionComplete: false, trailCount: 0 });
  const [flgProgress, setFlgProgress] = useState<FlgWorkflowProgress>({ blockerCount: 0, fileAssemblyComplete: false, filingLockComplete: false, financialComplete: false, recommendation: "Assemble file", retentionComplete: false, signaturesComplete: false, trailCount: 0, versionComplete: false });
  const [pslProgress, setPslProgress] = useState<PslWorkflowProgress>({ blockerCount: 0, closureComplete: false, deliveryComplete: false, fundingComplete: false, recommendation: "Confirm delivery", titleComplete: false, trailCount: 0, warrantyComplete: false, weOweComplete: false });
  const [notice, setNotice] = useState("This workspace is isolated. Prototype actions do not update operational records.");
  const stage = lifecycleStages[selectedStage];
  const lifecycleReturnHref = useMemo(() => buildInventoryLifecycleHref(currentUnit.inventoryUnitId, selectedStage), [currentUnit.inventoryUnitId, selectedStage]);
  const completedCount = useMemo(
    () => stage.tasks.filter((_, index) => completed.has(completionKey(selectedStage, index))).length,
    [completed, selectedStage, stage.tasks],
  );
  const ready = completedCount === stage.tasks.length;

  const syncTaiProgress = useCallback((progress: TaiWorkflowProgress) => {
    setTaiProgress(progress);
    const acquisitionProgress = [progress.identityComplete, progress.appraisalComplete, progress.economicsComplete, progress.titleComplete, progress.authorityComplete, progress.commitmentComplete];
    setCompleted((current) => {
      const next = new Set(current);
      acquisitionProgress.forEach((isComplete, index) => {
        const key = completionKey(0, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const syncTciProgress = useCallback((progress: TciWorkflowProgress) => {
    setTciProgress(progress);
    const transportationProgress = [
      progress.sourceComplete,
      progress.releaseComplete,
      progress.planComplete,
      progress.movementComplete,
      progress.pickupComplete,
      progress.deliveryComplete,
    ];
    setCompleted((current) => {
      const next = new Set(current);
      transportationProgress.forEach((isComplete, index) => {
        const key = completionKey(1, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const syncRbiProgress = useCallback((progress: RbiWorkflowProgress) => {
    setRbiProgress(progress);
    const receivingProgress = [
      progress.vinComplete,
      progress.arrivalFactsComplete,
      progress.baselinePhotosComplete,
      progress.varianceControlled,
      progress.custodyAccepted,
      progress.varianceControlled,
    ];
    setCompleted((current) => {
      const next = new Set(current);
      receivingProgress.forEach((isComplete, index) => {
        const key = completionKey(2, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const syncIiiProgress = useCallback((progress: IiiWorkflowProgress) => {
    setIiiProgress(progress);
    const intakeProgress = [
      progress.canonicalComplete,
      progress.decodedComplete,
      progress.safetyComplete,
      progress.objectiveComplete,
      progress.custodyComplete,
      progress.readinessGateComplete,
    ];
    setCompleted((current) => {
      const next = new Set(current);
      intakeProgress.forEach((isComplete, index) => {
        const key = completionKey(3, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const syncIgiProgress = useCallback((progress: IgiWorkflowProgress) => {
    setIgiProgress(progress);
    const inspectionProgress = [
      progress.identityAndSafetyComplete,
      progress.mechanicalComplete,
      progress.mechanicalComplete,
      progress.roadTestComplete,
      progress.findingsComplete,
      progress.readinessGateComplete,
    ];
    setCompleted((current) => {
      const next = new Set(current);
      inspectionProgress.forEach((isComplete, index) => {
        const key = completionKey(4, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const syncIqiProgress = useCallback((progress: IqiWorkflowProgress) => {
    setIqiProgress(progress);
    const qcProgress = [
      progress.inspectionPackageComplete,
      progress.reviewComplete,
      progress.reviewComplete,
      progress.reviewComplete,
      progress.dispositionComplete,
      progress.readinessGateComplete,
    ];
    setCompleted((current) => {
      const next = new Set(current);
      qcProgress.forEach((isComplete, index) => {
        const key = completionKey(5, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const syncWopProgress = useCallback((progress: WopWorkflowProgress) => {
    setWopProgress(progress);
    const workOrderProgress = [
      progress.jobsComplete,
      progress.estimateComplete,
      progress.sequencingComplete,
      progress.assignmentComplete,
      progress.readinessComplete,
      progress.authorizationComplete,
    ];
    setCompleted((current) => {
      const next = new Set(current);
      workOrderProgress.forEach((isComplete, index) => {
        const key = completionKey(6, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const syncRnrProgress = useCallback((progress: RnrWorkflowProgress) => {
    setRnrProgress(progress);
    const reconProgress = [
      progress.acceptanceComplete,
      progress.diagnosisComplete,
      progress.changeApprovalComplete,
      progress.executionComplete,
      progress.completionProofComplete,
      progress.reconciliationComplete,
    ];
    setCompleted((current) => {
      const next = new Set(current);
      reconProgress.forEach((isComplete, index) => {
        const key = completionKey(7, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const syncFqcProgress = useCallback((progress: FqcWorkflowProgress) => {
    setFqcProgress(progress);
    const finalQcProgress = [
      progress.jobsVerifiedComplete,
      progress.diagnosisScanComplete,
      progress.roadTestComplete,
      progress.leaksAndWorkmanshipComplete,
      progress.safetyComplete,
      progress.decisionComplete,
    ];
    setCompleted((current) => {
      const next = new Set(current);
      finalQcProgress.forEach((isComplete, index) => {
        const key = completionKey(8, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const syncDtgProgress = useCallback((progress: DtgWorkflowProgress) => {
    setDtgProgress(progress);
    const detailingProgress = [
      progress.scopeComplete,
      progress.exteriorComplete,
      progress.interiorComplete,
      progress.specialtyComplete,
      progress.qcComplete,
      progress.stageComplete,
    ];
    setCompleted((current) => {
      const next = new Set(current);
      detailingProgress.forEach((isComplete, index) => {
        const key = completionKey(9, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const syncPmmProgress = useCallback((progress: PmmWorkflowProgress) => {
    setPmmProgress(progress);
    const marketingProgress = [
      progress.mediaComplete,
      progress.specsComplete,
      progress.listingComplete,
      progress.pricingComplete,
      progress.complianceComplete,
      progress.publicationComplete,
    ];
    setCompleted((current) => {
      const next = new Set(current);
      marketingProgress.forEach((isComplete, index) => {
        const key = completionKey(10, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const syncTlrProgress = useCallback((progress: TlrWorkflowProgress) => {
    setTlrProgress(progress);
    const titleProgress = [
      progress.identityComplete,
      progress.ownershipComplete,
      progress.brandLienComplete,
      progress.odometerComplete,
      progress.custodyComplete,
      progress.decisionComplete,
    ];
    setCompleted((current) => {
      const next = new Set(current);
      titleProgress.forEach((isComplete, index) => {
        const key = completionKey(11, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const syncSlgProgress = useCallback((progress: SlgWorkflowProgress) => {
    setSlgProgress(progress);
    const sellingProgress = [
      progress.availabilityComplete,
      progress.engagementComplete,
      progress.testDriveComplete,
      progress.offerComplete,
      progress.approvalsComplete,
      progress.reservationComplete,
    ];
    setCompleted((current) => {
      const next = new Set(current);
      sellingProgress.forEach((isComplete, index) => {
        const key = completionKey(12, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const syncStlProgress = useCallback((progress: StlWorkflowProgress) => {
    setStlProgress(progress);
    const saleTitlingProgress = [
      progress.buyerComplete,
      progress.packetComplete,
      progress.figuresComplete,
      progress.signaturesComplete,
      progress.qcComplete,
      progress.submissionComplete,
    ];
    setCompleted((current) => {
      const next = new Set(current);
      saleTitlingProgress.forEach((isComplete, index) => {
        const key = completionKey(13, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const syncFlgProgress = useCallback((progress: FlgWorkflowProgress) => {
    setFlgProgress(progress);
    const filingProgress = [
      progress.fileAssemblyComplete,
      progress.versionComplete,
      progress.signaturesComplete,
      progress.financialComplete,
      progress.retentionComplete,
      progress.filingLockComplete,
    ];
    setCompleted((current) => {
      const next = new Set(current);
      filingProgress.forEach((isComplete, index) => {
        const key = completionKey(14, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const syncPslProgress = useCallback((progress: PslWorkflowProgress) => {
    setPslProgress(progress);
    const postSaleProgress = [
      progress.deliveryComplete,
      progress.weOweComplete,
      progress.fundingComplete,
      progress.titleComplete,
      progress.warrantyComplete,
      progress.closureComplete,
    ];
    setCompleted((current) => {
      const next = new Set(current);
      postSaleProgress.forEach((isComplete, index) => {
        const key = completionKey(15, index);
        if (isComplete) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  }, []);

  const stageSnapshots = useMemo<InventoryLifecycleStageSnapshot[]>(() => {
    const packets: StageProgressPacket[] = [
      { actionStates: [taiProgress.identityComplete, taiProgress.appraisalComplete, taiProgress.economicsComplete, taiProgress.titleComplete, taiProgress.authorityComplete, taiProgress.commitmentComplete], blockerCount: 0, recommendation: taiProgress.commitmentComplete ? "Purchase recorded" : taiProgress.authorityComplete ? "Approved / awaiting purchase" : "Evaluation required", readyForHandoff: taiProgress.commitmentComplete, trailCount: 0 },
      { actionStates: [tciProgress.sourceComplete, tciProgress.releaseComplete, tciProgress.planComplete, tciProgress.movementComplete, tciProgress.pickupComplete, tciProgress.deliveryComplete], blockerCount: tciProgress.blockerCount, recommendation: tciProgress.recommendation, readyForHandoff: tciProgress.deliveryComplete, trailCount: tciProgress.trailCount },
      { actionStates: [rbiProgress.vinComplete, rbiProgress.arrivalFactsComplete, rbiProgress.baselinePhotosComplete, rbiProgress.varianceControlled, rbiProgress.custodyAccepted, rbiProgress.varianceControlled], blockerCount: rbiProgress.blockerCount, recommendation: rbiProgress.recommendation, readyForHandoff: rbiProgress.custodyAccepted, trailCount: rbiProgress.trailCount },
      { actionStates: [iiiProgress.canonicalComplete, iiiProgress.decodedComplete, iiiProgress.safetyComplete, iiiProgress.objectiveComplete, iiiProgress.custodyComplete, iiiProgress.readinessGateComplete], blockerCount: iiiProgress.blockerCount, recommendation: iiiProgress.recommendation, readyForHandoff: iiiProgress.readinessGateComplete, trailCount: iiiProgress.trailCount },
      { actionStates: [igiProgress.identityAndSafetyComplete, igiProgress.mechanicalComplete, igiProgress.mechanicalComplete, igiProgress.roadTestComplete, igiProgress.findingsComplete, igiProgress.readinessGateComplete], blockerCount: igiProgress.blockerCount, recommendation: igiProgress.recommendation, readyForHandoff: igiProgress.readinessGateComplete, trailCount: igiProgress.trailCount },
      { actionStates: [iqiProgress.inspectionPackageComplete, iqiProgress.reviewComplete, iqiProgress.reviewComplete, iqiProgress.reviewComplete, iqiProgress.dispositionComplete, iqiProgress.readinessGateComplete], blockerCount: iqiProgress.blockerCount, recommendation: iqiProgress.recommendation, readyForHandoff: iqiProgress.readinessGateComplete, trailCount: iqiProgress.trailCount },
      { actionStates: [wopProgress.jobsComplete, wopProgress.estimateComplete, wopProgress.sequencingComplete, wopProgress.assignmentComplete, wopProgress.readinessComplete, wopProgress.authorizationComplete], blockerCount: wopProgress.blockerCount, recommendation: wopProgress.recommendation, readyForHandoff: wopProgress.authorizationComplete, trailCount: wopProgress.trailCount },
      { actionStates: [rnrProgress.acceptanceComplete, rnrProgress.diagnosisComplete, rnrProgress.changeApprovalComplete, rnrProgress.executionComplete, rnrProgress.completionProofComplete, rnrProgress.reconciliationComplete], blockerCount: rnrProgress.blockerCount, recommendation: rnrProgress.recommendation, readyForHandoff: rnrProgress.reconciliationComplete, trailCount: rnrProgress.trailCount },
      { actionStates: [fqcProgress.jobsVerifiedComplete, fqcProgress.diagnosisScanComplete, fqcProgress.roadTestComplete, fqcProgress.leaksAndWorkmanshipComplete, fqcProgress.safetyComplete, fqcProgress.decisionComplete], blockerCount: fqcProgress.blockerCount, recommendation: fqcProgress.recommendation, readyForHandoff: fqcProgress.decisionComplete, trailCount: fqcProgress.trailCount },
      { actionStates: [dtgProgress.scopeComplete, dtgProgress.exteriorComplete, dtgProgress.interiorComplete, dtgProgress.specialtyComplete, dtgProgress.qcComplete, dtgProgress.stageComplete], blockerCount: dtgProgress.blockerCount, recommendation: dtgProgress.recommendation, readyForHandoff: dtgProgress.stageComplete, trailCount: dtgProgress.trailCount },
      { actionStates: [pmmProgress.mediaComplete, pmmProgress.specsComplete, pmmProgress.listingComplete, pmmProgress.pricingComplete, pmmProgress.complianceComplete, pmmProgress.publicationComplete], blockerCount: pmmProgress.blockerCount, recommendation: pmmProgress.recommendation, readyForHandoff: pmmProgress.publicationComplete, trailCount: pmmProgress.trailCount },
      { actionStates: [tlrProgress.identityComplete, tlrProgress.ownershipComplete, tlrProgress.brandLienComplete, tlrProgress.odometerComplete, tlrProgress.custodyComplete, tlrProgress.decisionComplete], blockerCount: tlrProgress.blockerCount, recommendation: tlrProgress.recommendation, readyForHandoff: tlrProgress.decisionComplete, trailCount: tlrProgress.trailCount },
      { actionStates: [slgProgress.availabilityComplete, slgProgress.engagementComplete, slgProgress.testDriveComplete, slgProgress.offerComplete, slgProgress.approvalsComplete, slgProgress.reservationComplete], blockerCount: slgProgress.blockerCount, recommendation: slgProgress.recommendation, readyForHandoff: slgProgress.reservationComplete, trailCount: slgProgress.trailCount },
      { actionStates: [stlProgress.buyerComplete, stlProgress.packetComplete, stlProgress.figuresComplete, stlProgress.signaturesComplete, stlProgress.qcComplete, stlProgress.submissionComplete], blockerCount: stlProgress.blockerCount, recommendation: stlProgress.recommendation, readyForHandoff: stlProgress.submissionComplete, trailCount: stlProgress.trailCount },
      { actionStates: [flgProgress.fileAssemblyComplete, flgProgress.versionComplete, flgProgress.signaturesComplete, flgProgress.financialComplete, flgProgress.retentionComplete, flgProgress.filingLockComplete], blockerCount: flgProgress.blockerCount, recommendation: flgProgress.recommendation, readyForHandoff: flgProgress.filingLockComplete, trailCount: flgProgress.trailCount },
      { actionStates: [pslProgress.deliveryComplete, pslProgress.weOweComplete, pslProgress.fundingComplete, pslProgress.titleComplete, pslProgress.warrantyComplete, pslProgress.closureComplete], blockerCount: pslProgress.blockerCount, recommendation: pslProgress.recommendation, readyForHandoff: pslProgress.closureComplete, trailCount: pslProgress.trailCount },
    ];
    return lifecycleStages.map((item, index) => {
      const current = packets[index];
      const completedActions = current.actionStates.filter(Boolean).length;
      const status =
        current.blockerCount > 0
          ? "BLOCKED"
          : current.readyForHandoff
            ? "READY"
            : completedActions > 0 || current.trailCount > 0
              ? "IN_PROGRESS"
              : "NOT_STARTED";
      const evidenceItems = item.tasks.map((task, actionIndex) => ({
        actionTitle: task.title,
        evidenceLabel: task.evidence,
        owner: task.owner,
        state: current.blockerCount > 0 && !current.actionStates[actionIndex] ? "BLOCKED" as const : current.actionStates[actionIndex] ? "COMPLETE" as const : "PENDING" as const,
      }));
      const workTrail = evidenceItems
        .filter((evidence) => evidence.state === "COMPLETE" || evidence.state === "BLOCKED")
        .map((evidence) => ({
          actor: evidence.owner,
          detail: evidence.state === "COMPLETE" ? `${evidence.actionTitle} completed for ${currentUnit.inventoryNumber}.` : `${evidence.actionTitle} still needs ownership before handoff.`,
          evidenceLabel: evidence.evidenceLabel,
          label: evidence.actionTitle,
          state: evidence.state === "COMPLETE" ? "RECORDED" as const : "NEEDS_ATTENTION" as const,
        }));
      const nextStageLabel = buildHandoffLabel(index);
      return {
        key: item.key,
        label: item.label,
        stageIndex: index,
        completedActions,
        totalActions: item.tasks.length,
        blockerCount: current.blockerCount,
        evidenceItems,
        handoff: {
          blockerSummary: current.blockerCount ? `${current.blockerCount} open blocker${current.blockerCount === 1 ? "" : "s"} must be cleared by ${item.owner}.` : "No open blockers recorded in this stage packet.",
          nextStageLabel,
          readinessLabel: current.readyForHandoff ? `Ready for ${nextStageLabel}` : `Not ready for ${nextStageLabel}`,
          summary: current.readyForHandoff ? `${item.label} can hand off to ${nextStageLabel}.` : `${item.label} is holding before ${nextStageLabel}.`,
        },
        lastUpdatedLabel: current.trailCount || completedActions ? (embedded ? "Guided lifecycle session evidence" : "Prototype session evidence") : "No evidence recorded",
        trailCount: current.trailCount,
        recommendation: current.recommendation,
        readyForHandoff: current.readyForHandoff,
        status,
        workTrail,
      };
    });
  }, [currentUnit.inventoryNumber, dtgProgress, embedded, fqcProgress, flgProgress, igiProgress, iiiProgress, iqiProgress, pmmProgress, pslProgress, rbiProgress, rnrProgress, slgProgress, stlProgress, taiProgress, tciProgress, tlrProgress, wopProgress]);

  const lifecycleHistory = useMemo(() => summarizeLifecycleHistory(stageSnapshots), [stageSnapshots]);
  const currentSnapshot = stageSnapshots[selectedStage];
  const rollups = useMemo(() => ({
    blockedUnits: stageSnapshots.filter((snapshot) => snapshot.blockerCount > 0).length,
    handoffReady: stageSnapshots.filter((snapshot) => snapshot.readyForHandoff).length,
    stagesInMotion: stageSnapshots.filter((snapshot) => snapshot.status === "IN_PROGRESS").length,
  }), [stageSnapshots]);
  const selectedStageStatusLabel =
    currentSnapshot.status === "READY"
      ? "Ready For Handoff"
      : currentSnapshot.status === "BLOCKED"
        ? "Blocked"
        : currentSnapshot.status === "IN_PROGRESS"
          ? "In Progress"
          : "Not Started";

  function toggleAction(actionIndex: number) {
    if (selectedStage === 0 || selectedStage === 1 || selectedStage === 2 || selectedStage === 3 || selectedStage === 4 || selectedStage === 5 || selectedStage === 6 || selectedStage === 7 || selectedStage === 8 || selectedStage === 9 || selectedStage === 10 || selectedStage === 11 || selectedStage === 12 || selectedStage === 13 || selectedStage === 14 || selectedStage === 15) {
      setNotice(selectedStage === 0
        ? "Acquisition actions are controlled by TAI evidence, evaluation, approval, and purchase recording."
        : selectedStage === 1
          ? "Transportation actions are controlled by TCI release, dispatch, custody, tracking, and receiving evidence."
          : selectedStage === 2
            ? "Receiving actions are controlled by RBI identity, arrival, baseline photo, variance, and custody evidence."
            : selectedStage === 3
              ? "Intake actions are controlled by III canonical linkage, safety, objective, custody, and readiness evidence."
              : selectedStage === 4
                ? "Inspection actions are controlled by IGI identity, safety, mechanical, bodywork, road-test, and findings evidence."
                : selectedStage === 5
                  ? "Initial QC actions are controlled by IQI package receipt, completeness review, evidence review, disposition, and release evidence."
                  : selectedStage === 6
                    ? "Work Order actions are controlled by WOP job mapping, estimate versioning, sequencing, assignment, readiness, and authorization evidence."
                    : selectedStage === 7
                      ? "Recon & Repair actions are controlled by the RNR execution workspace, including job acceptance, diagnosis, change approval, proof, and reconciliation."
                      : selectedStage === 8
                        ? "Final QC actions are controlled by the FQC workspace, including independent verification, final scan, road test, workmanship, safety release, and final decision evidence."
                        : selectedStage === 9
                          ? "Detailing actions are controlled by the DTG workspace, including detail scope, exterior/interior preparation, specialty work, detail QC, and media staging."
                          : selectedStage === 10
                            ? "Photos & Marketing actions are controlled by the PMM workspace, including media capture, specs, listing copy, pricing, compliance review, and publication proof."
                            : selectedStage === 11
                              ? "Title Readiness actions are controlled by the TLR workspace, including identity match, ownership chain, lien/brand, odometer, custody control, and legal-readiness decision."
                              : selectedStage === 12
                                ? "Selling actions are controlled by the SLG workspace, including availability, customer activity, test-drive custody, offer versioning, approvals, and accepted-term reservation evidence."
                                : selectedStage === 13
                                  ? "Sale Titling actions are controlled by the STL workspace, including buyer verification, transfer packet preparation, figure audit, signatures, exact-document QC, and submission proof."
                                  : selectedStage === 14
                                    ? "Filing actions are controlled by the FLG workspace, including file assembly, version reconciliation, approvals audit, financial reconcile, retention classification, and file closure."
                                    : "Post-Sale actions are controlled by the PSL workspace, including delivery proof, promise closure, funding, title follow-up, customer care, and final lifecycle outcome evidence.");
      return;
    }
    const key = completionKey(selectedStage, actionIndex);
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setNotice(embedded ? "Guided lifecycle progress updated locally. No operational record was changed." : "Prototype progress updated locally. No operational record was changed.");
  }

  function simulateHandoff() {
    if (!ready) return;
    if (selectedStage === lifecycleStages.length - 1) {
      setNotice(embedded ? "Guided lifecycle completed for this session. No production vehicle or workflow was changed." : "Prototype lifecycle completed. No production vehicle or workflow was changed.");
      return;
    }
    const nextStage = selectedStage + 1;
    setSelectedStage(nextStage);
    setNotice(embedded ? `Guided handoff passed. Previewing ${lifecycleStages[nextStage].label}; no operational record was changed.` : `Prototype handoff passed. Previewing ${lifecycleStages[nextStage].label}; no operational record was changed.`);
  }

  function resetPrototype() {
    setCompleted(new Set());
    setSelectedStage(0);
    setPrototypeVersion((current) => current + 1);
    setIgiProgress({ blockerCount: 0, findingsComplete: false, identityAndSafetyComplete: false, mechanicalComplete: false, readinessGateComplete: false, recommendation: "Hold", roadTestComplete: false, trailCount: 0 });
    setIiiProgress({ blockerCount: 0, canonicalComplete: false, custodyComplete: false, decodedComplete: false, objectiveComplete: false, readinessGateComplete: false, recommendation: "Hold", safetyComplete: false, trailCount: 0 });
    setIqiProgress({ blockerCount: 0, dispositionComplete: false, inspectionPackageComplete: false, readinessGateComplete: false, recommendation: "Hold", reviewComplete: false, trailCount: 0 });
    setRbiProgress({ arrivalFactsComplete: false, baselinePhotosComplete: false, blockerCount: 0, custodyAccepted: false, recommendation: "Hold", trailCount: 0, varianceControlled: false, vinComplete: false });
    setTaiProgress({ appraisalComplete: false, authorityComplete: false, commitmentComplete: false, economicsComplete: false, identityComplete: false, titleComplete: false });
    setTciProgress({ blockerCount: 0, deliveryComplete: false, movementComplete: false, pickupComplete: false, planComplete: false, recommendation: "Hold", releaseComplete: false, sourceComplete: false, trackingComplete: false, trailCount: 0 });
    setWopProgress({ assignmentComplete: false, authorizationComplete: false, blockerCount: 0, estimateComplete: false, jobsComplete: false, readinessComplete: false, recommendation: "Hold", sequencingComplete: false, trailCount: 0 });
    setRnrProgress({ acceptanceComplete: false, blockerCount: 0, changeApprovalComplete: false, completionProofComplete: false, diagnosisComplete: false, executionComplete: false, reconciliationComplete: false, recommendation: "Acknowledge job", trailCount: 0 });
    setFqcProgress({ blockerCount: 0, decisionComplete: false, diagnosisScanComplete: false, jobsVerifiedComplete: false, leaksAndWorkmanshipComplete: false, recommendation: "Verify jobs", roadTestComplete: false, safetyComplete: false, trailCount: 0 });
    setDtgProgress({ blockerCount: 0, exteriorComplete: false, interiorComplete: false, qcComplete: false, recommendation: "Confirm detail scope", scopeComplete: false, specialtyComplete: false, stageComplete: false, trailCount: 0 });
    setPmmProgress({ blockerCount: 0, complianceComplete: false, listingComplete: false, mediaComplete: false, pricingComplete: false, publicationComplete: false, recommendation: "Capture media", specsComplete: false, trailCount: 0 });
    setTlrProgress({ blockerCount: 0, brandLienComplete: false, custodyComplete: false, decisionComplete: false, identityComplete: false, odometerComplete: false, ownershipComplete: false, recommendation: "Match title identity", trailCount: 0 });
    setSlgProgress({ approvalsComplete: false, availabilityComplete: false, blockerCount: 0, engagementComplete: false, offerComplete: false, recommendation: "Confirm availability", reservationComplete: false, testDriveComplete: false, trailCount: 0 });
    setStlProgress({ blockerCount: 0, buyerComplete: false, figuresComplete: false, packetComplete: false, qcComplete: false, recommendation: "Verify buyer", signaturesComplete: false, submissionComplete: false, trailCount: 0 });
    setFlgProgress({ blockerCount: 0, fileAssemblyComplete: false, filingLockComplete: false, financialComplete: false, recommendation: "Assemble file", retentionComplete: false, signaturesComplete: false, trailCount: 0, versionComplete: false });
    setPslProgress({ blockerCount: 0, closureComplete: false, deliveryComplete: false, fundingComplete: false, recommendation: "Confirm delivery", titleComplete: false, trailCount: 0, warrantyComplete: false, weOweComplete: false });
    setNotice(embedded ? "Guided lifecycle reset to Acquisition. Operational records remain unchanged." : "Prototype reset to Acquisition. Operational records remain unchanged.");
  }

  return (
    <section className={styles.prototype} aria-label="Inventory Lifecycle prototype workspace">
      <header className={styles.prototypeBanner}>
        <div>
          <span><ShieldCheck size={16} />{embedded ? "Integrated lifecycle workspace" : "Official prototype workspace"}</span>
          <strong>{embedded ? "One Inventory Console lifecycle" : "Safe review environment"}</strong>
          <p>{embedded ? "Guided stage operations, evidence, handoffs, and history now live inside the Inventory Console." : "No production lifecycle, InventoryUnit, repair order, vehicle location, or evidence record is changed here."}</p>
        </div>
        <div className={styles.bannerActions}>
          <Link href={currentUnit.returnHref}>{embedded ? "Refresh Inventory Console" : "Return to real Inventory Lifecycle"}</Link>
          <button type="button" onClick={resetPrototype}><RotateCcw size={15} />{embedded ? "Reset guided lifecycle" : "Reset prototype"}</button>
        </div>
      </header>

      <section className={styles.vehicleHeader}>
        <div className={styles.vehicleIdentity}>
          <span className={styles.vehicleIcon}><CarFront /></span>
          <div>
            <small>Inventory unit {currentUnit.inventoryNumber} | Canonical {currentUnit.canonicalVehicleId}</small>
            <h1>{currentUnit.vehicleLabel}</h1>
            <p>VIN {currentUnit.vin}</p>
          </div>
        </div>
        <div className={styles.authoritativeState}>
          <span>{embedded ? "Guided lifecycle state" : "Prototype lifecycle state"}</span>
          <strong><i />{stage.label} | {selectedStageStatusLabel}</strong>
          <small>{embedded ? `Vehicle is previewing stage ${selectedStage + 1} of ${lifecycleStages.length}` : "One sample vehicle, one simulated journey"}</small>
        </div>
      </section>

      <dl className={styles.vehicleFacts}>
        <div><dt>Accountable owner</dt><dd>{currentUnit.accountableOwner}</dd></div>
        <div><dt>Current location</dt><dd><MapPin size={14} />{currentUnit.location}</dd></div>
        <div><dt>Custody</dt><dd>{currentUnit.custody}</dd></div>
        <div><dt>Target frontline</dt><dd>{currentUnit.targetFrontlineDate}</dd></div>
        <div><dt>Safety</dt><dd>{currentUnit.safetyState}</dd></div>
        <div><dt>Title</dt><dd>{currentUnit.titleState}</dd></div>
      </dl>

      <section className={styles.lifecycleRailSection} id="prototype-lifecycle-rail">
        <header><div><h2>Complete inventory lifecycle</h2><p>Select a stage to review its mandatory workflow.</p></div><strong>16 governed stages</strong></header>
        <nav className={styles.lifecycleRail} aria-label="Prototype lifecycle stages">
          {lifecycleStages.map((item, index) => (
            <button
              aria-pressed={selectedStage === index}
              className={selectedStage === index ? styles.activeStage : ""}
              key={item.label}
              onClick={() => { setSelectedStage(index); setNotice(`Previewing ${item.label}. Prototype progress is stored only in this screen.`); }}
              type="button"
            >
              <small>{String(index + 1).padStart(2, "0")}</small>
              <strong>{item.label}</strong>
            </button>
          ))}
        </nav>
      </section>

      <div className={styles.workspaceGrid}>
        <section className={styles.workflowPanel}>
          <header className={styles.workflowHeader}>
            <div><span>Stage {selectedStage + 1} of {lifecycleStages.length}</span><h2>{stage.title}</h2><p>{stage.purpose}</p></div>
            <strong>{stage.gate}</strong>
          </header>
          {selectedStage === 11 ? <TlrTitleReadinessTool key={`tlr-${prototypeVersion}`} onProgressChange={syncTlrProgress} onReturnToLifecycle={() => {
            document.getElementById("prototype-lifecycle-rail")?.scrollIntoView({ behavior: "smooth", block: "start" });
            setNotice("Returned to the lifecycle overview. Prototype progress is stored only in this screen.");
          }} /> : null}
          {selectedStage === 12 ? <SlgSellingTool key={`slg-${prototypeVersion}`} onProgressChange={syncSlgProgress} onReturnToLifecycle={() => {
            document.getElementById("prototype-lifecycle-rail")?.scrollIntoView({ behavior: "smooth", block: "start" });
            setNotice("Returned to the lifecycle overview. Prototype progress is stored only in this screen.");
          }} /> : null}
          {selectedStage === 13 ? <StlSaleTitlingTool key={`stl-${prototypeVersion}`} onProgressChange={syncStlProgress} onReturnToLifecycle={() => {
            document.getElementById("prototype-lifecycle-rail")?.scrollIntoView({ behavior: "smooth", block: "start" });
            setNotice("Returned to the lifecycle overview. Prototype progress is stored only in this screen.");
          }} /> : null}
          {selectedStage === 14 ? <FlgFilingTool key={`flg-${prototypeVersion}`} onProgressChange={syncFlgProgress} onReturnToLifecycle={() => {
            document.getElementById("prototype-lifecycle-rail")?.scrollIntoView({ behavior: "smooth", block: "start" });
            setNotice("Returned to the lifecycle overview. Prototype progress is stored only in this screen.");
          }} /> : null}
          {selectedStage === 15 ? <PslPostSaleTool key={`psl-${prototypeVersion}`} onProgressChange={syncPslProgress} onReturnToLifecycle={() => {
            document.getElementById("prototype-lifecycle-rail")?.scrollIntoView({ behavior: "smooth", block: "start" });
            setNotice("Returned to the lifecycle overview. Prototype progress is stored only in this screen.");
          }} /> : null}
          {selectedStage === 10 ? <PmmPhotosMarketingTool key={`pmm-${prototypeVersion}`} onProgressChange={syncPmmProgress} onReturnToLifecycle={() => {
            document.getElementById("prototype-lifecycle-rail")?.scrollIntoView({ behavior: "smooth", block: "start" });
            setNotice("Returned to the lifecycle overview. Prototype progress is stored only in this screen.");
          }} /> : null}
          {selectedStage === 9 ? <DtgDetailingTool key={`dtg-${prototypeVersion}`} onProgressChange={syncDtgProgress} /> : null}
          {selectedStage === 8 ? <FqcFinalQcTool key={`fqc-${prototypeVersion}`} onProgressChange={syncFqcProgress} /> : null}
          {selectedStage === 7 ? <RnrReconTool key={`rnr-${prototypeVersion}`} onProgressChange={syncRnrProgress} /> : null}
          {selectedStage === 6 ? <WopWorkOrderTool key={`wop-${prototypeVersion}`} onProgressChange={syncWopProgress} /> : null}
          {selectedStage === 5 ? <IqiQualityTool key={`iqi-${prototypeVersion}`} onProgressChange={syncIqiProgress} /> : null}
          {selectedStage === 4 ? <IgiInspectionTool key={`igi-${prototypeVersion}`} onOpenInitialQc={() => { setSelectedStage(5); setNotice("Previewing Initial QC. Prototype progress is stored only in this screen."); }} onProgressChange={syncIgiProgress} /> : null}
          {selectedStage === 3 ? <IiiIntakeTool key={`iii-${prototypeVersion}`} onProgressChange={syncIiiProgress} /> : null}
          {selectedStage === 2 ? <RbiReceivingTool key={`rbi-${prototypeVersion}`} onProgressChange={syncRbiProgress} /> : null}
          {selectedStage === 0 ? <TaiAcquisitionTool key={`tai-${prototypeVersion}`} onProgressChange={syncTaiProgress} /> : null}
          {selectedStage === 1 ? <TciTransportTool key={`tci-${prototypeVersion}`} onProgressChange={syncTciProgress} /> : null}
          <div className={styles.progressRow}>
            <strong>{completedCount} of {stage.tasks.length} required actions complete</strong>
            <div className={styles.progressTrack} aria-label={`${completedCount} of ${stage.tasks.length} actions complete`} role="progressbar" aria-valuemin={0} aria-valuemax={stage.tasks.length} aria-valuenow={completedCount}><i style={{ width: `${completedCount / stage.tasks.length * 100}%` }} /></div>
          </div>
          <div className={styles.actionHead}><span /><span>Required action and completion test</span><span>Owner</span><span>Evidence</span></div>
          <ol className={styles.actionList}>
            {stage.tasks.map((item, index) => {
              const checked = completed.has(completionKey(selectedStage, index));
              return <li className={checked ? styles.completedAction : ""} key={item.title}>
                <label><input checked={checked} disabled={selectedStage === 0 || selectedStage === 1 || selectedStage === 2 || selectedStage === 3 || selectedStage === 4 || selectedStage === 5 || selectedStage === 6 || selectedStage === 7 || selectedStage === 8 || selectedStage === 9 || selectedStage === 10 || selectedStage === 11 || selectedStage === 12 || selectedStage === 13 || selectedStage === 14 || selectedStage === 15} onChange={() => toggleAction(index)} type="checkbox" /><span className="sr-only">Complete {item.title}</span></label>
                <div><strong>{item.title}</strong><p>{item.completion}</p></div>
                <span>{item.owner}</span>
                <em>{checked ? <><Check size={13} />Complete</> : item.evidence}</em>
              </li>;
            })}
          </ol>
        </section>

        <aside className={styles.stageCommand}>
          <header><ClipboardCheck /><h2>Stage command</h2></header>
          <dl>
            <div><dt>Stage owner</dt><dd>{stage.owner}</dd></div>
            <div><dt>Stage deadline</dt><dd>{stage.deadline}</dd></div>
            <div><dt>Blocker policy</dt><dd>{stage.blockerPolicy}</dd></div>
          </dl>
          <header><LockKeyhole /><h2>Handoff control</h2></header>
          <div className={styles.taiGateSummary}><span>Lifecycle shell summary</span><strong>{currentSnapshot.status === "READY" ? "Ready for handoff" : currentSnapshot.status === "BLOCKED" ? "Blocked / exact action required" : currentSnapshot.recommendation}</strong><small>{currentUnit.inventoryNumber} · {rollups.handoffReady} ready handoff stage(s) · {rollups.blockedUnits} blocked stage(s)</small></div>
          <section className={styles.lifecycleEvidencePanel} aria-label="Shared lifecycle evidence packet">
            <header><ShieldCheck size={16} /><h2>Shared evidence packet</h2></header>
            <dl>
              <div><dt>Handoff target</dt><dd>{currentSnapshot.handoff.nextStageLabel}</dd></div>
              <div><dt>Readiness</dt><dd>{currentSnapshot.handoff.readinessLabel}</dd></div>
              <div><dt>Last update</dt><dd>{currentSnapshot.lastUpdatedLabel}</dd></div>
            </dl>
            <ol>
              {currentSnapshot.evidenceItems.slice(0, 4).map((item) => (
                <li className={item.state === "COMPLETE" ? styles.lifecycleEvidenceComplete : item.state === "BLOCKED" ? styles.lifecycleEvidenceBlocked : ""} key={`${item.actionTitle}-${item.evidenceLabel}`}>
                  <span>{item.evidenceLabel}</span>
                  <strong>{item.state === "COMPLETE" ? "Recorded" : item.state === "BLOCKED" ? "Needs owner" : "Pending"}</strong>
                </li>
              ))}
            </ol>
          </section>
          {selectedStage === 0 ? <div className={styles.taiGateSummary}><span>TAI acquisition gate</span><strong>{taiProgress.commitmentComplete ? "Purchase recorded" : taiProgress.authorityComplete ? "Approved / awaiting purchase" : taiProgress.economicsComplete ? "Evaluated / approval required" : "Evaluation required"}</strong><small>Checklist evidence is driven by the buyer workspace.</small></div> : null}
          {selectedStage === 1 ? <div className={styles.taiGateSummary}><span>TCI custody gate</span><strong>{tciProgress.deliveryComplete ? "Receiving accepted" : `${tciProgress.recommendation} / ${tciProgress.trailCount} trail entries`}</strong><small>Checklist evidence is driven by the transportation workspace.</small></div> : null}
          {selectedStage === 2 ? <div className={styles.taiGateSummary}><span>RBI receiving gate</span><strong>{rbiProgress.custodyAccepted ? "Ready for intake" : `${rbiProgress.recommendation} / ${rbiProgress.trailCount} trail entries`}</strong><small>Checklist evidence is driven by the receiving workspace.</small></div> : null}
          {selectedStage === 3 ? <div className={styles.taiGateSummary}><span>III intake gate</span><strong>{iiiProgress.readinessGateComplete ? "Ready for inspection" : `${iiiProgress.recommendation} / ${iiiProgress.trailCount} trail entries`}</strong><small>Checklist evidence is driven by the intake workspace.</small></div> : null}
          {selectedStage === 4 ? <div className={styles.taiGateSummary}><span>IGI inspection gate</span><strong>{igiProgress.readinessGateComplete ? "Ready for Initial QC" : `${igiProgress.recommendation} / ${igiProgress.trailCount} trail entries`}</strong><small>Checklist evidence is driven by the inspection workspace.</small></div> : null}
          {selectedStage === 5 ? <div className={styles.taiGateSummary}><span>IQI initial QC gate</span><strong>{iqiProgress.readinessGateComplete ? "Ready for recon planning" : `${iqiProgress.recommendation} / ${iqiProgress.trailCount} trail entries`}</strong><small>Checklist evidence is driven by the Initial QC workspace.</small></div> : null}
          {selectedStage === 6 ? <div className={styles.taiGateSummary}><span>WOP work-order gate</span><strong>{wopProgress.authorizationComplete ? "Ready for recon dispatch" : `${wopProgress.recommendation} / ${wopProgress.trailCount} trail entries`}</strong><small>Checklist evidence is driven by the work-order planning workspace.</small></div> : null}
          {selectedStage === 7 ? <div className={styles.taiGateSummary}><span>RNR execution gate</span><strong>{rnrProgress.reconciliationComplete ? "Ready for Final QC" : `${rnrProgress.recommendation} / ${rnrProgress.trailCount} trail entries`}</strong><small>Checklist evidence is driven by the Recon &amp; Repair execution workspace.</small></div> : null}
          {selectedStage === 8 ? <div className={styles.taiGateSummary}><span>FQC release gate</span><strong>{fqcProgress.decisionComplete ? "Ready for detailing" : `${fqcProgress.recommendation} / ${fqcProgress.trailCount} trail entries`}</strong><small>Checklist evidence is driven by the Final QC workspace.</small></div> : null}
          {selectedStage === 9 ? <div className={styles.taiGateSummary}><span>DTG presentation gate</span><strong>{dtgProgress.stageComplete ? "Ready for Photos & Marketing" : `${dtgProgress.recommendation} / ${dtgProgress.trailCount} trail entries`}</strong><small>Checklist evidence is driven by the detailing workspace.</small></div> : null}
          {selectedStage === 10 ? <div className={styles.taiGateSummary}><span>PMM merchandising gate</span><strong>{pmmProgress.publicationComplete ? "Ready for Title Readiness" : `${pmmProgress.recommendation} / ${pmmProgress.trailCount} trail entries`}</strong><small>Checklist evidence is driven by the Photos &amp; Marketing workspace.</small></div> : null}
          {selectedStage === 11 ? <div className={styles.taiGateSummary}><span>TLR legal gate</span><strong>{tlrProgress.decisionComplete ? "Ready for Selling" : `${tlrProgress.recommendation} / ${tlrProgress.trailCount} trail entries`}</strong><small>Checklist evidence is driven by the Title Readiness workspace.</small></div> : null}
          {selectedStage === 12 ? <div className={styles.taiGateSummary}><span>SLG commercial gate</span><strong>{slgProgress.reservationComplete ? "Ready for Sale Titling" : `${slgProgress.recommendation} / ${slgProgress.trailCount} trail entries`}</strong><small>Checklist evidence is driven by the Selling workspace.</small></div> : null}
          {selectedStage === 13 ? <div className={styles.taiGateSummary}><span>STL transfer gate</span><strong>{stlProgress.submissionComplete ? "Ready for Filing" : `${stlProgress.recommendation} / ${stlProgress.trailCount} trail entries`}</strong><small>Checklist evidence is driven by the Sale Titling workspace.</small></div> : null}
          {selectedStage === 14 ? <div className={styles.taiGateSummary}><span>FLG file gate</span><strong>{flgProgress.filingLockComplete ? "Ready for Post-Sale" : `${flgProgress.recommendation} / ${flgProgress.trailCount} trail entries`}</strong><small>Checklist evidence is driven by the Filing workspace.</small></div> : null}
          {selectedStage === 15 ? <div className={styles.taiGateSummary}><span>PSL outcome gate</span><strong>{pslProgress.closureComplete ? "Lifecycle complete" : `${pslProgress.recommendation} / ${pslProgress.trailCount} trail entries`}</strong><small>Checklist evidence is driven by the Post-Sale workspace.</small></div> : null}
          {selectedStage === 3 ? <div className={styles.stageQuickLinkWrap}><Link className={styles.stageQuickLink} href={withLifecycleReturnTo("/vehicles/workflows/add-vehicle", currentUnit.inventoryUnitId, selectedStage)}>Open Vehicle Intake form</Link></div> : null}
          {selectedStage === 4 ? <div className={styles.stageQuickLinkWrap}><button className={styles.stageQuickActionButton} onClick={() => { setSelectedStage(5); setNotice("Previewing Initial QC. Prototype progress is stored only in this screen."); }} type="button">Open Initial QC form</button></div> : null}
          {selectedStage === 5 ? <div className={styles.stageQuickLinkWrap}><Link className={styles.stageQuickLink} href={withLifecycleReturnTo("/vehicles/quality-control", currentUnit.inventoryUnitId, selectedStage)}>Open live QC workspace</Link></div> : null}
          {selectedStage === 6 ? <div className={styles.stageQuickLinkWrap}><Link className={styles.stageQuickLink} href={withLifecycleReturnTo("/vehicles/repair-workbench?view=all", currentUnit.inventoryUnitId, selectedStage)}>Open Repair Workbench</Link></div> : null}
          {selectedStage === 7 ? <div className={styles.stageQuickLinkWrap}><Link className={styles.stageQuickLink} href={withLifecycleReturnTo("/vehicles/shop-recon", currentUnit.inventoryUnitId, selectedStage)}>Open live Shop &amp; Recon workspace</Link></div> : null}
          {selectedStage === 8 ? <div className={styles.stageQuickLinkWrap}><Link className={styles.stageQuickLink} href={withLifecycleReturnTo("/vehicles/quality-control", currentUnit.inventoryUnitId, selectedStage)}>Open live Final QC workspace</Link></div> : null}
          {selectedStage === 9 ? <div className={styles.stageQuickLinkWrap}><button className={styles.stageQuickActionButton} onClick={() => { setSelectedStage(10); setNotice("Previewing Photos & Marketing. Prototype progress is stored only in this screen."); }} type="button">Preview Photos &amp; Marketing handoff</button></div> : null}
          {selectedStage === 10 ? <div className={styles.stageQuickLinkWrap}><button className={styles.stageQuickActionButton} onClick={() => { setSelectedStage(11); setNotice("Previewing Title Readiness. Prototype progress is stored only in this screen."); }} type="button">Preview Title Readiness handoff</button></div> : null}
          {selectedStage === 11 ? <div className={styles.stageQuickLinkWrap}><button className={styles.stageQuickActionButton} onClick={() => { setSelectedStage(12); setNotice("Previewing Selling. Prototype progress is stored only in this screen."); }} type="button">Preview Selling handoff</button></div> : null}
          {selectedStage === 12 ? <div className={styles.stageQuickLinkWrap}><button className={styles.stageQuickActionButton} onClick={() => { setSelectedStage(13); setNotice("Previewing Sale Titling. Prototype progress is stored only in this screen."); }} type="button">Preview Sale Titling handoff</button></div> : null}
          {selectedStage === 13 ? <div className={styles.stageQuickLinkWrap}><button className={styles.stageQuickActionButton} onClick={() => { setSelectedStage(14); setNotice("Previewing Filing. Prototype progress is stored only in this screen."); }} type="button">Preview Filing handoff</button></div> : null}
          {selectedStage === 14 ? <div className={styles.stageQuickLinkWrap}><button className={styles.stageQuickActionButton} onClick={() => { setSelectedStage(15); setNotice("Previewing Post-Sale. Prototype progress is stored only in this screen."); }} type="button">Preview Post-Sale handoff</button></div> : null}
          <ul>
            <li><span>Mandatory actions</span><strong>{completedCount}/{stage.tasks.length}</strong></li>
            <li><span>Evidence attached</span><strong>{ready ? "Complete" : "Pending"}</strong></li>
            <li><span>Open blockers</span><strong>{selectedStage === 1 ? tciProgress.blockerCount : selectedStage === 2 ? rbiProgress.blockerCount : selectedStage === 3 ? iiiProgress.blockerCount : selectedStage === 4 ? igiProgress.blockerCount : selectedStage === 5 ? iqiProgress.blockerCount : selectedStage === 6 ? wopProgress.blockerCount : selectedStage === 7 ? rnrProgress.blockerCount : selectedStage === 8 ? fqcProgress.blockerCount : selectedStage === 9 ? dtgProgress.blockerCount : selectedStage === 10 ? pmmProgress.blockerCount : selectedStage === 11 ? tlrProgress.blockerCount : selectedStage === 12 ? slgProgress.blockerCount : selectedStage === 13 ? stlProgress.blockerCount : selectedStage === 14 ? flgProgress.blockerCount : selectedStage === 15 ? pslProgress.blockerCount : 0}</strong></li>
            <li><span>Ready for next stage</span><strong>{ready ? "Yes" : "No"}</strong></li>
          </ul>
          <div className={styles.stageQuickLinkWrap}><Link className={styles.stageQuickLink} href={lifecycleReturnHref}>Open exact lifecycle link</Link></div>
          <button disabled={!ready} onClick={simulateHandoff} type="button">{stage.actionLabel}<ArrowRight /></button>
          <p className={ready ? styles.readyNote : ""}>{ready ? `All prototype controls passed. ${selectedStage === lifecycleStages.length - 1 ? "Lifecycle closure is ready for review." : "You may simulate the handoff."}` : "Complete every required action before handoff becomes available."}</p>
          <header><CircleAlert /><h2>Vehicle lifecycle history</h2></header>
          <ul>
            {lifecycleHistory.length ? lifecycleHistory.slice(0, 6).map((entry) => <li key={`${entry.stageIndex}-${entry.status}-${entry.trailCount}`}><span>{String(entry.stageIndex + 1).padStart(2, "0")} · {entry.stageLabel}</span><strong>{entry.description}</strong>{entry.evidenceLabels.length ? <small>{entry.evidenceLabels.join(" · ")}</small> : null}</li>) : <li><span>No lifecycle history yet</span><strong>Stage work trail will appear here as teams document actions.</strong></li>}
          </ul>
        </aside>
      </div>

      <footer className={styles.prototypeNotice} aria-live="polite"><CircleAlert />{notice}</footer>
    </section>
  );
}
