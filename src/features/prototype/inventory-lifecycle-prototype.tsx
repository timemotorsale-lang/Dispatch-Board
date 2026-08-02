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

import styles from "./inventory-lifecycle-prototype.module.css";
import { DtgDetailingTool, type DtgWorkflowProgress } from "./dtg-detailing-tool";
import { FqcFinalQcTool, type FqcWorkflowProgress } from "./fqc-final-qc-tool";
import { IgiInspectionTool, type IgiWorkflowProgress } from "./igi-inspection-tool";
import { IiiIntakeTool, type IiiWorkflowProgress } from "./iii-intake-tool";
import { IqiQualityTool, type IqiWorkflowProgress } from "./iqi-quality-tool";
import { PmmPhotosMarketingTool, type PmmWorkflowProgress } from "./pmm-photos-marketing-tool";
import { RbiReceivingTool, type RbiWorkflowProgress } from "./rbi-receiving-tool";
import { RnrReconTool, type RnrWorkflowProgress } from "./rnr-recon-tool";
import { SlgSellingTool, type SlgWorkflowProgress } from "./slg-selling-tool";
import { StlSaleTitlingTool, type StlWorkflowProgress } from "./stl-sale-titling-tool";
import { TaiAcquisitionTool, type TaiWorkflowProgress } from "./tai-acquisition-tool";
import { TciTransportTool, type TciWorkflowProgress } from "./tci-transport-tool";
import { TlrTitleReadinessTool, type TlrWorkflowProgress } from "./tlr-title-readiness-tool";
import { WopWorkOrderTool, type WopWorkflowProgress } from "./wop-work-order-tool";

type StageAction = {
  completion: string;
  evidence: string;
  owner: string;
  title: string;
};

type LifecycleStage = {
  actionLabel: string;
  blockerPolicy: string;
  deadline: string;
  gate: string;
  label: string;
  owner: string;
  purpose: string;
  tasks: StageAction[];
  title: string;
};

const action = (title: string, completion: string, owner: string, evidence: string): StageAction => ({
  completion,
  evidence,
  owner,
  title,
});

