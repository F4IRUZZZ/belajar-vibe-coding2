"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { wajibUser } from "@/lib/auth";
import { parseRupiah, rentangBulan } from "@/lib/format";

const anggaranSchema = z.object({
  kategori: z.string().min(1).max(100),
  batas: z.string().min(1),
  bulan: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

function segarkan() {
  revalidatePath("/");
  revalidatePath("/anggaran");
}

export async function upsertAnggaran(input: z.infer<typeof anggaranSchema>) {
  const user = await wajibUser();
  const p = anggaranSchema.parse(input);
  const kategori = p.kategori.trim();
  if (!kategori) throw new Error("Kategori wajib");
  const batas = parseRupiah(p.batas);
  if (batas <= 0) throw new Error("Batas harus > 0");
  rentangBulan(p.bulan); // validasi format
  const ada = await prisma.anggaran.findFirst({ where: { userId: user.id, kategori, bulan: p.bulan } });
  if (ada) {
    await prisma.anggaran.update({ where: { id: ada.id }, data: { batas } });
  } else {
    await prisma.anggaran.create({ data: { userId: user.id, kategori, batas, bulan: p.bulan } });
  }
  segarkan();
}

export async function hapusAnggaran(id: string) {
  const user = await wajibUser();
  const r = await prisma.anggaran.deleteMany({ where: { id, userId: user.id } });
  if (r.count === 0) throw new Error("Data tidak ditemukan");
  segarkan();
}

// Salin semua anggaran bulan sumber ke bulan tujuan (lewati yang sudah ada).
export async function salinBulanLalu(bulanSumber: string, bulanTujuan: string) {
  const user = await wajibUser();
  rentangBulan(bulanSumber);
  rentangBulan(bulanTujuan);
  if (bulanSumber === bulanTujuan) throw new Error("Bulan sumber dan tujuan sama");
  const sumber = await prisma.anggaran.findMany({ where: { userId: user.id, bulan: bulanSumber } });
  if (sumber.length === 0) throw new Error(`Tidak ada anggaran bulan ${bulanSumber}`);
  const tujuan = await prisma.anggaran.findMany({
    where: { userId: user.id, bulan: bulanTujuan },
    select: { kategori: true },
  });
  const ada = new Set(tujuan.map((t) => t.kategori));
  const baru = sumber.filter((s) => !ada.has(s.kategori));
  if (baru.length === 0) throw new Error(`Bulan ${bulanTujuan} sudah lengkap`);
  await prisma.anggaran.createMany({
    data: baru.map((s) => ({ userId: user.id, kategori: s.kategori, batas: s.batas, bulan: bulanTujuan })),
  });
  segarkan();
  return baru.length;
}
