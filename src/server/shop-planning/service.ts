import { assertRepairLocationRead, assertRepairReadEntry } from "@/server/repair-order/read-access";
import { normalizeDocumentCustomer } from "@/lib/service-document-review";
import { normalizeBodyDraft, calculateBodyDraft, bodyEstimateLines } from "@/lib/autobody-estimating/domain";
import { SERVICE_CHARGES_POLICY, validateShopSupplies } from "@/lib/service-charges";
import type { AuthenticatedUser } from "@/server/auth/store";
import { estimateReviewScope, manualReviewComplete, validateManualReview } from "@/lib/estimate-review";
import { checkEstimateControls, checkStaffQuotePricing, validateEstimateControls } from "@/lib/labor-guide-controls";
import { flattenLaborOperationTaxonomy } from "@/server/diagnostics/labor-operation-taxonomy";
import { getActiveLaborRate } from "@/server/services/labor-rate-settings";
import { canManageSettings } from "@/server/policies/access";
import { allocateApprovedJobParts, catalogJobRequirements, unmatchedApprovedJobDemands } from "@/lib/catalog-job-readiness";
import { repairBaselineForId } from "@/lib/repair-catalog-baselines";
import { laborOperationForLineKey } from "@/lib/labor-catalog-selection";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand, hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository,type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability, evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import type { DiagnosisRequest } from "@/lib/repair-diagnosis-request";
import { normalizeDiagnosisWork, RECORD_DIAGNOSIS_FINDINGS, SAVE_DIAGNOSIS_REQUEST } from "./diagnosis-request";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { normalizeAuthorization,normalizeDiagnosis,normalizeDirectRepairScope,normalizeEstimate,normalizeInspection,normalizeJob } from "./domain";
import { createShopPlanningRepository,type ShopPlanningRepository } from "./repository";
type Dependencies={enforceRollout?:boolean;foundationRepository?:EnterpriseCommandRepository;now?:()=>Date;organizationId?:string;repository?:ShopPlanningRepository};
function deps(input:Dependencies){return{enforceRollout:input.enforceRollout??true,foundationRepository:input.foundationRepository??createEnterpriseCommandRepository(),now:input.now??(()=>new Date()),organizationId:input.organizationId??INITIAL_ORGANIZATION.id,repository:input.repository??createShopPlanningRepository()};}
async function authorize(actor:AuthenticatedUser|null,manage:boolean,locationId:string|null,context:ReturnType<typeof deps>){const user=assertAuthenticatedUser(actor),grants=await context.foundationRepository.listCapabilityGrants(user.id,context.organizationId);assertVehicleCapability({actor:user,capability:manage?"REPAIR_ORDER_MANAGE":"REPAIR_ORDER_VIEW",grants,locationId,now:context.now()});if(manage&&context.enforceRollout){const flags=await context.foundationRepository.listFeatureFlags(context.organizationId),decision=evaluateVehicleOperationsFeature(flags,"SHOP_OPERATIONS",user.id,locationId);if(!decision.executable)throw new Error(`Shop Operations mutations are not enabled (${decision.reason}).`);}return user;}
function payload(value:unknown){return JSON.parse(JSON.stringify(value)) as Record<string,unknown>;}
type CompletionJobResult={jobNumber?:string;repairOrderVersion:number};
function objectResult(value:unknown,label:string){if(!value||typeof value!=="object"||Array.isArray(value))throw new Error(`${label} result was unavailable.`);return value as Record<string,unknown>;}
function completionJobResult(value:unknown){const result=objectResult(value,"Repair job");if(typeof result.repairOrderVersion!=="number")throw new Error("Repair job version was unavailable.");return result as CompletionJobResult;}
async function mutationContext(actor:AuthenticatedUser|null,repairOrderId:string,context:ReturnType<typeof deps>){const ro=await context.repository.get(context.organizationId,repairOrderId);if(!ro)throw new Error("Repair order was not found.");const user=await authorize(actor,true,ro.locationId,context);return{ro,user};}
function command(input:{actorUserId:string;commandType:string;expectedVersion:number;idempotencyKey:string;locationId:string;organizationId:string;payload:Record<string,unknown>;reason:string;subjectId:string}){return normalizeEnterpriseCommand({...input,domain:"SHOP_OPERATIONS",subjectType:"REPAIR_ORDER"});}
export async function getShopPlanningWorkspace(actor:AuthenticatedUser|null,input:Dependencies={}){const context=deps(input);await assertRepairReadEntry(actor,context.organizationId,context.foundationRepository,context.now());const rows=await context.repository.list(context.organizationId);const visible=[];for(const row of rows.repairOrders){try{await assertRepairLocationRead(actor,context.organizationId,row.locationId,context.foundationRepository,context.now());visible.push(row);}catch(error){if(!(error instanceof Error)||!error.message.startsWith("Vehicle capability required:"))throw error;}}return {...rows,repairOrders:visible};}
export async function getShopPlanningDetail(actor:AuthenticatedUser|null,repairOrderId:string,input:Dependencies={}){const context=deps(input);await assertRepairReadEntry(actor,context.organizationId,context.foundationRepository,context.now());const result=await context.repository.get(context.organizationId,repairOrderId);if(!result)throw new Error("Repair order was not found.");await assertRepairLocationRead(actor,context.organizationId,result.locationId,context.foundationRepository,context.now());return result;}
async function diagnosisAccess(user: AuthenticatedUser, locationId: string, context: ReturnType<typeof deps>) {
  const [grants, flags] = await Promise.all([
    context.foundationRepository.listCapabilityGrants(user.id, context.organizationId),
    context.enforceRollout ? context.foundationRepository.listFeatureFlags(context.organizationId) : [],
  ]);
  const can = (capability: Parameters<typeof evaluateVehicleCapability>[0]["capability"], location: string | null = locationId) =>
    evaluateVehicleCapability({ actor: user, capability, grants, locationId: location, now: context.now() }).allowed;
  const enabled = !context.enforceRollout || evaluateVehicleOperationsFeature(flags, "SHOP_OPERATIONS", user.id, locationId).executable;
  return {
    read: can("REPAIR_ORDER_VIEW"), enabled,
    manage: can("REPAIR_ORDER_MANAGE"), technician: can("DIAGNOSTIC_EVIDENCE_RECORD"),
    viewEvidence: can("VEHICLE_EVIDENCE_VIEW", null), uploadEvidence: can("VEHICLE_EVIDENCE_MANAGE", null),
  };
}