const lifecycleStages: LifecycleStage[] = [
  {
    label: "Acquisition",
    title: "Authorize the acquisition and establish ownership",
    purpose: "Make the commercial decision, preserve its exact evidence, and create one governed inventory unit.",
    gate: "Authority required",
    owner: "Acquisition manager",
    deadline: "Before any transport release",
    blockerPolicy: "Missing identity, title, economics, or authority keeps the vehicle outside inventory.",
    actionLabel: "Simulate acquisition handoff",
    tasks: [
      action("Validate vehicle and seller identity", "VIN, seller authority, source listing, disclosures, and duplicate review agree.", "Buyer", "Identity proof"),
      action("Complete condition and market appraisal", "Condition, market comparables, expected retail, and days-to-sell are documented.", "Appraiser", "Appraisal"),
      action("Model total acquisition exposure", "Purchase, fees, transport, title risk, recon, and margin meet policy.", "Appraiser", "Economics"),
      action("Review title and ownership risk", "Title status, lien, brand, odometer, and reassignment risks are classified.", "Title clerk", "Title review"),
      action("Obtain purchase authority", "The authorized approver accepts this appraisal version and purchase ceiling.", "Manager", "Approval"),
      action("Record commitment and create the unit", "Terms, funding, owner, stock record, and exactly one InventoryUnit are established.", "Buyer", "Commitment"),
    ],
  },
  {
    label: "Transportation",
    title: "Move the vehicle into accountable custody",
    purpose: "Control drivability, pickup, movement, location, condition, exceptions, and delivery from source to receiving.",
    gate: "Custody proof required",
    owner: "Logistics coordinator",
    deadline: "Delivery target plus escalation SLA",
    blockerPolicy: "Release, tow, carrier, delay, damage, or routing exceptions remain assigned until resolved.",
    actionLabel: "Simulate transportation handoff",
    tasks: [
      action("Establish where the vehicle is currently", "Auction source and exact current location are confirmed before dispatch begins.", "Transportation", "Source confirmation"),
      action("Confirm gate pass and auction release", "Gate pass, release desk coordination, paperwork, and auction-held keys are ready.", "Transportation", "Release readiness"),
      action("Coordinate driver movement to the auction", "Driver, Uber support, tow, or carrier plan, destination, cost, and ETA are approved.", "Transportation", "Driver coordination"),
      action("Decide whether to drive or tow and complete pre-trip checks", "Drive or tow decision, oil, coolant, plate reminder, and jumper reminder are complete.", "Driver", "Movement readiness"),
      action("Capture pickup custody and departure", "Pickup contact, odometer, signatures, and departure proof are recorded; auction photos are recommended when TMS staff drive.", "Driver", "Pickup proof"),
      action("Prove delivery and receiving acceptance", "Arrival, keys, location, and custody transfer are accepted so receiving can create the photo baseline.", "Receiver", "Delivery proof"),
    ],
  },
  {
    label: "Receiving",
    title: "Receive the vehicle and establish its physical baseline",
    purpose: "Record exactly what arrived before inspection, repair, cleaning, or movement changes the vehicle.",
    gate: "Baseline evidence required",
    owner: "Receiving coordinator",
    deadline: "Within 30 minutes of arrival",
    blockerPolicy: "Identity mismatch or disputed custody creates a receiving hold.",
    actionLabel: "Simulate receiving handoff",
    tasks: [
      action("Scan and match the VIN", "The physical VIN matches acquisition, transport, and canonical records.", "Receiver", "VIN scan"),
      action("Record arrival facts", "Time, odometer, exact location, fuel or charge, keys, documents, and releasing party are complete.", "Receiver", "Arrival record"),
      action("Capture the baseline photo set", "VIN, dash, four corners, interior, engine, cargo, wheels, and damage are visible.", "Receiver", "Photo set"),
      action("Compare pickup and arrival condition", "New damage, missing equipment, and mileage variances are identified.", "Receiver", "Condition comparison"),
      action("Accept accountable custody", "Custodian, location history, keys, documents, and physical control are acknowledged.", "Receiver", "Custody acceptance"),
      action("Resolve or assign exceptions", "Every discrepancy has an owner, severity, due date, and next action.", "Receiving lead", "Exception case"),
    ],
  },
  {
    label: "Intake",
    title: "Complete the canonical inventory intake",
    purpose: "Carry existing facts forward, add operational context once, and release a clean record to inspection.",
    gate: "Canonical identity required",
    owner: "Inventory coordinator",
    deadline: "Same shift as receiving",
    blockerPolicy: "Duplicates, missing InventoryUnit, ownership, or identity issues are resolved in place.",
    actionLabel: "Simulate intake handoff",
    tasks: [
      action("Confirm canonical vehicle linkage", "Vehicle 360, VIN, InventoryUnit, stock number, and source record are linked.", "Coordinator", "Canonical link"),
      action("Validate decoded vehicle facts", "Year, make, model, trim, body, drivetrain, engine, and factory facts are reviewed.", "Coordinator", "Decode snapshot"),
      action("Review safety intelligence", "Recall campaigns, VIN verification, warnings, and guidance are classified.", "Advisor", "Safety review"),
      action("Record the inventory objective", "Retail path, priority, target frontline date, and requested evaluation are clear.", "Coordinator", "Intake scope"),
      action("Confirm location, custody, and ownership", "Current site or outside facility, custodian, keys, and owner are current.", "Coordinator", "Custody facts"),
      action("Run the intake readiness gate", "Every minimum field and exception needed for inspection is complete.", "Inventory lead", "Readiness check"),
    ],
  },
  {
    label: "Inspection",
    title: "Perform the complete evidence-backed inspection",
    purpose: "Turn the vehicle baseline into structured safety, mechanical, cosmetic, and merchandising findings.",
    gate: "Inspection completeness",
    owner: "Certified inspector",
    deadline: "Within the assigned inspection slot",
    blockerPolicy: "Unsafe-to-move findings immediately stop movement and create a safety hold.",
    actionLabel: "Simulate inspection handoff",
    tasks: [
      action("Perform identity and safety pre-check", "VIN, warnings, recalls, restraints, tires, brakes, steering, and mobility risks are checked.", "Inspector", "Safety check"),
      action("Complete mechanical and bodywork inspection", "Powertrain, fluids, cooling, charging, suspension, exhaust, HVAC, leaks, body panels, paint, dents, scratches, rust, and repair quality are evaluated.", "Inspector", "Mechanical and bodywork checklist"),
      action("Complete diagnostic scan", "Modules, codes, monitors, freeze frames, and warning lights are preserved.", "Technician", "Scan report"),
      action("Perform a qualified road test", "Noise, vibration, braking, steering, drivability, and ADAS behavior are documented when safe.", "Inspector", "Road test"),
      action("Inspect cosmetic, bodywork, and equipment condition", "Body, prior repair quality, glass, wheels, cabin, options, keys, and merchandising readiness are graded.", "Inspector", "Condition report"),
      action("Publish structured findings", "Each finding has severity, evidence, recommendation, labor, parts, vendor, and disclosure path.", "Inspector", "Finding set"),
    ],
  },
  {
    label: "Initial QC",
    title: "Independently approve the baseline and recon scope",
    purpose: "Verify inspection quality and decide the governed disposition of every finding.",
    gate: "Independent QC approval",
    owner: "QC reviewer",
    deadline: "Before any work order is released",
    blockerPolicy: "Failed evidence returns only the affected item to inspection with a correction request.",
    actionLabel: "Simulate initial QC handoff",
    tasks: [
      action("Audit inspection completeness", "Every applicable system and required evidence item is present.", "QC reviewer", "Completeness audit"),
      action("Validate safety classification", "Mobility, recall, restraint, brake, tire, and warning findings use the correct severity.", "QC reviewer", "Safety decision"),
      action("Validate measurements and evidence", "Photos, scans, readings, road test, and notes support each finding.", "QC reviewer", "Evidence review"),
      action("Disposition every finding", "Repair, diagnose, vendor, detail, disclose, defer, or N/A is selected with rationale.", "QC reviewer", "Disposition set"),
      action("Approve the initial recon scope", "Accepted work aligns with retail standard, policy, economics, and target date.", "QC lead", "Scope approval"),
      action("Release the controlled handoff", "The inspection version is locked and approved findings move to planning.", "QC lead", "QC release"),
    ],
  },
  {
    label: "Work Order",
    title: "Build the authorized recon execution plan",
    purpose: "Convert accepted findings into sequenced, costed, assigned, and readiness-gated jobs.",
    gate: "Plan and budget approval",
    owner: "Recon planner",
    deadline: "Before technician or vendor dispatch",
    blockerPolicy: "Over-limit cost or missing authority routes to the exact approver without losing the plan.",
    actionLabel: "Simulate work-order handoff",
    tasks: [
      action("Create jobs from accepted findings", "Every approved finding belongs to a controlled diagnostic, repair, vendor, or detail job.", "Planner", "Job map"),
      action("Estimate labor and parts", "Labor, rates, parts, fees, tax, sublet, and contingency are versioned.", "Estimator", "Estimate"),
      action("Sequence dependencies", "Diagnosis, teardown, parts, vendor, calibration, detail, and QC order is explicit.", "Planner", "Dependency plan"),
      action("Assign work and targets", "Technician, bay, vendor, priority, completion target, and escalation owner are assigned.", "Dispatcher", "Assignments"),
      action("Secure parts and outside capacity", "Availability, ETA, reservations, transport, and outside custody are confirmed.", "Parts lead", "Readiness proof"),
      action("Authorize the exact plan version", "The budget holder approves the exact scope, total, and exceptions.", "Manager", "Authorization"),
    ],
  },
  {
    label: "Recon & Repair",
    title: "Execute approved recon work in readiness order",
    purpose: "Keep staff focused on executable work while preserving all diagnosis, cost, parts, vendor, and evidence history.",
    gate: "Job completion evidence",
    owner: "Recon team lead",
    deadline: "Per job target and frontline date",
    blockerPolicy: "Approval, part, bay, vendor, diagnosis, or rework blockers remain visible with one owner.",
    actionLabel: "Simulate recon handoff",
    tasks: [
      action("Acknowledge the next ready job", "The technician or vendor accepts scope, vehicle, bay, and target.", "Technician", "Job acceptance"),
      action("Complete required diagnosis", "Tests, root cause, safety relevance, and revised recommendation are documented.", "Technician", "Diagnosis"),
      action("Obtain change authorization", "Added work or cost is versioned and approved before execution.", "Advisor", "Change approval"),
      action("Perform repair or recon work", "Approved procedure, parts, labor, outside service, and calibration are complete.", "Technician", "Work record"),
      action("Prove job completion", "Before/after evidence, measurements, scan, test, and sign-off are attached.", "Technician", "Completion proof"),
      action("Reconcile execution dependencies", "Parts, returns, sublet custody, labor, costs, and concerns are reconciled.", "Team lead", "Reconciliation"),
    ],
  },
  {
    label: "Final QC",
    title: "Independently validate repair, safety, and readiness",
    purpose: "Prove that completed work corrected the accepted scope before presentation preparation.",
    gate: "Independent final approval",
    owner: "Final QC inspector",
    deadline: "Before detailing release",
    blockerPolicy: "A failed item returns to its exact job through a controlled rework loop.",
    actionLabel: "Simulate final QC handoff",
    tasks: [
      action("Verify every completed job", "Scope, parts, workmanship, torque, fluid, fit, and evidence match authorization.", "QC inspector", "Job verification"),
      action("Complete the final diagnostic scan", "Codes, monitors, warning indicators, resets, and calibrations are verified.", "QC inspector", "Final scan"),
      action("Perform the final road test", "Safety, drivability, noise, braking, steering, ADAS, and repair outcomes pass.", "QC inspector", "Road test"),
      action("Inspect leaks and workmanship", "Fluids, fasteners, routing, cleanliness, damage, and comeback risks are checked.", "QC inspector", "Workmanship check"),
      action("Resolve safety and recall controls", "No open safety hold remains; verification or disclosure is recorded.", "QC lead", "Safety release"),
      action("Issue the independent QC decision", "Pass, rework, disclose, or hold is recorded against the exact work version.", "QC lead", "Final approval"),
    ],
  },
  {
    label: "Detailing",
    title: "Prepare the vehicle to the retail presentation standard",
    purpose: "Create a consistent, photo-ready vehicle while preserving disclosed condition.",
    gate: "Presentation standard",
    owner: "Detail team lead",
    deadline: "Before the media appointment",
    blockerPolicy: "Damage beyond detail scope returns to an approved repair or disclosure decision.",
    actionLabel: "Simulate detailing handoff",
    tasks: [
      action("Confirm detail scope and condition", "Approved services, disclosures, materials, keys, and location are verified.", "Detail lead", "Detail scope"),
      action("Complete exterior preparation", "Wash, decontamination, finish, glass, wheels, tires, trim, and jambs meet standard.", "Detailer", "Exterior checklist"),
      action("Complete interior preparation", "Vacuum, extraction, surfaces, glass, vents, cargo, odor, and equipment meet standard.", "Detailer", "Interior checklist"),
      action("Complete specialty work", "Approved engine bay, pet hair, stain, odor, decal, or specialty work is finished.", "Detailer", "Specialty record"),
      action("Perform detail quality check", "No residue, missed area, new damage, wet surface, odor, or presentation defect remains.", "Detail lead", "Detail QC"),
      action("Stage for photography", "Fuel or charge, keys, location, and media appointment are ready.", "Detail lead", "Media handoff"),
    ],
  },
  {
    label: "Photos & Marketing",
    title: "Create and approve the retail merchandising package",
    purpose: "Publish an accurate visual and written representation sourced from verified vehicle facts.",
    gate: "Media and compliance approval",
    owner: "Merchandising manager",
    deadline: "Same day as detail completion",
    blockerPolicy: "Missing media, title hold, safety issue, disclosure, or price prevents publication.",
    actionLabel: "Simulate media handoff",
    tasks: [
      action("Capture the required media set", "Exterior, interior, feature, VIN, dash, cargo, wheels, defects, and disclosure photos pass.", "Photographer", "Photo set"),
      action("Verify canonical specifications", "Decoded facts and observed equipment are reconciled without duplicate entry.", "Merchandiser", "Spec review"),
      action("Write accurate listing content", "Condition, features, value story, warranty, and disclosures are supportable.", "Merchandiser", "Listing copy"),
      action("Set governed pricing inputs", "Market data, cost, recon, strategy, floor, and approval are versioned.", "Manager", "Pricing approval"),
      action("Complete compliance review", "Claims, photos, disclosures, privacy, and channel requirements are approved.", "Compliance", "Media review"),
      action("Publish and verify channels", "Website, marketplace, DMS, and internal status show the correct package.", "Merchandiser", "Publication proof"),
    ],
  },
  {
    label: "Title Readiness",
    title: "Establish legal readiness to offer and transfer",
    purpose: "Confirm the dealership can lawfully sell and later transfer this specific vehicle.",
    gate: "Title control",
    owner: "Inventory title specialist",
    deadline: "Before sale finalization",
    blockerPolicy: "A title hold blocks sale completion and names the exact missing correction.",
    actionLabel: "Simulate title-readiness handoff",
    tasks: [
      action("Match title identity", "VIN, owner, seller, year, make, odometer, and jurisdiction match source records.", "Title specialist", "Identity match"),
      action("Verify ownership chain", "Assignments, powers of attorney, bills of sale, and reassignments are complete.", "Title specialist", "Chain review"),
      action("Clear lien and brand status", "Lien release, electronic title, brand, duplicate, salvage, and correction needs are resolved.", "Title specialist", "Lien and brand proof"),
      action("Verify odometer compliance", "Mileage status and required disclosure are accurate.", "Title specialist", "Odometer record"),
      action("Confirm title location and control", "Title location, custodian, received date, and exception owner are current.", "Title specialist", "Custody record"),
      action("Issue the sale-readiness decision", "Title ready, conditional disclosure, or governed hold is approved.", "Title manager", "Readiness release"),
    ],
  },
  {
    label: "Selling",
    title: "Manage the governed retail sale process",
    purpose: "Move a frontline-ready vehicle through presentation, negotiation, and accepted terms.",
    gate: "Commercial authority",
    owner: "Sales manager",
    deadline: "Through accepted buyer agreement",
    blockerPolicy: "Availability, pricing, finance, title, or disclosure conflict pauses contracting.",
    actionLabel: "Simulate selling handoff",
    tasks: [
      action("Confirm frontline availability", "Vehicle, keys, location, price, disclosures, media, and test-drive readiness are current.", "Sales coordinator", "Availability"),
      action("Manage customer engagement", "Inquiry, appointment, demonstration, and follow-up are linked to this vehicle.", "Sales advisor", "Activity log"),
      action("Control test-drive custody", "Identity, insurance, route, time out, condition, and return are documented.", "Sales advisor", "Test-drive record"),
      action("Version the offer", "Price, trade, taxes, fees, finance, products, and conditions are preserved.", "Sales advisor", "Offer version"),
      action("Complete disclosures and approvals", "Required vehicle, condition, warranty, recall, and manager approvals are acknowledged.", "Sales manager", "Sale approval"),
      action("Accept and reserve the vehicle", "Buyer, exact terms, deposit, expiration, and contracting handoff are recorded.", "Sales manager", "Accepted terms"),
    ],
  },
  {
    label: "Sale Titling",
    title: "Complete buyer titling and ownership transfer",
    purpose: "Turn accepted terms into an accurate, compliant, and submitted transfer package.",
    gate: "Exact-document review",
    owner: "Customer title specialist",
    deadline: "Jurisdiction filing deadline",
    blockerPolicy: "Field, signature, payment, identity, or document defects prevent submission.",
    actionLabel: "Simulate transfer handoff",
    tasks: [
      action("Verify buyer and jurisdiction", "Legal names, address, identity, insurance, entity, and jurisdiction are confirmed.", "Title specialist", "Buyer verification"),
      action("Prepare transfer documents", "Assignment, registration, tax, odometer, lienholder, plates, and disclosures are generated.", "Title specialist", "Transfer packet"),
      action("Reconcile financial figures", "Price, trade, payoff, tax, fees, funding, and title amounts match the contract.", "Deal clerk", "Figure audit"),
      action("Obtain required signatures", "Buyer, co-buyer, dealer, lienholder, notary, and POA execution is complete.", "Title specialist", "Signed packet"),
      action("Perform exact-document QC", "VIN, names, dates, amounts, brands, mileage, and attachments pass review.", "Title reviewer", "Document QC"),
      action("Submit and record accountability", "Method, confirmation, expected completion, owner, and follow-up are recorded.", "Title specialist", "Submission proof"),
    ],
  },
  {
    label: "Filing",
    title: "Complete the authoritative deal and compliance file",
    purpose: "Create a reconciled, indexed, retained, and audit-ready record of the full vehicle journey.",
    gate: "File completeness",
    owner: "Deal file coordinator",
    deadline: "Policy retention and close deadline",
    blockerPolicy: "The file stays open with an exact missing-document owner and due date.",
    actionLabel: "Simulate filing handoff",
    tasks: [
      action("Assemble the complete record", "Acquisition, transport, inventory, recon, title, sale, payment, and transfer records are present.", "File coordinator", "Document index"),
      action("Reconcile authoritative versions", "Final appraisal, work order, estimate, contract, title, and disclosure versions agree.", "Auditor", "Version audit"),
      action("Verify signatures and approvals", "Every required signature, authority, acknowledgement, and exception is valid.", "Auditor", "Approval audit"),
      action("Reconcile money and inventory", "Purchase, recon, sale, funding, payoff, receipts, and disposition balance.", "Accounting", "Financial reconcile"),
      action("Classify and retain records", "Privacy, title, tax, safety, repair, and deal records receive correct controls.", "File coordinator", "Retention record"),
      action("Lock the completed file", "Completeness passes while correction and audit procedures remain governed.", "Compliance", "File closure"),
    ],
  },
  {
    label: "Post-Sale",
    title: "Verify delivery and close every post-sale obligation",
    purpose: "Finish customer, title, financial, warranty, delivery, and operational commitments.",
    gate: "Outcome verification",
    owner: "Post-sale coordinator",
    deadline: "Until all obligations are closed",
    blockerPolicy: "Only unresolved obligations remain open, each with owner, due date, and escalation.",
    actionLabel: "Simulate lifecycle closure",
    tasks: [
      action("Confirm delivery completion", "Vehicle, keys, documents, condition, orientation, and acceptance are recorded.", "Delivery specialist", "Delivery proof"),
      action("Close promises and due bills", "Accessories, repairs, we-owe items, appointments, and commitments are complete.", "Coordinator", "Promise closure"),
      action("Verify funding and payoff", "Funding, stipulations, trade payoff, refunds, reserves, and exceptions are reconciled.", "Finance", "Funding proof"),
      action("Track title and registration", "Submission, lien perfection, plates, registration, corrections, and updates reach completion.", "Title specialist", "Title completion"),
      action("Manage warranty and concerns", "Comeback, warranty, complaint, satisfaction, and recovery work remain linked.", "Customer care", "Case record"),
      action("Verify the lifecycle outcome", "Every obligation is closed or governed by an active case; final status is recorded.", "Operations manager", "Closure approval"),
    ],
  },
];

