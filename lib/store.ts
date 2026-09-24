import "server-only";
import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { bulanIni, rentangBulan, startOfMonth, startOfWeek } from "./format";

export type Periode = "semua" | "minggu" | "bulan";

export function periodeRange(p: Periode): { dari?: Date; sampai?: Date } {
  if (p === "minggu") return { dari: startOfWeek() };
  if (p === "bulan") return { dari: startOfMonth() };
  return {};
}

export async function getSaldo(periode: Periode = "semua") {
  const { dari } = periodeRange(periode);
  const where = dari ? { tanggal: { gte: dari } } : {};
  const [masuk, keluar] = await Promise.all([
    prisma.transaksi.aggregate({ _sum: { jumlah: true }, where: { ...where, jenis: "masuk" } }),
    prisma.transaksi.aggregate({ _sum: { jumlah: true }, where: { ...where, jenis: "keluar" } }),
  ]);
  const totalMasuk = masuk._sum.jumlah ?? 0;
  const totalKeluar = keluar._sum.jumlah ?? 0;
  return { totalMasuk, totalKeluar, saldo: totalMasuk - totalKeluar };
}

export async function getRingkasanKategori(periode: Periode = "semua") {
  const { dari } = periodeRange(periode);
  const rows = await prisma.transaksi.findMany({
    where: { ...(dari ? { tanggal: { gte: dari } } : {}), jenis: "keluar" },
    select: { kategori: true, jumlah: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.kategori, (map.get(r.kategori) ?? 0) + r.jumlah);
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([kategori, jumlah]) => ({ kategori, jumlah, persen: total ? Math.round((jumlah / total) * 100) : 0 }))
    .sort((a, b) => b.jumlah - a.jumlah);
}

export async function getGrafikHarian() {
  const dari = startOfWeek();
  const rows = await prisma.transaksi.findMany({
    where: { tanggal: { gte: dari } },
    select: { jenis: true, jumlah: true, tanggal: true },
  });
  const hari = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const masuk = Array(7).fill(0);
  const keluar = Array(7).fill(0);
  for (const r of rows) {
    const idx = (new Date(r.tanggal).getDay() + 6) % 7;
    if (r.jenis === "masuk") masuk[idx] += r.jumlah;
    else keluar[idx] += r.jumlah;
  }
  return hari.map((label, i) => ({ label, masuk: masuk[i], keluar: keluar[i] }));
}

export const TRANSKASI_PAGE = 50;

export type TransaksiFilter = {
  jenis?: "masuk" | "keluar";
  search?: string;
};

// WHERE dipakai bersama oleh daftar + subtotal agar angkanya konsisten.
function transaksiWhere(opts: TransaksiFilter): Prisma.TransaksiWhereInput {
  const where: Prisma.TransaksiWhereInput = { ...(opts.jenis ? { jenis: opts.jenis } : {}) };
  const q = (opts.search ?? "").trim();
  if (!q) return where;
  const or: Prisma.TransaksiWhereInput[] = [
    { kategori: { contains: q, mode: "insensitive" } },
    { catatan: { some: { isi: { contains: q, mode: "insensitive" } } } },
    { produk: { nama: { contains: q, mode: "insensitive" } } },
  ];
  if (/^\d+$/.test(q)) or.push({ jumlah: Number(q) });
  const tgl = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q);
  if (tgl) {
    const dari = new Date(Number(tgl[1]), Number(tgl[2]) - 1, Number(tgl[3]));
    const sampai = new Date(Number(tgl[1]), Number(tgl[2]) - 1, Number(tgl[3]) + 1);
    or.push({ tanggal: { gte: dari, lt: sampai } });
  }
  return { ...where, OR: or };
}

const transaksiOrder: Prisma.TransaksiOrderByWithRelationInput[] = [{ tanggal: "desc" }, { id: "desc" }];

export async function getTransaksiPage(opts: TransaksiFilter & { cursor?: string; limit?: number } = {}) {
  const limit = opts.limit ?? TRANSKASI_PAGE;
  const rows = await prisma.transaksi.findMany({
    where: transaksiWhere(opts),
    include: { catatan: true, produk: true },
    orderBy: transaksiOrder,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    take: limit + 1,
  });
  // Row ekstra hanya penanda ada-halaman-berikut; cursor = row terakhir
  // yang DIKEMBALIKAN agar tidak ada yang terlewat di batas halaman.
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1].id : null;
  return { rows: page, nextCursor };
}

