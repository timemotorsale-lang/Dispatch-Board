"use client";

import { ArrowRight, BadgeCheck, Calculator, CarFront, Check, CircleAlert, FileText, Gauge, Link as LinkIcon, LockKeyhole, Search, ShieldCheck, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import styles from "./inventory-lifecycle-prototype.module.css";
import { PrototypeVinScanCard, type PrototypeVinScanEvidence } from "./prototype-vin-scan-card";
import { evaluateTaiAcquisition, type TaiAcquisitionInput } from "./tai-acquisition-rules";

export type TaiWorkflowProgress = {
  appraisalComplete: boolean;
  authorityComplete: boolean;
  commitmentComplete: boolean;
  economicsComplete: boolean;
  identityComplete: boolean;
  titleComplete: boolean;
};

type OpportunityDraft = {
  askingPrice: number;
  askingPriceStatus: "Provided" | "Seller refused" | "Staff must make first offer" | "Trade appraisal needed" | "Unknown";
  decodedBody: string;
  decodedEngine: string;
  decodedLabel: string;
  decodedTrim: string;
  duplicateStatus: "Unchecked" | "Clear" | "Review existing record";
  intelligenceNotes: string[];
  localMarketRetail: number;
  marketValue: number;
  marketValueDate: string;
  marketValueSource: "Manheim MMR" | "KBB" | "CarGurus" | "AutoTrader" | "Dealer estimate" | "Manual manager entry" | "Unknown";
  marketDaysSupply: number;
  missingItems: string[];
  nationalMarketRetail: number;
  odometer: string;
  retailAdjustment: number;
  retailConfidence: TaiAcquisitionInput["retailConfidence"];
  retailRangeHigh: number;
  retailRangeLow: number;
  vehicleIntelligence: VehicleIntelligenceProfile;
  seller: string;
  source: "Unknown" | "Auction" | "Trade" | "Marketplace" | "Customer Offer" | "Dealer Wholesale";
  sourceLink: string;
  sourceReference: string;
  status: "Draft" | "Researching" | "Ready for TAI" | "Buy candidate" | "Pass candidate";
  systemRetail: number;
  vin: string;
};

type VehicleIntelligenceProfile = {
  commonIssues: string[];
  inspectionFocus: string[];
  marketPerformance: "Fast seller" | "Average seller" | "Price-sensitive" | "Slow seller";
  recommendationNote: string;
  reliabilityRisk: TaiAcquisitionInput["reliabilityRisk"];
  resaleVelocity: "Fast turn" | "Normal turn" | "Slow turn";
};

const initialInput: TaiAcquisitionInput = {
  acquisitionFees: 675,
  comparablesReviewed: true,
  conditionInspected: true,
  conditionRisk: 2,
  demandStrength: 5,
  expectedRetail: 31995,
  holdingReserve: 495,
  identityVerified: true,
  inventoryNeed: 4,
  marketPosition: 4,
  marketValue: 25800,
  proposedPurchase: 23400,
  proposedPurchaseKnown: true,
  recon: 1650,
  reliabilityRisk: "Low",
  retailConfidence: "High",
  retailRangeHigh: 32900,
  retailRangeLow: 30600,
  riskReserve: 500,
  sellerAuthorityVerified: true,
  targetGross: 3250,
  titleAndDocs: 300,
  titleReviewed: true,
  transport: 525,
};

const initialOpportunity: OpportunityDraft = {
  askingPrice: 23400,
  askingPriceStatus: "Provided",
  decodedBody: "SUV / multipurpose passenger vehicle",
  decodedEngine: "2.5L I4 · automatic · FWD/AWD family",
  decodedLabel: "2024 Toyota RAV4",
  decodedTrim: "XLE / LE family",
  duplicateStatus: "Unchecked",
  intelligenceNotes: ["Strong local SUV demand", "Prototype retail comps support frontline pricing", "Compact SUV recon profile applied"],
  localMarketRetail: 31995,
  marketValue: 25800,
  marketValueDate: "2026-08-06",
  marketValueSource: "Manheim MMR",
  marketDaysSupply: 31,
  missingItems: [],
  nationalMarketRetail: 31200,
  odometer: "18,420",
  retailAdjustment: 795,
  retailConfidence: "High",
  retailRangeHigh: 32900,
  retailRangeLow: 30600,
  vehicleIntelligence: {
    commonIssues: ["Hybrid battery/cooling checks on hybrid trims", "AWD driveline noise check", "Normal compact SUV wear items"],
    inspectionFocus: ["Confirm trim/options", "Scan for AWD and safety-system faults", "Inspect tires, brakes, and underbody"],
    marketPerformance: "Fast seller",
    recommendationNote: "Compact SUV demand is strong; buy if recon stays controlled.",
    reliabilityRisk: "Low",
    resaleVelocity: "Fast turn",
  },
  seller: "Manheim Minneapolis",
  source: "Auction",
  sourceLink: "https://example.com/source-listing",
  sourceReference: "Lane B · Run 124",
  status: "Draft",
  systemRetail: 31995,
  vin: "2T3W1RFVXRW333586",
};

const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const ratingLabels = ["", "Weak", "Limited", "Balanced", "Strong", "Excellent"];
const defaultExpectedVin = "2T3W1RFVXRW333586";
const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
const askingPriceStatuses: OpportunityDraft["askingPriceStatus"][] = ["Provided", "Seller refused", "Staff must make first offer", "Trade appraisal needed", "Unknown"];
const marketValueSources: OpportunityDraft["marketValueSource"][] = ["Manheim MMR", "KBB", "CarGurus", "AutoTrader", "Dealer estimate", "Manual manager entry", "Unknown"];
const prototypeMarket = "Minneapolis / 150-mile retail market";

function decodeOpportunityVin(vin: string) {
  const normalized = vin.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!vinPattern.test(normalized)) return null;
  if (normalized.startsWith("2T3")) return { body: "SUV / multipurpose passenger vehicle", engine: "2.5L I4 · automatic · FWD/AWD family", label: "2024 Toyota RAV4", trim: "XLE / LE family" };
  if (normalized.startsWith("1F")) return { body: "Truck / light-duty pickup", engine: "EcoBoost or V8 family · automatic", label: "Ford F-Series opportunity", trim: "Trim pending full decode" };
  if (normalized.startsWith("1HG") || normalized.startsWith("JHM")) return { body: "Sedan", engine: "Gasoline I4 family · automatic/CVT", label: "Honda opportunity", trim: "Trim pending full decode" };
  if (normalized.startsWith("JM1")) return { body: "Sedan / hatchback", engine: "Gasoline I4 family", label: "Mazda opportunity", trim: "Trim pending full decode" };
  return { body: "Decoded body pending provider detail", engine: "Powertrain pending provider detail", label: "Decoded VIN opportunity", trim: "Trim pending full decode" };
}

