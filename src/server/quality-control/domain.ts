import {
  FINAL_REPAIR_QC_FINDING_MAX,
  FINAL_REPAIR_QC_NOTE_MAX,
  FINAL_REPAIR_QC_NOTE_MIN,
  FINAL_REPAIR_QC_TEMPLATE,
  needsRepairRoadTest,
  repairChecklistItems,
  type FinalRepairQcRecommendation
} from "@/lib/final-repair-qc";
import { evaluateQualityRelease } from "@/server/inventory/shop-operations";

function required(value:unknown,label:string,max=1000){const result=typeof value==="string"?value.trim():"";if(!result)throw new Error(`${label} is required.`);if(result.length>max)throw new Error(`${label} must be ${max} characters or fewer.`);return result;}
function date(value:unknown,label:string){const result=new Date(required(value,label,100));if(Number.isNaN(result.getTime()))throw new Error(`${label} must be a valid date and time.`);return result;}
function strings(value:unknown,label:string,allowEmpty=true){if(!Array.isArray(value))throw new Error(`${label} must be a list.`);const result=[...new Set(value.map(item=>typeof item==="string"?item.trim():"").filter(Boolean))];if(!allowEmpty&&!result.length)throw new Error(`${label} requires at least one item.`);return result;}
function bool(value:unknown){return value===true;}
export type QualityCheck={category:"COMPLETION"|"SAFETY"|"PEER"|"ROAD_TEST"|"OTHER";code:string;evidence:string[];label:string;notes:string|null;result:"PASS"|"FAIL"|"NOT_APPLICABLE"};

function normalizeRecommendation(value: unknown, templateCode: string): FinalRepairQcRecommendation | undefined {
  if (value === undefined) return undefined;
  if (templateCode !== FINAL_REPAIR_QC_TEMPLATE) {
    throw new Error("Recommendations can only be recorded on the repair-job Final QC checklist.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Final QC recommendation requires a finding and a recommended next step.");
  }
  const recommendation = value as Record<string, unknown>;
  const finding = required(recommendation.finding, "Recommendation finding", FINAL_REPAIR_QC_FINDING_MAX);
  const note = required(recommendation.note, "Recommended next step", FINAL_REPAIR_QC_NOTE_MAX);
  if (note.length < FINAL_REPAIR_QC_NOTE_MIN) {
    throw new Error("Describe the recommended next step in at least 10 characters.");
  }
  return { finding, note };
}

