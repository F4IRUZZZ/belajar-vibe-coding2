import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const box = vi.hoisted(() => ({ cookie: "" }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(box.cookie ? { cookie: `better-auth.session_token=${box.cookie}` } : {}),
}));

import { prisma } from "@/lib/prisma";
import { getTargets } from "@/lib/store";
import { createTarget, deleteTarget, updateTarget } from "./target";
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

describe("target tabungan", () => {
  it("buat + ubah + hapus", async () => {
    await createTarget({ nama: "DP motor", target: "5000000", deadline: "2027-01-01" });
    const t = await prisma.target.findFirstOrThrow({ where: { userId: uid } });
    expect(t.deadline).not.toBeNull();
    await updateTarget(t.id, { nama: "DP motor baru", target: "6000000" });
    const u = await prisma.target.findUniqueOrThrow({ where: { id: t.id } });
    expect(u).toMatchObject({ nama: "DP motor baru", target: 6000000, deadline: null });
    await expect(createTarget({ nama: "X", target: "0" })).rejects.toThrow("Target harus > 0");
  });

  it("terkumpul dari pemasukan bertanda saja", async () => {
    await createTarget({ nama: "DP motor", target: "1000000" });
    const t = await prisma.target.findFirstOrThrow({ where: { userId: uid } });
    await createTransaksi({
      jenis: "masuk",
      jumlah: "300000",
      tanggal: "2026-09-01",
      kategori: "Gajian",
      targetId: t.id,
    });
    await createTransaksi({
      jenis: "masuk",
      jumlah: "200000",
      tanggal: "2026-09-02",
      kategori: "Bonus",
    });
    await createTransaksi({
      jenis: "keluar",
      jumlah: "50000",
      tanggal: "2026-09-03",
      kategori: "Pangan",
      targetId: t.id, // keluar bertanda tetap tidak dihitung
    });
    const daftar = await getTargets(uid);
    expect(daftar).toHaveLength(1);
    expect(daftar[0]).toMatchObject({ terkumpul: 300000, persen: 30 });
  });

  it("menolak target milik orang lain", async () => {
    const lain = await buatSesiTest("lain@x.id", "Lain");
    const milikLain = await prisma.target.create({
      data: { userId: lain.userId, nama: "Rahasia", target: 1000 },
    });
    await expect(
      createTransaksi({
        jenis: "masuk",
        jumlah: "1000",
        tanggal: "2026-09-01",
        kategori: "X",
        targetId: milikLain.id,
      }),
    ).rejects.toThrow("Target tidak ditemukan");
    await expect(updateTarget(milikLain.id, { nama: "X", target: "1" })).rejects.toThrow(
      "Data tidak ditemukan",
    );
  });

  it("hapus target melepas tanda (SetNull)", async () => {
    await createTarget({ nama: "DP motor", target: "1000000" });
    const t = await prisma.target.findFirstOrThrow({ where: { userId: uid } });
    await createTransaksi({
      jenis: "masuk",
      jumlah: "100000",
      tanggal: "2026-09-01",
      kategori: "Gajian",
      targetId: t.id,
    });
    await deleteTarget(t.id);
    expect(await prisma.target.count()).toBe(0);
    const tx = await prisma.transaksi.findFirstOrThrow({});
    expect(tx.targetId).toBeNull();
  });
});
