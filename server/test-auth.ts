// Test endpoint Auth Fase A-1 (butuh server + MySQL jalan).
// Pakai: bun run index.ts (terminal 1) lalu bun run test-auth.ts (terminal 2).
// Email acak tiap run agar idempoten. Exit 1 bila ada yang gagal.
const BASE = 'http://localhost:' + (process.env.PORT || 3000);
const email = 'tes' + Date.now() + '@contoh.id';
let gagal = 0;

async function cek(nama: string, harap: number, res: Response) {
  const ok = res.status === harap;
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + nama + ' -> ' + res.status + ' (harap ' + harap + ')');
  if (!ok) gagal++;
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return body as Record<string, unknown> | null;
}

async function json(url: string, metode: string, data?: object, token?: string) {
  return fetch(BASE + url, {
    method: metode,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    ...(data ? { body: JSON.stringify(data) } : {})
  });
}

// 1. register OK (201) + duplikat email ditolak (400)
let b = await cek('register', 201, await json('/api/register', 'POST', {
  email,
  username: 'tes' + String(Date.now()).slice(-6),
  password: 'rahasia123',
  role: 'keluarga'
}));
await cek('register duplikat', 400, await json('/api/register', 'POST', {
  email,
  username: 'lainunikk',
  password: 'rahasia123'
}));

// 2. register validasi: password pendek (400)
await cek('register pw pendek', 400, await json('/api/register', 'POST', {
  email: 'a' + email,
  username: 'u' + String(Date.now()).slice(-6),
  password: 'pendek'
}));

// 3. login OK (200) + salah password (401)
b = await cek('login', 200, await json('/api/login', 'POST', { email, password: 'rahasia123' }));
const token = (b?.data as { token: string } | undefined)?.token || '';
await cek('login salah', 401, await json('/api/login', 'POST', { email, password: 'salah1234' }));

// 4. profile + logout + profile hangus
await cek('profile', 200, await json('/api/profile', 'GET', undefined, token));
await cek('logout', 200, await json('/api/logout', 'POST', undefined, token));
await cek('profile pasca-logout', 401, await json('/api/profile', 'GET', undefined, token));
await cek('profile tanpa token', 401, await json('/api/profile', 'GET'));

console.log(gagal === 0 ? 'SEMUA LOLOS' : gagal + ' GAGAL');
process.exit(gagal === 0 ? 0 : 1);
