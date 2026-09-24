import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const box = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(box.cookie ? { cookie: `better-auth.session_token=${box.cookie}` } : {}),
}));

import { prisma } from "@/lib/prisma";
import { importTransaksiCsv } from "./impor";

import { bersihSemua, buatSesiTest } from "@/lib/testing";

beforeAll(bersihSemua);
beforeEach(async () => {
  await bersihSemua();
  const s = await buatSesiTest("test@x.id", "Test");
  box.cookie = s.cookie;
});
afterAll(async () => {
  await bersihSemua();
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
