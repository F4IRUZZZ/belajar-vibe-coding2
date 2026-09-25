import { ambilUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function esc(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const user = await ambilUser();
  if (!user) return new Response("Masuk dulu", { status: 401 });
  const rows = await prisma.hutang.findMany({
    where: { userId: user.id },
    orderBy: { tanggal: "desc" },
    take: 5000,
  });
  const lines = ["arah,pihak,jumlah,dibayar,sisa,tanggal,jatuhTempo,status,keterangan"];
  for (const h of rows) {
    lines.push(
      [
        h.arah,
        esc(h.pihak),
        String(h.jumlah),
        String(h.dibayar),
        String(h.jumlah - h.dibayar),
        new Date(h.tanggal).toISOString().slice(0, 10),
        h.jatuhTempo ? new Date(h.jatuhTempo).toISOString().slice(0, 10) : "",
        h.status,
        esc(h.keterangan ?? ""),
      ].join(","),
    );
  }
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=hutang.csv",
    },
  });
}
