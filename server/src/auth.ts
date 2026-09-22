// Auth API Fase A-1: register/login/profile/logout/username.
// Kontrak kode disamakan dengan simulasi js/auth.js (201/400/401).
// Beda: password di-hash bcrypt (Bun.password), token acak disimpan
// di tabel sessions (1x login = 1x sesi, logout = sesi hangus).
import { Elysia, t } from 'elysia';
import { pool } from './db';
import { bacaToken, userDariToken } from './guard';

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cekPassword(pw: string): string | null {
  if (pw.length < 8) return 'Password min 8 karakter';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Password wajib ada huruf dan angka';
  return null;
}

function tokenBaru(): string {
  return crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);
}

export const authRoutes = new Elysia({ prefix: '/api' })
  .post(
    '/register',
    async ({ body, status }) => {
      const email = String(body.email || '').trim();
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const role = String(body.role || 'pribadi');
      if (!email) return status(400, { error: 'Email wajib' });
      if (!validEmail(email)) return status(400, { error: 'Format email tidak valid' });
      if (username.length < 3) return status(400, { error: 'Username wajib min 3 karakter' });
      const pwErr = cekPassword(password);
      if (pwErr) return status(400, { error: pwErr });
      if (role !== 'pribadi' && role !== 'keluarga')
        return status(400, { error: 'Role harus pribadi/keluarga' });
      // UNIQUE ci di MySQL menolak duplikat case-insensitive (banding lowercase).
      try {
        // bcrypt cost 8: ~10x lebih ringan dari argon2id default di CPU kecil.
        // Akun lama (argon2) tetap bisa login — verify deteksi prefix otomatis.
        const hash = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 8 });
        const [res] = await pool.query(
          'INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, ?)',
          [email, username, hash, role]
        );
        const id = (res as { insertId: number }).insertId;
        return status(201, { data: { id, email, username, role } });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('uq_email')) return status(400, { error: 'Email sudah dipakai' });
        if (msg.includes('uq_username')) return status(400, { error: 'Username sudah dipakai' });
        throw e;
      }
    },
    {
      body: t.Object({
        email: t.String(),
        username: t.String(),
        password: t.String(),
        role: t.Optional(t.String())
      })
    }
  )
  .post(
    '/login',
    async ({ body, status }) => {
      const email = String(body.email || '').trim();
      const password = String(body.password || '');
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      const users = rows as Array<{
        id: number;
        email: string;
        username: string;
        password_hash: string;
        role: string;
      }>;
      if (users.length === 0) return status(401, { error: 'Email/password salah' });
      const u0 = users[0]!; // aman: length sudah dicek
      const ok = await Bun.password.verify(password, u0.password_hash);
      if (!ok) return status(401, { error: 'Email/password salah' });
      const token = tokenBaru();
      await pool.query('INSERT INTO sessions (token, user_id) VALUES (?, ?)', [token, u0.id]);
      return { data: { token } };
    },
    {
      body: t.Object({ email: t.String(), password: t.String() })
    }
  )
  .get('/profile', async ({ headers, status }) => {
    const user = await userDariToken(bacaToken(headers['authorization']));
    if (!user) return status(401, { error: 'Unauthorized' });
    return { data: user };
  })
  .post('/logout', async ({ headers, status }) => {
    const token = bacaToken(headers['authorization']);
    if (!token) return status(401, { error: 'Unauthorized' });
    const [res] = await pool.query('DELETE FROM sessions WHERE token = ?', [token]);
    if ((res as { affectedRows: number }).affectedRows === 0)
      return status(401, { error: 'Sesi tidak ditemukan' });
    return { data: 'Logout sukses' };
  })
  .put(
    '/username',
    async ({ body, headers, status }) => {
      const user = await userDariToken(bacaToken(headers['authorization']));
      if (!user) return status(401, { error: 'Unauthorized' });
      const baru = String(body.username || '').trim();
      if (baru.length < 3) return status(400, { error: 'Username wajib min 3 karakter' });
      try {
        await pool.query('UPDATE users SET username = ? WHERE id = ?', [baru, user.id]);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('uq_username')) return status(400, { error: 'Username sudah dipakai' });
        throw e;
      }
      const [rows] = await pool.query('SELECT id, email, username, role FROM users WHERE id = ?', [
        user.id
      ]);
      return { data: (rows as Array<object>)[0] };
    },
    {
      body: t.Object({ username: t.String() })
    }
  );
