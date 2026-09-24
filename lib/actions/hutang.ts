"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { wajibUser } from "@/lib/auth";
import { parseRupiah, parseTanggalLokal } from "@/lib/format";

const hutangSchema = z.object({
  arah: z.enum(["hutang", "piutang"]),
  pihak: z.string().min(1).max(100),
  jumlah: z.string().min(1),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  jatuhTempo: z.string().optional(),
  keterangan: z.string().max(500).optional(),
});

export async function createHutang(input: z.infer<typeof hutangSchema>) {
  const user = await wajibUser();
  const p = hutangSchema.parse(input);
  const jumlah = parseRupiah(p.jumlah);
  if (jumlah <= 0) throw new Error("Jumlah harus > 0");
  if (!p.pihak.trim()) throw new Error("Pihak wajib");
  await prisma.hutang.create({
    data: {
      userId: user.id,
      arah: p.arah,
      pihak: p.pihak.trim(),
      jumlah,
      tanggal: parseTanggalLokal(p.tanggal),
      jatuhTempo: p.jatuhTempo ? parseTanggalLokal(p.jatuhTempo) : null,
      keterangan: p.keterangan?.trim() || null,
    },
  });
  revalidatePath("/hutang");
}

// Bayar sebagian / pelunasan: transaksional + auto-jurnal ke kas + idempoten.
export async function bayarHutang(id: string, nominalStr: string) {
  const user = await wajibUser();
  const nominal = parseRupiah(nominalStr);
  if (nominal <= 0) throw new Error("Nominal harus > 0");
  await prisma.$transaction(async (tx) => {
    const h = await tx.hutang.findFirst({ where: { id, userId: user.id } });
    if (!h) throw new Error("Data tidak ditemukan");
    if (h.status === "lunas") throw new Error("Sudah lunas");
    const sisa = h.jumlah - h.dibayar;
    if (nominal > sisa) throw new Error(`Nominal melebihi sisa (Rp${sisa.toLocaleString("id-ID")})`);
    const baruDibayar = h.dibayar + nominal;
    const lunas = baruDibayar >= h.jumlah;
    // Auto-catat ke kas: hutang->keluar, piutang->masuk
    const kas = await tx.transaksi.create({
      data: {
        userId: user.id,
        jenis: h.arah === "hutang" ? "keluar" : "masuk",
        jumlah: nominal,
        tanggal: new Date(),
        kategori: h.arah === "hutang" ? "Bayar Hutang" : "Terima Piutang",
      },
    });
    await tx.catatan.create({
      data: {
        transaksiId: kas.id,
        isi: `${lunas ? "Pelunasan" : "Bayar"} ${h.arah} ${h.pihak} Rp${nominal.toLocaleString("id-ID")}`,
      },
    });
    await tx.hutang.update({
      where: { id },
      data: { dibayar: baruDibayar, status: lunas ? "lunas" : "belum", transaksiIdLunas: lunas ? kas.id : h.transaksiIdLunas },
    });
  });
  revalidatePath("/hutang");
  revalidatePath("/");
  revalidatePath("/transaksi");
}

export async function deleteHutang(id: string) {
  const user = await wajibUser();
  const h = await prisma.hutang.findFirst({ where: { id, userId: user.id } });
  if (!h) throw new Error("Data tidak ditemukan");
  if (h.status === "lunas") throw new Error("Yang lunas = jejak audit, tidak bisa dihapus");
  await prisma.hutang.delete({ where: { id: h.id } });
  revalidatePath("/hutang");
}
