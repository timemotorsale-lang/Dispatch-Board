CREATE TYPE "InventoryFrontlineStage" AS ENUM ('ACQUISITION_VALIDATION','TRANSPORT_PLANNING','IN_TRANSIT','RECEIPT_AND_CUSTODY','INSPECTION_AND_TRIAGE','RECON_PLAN_AND_APPROVAL','PARTS_AND_REPAIR_EXECUTION','QUALITY_AND_SAFETY_VERIFICATION','TITLE_DOCUMENT_READINESS','MERCHANDISING_AND_PRICING','FRONTLINE_RELEASE_REVIEW','FRONTLINE_READY','POST_RELEASE_VERIFICATION','HOLD','DISPOSITION_REVIEW','CANCELLED_BEFORE_CONTROL','CLOSED_REVERSED');
CREATE TYPE "InventoryFrontlineOperatingState" AS ENUM ('ACTIVE','WAITING','BLOCKED','SUSPENDED','COMPLETED','CANCELLED');
CREATE TABLE "InventoryFrontlineWorkflow" (
  "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"locationId" TEXT NOT NULL,"inventoryUnitId" TEXT NOT NULL,"ownerUserId" TEXT NOT NULL,"repairOrderId" TEXT,"workflowVersion" TEXT NOT NULL,"policyVersion" TEXT NOT NULL,
  "stage" "InventoryFrontlineStage" NOT NULL DEFAULT 'ACQUISITION_VALIDATION',"operatingState" "InventoryFrontlineOperatingState" NOT NULL DEFAULT 'ACTIVE',
  "acquisitionSnapshot" JSONB NOT NULL,"transportSnapshot" JSONB NOT NULL,"receiptSnapshot" JSONB NOT NULL,"inspectionSnapshot" JSONB NOT NULL,"reconSnapshot" JSONB NOT NULL,"executionSnapshot" JSONB NOT NULL,"qualitySnapshot" JSONB NOT NULL,"titleSnapshot" JSONB NOT NULL,"merchandisingSnapshot" JSONB NOT NULL,"releaseSnapshot" JSONB NOT NULL,"postReleaseSnapshot" JSONB NOT NULL,"exceptionSnapshot" JSONB NOT NULL,
  "targetAt" TIMESTAMP(3) NOT NULL,"nextAction" TEXT NOT NULL,"version" INTEGER NOT NULL DEFAULT 1,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryFrontlineWorkflow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryFrontlineWorkflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryFrontlineWorkflow_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryFrontlineWorkflow_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryFrontlineWorkflow_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryFrontlineWorkflow_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryFrontlineWorkflow_inventoryUnitId_key" ON "InventoryFrontlineWorkflow"("inventoryUnitId");
CREATE INDEX "InventoryFrontlineWorkflow_organizationId_stage_operatingState_targetAt_idx" ON "InventoryFrontlineWorkflow"("organizationId","stage","operatingState","targetAt");
CREATE INDEX "InventoryFrontlineWorkflow_organizationId_locationId_stage_idx" ON "InventoryFrontlineWorkflow"("organizationId","locationId","stage");
CREATE INDEX "InventoryFrontlineWorkflow_ownerUserId_operatingState_targetAt_idx" ON "InventoryFrontlineWorkflow"("ownerUserId","operatingState","targetAt");
CREATE INDEX "InventoryFrontlineWorkflow_repairOrderId_idx" ON "InventoryFrontlineWorkflow"("repairOrderId");
CREATE TABLE "InventoryFrontlineWorkflowEvent" (
  "id" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"workflowId" TEXT NOT NULL,"version" INTEGER NOT NULL,"fromStage" "InventoryFrontlineStage","toStage" "InventoryFrontlineStage" NOT NULL,"fromState" "InventoryFrontlineOperatingState","toState" "InventoryFrontlineOperatingState" NOT NULL,"commandType" TEXT NOT NULL,"snapshot" JSONB NOT NULL,"actorUserId" TEXT NOT NULL,"reason" TEXT NOT NULL,"correlationId" TEXT NOT NULL,"occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryFrontlineWorkflowEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryFrontlineWorkflowEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryFrontlineWorkflowEvent_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "InventoryFrontlineWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InventoryFrontlineWorkflowEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "InventoryFrontlineWorkflowEvent_workflowId_version_key" ON "InventoryFrontlineWorkflowEvent"("workflowId","version");
CREATE INDEX "InventoryFrontlineWorkflowEvent_organizationId_occurredAt_idx" ON "InventoryFrontlineWorkflowEvent"("organizationId","occurredAt");
CREATE INDEX "InventoryFrontlineWorkflowEvent_correlationId_idx" ON "InventoryFrontlineWorkflowEvent"("correlationId");
