import type { AuthenticatedUser } from "@/server/auth/store";
import { estimateReviewScope, manualReviewComplete, validateManualReview } from "@/lib/estimate-review";
import { checkEstimateControls, validateEstimateControls } from "@/lib/labor-guide-controls";
import { flattenLaborOperationTaxonomy } from "@/server/diagnostics/labor-operation-taxonomy";
import { getActiveLaborRate } from "@/server/services/labor-rate-settings";
import { canManageSettings } from "@/server/policies/access";
import { repairBaselineForId } from "@/lib/repair-catalog-baselines";
import { laborOperationForLineKey } from "@/lib/labor-catalog-selection";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository,type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
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
export async function getShopPlanningWorkspace(actor:AuthenticatedUser|null,input:Dependencies={}){const context=deps(input);await authorize(actor,false,null,context);return context.repository.list(context.organizationId);}
export async function getShopPlanningDetail(actor:AuthenticatedUser|null,repairOrderId:string,input:Dependencies={}){const context=deps(input);await authorize(actor,false,null,context);const result=await context.repository.get(context.organizationId,repairOrderId);if(!result)throw new Error("Repair order was not found.");return result;}
export async function recordVehicleInspection(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeInspection(value),{ro,user}=await mutationContext(actor,repairOrderId,context);return context.repository.inspection(command({actorUserId:user.id,commandType:"RECORD_DVI_VERSION",expectedVersion:ro.version,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:ro.id}),{...data,authorUserId:user.id});}
export async function recordRepairDiagnosis(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeDiagnosis(value),{ro,user}=await mutationContext(actor,repairOrderId,context);return context.repository.diagnosis(command({actorUserId:user.id,commandType:"RECORD_DIAGNOSIS_VERSION",expectedVersion:ro.version,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:ro.id}),data);}
export async function recordDirectRepairScope(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeDirectRepairScope(value),{ro,user}=await mutationContext(actor,repairOrderId,context);return context.repository.directRepairScope(command({actorUserId:user.id,commandType:"RECORD_DIRECT_REPAIR_SCOPE",expectedVersion:ro.version,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:ro.id}),data);}
export async function presentRepairEstimate(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){
  const context=deps(input),data=normalizeEstimate(value,context.now()),{ro,user}=await mutationContext(actor,repairOrderId,context);
  const reviewValue=(value as Record<string,unknown>).manualLaborReview;
  if(reviewValue!==undefined || data.lineItems.some(line=>line.type==="LABOR")){
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
  if(selectedCatalog.length || controlValue!==undefined){
    const controls=checkEstimateControls(ro.vehicle.id,data.lineItems,validateEstimateControls(controlValue),selectedCatalog,data.taxCents);
    const activeRate=await getActiveLaborRate(user);
    if(controls.pricing.laborRate!==activeRate.laborRate){
      if(!canManageSettings(user))throw new Error("Only an administrator may override the active shop labor rate. Use the current shop rate and repeat review.");
      if(!controls.pricing.overrideReason?.trim())throw new Error("An administrator rate override reason is required.");
    }
    data.assumptions=[data.assumptions,`Estimate controls v1 (staff reviewed, not independently verified): ${JSON.stringify(controls)}`,`Labor provenance: ${JSON.stringify(selectedCatalog.map(operation=>{const baseline=repairBaselineForId(operation.id);return{operationId:operation.id,source:"INTERNAL_AUTHORED",version:baseline?.version??"labor-taxonomy-v1",validatedStandard:false,proposedMinutes:Math.round(operation.hours*60),...(baseline?{scope:baseline.operation}:{})};}))}`].filter(Boolean).join("\n");
  }
  // Keep the original version on retries so the command ledger can replay the same result.
  const suppliedVersion=(value as Record<string,unknown>).expectedVersion;
  if(suppliedVersion!==undefined&&(!Number.isInteger(suppliedVersion)||Number(suppliedVersion)<0))throw new Error("Expected version must be a non-negative integer.");
  const expectedVersion=suppliedVersion===undefined?ro.version:Number(suppliedVersion);
  return context.repository.estimate(command({actorUserId:user.id,commandType:"PRESENT_ESTIMATE_VERSION",expectedVersion,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:ro.id}),data);
}
export async function decideRepairAuthorization(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeAuthorization(value),{ro,user}=await mutationContext(actor,repairOrderId,context);return context.repository.authorization(command({actorUserId:user.id,commandType:"DECIDE_ESTIMATE_AUTHORIZATION",expectedVersion:ro.version,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:ro.id}),data);}
export async function createAuthorizedRepairJob(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeJob(value),{ro,user}=await mutationContext(actor,repairOrderId,context);return context.repository.job(command({actorUserId:user.id,commandType:"CREATE_AUTHORIZED_REPAIR_JOB",expectedVersion:ro.version,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:ro.id}),{...data,createdByUserId:user.id});}

export async function createApprovedRepairJobs(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Approved repair-job request must be an object.");
  const raw=value as Record<string,unknown>,idempotencyKey=typeof raw.idempotencyKey==="string"?raw.idempotencyKey.trim():"",reason=typeof raw.reason==="string"?raw.reason.trim():"";
  if(!idempotencyKey)throw new Error("Idempotency key is required.");
  if(!reason)throw new Error("Business reason is required.");
  const order=await getShopPlanningDetail(actor,repairOrderId,input),estimate=order.estimateVersions[0]??null;
  if(!estimate)throw new Error("A presented estimate is required before repair jobs can be created.");
  const latestAuthorization=estimate.authorizations[0]??null;
  if(!latestAuthorization||!["ACCEPTED","PARTIAL"].includes(latestAuthorization.disposition))throw new Error("The latest estimate decision must approve work before repair jobs can be created.");
  const authorizedKeys=Array.isArray(latestAuthorization.authorizedLineKeys)?latestAuthorization.authorizedLineKeys.filter((item):item is string=>typeof item==="string"):[];
  const lines=Array.isArray(estimate.lineItems)?estimate.lineItems as unknown as Array<{description:string;key:string;laborGuideMinutes:number;plannedCorrection:string;type:string;workTypeCode:string}>:[];
  const existingKeys=new Set(order.repairJobs.map(job=>job.authorizedLineKey));
  const executable=lines.filter(line=>line.type==="LABOR"&&authorizedKeys.includes(line.key)&&!existingKeys.has(line.key));
  if(!executable.length){
    const approvedLabor=lines.some(line=>line.type==="LABOR"&&authorizedKeys.includes(line.key));
    if(approvedLabor&&order.repairJobs.length)return{duplicate:true,result:{createdJobs:[],message:"All approved labor already has a repair job."},version:order.version};
    throw new Error("The approved scope does not contain an executable labor line.");
  }
  const diagnosisVersionId=order.diagnosisVersions[0]?.id??null;
  const availableDemands=order.partDemands.filter(demand=>!demand.repairJobId&&!["CANCELLED","RELEASED"].includes(demand.status)).map(demand=>demand.id);
  const approvedPartsRequired=lines.some(line=>line.type==="PART"&&authorizedKeys.includes(line.key));
  const createdJobs=[];
  for(const [index,line] of executable.entries()){
    const result=await createAuthorizedRepairJob(actor,repairOrderId,{authorizationId:latestAuthorization.id,authorizedLineKey:line.key,bayRequirements:[],dependencyJobIds:[],description:line.description,diagnosisVersionId,idempotencyKey:`${idempotencyKey}:${line.key}`,laborGuideMinutes:line.laborGuideMinutes,partDemandIds:index===0?availableDemands:[],partsRequired:index===0&&(approvedPartsRequired||availableDemands.length>0),plannedCorrection:line.plannedCorrection,priority:"NORMAL",reason,requiredCertifications:[],requiredSkills:[],toolRequirements:[],workTypeCode:line.workTypeCode},input);
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
