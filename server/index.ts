// Entry server Fase A-1. Jalan: bun run index.ts (dari folder server/).
// Cek hidup: GET /kesehatan -> { ok: true }. Auth di /api/* (src/auth.ts).
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { authRoutes } from './src/auth';
import { keuanganRoutes } from './src/keuangan';
import { pool } from './src/db';

// Produksi: FRONTEND_URL = domain Cloudflare Pages (CORS ketat).
// Lokal: kosong = terbuka (Live Server port acak tetap bisa).
const app = new Elysia()
  .use(cors({ origin: process.env.FRONTEND_URL || true }))
  .get('/kesehatan', () => ({ ok: true }))
  .use(authRoutes)
  .use(keuanganRoutes)
  // hostname 0.0.0.0 = wajib di container (localhost tak terjangkau dari luar).
  .listen({ port: Number(process.env.PORT || 3000), hostname: '0.0.0.0' });

console.log(`Server jalan di http://localhost:${app.server?.port}`);

// Warmup pool: 1x SELECT 1 saat boot agar request pertama user tidak
// membayar handshake TLS ke database (mahal lintas region).
pool.query('SELECT 1').catch((e: unknown) => {
  console.error('Warmup DB gagal:', e instanceof Error ? e.message : e);
});
