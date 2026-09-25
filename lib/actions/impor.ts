"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { wajibUser } from "@/lib/auth";
import { parseTanggalLokal } from "@/lib/format";
import { parseTransaksiCsv } from "@/lib/csv";

// Impor CSV transaksi (maks 1000 baris valid). Produk/catatan/dompet/harga
// tidak ikut (itu milik export penuh); tiap baris jadi transaksi murni.
export async function importTransaksiCsv(teks: string): Promise<{
  masuk: number;
  gagal: number;
  contohError: string[];
}> {
  const user = await wajibUser();
  if (teks.length > 500_000) throw new Error("File kebesaran (maks ~500KB)");
  const { valid, gagal, contohError } = parseTransaksiCsv(teks);
  if (valid.length > 0) {
    await prisma.transaksi.createMany({
      data: valid.map((v) => ({
        userId: user.id,
        jenis: v.jenis,
        jumlah: v.jumlah,
        tanggal: parseTanggalLokal(v.tanggal),
        kategori: v.kategori,
      })),
    });
    revalidatePath("/");
    revalidatePath("/transaksi");
  }
  return { masuk: valid.length, gagal, contohError };
}
