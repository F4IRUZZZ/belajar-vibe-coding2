// Format tampil Rupiah versi bulat. 20000 -> '20.000'. Sengaja tanpa
// prefix 'Rp': tulis di kalimat ('Rp' + formatRupiah(x)).
function formatRupiah(angka) {
  return String(angka).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Parse nominal Rupiah versi bulat + allowlist ketat (bukan strip-buta).
// Lolos: digit + titik ribuan + awalan Rp + spasi. Selain itu -> NaN (400).
// '20.000' -> 20000; 'Rp 20.000' -> 20000; 'ssss2000sss'/'-5000'/kosong -> NaN.
// Pindah ke sini dari transaksi.js agar dipakai hutang.js juga (shared).
function parseRupiah(teks) {
  let s = String(teks).trim();
  s = s.replace(/^rp\s*/i, '');
  s = s.replace(/\s+/g, '');
  if (!/^[0-9.]+$/.test(s)) return NaN;
  const digit = s.replace(/\./g, '');
  if (!digit) return NaN;
  return Number(digit);
}

// Format Rupiah LIVE saat mengetik: buang non-digit -> formatRupiah.
// '5000' -> '5.000' (tiap keystroke), hapus habis -> kosong (bukan '0').
// Keterbatasan sadar: kursor lompat ke akhir (caret-preserving = polish lanjutan).
// parseRupiah existing sudah terima titik, jadi submit tidak perlu berubah.
function pasangFormatRupiahLive(inputEl) {
  inputEl.addEventListener('input', function() {
    const digit = inputEl.value.replace(/[^0-9]/g, '');
    inputEl.value = digit ? formatRupiah(Number(digit)) : '';
  });
}

// Toggle intip password: password <-> text. Dipakai login + register.
// Ikon mata / mata-coret (saran review PR-8), aria-label aksesibilitas.
function pasangTogglePassword(inputEl, tombolEl) {
  tombolEl.addEventListener('click', function() {
    const tampil = inputEl.type === 'password';
    inputEl.type = tampil ? 'text' : 'password';
    tombolEl.innerHTML = ikon(tampil ? 'mata-coret' : 'mata');
    tombolEl.setAttribute('aria-label', tampil ? 'Sembunyikan password' : 'Tampilkan password');
    tombolEl.setAttribute('title', tampil ? 'Sembunyikan password' : 'Tampilkan password');
  });
}

// Ikon aksi SVG inline (tanpa emoji): pensil, sampah, catatan/plus,
// centang, silang, unduh, mata, mata-coret. Dipakai semua tombol aksi.
// Ikon menu sidebar: dashboard, transaksi, produk, hutang, profile.
// Setiap tombol IKON wajib punya aria-label (teks hilang = screen reader buta).
function ikon(nama) {
  const paths = {
    dashboard: '<path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>',
    transaksi: '<path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>',
    produk: '<path d="M17.63 5.84A2 2 0 0 1 20 7v10a2 2 0 0 1-2 2H7a2 2 0 0 1-1.41-.59L1 13.7a2 2 0 0 1 0-2.83l8.13-8.13c.39-.39.9-.59 1.41-.59H17a2 2 0 0 1 2 1.41v1.24zM15 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>',
    hutang: '<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>',
    profile: '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',
    ubah: '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>',
    hapus: '<path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>',
    catatan: '<path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-9 14H7v-2h3v2zm0-4H7v-2h3v2zm0-4H7V7h3v2zm4 8h-3v-2h3v2zm0-4h-3v-2h3v2zm0-4h-3V7h3v2z"/>',
    simpan: '<path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
    batal: '<path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
    bayar: '<path d="M11.8 10.9a2 2 0 0 0-2.78 0l-5.16 5.16a2 2 0 0 0 0 2.83l8.9 8.9a2 2 0 0 0 2.83 0l5.16-5.16a2 2 0 0 0 0-2.83l-8.95-8.9zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>',
    lunas: '<path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
    mata: '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>',
    'mata-coret': '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/><line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
  };
  return '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">' + (paths[nama] || '') + '</svg>';
}

// Pasang ikon ke tombol: isi SVG + aria-label. Teks lama dibuang.
function pasangIkon(tombolEl, nama, label) {
  tombolEl.innerHTML = ikon(nama);
  tombolEl.setAttribute('aria-label', label);
  tombolEl.setAttribute('title', label);
}

// Tema: ikut sistem bila belum ada pilihan; pilihan manual menang.
// Disimpan di localStorage agar ingat antar halaman + kunjungan.
function initTema() {
  const simpan = window.localStorage.getItem('tema');
  if (simpan === 'dark' || simpan === 'light') {
    document.documentElement.setAttribute('data-theme', simpan);
  }
  // Tanpa pilihan tersimpan: CSS media query yang bicara (ikut OS).
}

function toggleTema() {
  const gelap = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.getAttribute('data-theme') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const berikutnya = gelap ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', berikutnya);
  window.localStorage.setItem('tema', berikutnya);
  perbaruiTombolTema();
}

function perbaruiTombolTema() {
  const gelap = document.documentElement.getAttribute('data-theme') === 'dark' ||
    (!document.documentElement.getAttribute('data-theme') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('.btn-tema').forEach(function(t) {
    t.textContent = gelap ? 'Terang' : 'Gelap';
    t.setAttribute('aria-label', gelap ? 'Ganti ke tema terang' : 'Ganti ke tema gelap');
  });
  const statusEl = document.getElementById('info-tema');
  if (statusEl) statusEl.textContent = '(aktif: ' + (gelap ? 'gelap' : 'terang') + ')';
}

function pasangToggleTema() {
  initTema();
  perbaruiTombolTema();
  document.querySelectorAll('.btn-tema').forEach(function(t) {
    t.addEventListener('click', toggleTema);
  });
}

// Modal peringatan shared (server down, dsb). Dibangun via JS agar tanpa
// ubah HTML. Maks 1 tampil per saat; klik luar/ tombol = tutup.
function tampilkanModal(judul, pesan) {
  tutupModal();
  const latar = document.createElement('div');
  latar.className = 'modal-latar';
  latar.id = 'modal-latar';
  const kotak = document.createElement('div');
  kotak.className = 'modal-kotak';
  kotak.setAttribute('role', 'alertdialog');
  const h = document.createElement('h2');
  h.textContent = judul;
  const p = document.createElement('p');
  p.textContent = pesan;
  const btn = document.createElement('button');
  btn.textContent = 'Mengerti';
  btn.addEventListener('click', tutupModal);
  latar.addEventListener('click', function(e) {
    if (e.target === latar) tutupModal();
  });
  kotak.appendChild(h);
  kotak.appendChild(p);
  kotak.appendChild(btn);
  latar.appendChild(kotak);
  document.body.appendChild(latar);
}

function tutupModal() {
  const lama = document.getElementById('modal-latar');
  if (lama && lama.parentNode) lama.parentNode.removeChild(lama);
}

// Pesan server-mati standar (1 sumber, dipakai 5 guard + login/register).
function pesanServerMati() {
  return 'Server tidak dapat dijangkau. Data yang dimasukkan saat ini mungkin tidak tersimpan. Jalankan server: cd server, lalu bun run index.ts (MySQL wajib hidup).';
}
// Ikon menu sidebar: <a data-ikon="dashboard"> -> SVG disisip di depan label.
// Nav aktif tetap via class di HTML. Idempoten bila dipanggil 1x per halaman.
function pasangIkonMenu() {
  document.querySelectorAll('.sidebar-nav a[data-ikon]').forEach(function(a) {
    if (a.querySelector('.nav-ikon')) return;
    const s = document.createElement('span');
    s.className = 'nav-ikon';
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ikon(a.getAttribute('data-ikon'));
    a.insertBefore(s, a.firstChild);
  });
}

// CSV (shared transaksi + profile): tanggal, jenis, jumlah murni, kategori,
// catatan gabungan ';'. Quote-wrap (aman koma/quote/enter). userId eksplisit
// agar tidak bergantung pada global halaman. Pindah dari transaksi.js.
function selCSV(teks) {
  return '"' + String(teks).replace(/"/g, '""') + '"';
}

function kategoriOf(t) {
  if (t.kategori) return t.kategori;
  if (t.produkId !== null && t.produkId !== undefined) {
    const p = cacheProduk.find(function(x) { return x.id === t.produkId; });
    if (p) return p.kategori;
  }
  return 'Lainnya';
}

async function bangunCSV(userId) {
  const baris = ['tanggal,jenis,jumlah,kategori,catatan'];
  const daftar = await getTransaksi();
  const semuaCatatan = await muatSemuaCatatan();
  daftar.forEach(function(t) {
    if (t.userId !== userId) return;
    const notes = semuaCatatan.filter(function(c) { return c.transaksiId === t.id; })
      .map(function(c) { return c.isi; }).join('; ');
    baris.push([
      selCSV(t.tanggal), selCSV(t.jenis), t.jumlah,
      selCSV(kategoriOf(t)), selCSV(notes)
    ].join(','));
  });
  return baris.join('\r\n');
}

async function unduhCSV(userId, elHasil) {
  const csv = await bangunCSV(userId);
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'keuangan-' + tanggalHariIni() + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  if (elHasil) pesanOk(elHasil, 'CSV diunduh.');
}

// Pesan semantik terpusat: hijau untuk sukses, merah untuk error.
// Semua halaman pakai ini (konsisten, tanpa set class manual di tiap file).
function pesanOk(el, teks) {
  el.textContent = teks;
  el.classList.remove('msg-err');
  el.classList.add('msg-ok');
}

function pesanError(el, teks) {
  el.textContent = teks;
  el.classList.remove('msg-ok');
  el.classList.add('msg-err');
}