function enhanceOpportunityDecode(vin: string, decoded: NonNullable<ReturnType<typeof decodeOpportunityVin>>) {
  const normalized = vin.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (normalized.startsWith("1HGCV") || normalized.startsWith("JHMCV")) return { body: "Sedan", engine: "1.5L turbo I4 family - CVT", label: `${decodeVinYear(normalized)} Honda Accord`, trim: "LX / Sport family - confirm trim" };
  return decoded;
}

function decodeVinYear(vin: string) {
  const yearCodes: Record<string, number> = { E: 2014, F: 2015, G: 2016, H: 2017, J: 2018, K: 2019, L: 2020, M: 2021, N: 2022, P: 2023, R: 2024, S: 2025, T: 2026 };
  return yearCodes[vin.charAt(9)] ?? new Date().getFullYear();
}

function parseMileage(value: string) {
  return Number(value.replace(/[^0-9]/g, "")) || 0;
}

function roundToHundred(value: number) {
  return Math.max(0, Math.round(value / 100) * 100);
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function buildVehicleIntelligence(decoded: NonNullable<ReturnType<typeof decodeOpportunityVin>>): VehicleIntelligenceProfile {
  const label = decoded.label.toLowerCase();
  const body = decoded.body.toLowerCase();
  const trim = decoded.trim.toLowerCase();
  if (label.includes("accord")) return {
    commonIssues: ["1.5T oil dilution / drivability watch", "CVT operation must be verified", "A/C condenser and infotainment complaints are common checks"],
    inspectionFocus: ["Cold-start scan and road test", "Verify turbo/CVT behavior", "Confirm trim and accident/title history"],
    marketPerformance: "Average seller",
    recommendationNote: "Accord demand is good, but reliability/recon risk should tighten the ceiling.",
    reliabilityRisk: "Elevated",
    resaleVelocity: "Normal turn",
  };
  if (body.includes("suv") || body.includes("multipurpose")) return {
    commonIssues: ["Normal compact SUV brakes/tires wear", "AWD system/noise check when equipped", "Safety sensor calibration after prior damage"],
    inspectionFocus: ["Confirm trim/options", "Inspect tires, brakes, and suspension", "Scan safety/ADAS modules"],
    marketPerformance: "Fast seller",
    recommendationNote: "SUV demand supports buying if recon stays controlled.",
    reliabilityRisk: "Low",
    resaleVelocity: "Fast turn",
  };
  if (body.includes("truck")) return {
    commonIssues: ["Turbo/V8 maintenance history matters", "4x4 engagement and driveline noise", "Rust/tow-use exposure"],
    inspectionFocus: ["Frame/rust inspection", "4x4 and transmission road test", "Check tow package and tires"],
    marketPerformance: "Fast seller",
    recommendationNote: "Truck demand is strong, but repair exposure requires higher reserve.",
    reliabilityRisk: "Moderate",
    resaleVelocity: "Fast turn",
  };
  if (label.includes("mazda")) return {
    commonIssues: ["Rust and suspension wear on older units", "Infotainment/electrical checks", "Engine mount and brake wear"],
    inspectionFocus: ["Undercarriage/rust review", "Road test suspension noise", "Confirm maintenance history"],
    marketPerformance: "Price-sensitive",
    recommendationNote: "Buy only with disciplined recon and price control.",
    reliabilityRisk: "Moderate",
    resaleVelocity: "Normal turn",
  };
  if (trim.includes("pending") || trim.includes("confirm")) return {
    commonIssues: ["Exact trim/options not confirmed", "Known issue profile is incomplete", "Use conservative recon until inspection"],
    inspectionFocus: ["Confirm trim from window sticker/photos", "Run history/title check", "Complete pre-buy inspection"],
    marketPerformance: "Price-sensitive",
    recommendationNote: "Hold final authority until trim and issue profile are confirmed.",
    reliabilityRisk: "Elevated",
    resaleVelocity: "Normal turn",
  };
  return {
    commonIssues: ["No specific prototype issue profile found", "Use conservative condition review", "Require manager review if data remains thin"],
    inspectionFocus: ["Confirm exact vehicle facts", "Complete pre-buy inspection", "Review local comps"],
    marketPerformance: "Slow seller",
    recommendationNote: "Prototype intelligence is thin; do not overpay without stronger evidence.",
    reliabilityRisk: "High",
    resaleVelocity: "Slow turn",
  };
}

function prototypeAppraiseOpportunity(opportunity: OpportunityDraft, decoded: NonNullable<ReturnType<typeof decodeOpportunityVin>>) {
  const mileage = parseMileage(opportunity.odometer);
  const vehicleIntelligence = buildVehicleIntelligence(decoded);
  const isSuv = decoded.body.toLowerCase().includes("suv") || decoded.body.toLowerCase().includes("multipurpose");
  const isTruck = decoded.body.toLowerCase().includes("truck");
  const isHondaAccord = decoded.label.toLowerCase().includes("accord");
  const isGeneric = decoded.label.toLowerCase().includes("opportunity") || decoded.trim.toLowerCase().includes("pending") || decoded.trim.toLowerCase().includes("confirm");
  const marketValue = opportunity.marketValue > 0 ? opportunity.marketValue : isSuv ? 25800 : isTruck ? 28500 : isHondaAccord ? 14200 : 12500;
  const wholesaleToRetail = isSuv ? 1.24 : isTruck ? 1.31 : isHondaAccord ? 1.38 : 1.32;
  const mileageAdjustment = mileage > 0 ? clampNumber((60000 - mileage) / 1000 * 65, -2800, 1800) : -350;
  const nationalMarketRetail = roundToHundred(marketValue * wholesaleToRetail + mileageAdjustment);
  const localDemandAdjustment = isSuv ? 800 : isTruck ? 1100 : isHondaAccord ? 500 : 0;
  const localMarketRetail = roundToHundred(nationalMarketRetail + localDemandAdjustment);
  const retailSpread = Math.max(800, Math.round(localMarketRetail * (isGeneric ? 0.07 : 0.04)));
  const retailConfidence: TaiAcquisitionInput["retailConfidence"] = isGeneric ? "Low" : opportunity.marketValue > 0 && mileage > 0 ? "High" : "Medium";
  const marketDaysSupply = isSuv ? 31 : isTruck ? 27 : isHondaAccord ? 38 : 52;
  const reliabilityReserve = vehicleIntelligence.reliabilityRisk === "High" ? 1000 : vehicleIntelligence.reliabilityRisk === "Elevated" ? 650 : vehicleIntelligence.reliabilityRisk === "Moderate" ? 350 : 0;
  const missingItems = [
    ...(isGeneric ? ["Confirm exact trim/options"] : []),
    ...(opportunity.marketValue <= 0 ? ["MMR or wholesale value not provided; prototype estimate used"] : []),
    ...(mileage <= 0 ? ["Mileage missing; retail confidence reduced"] : []),
    ...(opportunity.askingPriceStatus === "Provided" && opportunity.askingPrice <= 0 ? ["Seller asking price is marked provided but amount is missing"] : []),
  ];
  return {
    acquisitionFees: opportunity.source === "Auction" ? 675 : opportunity.source === "Dealer Wholesale" ? 450 : 225,
    demandStrength: marketDaysSupply <= 35 ? 5 : marketDaysSupply <= 45 ? 4 : 3,
    expectedRetail: localMarketRetail,
    holdingReserve: isTruck ? 650 : 495,
    intelligenceNotes: [
      `Expected retail generated from ${prototypeMarket}`,
      `Local market is ${money(Math.abs(localDemandAdjustment))} ${localDemandAdjustment >= 0 ? "stronger" : "weaker"} than national baseline for this profile`,
      `Market days supply estimate: ${marketDaysSupply} days`,
      isGeneric ? "Trim needs confirmation before final authority" : "Trim confidence supports prototype valuation",
      vehicleIntelligence.recommendationNote,
    ],
    inventoryNeed: isSuv || isTruck ? 5 : 4,
    localMarketRetail,
    marketDaysSupply,
    marketPosition: localDemandAdjustment > 0 ? 4 : 3,
    marketValue,
    missingItems,
    nationalMarketRetail,
    recon: (isSuv ? 1650 : isTruck ? 2200 : isHondaAccord ? 1450 : 1750) + reliabilityReserve,
    retailAdjustment: localMarketRetail - nationalMarketRetail,
    retailConfidence,
    retailRangeHigh: roundToHundred(localMarketRetail + retailSpread),
    retailRangeLow: roundToHundred(localMarketRetail - retailSpread),
    riskReserve: (retailConfidence === "Low" ? 900 : 500) + reliabilityReserve,
    targetGross: localMarketRetail >= 25000 ? 3250 : 2500,
    titleAndDocs: 300,
    transport: opportunity.source === "Auction" ? 525 : opportunity.source === "Dealer Wholesale" ? 350 : 0,
    vehicleIntelligence,
  };
}

function cleanOpportunityEconomics(current: TaiAcquisitionInput): TaiAcquisitionInput {
  return {
    ...current,
    acquisitionFees: 0,
    expectedRetail: 0,
    holdingReserve: 0,
    marketValue: 0,
    proposedPurchase: 0,
    proposedPurchaseKnown: false,
    recon: 0,
    retailConfidence: "Low",
    retailRangeHigh: 0,
    retailRangeLow: 0,
    riskReserve: 0,
    targetGross: 0,
    titleAndDocs: 0,
    transport: 0,
  };
}

function buildSelectedVehicleOpportunity(vehicle: { label: string; vin: string }): OpportunityDraft {
  return {
    ...initialOpportunity,
    askingPrice: 0,
    askingPriceStatus: "Unknown",
    decodedBody: "Run Decode + Value",
    decodedEngine: "Run Decode + Value",
    decodedLabel: vehicle.label,
    decodedTrim: "Not decoded",
    duplicateStatus: "Unchecked",
    intelligenceNotes: [],
    localMarketRetail: 0,
    marketValue: 0,
    marketValueDate: "",
    marketValueSource: "Unknown",
    marketDaysSupply: 0,
    missingItems: ["Run Decode + Value for the selected vehicle"],
    nationalMarketRetail: 0,
    odometer: "",
    retailAdjustment: 0,
    retailConfidence: "Low",
    retailRangeHigh: 0,
    retailRangeLow: 0,
    seller: "",
    source: "Unknown",
    sourceLink: "",
    sourceReference: "",
    status: "Draft",
    systemRetail: 0,
    vehicleIntelligence: buildVehicleIntelligence({ body: "Unknown", engine: "Unknown", label: vehicle.label, trim: "Not decoded" }),
    vin: vehicle.vin,
  };
}

function buildSelectedVehicleInput(): TaiAcquisitionInput {
  return {
    ...cleanOpportunityEconomics(initialInput),
    comparablesReviewed: false,
    conditionInspected: false,
    conditionRisk: 3,
    demandStrength: 3,
    inventoryNeed: 3,
    marketPosition: 3,
    sellerAuthorityVerified: false,
    titleReviewed: false,
  };
}

export function TaiAcquisitionTool({ onProgressChange, onQuickComplete, selectedVehicle }: { onProgressChange: (progress: TaiWorkflowProgress) => void; onQuickComplete?: () => void; selectedVehicle?: { label: string; vin: string } }) {
  const [input, setInput] = useState(() => selectedVehicle ? buildSelectedVehicleInput() : initialInput);
  const [opportunity, setOpportunity] = useState<OpportunityDraft>(() => selectedVehicle ? buildSelectedVehicleOpportunity(selectedVehicle) : initialOpportunity);
  const [evaluationVersion, setEvaluationVersion] = useState(0);
  const [approval, setApproval] = useState<"DRAFT" | "REQUESTED" | "APPROVED">("DRAFT");
  const [finalPrice, setFinalPrice] = useState(selectedVehicle ? 0 : 24300);
  const [committed, setCommitted] = useState(false);
  const [vinEvidence, setVinEvidence] = useState<PrototypeVinScanEvidence | null>(null);
  const [quickSource, setQuickSource] = useState("");
  const [quickPurchasePrice, setQuickPurchasePrice] = useState("");
  const [quickConfirmed, setQuickConfirmed] = useState(false);
  const [quickCompleted, setQuickCompleted] = useState(false);
  const [notice, setNotice] = useState(selectedVehicle ? `Review ${selectedVehicle.label} and run Decode + Value before evaluation.` : "Review the sample opportunity and run the first TAI evaluation.");
  const result = useMemo(() => evaluateTaiAcquisition(input), [input]);
  const evaluated = evaluationVersion > 0;
  const eligibleForApproval = evaluated && result.blockers.length === 0 && !["Pass", "Watch", "Hold"].includes(result.recommendation);
  const finalPriceEligible = finalPrice > 0 && finalPrice <= result.purchaseCeiling;
  const opportunityReady = opportunity.status === "Ready for TAI" || opportunity.status === "Buy candidate" || opportunity.status === "Pass candidate";
  const quickReady = Boolean(quickSource && Number(quickPurchasePrice) > 0 && quickConfirmed);

  useEffect(() => {
    if (quickCompleted) {
      onProgressChange({ appraisalComplete: true, authorityComplete: true, commitmentComplete: true, economicsComplete: true, identityComplete: true, titleComplete: true });
      return;
    }
    onProgressChange({
      appraisalComplete: evaluated && input.conditionInspected && input.comparablesReviewed,
      authorityComplete: approval === "APPROVED",
      commitmentComplete: committed,
      economicsComplete: evaluated,
      identityComplete: input.identityVerified && input.sellerAuthorityVerified && Boolean(opportunity.seller.trim() && opportunity.sourceReference.trim()),
      titleComplete: input.titleReviewed,
    });
  }, [approval, committed, evaluated, input.comparablesReviewed, input.conditionInspected, input.identityVerified, input.sellerAuthorityVerified, input.titleReviewed, onProgressChange, opportunity.seller, opportunity.sourceReference, quickCompleted]);

  function completeQuickAcquisition() {
    if (!quickReady) return;
    setQuickCompleted(true);
    onProgressChange({ appraisalComplete: true, authorityComplete: true, commitmentComplete: true, economicsComplete: true, identityComplete: true, titleComplete: true });
    setNotice(`Acquisition completed for ${selectedVehicle?.label ?? "the selected vehicle"} at ${money(Number(quickPurchasePrice))}. Opening Transportation.`);
    onQuickComplete?.();
  }

  function updateNumber(field: keyof TaiAcquisitionInput, value: string) {
    setInput((current) => ({ ...current, [field]: Number(value) || 0 }));
    setEvaluationVersion(0);
    setApproval("DRAFT");
    setCommitted(false);
    setNotice("Inputs changed. Run a new TAI evaluation before requesting authority.");
  }

  function updateEvidence(field: keyof TaiAcquisitionInput, checked: boolean) {
    setInput((current) => ({ ...current, [field]: checked }));
    setEvaluationVersion(0);
    setApproval("DRAFT");
    setCommitted(false);
    setNotice("Evidence changed. Run a new TAI evaluation before requesting authority.");
  }

  function updateOpportunity<K extends keyof OpportunityDraft>(field: K, value: OpportunityDraft[K]) {
    const priceKnown = field === "askingPriceStatus" ? value === "Provided" : opportunity.askingPriceStatus === "Provided";
    setOpportunity((current) => ({
      ...current,
      ...(field === "vin" ? {
        askingPrice: 0,
        decodedBody: "Pending decode",
        decodedEngine: "Pending decode",
        decodedLabel: "New opportunity",
        decodedTrim: "Pending decode",
        duplicateStatus: "Unchecked" as const,
        intelligenceNotes: [],
        localMarketRetail: 0,
        marketValue: 0,
        marketDaysSupply: 0,
        missingItems: ["Run Decode + Value to generate prototype appraisal"],
        nationalMarketRetail: 0,
        retailAdjustment: 0,
        retailConfidence: "Low" as const,
        retailRangeHigh: 0,
        retailRangeLow: 0,
        systemRetail: 0,
        vehicleIntelligence: buildVehicleIntelligence({ body: "Unknown", engine: "Unknown", label: "Unknown opportunity", trim: "Trim pending full decode" }),
      } : null),
      [field]: value,
      ...(field === "askingPriceStatus" && value !== "Provided" ? { askingPrice: 0 } : null),
      status: field === "status" ? value as OpportunityDraft["status"] : "Researching",
    }));
    setEvaluationVersion(0);
    setApproval("DRAFT");
    setCommitted(false);
    if (field === "vin") {
      setInput((current) => cleanOpportunityEconomics(current));
      setNotice("New VIN entered. Prior acquisition economics were cleared so this opportunity starts with clean deal math.");
      return;
    }
    if (field === "askingPriceStatus") {
      setInput((current) => ({ ...current, proposedPurchase: value === "Provided" ? opportunity.askingPrice : 0, proposedPurchaseKnown: value === "Provided" }));
      setNotice(value === "Provided" ? "Asking price enabled. Enter the seller number before running TAI." : "Asking price is not available. TAI will create an offer strategy instead of using an old proposed purchase.");
      return;
    }
    if (field === "askingPrice") setInput((current) => ({ ...current, proposedPurchase: priceKnown ? Number(value) || 0 : 0, proposedPurchaseKnown: priceKnown }));
    if (field === "marketValue") setInput((current) => ({ ...current, marketValue: Number(value) || 0 }));
    setNotice("Opportunity packet changed. Decode/research it before relying on the TAI evaluation.");
  }

  function decodeAndResearchOpportunity() {
    const decoded = decodeOpportunityVin(opportunity.vin);
    if (!decoded) {
      setOpportunity((current) => ({ ...current, duplicateStatus: "Unchecked", status: "Researching" }));
      setInput((current) => ({ ...current, identityVerified: false }));
      setNotice("VIN must be a valid 17-character VIN before this opportunity can clear identity research.");
      return;
    }
    const duplicateStatus = opportunity.vin.endsWith("333586") ? "Review existing record" : "Clear";
    const priceKnown = opportunity.askingPriceStatus === "Provided";
    const enhancedDecode = enhanceOpportunityDecode(opportunity.vin, decoded);
    const appraisal = prototypeAppraiseOpportunity(opportunity, enhancedDecode);
    setOpportunity((current) => ({
      ...current,
      decodedBody: enhancedDecode.body,
      decodedEngine: enhancedDecode.engine,
      decodedLabel: enhancedDecode.label,
      decodedTrim: enhancedDecode.trim,
      duplicateStatus,
      intelligenceNotes: appraisal.intelligenceNotes,
      localMarketRetail: appraisal.localMarketRetail,
      marketDaysSupply: appraisal.marketDaysSupply,
      marketValue: appraisal.marketValue,
      missingItems: appraisal.missingItems,
      nationalMarketRetail: appraisal.nationalMarketRetail,
      retailAdjustment: appraisal.retailAdjustment,
      retailConfidence: appraisal.retailConfidence,
      retailRangeHigh: appraisal.retailRangeHigh,
      retailRangeLow: appraisal.retailRangeLow,
      status: duplicateStatus === "Clear" && appraisal.missingItems.length === 0 ? "Ready for TAI" : "Researching",
      systemRetail: appraisal.expectedRetail,
      vehicleIntelligence: appraisal.vehicleIntelligence,
    }));
    setInput((current) => ({
      ...current,
      acquisitionFees: appraisal.acquisitionFees,
      comparablesReviewed: appraisal.retailConfidence !== "Low",
      demandStrength: appraisal.demandStrength,
      expectedRetail: appraisal.expectedRetail,
      holdingReserve: appraisal.holdingReserve,
      identityVerified: duplicateStatus === "Clear",
      inventoryNeed: appraisal.inventoryNeed,
      marketPosition: appraisal.marketPosition,
      marketValue: appraisal.marketValue,
      proposedPurchase: priceKnown ? opportunity.askingPrice : 0,
      proposedPurchaseKnown: priceKnown,
      recon: appraisal.recon,
      reliabilityRisk: appraisal.vehicleIntelligence.reliabilityRisk,
      retailConfidence: appraisal.retailConfidence,
      retailRangeHigh: appraisal.retailRangeHigh,
      retailRangeLow: appraisal.retailRangeLow,
      riskReserve: appraisal.riskReserve,
      targetGross: appraisal.targetGross,
      titleAndDocs: appraisal.titleAndDocs,
      transport: appraisal.transport,
    }));
    setEvaluationVersion(0);
    setApproval("DRAFT");
    setCommitted(false);
    setNotice(duplicateStatus === "Clear" ? `Decode + Value complete. Expected retail generated at ${money(appraisal.expectedRetail)} from local and national prototype market logic.` : "Opportunity decoded, but a possible existing record was found. Review before purchase authority.");
  }

  function applyVinEvidence(evidence: PrototypeVinScanEvidence) {
    setVinEvidence(evidence);
    setInput((current) => ({ ...current, identityVerified: evidence.vinCaptured && evidence.vinMatched }));
    setEvaluationVersion(0);
    setApproval("DRAFT");
    setCommitted(false);
    setNotice(
      evidence.vinCaptured
        ? `${evidence.mode} processed. ${evidence.vinMatched ? "VIN matched the acquisition unit" : "Review the scanned VIN before approval."}${evidence.auctionLocation ? ` Source recognized: ${evidence.auctionLocation}.` : ""}`
        : "No VIN was captured from the provided scan text.",
    );
  }

  function runEvaluation() {
    setEvaluationVersion((current) => current + 1);
    setApproval("DRAFT");
    setCommitted(false);
    setNotice(result.blockers.length ? `TAI found ${result.blockers.length} blocker${result.blockers.length === 1 ? "" : "s"}. Resolve them before authorization.` : `TAI evaluation complete. ${result.explanation}`);
  }

  function requestApproval() {
    if (!eligibleForApproval) return;
    setApproval("REQUESTED");
    setNotice(`Manager review requested for TAI evaluation v${evaluationVersion} and a ${money(result.purchaseCeiling)} ceiling.`);
  }

  function approve() {
    if (approval !== "REQUESTED") return;
    setApproval("APPROVED");
    setNotice(`Acquisition manager approved evaluation v${evaluationVersion} up to ${money(result.purchaseCeiling)}. Record the purchase outcome next.`);
  }

  function recordPurchase() {
    if (approval !== "APPROVED" || !finalPriceEligible) return;
    setCommitted(true);
    setNotice(`Purchase commitment recorded at ${money(finalPrice)}. The Acquisition handoff gate is now ready.`);
  }

  return <section className={styles.taiWorkspace} id="opportunity-builder" aria-label="TMS Acquisition Intelligence buyer tool">
    <header className={styles.taiHeader}>
      <div><span><TrendingUp size={15} />TMS Acquisition Intelligence</span><h3>TAI buyer decision workspace</h3><p>Calculate a disciplined purchase ceiling before ownership begins.</p></div>
      <div className={styles.taiVersion}><small>Evaluation</small><strong>{evaluated ? `v${evaluationVersion} · ${approval.toLowerCase()}` : "Draft · not evaluated"}</strong></div>
    </header>

    {selectedVehicle ? <section className={styles.quickAcquisition} aria-label="Quick acquisition">
      <header><div><span>Recommended fast path</span><h4>Complete Acquisition</h4><p>Three items, one confirmation, then Transportation opens automatically.</p></div><strong>{quickCompleted ? "Complete" : "About 30 seconds"}</strong></header>
      <div className={styles.quickAcquisitionFields}>
        <label><span>How was it acquired?</span><select onChange={(event) => setQuickSource(event.target.value)} value={quickSource}><option value="">Choose source</option><option>Auction</option><option>Trade</option><option>Customer purchase</option><option>Dealer wholesale</option><option>Other</option></select></label>
        <label><span>Final purchase / trade value</span><div><b>$</b><input inputMode="numeric" min="1" onChange={(event) => setQuickPurchasePrice(event.target.value)} placeholder="Enter amount" type="number" value={quickPurchasePrice} /></div></label>
        <label className={styles.quickAcquisitionConfirm}><input checked={quickConfirmed} onChange={(event) => setQuickConfirmed(event.target.checked)} type="checkbox" /><span><strong>Ready to move forward</strong><small>I confirm identity and ownership, condition/value review, and purchase authority are documented.</small></span></label>
      </div>
      <button disabled={!quickReady || quickCompleted} onClick={completeQuickAcquisition} type="button"><Check size={16} />{quickCompleted ? "Acquisition complete" : "Complete Acquisition & Open Transportation"}<ArrowRight size={16} /></button>
      {!quickReady && !quickCompleted ? <small className={styles.quickAcquisitionHelp}>Choose a source, enter the final amount, and check the confirmation. That is all you need for the fast path.</small> : null}
    </section> : null}

    <details className={styles.taiAdvanced} open={!selectedVehicle}>
      <summary>{selectedVehicle ? "Advanced acquisition tools (optional)" : "Acquisition tools"}</summary>
      <div>

    <section className={styles.opportunityBuilder} aria-label="Acquisition Opportunity Builder">
      <header>
        <div><span><Search size={14} />Pre-acquisition tool</span><h4>Opportunity Builder</h4><p>Research a vehicle before it becomes inventory. Only an approved opportunity should create the governed InventoryUnit.</p></div>
        <strong>{opportunity.status}</strong>
      </header>
      <div className={styles.opportunityGrid}>
        <section className={styles.opportunityForm} id="tai-identity-source">
          <label><span>VIN / scan text</span><input autoCapitalize="characters" maxLength={24} onChange={(event) => updateOpportunity("vin", event.target.value.toUpperCase())} value={opportunity.vin} /></label>
          <label><span>Source</span><select onChange={(event) => updateOpportunity("source", event.target.value as OpportunityDraft["source"])} value={opportunity.source}>{(["Unknown", "Auction", "Trade", "Marketplace", "Customer Offer", "Dealer Wholesale"] as const).map((source) => <option key={source}>{source}</option>)}</select></label>
          <label><span>Seller / source name</span><input onChange={(event) => updateOpportunity("seller", event.target.value)} value={opportunity.seller} /></label>
          <label><span>Source reference</span><input onChange={(event) => updateOpportunity("sourceReference", event.target.value)} value={opportunity.sourceReference} /></label>
          <label><span>Listing / auction link</span><input onChange={(event) => updateOpportunity("sourceLink", event.target.value)} value={opportunity.sourceLink} /></label>
          <label><span>Odometer</span><input onChange={(event) => updateOpportunity("odometer", event.target.value)} value={opportunity.odometer} /></label>
          <label><span>Asking price status</span><select onChange={(event) => updateOpportunity("askingPriceStatus", event.target.value as OpportunityDraft["askingPriceStatus"])} value={opportunity.askingPriceStatus}>{askingPriceStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          <label><span>Proposed / asking price</span><div><b>$</b><input disabled={opportunity.askingPriceStatus !== "Provided"} min="0" onChange={(event) => updateOpportunity("askingPrice", Number(event.target.value) || 0)} type="number" value={opportunity.askingPrice} /></div></label>
          <label><span>MMR / market value</span><div><b>$</b><input min="0" onChange={(event) => updateOpportunity("marketValue", Number(event.target.value) || 0)} type="number" value={opportunity.marketValue} /></div></label>
          <label><span>Market value source</span><select onChange={(event) => updateOpportunity("marketValueSource", event.target.value as OpportunityDraft["marketValueSource"])} value={opportunity.marketValueSource}>{marketValueSources.map((source) => <option key={source}>{source}</option>)}</select></label>
          <label><span>Value checked date</span><input onChange={(event) => updateOpportunity("marketValueDate", event.target.value)} type="date" value={opportunity.marketValueDate} /></label>
          <button onClick={decodeAndResearchOpportunity} type="button"><Search size={15} />Decode + Value</button>
        </section>
        <aside className={styles.opportunityPacket}>
          <header><CarFront /><div><span>Decoded opportunity</span><strong>{opportunity.decodedLabel}</strong><small>VIN {opportunity.vin || "not captured"}</small></div></header>
          <dl>
            <div><dt>Trim / package</dt><dd>{opportunity.decodedTrim}</dd></div>
            <div><dt>Body</dt><dd>{opportunity.decodedBody}</dd></div>
            <div><dt>Powertrain</dt><dd>{opportunity.decodedEngine}</dd></div>
            <div><dt>Duplicate check</dt><dd>{opportunity.duplicateStatus}</dd></div>
            <div><dt>Asking price</dt><dd>{opportunity.askingPriceStatus === "Provided" ? money(opportunity.askingPrice) : opportunity.askingPriceStatus}</dd></div>
            <div><dt>MMR / market value</dt><dd>{opportunity.marketValue > 0 ? `${money(opportunity.marketValue)} · ${opportunity.marketValueSource}` : "Needs manual value"}</dd></div>
            <div><dt>Expected retail</dt><dd>{opportunity.systemRetail > 0 ? money(opportunity.systemRetail) : "Run Decode + Value"}</dd></div>
            <div><dt>Retail range</dt><dd>{opportunity.retailRangeLow > 0 ? `${money(opportunity.retailRangeLow)} - ${money(opportunity.retailRangeHigh)}` : "Pending"}</dd></div>
            <div><dt>Local market</dt><dd>{opportunity.localMarketRetail > 0 ? money(opportunity.localMarketRetail) : "Pending"}</dd></div>
            <div><dt>National baseline</dt><dd>{opportunity.nationalMarketRetail > 0 ? money(opportunity.nationalMarketRetail) : "Pending"}</dd></div>
            <div><dt>Retail confidence</dt><dd>{opportunity.retailConfidence}</dd></div>
            <div><dt>Market days supply</dt><dd>{opportunity.marketDaysSupply > 0 ? `${opportunity.marketDaysSupply} days` : "Pending"}</dd></div>
          </dl>
          <div className={styles.opportunityIntel}>
            <strong>Buyer intelligence</strong>
            {(opportunity.missingItems.length ? opportunity.missingItems : opportunity.intelligenceNotes).slice(0, 4).map((item) => <span key={item}>{opportunity.missingItems.length ? <CircleAlert size={13} /> : <Check size={13} />}{item}</span>)}
          </div>
          <div className={styles.opportunityVehicleIntel}>
            <header><strong>Decoded vehicle intelligence</strong><em>{opportunity.vehicleIntelligence.reliabilityRisk} reliability risk</em></header>
            <p>{opportunity.vehicleIntelligence.recommendationNote}</p>
            <div>
              <section><b>Known issue watch</b>{opportunity.vehicleIntelligence.commonIssues.slice(0, 3).map((item) => <span key={item}><CircleAlert size={13} />{item}</span>)}</section>
              <section><b>Inspection focus</b>{opportunity.vehicleIntelligence.inspectionFocus.slice(0, 3).map((item) => <span key={item}><Check size={13} />{item}</span>)}</section>
            </div>
            <footer><span>{opportunity.vehicleIntelligence.marketPerformance}</span><span>{opportunity.vehicleIntelligence.resaleVelocity}</span></footer>
          </div>
          <div className={styles.opportunityReadiness}>
            {([
              ["VIN decoded", vinPattern.test(opportunity.vin.toUpperCase().replace(/[^A-Z0-9]/g, ""))],
              ["Source recorded", Boolean(opportunity.seller.trim() && opportunity.sourceReference.trim())],
              ["Duplicate clear", opportunity.duplicateStatus === "Clear"],
              ["Expected retail generated", opportunity.systemRetail > 0],
              ["Local vs national checked", opportunity.localMarketRetail > 0 && opportunity.nationalMarketRetail > 0],
              [opportunity.askingPriceStatus === "Provided" ? "Price ready for TAI" : "Offer strategy ready", opportunity.askingPriceStatus === "Provided" ? opportunity.askingPrice > 0 : opportunity.marketValue > 0],
              ["Market value recorded", opportunity.marketValue > 0],
            ] as const).map(([label, ready]) => <span className={ready ? styles.opportunityReady : ""} key={label}>{ready ? <Check size={13} /> : <CircleAlert size={13} />}{label}</span>)}
          </div>
          <footer><FileText size={14} />{opportunityReady ? "Opportunity packet is ready for TAI." : "Complete research before requesting purchase authority."}{opportunity.sourceLink ? <a href={opportunity.sourceLink}><LinkIcon size={13} />Source</a> : null}</footer>
        </aside>
      </div>
    </section>

    <div className={styles.taiBody}>
      <div className={styles.taiInputs}>
        <section>
          <header><h4>Opportunity economics</h4><span>{input.proposedPurchaseKnown ? "Retail-back inputs" : "Offer strategy inputs"}</span></header>
          <div className={styles.taiFieldGrid}>
            <label><span>MMR / market value</span><div><b>$</b><input aria-label="MMR market value" min="0" onChange={(event) => updateNumber("marketValue", event.target.value)} type="number" value={input.marketValue} /></div></label>
            <label><span>Expected retail</span><div><b>$</b><input aria-label="Expected retail" min="0" onChange={(event) => updateNumber("expectedRetail", event.target.value)} type="number" value={input.expectedRetail} /></div></label>
            <label><span>{input.proposedPurchaseKnown ? "Proposed purchase" : "Seller price withheld"}</span><div><b>$</b><input aria-label="Proposed purchase" disabled={!input.proposedPurchaseKnown} min="0" onChange={(event) => updateNumber("proposedPurchase", event.target.value)} type="number" value={input.proposedPurchase} /></div></label>
            <label><span>Target gross</span><div><b>$</b><input aria-label="Target gross" min="0" onChange={(event) => updateNumber("targetGross", event.target.value)} type="number" value={input.targetGross} /></div></label>
            <label><span>Recon estimate</span><div><b>$</b><input aria-label="Recon estimate" min="0" onChange={(event) => updateNumber("recon", event.target.value)} type="number" value={input.recon} /></div></label>
            <label><span>Fees</span><div><b>$</b><input aria-label="Acquisition fees" min="0" onChange={(event) => updateNumber("acquisitionFees", event.target.value)} type="number" value={input.acquisitionFees} /></div></label>
            <label><span>Transport</span><div><b>$</b><input aria-label="Transport" min="0" onChange={(event) => updateNumber("transport", event.target.value)} type="number" value={input.transport} /></div></label>
            <label><span>Title &amp; docs</span><div><b>$</b><input aria-label="Title and documents" min="0" onChange={(event) => updateNumber("titleAndDocs", event.target.value)} type="number" value={input.titleAndDocs} /></div></label>
            <label><span>Holding reserve</span><div><b>$</b><input aria-label="Holding reserve" min="0" onChange={(event) => updateNumber("holdingReserve", event.target.value)} type="number" value={input.holdingReserve} /></div></label>
            <label><span>Risk reserve</span><div><b>$</b><input aria-label="Risk reserve" min="0" onChange={(event) => updateNumber("riskReserve", event.target.value)} type="number" value={input.riskReserve} /></div></label>
          </div>
        </section>

        <section id="tai-evidence-review">
          <header><h4>Fit, market, and evidence</h4><span>Buyer-reviewed inputs</span></header>
          <div className={styles.taiEvidenceBlock}>
            <PrototypeVinScanCard
              expectedVin={selectedVehicle?.vin || defaultExpectedVin}
              helperText="Use direct VIN scan text or paste Manheim / ADESA windshield details so acquisition identity evidence is captured before approval."
              onEvidenceChange={applyVinEvidence}
              stageLabel="Acquisition"
            />
          </div>
          <div className={styles.taiRatings}>
            {([
              ["demandStrength", "Demand strength"],
              ["inventoryNeed", "TMS inventory need"],
              ["marketPosition", "Market position"],
              ["conditionRisk", "Condition risk"],
            ] as const).map(([field, label]) => <label key={field}><span>{label}<b>{ratingLabels[input[field]]}</b></span><input aria-label={label} max="5" min="1" onChange={(event) => updateNumber(field, event.target.value)} type="range" value={input[field]} /></label>)}
          </div>
          <div className={styles.taiEvidence}>
            {([
              ["identityVerified", vinEvidence?.auctionLocation ? `VIN and identity verified (${vinEvidence.auctionLocation})` : "VIN and identity verified"],
              ["sellerAuthorityVerified", "Seller authority verified"],
              ["titleReviewed", "Title and ownership reviewed"],
              ["conditionInspected", "Condition inspection complete"],
              ["comparablesReviewed", "Comparable set reviewed"],
            ] as const).map(([field, label]) => <label key={field}><input checked={input[field]} onChange={(event) => updateEvidence(field, event.target.checked)} type="checkbox" /><span>{label}</span></label>)}
          </div>
        </section>
      </div>

      <aside className={styles.taiDecision} id="tai-evaluation">
        <header><Gauge /><div><span>TAI recommendation</span><strong>{evaluated ? result.recommendation : "Run evaluation"}</strong></div><em className={result.blockers.length ? styles.taiHold : ""}>{result.acquisitionScore}/100</em></header>
        <dl>
          <div><dt>Purchase ceiling</dt><dd>{money(result.purchaseCeiling)}</dd></div>
          <div><dt>{result.offerStrategyRequired ? "Opening offer guide" : "Proposed purchase"}</dt><dd>{result.offerStrategyRequired ? money(result.suggestedOpeningOffer) : money(input.proposedPurchase)}</dd></div>
          <div><dt>{result.offerStrategyRequired ? "Maximum offer room" : "Remaining room"}</dt><dd className={result.remainingRoom < 0 ? styles.taiNegative : ""}>{money(result.remainingRoom)}</dd></div>
          <div><dt>Total investment</dt><dd>{result.offerStrategyRequired ? "Pending offer" : money(result.totalInvestment)}</dd></div>
          <div><dt>Expected gross</dt><dd>{result.offerStrategyRequired ? `${money(input.targetGross)} at ceiling` : money(result.expectedGross)}</dd></div>
          <div><dt>Confidence</dt><dd>{result.confidence}</dd></div>
        </dl>
        <p className={styles.taiExplanation}>{evaluated ? result.explanation : "Review the inputs, then freeze a versioned recommendation for approval."}</p>
        {evaluated ? <div className={styles.taiDrivers}>
          <div><strong>Why it works</strong>{result.positiveDrivers.length ? result.positiveDrivers.map((item) => <span key={item}><Check />{item}</span>) : <span>No strong positive driver recorded.</span>}</div>
          <div><strong>Watch items</strong>{result.negativeDrivers.length ? result.negativeDrivers.map((item) => <span key={item}><CircleAlert />{item}</span>) : <span><Check />No material watch item.</span>}</div>
        </div> : null}
        <button className={styles.taiPrimary} onClick={runEvaluation} type="button"><Calculator />{evaluated ? "Run revised evaluation" : "Run TAI evaluation"}</button>
      </aside>
    </div>

    <section className={styles.taiApproval} id="tai-approval">
      <div><span><LockKeyhole />Step 1</span><strong>Request exact-ceiling authority</strong><small>{eligibleForApproval ? `Evaluation v${evaluationVersion} is eligible for manager review.` : "Run an eligible evaluation with no blockers."}</small><button disabled={!eligibleForApproval || approval !== "DRAFT"} onClick={requestApproval} type="button">Submit for approval</button></div>
      <div><span><ShieldCheck />Step 2</span><strong>Independent manager decision</strong><small>{approval === "REQUESTED" ? `Review ceiling of ${money(result.purchaseCeiling)}.` : approval === "APPROVED" ? "Approved for this exact evaluation." : "Waiting for buyer submission."}</small><button disabled={approval !== "REQUESTED"} onClick={approve} type="button">Approve ceiling</button></div>
      <div id="tai-purchase"><span><BadgeCheck />Step 3</span><strong>Record accepted purchase</strong><small>{approval === "APPROVED" ? `Must be at or below ${money(result.purchaseCeiling)}.` : "Manager authority is required first."}</small><label><span className="sr-only">Final purchase price</span><b>$</b><input aria-label="Final purchase price" min="0" onChange={(event) => { setFinalPrice(Number(event.target.value) || 0); setCommitted(false); }} type="number" value={finalPrice} /></label><button disabled={approval !== "APPROVED" || !finalPriceEligible || committed} onClick={recordPurchase} type="button">{committed ? "Purchase recorded" : "Record purchase"}</button></div>
    </section>
      </div>
    </details>

    <footer className={styles.taiNotice} aria-live="polite"><CircleAlert />{notice}</footer>
  </section>;
}
