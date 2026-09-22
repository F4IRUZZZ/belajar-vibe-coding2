// Lapisan API Fase A-3: mirror fungsi simulasi auth.js + keuangan.js via fetch.
// Kontrak SAMA ({data,code}/{error,code}/null/true/false) agar halaman
// cukup tambah await + async. Token tetap di localStorage('token').
// Server: http://localhost:3000 (timpa via window.API_BASE bila perlu).
// Cache produk untuk kategoriOf() sync (disegarkan tiap tampil()).
var API_BASE = window.API_BASE || 'http://localhost:3000';
let cacheProduk = [];

function tokenSimpan() {
  return window.localStorage.getItem('token');
}

function authHeader(token) {
  const t = token || tokenSimpan();
  return t ? { Authorization: 'Bearer ' + t } : {};
}

async function req(path, metode, data, token) {
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method: metode,
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader(token)),
      ...(data !== undefined ? { body: JSON.stringify(data) } : {})
    });
  } catch (e) {
    // Server mati / tidak terjangkau: jangan bisu — kode 503 + pesan jelas.
    // Halaman menampilkan ini lewat jalur error existing (Gagal (503): ...).
    window.__apiGagal = true;
    return { code: 503, body: { error: 'Server tidak terjangkau. Jalankan server: cd server, lalu bun run index.ts (MySQL wajib hidup).' } };
  }
  let body = null;
  try {
    body = await res.json();
  } catch (e) { /* non-JSON = null */ }
  return { code: res.status, body: body };
}

function hasilTulis(out) {
  // POST/PUT: 2xx -> {data, code}; else {error, code} (mirror simulasi).
  if (out.code >= 200 && out.code < 300) return { data: out.body.data, code: out.code };
  return { error: (out.body && out.body.error) || 'Gagal', code: out.code };
}

function hasilUbah(out) {
  // PUT: 404 -> null (simulasi null); 2xx -> baris; else {error, code}.
  if (out.code === 404) return null;
  if (out.code >= 200 && out.code < 300) return out.body.data;
  return { error: (out.body && out.body.error) || 'Gagal', code: out.code };
}

function hasilHapus(out) {
  // DELETE: 200 -> true; 404 -> false (simulasi false); else {error, code}.
  if (out.code === 200) return true;
  if (out.code === 404) return false;
  return { error: (out.body && out.body.error) || 'Gagal', code: out.code };
}

// --- Auth (mirror auth.js) ---
async function register(email, username, password, role) {
  return hasilTulis(await req('/api/register', 'POST', { email: email, username: username, password: password, role: role }));
}

async function login(email, password) {
  return hasilTulis(await req('/api/login', 'POST', { email: email, password: password }));
}

async function getProfile(token) {
  const out = await req('/api/profile', 'GET', undefined, token);
  if (out.code === 200) return { data: out.body.data, code: 200 };
  return { error: (out.body && out.body.error) || 'Unauthorized', code: out.code };
}

async function logout(token) {
  const out = await req('/api/logout', 'POST', undefined, token);
  if (out.code === 200) return { data: out.body.data, code: 200 };
  return { error: (out.body && out.body.error) || 'Gagal', code: out.code };
}

async function updateUsername(token, usernameBaru) {
  const out = await req('/api/username', 'PUT', { username: usernameBaru }, token);
  if (out.code === 200) return { data: out.body.data, code: 200 };
  return { error: (out.body && out.body.error) || 'Gagal', code: out.code };
}

// --- Produk (shared) ---
async function segarkanCacheProduk() {
  const out = await req('/api/produk', 'GET');
  cacheProduk = out.code === 200 ? out.body.data : [];
  return cacheProduk;
}

async function addProduk(nama, kategori) {
  return hasilTulis(await req('/api/produk', 'POST', { nama: nama, kategori: kategori }));
}

async function updateProduk(id, patch) {
  return hasilUbah(await req('/api/produk/' + id, 'PUT', patch));
}

async function deleteProduk(id) {
  return hasilHapus(await req('/api/produk/' + id, 'DELETE'));
}

// --- Transaksi (milik user via token; param userId diabaikan, kompatibel) ---
async function getTransaksi() {
  const out = await req('/api/transaksi', 'GET');
  return out.code === 200 ? out.body.data : [];
}

