import { createHash, randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { describeVehicleOperationsBlock, evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability, type VehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { normalizeDemandCancel,normalizeDemandCreate,normalizePartCreate,normalizeReservation,normalizeReservationRelease,normalizeStockLocationCreate,normalizeStockMovement } from "./domain";
import { createPartsLedgerRepository,type PartsLedgerRepository } from "./repository";
type Dependencies={repairOrderId?:string;enforceRollout?:boolean;foundationRepository?:EnterpriseCommandRepository;organizationId?:string;repository?:PartsLedgerRepository};
function deps(input:Dependencies){return{enforceRollout:input.enforceRollout??true,foundationRepository:input.foundationRepository??createEnterpriseCommandRepository(),organizationId:input.organizationId??INITIAL_ORGANIZATION.id,repository:input.repository??createPartsLedgerRepository()};}
async function authorize(actor:AuthenticatedUser|null,capability:VehicleCapability,input:ReturnType<typeof deps>,mutation=false,locationId:string|null=null){const user=assertAuthenticatedUser(actor);const grants=await input.foundationRepository.listCapabilityGrants(user.id,input.organizationId);assertVehicleCapability({actor:user,capability,grants,locationId});if(mutation&&input.enforceRollout){const flags=await input.foundationRepository.listFeatureFlags(input.organizationId);const decision=evaluateVehicleOperationsFeature(flags,"PARTS_OPERATIONS",user.id,locationId);if(!decision.executable)throw new Error(`Parts Operations mutations are not enabled. ${describeVehicleOperationsBlock(decision.reason)}`);}return user;}
function command(input:{actorUserId:string;commandType:string;expectedVersion?:number;idempotencyKey:string;locationId?:string|null;organizationId:string;payload:Record<string,unknown>;reason:string;subjectId:string;subjectType:string}){return normalizeEnterpriseCommand({...input,domain:"PARTS_OPERATIONS",expectedVersion:input.expectedVersion??0,locationId:input.locationId??null});}
export async function getPartsWorkspace(actor: AuthenticatedUser | null, query = "", input: Dependencies = {}) {
  const context = deps(input);
  await authorize(actor, "PARTS_VIEW", context);
  if (input.repairOrderId) {
    const order = await context.repository.repairOrderSite(context.organizationId, input.repairOrderId);
    if (!order || order.closedAt) throw new Error("Open repair order was not found.");
    await authorize(actor, "PARTS_VIEW", context, false, order.locationId);
  }
  return input.repairOrderId
    ? context.repository.overview(context.organizationId, query, input.repairOrderId)
    : context.repository.overview(context.organizationId, query);
}
function stableCreationId(organizationId: string, action: string, key: string) {
  const hex = createHash("sha256").update(JSON.stringify(["parts-ledger", organizationId, action, key])).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${((parseInt(hex[16], 16) & 3) | 8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export async function createPart(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizePartCreate(value);
  assertAuthenticatedUser(actor);
  const repairOrderId = (value as { repairOrderId?: unknown }).repairOrderId;
  const order = typeof repairOrderId === "string" && repairOrderId ? await context.repository.repairOrderSite(context.organizationId, repairOrderId) : null;
  if (repairOrderId && (!order || order.closedAt)) throw new Error("Select an open repair order before adding a part.");
  const user = await authorize(actor, "PARTS_MANAGE", context, true, order?.locationId ?? null);
  const prior = await context.repository.commandReceipt(context.organizationId, "CREATE_PART", data.idempotencyKey);
  const id = prior?.subjectId ?? stableCreationId(context.organizationId, "CREATE_PART", data.idempotencyKey);
  return context.repository.createPart(command({ actorUserId: user.id, commandType: "CREATE_PART", idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: data, reason: data.reason, subjectId: id, subjectType: "PART" }), data);
}
export async function createPartStockLocation(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeStockLocationCreate(value), user = await authorize(actor, "PARTS_MANAGE", context, true, data.locationId);
  const prior = await context.repository.commandReceipt(context.organizationId, "CREATE_PART_STOCK_LOCATION", data.idempotencyKey);
  const id = prior?.subjectId ?? stableCreationId(context.organizationId, "CREATE_PART_STOCK_LOCATION", data.idempotencyKey);
  return context.repository.createLocation(command({ actorUserId: user.id, commandType: "CREATE_PART_STOCK_LOCATION", idempotencyKey: data.idempotencyKey, locationId: data.locationId, organizationId: context.organizationId, payload: data, reason: data.reason, subjectId: id, subjectType: "PART_STOCK_LOCATION" }), data);
}
export async function recordPartStockMovement(actor:AuthenticatedUser|null,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeStockMovement(value),user=await authorize(actor,"PARTS_MANAGE",context,true),id=randomUUID();return context.repository.moveStock(command({actorUserId:user.id,commandType:`RECORD_PART_${data.movementType}`,idempotencyKey:data.idempotencyKey,organizationId:context.organizationId,payload:data,reason:data.reason,subjectId:id,subjectType:"PART_LEDGER_ENTRY"}),{...data,actorUserId:user.id});}
export async function createRepairPartDemand(actor: AuthenticatedUser | null, repairOrderId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeDemandCreate(value);
  assertAuthenticatedUser(actor);
  const order = await context.repository.repairOrderSite(context.organizationId, repairOrderId);
  if (!order) throw new Error("Repair order was not found.");
  const user = await authorize(actor, "PARTS_MANAGE", context, true, order.locationId);
  const prior = await context.repository.commandReceipt(context.organizationId, "CREATE_REPAIR_PART_DEMAND", data.idempotencyKey);
  const expectedVersion = prior?.expectedVersion ?? await context.repository.getPartsVersion(context.organizationId, repairOrderId);
  return context.repository.createDemand(command({ actorUserId: user.id, commandType: "CREATE_REPAIR_PART_DEMAND", expectedVersion, idempotencyKey: data.idempotencyKey, locationId: prior ? prior.locationId : order.locationId, organizationId: context.organizationId, payload: data, reason: data.reason, subjectId: repairOrderId, subjectType: "REPAIR_ORDER_PARTS" }), { ...data, actorUserId: user.id });
}
export async function cancelRepairPartDemand(actor:AuthenticatedUser|null,repairOrderId:string,demandId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeDemandCancel(value),user=await authorize(actor,"PARTS_MANAGE",context,true),expectedVersion=await context.repository.getPartsVersion(context.organizationId,repairOrderId);return context.repository.cancelDemand(command({actorUserId:user.id,commandType:"CANCEL_REPAIR_PART_DEMAND",expectedVersion,idempotencyKey:data.idempotencyKey,organizationId:context.organizationId,payload:{demandId},reason:data.reason,subjectId:repairOrderId,subjectType:"REPAIR_ORDER_PARTS"}),demandId);}
export async function reserveRepairPart(actor:AuthenticatedUser|null,repairOrderId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeReservation(value); assertAuthenticatedUser(actor); const site=await context.repository.repairOrderSite(context.organizationId,repairOrderId); if(!site) throw new Error("Repair order was not found."); const user=await authorize(actor,"PARTS_MANAGE",context,true,site.locationId),prior=await context.repository.commandReceipt(context.organizationId,"RESERVE_REPAIR_PART",data.idempotencyKey),expectedVersion=prior?.expectedVersion ?? await context.repository.getPartsVersion(context.organizationId,repairOrderId);return context.repository.reserve(command({actorUserId:user.id,commandType:"RESERVE_REPAIR_PART",expectedVersion,locationId:prior ? prior.locationId : site.locationId,idempotencyKey:data.idempotencyKey,organizationId:context.organizationId,payload:data,reason:data.reason,subjectId:repairOrderId,subjectType:"REPAIR_ORDER_PARTS"}),{...data,actorUserId:user.id});}
export async function releaseRepairPartReservation(actor:AuthenticatedUser|null,repairOrderId:string,reservationId:string,value:unknown,input:Dependencies={}){const context=deps(input),data=normalizeReservationRelease(value),user=await authorize(actor,"PARTS_MANAGE",context,true),expectedVersion=await context.repository.getPartsVersion(context.organizationId,repairOrderId);return context.repository.releaseReservation(command({actorUserId:user.id,commandType:"RELEASE_REPAIR_PART_RESERVATION",expectedVersion,idempotencyKey:data.idempotencyKey,organizationId:context.organizationId,payload:{reservationId},reason:data.reason,subjectId:repairOrderId,subjectType:"REPAIR_ORDER_PARTS"}),reservationId,user.id);}
export async function getRepairPartsReadiness(actor:AuthenticatedUser|null,repairOrderId:string,input:Dependencies={}){const context=deps(input);await authorize(actor,"PARTS_VIEW",context);const result=await context.repository.getRepairReadiness(context.organizationId,repairOrderId);if(!result)throw new Error("Repair order was not found.");return result;}
