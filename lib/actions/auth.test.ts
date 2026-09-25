import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const box = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(box.cookie ? { cookie: `better-auth.session_token=${box.cookie}` } : {}),
}));

import { prisma } from "@/lib/prisma";
import { ambilUser, wajibUser } from "@/lib/auth";
import { getTransaksiPage } from "@/lib/store";
import { bersihSemua, buatSesiTest } from "@/lib/testing";
import { createTransaksi } from "./transaksi";

beforeAll(bersihSemua);
beforeEach(async () => {
  await bersihSemua();
  box.cookie = "";
});
afterAll(async () => {
  await bersihSemua();
  await prisma.$disconnect();
});

describe("sesi better-auth", () => {
  it("tanpa cookie = anonim, wajibUser melempar", async () => {
    expect(await ambilUser()).toBeNull();
    await expect(wajibUser()).rejects.toThrow("Masuk dulu");
  });

  it("cookie sesi valid = user terpetakan (nama + foto Google)", async () => {
    const s = await buatSesiTest("ibu@contoh.id", "Ibu");
    await prisma.user.update({ where: { id: s.userId }, data: { image: "https://contoh.id/foto.jpg" } });
    box.cookie = s.cookie;
    expect(await ambilUser()).toMatchObject({
      id: s.userId,
      email: "ibu@contoh.id",
      username: "Ibu",
      image: "https://contoh.id/foto.jpg",
    });
  });

  it("token basi/kedaluwarsa = anonim", async () => {
    box.cookie = "token-ngawur-tanpa-tandatangan";
    expect(await ambilUser()).toBeNull();
    const s = await buatSesiTest("a@x.id", "Ayah");
    await prisma.session.update({
      where: { token: s.token },
      data: { expiresAt: new Date("2020-01-01") },
    });
    box.cookie = s.cookie;
    expect(await ambilUser()).toBeNull();
  });
});

describe("isolasi data antar user", () => {
  it("B tidak melihat data A", async () => {
    const a = await buatSesiTest("a@x.id", "Ayah");
    box.cookie = a.cookie;
    await createTransaksi({ jenis: "masuk", jumlah: "100000", tanggal: "2026-09-01", kategori: "Gajian" });
    expect((await getTransaksiPage({ userId: a.userId })).rows).toHaveLength(1);

    const b = await buatSesiTest("b@x.id", "Bunda");
    box.cookie = b.cookie;
    expect((await ambilUser())?.id).toBe(b.userId);
    expect((await getTransaksiPage({ userId: b.userId })).rows).toHaveLength(0);
  });
});
