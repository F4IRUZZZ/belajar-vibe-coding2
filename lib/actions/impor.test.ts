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
import { importTransaksiCsv } from "./impor";

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
  return u.id;
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

describe("importTransaksiCsv", () => {
  it("masuk milik user + baris rusak dilaporkan", async () => {
    const uid = await prisma.user.findFirstOrThrow({}).then((u) => u.id);
    const r = await importTransaksiCsv(
      "tanggal,jenis,jumlah,kategori\n2026-09-01,masuk,300000,Gajian\nrusak,keluar,100,X\n2026-09-02,keluar,50000,Pangan",
    );
    expect(r).toMatchObject({ masuk: 2, gagal: 1 });
    expect(await prisma.transaksi.count({ where: { userId: uid } })).toBe(2);
  });

  it("menolak file raksasa", async () => {
    await expect(importTransaksiCsv("x".repeat(500_001))).rejects.toThrow("kebesaran");
  });
});
