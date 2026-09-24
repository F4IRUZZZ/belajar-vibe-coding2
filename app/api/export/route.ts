import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.transaksi.findMany({ orderBy: { tanggal: "desc" }, take: 1000 });
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = ["tanggal,jenis,jumlah,kategori"];
  for (const r of rows) {
    lines.push(
      [new Date(r.tanggal).toISOString().slice(0, 10), r.jenis, String(r.jumlah), esc(r.kategori)].join(","),
    );
  }
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=transaksi.csv",
    },
  });
}
