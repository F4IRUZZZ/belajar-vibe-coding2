// Test API keuangan Fase A-2 (butuh server + MySQL jalan).
// Pakai: bun run index.ts (terminal 1) lalu bun run test-keuangan.ts (terminal 2).
// Mirror demo Node keuangan.js: tambah -> ubah -> hapus -> 404/401 -> saldo.
// Exit 1 bila ada yang gagal.
const BASE = 'http://localhost:' + (process.env.PORT || 3000);
let gagal = 0;
let n = 0;

async function cek(nama: string, harap: number, res: Response) {
  n++;
  const ok = res.status === harap;
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + nama + ' -> ' + res.status + ' (harap ' + harap + ')');
  if (!ok) gagal++;
  let body: Record<string, unknown> | null = null;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }
  return body;
}

async function api(
  url: string,
  metode: string,
  token?: string,
  data?: object,
  query?: string
): Promise<Response> {
  return fetch(BASE + url + (query || ''), {
    method: metode,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    ...(data ? { body: JSON.stringify(data) } : {})
  });
}

async function daftar(email: string): Promise<string> {
  const unik = String(Date.now()).slice(-6) + Math.floor(Math.random() * 90 + 10);
  await api('/api/register', 'POST', undefined, {
    email,
    username: 'u' + unik,
    password: 'rahasia123'
  });
  const b = await api('/api/login', 'POST', undefined, { email, password: 'rahasia123' });
  const j = (await b.json()) as { data: { token: string } };
  return j.data.token;
}

const suf = String(Date.now());
const tokenA = await daftar('a' + suf + '@contoh.id');
const tokenB = await daftar('b' + suf + '@contoh.id');

// --- Produk (shared) ---
let b = await cek('produk tambah', 201, await api('/api/produk', 'POST', tokenA, { nama: 'Beras' + suf, kategori: 'pangan' }));
const idP = (b?.data as { id: number }).id;
await cek('produk kembar', 400, await api('/api/produk', 'POST', tokenA, { nama: 'beras' + suf }));
await cek('produk list', 200, await api('/api/produk', 'GET', tokenA));
await cek('produk ubah', 200, await api('/api/produk/' + idP, 'PUT', tokenA, { nama: 'Beras Wangi' + suf }));
await cek('produk hapus', 200, await api('/api/produk/' + idP, 'DELETE', tokenA));
await cek('produk hapus 2x (404)', 404, await api('/api/produk/' + idP, 'DELETE', tokenA));

// --- Transaksi ---
b = await cek('trx masuk', 201, await api('/api/transaksi', 'POST', tokenA, { jenis: 'masuk', jumlah: 300000 }));
const idMasuk = (b?.data as { id: number }).id;
b = await cek('trx keluar', 201, await api('/api/transaksi', 'POST', tokenA, { jenis: 'keluar', jumlah: 80000, kategori: 'Makan' }));
const idKeluar = (b?.data as { id: number }).id;
await cek('trx jenis salah', 400, await api('/api/transaksi', 'POST', tokenA, { jenis: 'bonus', jumlah: 10 }));
await cek('trx nol', 400, await api('/api/transaksi', 'POST', tokenA, { jenis: 'masuk', jumlah: 0 }));
await cek('trx list', 200, await api('/api/transaksi', 'GET', tokenA));
await cek('trx ubah milik orang (401)', 401, await api('/api/transaksi/' + idMasuk, 'PUT', tokenB, { jumlah: 5 }));
await cek('trx ubah sendiri', 200, await api('/api/transaksi/' + idMasuk, 'PUT', tokenA, { jumlah: 300000 }));
await cek('trx tanpa token (401)', 401, await api('/api/transaksi', 'GET'));

