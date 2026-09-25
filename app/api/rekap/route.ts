import { ambilUser } from "@/lib/auth";
import { bulanIni, rentangBulan } from "@/lib/format";
import { formatRekapWa, getRekap } from "@/lib/store";

export async function GET(req: Request) {
  const user = await ambilUser();
  if (!user) return new Response("Masuk dulu", { status: 401 });
  const { searchParams } = new URL(req.url);
  const bulan = searchParams.get("bulan") ?? bulanIni();
  try {
    rentangBulan(bulan);
  } catch {
    return new Response("Bulan harus YYYY-MM", { status: 400 });
  }
  const teks = formatRekapWa(await getRekap(bulan, user.id));
  return new Response(teks, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