// Subtotal seluruh hasil filter (bukan cuma halaman yang termuat).
export async function getTransaksiTotal(opts: TransaksiFilter = {}) {
  const where = transaksiWhere(opts);
  const [masuk, keluar] = await Promise.all([
    prisma.transaksi.aggregate({ _sum: { jumlah: true }, where: { ...where, jenis: "masuk" } }),
    prisma.transaksi.aggregate({ _sum: { jumlah: true }, where: { ...where, jenis: "keluar" } }),
  ]);
  return { masuk: masuk._sum.jumlah ?? 0, keluar: keluar._sum.jumlah ?? 0 };
}

export async function getProduk() {
  return prisma.produk.findMany({ orderBy: { nama: "asc" } });
}

export async function getKategoriExisting(): Promise<string[]> {
  const rows = await prisma.produk.findMany({ select: { kategori: true }, distinct: ["kategori"] });
  return rows.map((r) => r.kategori).sort();
}

// Harga satuan terakhir suatu produk (untuk prefill form).
export async function getHargaTerakhirProduk(produkId: string): Promise<number | null> {
  const t = await prisma.transaksi.findFirst({
    where: { produkId, jenis: "keluar", hargaSatuan: { not: null } },
    orderBy: [{ tanggal: "desc" }, { id: "desc" }],
    select: { hargaSatuan: true },
  });
  return t?.hargaSatuan ?? null;
}

export type TrenHarga = {
  terakhir: number;
  persen: number | null; // vs rata-rata ≤3 pembelian ber-harga sebelumnya
  riwayat: number[]; // ≤8 harga terakhir, tertua dulu (untuk sparkline)
};

// Tren per produk yang punya ≥2 pembelian ber-harga.
export async function getTrenHarga(): Promise<Record<string, TrenHarga>> {
  const rows = await prisma.transaksi.findMany({
    where: { jenis: "keluar", hargaSatuan: { not: null }, produkId: { not: null } },
    select: { produkId: true, hargaSatuan: true, tanggal: true, id: true },
    orderBy: [{ tanggal: "desc" }, { id: "desc" }],
  });
  const grup = new Map<string, number[]>();
  for (const r of rows) {
    if (r.produkId == null || r.hargaSatuan == null) continue;
    const arr = grup.get(r.produkId) ?? [];
    if (arr.length < 8) arr.push(r.hargaSatuan);
    grup.set(r.produkId, arr);
  }
  const hasil: Record<string, TrenHarga> = {};
  for (const [pid, arr] of grup) {
    if (arr.length < 2) continue;
    const [terakhir, ...prev] = arr;
    const dasar = prev.slice(0, 3);
    const rata = dasar.reduce((a, b) => a + b, 0) / dasar.length;
    hasil[pid] = {
      terakhir,
      persen: rata > 0 ? Math.round(((terakhir - rata) / rata) * 100) : null,
      riwayat: [...arr].reverse(),
    };
  }
  return hasil;
}

export async function getHutang() {
  const rows = await prisma.hutang.findMany({ orderBy: { tanggal: "desc" }, take: 200 });
  const sisa = (h: { jumlah: number; dibayar: number }) => h.jumlah - h.dibayar;
  return {
    hutang: rows.filter((r) => r.arah === "hutang"),
    piutang: rows.filter((r) => r.arah === "piutang"),
    sisa,
  };
}

export type StatusAnggaran = "aman" | "waspada" | "bocor";

// Anggaran vs realisasi keluar bulan tertentu + kategori tanpa anggaran.
export async function getAnggaranVsRealisasi(bulan: string = bulanIni()) {
  const { dari, sampai } = rentangBulan(bulan);
  const [anggaran, keluar] = await Promise.all([
    prisma.anggaran.findMany({ where: { userId: null, bulan }, orderBy: { kategori: "asc" } }),
    prisma.transaksi.groupBy({
      by: ["kategori"],
      where: { userId: null, jenis: "keluar", tanggal: { gte: dari, lt: sampai } },
      _sum: { jumlah: true },
    }),
  ]);
  const realisasi = new Map(keluar.map((k) => [k.kategori, k._sum.jumlah ?? 0]));
  const item = anggaran.map((a) => {
    const terpakai = realisasi.get(a.kategori) ?? 0;
    const persen = a.batas > 0 ? Math.round((terpakai / a.batas) * 100) : 0;
    const status: StatusAnggaran = persen > 100 ? "bocor" : persen >= 80 ? "waspada" : "aman";
    realisasi.delete(a.kategori);
    return { ...a, terpakai, persen, status };
  });
  const tanpaAnggaran = [...realisasi.entries()]
    .map(([kategori, terpakai]) => ({ kategori, terpakai }))
    .sort((a, b) => b.terpakai - a.terpakai);
  return { bulan, item, tanpaAnggaran };
}
