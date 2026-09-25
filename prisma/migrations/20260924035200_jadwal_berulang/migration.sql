-- CreateEnum
CREATE TYPE "Frekuensi" AS ENUM ('mingguan', 'bulanan');

-- CreateTable
CREATE TABLE "Jadwal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "frekuensi" "Frekuensi" NOT NULL,
    "jenis" "JenisTransaksi" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "kategori" TEXT NOT NULL,
    "catatan" TEXT,
    "nextRun" TIMESTAMP(3) NOT NULL,
    "lastKunci" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jadwal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Jadwal_userId_aktif_idx" ON "Jadwal"("userId", "aktif");