export async function repairJobCreationRestriction(user: AuthenticatedUser, locationId: string, input: Dependencies = {}) {
  try {
    await authorize(user, true, locationId, deps(input));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Vehicle capability required:")) return "A service advisor with repair-order access must create the technician work orders.";
    if (error instanceof Error && error.message.startsWith("Shop Operations mutations")) return "Shop Operations is unavailable for this store. Ask a manager to check store access.";
    throw error;
  }
}

/** Workbench callers have already read the scoped order using getShopPlanningDetail. */
export async function getDiagnosisWorkbench(user: AuthenticatedUser, order: NonNullable<Awaited<ReturnType<ShopPlanningRepository["get"]>>>, input: Dependencies = {}) {
  const context = deps(input);
  const [access, request] = await Promise.all([
    diagnosisAccess(user, order.locationId, context),
    context.repository.diagnosisRequest(context.organizationId, order.id),
  ]);
  const editable = access.read && access.enabled && order.operatingState !== "BLOCKED" && order.stage === "DIAGNOSIS";
  const canRequest = editable && access.manage;
  const canRecord = editable && Boolean(request && (access.manage || isAssignedDiagnostician(user, request, access.technician)));
  const options = await context.repository.diagnosisOptions(context.organizationId, order.id, order.vehicle.id, access.viewEvidence, canRequest);
  return { ...options, request, canRequest, canRecord, canUpload: access.uploadEvidence && access.viewEvidence,
    blocker: !access.enabled ? "Shop Operations updates are disabled for this location." : order.operatingState === "BLOCKED" ? order.stateReason ?? "Resolve the repair-order blocker before continuing." : null };
}

