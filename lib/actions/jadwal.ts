"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { wajibUser } from "@/lib/auth";
import { parseRupiah, parseTanggalLokal } from "@/lib/format";

const jadwalSchema = z.object({
  frekuensi: z.enum(["mingguan", "bulanan"]),
  jenis: z.enum(["masuk", "keluar"]),
  jumlah: z.string().min(1),
  kategori: z.string().min(1).max(100),
  catatan: z.string().max(500).optional(),
  mulai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function segarkan() {
  revalidatePath("/jadwal");
  revalidatePath("/transaksi");
  revalidatePath("/");
}

export async function createJadwal(input: z.infer<typeof jadwalSchema>) {
  const user = await wajibUser();
  const p = jadwalSchema.parse(input);
  const jumlah = parseRupiah(p.jumlah);
  if (jumlah <= 0) throw new Error("Jumlah harus > 0");
  const kategori = p.kategori.trim();
  if (!kategori) throw new Error("Kategori wajib");
  await prisma.jadwal.create({
    data: {
      userId: user.id,
      frekuensi: p.frekuensi,
      jenis: p.jenis,
      jumlah,
      kategori,
      catatan: p.catatan?.trim() || null,
      nextRun: parseTanggalLokal(p.mulai),
    },
  });
  segarkan();
}

export async function toggleJadwal(id: string, aktif: boolean) {
  const user = await wajibUser();
  const r = await prisma.jadwal.updateMany({ where: { id, userId: user.id }, data: { aktif } });
  if (r.count === 0) throw new Error("Data tidak ditemukan");
  segarkan();
}

export async function deleteJadwal(id: string) {
  const user = await wajibUser();
  const r = await prisma.jadwal.deleteMany({ where: { id, userId: user.id } });
  if (r.count === 0) throw new Error("Data tidak ditemukan");
  segarkan();
}

function maju(tanggal: Date, frekuensi: "mingguan" | "bulanan"): Date {
  const d = new Date(tanggal);
  if (frekuensi === "mingguan") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

// Eksekusi semua jadwal SATU user yang jatuh tempo. Idempoten per periode
// (lastKunci) sehingga aman dipanggil cron tiap hari maupun manual berkali-kali.
export async function jalankanJadwal(sekarang: Date = new Date()): Promise<number> {
  const user = await wajibUser();
  return jalankanUntuk(user.id, sekarang);
}

// Cron: semua user yang punya jadwal aktif jatuh tempo. Tanpa sesi,
// dipanggil lewat /api/jadwal/run yang dijaga CRON_SECRET.
export async function jalankanSemua(sekarang: Date = new Date()): Promise<number> {
  const due = await prisma.jadwal.findMany({
    where: { aktif: true, nextRun: { lte: sekarang } },
    select: { userId: true },
    distinct: ["userId"],
  });
  let total = 0;
  for (const d of due) total += await jalankanUntuk(d.userId, sekarang);
  return total;
}

async function jalankanUntuk(userId: string, sekarang: Date): Promise<number> {
  const due = await prisma.jadwal.findMany({
    where: { userId, aktif: true, nextRun: { lte: sekarang } },
    orderBy: { nextRun: "asc" },
  });
  let jalan = 0;
  for (const j of due) {
    const kunci = j.nextRun.toISOString().slice(0, 10);
    if (j.lastKunci === kunci) {
      // Sudah dieksekusi periode ini, majukan saja bila tertinggal jauh.
      await prisma.jadwal.update({
        where: { id: j.id },
        data: { nextRun: maju(j.nextRun, j.frekuensi) },
      });
      continue;
    }
    await prisma.$transaction([
      prisma.transaksi.create({
        data: {
          userId,
          jenis: j.jenis,
          jumlah: j.jumlah,
          tanggal: j.nextRun,
          kategori: `${j.kategori} (rutin)`,
          ...(j.catatan ? { catatan: { create: { isi: j.catatan } } } : {}),
        },
      }),
      prisma.jadwal.update({
        where: { id: j.id },
        data: { lastKunci: kunci, nextRun: maju(j.nextRun, j.frekuensi) },
      }),
    ]);
    jalan++;
  }
  if (jalan > 0) segarkan();
  return jalan;
}

export async function getJadwalSaya() {
  const user = await wajibUser();
  return prisma.jadwal.findMany({ where: { userId: user.id }, orderBy: { nextRun: "asc" } });
}