// --- Catatan + cascade ---
b = await cek('catatan tambah', 201, await api('/api/transaksi/' + idKeluar + '/catatan', 'POST', tokenA, { isi: 'Makan siang' }));
const idCat = (b?.data as { id: number }).id;
await cek('catatan list', 200, await api('/api/catatan', 'GET', tokenA, undefined, '?transaksi_id=' + idKeluar));
await cek('catatan ubah', 200, await api('/api/catatan/' + idCat, 'PUT', tokenA, { isi: 'Makan siang padang' }));
b = await cek('catatan semua', 200, await api('/api/catatan/semua', 'GET', tokenA));
const semua = b?.data as Array<{ isi: string }>;
const semuaOk = Array.isArray(semua) && semua.length === 1 && semua[0]?.isi === 'Makan siang padang';
console.log((semuaOk ? 'PASS' : 'FAIL') + ' catatan semua 1 query utuh');
if (!semuaOk) gagal++;
await cek('trx hapus (cascade)', 200, await api('/api/transaksi/' + idKeluar, 'DELETE', tokenA));
await cek('catatan ikut hilang (404 induk)', 404, await api('/api/catatan', 'GET', tokenA, undefined, '?transaksi_id=' + idKeluar));

// --- Saldo + ringkasan ---
b = await cek('saldo', 200, await api('/api/saldo', 'GET', tokenA));
const s = b?.data as { masuk: number; keluar: number; saldo: number };
const saldoOk = s.masuk === 300000 && s.keluar === 0 && s.saldo === 300000;
console.log((saldoOk ? 'PASS' : 'FAIL') + ' saldo angka (masuk 300000, keluar 0)');
if (!saldoOk) gagal++;
await cek('ringkasan kategori', 200, await api('/api/ringkasan-kategori', 'GET', tokenA));

// --- Hutang ---
b = await cek('hutang tambah', 201, await api('/api/hutang', 'POST', tokenA, { arah: 'hutang', pihak: 'Warung', jumlah: 100000 }));
const idH = (b?.data as { id: number }).id;
b = await cek('hutang bayar sebagian', 200, await api('/api/hutang/' + idH + '/bayar', 'POST', tokenA, { nominal: 30000 }));
const st1 = (b?.data as { status: string; dibayar: number }).status;
console.log((st1 === 'belum' ? 'PASS' : 'FAIL') + ' cicilan status tetap belum');
if (st1 !== 'belum') gagal++;
await cek('hutang bayar lebih (400)', 400, await api('/api/hutang/' + idH + '/bayar', 'POST', tokenA, { nominal: 999999 }));
b = await cek('hutang lunaskan', 200, await api('/api/hutang/' + idH + '/lunaskan', 'POST', tokenA));
const st2 = (b?.data as { status: string }).status;
console.log((st2 === 'lunas' ? 'PASS' : 'FAIL') + ' lunaskan -> lunas + auto-kas');
if (st2 !== 'lunas') gagal++;
await cek('lunaskan 2x (400)', 400, await api('/api/hutang/' + idH + '/lunaskan', 'POST', tokenA));
await cek('hapus lunas (400 audit)', 400, await api('/api/hutang/' + idH, 'DELETE', tokenA));
b = await cek('hutang tambah 2', 201, await api('/api/hutang', 'POST', tokenA, { arah: 'piutang', pihak: 'Budi', jumlah: 50000 }));
await cek('hapus belum lunas', 200, await api('/api/hutang/' + (b?.data as { id: number }).id, 'DELETE', tokenA));

// Saldo akhir: masuk 300000 + piutang? (dihapus, tak ada kas) ; keluar: 30000 + 70000 = 100000
b = await cek('saldo akhir', 200, await api('/api/saldo', 'GET', tokenA));
const s2 = b?.data as { masuk: number; keluar: number; saldo: number };
const akhirOk = s2.masuk === 300000 && s2.keluar === 100000 && s2.saldo === 200000;
console.log((akhirOk ? 'PASS' : 'FAIL') + ' saldo akhir 300000/100000/200000, dapat ' + s2.masuk + '/' + s2.keluar + '/' + s2.saldo);
if (!akhirOk) gagal++;

console.log(n + ' cek, ' + (gagal === 0 ? 'SEMUA LOLOS' : gagal + ' GAGAL'));
process.exit(gagal === 0 ? 0 : 1);
