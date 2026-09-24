-- AlterTable
ALTER TABLE "Transaksi" ADD COLUMN     "dompetId" TEXT;

-- CreateTable
CREATE TABLE "Dompet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dompet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dompet_userId_idx" ON "Dompet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Dompet_userId_nama_key" ON "Dompet"("userId", "nama");

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_dompetId_fkey" FOREIGN KEY ("dompetId") REFERENCES "Dompet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
