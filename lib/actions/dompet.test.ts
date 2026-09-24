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
import { DOMPET_KAS, getSaldoPerDompet } from "@/lib/store";
import { createDompet, deleteDompet, getDompetSaya, renameDompet } from "./dompet";
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

describe("dompet", () => {
  it("Kas otomatis ada + CRUD + tolak ganda", async () => {
    const awal = await getDompetSaya();
    expect(awal.map((d) => d.nama)).toEqual([DOMPET_KAS]);
    await createDompet({ nama: "Bank" });
    await expect(createDompet({ nama: "Bank" })).rejects.toThrow("Dompet sudah ada");
    const bank = await prisma.dompet.findFirstOrThrow({ where: { userId: uid, nama: "Bank" } });
    await renameDompet(bank.id, "Bank Utama");
    await expect(deleteDompet((await prisma.dompet.findFirstOrThrow({ where: { nama: DOMPET_KAS } })).id)).rejects.toThrow(
      "tidak bisa dihapus",
    );
  });

  it("hapus diblokir bila dipakai", async () => {
    await createDompet({ nama: "Bank" });
    const bank = await prisma.dompet.findFirstOrThrow({ where: { nama: "Bank" } });
    await createTransaksi({
      jenis: "masuk",
      jumlah: "100000",
      tanggal: "2026-09-01",
      kategori: "Gajian",
      dompetId: bank.id,
    });
    await expect(deleteDompet(bank.id)).rejects.toThrow("Masih dipakai 1 transaksi");
  });

  it("saldo per dompet + NULL lama terlipat ke Kas", async () => {
    const dompets = await getDompetSaya();
    const kas = dompets.find((d) => d.nama === DOMPET_KAS)!;
    await createDompet({ nama: "Bank" });
    const bank = await prisma.dompet.findFirstOrThrow({ where: { nama: "Bank" } });
    await createTransaksi({ jenis: "masuk", jumlah: "100000", tanggal: "2026-09-01", kategori: "Gajian" }); // NULL → Kas
    await createTransaksi({
      jenis: "masuk",
      jumlah: "50000",
      tanggal: "2026-09-02",
      kategori: "Bonus",
      dompetId: bank.id,
    });
    await createTransaksi({
      jenis: "keluar",
      jumlah: "20000",
      tanggal: "2026-09-03",
      kategori: "Pangan",
      dompetId: bank.id,
    });
    const r = await getSaldoPerDompet("semua", uid);
    const byNama = new Map(r.map((x) => [x.nama, x]));
    expect(byNama.get(DOMPET_KAS)).toMatchObject({ masuk: 100000, keluar: 0, saldo: 100000 });
    expect(byNama.get("Bank")).toMatchObject({ masuk: 50000, keluar: 20000, saldo: 30000 });
    expect(kas).toBeTruthy();
  });

  it("menolak dompet milik orang lain", async () => {
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
    const milikLain = await prisma.dompet.create({ data: { userId: lain.id, nama: "Brankas" } });
    await expect(
      createTransaksi({
        jenis: "masuk",
        jumlah: "1000",
        tanggal: "2026-09-01",
        kategori: "X",
        dompetId: milikLain.id,
      }),
    ).rejects.toThrow("Dompet tidak ditemukan");
  });
});
