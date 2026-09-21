-- CreateEnum
CREATE TYPE "ActivityModule" AS ENUM ('SALES', 'PURCHASE', 'RAW_MATERIAL', 'INVENTORY', 'PAYMENT');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'RESTORED', 'PAYMENT_RECORDED', 'PAYMENT_UPDATED', 'PAYMENT_DELETED', 'STOCK_ADJUSTED');

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "actorName" TEXT NOT NULL,
    "module" "ActivityModule" NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "entityId" TEXT,
    "entityNo" TEXT,
    "summary" TEXT NOT NULL,
    "amount" DECIMAL(14,2),
    "href" TEXT,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_module_idx" ON "ActivityLog"("module");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Block Supabase PostgREST; Prisma connects as postgres and is unaffected.
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
