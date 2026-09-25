"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

function normKategori(s: string): string {
  const t = s.trim();
  if (!t) return "Lainnya";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export async function getKategoriNormalize(input: string): Promise<string> {
  const t = input.trim();
  if (!t) return "Lainnya";
  const existing = await prisma.produk.findMany({ select: { kategori: true }, distinct: ["kategori"] });
  const hit = existing.find((e) => e.kategori.toLowerCase() === t.toLowerCase());
  return hit ? hit.kategori : normKategori(t);
}

const produkSchema = z.object({
  nama: z.string().min(1).max(100),
  kategori: z.string().max(100).optional(),
});

export async function createProduk(input: z.infer<typeof produkSchema>) {
  const p = produkSchema.parse(input);
  const nama = p.nama.trim();
  if (!nama) throw new Error("Nama wajib");
  const namaLower = nama.toLowerCase();
  const dup = await prisma.produk.findUnique({ where: { namaLower } });
  if (dup) throw new Error("Nama produk sudah ada");
  const kategori = await getKategoriNormalize(p.kategori ?? "");
  await prisma.produk.create({ data: { nama, namaLower, kategori } });
  revalidatePath("/produk");
  revalidatePath("/transaksi");
}

export async function updateProduk(id: string, input: z.infer<typeof produkSchema>) {
  const p = produkSchema.parse(input);
  const nama = p.nama.trim();
  const namaLower = nama.toLowerCase();
  const dup = await prisma.produk.findFirst({ where: { namaLower, NOT: { id } } });
  if (dup) throw new Error("Nama produk sudah ada");
  const kategori = await getKategoriNormalize(p.kategori ?? "");
  await prisma.produk.update({ where: { id }, data: { nama, namaLower, kategori } });
  revalidatePath("/produk");
  revalidatePath("/transaksi");
}

export async function deleteProduk(id: string) {
  await prisma.produk.delete({ where: { id } });
  revalidatePath("/produk");
  revalidatePath("/transaksi");
}
