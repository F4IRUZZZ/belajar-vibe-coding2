import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined),
    set: (k: string, v: string) => void jar.set(k, v),
    delete: (k: string) => void jar.delete(k),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, ambilUser, hashPassword, verifyPassword } from "@/lib/auth";
import { getTransaksiPage } from "@/lib/store";
import { login, logout, register } from "./auth";
import { createTransaksi, deleteTransaksi } from "./transaksi";

async function bersih() {
  jar.clear();
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

beforeAll(bersih);
beforeEach(bersih);
afterAll(async () => {
  await bersih();
  await prisma.$disconnect();
});

describe("password", () => {
  it("hash + verifikasi", async () => {
    const h = await hashPassword("rahasia123");
    expect(h).not.toContain("rahasia123");
    expect(await verifyPassword("rahasia123", h)).toBe(true);
    expect(await verifyPassword("salah", h)).toBe(false);
  });
});

describe("register + login + logout", () => {
  it("daftar → sesi cookie terisi → user terbaca", async () => {
    await expect(
      register({ email: "Ibu@contoh.id", username: "Ibu", password: "keluarga123", role: "keluarga" }),
    ).rejects.toThrow("NEXT_REDIRECT:/");
    expect(jar.get(SESSION_COOKIE)).toBeTruthy();
    const u = await ambilUser();
    expect(u).toMatchObject({ email: "ibu@contoh.id", username: "Ibu", role: "keluarga" });
  });

  it("menolak email/username ganda dan password lemah", async () => {
    await expect(
      register({ email: "a@x.id", username: "Ayah", password: "ayah1234", role: "pribadi" }),
    ).rejects.toThrow("NEXT_REDIRECT");
    await expect(
      register({ email: "A@X.id", username: "Lain", password: "lain1234", role: "pribadi" }),
    ).rejects.toThrow("Email sudah terdaftar");
    await expect(
      register({ email: "b@x.id", username: "AYAH", password: "b1234567", role: "pribadi" }),
    ).rejects.toThrow("Username sudah dipakai");
    await expect(
      register({ email: "c@x.id", username: "Caca", password: "pendek", role: "pribadi" }),
    ).rejects.toThrow();
    await expect(
      register({ email: "d@x.id", username: "Dede", password: "tanpaangka", role: "pribadi" }),
    ).rejects.toThrow("huruf + angka");
  });

  it("login benar/salah + sesi tunggal + logout", async () => {
    await expect(
      register({ email: "a@x.id", username: "Ayah", password: "ayah1234", role: "pribadi" }),
    ).rejects.toThrow("NEXT_REDIRECT");
    const token1 = jar.get(SESSION_COOKIE);
    await expect(login({ email: "a@x.id", password: "salah" })).rejects.toThrow("Email/password salah");
    await expect(login({ email: "a@x.id", password: "ayah1234" })).rejects.toThrow("NEXT_REDIRECT:/");
    const token2 = jar.get(SESSION_COOKIE);
    expect(token2).not.toBe(token1); // sesi lama hangus
    expect(await prisma.session.count()).toBe(1);
    await expect(logout()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(await ambilUser()).toBeNull();
  });
});

describe("isolasi data antar user", () => {
  it("B tidak melihat / tidak bisa mengubah data A", async () => {
    await expect(
      register({ email: "a@x.id", username: "Ayah", password: "ayah1234", role: "keluarga" }),
    ).rejects.toThrow("NEXT_REDIRECT");
    const userA = (await ambilUser())!;
    const idA = await createTransaksi({
      jenis: "masuk",
      jumlah: "100000",
      tanggal: "2026-09-01",
      kategori: "Gajian",
    });
    expect((await getTransaksiPage({ userId: userA.id })).rows).toHaveLength(1);

    jar.clear(); // ganti perangkat: sesi A hilang
    await expect(
      register({ email: "b@x.id", username: "Bunda", password: "bunda1234", role: "keluarga" }),
    ).rejects.toThrow("NEXT_REDIRECT");
    const userB = (await ambilUser())!;
    expect(userB.id).not.toBe(userA.id);
    expect((await getTransaksiPage({ userId: userB.id })).rows).toHaveLength(0);

    // B mencoba hapus milik A: tidak error massal, tapi data A utuh
    await deleteTransaksi([idA]);
    expect((await getTransaksiPage({ userId: userA.id })).rows).toHaveLength(1);
  });
});
