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
import { getInsight } from "@/lib/store";
import { createHutang } from "./hutang";
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

const SEKARANG = new Date(2026, 8, 24); // 24 Sep 2026 (lokal)

describe("getInsight", () => {
  it("banding bulan + kategori naik + tempo dekat", async () => {
    const mk = (tgl: string, kat: string, jumlah: string) =>
      createTransaksi({ jenis: "keluar", jumlah, tanggal: tgl, kategori: kat });
    await mk("2026-08-05", "Pangan", "500000");
    await mk("2026-08-06", "Mandi", "200000");
    await mk("2026-09-05", "Pangan", "800000"); // +60%
    await mk("2026-09-06", "Mandi", "100000"); // turun, tidak masuk daftar
    await createHutang({
      arah: "hutang",
      pihak: "Budi",
      jumlah: "150000",
      tanggal: "2026-09-01",
      jatuhTempo: "2026-09-27", // 3 hari lagi dari SEKARANG
    });
    await createHutang({
      arah: "hutang",
      pihak: "Jauh",
      jumlah: "900000",
      tanggal: "2026-09-01",
      jatuhTempo: "2026-12-01", // >7 hari, abaikan
    });

    const r = await getInsight(uid, SEKARANG);
    expect(r.keluarIni).toBe(900000);
    expect(r.keluarLalu).toBe(700000);
    expect(r.persenKeluar).toBe(29); // (900-700)/700 = 28.57 → 29
    expect(r.kategoriNaik).toHaveLength(1);
    expect(r.kategoriNaik[0]).toMatchObject({ kategori: "Pangan", ini: 800000, lalu: 500000, persen: 60 });
    expect(r.tempoDekat).toHaveLength(1);
    expect(r.tempoDekat[0]).toMatchObject({ pihak: "Budi", sisa: 150000 });
  });

  it("bulan lalu kosong → persen null, tanpa data → kartu kosong", async () => {
    await createTransaksi({ jenis: "keluar", jumlah: "100000", tanggal: "2026-09-05", kategori: "Pangan" });
    const r = await getInsight(uid, SEKARANG);
    expect(r.persenKeluar).toBeNull();
    expect(r.kategoriNaik).toEqual([]);
    expect(r.tempoDekat).toEqual([]);
  });
});
