import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository,type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertRepairReadEntry } from "@/server/repair-order/read-access";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { normalizeAdvisorUpdate,normalizeComebackCreate,normalizeComebackTransition,normalizeDeliveryReadiness,normalizePresence,normalizeProductionRequest,normalizeRepairVendor,normalizeVendorWorkCreate,normalizeVendorWorkReassign,normalizeVendorWorkUpdate } from "./domain";
import { createShopCompletionRepository,type ShopCompletionRepository } from "./repository";
import { buildShopReconProjection } from "@/server/shop-recon/projection";
type Dependencies={enforceRollout?:boolean;foundationRepository?:EnterpriseCommandRepository;now?:()=>Date;organizationId?:string;repository?:ShopCompletionRepository};
function deps(input:Dependencies){return{enforceRollout:input.enforceRollout??true,foundationRepository:input.foundationRepository??createEnterpriseCommandRepository(),now:input.now??(()=>new Date()),organizationId:input.organizationId??INITIAL_ORGANIZATION.id,repository:input.repository??createShopCompletionRepository()};}
async function authorize(actor:AuthenticatedUser|null,manage:boolean,locationId:string|null,context:ReturnType<typeof deps>,mutation=manage){const user=assertAuthenticatedUser(actor),grants=await context.foundationRepository.listCapabilityGrants(user.id,context.organizationId);assertVehicleCapability({actor:user,capability:manage?"REPAIR_ORDER_MANAGE":"REPAIR_ORDER_VIEW",grants,locationId,now:context.now()});if(mutation&&context.enforceRollout){const flags=await context.foundationRepository.listFeatureFlags(context.organizationId),decision=evaluateVehicleOperationsFeature(flags,"SHOP_OPERATIONS",user.id,locationId);if(!decision.executable)throw new Error(`Shop Operations mutations are not enabled (${decision.reason}).`);}return user;}
function payload(value:unknown){return JSON.parse(JSON.stringify(value)) as Record<string,unknown>;}
function command(input:{actorUserId:string;commandType:string;expectedVersion:number;idempotencyKey:string;locationId:string|null;organizationId:string;payload:Record<string,unknown>;reason:string;subjectId:string;subjectType:string}){return normalizeEnterpriseCommand({...input,domain:"SHOP_OPERATIONS"});}
export async function getShopCompletionWorkspace(actor:AuthenticatedUser|null,input:Dependencies={}){const context=deps(input);await authorize(actor,false,null,context);return context.repository.overview(context.organizationId);}
export async function getShopReconLanding(actor: AuthenticatedUser | null, input: Dependencies & { repairOrderId?: string } = {}) {
  const context = deps(input);
  const now = context.now();
  if (input.repairOrderId) {
    const { user, grants } = await assertRepairReadEntry(actor, context.organizationId, context.foundationRepository, now);
    const order = await context.repository.findRepairOrderLocation(context.organizationId, input.repairOrderId);
    if (!order) {
      const empty = buildShopReconProjection([], now);
      return { ...empty, reviews: { ...empty.reviews, comebacks: 0 } };
    }
    assertVehicleCapability({ actor: user, capability: "REPAIR_ORDER_VIEW", grants, locationId: order.locationId, now });
  } else {
    await authorize(actor, false, null, context);
  }
  const overview = await context.repository.overview(context.organizationId, input.repairOrderId);
  const exactOrder = input.repairOrderId ? overview.repairOrders.find(order => order.id === input.repairOrderId) : undefined;
  const scopedOrders = input.repairOrderId ? (exactOrder ? [exactOrder] : []) : overview.repairOrders;
  const evidence = await context.repository.workflowEvidence(context.organizationId, scopedOrders.map(order => order.id));
  const evidenceById = new Map(evidence.map(item => [item.id, item]));
  const orders = scopedOrders.map(order => {
    const detail = evidenceById.get(order.id);
    return {
      ...order, vehicleId: detail?.vehicle.id ?? order.vehicleId, vin: detail?.vehicle.vin ?? null,
      inventoryLifecycleStage: detail?.inventoryUnit?.lifecycleStage ?? null,
      inspectionVersions: detail?.inspectionVersions ?? [], diagnosisVersions: detail?.diagnosisVersions ?? [],
      shopReconLifecycle: detail?.shopReconLifecycle ?? null,
    };
  }).filter(order => input.repairOrderId || order.shopReconLifecycle?.operatingState !== "CLOSED");
  const projection = buildShopReconProjection(orders, now);
  return { ...projection, reviews: {
    ...projection.reviews, comebacks: input.repairOrderId ? 0 : overview.comebacks.filter(item => item.status !== "CLOSED").length,
  } };
}
async function model(context:ReturnType<typeof deps>){return context.repository.overview(context.organizationId);}
export async function reportTechnicianFinding(actor: AuthenticatedUser | null, repairOrderId: string, value: Record<string, unknown>, input: Dependencies = {}) {
  return recordTechnicianNote(actor, repairOrderId, value, "finding", input);
}

