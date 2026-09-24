import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const box = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(box.cookie ? { cookie: `better-auth.session_token=${box.cookie}` } : {}),
}));

import { prisma } from "@/lib/prisma";
import { getGrafikBulanan, getRingkasanKategori, getSaldo } from "@/lib/store";
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
