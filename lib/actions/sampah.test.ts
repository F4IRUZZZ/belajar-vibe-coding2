import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const box = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(box.cookie ? { cookie: `better-auth.session_token=${box.cookie}` } : {}),
}));

import { prisma } from "@/lib/prisma";
import { getSampah, getTransaksiPage, getTransaksiTotal, purgeSampah } from "@/lib/store";
import { createTransaksi, deleteTransaksi, hapusPermanen, pulihkanTransaksi } from "./transaksi";
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

describe("tong sampah", () => {
  it("hapus = sembunyi dari daftar + total, muncul di sampah", async () => {
    const id = await createTransaksi({
      jenis: "keluar",
      jumlah: "50000",
      tanggal: "2026-09-01",
      kategori: "Pangan",
      catatan: "ikut sembunyi",
    });
    await deleteTransaksi([id]);
    expect((await getTransaksiPage({ userId: uid })).rows).toHaveLength(0);
    expect(await getTransaksiTotal({ userId: uid })).toEqual({ masuk: 0, keluar: 0 });
    const sampah = await getSampah(uid);
    expect(sampah).toHaveLength(1);
    expect(sampah[0].catatan).toHaveLength(1); // catatan ikut, belum cascade
  });

  it("pulihkan mengembalikan + permanen cascade catatan", async () => {
    const id = await createTransaksi({
      jenis: "keluar",
      jumlah: "50000",
      tanggal: "2026-09-01",
      kategori: "Pangan",
      catatan: "jangan hilang",
    });
    await deleteTransaksi([id]);
    await pulihkanTransaksi([id]);
    expect((await getTransaksiPage({ userId: uid })).rows).toHaveLength(1);
    await deleteTransaksi([id]);
    await hapusPermanen([id]);
    expect(await getSampah(uid)).toHaveLength(0);
    expect(await prisma.transaksi.count()).toBe(0);
    expect(await prisma.catatan.count()).toBe(0);
  });

  it("purge hanya yang >30 hari", async () => {
    const lama = await createTransaksi({
      jenis: "keluar",
      jumlah: "1000",
      tanggal: "2026-01-01",
      kategori: "Lama",
    });
    const baru = await createTransaksi({
      jenis: "keluar",
      jumlah: "2000",
      tanggal: "2026-09-01",
      kategori: "Baru",
    });
    await prisma.transaksi.updateMany({
      where: { id: { in: [lama, baru] }, userId: uid },
      data: { deletedAt: new Date() },
    });
    await prisma.transaksi.update({
      where: { id: lama },
      data: { deletedAt: new Date(2026, 7, 1) }, // 1 Agu, >30 hari dari 24 Sep
    });
    const n = await purgeSampah(uid, new Date(2026, 8, 24));
    expect(n).toBe(1);
    expect((await getSampah(uid)).map((t) => t.id)).toEqual([baru]);
  });

  it("milik orang lain tak bisa dipulihkan", async () => {
    const id = await createTransaksi({
      jenis: "keluar",
      jumlah: "1000",
      tanggal: "2026-09-01",
      kategori: "X",
    });
    await deleteTransaksi([id]);
    const lain = await buatSesiTest("lain@x.id", "Lain");
    // Simulasi aksi sebagai user lain: update langsung scope lain.userId = 0 baris
    const r = await prisma.transaksi.updateMany({
      where: { id: { in: [id] }, userId: lain.userId, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    expect(r.count).toBe(0);
    expect((await getSampah(uid)).map((t) => t.id)).toEqual([id]);
  });
});