export async function recordTechnicianProgress(actor: AuthenticatedUser | null, repairOrderId: string, value: Record<string, unknown>, input: Dependencies = {}) {
  return recordTechnicianNote(actor, repairOrderId, value, "progress", input);
}

async function recordTechnicianNote(actor: AuthenticatedUser | null, repairOrderId: string, value: Record<string, unknown>, kind: "finding" | "progress", input: Dependencies) {
  const context = deps(input);
  await assertRepairReadEntry(actor, context.organizationId, context.foundationRepository, context.now());
  const order = await context.repository.findRepairOrderLocation(context.organizationId, repairOrderId);
  if (!order) throw new Error("Repair order was not found.");
  const user = await authorize(actor, false, order.locationId, context, true);
  const jobId = typeof value.jobId === "string" ? value.jobId.trim() : "";
  const rawNote = value[kind];
  const note = typeof rawNote === "string" ? rawNote.trim() : "";
  const progress = kind === "progress";
  if (!jobId || jobId.length > 100 || !note || note.length > 1000) {
    throw new Error(progress ? "Choose a repair job and enter a progress note of up to 1,000 characters." : "Choose a repair job and enter a finding of up to 1,000 characters.");
  }
  const data = normalizeAdvisorUpdate({
    contactChannel: "INTERNAL", contactDirection: "INTERNAL", contactOutcome: progress ? "Technician progress note" : "Technician finding for advisor review",
    customerVisibleSummary: progress ? "The repair team recorded a progress update." : "The repair team recorded a finding for advisor review.",
    statusCode: progress ? "TECHNICIAN_PROGRESS" : "TECHNICIAN_FINDING", exceptionCodes: [],
    occurredAt: value.occurredAt, idempotencyKey: value.idempotencyKey,
    reason: progress ? "Record technician progress on the assigned repair job." : "Report a technician finding for advisor review.",
  });
  const subjectType = progress ? "REPAIR_ORDER_TECHNICIAN_PROGRESS" : "REPAIR_ORDER_TECHNICIAN_FINDING";
  const version = await context.repository.aggregateVersion(context.organizationId, subjectType, repairOrderId);
  // A retry must keep the same request identity after the first save advances the aggregate version.
  const entry = command({
    actorUserId: user.id, commandType: progress ? "RECORD_TECHNICIAN_PROGRESS" : "REPORT_TECHNICIAN_FINDING", expectedVersion: 0,
    idempotencyKey: data.idempotencyKey, locationId: order.locationId, organizationId: context.organizationId,
    payload: payload({ ...data, jobId, [kind]: note }), reason: data.reason, subjectId: repairOrderId, subjectType,
  });
  return context.repository.advisor({ ...entry, expectedVersion: version }, { ...data, authorUserId: user.id },
    { jobId, manager: isManager(user), text: note });
}
export async function recordAdvisorUpdate(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeAdvisorUpdate(value),view=await model(context),order=view.repairOrders.find(x=>x.id===repairOrderId);if(!order)throw new Error("Repair order was not found.");const user=await authorize(actor,true,order.locationId,context),version=await context.repository.aggregateVersion(context.organizationId,"REPAIR_ORDER",order.id);return context.repository.advisor(command({actorUserId:user.id,commandType:"RECORD_ADVISOR_SERVICE_UPDATE",expectedVersion:version,idempotencyKey:data.idempotencyKey,locationId:order.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:order.id,subjectType:"REPAIR_ORDER"}),{...data,authorUserId:user.id});}
export async function listRepairVendors(actor:AuthenticatedUser|null,input:Dependencies={}){const context=deps(input);await authorize(actor,false,null,context);return context.repository.listRepairVendors(context.organizationId);}
export async function createRepairVendor(actor:AuthenticatedUser|null,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeRepairVendor(value),user=await authorize(actor,true,null,{...context,enforceRollout:false}),id=randomUUID();return context.repository.createRepairVendor(command({actorUserId:user.id,commandType:"CREATE_REPAIR_VENDOR",expectedVersion:0,idempotencyKey:data.idempotencyKey,locationId:null,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:id,subjectType:"REPAIR_VENDOR"}),{...data,createdByUserId:user.id});}
export async function createRepairVendorWork(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeVendorWorkCreate(value),view=await model(context),order=view.repairOrders.find(x=>x.id===repairOrderId);if(!order)throw new Error("Repair order was not found.");await authorize(actor,true,order.locationId,{...context,enforceRollout:false});const active=order.vendorWorks.find(work=>!["RETURNED","QC_REQUIRED","COMPLETED","CANCELLED"].includes(work.status));if(active&&!data.allowParallelVendorWork)return{duplicate:true,result:{id:active.id,status:active.status,vendorName:active.vendorName,version:active.version}};const user=assertAuthenticatedUser(actor),version=await context.repository.aggregateVersion(context.organizationId,"REPAIR_ORDER",order.id),vendorWorkId=randomUUID();return context.repository.createVendorWork(command({actorUserId:user.id,commandType:"CREATE_REPAIR_VENDOR_WORK",expectedVersion:version,idempotencyKey:data.idempotencyKey,locationId:order.locationId,organizationId:context.organizationId,payload:payload({...data,vendorWorkId}),reason:data.reason,subjectId:order.id,subjectType:"REPAIR_ORDER"}),{...data,createdByUserId:user.id});}
export async function updateRepairVendorWork(actor:AuthenticatedUser|null,repairOrderId:string,vendorWorkId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeVendorWorkUpdate(value),view=await model(context),order=view.repairOrders.find(x=>x.id===repairOrderId&&x.vendorWorks.some(work=>work.id===vendorWorkId));if(!order)throw new Error("Outside repair work was not found.");const user=await authorize(actor,true,order.locationId,{...context,enforceRollout:false}),version=await context.repository.aggregateVersion(context.organizationId,"REPAIR_ORDER",order.id);return context.repository.updateVendorWork(command({actorUserId:user.id,commandType:"UPDATE_REPAIR_VENDOR_WORK",expectedVersion:version,idempotencyKey:data.idempotencyKey,locationId:order.locationId,organizationId:context.organizationId,payload:payload({...data,vendorWorkId}),reason:data.reason,subjectId:order.id,subjectType:"REPAIR_ORDER"}),{...data,actorUserId:user.id,vendorWorkId});}
export async function reassignRepairVendorWork(actor:AuthenticatedUser|null,repairOrderId:string,vendorWorkId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeVendorWorkReassign(value),view=await model(context),order=view.repairOrders.find(x=>x.id===repairOrderId&&x.vendorWorks.some(work=>work.id===vendorWorkId));if(!order)throw new Error("Outside repair work was not found.");const user=await authorize(actor,true,order.locationId,{...context,enforceRollout:false}),version=await context.repository.aggregateVersion(context.organizationId,"REPAIR_ORDER",order.id);return context.repository.reassignVendorWork(command({actorUserId:user.id,commandType:"REASSIGN_REPAIR_VENDOR_WORK",expectedVersion:version,idempotencyKey:data.idempotencyKey,locationId:order.locationId,organizationId:context.organizationId,payload:payload({...data,vendorWorkId}),reason:data.reason,subjectId:order.id,subjectType:"REPAIR_ORDER"}),{...data,actorUserId:user.id,vendorWorkId});}
export async function evaluateDeliveryReadiness(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeDeliveryReadiness(value),view=await model(context),order=view.repairOrders.find(x=>x.id===repairOrderId);if(!order)throw new Error("Repair order was not found.");const user=await authorize(actor,true,order.locationId,context),version=await context.repository.aggregateVersion(context.organizationId,"REPAIR_ORDER",order.id);return context.repository.delivery(command({actorUserId:user.id,commandType:"EVALUATE_DELIVERY_READINESS",expectedVersion:version,idempotencyKey:data.idempotencyKey,locationId:order.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:order.id,subjectType:"REPAIR_ORDER"}),{...data,evaluatorUserId:user.id});}
export async function createRepairComeback(actor:AuthenticatedUser|null,originalRepairJobId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeComebackCreate(value),view=await model(context),order=view.repairOrders.find(x=>x.repairJobs.some(job=>job.id===originalRepairJobId));if(!order)throw new Error("Original repair job was not found.");const user=await authorize(actor,true,order.locationId,context),id=randomUUID();return context.repository.createComeback(command({actorUserId:user.id,commandType:"CREATE_REPAIR_COMEBACK",expectedVersion:0,idempotencyKey:data.idempotencyKey,locationId:order.locationId,organizationId:context.organizationId,payload:payload({...data,originalRepairJobId}),reason:data.reason,subjectId:id,subjectType:"COMEBACK_CASE"}),{...data,createdByUserId:user.id});}
export async function transitionRepairComeback(actor:AuthenticatedUser|null,caseId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeComebackTransition(value),view=await model(context),record=view.comebacks.find(x=>x.id===caseId);if(!record)throw new Error("Comeback case was not found.");const order=view.repairOrders.find(x=>x.id===record.originalRepairOrderId),user=await authorize(actor,true,order?.locationId??null,context),version=await context.repository.aggregateVersion(context.organizationId,"COMEBACK_CASE",caseId);return context.repository.transitionComeback(command({actorUserId:user.id,commandType:"TRANSITION_REPAIR_COMEBACK",expectedVersion:version,idempotencyKey:data.idempotencyKey,locationId:order?.locationId??null,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:caseId,subjectType:"COMEBACK_CASE"}),{...data,actorUserId:user.id});}
export async function recordTechnicianPresence(actor:AuthenticatedUser|null,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizePresence(value),user=await authorize(actor,true,data.locationId,context),id=randomUUID();return context.repository.presence(command({actorUserId:user.id,commandType:"RECORD_TECHNICIAN_PRESENCE",expectedVersion:0,idempotencyKey:data.idempotencyKey,locationId:data.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:id,subjectType:"TECHNICIAN_PRESENCE"}),{...data,recordedByUserId:user.id});}
export async function generateShopProductionSnapshot(actor:AuthenticatedUser|null,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeProductionRequest(value),user=await authorize(actor,true,data.locationId,context),id=randomUUID();return context.repository.production(command({actorUserId:user.id,commandType:"GENERATE_SHOP_PRODUCTION_SNAPSHOT",expectedVersion:0,idempotencyKey:data.idempotencyKey,locationId:data.locationId,organizationId:context.organizationId,payload:payload(data),reason:data.reason,subjectId:id,subjectType:"SHOP_PRODUCTION_SNAPSHOT"}),{...data,calculatedAt:context.now(),generatedByUserId:user.id});}
