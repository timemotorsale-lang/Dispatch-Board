import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { executeAggregateMutation,toJson } from "@/server/enterprise-command/aggregate-mutation";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import { determineShopHandoff } from "@/server/inventory/shop-operations";
import { evaluateInspection,type QualityCheck } from "./domain";

export function createQualityControlRepository(database:PrismaClient=prisma){return{
  async aggregateVersion(organizationId:string,subjectType:string,subjectId:string){const row=await database.enterpriseAggregateVersion.findUnique({where:{organizationId_domain_subjectType_subjectId:{organizationId,domain:"SHOP_OPERATIONS",subjectType,subjectId}},select:{version:true}});return row?.version??0;},
  async synchronizeLifecycleAfterInspection(organizationId:string,jobId:string){return database.$transaction(async tx=>{const job=await tx.repairJob.findFirst({where:{id:jobId,organizationId},include:{repairOrder:true,qualityInspections:{orderBy:{version:"desc"},take:1}}}),inspection=job?.qualityInspections[0];if(!job||!inspection)return null;const lifecycle=await tx.shopReconLifecycle.findUnique({where:{repairOrderId:job.repairOrderId}});if(!lifecycle)return null;const correlationId=`shop-qc:${inspection.id}`,existing=await tx.shopReconLifecycleEvent.findFirst({where:{lifecycleId:lifecycle.id,correlationId}});if(existing)return existing;const aggregateKey={organizationId_domain_subjectType_subjectId:{organizationId,domain:"SHOP_RECON",subjectType:"SHOP_RECON_LIFECYCLE",subjectId:job.repairOrderId}},aggregate=await tx.enterpriseAggregateVersion.findUnique({where:aggregateKey}),version=(aggregate?.version??lifecycle.version)+1,passed=inspection.disposition==="PASSED",stage=passed?"QUALITY_CONTROL_ROAD_TEST":"REPAIR_EXECUTION",state=passed?"ACTIVE":"REWORK",blockers=passed?[]:["BLK-QC-FAILED",...((inspection.failureReasonCodes as string[]|null)??[])];if(aggregate)await tx.enterpriseAggregateVersion.update({where:{id:aggregate.id},data:{version}});else await tx.enterpriseAggregateVersion.create({data:{organizationId,locationId:job.repairOrder.locationId,domain:"SHOP_RECON",subjectType:"SHOP_RECON_LIFECYCLE",subjectId:job.repairOrderId,version}});await tx.shopReconLifecycle.update({where:{id:lifecycle.id},data:{stage,operatingState:state,stageStartedAt:inspection.inspectedAt,zoneCode:passed?"Z10_QC":"Z08_REPAIR_BAY",nextAction:passed?"Confirm release readiness and receiving-owner acceptance.":`Rework the failed QC findings and submit a fresh inspection: ${inspection.reworkInstructions??"See failed checks."}`,blockerCodes:toJson(blockers),version}});return tx.shopReconLifecycleEvent.create({data:{organizationId,lifecycleId:lifecycle.id,repairOrderId:job.repairOrderId,sequence:version,eventType:passed?"QC_PASSED":"QC_FAILED_REWORK",fromStage:lifecycle.stage,toStage:stage,fromOperatingState:lifecycle.operatingState,toOperatingState:state,scopeVersion:lifecycle.scopeVersion,actorUserId:inspection.inspectorUserId,reason:passed?"Fresh QC inspection passed.":inspection.reworkInstructions??"QC inspection failed and requires rework.",payload:toJson({inspectionId:inspection.id,repairJobId:job.id,failureReasonCodes:inspection.failureReasonCodes,roadTestOutcome:inspection.roadTestOutcome}),correlationId,occurredAt:inspection.inspectedAt}});});},
  async overview(organizationId:string){
    const[repairOrders,users]=await Promise.all([
      database.repairOrder.findMany({
        where:{
          organizationId,
          closedAt:null,
          OR:[
            {repairJobs:{some:{status:{in:["READY_FOR_QC","QC_PASSED","READY_FOR_REPAIR"]}}}},
            {vendorWorks:{some:{status:{in:["RETURNED","QC_REQUIRED"]}}}}
          ]
        },
        orderBy:{targetAt:"asc"},
        include:{
          vehicle:{select:{vehicleNumber:true,year:true,make:true,model:true}},
          customer:{select:{displayName:true}},
          inventoryUnit:{select:{inventoryNumber:true}},
          location:{select:{id:true,name:true}},
          serviceVisit:{select:{concernSummary:true,promisedAt:true}},
          releaseAuthorization:true,
          vendorWorks:{orderBy:{updatedAt:"desc"},take:5,select:{id:true,approvalStatus:true,currentLocation:true,expectedReturnAt:true,lastUpdateSummary:true,nextAction:true,scope:true,sentFrom:true,status:true,transportMethod:true,vendorName:true}},
          repairJobs:{where:{status:{not:"CANCELLED"}},orderBy:{createdAt:"asc"},include:{procedureVersion:true,comebackCases:{orderBy:{reportedAt:"desc"},take:3,select:{id:true,status:true,reasonCategory:true,reportedConcern:true}},partDemands:{include:{part:{select:{partNumber:true,description:true}}}},dispatches:{orderBy:{createdAt:"desc"},take:5,include:{technicianUser:{select:{id:true,name:true}}}},laborClocks:true,qualityInspections:{orderBy:{version:"desc"},include:{inspectorUser:{select:{id:true,name:true}},peerVerifierUser:{select:{id:true,name:true}}}}}}
        }
      }),
      database.user.findMany({where:{isActive:true},orderBy:{name:"asc"},select:{id:true,name:true}})
    ]);
    return{repairOrders,users};
  },
  inspect(command:EnterpriseCommandCommitInput,data:{checks:QualityCheck[];completionEvidence:string[];inspectedAt:Date;inspectorUserId:string;peerVerificationPassed:boolean;peerVerifierUserId:string|null;reason:string;reworkInstructions:string|null;roadTestEvidence:string[];roadTestOutcome:"NOT_REQUIRED"|"PASSED"|"FAILED";roadTestRequired:boolean;templateCode:string;templateVersion:number}){return executeAggregateMutation(database,command,"vehicle-operations.shop",async tx=>{
    const job=await tx.repairJob.findFirst({where:{id:command.subjectId,organizationId:command.organizationId,status:"READY_FOR_QC"},include:{repairOrder:true,procedureVersion:true,dispatches:{where:{status:"COMPLETED"},orderBy:{createdAt:"desc"},take:1},qualityInspections:{orderBy:{version:"desc"},take:1}}});
    if(!job)throw new Error("Only a repair job ready for QC can be inspected.");
    if(!(job.executionEvidence as string[]|null)?.length)throw new Error("Repair completion evidence is required before QC.");
    const inspector=await tx.user.findFirst({where:{id:data.inspectorUserId,isActive:true},select:{id:true}});
    if(!inspector)throw new Error("QC inspector must be an active user.");
    const decision=evaluateInspection({checks:data.checks,completionEvidence:data.completionEvidence,heavyRepair:job.lane==="DIAGNOSTIC_HEAVY",peerVerificationPassed:data.peerVerificationPassed,roadTestOutcome:data.roadTestOutcome,roadTestRequired:data.roadTestRequired});
    if(decision.peerVerificationRequired){
      if(!data.peerVerificationPassed||!data.peerVerifierUserId)throw new Error("Diagnostic/heavy repair requires attributable peer verification.");
      const peer=await tx.user.findFirst({where:{id:data.peerVerifierUserId,isActive:true},select:{id:true}});
      if(!peer)throw new Error("Peer verifier must be an active user.");
      if(peer.id===job.dispatches[0]?.technicianUserId)throw new Error("Peer verifier must be different from the executing technician.");
    }
    if(data.peerVerificationPassed&&!data.peerVerifierUserId)throw new Error("Passed peer verification requires a verifier.");
    if(!decision.allowed&&(!data.reworkInstructions||data.reworkInstructions.length<10))throw new Error("Failed QC requires rework instructions of at least 10 characters.");
    if(decision.allowed&&data.reworkInstructions)throw new Error("Passed QC cannot include rework instructions.");
    const latest=job.qualityInspections[0];
    const procedureSnapshot=job.procedureVersion?{procedureId:job.procedureVersion.id,procedureVersion:job.procedureVersion.version,qcRules:job.procedureVersion.qcRules}:{procedureId:null,procedureVersion:null,qcRules:[],source:"MANAGER_REPAIR_RESULT"};
    const inspection=await tx.repairQualityInspection.create({data:{organizationId:command.organizationId,repairOrderId:job.repairOrderId,repairJobId:job.id,version:(latest?.version??0)+1,disposition:decision.allowed?"PASSED":"FAILED",templateCode:data.templateCode,templateVersion:data.templateVersion,templateSnapshot:toJson({...procedureSnapshot,templateCode:data.templateCode,templateVersion:data.templateVersion}),checkResults:toJson(data.checks),completionEvidence:toJson(data.completionEvidence),safetyChecksPassed:decision.safetyChecksPassed,peerVerificationRequired:decision.peerVerificationRequired,peerVerificationPassed:data.peerVerificationPassed,peerVerifierUserId:data.peerVerifierUserId,roadTestRequired:data.roadTestRequired,roadTestOutcome:data.roadTestOutcome,roadTestEvidence:toJson(data.roadTestEvidence),failureReasonCodes:toJson(decision.failureReasonCodes),reworkInstructions:data.reworkInstructions,inspectorUserId:data.inspectorUserId,inspectedAt:data.inspectedAt,supersedesId:latest?.id}});
    if(decision.allowed)await tx.repairJob.update({where:{id:job.id},data:{status:"QC_PASSED",qcPassedAt:data.inspectedAt,qcFailedAt:null,readinessReasonCodes:toJson(["SHOP_QC_RELEASE_GATES_PASSED"]),version:{increment:1}}});
    else{
      await tx.repairJob.update({where:{id:job.id},data:{status:"READY_FOR_REPAIR",qcFailedAt:data.inspectedAt,qcPassedAt:null,readinessReasonCodes:toJson(["SHOP_QC_REWORK_REQUIRED",...decision.failureReasonCodes]),executionBlockerReason:data.reworkInstructions,version:{increment:1}}});
      await tx.repairJobLaborClock.updateMany({where:{repairJobId:job.id,state:"FINISHED"},data:{state:"NOT_STARTED",startedAt:null,lastResumedAt:null,finishedAt:null,version:{increment:1}}});
    }
    return{previous:job,result:{disposition:inspection.disposition,failureReasonCodes:decision.failureReasonCodes,id:inspection.id,jobId:job.id,jobStatus:decision.allowed?"QC_PASSED":"READY_FOR_REPAIR",version:inspection.version}};
  });},
  release(command:EnterpriseCommandCommitInput,data:{authorizedAt:Date;authorizedByUserId:string;keysVerified:true;openExceptions:string[];reason:string;releaseEvidence:string[]}){return executeAggregateMutation(database,command,"vehicle-operations.shop",async(tx,version)=>{const order=await tx.repairOrder.findFirst({where:{id:command.subjectId,organizationId:command.organizationId,closedAt:null},include:{repairJobs:{where:{status:{not:"CANCELLED"}},include:{qualityInspections:{orderBy:{version:"desc"},take:1},laborClocks:true}},releaseAuthorization:true}});if(!order)throw new Error("Repair order was not found.");if(order.releaseAuthorization)throw new Error("Repair order already has a release authorization.");if(!order.repairJobs.length)throw new Error("Release requires at least one repair job.");const unpassed=order.repairJobs.filter(job=>job.status!=="QC_PASSED"||job.qualityInspections[0]?.disposition!=="PASSED");if(unpassed.length)throw new Error(`Every repair job must pass its latest QC inspection before release: ${unpassed.map(job=>job.jobNumber).join(", ")}.`);if(order.repairJobs.some(job=>job.laborClocks.some(clock=>clock.state==="RUNNING"||clock.state==="PAUSED")))throw new Error("Release is blocked while repair labor remains running or paused.");const route=determineShopHandoff(order.origin,true);if(!route.allowed)throw new Error("Quality release route is not allowed.");const inspectionIds=order.repairJobs.map(job=>job.qualityInspections[0]!.id),release=await tx.repairOrderReleaseAuthorization.create({data:{organizationId:command.organizationId,repairOrderId:order.id,destination:route.destination,keysVerified:data.keysVerified,openExceptions:toJson(data.openExceptions),qcInspectionIds:toJson(inspectionIds),releaseEvidence:toJson(data.releaseEvidence),authorizedByUserId:data.authorizedByUserId,authorizedAt:data.authorizedAt,reason:data.reason}}),nextAction=route.destination==="CUSTOMER_DELIVERY"?"Complete advisor delivery readiness and customer handoff":"Return inventory unit to title, merchandising, or frontline readiness";await tx.repairOrder.update({where:{id:order.id},data:{stage:"HANDOFF",operatingState:"ACTIVE",stageStartedAt:data.authorizedAt,nextAction,stateReason:null,version}});await tx.repairOrderStateEvent.create({data:{organizationId:command.organizationId,repairOrderId:order.id,version,fromStage:order.stage,toStage:"HANDOFF",fromOperatingState:order.operatingState,toOperatingState:"ACTIVE",ownerUserId:order.ownerUserId,locationId:order.locationId,targetAt:order.targetAt,nextAction,reason:data.reason,actorUserId:data.authorizedByUserId,correlationId:command.correlationId,occurredAt:data.authorizedAt}});return{previous:order,result:{destination:release.destination,id:release.id,repairOrderId:order.id,stage:"HANDOFF",version}};});}
};}
export type QualityControlRepository=ReturnType<typeof createQualityControlRepository>;