function isAssignedDiagnostician(user: AuthenticatedUser, request: DiagnosisRequest | null, canRecordEvidence: boolean) {
  return canRecordEvidence && request?.route === "IN_HOUSE" && request.assigneeId === user.id;
}

export async function saveRepairDiagnosisWork(actor: AuthenticatedUser | null, repairOrderId: string, action: "request" | "findings", value: unknown, input: Dependencies = {}) {
  const context = deps(input);
  const user = assertAuthenticatedUser(actor);
  const data = normalizeDiagnosisWork(action, value);
  const order = await context.repository.get(context.organizationId, repairOrderId);
  if (!order) throw new Error("Repair order was not found.");
  const access = await diagnosisAccess(user, order.locationId, context);
  if (!access.read || (!access.manage && (action !== "findings" || !access.technician))) {
    throw new Error("Vehicle capability required: diagnosis work for this location.");
  }
  if (!access.enabled) throw new Error("Shop Operations updates are disabled for this location.");
  if (data.evidenceId && !access.viewEvidence) throw new Error("Vehicle capability required: vehicle evidence.");
  const { expectedVersion, idempotencyKey, ...details } = data;
  const entry = command({ actorUserId: user.id, commandType: data.kind === "request" ? SAVE_DIAGNOSIS_REQUEST : RECORD_DIAGNOSIS_FINDINGS,
    expectedVersion, idempotencyKey, locationId: order.locationId, organizationId: context.organizationId, subjectId: order.id,
    payload: payload(details), reason: data.kind === "request" ? "Save diagnosis instructions and responsible party." : "Record findings from the requested diagnosis." });
  return data.kind === "request" ? context.repository.saveDiagnosisRequest(entry, data) : context.repository.recordDiagnosisFindings(entry, data, !access.manage);
}
export async function recordVehicleInspection(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeInspection(value),{ro,user}=await mutationContext(actor,repairOrderId,context);return context.repository.inspection(command({actorUserId:user.id,commandType:"RECORD_DVI_VERSION",expectedVersion:ro.version,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:ro.id}),{...data,authorUserId:user.id});}
export async function recordRepairDiagnosis(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeDiagnosis(value),{ro,user}=await mutationContext(actor,repairOrderId,context);return context.repository.diagnosis(command({actorUserId:user.id,commandType:"RECORD_DIAGNOSIS_VERSION",expectedVersion:ro.version,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:ro.id}),data);}
export async function recordDirectRepairScope(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeDirectRepairScope(value),{ro,user}=await mutationContext(actor,repairOrderId,context);return context.repository.directRepairScope(command({actorUserId:user.id,commandType:"RECORD_DIRECT_REPAIR_SCOPE",expectedVersion:ro.version,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:ro.id}),data);}
export async function presentRepairEstimate(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}, preservedLaborKeys?: ReadonlySet<string>){
  const context=deps(input),data=normalizeEstimate(value,context.now()),{ro,user}=await mutationContext(actor,repairOrderId,context);
  const reviewValue=(value as Record<string,unknown>).manualLaborReview;
  const staffQuote=(value as Record<string,unknown>).estimateWorkflow==="STAFF_QUOTE";
  const collisionValue=(value as Record<string,unknown>).collisionReview;
  const collision=collisionValue === undefined ? null : normalizeBodyDraft(collisionValue);
  if(!collision&&Array.isArray(data.optionGroups)&&data.optionGroups.some(group=>group&&typeof group==="object"&&"type" in group&&group.type==="AUTOBODY_PROVENANCE"))throw new Error("Collision provenance requires a validated collision review.");
  if(collision){
    const calculated=calculateBodyDraft(collision),lines=bodyEstimateLines(collision);
    if(collision.repairOrderId!==ro.id||collision.vehicleId!==ro.vehicle.id||!calculated.ready||calculated.taxCents!==data.taxCents||calculated.discountCents!==data.discountCents||hashEnterpriseCommand(lines)!==hashEnterpriseCommand(data.lineItems))throw new Error("Collision review no longer matches this vehicle, scope or calculation.");
    const rate=await getActiveLaborRate(user);
    if(collision.lines.some(line=>line.minutes&&collision.rates[line.category]!==Math.round(rate.laborRate*100))&&(!canManageSettings(user)||!collision.rateReason.trim()))throw new Error("Changing a collision category rate requires an administrator and an override explanation.");
    const internal=Boolean(ro.inventoryUnitId)&&!ro.customerId;
    if((internal&&collision.payer!=="INTERNAL")||(!internal&&collision.payer==="INTERNAL"))throw new Error("Choose the payer matching this repair order; internal recon is separate from customer billing.");
    data.optionGroups=[{type:"AUTOBODY_PROVENANCE",snapshot:collision,calculation:calculated,ratePolicy:{id:rate.policyId,version:rate.policyVersion,laborRate:rate.laborRate},reviewedBy:user.id,reviewedAt:data.presentedAt.toISOString()}];
    data.assumptions=[data.assumptions,`Collision scope reviewed by ${user.name}. Source: ${collision.release}; estimator-entered manual allowances, not OEM verified. Applicable technical methods and fitment remain subject to recorded references.`].filter(Boolean).join("\n");
  }
  if (staffQuote || (value as Record<string,unknown>).chargesPolicy === SERVICE_CHARGES_POLICY) validateShopSupplies(data.lineItems);
  if(!staffQuote && (reviewValue!==undefined || data.lineItems.some(line=>line.type==="LABOR"))){
    const review=validateManualReview(reviewValue);
    if(!manualReviewComplete(review,estimateReviewScope(ro.vehicle.id,data.lineItems)))throw new Error("Manual labor review is incomplete or the vehicle/work changed. Review again before presenting.");
    data.assumptions=[data.assumptions,`Manual review (not OEM verified). Engine: ${review.engine}. Configuration: ${review.configuration}. Source: ${review.source}. Limitations: ${review.limitations || "None stated"}. Presenter: ${user.name} (${user.id}). Recorded: ${data.presentedAt.toISOString()}.`].filter(Boolean).join("\n");
  }
  const catalog = flattenLaborOperationTaxonomy();
  const selectedCatalog = data.lineItems.filter(line=>line.type==="LABOR").flatMap(line=>{
    const operation = laborOperationForLineKey(line.key, catalog);
    return operation ? [{ ...operation, hours: line.laborGuideMinutes / 60 }] : [];
  });
  const controlValue=(value as Record<string,unknown>).estimateControls;
  if(staffQuote || selectedCatalog.length || controlValue!==undefined){
    const controls=staffQuote ? checkStaffQuotePricing(data.lineItems,validateEstimateControls(controlValue),selectedCatalog,data.taxCents,data.discountCents,preservedLaborKeys) : checkEstimateControls(ro.vehicle.id,data.lineItems,validateEstimateControls(controlValue),selectedCatalog,data.taxCents);
    const activeRate=await getActiveLaborRate(user);
    if(controls.pricing.laborRate!==activeRate.laborRate){
      if(!canManageSettings(user))throw new Error("Only an administrator may override the active shop labor rate. Use the current shop rate and repeat review.");
      if(!controls.pricing.overrideReason?.trim())throw new Error("An administrator rate override reason is required.");
    }
    data.assumptions=[data.assumptions,staffQuote ? `Staff quote by ${user.name} (${user.id}). Pricing: ${JSON.stringify(controls.pricing)}.` : `Estimate controls v1 (staff reviewed, not independently verified): ${JSON.stringify(controls)}`,`Labor provenance: ${JSON.stringify(selectedCatalog.map(operation=>{const baseline=repairBaselineForId(operation.id);return{operationId:operation.id,source:"INTERNAL_AUTHORED",version:baseline?.version??"labor-taxonomy-v1",validatedStandard:false,proposedMinutes:Math.round(operation.hours*60),...(baseline?{scope:baseline.operation}:{})};}))}`].filter(Boolean).join("\n");
  }
  // Keep the original version on retries so the command ledger can replay the same result.
  const suppliedVersion=(value as Record<string,unknown>).expectedVersion;
  if(suppliedVersion!==undefined&&(!Number.isInteger(suppliedVersion)||Number(suppliedVersion)<0))throw new Error("Expected version must be a non-negative integer.");
  const receipt=await context.repository.commandReceipt?.(context.organizationId,"PRESENT_ESTIMATE_VERSION",data.idempotencyKey);
  const expectedVersion=suppliedVersion===undefined?(receipt?.expectedVersion??ro.version):Number(suppliedVersion);
  const chargeRevisionFrom=(value as Record<string,unknown>).chargeRevisionFrom;
  if(chargeRevisionFrom!==undefined&&(typeof chargeRevisionFrom!=="string"||!chargeRevisionFrom||chargeRevisionFrom.length>200))throw new Error("Invalid charge revision source.");
  const documentReviewRaw=(value as Record<string,unknown>).documentReview;
  let documentReview: { documentId: string; documentHash: string; customer?: ReturnType<typeof normalizeDocumentCustomer> } | undefined;
  if(documentReviewRaw !== undefined) {
    if(!documentReviewRaw || typeof documentReviewRaw !== "object" || Array.isArray(documentReviewRaw)) throw new Error("Invalid document review source.");
    const review=documentReviewRaw as Record<string,unknown>;
    if(typeof review.documentId !== "string" || !review.documentId || typeof review.documentHash !== "string" || !review.documentHash || !chargeRevisionFrom) throw new Error("Invalid document review source.");
    documentReview={documentId:review.documentId,documentHash:review.documentHash,...(review.customer === undefined ? {} : {customer:normalizeDocumentCustomer(review.customer)})};
  }
  const optionGroups = staffQuote && !data.optionGroups ? { servicePricing: { taxRatePercent: validateEstimateControls(controlValue).pricing.taxRatePercent } } : data.optionGroups;
  const estimateData={...data,optionGroups,...(documentReview?{documentReview}:{}),...(collision?{estimateWorkflow:"COLLISION_REVIEW" as const}:staffQuote?{estimateWorkflow:"STAFF_QUOTE" as const}:{}),...(typeof chargeRevisionFrom==="string"?{chargeRevisionFrom}:{}),...(preservedLaborKeys ? { additionalWork: true } : {})};
  return context.repository.estimate(command({actorUserId:user.id,commandType:"PRESENT_ESTIMATE_VERSION",expectedVersion,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(estimateData),reason:data.reason,subjectId:ro.id}),estimateData);
}
export async function decideRepairAuthorization(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeAuthorization(value),{ro,user}=await mutationContext(actor,repairOrderId,context);const receipt=await context.repository.commandReceipt?.(context.organizationId,"DECIDE_ESTIMATE_AUTHORIZATION",data.idempotencyKey);return context.repository.authorization(command({actorUserId:user.id,commandType:"DECIDE_ESTIMATE_AUTHORIZATION",expectedVersion:receipt?.expectedVersion??ro.version,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:ro.id}),data);}
export async function createAuthorizedRepairJob(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeJob(value),{ro,user}=await mutationContext(actor,repairOrderId,context),requirements=catalogJobRequirements(data.authorizedLineKey,data);return context.repository.job(command({actorUserId:user.id,commandType:"CREATE_AUTHORIZED_REPAIR_JOB",expectedVersion:ro.version,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:ro.id}),{...data,...requirements,workTypeCode:requirements.workTypeCode??data.workTypeCode,partsRequired:data.partsRequired||requirements.partsRequired,createdByUserId:user.id});}

