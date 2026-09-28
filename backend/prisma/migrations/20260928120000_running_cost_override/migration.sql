-- CreateTable
CREATE TABLE "RunningCostOverride" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunningCostOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RunningCostOverride_month_idx" ON "RunningCostOverride"("month");

-- CreateIndex
CREATE UNIQUE INDEX "RunningCostOverride_lineId_month_key" ON "RunningCostOverride"("lineId", "month");