function completionKey(stageIndex: number, actionIndex: number) {
  return `${stageIndex}:${actionIndex}`;
}

export function InventoryLifecyclePrototype() {
  const [selectedStage, setSelectedStage] = useState(0);
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
  const [notice, setNotice] = useState("This workspace is isolated. Prototype actions do not update operational records.");
  const stage = lifecycleStages[selectedStage];
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

  function toggleAction(actionIndex: number) {
    if (selectedStage === 0 || selectedStage === 1 || selectedStage === 2 || selectedStage === 3 || selectedStage === 4 || selectedStage === 5 || selectedStage === 6 || selectedStage === 7 || selectedStage === 8 || selectedStage === 9 || selectedStage === 10 || selectedStage === 11 || selectedStage === 12 || selectedStage === 13) {
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
                                : "Sale Titling actions are controlled by the STL workspace, including buyer verification, transfer packet preparation, figure audit, signatures, exact-document QC, and submission proof.");
      return;
    }
    const key = completionKey(selectedStage, actionIndex);
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setNotice("Prototype progress updated locally. No operational record was changed.");
  }

  function simulateHandoff() {
    if (!ready) return;
    if (selectedStage === lifecycleStages.length - 1) {
      setNotice("Prototype lifecycle completed. No production vehicle or workflow was changed.");
      return;
    }
    const nextStage = selectedStage + 1;
    setSelectedStage(nextStage);
    setNotice(`Prototype handoff passed. Previewing ${lifecycleStages[nextStage].label}; no operational record was changed.`);
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
    setNotice("Prototype reset to Acquisition. Operational records remain unchanged.");
  }

  return (
    <section className={styles.prototype} aria-label="Inventory Lifecycle prototype workspace">
      <header className={styles.prototypeBanner}>
        <div>
          <span><ShieldCheck size={16} />Official prototype workspace</span>
          <strong>Safe review environment</strong>
          <p>No production lifecycle, InventoryUnit, repair order, vehicle location, or evidence record is changed here.</p>
        </div>
        <div className={styles.bannerActions}>
          <Link href="/vehicles/inventory">Return to real Inventory Lifecycle</Link>
          <button type="button" onClick={resetPrototype}><RotateCcw size={15} />Reset prototype</button>
        </div>
      </header>

      <section className={styles.vehicleHeader}>
        <div className={styles.vehicleIdentity}>
          <span className={styles.vehicleIcon}><CarFront /></span>
          <div>
            <small>Inventory unit 333586 | Canonical VEH-436ED525</small>
            <h1>2024 Toyota RAV4 XLE</h1>
            <p>VIN 2T3W1RFVXRW333586 | Silver | 53,421 miles</p>
          </div>
        </div>
        <div className={styles.authoritativeState}>
          <span>Prototype lifecycle state</span>
          <strong><i />{stage.label} | Active</strong>
          <small>One sample vehicle, one simulated journey</small>
        </div>
      </section>

      <dl className={styles.vehicleFacts}>
        <div><dt>Accountable owner</dt><dd>Alex Carter</dd></div>
        <div><dt>Current location</dt><dd><MapPin size={14} />Minneapolis recon staging</dd></div>
        <div><dt>Custody</dt><dd>Accepted | 2 keys</dd></div>
        <div><dt>Target frontline</dt><dd>August 5, 2026</dd></div>
        <div><dt>Safety</dt><dd>VIN verification pending</dd></div>
        <div><dt>Title</dt><dd>Source documents received</dd></div>
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
          {selectedStage === 11 ? <TlrTitleReadinessTool key={`tlr-${prototypeVersion}`} onProgressChange={syncTlrProgress} /> : null}
          {selectedStage === 12 ? <SlgSellingTool key={`slg-${prototypeVersion}`} onProgressChange={syncSlgProgress} onReturnToLifecycle={() => {
            document.getElementById("prototype-lifecycle-rail")?.scrollIntoView({ behavior: "smooth", block: "start" });
            setNotice("Returned to the lifecycle overview. Prototype progress is stored only in this screen.");
          }} /> : null}
          {selectedStage === 13 ? <StlSaleTitlingTool key={`stl-${prototypeVersion}`} onProgressChange={syncStlProgress} onReturnToLifecycle={() => {
            document.getElementById("prototype-lifecycle-rail")?.scrollIntoView({ behavior: "smooth", block: "start" });
            setNotice("Returned to the lifecycle overview. Prototype progress is stored only in this screen.");
          }} /> : null}
          {selectedStage === 10 ? <PmmPhotosMarketingTool key={`pmm-${prototypeVersion}`} onProgressChange={syncPmmProgress} /> : null}
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
                <label><input checked={checked} disabled={selectedStage === 0 || selectedStage === 1 || selectedStage === 2 || selectedStage === 3 || selectedStage === 4 || selectedStage === 5 || selectedStage === 6 || selectedStage === 7 || selectedStage === 8 || selectedStage === 9 || selectedStage === 10 || selectedStage === 11 || selectedStage === 12 || selectedStage === 13} onChange={() => toggleAction(index)} type="checkbox" /><span className="sr-only">Complete {item.title}</span></label>
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
          {selectedStage === 3 ? <div className={styles.stageQuickLinkWrap}><Link className={styles.stageQuickLink} href="/vehicles/workflows/add-vehicle?returnTo=%2Fvehicles%2Finventory%2Fprototype">Open Vehicle Intake form</Link></div> : null}
          {selectedStage === 4 ? <div className={styles.stageQuickLinkWrap}><button className={styles.stageQuickActionButton} onClick={() => { setSelectedStage(5); setNotice("Previewing Initial QC. Prototype progress is stored only in this screen."); }} type="button">Open Initial QC form</button></div> : null}
          {selectedStage === 5 ? <div className={styles.stageQuickLinkWrap}><Link className={styles.stageQuickLink} href="/vehicles/quality-control?returnTo=%2Fvehicles%2Finventory%2Fprototype">Open live QC workspace</Link></div> : null}
          {selectedStage === 6 ? <div className={styles.stageQuickLinkWrap}><Link className={styles.stageQuickLink} href="/vehicles/repair-workbench?view=all">Open Repair Workbench</Link></div> : null}
          {selectedStage === 7 ? <div className={styles.stageQuickLinkWrap}><Link className={styles.stageQuickLink} href="/vehicles/shop-recon?returnTo=%2Fvehicles%2Finventory%2Fprototype">Open live Shop &amp; Recon workspace</Link></div> : null}
          {selectedStage === 8 ? <div className={styles.stageQuickLinkWrap}><Link className={styles.stageQuickLink} href="/vehicles/quality-control?returnTo=%2Fvehicles%2Finventory%2Fprototype">Open live Final QC workspace</Link></div> : null}
          {selectedStage === 9 ? <div className={styles.stageQuickLinkWrap}><button className={styles.stageQuickActionButton} onClick={() => { setSelectedStage(10); setNotice("Previewing Photos & Marketing. Prototype progress is stored only in this screen."); }} type="button">Preview Photos &amp; Marketing handoff</button></div> : null}
          {selectedStage === 10 ? <div className={styles.stageQuickLinkWrap}><button className={styles.stageQuickActionButton} onClick={() => { setSelectedStage(11); setNotice("Previewing Title Readiness. Prototype progress is stored only in this screen."); }} type="button">Preview Title Readiness handoff</button></div> : null}
          {selectedStage === 11 ? <div className={styles.stageQuickLinkWrap}><button className={styles.stageQuickActionButton} onClick={() => { setSelectedStage(12); setNotice("Previewing Selling. Prototype progress is stored only in this screen."); }} type="button">Preview Selling handoff</button></div> : null}
          {selectedStage === 12 ? <div className={styles.stageQuickLinkWrap}><button className={styles.stageQuickActionButton} onClick={() => { setSelectedStage(13); setNotice("Previewing Sale Titling. Prototype progress is stored only in this screen."); }} type="button">Preview Sale Titling handoff</button></div> : null}
          {selectedStage === 13 ? <div className={styles.stageQuickLinkWrap}><button className={styles.stageQuickActionButton} onClick={() => { setSelectedStage(14); setNotice("Previewing Filing. Prototype progress is stored only in this screen."); }} type="button">Preview Filing handoff</button></div> : null}
          <ul>
            <li><span>Mandatory actions</span><strong>{completedCount}/{stage.tasks.length}</strong></li>
            <li><span>Evidence attached</span><strong>{ready ? "Complete" : "Pending"}</strong></li>
            <li><span>Open blockers</span><strong>{selectedStage === 1 ? tciProgress.blockerCount : selectedStage === 2 ? rbiProgress.blockerCount : selectedStage === 3 ? iiiProgress.blockerCount : selectedStage === 4 ? igiProgress.blockerCount : selectedStage === 5 ? iqiProgress.blockerCount : selectedStage === 6 ? wopProgress.blockerCount : selectedStage === 7 ? rnrProgress.blockerCount : selectedStage === 8 ? fqcProgress.blockerCount : selectedStage === 9 ? dtgProgress.blockerCount : selectedStage === 10 ? pmmProgress.blockerCount : selectedStage === 11 ? tlrProgress.blockerCount : selectedStage === 12 ? slgProgress.blockerCount : selectedStage === 13 ? stlProgress.blockerCount : 0}</strong></li>
            <li><span>Ready for next stage</span><strong>{ready ? "Yes" : "No"}</strong></li>
          </ul>
          <button disabled={!ready} onClick={simulateHandoff} type="button">{stage.actionLabel}<ArrowRight /></button>
          <p className={ready ? styles.readyNote : ""}>{ready ? "All prototype controls passed. You may simulate the handoff." : "Complete every required action before handoff becomes available."}</p>
        </aside>
      </div>

      <footer className={styles.prototypeNotice} aria-live="polite"><CircleAlert />{notice}</footer>
    </section>
  );
}
