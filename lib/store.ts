import "server-only";
import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import { bulanIni, formatRupiah, rentangBulan, startOfMonth, startOfWeek } from "./format";

export type Periode = "semua" | "minggu" | "bulan";

export function periodeRange(p: Periode): { dari?: Date; sampai?: Date } {
  if (p === "minggu") return { dari: startOfWeek() };
  if (p === "bulan") return { dari: startOfMonth() };
  return {};
}

export async function getSaldo(periode: Periode = "semua", userId: string) {
  const { dari } = periodeRange(periode);
  const where = dari ? { tanggal: { gte: dari } } : {};
  const [masuk, keluar] = await Promise.all([
    prisma.transaksi.aggregate({ _sum: { jumlah: true }, where: { ...where, jenis: "masuk", userId } }),
    prisma.transaksi.aggregate({ _sum: { jumlah: true }, where: { ...where, jenis: "keluar", userId } }),
  ]);
  const totalMasuk = masuk._sum.jumlah ?? 0;
  const totalKeluar = keluar._sum.jumlah ?? 0;
  return { totalMasuk, totalKeluar, saldo: totalMasuk - totalKeluar };
}

export async function getRingkasanKategori(periode: Periode = "semua", userId: string) {
  const { dari } = periodeRange(periode);
  const rows = await prisma.transaksi.findMany({
    where: { ...(dari ? { tanggal: { gte: dari } } : {}), jenis: "keluar", userId },
    select: { kategori: true, jumlah: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.kategori, (map.get(r.kategori) ?? 0) + r.jumlah);
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([kategori, jumlah]) => ({ kategori, jumlah, persen: total ? Math.round((jumlah / total) * 100) : 0 }))
    .sort((a, b) => b.jumlah - a.jumlah);
}

export async function getGrafikHarian(userId: string) {
  const dari = startOfWeek();
  const rows = await prisma.transaksi.findMany({
    where: { tanggal: { gte: dari }, userId },
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
  userId: string;
  jenis?: "masuk" | "keluar";
  search?: string;
};

// WHERE dipakai bersama oleh daftar + subtotal agar angkanya konsisten.
function transaksiWhere(opts: TransaksiFilter): Prisma.TransaksiWhereInput {
  const where: Prisma.TransaksiWhereInput = {
    userId: opts.userId,
    ...(opts.jenis ? { jenis: opts.jenis } : {}),
  };
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

export async function getTransaksiPage(opts: TransaksiFilter & { cursor?: string; limit?: number }) {
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
export async function getTransaksiTotal(opts: TransaksiFilter) {
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

// Harga satuan terakhir suatu produk milik user (untuk prefill form).
export async function getHargaTerakhirProduk(produkId: string, userId: string): Promise<number | null> {
  const t = await prisma.transaksi.findFirst({
    where: { produkId, userId, jenis: "keluar", hargaSatuan: { not: null } },
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

// Tren per produk milik user yang punya ≥2 pembelian ber-harga.
export async function getTrenHarga(userId: string): Promise<Record<string, TrenHarga>> {
  const rows = await prisma.transaksi.findMany({
    where: { userId, jenis: "keluar", hargaSatuan: { not: null }, produkId: { not: null } },
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

export async function getHutang(userId: string) {
  const rows = await prisma.hutang.findMany({
    where: { userId },
    orderBy: { tanggal: "desc" },
    take: 200,
  });
  const sisa = (h: { jumlah: number; dibayar: number }) => h.jumlah - h.dibayar;
  return {
    hutang: rows.filter((r) => r.arah === "hutang"),
    piutang: rows.filter((r) => r.arah === "piutang"),
    sisa,
  };
}

export type StatusAnggaran = "aman" | "waspada" | "bocor";

// Anggaran vs realisasi keluar bulan tertentu + kategori tanpa anggaran.
export async function getAnggaranVsRealisasi(bulan: string = bulanIni(), userId: string) {
  const { dari, sampai } = rentangBulan(bulan);
  const [anggaran, keluar] = await Promise.all([
    prisma.anggaran.findMany({ where: { userId, bulan }, orderBy: { kategori: "asc" } }),
    prisma.transaksi.groupBy({
      by: ["kategori"],
      where: { userId, jenis: "keluar", tanggal: { gte: dari, lt: sampai } },
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

// Satu-satunya definisi lewat-tempo: belum lunas + ada jatuh tempo yang sudah lewat.
export function isLewatTempo(h: { status: string; jatuhTempo: Date | string | null }): boolean {
  if (h.status === "lunas" || !h.jatuhTempo) return false;
  return new Date(h.jatuhTempo).getTime() < Date.now();
}

const NAMA_BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export function labelBulan(bulan: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(bulan);
  if (!m) return bulan;
  return `${NAMA_BULAN[Number(m[2]) - 1]} ${m[1]}`;
}

// Data rekap bulanan milik user untuk teks share WA.
export async function getRekap(bulan: string = bulanIni(), userId: string) {
  const { dari, sampai } = rentangBulan(bulan);
  const range = { tanggal: { gte: dari, lt: sampai } };
  const [masuk, keluar, perKategori, hutang] = await Promise.all([
    prisma.transaksi.aggregate({ _sum: { jumlah: true }, where: { ...range, jenis: "masuk", userId } }),
    prisma.transaksi.aggregate({ _sum: { jumlah: true }, where: { ...range, jenis: "keluar", userId } }),
    prisma.transaksi.groupBy({
      by: ["kategori"],
      where: { ...range, jenis: "keluar", userId },
      _sum: { jumlah: true },
    }),
    prisma.hutang.findMany({ where: { status: "belum", userId } }),
  ]);
  const totalMasuk = masuk._sum.jumlah ?? 0;
  const totalKeluar = keluar._sum.jumlah ?? 0;
  const top = perKategori
    .map((k) => ({ kategori: k.kategori, jumlah: k._sum.jumlah ?? 0 }))
    .sort((a, b) => b.jumlah - a.jumlah)
    .slice(0, 3)
    .map((k) => ({ ...k, persen: totalKeluar ? Math.round((k.jumlah / totalKeluar) * 100) : 0 }));
  const sisaHutang = hutang
    .filter((h) => h.arah === "hutang")
    .reduce((a, h) => a + (h.jumlah - h.dibayar), 0);
  const sisaPiutang = hutang
    .filter((h) => h.arah === "piutang")
    .reduce((a, h) => a + (h.jumlah - h.dibayar), 0);
  const lewatTempo = hutang.filter(isLewatTempo).length;
  return {
    bulan,
    totalMasuk,
    totalKeluar,
    saldo: totalMasuk - totalKeluar,
    top,
    sisaHutang,
    sisaPiutang,
    pihakHutang: hutang.filter((h) => h.arah === "hutang").length,
    lewatTempo,
  };
}

// Teks rekap siap paste ke grup WA keluarga.
export function formatRekapWa(r: Awaited<ReturnType<typeof getRekap>>): string {
  const rp = (n: number) => `Rp${formatRupiah(n)}`;
  const baris = [
    `*Keuangan Keluarga, ${labelBulan(r.bulan)}*`,
    `Saldo: ${rp(r.saldo)} (Masuk ${rp(r.totalMasuk)} - Keluar ${rp(r.totalKeluar)})`,
  ];
  if (r.top.length > 0) {
    baris.push(`Top keluar: ${r.top.map((t) => `${t.kategori} ${rp(t.jumlah)} (${t.persen}%)`).join(", ")}`);
  } else {
    baris.push("Belum ada pengeluaran bulan ini.");
  }
  if (r.sisaHutang > 0 || r.sisaPiutang > 0) {
    let liga = `Sisa hutang ${rp(r.sisaHutang)} (${r.pihakHutang} pihak)`;
    if (r.sisaPiutang > 0) liga += `, piutang ${rp(r.sisaPiutang)}`;
    if (r.lewatTempo > 0) liga += `, ${r.lewatTempo} LEWAT TEMPO`;
    baris.push(liga);
  }
  return baris.join("\n");
}

// Target + terkumpul (jumlah pemasukan bertanda) + persen.
export async function getTargets(userId: string) {
  const targets = await prisma.target.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (targets.length === 0) return [];
  const jumlah = await prisma.transaksi.groupBy({
    by: ["targetId"],
    where: { userId, jenis: "masuk", targetId: { not: null } },
    _sum: { jumlah: true },
  });
  const map = new Map(jumlah.map((j) => [j.targetId, j._sum.jumlah ?? 0]));
  return targets.map((t) => {
    const terkumpul = map.get(t.id) ?? 0;
    const persen = t.target > 0 ? Math.round((terkumpul / t.target) * 100) : 0;
    return { ...t, terkumpul, persen };
  });
}

export type Insight = {
  keluarIni: number;
  keluarLalu: number;
  persenKeluar: number | null; // vs bulan lalu
  kategoriNaik: { kategori: string; ini: number; lalu: number; persen: number | null }[];
  tempoDekat: { id: string; arah: string; pihak: string; sisa: number; jatuhTempo: Date }[];
};

// Perbandingan bulan berjalan vs bulan lalu + tempo ≤7 hari. Murni agregasi.
export async function getInsight(userId: string, sekarang: Date = new Date()): Promise<Insight> {
  const bulanIniStr = `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, "0")}`;
  const lalu = new Date(sekarang.getFullYear(), sekarang.getMonth() - 1, 1);
  const bulanLaluStr = `${lalu.getFullYear()}-${String(lalu.getMonth() + 1).padStart(2, "0")}`;
  const rIni = rentangBulan(bulanIniStr);
  const rLalu = rentangBulan(bulanLaluStr);

  const [aggIni, aggLalu, katIni, katLalu, hutang] = await Promise.all([
    prisma.transaksi.aggregate({
      _sum: { jumlah: true },
      where: { userId, jenis: "keluar", tanggal: { gte: rIni.dari, lt: rIni.sampai } },
    }),
    prisma.transaksi.aggregate({
      _sum: { jumlah: true },
      where: { userId, jenis: "keluar", tanggal: { gte: rLalu.dari, lt: rLalu.sampai } },
    }),
    prisma.transaksi.groupBy({
      by: ["kategori"],
      where: { userId, jenis: "keluar", tanggal: { gte: rIni.dari, lt: rIni.sampai } },
      _sum: { jumlah: true },
    }),
    prisma.transaksi.groupBy({
      by: ["kategori"],
      where: { userId, jenis: "keluar", tanggal: { gte: rLalu.dari, lt: rLalu.sampai } },
      _sum: { jumlah: true },
    }),
    prisma.hutang.findMany({
      where: {
        userId,
        status: "belum",
        jatuhTempo: { not: null, lte: new Date(sekarang.getTime() + 7 * 24 * 3600 * 1000) },
      },
      orderBy: { jatuhTempo: "asc" },
      take: 5,
    }),
  ]);

  const keluarIni = aggIni._sum.jumlah ?? 0;
  const keluarLalu = aggLalu._sum.jumlah ?? 0;
  const persenKeluar = keluarLalu > 0 ? Math.round(((keluarIni - keluarLalu) / keluarLalu) * 100) : null;

  const mapLalu = new Map(katLalu.map((k) => [k.kategori, k._sum.jumlah ?? 0]));
  const kategoriNaik = katIni
    .map((k) => {
      const ini = k._sum.jumlah ?? 0;
      const laluJ = mapLalu.get(k.kategori) ?? 0;
      return {
        kategori: k.kategori,
        ini,
        lalu: laluJ,
        persen: laluJ > 0 ? Math.round(((ini - laluJ) / laluJ) * 100) : null,
      };
    })
    .filter((k) => k.persen != null && k.persen > 0)
    .sort((a, b) => (b.persen ?? 0) - (a.persen ?? 0))
    .slice(0, 3);

  return {
    keluarIni,
    keluarLalu,
    persenKeluar,
    kategoriNaik,
    tempoDekat: hutang
      .filter((h) => h.jatuhTempo != null)
      .map((h) => ({
        id: h.id,
        arah: h.arah,
        pihak: h.pihak,
        sisa: h.jumlah - h.dibayar,
        jatuhTempo: h.jatuhTempo!,
      })),
  };
}
