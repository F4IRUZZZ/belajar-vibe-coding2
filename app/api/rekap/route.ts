import { bulanIni, rentangBulan } from "@/lib/format";
import { formatRekapWa, getRekap } from "@/lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bulan = searchParams.get("bulan") ?? bulanIni();
  try {
    rentangBulan(bulan);
  } catch {
    return new Response("Bulan harus YYYY-MM", { status: 400 });
  }
  const teks = formatRekapWa(await getRekap(bulan));
  return new Response(teks, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
