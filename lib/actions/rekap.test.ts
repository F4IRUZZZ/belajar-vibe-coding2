import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { prisma } from "@/lib/prisma";
import { formatRekapWa, getRekap, isLewatTempo, labelBulan } from "@/lib/store";
import { createHutang } from "./hutang";
import { createTransaksi } from "./transaksi";

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

describe("isLewatTempo + labelBulan", () => {
  it("lunas atau tanpa tempo tidak dihitung", () => {
    expect(isLewatTempo({ status: "lunas", jatuhTempo: new Date("2020-01-01") })).toBe(false);
    expect(isLewatTempo({ status: "belum", jatuhTempo: null })).toBe(false);
    expect(isLewatTempo({ status: "belum", jatuhTempo: new Date("2020-01-01") })).toBe(true);
    expect(isLewatTempo({ status: "belum", jatuhTempo: new Date("2999-01-01") })).toBe(false);
  });

  it("label Sep 2026", () => {
    expect(labelBulan("2026-09")).toBe("Sep 2026");
    expect(labelBulan("2026-01")).toBe("Jan 2026");
  });
});

describe("getRekap + formatRekapWa", () => {
  it("angka + top kategori + hutang + LEWAT TEMPO", async () => {
    await createTransaksi({ jenis: "masuk", jumlah: "3000000", tanggal: "2026-09-01", kategori: "Gajian" });
    await createTransaksi({ jenis: "keluar", jumlah: "800000", tanggal: "2026-09-05", kategori: "Pangan" });
    await createTransaksi({ jenis: "keluar", jumlah: "200000", tanggal: "2026-09-06", kategori: "Mandi" });
    await createTransaksi({ jenis: "keluar", jumlah: "750000", tanggal: "2026-09-07", kategori: "Pangan" });
    await createTransaksi({ jenis: "keluar", jumlah: "999000", tanggal: "2026-08-01", kategori: "Pangan" }); // bulan lain
    await createHutang({
      arah: "hutang",
      pihak: "Budi",
      jumlah: "150000",
      tanggal: "2026-09-01",
      jatuhTempo: "2020-01-01",
    });

    const r = await getRekap("2026-09");
    expect(r).toMatchObject({
      totalMasuk: 3000000,
      totalKeluar: 1750000,
      saldo: 1250000,
      sisaHutang: 150000,
      pihakHutang: 1,
      lewatTempo: 1,
    });
    expect(r.top[0]).toMatchObject({ kategori: "Pangan", jumlah: 1550000 });

    const teks = formatRekapWa(r);
    expect(teks).toContain("*Keuangan Keluarga, Sep 2026*");
    expect(teks).toContain("Saldo: Rp1.250.000");
    expect(teks).toContain("Pangan Rp1.550.000 (89%)");
    expect(teks).toContain("Sisa hutang Rp150.000 (1 pihak)");
    expect(teks).toContain("LEWAT TEMPO");
  });

  it("bulan kosong tetap valid", async () => {
    const teks = formatRekapWa(await getRekap("2026-02"));
    expect(teks).toContain("Belum ada pengeluaran bulan ini.");
    expect(teks).not.toContain("Sisa hutang");
  });
});
