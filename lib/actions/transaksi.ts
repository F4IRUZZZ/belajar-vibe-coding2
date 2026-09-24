"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseRupiah, parseTanggalLokal } from "@/lib/format";

const transaksiSchema = z.object({
  jenis: z.enum(["masuk", "keluar"]),
  jumlah: z.string().min(1),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kategori: z.string().min(1).max(100),
  produkId: z.string().optional(),
  hargaSatuan: z.string().optional(),
  catatan: z.string().max(500).optional(),
});

export async function createTransaksi(input: z.infer<typeof transaksiSchema>) {
  const p = transaksiSchema.parse(input);
  const jumlah = parseRupiah(p.jumlah);
  if (jumlah <= 0) throw new Error("Jumlah harus > 0");
  const tanggal = parseTanggalLokal(p.tanggal);
  // Harga satuan hanya relevan untuk pembelian berproduk; selain itu abaikan.
  const pakaiHarga = p.jenis === "keluar" && !!p.produkId;
  const hargaSatuan = pakaiHarga && p.hargaSatuan ? parseRupiah(p.hargaSatuan) : null;
  if (pakaiHarga && p.hargaSatuan && (hargaSatuan ?? 0) <= 0) throw new Error("Harga satuan harus > 0");
  const tx = await prisma.transaksi.create({
    data: {
      jenis: p.jenis,
      jumlah,
      hargaSatuan,
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
  const data: { jumlah?: number; tanggal?: Date; kategori?: string } = {};
  if (input.jumlah !== undefined) {
    const j = parseRupiah(input.jumlah);
    if (j <= 0) throw new Error("Jumlah harus > 0");
    data.jumlah = j;
  }
  if (input.tanggal) data.tanggal = parseTanggalLokal(input.tanggal);
  if (input.kategori) data.kategori = input.kategori.trim();
  await prisma.transaksi.update({ where: { id }, data });
  revalidatePath("/");
  revalidatePath("/transaksi");
}

export async function deleteTransaksi(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.transaksi.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/");
  revalidatePath("/transaksi");
}

export async function addCatatan(transaksiId: string, isi: string) {
  const v = isi.trim();
  if (!v) throw new Error("Catatan kosong");
  await prisma.catatan.create({ data: { transaksiId, isi: v } });
  revalidatePath("/transaksi");
}

export async function updateCatatan(id: string, isi: string) {
  await prisma.catatan.update({ where: { id }, data: { isi: isi.trim() } });
  revalidatePath("/transaksi");
}

export async function deleteCatatan(id: string) {
  await prisma.catatan.delete({ where: { id } });
  revalidatePath("/transaksi");
}

// Harga terakhir produk untuk prefill form (dipanggil saat produk dipilih).
export async function getHargaTerakhir(produkId: string): Promise<number | null> {
  const { getHargaTerakhirProduk } = await import("@/lib/store");
  return getHargaTerakhirProduk(produkId);
}

// Halaman berikutnya untuk tombol "Muat lagi" (tanggal -> ISO agar serializable).
export async function listTransaksiPage(input: { jenis?: "masuk" | "keluar"; search?: string; cursor: string }) {
  const { getTransaksiPage } = await import("@/lib/store");
  const { rows, nextCursor } = await getTransaksiPage({
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
