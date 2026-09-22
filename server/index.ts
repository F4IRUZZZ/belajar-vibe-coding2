// Entry server Fase A-1. Jalan: bun run index.ts (dari folder server/).
// Cek hidup: GET /kesehatan -> { ok: true }. Auth di /api/* (src/auth.ts).
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { authRoutes } from './src/auth';
import { keuanganRoutes } from './src/keuangan';

const app = new Elysia()
  .use(cors()) // frontend Live Server (port lain) -> API :3000
  .get('/kesehatan', () => ({ ok: true }))
  .use(authRoutes)
  .use(keuanganRoutes)
  .listen(Number(process.env.PORT || 3000));

console.log(`Server jalan di http://localhost:${app.server?.port}`);
