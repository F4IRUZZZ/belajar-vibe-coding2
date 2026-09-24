-- AlterTable
ALTER TABLE "Transaksi" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Transaksi_userId_deletedAt_idx" ON "Transaksi"("userId", "deletedAt");
