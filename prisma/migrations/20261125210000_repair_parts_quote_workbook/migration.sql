CREATE TABLE "RepairPartQuote" (
    "id" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "part" TEXT NOT NULL,
    "partNumber" TEXT,
    "supplier" TEXT NOT NULL,
    "supplierPhone" TEXT,
    "supplierContact" TEXT,
    "supplierLink" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "reference" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkoutProgress" JSONB,
    CONSTRAINT "RepairPartQuote_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RepairPartQuote_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "RepairPartQuote_repairOrderId_createdAt_idx" ON "RepairPartQuote"("repairOrderId", "createdAt");