export async function createApprovedRepairJobs(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Approved repair-job request must be an object.");
  const raw=value as Record<string,unknown>,idempotencyKey=typeof raw.idempotencyKey==="string"?raw.idempotencyKey.trim():"",reason=typeof raw.reason==="string"?raw.reason.trim():"";
  if(!idempotencyKey)throw new Error("Idempotency key is required.");
  if(!reason)throw new Error("Business reason is required.");
  const order=await getShopPlanningDetail(actor,repairOrderId,input),estimate=order.estimateVersions[0]??null;
  if(!estimate)throw new Error("A presented estimate is required before repair jobs can be created.");
  const latestAuthorization=estimate.authorizations[0]??null;
  if(!latestAuthorization||!["ACCEPTED","PARTIAL"].includes(latestAuthorization.disposition))throw new Error("The latest estimate decision must approve work before repair jobs can be created.");
  if ((raw.estimateId !== undefined && raw.estimateId !== estimate.id) ||
      (raw.authorizationId !== undefined && raw.authorizationId !== latestAuthorization.id)) {
    throw new Error("The approved estimate changed. Reload before creating technician work.");
  }
  const authorizedKeys=Array.isArray(latestAuthorization.authorizedLineKeys)?latestAuthorization.authorizedLineKeys.filter((item):item is string=>typeof item==="string"):[];
  const lines=Array.isArray(estimate.lineItems)?estimate.lineItems as unknown as Array<{description:string;key:string;laborGuideMinutes:number;plannedCorrection:string;type:string;workTypeCode:string;laborLineKey?:string}>:[];
  const instructions = new Map<string, string>();
  if (raw.instructions !== undefined) {
    if (!Array.isArray(raw.instructions) || raw.instructions.length > lines.length) throw new Error("Invalid technician instructions.");
    for (const entry of raw.instructions) {
      if (!entry || typeof entry.lineKey !== "string" || typeof entry.text !== "string" || !entry.text.trim() ||
          entry.text.length > 500 || instructions.has(entry.lineKey) ||
          !lines.some(line => line.type === "LABOR" && line.key === entry.lineKey && authorizedKeys.includes(line.key))) {
        throw new Error("Technician instructions must belong to an approved labor line.");
      }
      instructions.set(entry.lineKey, entry.text.trim());
    }
  }
  const extraPartKeys = raw.additionalPartsRequiredKeys ?? [];
  if (!Array.isArray(extraPartKeys) || extraPartKeys.length > lines.length ||
      extraPartKeys.some(key => !lines.some(line => line.type === "LABOR" && line.key === key && authorizedKeys.includes(line.key)))) {
    throw new Error("Parts requirements must belong to approved labor lines.");
  }
  // Superseded approvals cannot satisfy the current exact-version job scope.
  const currentJobs=order.repairJobs.filter(job=>job.authorizationId===latestAuthorization.id);
  const existingKeys=new Set(currentJobs.map(job=>job.authorizedLineKey));
  const executable=lines.filter(line=>line.type==="LABOR"&&authorizedKeys.includes(line.key)&&!existingKeys.has(line.key));
  if(!executable.length){
    const approvedLabor=lines.some(line=>line.type==="LABOR"&&authorizedKeys.includes(line.key));
    if(approvedLabor&&currentJobs.length)return{duplicate:true,result:{createdJobs:[],message:"All approved labor already has a repair job."},version:order.version};
    throw new Error("The approved scope does not contain an executable labor line.");
  }
  const diagnosisVersionId=order.diagnosisVersions[0]?.id??null;
  const requestedDemands = raw.demandAssignments ?? [];
  if (!Array.isArray(requestedDemands) || requestedDemands.length > order.partDemands.length) throw new Error("Invalid parts assignments.");
  const demandAssignments = new Map<string, string>();
  if (requestedDemands.length) {
    const unmatched = unmatchedApprovedJobDemands(lines, authorizedKeys, order.partDemands);
    for (const entry of requestedDemands) {
      const attached = order.partDemands.find(demand => demand.id === entry?.id)?.repairJobId;
      if (attached && currentJobs.some(job => job.id === attached && job.authorizedLineKey === entry.lineKey)) continue;
      if (!entry || !unmatched.includes(entry.id) || demandAssignments.has(entry.id) || !executable.some(line => line.key === entry.lineKey)) {
        throw new Error("The parts records changed. Reload and confirm which work order needs each part.");
      }
      demandAssignments.set(entry.id, entry.lineKey);
    }
    if (demandAssignments.size !== unmatched.length) throw new Error("Choose the work order for each saved part.");
  }
  const demands = order.partDemands.map(demand => {
    const lineKey = demandAssignments.get(demand.id);
    return lineKey ? { ...demand, repairJobReference: lineKey } : demand;
  });
  const allocations=allocateApprovedJobParts(lines,authorizedKeys,demands,[...existingKeys],order.origin==="CUSTOMER_REPAIR");
  const createdJobs=[];
  for(const line of executable){
    const result=await createAuthorizedRepairJob(actor,repairOrderId,{authorizationId:latestAuthorization.id,authorizedLineKey:line.key,bayRequirements:[],dependencyJobIds:[],description:line.description,diagnosisVersionId,idempotencyKey:`${idempotencyKey}:${line.key}`,laborGuideMinutes:line.laborGuideMinutes,partDemandIds:allocations.get(line.key)!.partDemandIds,partsRequired:allocations.get(line.key)!.partsRequired || extraPartKeys.includes(line.key),plannedCorrection:instructions.get(line.key) || line.plannedCorrection || line.description,priority:"NORMAL",reason,requiredCertifications:[],requiredSkills:[],toolRequirements:[],workTypeCode:line.workTypeCode},input);
    createdJobs.push(result.result);
  }
  return{duplicate:false,result:{createdJobs,message:`${createdJobs.length} approved repair job${createdJobs.length===1?"":"s"} created.`},version:order.version+createdJobs.length};
}

