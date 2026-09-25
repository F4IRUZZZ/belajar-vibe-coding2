-- AlterTable
ALTER TABLE "Hutang" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Produk" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Transaksi" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "Hutang_userId_idx" ON "Hutang"("userId");

-- CreateIndex
CREATE INDEX "Produk_userId_idx" ON "Produk"("userId");

-- CreateIndex
CREATE INDEX "Transaksi_userId_idx" ON "Transaksi"("userId");
