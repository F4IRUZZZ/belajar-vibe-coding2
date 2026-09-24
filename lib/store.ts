import "server-only";
import { prisma } from "./prisma";
import { startOfMonth, startOfWeek } from "./format";

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

export async function getTransaksi(opts: { jenis?: "masuk" | "keluar"; search?: string } = {}) {
  const rows = await prisma.transaksi.findMany({
    where: { ...(opts.jenis ? { jenis: opts.jenis } : {}) },
    include: { catatan: true, produk: true },
    orderBy: { tanggal: "desc" },
    take: 200,
  });
  const q = (opts.search ?? "").toLowerCase().trim();
  if (!q) return rows;
  return rows.filter((t) =>
    [t.kategori, t.jumlah.toString(), new Date(t.tanggal).toISOString().slice(0, 10), ...t.catatan.map((c) => c.isi)]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

export async function getProduk() {
  return prisma.produk.findMany({ orderBy: { nama: "asc" } });
}

export async function getKategoriExisting(): Promise<string[]> {
  const rows = await prisma.produk.findMany({ select: { kategori: true }, distinct: ["kategori"] });
  return rows.map((r) => r.kategori).sort();
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
