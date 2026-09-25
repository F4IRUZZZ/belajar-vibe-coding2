"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { wajibUser } from "@/lib/auth";
import { DOMPET_KAS } from "@/lib/store";

function segarkan() {
  revalidatePath("/");
  revalidatePath("/transaksi");
  revalidatePath("/pengaturan");
}

// Daftar dompet user; "Kas" selalu ada (dibuat malas).
export async function getDompetSaya() {
  const user = await wajibUser();
  let rows = await prisma.dompet.findMany({ where: { userId: user.id }, orderBy: { nama: "asc" } });
  if (!rows.some((d) => d.nama === DOMPET_KAS)) {
    await prisma.dompet.create({ data: { userId: user.id, nama: DOMPET_KAS } });
    rows = await prisma.dompet.findMany({ where: { userId: user.id }, orderBy: { nama: "asc" } });
  }
  return rows;
}

const dompetSchema = z.object({ nama: z.string().min(1).max(50) });

export async function createDompet(input: z.infer<typeof dompetSchema>) {
  const user = await wajibUser();
  const nama = dompetSchema.parse(input).nama.trim();
  if (!nama) throw new Error("Nama wajib");
  if (await prisma.dompet.findFirst({ where: { userId: user.id, nama } })) {
    throw new Error("Dompet sudah ada");
  }
  await prisma.dompet.create({ data: { userId: user.id, nama } });
  segarkan();
}

export async function renameDompet(id: string, namaBaru: string) {
  const user = await wajibUser();
  const nama = namaBaru.trim();
  if (!nama) throw new Error("Nama wajib");
  if (await prisma.dompet.findFirst({ where: { userId: user.id, nama, NOT: { id } } })) {
    throw new Error("Dompet sudah ada");
  }
  const r = await prisma.dompet.updateMany({ where: { id, userId: user.id }, data: { nama } });
  if (r.count === 0) throw new Error("Data tidak ditemukan");
  segarkan();
}

// Hapus hanya bila kosong agar histori tidak yatim.
export async function deleteDompet(id: string) {
  const user = await wajibUser();
  const d = await prisma.dompet.findFirst({ where: { id, userId: user.id } });
  if (!d) throw new Error("Data tidak ditemukan");
  if (d.nama === DOMPET_KAS) throw new Error("Dompet Kas tidak bisa dihapus");
  const pakai = await prisma.transaksi.count({ where: { dompetId: id, userId: user.id } });
  if (pakai > 0) throw new Error(`Masih dipakai ${pakai} transaksi`);
  await prisma.dompet.delete({ where: { id } });
  segarkan();
}
