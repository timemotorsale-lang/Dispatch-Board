import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { isSameRepairOrderConcern, normalizeRepairOrderControlUpdate, normalizeRepairOrderCreate, normalizeRepairOrderDuplicateClose, normalizeRepairOrderNoWorkClose, repairOrderAge } from "./domain";
import { createRepairOrderRepository, type RepairOrderRepository } from "./repository";
import { closeRepairOrderTasks, reconcileRepairOrderOwnerTask } from "./task-bridge";

type RepairOrderTaskBridge = {
  close(organizationId: string, repairOrderId: string, actorUserId: string, reason: string): Promise<unknown>;
  reconcileOwner(organizationId: string, repairOrderId: string, actorUserId: string): Promise<unknown>;
};
const liveTaskBridge: RepairOrderTaskBridge = { close: closeRepairOrderTasks, reconcileOwner: reconcileRepairOrderOwnerTask };
const testTaskBridge: RepairOrderTaskBridge = { close: async () => null, reconcileOwner: async () => null };
type Dependencies = { enforceRollout?: boolean; foundationRepository?: EnterpriseCommandRepository; now?: () => Date; organizationId?: string; repository?: RepairOrderRepository; taskBridge?: RepairOrderTaskBridge };
function deps(input: Dependencies) { return { enforceRollout: input.enforceRollout ?? true, foundationRepository: input.foundationRepository ?? createEnterpriseCommandRepository(), now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createRepairOrderRepository(), taskBridge: input.taskBridge ?? (input.repository ? testTaskBridge : liveTaskBridge) }; }
async function authorize(actor: AuthenticatedUser|null,capability:VehicleCapability,locationId:string|null,input:ReturnType<typeof deps>,mutation=false){const user=assertAuthenticatedUser(actor);const grants=await input.foundationRepository.listCapabilityGrants(user.id,input.organizationId);assertVehicleCapability({actor:user,capability,grants,locationId,now:input.now()});if(mutation&&input.enforceRollout){const flags=await input.foundationRepository.listFeatureFlags(input.organizationId);const decision=evaluateVehicleOperationsFeature(flags,"SHOP_OPERATIONS",user.id,locationId);if(!decision.executable)throw new Error(`Shop Operations mutations are not enabled (${decision.reason}).`);}return user;}
function command(input:{actorUserId:string;commandType:string;expectedVersion:number;idempotencyKey:string;locationId:string;organizationId:string;payload:Record<string,unknown>;reason:string;subjectId:string}){return normalizeEnterpriseCommand({...input,domain:"SHOP_OPERATIONS",subjectType:"REPAIR_ORDER"});}
export async function listRepairOrders(actor:AuthenticatedUser|null,query:{page?:unknown;pageSize?:unknown;query?:unknown;state?:unknown;vehicleId?:unknown},input:Dependencies={}){const context=deps(input);await authorize(actor,"REPAIR_ORDER_VIEW",null,context);const page=Math.max(1,Number(query.page)||1);const pageSize=Math.min(100,Math.max(1,Number(query.pageSize)||25));const result=await context.repository.search(context.organizationId,{page,pageSize,query:typeof query.query==="string"?query.query:"",state:typeof query.state==="string"?query.state:undefined,vehicleId:typeof query.vehicleId==="string"&&query.vehicleId.trim()?query.vehicleId.trim():undefined});const now=context.now();return{...result,items:result.items.map(item=>({...item,age:repairOrderAge({now,openedAt:item.openedAt,stageStartedAt:item.stageStartedAt,targetAt:item.targetAt})}))};}
export async function getRepairOrderDetail(actor:AuthenticatedUser|null,id:string,input:Dependencies={}){const context=deps(input);await authorize(actor,"REPAIR_ORDER_VIEW",null,context);const ro=await context.repository.getDetail(context.organizationId,id);if(!ro)throw new Error("Repair order was not found.");return{...ro,age:repairOrderAge({now:context.now(),openedAt:ro.openedAt,stageStartedAt:ro.stageStartedAt,targetAt:ro.targetAt})};}
export async function getRepairOrderCreateOptions(actor:AuthenticatedUser|null,input:Dependencies={}){const context=deps(input);await authorize(actor,"REPAIR_ORDER_VIEW",null,context);return context.repository.getCreateOptions(context.organizationId);}
export async function createRepairOrder(actor:AuthenticatedUser|null,value:unknown,input:Dependencies={}){
  const context=deps(input);
  const now=context.now();
  const normalized=normalizeRepairOrderCreate(value,now);
  const user=await authorize(actor,"REPAIR_ORDER_MANAGE",normalized.locationId,context,true);
  if(normalized.appointmentId){const existing=await context.repository.findByAppointment(context.organizationId,normalized.appointmentId);if(existing){await context.taskBridge.reconcileOwner(context.organizationId,existing.id,user.id);return{duplicate:true,result:existing,version:existing.version};}}
  const concernCandidates=await context.repository.findOpenConcernCandidates(context.organizationId,{appointmentId:normalized.appointmentId,inventoryUnitId:normalized.inventoryUnitId,vehicleId:normalized.vehicleId});
  const sameConcern=concernCandidates.find(candidate=>isSameRepairOrderConcern(candidate.concernSummary,normalized.concernSummary));
  const openVehicleOrder=sameConcern??concernCandidates[0];
  if(openVehicleOrder){await context.taskBridge.reconcileOwner(context.organizationId,openVehicleOrder.id,user.id);return{duplicate:true,result:{id:openVehicleOrder.id,repairOrderNumber:openVehicleOrder.repairOrderNumber,stage:openVehicleOrder.stage,operatingState:openVehicleOrder.operatingState,version:openVehicleOrder.version,duplicateReason:sameConcern?"OPEN_VEHICLE_CONCERN_MATCH":"OPEN_VEHICLE_REPAIR_ORDER"},version:openVehicleOrder.version};}
  await context.repository.validateReadinessSnapshot(context.organizationId,normalized,now);
  const id=randomUUID();
  const repairOrderNumber=`RO-${id.slice(0,8).toUpperCase()}`;
  const payload={...normalized,arrivedAt:normalized.arrivedAt.toISOString(),consentedAt:normalized.consentedAt?.toISOString()??null,promisedAt:normalized.promisedAt?.toISOString()??null,targetAt:normalized.targetAt.toISOString()};
  const result=await context.repository.create(command({actorUserId:user.id,commandType:"CREATE_REPAIR_ORDER",expectedVersion:0,idempotencyKey:normalized.idempotencyKey,locationId:normalized.locationId,organizationId:context.organizationId,payload,reason:normalized.reason,subjectId:id}),{...normalized,actorUserId:user.id,repairOrderNumber});
  await context.taskBridge.reconcileOwner(context.organizationId,id,user.id);
  return result;
}
export async function updateRepairOrderControl(actor:AuthenticatedUser|null,id:string,value:unknown,input:Dependencies={}){const context=deps(input);const normalized=normalizeRepairOrderControlUpdate(value);const user=await authorize(actor,"REPAIR_ORDER_MANAGE",normalized.locationId,context,true);const payload={locationId:normalized.locationId,nextAction:normalized.nextAction,operatingState:normalized.operatingState,ownerUserId:normalized.ownerUserId,stateReason:normalized.stateReason,targetAt:normalized.targetAt.toISOString()};const result=await context.repository.updateControl(command({actorUserId:user.id,commandType:"UPDATE_REPAIR_ORDER_CONTROL",expectedVersion:normalized.expectedVersion,idempotencyKey:normalized.idempotencyKey,locationId:normalized.locationId,organizationId:context.organizationId,payload,reason:normalized.reason,subjectId:id}),{...normalized,actorUserId:user.id});await context.taskBridge.reconcileOwner(context.organizationId,id,user.id);return result;}

