import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const box = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(box.cookie ? { cookie: `better-auth.session_token=${box.cookie}` } : {}),
}));

import { prisma } from "@/lib/prisma";
import { createJadwal, deleteJadwal, jalankanJadwal, jalankanSemua, toggleJadwal } from "./jadwal";

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

describe("jadwal berulang", () => {
  it("jatuh tempo → tercatat + maju, panggil ulang idempoten", async () => {
    await createJadwal({
      frekuensi: "mingguan",
      jenis: "masuk",
      jumlah: "300000",
      kategori: "Gajian",
      mulai: "2026-09-01",
    });
    const jalan1 = await jalankanJadwal(new Date(2026, 8, 24));
    expect(jalan1).toBe(1);
    expect(await prisma.transaksi.count({ where: { userId: uid } })).toBe(1);
    const tx = await prisma.transaksi.findFirstOrThrow({ where: { userId: uid } });
    expect(tx.kategori).toBe("Gajian (rutin)");

    // Panggil lagi di tanggal sama: nextRun sudah maju 7 hari ke 8 Sep ≤ 24 Sep,
    // jadi periode BERIKUTNYA ikut jalan (bukan ganda periode sama).
    const jalan2 = await jalankanJadwal(new Date(2026, 8, 24));
    expect(jalan2).toBe(1);
    expect(await prisma.transaksi.count({ where: { userId: uid } })).toBe(2);
  });

  it("nonaktif dilewati, toggle + hapus", async () => {
    await createJadwal({
      frekuensi: "bulanan",
      jenis: "keluar",
      jumlah: "100000",
      kategori: "Listrik",
      mulai: "2026-09-01",
    });
    const j = await prisma.jadwal.findFirstOrThrow({ where: { userId: uid } });
    await toggleJadwal(j.id, false);
    expect(await jalankanJadwal(new Date(2026, 8, 24))).toBe(0);
    await toggleJadwal(j.id, true);
    expect(await jalankanJadwal(new Date(2026, 8, 24))).toBe(1);
    await deleteJadwal(j.id);
    expect(await prisma.jadwal.count()).toBe(0);
  });

  it("belum tempo tidak jalan", async () => {
    await createJadwal({
      frekuensi: "mingguan",
      jenis: "masuk",
      jumlah: "1000",
      kategori: "X",
      mulai: "2026-10-01",
    });
    expect(await jalankanJadwal(new Date(2026, 8, 24))).toBe(0);
  });

  it("jalankanSemua mencakup user lain", async () => {
    await createJadwal({
      frekuensi: "mingguan",
      jenis: "masuk",
      jumlah: "5000",
      kategori: "Y",
      mulai: "2026-09-01",
    });
    const lain = await buatSesiTest("lain@x.id", "Lain");
    await prisma.jadwal.create({
      data: {
        userId: lain.userId,
        frekuensi: "mingguan",
        jenis: "masuk",
        jumlah: 7000,
        kategori: "Z",
        nextRun: new Date(2026, 8, 1, 12),
      },
    });
    expect(await jalankanSemua(new Date(2026, 8, 24))).toBe(2);
    expect(await prisma.transaksi.count({ where: { userId: lain.userId } })).toBe(1);
  });
});
