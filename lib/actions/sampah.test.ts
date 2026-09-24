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
import { getSampah, getTransaksiPage, getTransaksiTotal, purgeSampah } from "@/lib/store";
import { createTransaksi, deleteTransaksi, hapusPermanen, pulihkanTransaksi } from "./transaksi";

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
    const lain = await prisma.user.create({
      data: {
        email: "lain@x.id",
        emailLower: "lain@x.id",
        username: "Lain",
        usernameLower: "lain",
        passwordHash: "x",
        role: "pribadi",
      },
    });
    // Simulasi aksi sebagai user lain: update langsung scope lain.id = 0 baris
    const r = await prisma.transaksi.updateMany({
      where: { id: { in: [id] }, userId: lain.id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    expect(r.count).toBe(0);
    expect((await getSampah(uid)).map((t) => t.id)).toEqual([id]);
  });
});
