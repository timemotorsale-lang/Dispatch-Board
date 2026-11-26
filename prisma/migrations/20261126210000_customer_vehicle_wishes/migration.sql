CREATE TABLE "CustomerVehicleWish" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "color" TEXT,
    "maxPriceCents" INTEGER,
    "monthlyPaymentCents" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerVehicleWish_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerVehicleWish_customerId_archivedAt_createdAt_idx"
    ON "CustomerVehicleWish"("customerId", "archivedAt", "createdAt");

ALTER TABLE "CustomerVehicleWish" ADD CONSTRAINT "CustomerVehicleWish_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
