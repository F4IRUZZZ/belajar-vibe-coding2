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
import { getTransaksiPage, getTransaksiTotal } from "@/lib/store";
import { bayarHutang, createHutang } from "./hutang";
import { createTransaksi, deleteTransaksi } from "./transaksi";

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

describe("createTransaksi", () => {
  it("masuk + keluar dengan produk dan catatan", async () => {
    const produk = await prisma.produk.create({
      data: { nama: "Beras", namaLower: "beras", kategori: "Pangan" },
    });
    const idMasuk = await createTransaksi({
      jenis: "masuk",
      jumlah: "300000",
      tanggal: "2026-09-01",
      kategori: "Gajian",
      catatan: "Gajian minggu ini",
    });
    const idKeluar = await createTransaksi({
      jenis: "keluar",
      jumlah: "50000",
      tanggal: "2026-09-02",
      kategori: "Pangan",
      produkId: produk.id,
    });
    const tx = await prisma.transaksi.findMany({ include: { catatan: true } });
    expect(tx).toHaveLength(2);
    expect(tx.find((t) => t.id === idMasuk)?.catatan).toHaveLength(1);
    expect(tx.find((t) => t.id === idKeluar)?.produkId).toBe(produk.id);
  });

  it("menolak jumlah nol", async () => {
    await expect(
      createTransaksi({ jenis: "keluar", jumlah: "0", tanggal: "2026-09-02", kategori: "Pangan" }),
    ).rejects.toThrow("Jumlah harus > 0");
  });
});

describe("bayarHutang transaksional", () => {
  it("cicil sebagian lalu lunasi + auto-jurnal kas", async () => {
    await createHutang({
      arah: "hutang",
      pihak: "Budi",
      jumlah: "100000",
      tanggal: "2026-09-01",
    });
    const h = (await prisma.hutang.findFirstOrThrow({ where: { pihak: "Budi" } }));
    await bayarHutang(h.id, "40000");
    const cicil = await prisma.hutang.findUniqueOrThrow({ where: { id: h.id } });
    expect(cicil.dibayar).toBe(40000);
    expect(cicil.status).toBe("belum");

    await bayarHutang(h.id, "60000");
    const lunas = await prisma.hutang.findUniqueOrThrow({ where: { id: h.id } });
    expect(lunas.status).toBe("lunas");
    expect(lunas.transaksiIdLunas).not.toBeNull();
    const kas = await prisma.transaksi.count({ where: { kategori: "Bayar Hutang" } });
    expect(kas).toBe(2);
  });

  it("menolak nominal melebihi sisa dan bayar ganda saat lunas", async () => {
    await createHutang({
      arah: "piutang",
      pihak: "Ani",
      jumlah: "50000",
      tanggal: "2026-09-01",
    });
    const h = await prisma.hutang.findFirstOrThrow({ where: { pihak: "Ani" } });
    await expect(bayarHutang(h.id, "60000")).rejects.toThrow("melebihi sisa");
    await bayarHutang(h.id, "50000");
    await expect(bayarHutang(h.id, "1000")).rejects.toThrow("Sudah lunas");
  });
});

describe("deleteTransaksi bulk", () => {
  it("hapus massal = masuk sampah (catatan ikut sembunyi, belum musnah)", async () => {
    const a = await createTransaksi({
      jenis: "keluar",
      jumlah: "10000",
      tanggal: "2026-09-01",
      kategori: "Pangan",
      catatan: "hapus saya",
    });
    const b = await createTransaksi({
      jenis: "keluar",
      jumlah: "20000",
      tanggal: "2026-09-01",
      kategori: "Mandi",
    });
    await deleteTransaksi([a, b]);
    expect((await getTransaksiPage({ userId: uid })).rows).toHaveLength(0);
    expect(await prisma.transaksi.count()).toBe(2); // masih ada (sampah)
    expect(await prisma.catatan.count()).toBe(1); // ikut sembunyi, belum cascade
  });
});

describe("getTransaksiPage + getTransaksiTotal (DB)", () => {
  it("cursor tidak duplikat dan mencakup semua", async () => {
    for (let i = 1; i <= 25; i++) {
      await createTransaksi({
        jenis: i % 2 ? "masuk" : "keluar",
        jumlah: String(1000 * i),
        tanggal: `2026-08-${String((i % 28) + 1).padStart(2, "0")}`,
        kategori: i % 2 ? "Gajian" : "Pangan",
      });
    }
    const p1 = await getTransaksiPage({ userId: uid, limit: 10 });
    expect(p1.rows).toHaveLength(10);
    expect(p1.nextCursor).not.toBeNull();
    const p2 = await getTransaksiPage({ userId: uid, limit: 10, cursor: p1.nextCursor! });
    const p3 = await getTransaksiPage({ userId: uid, limit: 10, cursor: p2.nextCursor! });
    const ids = [...p1.rows, ...p2.rows, ...p3.rows].map((t) => t.id);
    expect(new Set(ids).size).toBe(25);
    expect(p3.nextCursor).toBeNull();

    const total = await getTransaksiTotal({ userId: uid });
    expect(total.masuk).toBeGreaterThan(0);
    expect(total.keluar).toBeGreaterThan(0);
  });

  it("search kategori/catatan/nominal/tanggal di DB", async () => {
    await createTransaksi({
      jenis: "keluar",
      jumlah: "75000",
      tanggal: "2026-07-15",
      kategori: "Pangan",
      catatan: "belanja warung langganan",
    });
    await createTransaksi({
      jenis: "masuk",
      jumlah: "300000",
      tanggal: "2026-07-01",
      kategori: "Gajian",
    });
    expect((await getTransaksiPage({ userId: uid, search: "warung" })).rows).toHaveLength(1);
    expect((await getTransaksiPage({ userId: uid, search: "PANGAN" })).rows).toHaveLength(1);
    expect((await getTransaksiPage({ userId: uid, search: "75000" })).rows).toHaveLength(1);
    expect((await getTransaksiPage({ userId: uid, search: "2026-07-15" })).rows).toHaveLength(1);
    expect((await getTransaksiPage({ userId: uid, search: "tidak-ada-xyz" })).rows).toHaveLength(0);
    const total = await getTransaksiTotal({ userId: uid, search: "warung" });
    expect(total).toEqual({ masuk: 0, keluar: 75000 });
  });
});
