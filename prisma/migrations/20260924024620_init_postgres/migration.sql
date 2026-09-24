-- CreateEnum
CREATE TYPE "JenisTransaksi" AS ENUM ('masuk', 'keluar');

-- CreateEnum
CREATE TYPE "ArahHutang" AS ENUM ('hutang', 'piutang');

-- CreateEnum
CREATE TYPE "StatusHutang" AS ENUM ('belum', 'lunas');

-- CreateTable
CREATE TABLE "Produk" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "namaLower" TEXT NOT NULL,
    "kategori" TEXT NOT NULL DEFAULT 'Lainnya',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaksi" (
    "id" TEXT NOT NULL,
    "jenis" "JenisTransaksi" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "kategori" TEXT NOT NULL,
    "produkId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Catatan" (
    "id" TEXT NOT NULL,
    "transaksiId" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Catatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hutang" (
    "id" TEXT NOT NULL,
    "arah" "ArahHutang" NOT NULL,
    "pihak" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "dibayar" INTEGER NOT NULL DEFAULT 0,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jatuhTempo" TIMESTAMP(3),
    "keterangan" TEXT,
    "status" "StatusHutang" NOT NULL DEFAULT 'belum',
    "transaksiIdLunas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hutang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Produk_namaLower_key" ON "Produk"("namaLower");

-- CreateIndex
CREATE INDEX "Transaksi_jenis_tanggal_idx" ON "Transaksi"("jenis", "tanggal");

-- CreateIndex
CREATE INDEX "Transaksi_kategori_idx" ON "Transaksi"("kategori");

-- CreateIndex
CREATE INDEX "Catatan_transaksiId_idx" ON "Catatan"("transaksiId");

-- CreateIndex
CREATE INDEX "Hutang_arah_status_idx" ON "Hutang"("arah", "status");

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Catatan" ADD CONSTRAINT "Catatan_transaksiId_fkey" FOREIGN KEY ("transaksiId") REFERENCES "Transaksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hutang" ADD CONSTRAINT "Hutang_transaksiIdLunas_fkey" FOREIGN KEY ("transaksiIdLunas") REFERENCES "Transaksi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
