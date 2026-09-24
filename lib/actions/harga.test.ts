import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { prisma } from "@/lib/prisma";
import { getHargaTerakhirProduk, getTrenHarga } from "@/lib/store";
import { createTransaksi, getHargaTerakhir } from "./transaksi";

async function bersih() {
  await prisma.catatan.deleteMany();
  await prisma.hutang.deleteMany();
  await prisma.transaksi.deleteMany();
  await prisma.produk.deleteMany();
  await prisma.anggaran.deleteMany();
}

beforeAll(bersih);
beforeEach(bersih);
afterAll(async () => {
  await bersih();
  await prisma.$disconnect();
});

describe("hargaSatuan", () => {
  it("tersimpan untuk keluar berproduk, diabaikan untuk masuk", async () => {
    const beras = await prisma.produk.create({
      data: { nama: "Beras", namaLower: "beras", kategori: "Pangan" },
    });
    await createTransaksi({
      jenis: "keluar",
      jumlah: "60000",
      tanggal: "2026-09-01",
      kategori: "Pangan",
      produkId: beras.id,
      hargaSatuan: "12000",
    });
    await createTransaksi({
      jenis: "masuk",
      jumlah: "300000",
      tanggal: "2026-09-01",
      kategori: "Gajian",
      hargaSatuan: "999",
    });
    const keluar = await prisma.transaksi.findFirstOrThrow({ where: { jenis: "keluar" } });
    const masuk = await prisma.transaksi.findFirstOrThrow({ where: { jenis: "masuk" } });
    expect(keluar.hargaSatuan).toBe(12000);
    expect(masuk.hargaSatuan).toBeNull();
  });

  it("menolak harga nol", async () => {
    const beras = await prisma.produk.create({
      data: { nama: "Beras", namaLower: "beras", kategori: "Pangan" },
    });
    await expect(
      createTransaksi({
        jenis: "keluar",
        jumlah: "60000",
        tanggal: "2026-09-01",
        kategori: "Pangan",
        produkId: beras.id,
        hargaSatuan: "0",
      }),
    ).rejects.toThrow("Harga satuan harus > 0");
  });

  it("prefill = pembelian terakhir", async () => {
    const beras = await prisma.produk.create({
      data: { nama: "Beras", namaLower: "beras", kategori: "Pangan" },
    });
    const mk = (tgl: string, harga?: string) =>
      createTransaksi({ jenis: "keluar", jumlah: "60000", tanggal: tgl, kategori: "Pangan", produkId: beras.id, hargaSatuan: harga });
    await mk("2026-09-01", "10000");
    await mk("2026-09-10", "12000");
    await mk("2026-09-15"); // tanpa harga, tidak merusak prefill
    expect(await getHargaTerakhirProduk(beras.id)).toBe(12000);
    expect(await getHargaTerakhir(beras.id)).toBe(12000);
  });

  it("tren: persen vs rata-rata 3 sebelumnya", async () => {
    const beras = await prisma.produk.create({
      data: { nama: "Beras", namaLower: "beras", kategori: "Pangan" },
    });
    const sabun = await prisma.produk.create({
      data: { nama: "Sabun", namaLower: "sabun", kategori: "Mandi" },
    });
    const mk = (prod: string, tgl: string, harga: string) =>
      createTransaksi({ jenis: "keluar", jumlah: "50000", tanggal: tgl, kategori: "X", produkId: prod, hargaSatuan: harga });
    await mk(beras.id, "2026-09-01", "10000");
    await mk(beras.id, "2026-09-08", "10000");
    await mk(beras.id, "2026-09-15", "10000");
    await mk(beras.id, "2026-09-22", "12000"); // +20% vs rata-rata 10000
    await mk(sabun.id, "2026-09-22", "5000"); // cuma 1x → tanpa tren

    const tren = await getTrenHarga();
    expect(tren[beras.id]).toMatchObject({ terakhir: 12000, persen: 20 });
    expect(tren[beras.id].riwayat).toEqual([10000, 10000, 10000, 12000]);
    expect(tren[sabun.id]).toBeUndefined();
  });
});
