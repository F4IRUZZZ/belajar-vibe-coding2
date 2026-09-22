// Entry server Fase A-1. Jalan: bun run index.ts (dari folder server/).
// Cek hidup: GET /kesehatan -> { ok: true }. Auth di /api/* (src/auth.ts).
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { authRoutes } from './src/auth';
import { keuanganRoutes } from './src/keuangan';

// Produksi: FRONTEND_URL = domain Cloudflare Pages (CORS ketat).
// Lokal: kosong = terbuka (Live Server port acak tetap bisa).
const app = new Elysia()
  .use(cors({ origin: process.env.FRONTEND_URL || true }))
  .get('/kesehatan', () => ({ ok: true }))
  .use(authRoutes)
  .use(keuanganRoutes)
  .listen(Number(process.env.PORT || 3000));

console.log(`Server jalan di http://localhost:${app.server?.port}`);
