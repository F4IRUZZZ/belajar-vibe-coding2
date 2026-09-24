import { ambilUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { keTransaksiCsv } from "@/lib/csv";

export async function GET() {
  const user = await ambilUser();
  if (!user) return new Response("Masuk dulu", { status: 401 });
  const rows = await prisma.transaksi.findMany({
    where: { userId: user.id },
    include: { produk: true, catatan: true, dompet: true },
    orderBy: { tanggal: "desc" },
    take: 5000,
  });
  const csv = keTransaksiCsv(
    rows.map((r) => ({
      tanggal: new Date(r.tanggal).toISOString().slice(0, 10),
      jenis: r.jenis,
      jumlah: r.jumlah,
      kategori: r.kategori,
      produk: r.produk?.nama ?? "",
      catatan: r.catatan.map((c) => c.isi).join(" | "),
      dompet: r.dompet?.nama ?? "",
      hargaSatuan: r.hargaSatuan,
    })),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=transaksi.csv",
    },
  });
}
