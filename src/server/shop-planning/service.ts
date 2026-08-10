import type { AuthenticatedUser } from "@/server/auth/store";
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
async function mutationContext(actor:AuthenticatedUser|null,repairOrderId:string,context:ReturnType<typeof deps>){const ro=await context.repository.get(context.organizationId,repairOrderId);if(!ro)throw new Error("Repair order was not found.");const user=await authorize(actor,true,ro.locationId,context);return{ro,user};}
function command(input:{actorUserId:string;commandType:string;expectedVersion:number;idempotencyKey:string;locationId:string;organizationId:string;payload:Record<string,unknown>;reason:string;subjectId:string}){return normalizeEnterpriseCommand({...input,domain:"SHOP_OPERATIONS",subjectType:"REPAIR_ORDER"});}
export async function getShopPlanningWorkspace(actor:AuthenticatedUser|null,input:Dependencies={}){const context=deps(input);await authorize(actor,false,null,context);return context.repository.list(context.organizationId);}
export async function getShopPlanningDetail(actor:AuthenticatedUser|null,repairOrderId:string,input:Dependencies={}){const context=deps(input);await authorize(actor,false,null,context);const result=await context.repository.get(context.organizationId,repairOrderId);if(!result)throw new Error("Repair order was not found.");return result;}
export async function recordVehicleInspection(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeInspection(value),{ro,user}=await mutationContext(actor,repairOrderId,context);return context.repository.inspection(command({actorUserId:user.id,commandType:"RECORD_DVI_VERSION",expectedVersion:ro.version,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:ro.id}),{...data,authorUserId:user.id});}
export async function recordRepairDiagnosis(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeDiagnosis(value),{ro,user}=await mutationContext(actor,repairOrderId,context);return context.repository.diagnosis(command({actorUserId:user.id,commandType:"RECORD_DIAGNOSIS_VERSION",expectedVersion:ro.version,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:ro.id}),data);}
export async function recordDirectRepairScope(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeDirectRepairScope(value),{ro,user}=await mutationContext(actor,repairOrderId,context);return context.repository.directRepairScope(command({actorUserId:user.id,commandType:"RECORD_DIRECT_REPAIR_SCOPE",expectedVersion:ro.version,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:ro.id}),data);}
export async function presentRepairEstimate(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeEstimate(value,context.now()),{ro,user}=await mutationContext(actor,repairOrderId,context);return context.repository.estimate(command({actorUserId:user.id,commandType:"PRESENT_ESTIMATE_VERSION",expectedVersion:ro.version,idempotencyKey:data.idempotencyKey,locationId:ro.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:ro.id}),data);}
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