async function addTransaksi(input) {
  return hasilTulis(await req('/api/transaksi', 'POST', {
    jenis: input.jenis,
    jumlah: input.jumlah,
    produkId: input.produkId !== undefined ? input.produkId : null,
    kategori: input.kategori !== undefined ? input.kategori : null,
    tanggal: input.tanggal
  }));
}

async function updateTransaksi(id, patch, userId) {
  return hasilUbah(await req('/api/transaksi/' + id, 'PUT', patch));
}

async function deleteTransaksi(id, userId) {
  return hasilHapus(await req('/api/transaksi/' + id, 'DELETE'));
}

// --- Catatan ---
async function getCatatan(transaksiId) {
  try {
    const res = await fetch(API_BASE + '/api/catatan?transaksi_id=' + transaksiId, {
      headers: authHeader()
    });
    if (res.status !== 200) return [];
    const body = await res.json();
    return body.data;
  } catch (e) {
    window.__apiGagal = true;
    return [];
  }
}

// Semua catatan milik user (untuk cari + CSV): paralel per transaksi.
async function muatSemuaCatatan() {
  const daftar = await getTransaksi();
  const hasil = await Promise.all(daftar.map(function(t) { return getCatatan(t.id); }));
  return hasil.reduce(function(gabung, arr) { return gabung.concat(arr); }, []);
}

async function addCatatan(transaksiId, isi, userId) {
  return hasilTulis(await req('/api/transaksi/' + transaksiId + '/catatan', 'POST', { isi: isi }));
}

async function updateCatatan(id, isi, userId) {
  return hasilUbah(await req('/api/catatan/' + id, 'PUT', { isi: isi }));
}

async function deleteCatatan(id, userId) {
  return hasilHapus(await req('/api/catatan/' + id, 'DELETE'));
}

// --- Hutang ---
async function getHutang() {
  const out = await req('/api/hutang', 'GET');
  return out.code === 200 ? out.body.data : [];
}

async function addHutang(input) {
  return hasilTulis(await req('/api/hutang', 'POST', {
    arah: input.arah,
    pihak: input.pihak,
    jumlah: input.jumlah,
    tanggal: input.tanggal,
    jatuhTempo: input.jatuhTempo,
    keterangan: input.keterangan
  }));
}

async function bayarHutang(id, nominal, userId) {
  return hasilTulis(await req('/api/hutang/' + id + '/bayar', 'POST', { nominal: nominal }));
}

async function lunaskanHutang(id, userId) {
  return hasilTulis(await req('/api/hutang/' + id + '/lunaskan', 'POST'));
}

async function deleteHutang(id, userId) {
  return hasilHapus(await req('/api/hutang/' + id, 'DELETE'));
}

// --- Saldo + ringkasan (unwrap {data} -> bentuk simulasi) ---
async function getSaldo(userId, filter) {
  const q = [];
  if (filter && filter.dari) q.push('dari=' + encodeURIComponent(filter.dari));
  if (filter && filter.sampai) q.push('sampai=' + encodeURIComponent(filter.sampai));
  try {
    const res = await fetch(API_BASE + '/api/saldo' + (q.length ? '?' + q.join('&') : ''), {
      headers: authHeader()
    });
    if (res.status !== 200) return { masuk: 0, keluar: 0, saldo: 0 };
    const body = await res.json();
    return body.data;
  } catch (e) {
    window.__apiGagal = true;
    return { masuk: 0, keluar: 0, saldo: 0 };
  }
}

async function getRingkasanKategori(userId, filter) {
  const q = [];
  if (filter && filter.dari) q.push('dari=' + encodeURIComponent(filter.dari));
  if (filter && filter.sampai) q.push('sampai=' + encodeURIComponent(filter.sampai));
  try {
    const res = await fetch(API_BASE + '/api/ringkasan-kategori' + (q.length ? '?' + q.join('&') : ''), {
      headers: authHeader()
    });
    if (res.status !== 200) return [];
    const body = await res.json();
    return body.data;
  } catch (e) {
    window.__apiGagal = true;
    return [];
  }
}
