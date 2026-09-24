import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => ({ value: "test-token" }),
    set: () => {},
    delete: () => {},
  }),
}));

import { prisma } from "@/lib/prisma";
import { getAnggaranVsRealisasi } from "@/lib/store";
import { hapusAnggaran, salinBulanLalu, upsertAnggaran } from "./anggaran";
import { createTransaksi } from "./transaksi";

async function bersih() {
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.catatan.deleteMany();
  await prisma.hutang.deleteMany();
  await prisma.transaksi.deleteMany();
  await prisma.produk.deleteMany();
  await prisma.anggaran.deleteMany();
  await prisma.target.deleteMany();
  await prisma.jadwal.deleteMany();
  await prisma.dompet.deleteMany();
}

let uid = "";

async function masukSebagaiTest() {
  const u = await prisma.user.create({
    data: {
      email: "test@x.id",
      emailLower: "test@x.id",
      username: "Test",
      usernameLower: "test",
      passwordHash: "x",
      role: "keluarga",
    },
  });
  await prisma.session.create({
    data: { token: "test-token", userId: u.id, expiresAt: new Date("2999-01-01") },
  });
  uid = u.id;
}

beforeAll(bersih);
beforeEach(async () => {
  await bersih();
  await masukSebagaiTest();
});
afterAll(async () => {
  await bersih();
  await prisma.$disconnect();
});

describe("upsertAnggaran", () => {
  it("buat lalu update idempoten (tetap 1 row)", async () => {
    await upsertAnggaran({ kategori: "Pangan", batas: "500000", bulan: "2026-09" });
    await upsertAnggaran({ kategori: "Pangan", batas: "600000", bulan: "2026-09" });
    const rows = await prisma.anggaran.findMany({ where: { bulan: "2026-09" } });
    expect(rows).toHaveLength(1);
    expect(rows[0].batas).toBe(600000);
  });

  it("menolak batas nol dan bulan jelek", async () => {
    await expect(upsertAnggaran({ kategori: "Pangan", batas: "0", bulan: "2026-09" })).rejects.toThrow(
      "Batas harus > 0",
    );
    await expect(upsertAnggaran({ kategori: "Pangan", batas: "100", bulan: "2026-13" })).rejects.toThrow();
  });

  it("hapus anggaran", async () => {
    await upsertAnggaran({ kategori: "Mandi", batas: "100000", bulan: "2026-09" });
    const row = await prisma.anggaran.findFirstOrThrow({ where: { kategori: "Mandi" } });
    await hapusAnggaran(row.id);
    expect(await prisma.anggaran.count()).toBe(0);
  });
});

describe("salinBulanLalu", () => {
  it("salin + lewati yang sudah ada", async () => {
    await upsertAnggaran({ kategori: "Pangan", batas: "500000", bulan: "2026-08" });
    await upsertAnggaran({ kategori: "Mandi", batas: "100000", bulan: "2026-08" });
    await upsertAnggaran({ kategori: "Mandi", batas: "150000", bulan: "2026-09" });
    const n = await salinBulanLalu("2026-08", "2026-09");
    expect(n).toBe(1); // cuma Pangan yang disalin
    const sep = await prisma.anggaran.findMany({ where: { bulan: "2026-09" }, orderBy: { kategori: "asc" } });
    expect(sep.map((s) => [s.kategori, s.batas])).toEqual([
      ["Mandi", 150000],
      ["Pangan", 500000],
    ]);
  });

  it("menolak sumber kosong dan bulan sama", async () => {
    await expect(salinBulanLalu("2026-01", "2026-02")).rejects.toThrow("Tidak ada anggaran");
    await expect(salinBulanLalu("2026-09", "2026-09")).rejects.toThrow("sama");
  });
});

describe("getAnggaranVsRealisasi", () => {
  it("status aman/waspada/bocor + tanpa anggaran", async () => {
    await upsertAnggaran({ kategori: "Pangan", batas: "100000", bulan: "2026-09" });
    await upsertAnggaran({ kategori: "Mandi", batas: "100000", bulan: "2026-09" });
    await upsertAnggaran({ kategori: "Transport", batas: "100000", bulan: "2026-09" });
    await createTransaksi({ jenis: "keluar", jumlah: "50000", tanggal: "2026-09-05", kategori: "Pangan" });
    await createTransaksi({ jenis: "keluar", jumlah: "85000", tanggal: "2026-09-06", kategori: "Mandi" });
    await createTransaksi({ jenis: "keluar", jumlah: "120000", tanggal: "2026-09-07", kategori: "Transport" });
    await createTransaksi({ jenis: "keluar", jumlah: "30000", tanggal: "2026-09-08", kategori: "Jajan" });
    await createTransaksi({ jenis: "keluar", jumlah: "999000", tanggal: "2026-08-08", kategori: "Pangan" }); // bulan lain, abaikan

    const r = await getAnggaranVsRealisasi("2026-09", uid);
    const byKat = new Map(r.item.map((i) => [i.kategori, i]));
    expect(byKat.get("Pangan")).toMatchObject({ terpakai: 50000, persen: 50, status: "aman" });
    expect(byKat.get("Mandi")).toMatchObject({ terpakai: 85000, persen: 85, status: "waspada" });
    expect(byKat.get("Transport")).toMatchObject({ terpakai: 120000, persen: 120, status: "bocor" });
    expect(r.tanpaAnggaran).toEqual([{ kategori: "Jajan", terpakai: 30000 }]);
  });
});
