import { jalankanSemua } from "@/lib/actions/jadwal";

// Dipanggil cron harian (mis. Vercel Cron) dengan ?secret=CRON_SECRET.
// Tanpa CRON_SECRET di env, route nonaktif agar jadwal tak jalan liar.
export async function GET(req: Request) {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia) return new Response("cron nonaktif (CRON_SECRET kosong)", { status: 404 });
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== rahasia) {
    return new Response("rahasia salah", { status: 401 });
  }
  const jalan = await jalankanSemua();
  return Response.json({ jalan });
}