export function normalizeQualityInspection(value:unknown){if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Quality inspection request must be an object.");const raw=value as Record<string,unknown>,templateVersion=Number(raw.templateVersion),checksRaw=Array.isArray(raw.checks)?raw.checks:[];if(!Number.isInteger(templateVersion)||templateVersion<1)throw new Error("QC template version must be a positive whole number.");if(!checksRaw.length)throw new Error("QC inspection requires at least one check.");const checks=checksRaw.map((item,index)=>{if(!item||typeof item!=="object"||Array.isArray(item))throw new Error(`QC check ${index+1} is invalid.`);const entry=item as Record<string,unknown>,category=String(entry.category??""),result=String(entry.result??"");if(!["COMPLETION","SAFETY","PEER","ROAD_TEST","OTHER"].includes(category))throw new Error(`QC check ${index+1} category is invalid.`);if(!["PASS","FAIL","NOT_APPLICABLE"].includes(result))throw new Error(`QC check ${index+1} result is invalid.`);return{category:category as QualityCheck["category"],code:required(entry.code,`QC check ${index+1} code`,100).toUpperCase(),evidence:strings(entry.evidence??[],`QC check ${index+1} evidence`),label:required(entry.label,`QC check ${index+1} label`,200),notes:typeof entry.notes==="string"&&entry.notes.trim()?entry.notes.trim():null,result:result as QualityCheck["result"]};});if(!checks.some(item=>item.category==="SAFETY"))throw new Error("QC inspection requires at least one safety check.");const roadTestRequired=bool(raw.roadTestRequired),roadTestOutcome=String(raw.roadTestOutcome??(roadTestRequired?"":"NOT_REQUIRED"));if(!["NOT_REQUIRED","PASSED","FAILED"].includes(roadTestOutcome))throw new Error("Road-test outcome is invalid.");if(roadTestRequired&&roadTestOutcome==="NOT_REQUIRED")throw new Error("A required road test must be passed or failed.");if(!roadTestRequired&&roadTestOutcome!=="NOT_REQUIRED")throw new Error("Road-test outcome must be NOT_REQUIRED when no road test applies.");const roadTestEvidence=strings(raw.roadTestEvidence??[],"Road-test evidence");if(roadTestRequired&&!roadTestEvidence.length)throw new Error("A required road test needs evidence.");
  const templateCode = required(raw.templateCode, "QC template code", 100).toUpperCase();
  const recommendation = normalizeRecommendation(raw.recommendation, templateCode);
  return {
    checks,
    ...(recommendation ? { recommendation } : {}),
    completionEvidence: strings(raw.completionEvidence ?? [], "Completion evidence", false),
    idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200),
    inspectedAt: date(raw.inspectedAt, "Inspection time"),
    peerVerificationPassed: bool(raw.peerVerificationPassed),
    peerVerifierUserId: typeof raw.peerVerifierUserId === "string" ? raw.peerVerifierUserId.trim() || null : null,
    reason: required(raw.reason, "Business reason", 500),
    reworkInstructions: typeof raw.reworkInstructions === "string" ? raw.reworkInstructions.trim() || null : null,
    roadTestEvidence,
    roadTestOutcome: roadTestOutcome as "NOT_REQUIRED" | "PASSED" | "FAILED",
    roadTestRequired,
    templateCode,
    templateVersion
  };
}
export function normalizeReleaseAuthorization(value:unknown){if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Release authorization request must be an object.");const raw=value as Record<string,unknown>,openExceptions=strings(raw.openExceptions??[],"Open exceptions");if(openExceptions.length)throw new Error("Vehicle release is blocked while open exceptions remain.");if(raw.keysVerified!==true)throw new Error("Vehicle keys must be verified before release authorization.");return{authorizedAt:date(raw.authorizedAt,"Authorization time"),idempotencyKey:required(raw.idempotencyKey,"Idempotency key",200),keysVerified:true as const,openExceptions,reason:required(raw.reason,"Business reason",500),releaseEvidence:strings(raw.releaseEvidence??[],"Release evidence",false)};}
export function evaluateInspection(input:{checks:QualityCheck[];completionEvidence:string[];heavyRepair:boolean;peerVerificationPassed:boolean;roadTestOutcome:"NOT_REQUIRED"|"PASSED"|"FAILED";roadTestRequired:boolean}){const failedChecks=input.checks.filter(item=>item.result==="FAIL"),completionChecks=input.checks.filter(item=>item.category==="COMPLETION"&&item.result!=="NOT_APPLICABLE"),completionChecksPassed=completionChecks.length>0&&completionChecks.every(item=>item.result==="PASS"),safetyChecks=input.checks.filter(item=>item.category==="SAFETY"&&item.result!=="NOT_APPLICABLE"),safetyChecksPassed=safetyChecks.length>0&&safetyChecks.every(item=>item.result==="PASS"),base=evaluateQualityRelease({completionEvidencePresent:input.completionEvidence.length>0,heavyRepair:input.heavyRepair,peerVerificationPassed:input.peerVerificationPassed,roadTestPassed:input.roadTestOutcome==="PASSED",roadTestRequired:input.roadTestRequired,safetyChecksPassed}),failureReasonCodes=[...base.reasonCodes.filter(code=>code!=="SHOP_QC_RELEASE_GATES_PASSED"),...(!completionChecksPassed?["SHOP_QC_COMPLETION_CHECK_REQUIRED"]:[]),...failedChecks.map(item=>`SHOP_QC_CHECK_FAILED_${item.code}`)];return{allowed:base.allowed&&completionChecksPassed&&failedChecks.length===0,failureReasonCodes:[...new Set(failureReasonCodes)],peerVerificationRequired:input.heavyRepair,safetyChecksPassed};}

export function validateFinalRepairChecklist(
  job: Parameters<typeof needsRepairRoadTest>[0],
  data: Pick<ReturnType<typeof normalizeQualityInspection>, "checks" | "roadTestOutcome">,
  procedureRules?: unknown
) {
  const failed = data.checks.some(check => check.result === "FAIL") || data.roadTestOutcome === "FAILED";
  if (failed) return true;

  const checks = data.checks;
  if (!repairChecklistItems(procedureRules).every(item => checks.some(check =>
    check.code === item.code && check.category === item.category && check.result === "PASS"
  ))) {
    throw new Error("Every Final QC checklist item must pass before the repair can clear QC.");
  }
  if (needsRepairRoadTest(job) && data.roadTestOutcome !== "PASSED") {
    throw new Error("This repair requires a passing road test before it can clear QC.");
  }
  return false;
}
