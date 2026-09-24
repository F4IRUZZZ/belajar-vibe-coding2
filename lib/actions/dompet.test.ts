import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const box = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(box.cookie ? { cookie: `better-auth.session_token=${box.cookie}` } : {}),
}));

import { prisma } from "@/lib/prisma";
import { DOMPET_KAS, getSaldoPerDompet } from "@/lib/store";
import { createDompet, deleteDompet, getDompetSaya, renameDompet } from "./dompet";
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
    const lain = await buatSesiTest("lain@x.id", "Lain");
    const milikLain = await prisma.dompet.create({ data: { userId: lain.userId, nama: "Brankas" } });
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
