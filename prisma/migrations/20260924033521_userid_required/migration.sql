/*
  Warnings:

  - Made the column `userId` on table `Anggaran` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `Hutang` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `Transaksi` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Anggaran" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Hutang" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Transaksi" ALTER COLUMN "userId" SET NOT NULL;
