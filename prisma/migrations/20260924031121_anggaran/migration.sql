-- CreateTable
CREATE TABLE "Anggaran" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kategori" TEXT NOT NULL,
    "batas" INTEGER NOT NULL,
    "bulan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anggaran_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Anggaran_userId_bulan_idx" ON "Anggaran"("userId", "bulan");

-- CreateIndex
CREATE UNIQUE INDEX "Anggaran_userId_kategori_bulan_key" ON "Anggaran"("userId", "kategori", "bulan");
