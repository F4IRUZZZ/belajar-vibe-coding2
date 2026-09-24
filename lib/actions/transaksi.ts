"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { wajibUser } from "@/lib/auth";
import { parseRupiah, parseTanggalLokal } from "@/lib/format";

const transaksiSchema = z.object({
  jenis: z.enum(["masuk", "keluar"]),
  jumlah: z.string().min(1),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kategori: z.string().min(1).max(100),
  produkId: z.string().optional(),
  hargaSatuan: z.string().optional(),
  targetId: z.string().optional(),
  catatan: z.string().max(500).optional(),
});

export async function createTransaksi(input: z.infer<typeof transaksiSchema>) {
  const user = await wajibUser();
  const p = transaksiSchema.parse(input);
  const jumlah = parseRupiah(p.jumlah);
  if (jumlah <= 0) throw new Error("Jumlah harus > 0");
  const tanggal = parseTanggalLokal(p.tanggal);
  // Harga satuan hanya relevan untuk pembelian berproduk; selain itu abaikan.
  const pakaiHarga = p.jenis === "keluar" && !!p.produkId;
  const hargaSatuan = pakaiHarga && p.hargaSatuan ? parseRupiah(p.hargaSatuan) : null;
  if (pakaiHarga && p.hargaSatuan && (hargaSatuan ?? 0) <= 0) throw new Error("Harga satuan harus > 0");
  // Penanda target hanya untuk pemasukan milik sendiri.
  let targetId: string | null = null;
  if (p.jenis === "masuk" && p.targetId) {
    const t = await prisma.target.findFirst({ where: { id: p.targetId, userId: user.id }, select: { id: true } });
    if (!t) throw new Error("Target tidak ditemukan");
    targetId = t.id;
  }
  const tx = await prisma.transaksi.create({
    data: {
      userId: user.id,
      jenis: p.jenis,
      jumlah,
      hargaSatuan,
      targetId,
      tanggal,
      kategori: p.kategori.trim(),
      produkId: p.produkId || null,
      ...(p.catatan?.trim() ? { catatan: { create: { isi: p.catatan.trim() } } } : {}),
    },
  });
  revalidatePath("/");
  revalidatePath("/transaksi");
  return tx.id;
}

export async function updateTransaksi(id: string, input: { jumlah?: string; tanggal?: string; kategori?: string }) {
  const user = await wajibUser();
  const data: { jumlah?: number; tanggal?: Date; kategori?: string } = {};
  if (input.jumlah !== undefined) {
    const j = parseRupiah(input.jumlah);
    if (j <= 0) throw new Error("Jumlah harus > 0");
    data.jumlah = j;
  }
  if (input.tanggal) data.tanggal = parseTanggalLokal(input.tanggal);
  if (input.kategori) data.kategori = input.kategori.trim();
  const r = await prisma.transaksi.updateMany({ where: { id, userId: user.id }, data });
  if (r.count === 0) throw new Error("Data tidak ditemukan");
  revalidatePath("/");
  revalidatePath("/transaksi");
}

export async function deleteTransaksi(ids: string[]) {
  if (ids.length === 0) return;
  const user = await wajibUser();
  await prisma.transaksi.deleteMany({ where: { id: { in: ids }, userId: user.id } });
  revalidatePath("/");
  revalidatePath("/transaksi");
}

async function milikUser(transaksiId: string, userId: string) {
  const t = await prisma.transaksi.findFirst({ where: { id: transaksiId, userId }, select: { id: true } });
  if (!t) throw new Error("Data tidak ditemukan");
}

export async function addCatatan(transaksiId: string, isi: string) {
  const user = await wajibUser();
  const v = isi.trim();
  if (!v) throw new Error("Catatan kosong");
  await milikUser(transaksiId, user.id);
  await prisma.catatan.create({ data: { transaksiId, isi: v } });
  revalidatePath("/transaksi");
}

async function catatanMilikUser(id: string, userId: string) {
  const c = await prisma.catatan.findFirst({
    where: { id, transaksi: { userId } },
    select: { id: true },
  });
  if (!c) throw new Error("Data tidak ditemukan");
}

export async function updateCatatan(id: string, isi: string) {
  const user = await wajibUser();
  await catatanMilikUser(id, user.id);
  await prisma.catatan.update({ where: { id }, data: { isi: isi.trim() } });
  revalidatePath("/transaksi");
}

export async function deleteCatatan(id: string) {
  const user = await wajibUser();
  await catatanMilikUser(id, user.id);
  await prisma.catatan.delete({ where: { id } });
  revalidatePath("/transaksi");
}

// Harga terakhir produk untuk prefill form (dipanggil saat produk dipilih).
export async function getHargaTerakhir(produkId: string): Promise<number | null> {
  const user = await wajibUser();
  const { getHargaTerakhirProduk } = await import("@/lib/store");
  return getHargaTerakhirProduk(produkId, user.id);
}

// Halaman berikutnya untuk tombol "Muat lagi" (tanggal -> ISO agar serializable).
export async function listTransaksiPage(input: { jenis?: "masuk" | "keluar"; search?: string; cursor: string }) {
  const user = await wajibUser();
  const { getTransaksiPage } = await import("@/lib/store");
  const { rows, nextCursor } = await getTransaksiPage({
    userId: user.id,
    jenis: input.jenis,
    search: input.search,
    cursor: input.cursor,
  });
  return {
    rows: rows.map((t) => ({
      ...t,
      tanggal: t.tanggal.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      produk: t.produk
        ? { ...t.produk, createdAt: t.produk.createdAt.toISOString(), updatedAt: t.produk.updatedAt.toISOString() }
        : null,
      catatan: t.catatan.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    })),
    nextCursor,
  };
}
