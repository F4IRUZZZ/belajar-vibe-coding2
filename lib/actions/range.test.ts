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
import { getGrafikBulanan, getRingkasanKategori, getSaldo } from "@/lib/store";
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

describe("rentang custom", () => {
  it("saldo + kategori mengikuti dari/sampai", async () => {
    const mk = (tgl: string, kat: string, jumlah: string) =>
      createTransaksi({ jenis: "keluar", jumlah, tanggal: tgl, kategori: kat });
    await mk("2026-09-01", "Pangan", "100000");
    await mk("2026-09-20", "Mandi", "50000");
    await mk("2026-10-05", "Pangan", "999000");
    const rentang = { dari: new Date(2026, 8, 1), sampai: new Date(2026, 9, 1) };
    const s = await getSaldo("semua", uid, rentang);
    expect(s.totalKeluar).toBe(150000);
    const kat = await getRingkasanKategori("semua", uid, rentang);
    expect(kat.map((k) => k.kategori).sort()).toEqual(["Mandi", "Pangan"]);
  });
});

describe("getGrafikBulanan", () => {
  it("12 bucket, label dan agregasi benar", async () => {
    await createTransaksi({ jenis: "masuk", jumlah: "1000000", tanggal: "2026-09-01", kategori: "Gajian" });
    await createTransaksi({ jenis: "keluar", jumlah: "200000", tanggal: "2026-08-10", kategori: "Pangan" });
    const g = await getGrafikBulanan(uid, new Date(2026, 8, 24));
    expect(g).toHaveLength(12);
    expect(g[11].label).toBe("Sep 26");
    expect(g[11].masuk).toBe(1000000);
    const agu = g.find((b) => b.label === "Agu 26")!;
    expect(agu.keluar).toBe(200000);
    expect(g.slice(0, 10).every((b) => b.masuk === 0 && b.keluar === 0)).toBe(true);
  });
});