export async function closeDuplicateRepairOrder(actor:AuthenticatedUser|null,id:string,value:unknown,input:Dependencies={}) {
  const context = deps(input);
  const normalized = normalizeRepairOrderDuplicateClose(value);
  const closeContext = await context.repository.getCloseContext(context.organizationId, id);
  if (!closeContext) throw new Error("Repair order was not found.");
  if (closeContext.closedAt) throw new Error("Repair order is already closed.");
  const user = await authorize(actor, "REPAIR_ORDER_MANAGE", closeContext.locationId, context, true);
  const occurredAt = context.now();
  const result = await context.repository.closeDuplicate(command({
    actorUserId: user.id,
    commandType: "CLOSE_DUPLICATE_REPAIR_ORDER",
    expectedVersion: normalized.expectedVersion,
    idempotencyKey: normalized.idempotencyKey,
    locationId: closeContext.locationId,
    organizationId: context.organizationId,
    payload: { duplicateOfRepairOrderId: normalized.duplicateOfRepairOrderId, occurredAt: occurredAt.toISOString() },
    reason: normalized.reason,
    subjectId: id,
  }), { actorUserId: user.id, duplicateOfRepairOrderId: normalized.duplicateOfRepairOrderId, occurredAt, reason: normalized.reason });
  await context.taskBridge.close(context.organizationId, id, user.id, normalized.reason);
  return result;
}

export async function closeRepairOrderNoFurtherWork(actor: AuthenticatedUser | null, id: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input);
  const normalized = normalizeRepairOrderNoWorkClose(value);
  const closeContext = await context.repository.getCloseContext(context.organizationId, id);
  if (!closeContext) throw new Error("Repair order was not found.");
  if (closeContext.closedAt) throw new Error("Repair order is already closed.");
  const user = await authorize(actor, "REPAIR_ORDER_MANAGE", closeContext.locationId, context, true);
  const occurredAt = context.now();
  const result = await context.repository.closeNoWork(command({
    actorUserId: user.id,
    commandType: "CLOSE_REPAIR_ORDER_NO_FURTHER_WORK",
    expectedVersion: normalized.expectedVersion,
    idempotencyKey: normalized.idempotencyKey,
    locationId: closeContext.locationId,
    organizationId: context.organizationId,
    payload: { occurredAt: occurredAt.toISOString() },
    reason: normalized.reason,
    subjectId: id,
  }), { actorUserId: user.id, occurredAt, reason: normalized.reason });
  await context.taskBridge.close(context.organizationId, id, user.id, normalized.reason);
  return result;
}
