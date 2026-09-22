// Entry server Fase A-1. Jalan: bun run index.ts (dari folder server/).
// Cek hidup: GET /kesehatan -> { ok: true }. Auth di /api/* (src/auth.ts).
import { Elysia } from 'elysia';
import { authRoutes } from './src/auth';

const app = new Elysia()
  .get('/kesehatan', () => ({ ok: true }))
  .use(authRoutes)
  .listen(Number(process.env.PORT || 3000));

console.log(`Server jalan di http://localhost:${app.server?.port}`);
