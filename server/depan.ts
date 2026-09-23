// Server dev frontend: sajikan file statis root + mapping URL bersih.
// Menyamakan perilaku Cloudflare Pages (tanpa rantai 308) agar navigasi
// sidebar bisa dites lokal — Live Server 404 untuk /transaksi dkk.
// API tetap di index.ts (:3000); js/config.js lokal sudah ke sana.
// Jalan: bun run depan.ts (dari folder server/) -> http://localhost:5501
// (5501 agar tak rebutan dengan Live Server di 5500; timpa via WEB_PORT bila perlu)
import { Elysia, file } from 'elysia';

// Satu handler (tanpa andalkan prioritas route framework): URL bersih
// dipetakan ke file, sisanya dilayani langsung dari root.
const HALAMAN: Record<string, string> = {
  '/': 'index.html',
  '/login': 'login.html',
  '/register': 'register.html',
  '/transaksi': 'transaksi.html',
  '/produk': 'produk.html',
  '/hutang': 'hutang.html',
  '/profile': 'profile.html'
};

const ROOT = import.meta.dir + '/../';

const app = new Elysia()
  .get('/*', async ({ path, status }) => {
    if (path.includes('..')) return status(404, 'Tidak ditemukan'); // anti intip folder atas
    const target = HALAMAN[path] || (path.startsWith('/') ? path.slice(1) : path);
    if (!target) return status(404, 'Tidak ditemukan');
    const f = file(ROOT + target);
    if (!(await Bun.file(ROOT + target).exists())) return status(404, 'Tidak ditemukan');
    return f;
  })
  .listen({ port: Number(process.env.WEB_PORT || 5501), hostname: '0.0.0.0' });

console.log(`Web dev jalan di http://localhost:${app.server?.port}`);