export async function createCompletionRepairJob(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Completion repair-job request must be an object.");
  const raw=value as Record<string,unknown>,idempotencyKey=typeof raw.idempotencyKey==="string"?raw.idempotencyKey.trim():"",reason=typeof raw.reason==="string"?raw.reason.trim():"Open existing approved completion work.";
  if(!idempotencyKey)throw new Error("Idempotency key is required.");
  const order=await getShopPlanningDetail(actor,repairOrderId,input),estimate=order.estimateVersions[0],authorization=estimate?.authorizations[0];
  if(!estimate||!authorization||!["ACCEPTED","PARTIAL"].includes(authorization.disposition))throw new Error("Create, review and authorize the current estimate before opening completion work. This shortcut cannot invent prices or approve repairs.");
  const keys=Array.isArray(authorization.authorizedLineKeys)?authorization.authorizedLineKeys:[];
  const lines=estimate.lineItems as Array<{key:string;type:string;description:string;plannedCorrection:string;laborGuideMinutes:number;workTypeCode:string}>;
  const line=lines.find(item=>item.type==="LABOR"&&keys.includes(item.key)&&(typeof raw.lineKey!=="string"||item.key===raw.lineKey));
  if(!line)throw new Error("Choose an approved labor line from the current estimate.");
  const existing=order.repairJobs.find(job=>job.authorizationId===authorization.id&&job.authorizedLineKey===line.key);
  if(existing)return{duplicate:true,result:{authorizationId:authorization.id,estimateVersionId:estimate.id,job:existing,message:`Repair job ${existing.jobNumber} already exists.`},version:order.version};
  const result=await createAuthorizedRepairJob(actor,repairOrderId,{authorizationId:authorization.id,authorizedLineKey:line.key,bayRequirements:[],dependencyJobIds:[],description:line.description,diagnosisVersionId:order.diagnosisVersions[0]?.id??null,idempotencyKey:`${idempotencyKey}:approved-job`,laborGuideMinutes:line.laborGuideMinutes,partDemandIds:Array.isArray(raw.partDemandIds)?raw.partDemandIds:[],partsRequired:raw.partsRequired===true,plannedCorrection:line.plannedCorrection,priority:"NORMAL",reason,requiredCertifications:[],requiredSkills:[],toolRequirements:[],workTypeCode:line.workTypeCode},input);
  const job=completionJobResult(result.result);
  return{duplicate:false,result:{authorizationId:authorization.id,estimateVersionId:estimate.id,job,message:`Repair job ${job.jobNumber??""} created from approved work.`},version:job.repairOrderVersion};
}
