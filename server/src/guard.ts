// Guard shared: token Bearer -> user. Dipakai auth.ts + keuangan.ts.
// Pindah dari auth.ts agar tidak duplikat (satu sumber kebenaran).
import { pool } from './db';

export function bacaToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const m = /^Bearer (.+)$/.exec(authHeader.trim());
  return m ? (m[1] ?? null) : null;
}

export interface UserSesi {
  id: number;
  email: string;
  username: string;
  role: string;
}

export async function userDariToken(token: string | null): Promise<UserSesi | null> {
  if (!token) return null;
  const [rows] = await pool.query(
    'SELECT u.id, u.email, u.username, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?',
    [token]
  );
  const data = rows as UserSesi[];
  return data.length > 0 ? (data[0] ?? null) : null;
}

// Tanggal lokal YYYY-MM-DD (mirror tanggalHariIni di keuangan.js,
// bukan UTC — hindari geser hari di WIB).
export function tanggalLokal(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const t = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + t;
}

export function validTanggal(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s));
}
