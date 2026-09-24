"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseRupiah } from "@/lib/format";

const transaksiSchema = z.object({
  jenis: z.enum(["masuk", "keluar"]),
  jumlah: z.string().min(1),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kategori: z.string().min(1).max(100),
  produkId: z.string().optional(),
  catatan: z.string().max(500).optional(),
});

export async function createTransaksi(input: z.infer<typeof transaksiSchema>) {
  const p = transaksiSchema.parse(input);
  const jumlah = parseRupiah(p.jumlah);
  if (jumlah <= 0) throw new Error("Jumlah harus > 0");
  const tanggal = new Date(p.tanggal + "T12:00:00");
  const tx = await prisma.transaksi.create({
    data: {
      jenis: p.jenis,
      jumlah,
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
  if (input.tanggal) data.tanggal = new Date(input.tanggal + "T12:00:00");
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
