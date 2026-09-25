import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const box = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(box.cookie ? { cookie: `better-auth.session_token=${box.cookie}` } : {}),
}));

import { prisma } from "@/lib/prisma";
import { getInsight } from "@/lib/store";
import { createHutang } from "./hutang";
import { createTransaksi } from "./transaksi";

import { bersihSemua, buatSesiTest } from "@/lib/testing";

let uid = "";

beforeAll(bersihSemua);
beforeEach(async () => {
  await bersihSemua();
  const s = await buatSesiTest("test@x.id", "Test");
  box.cookie = s.cookie;
  uid = s.userId;
});
afterAll(async () => {
  await bersihSemua();
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
