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
// Setiap tombol IKON wajib punya aria-label (teks hilang = screen reader buta).
function ikon(nama) {
  const paths = {
    ubah: '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>',
    hapus: '<path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>',
    catatan: '<path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-9 14H7v-2h3v2zm0-4H7v-2h3v2zm0-4H7V7h3v2zm4 8h-3v-2h3v2zm0-4h-3v-2h3v2zm0-4h-3V7h3v2z"/>',
    simpan: '<path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
    batal: '<path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
    bayar: '<path d="M11.8 10.9a2 2 0 0 0-2.78 0l-5.16 5.16a2 2 0 0 0 0 2.83l8.9 8.9a2 2 0 0 0 2.83 0l5.16-5.16a2 2 0 0 0 0-2.83l-8.95-8.9zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>',
    lunas: '<path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
    mata: '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>',
    'mata-coret': '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2.71 3.16l-1.41 1.41L12.7 16l2.65 2.65c-.6.18-1.23.27-1.85.35h-.01c-.22 0-.43-.02-.64-.05l-2.42-2.42-.01-.01c-.46.06-.93.1-1.42.1-5 0-9.27-3.11-11-7.5 1.07-2.72 3.06-4.97 5.62-6.4L2.71 3.16zM12 17c-.64 0-1.26-.13-1.83-.36l2.53-2.53c.16.02.33.03.5.03 2.76 0 5-2.24 5-5 0-.17-.01-.34-.03-.5l2.19 2.19c.23-.57.36-1.19.36-1.83 0-2.76-2.24-5-5-5z"/>'
  };
  return '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">' + (paths[nama] || '') + '</svg>';
}

// Pasang ikon ke tombol: isi SVG + aria-label. Teks lama dibuang.
function pasangIkon(tombolEl, nama, label) {
  tombolEl.innerHTML = ikon(nama);
  tombolEl.setAttribute('aria-label', label);
  tombolEl.setAttribute('title', label);
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
    const p = produk.find(function(x) { return x.id === t.produkId; });
    if (p) return p.kategori;
  }
  return 'Lainnya';
}

function bangunCSV(userId) {
  const baris = ['tanggal,jenis,jumlah,kategori,catatan'];
  transaksi.forEach(function(t) {
    if (t.userId !== userId) return;
    const notes = catatan.filter(function(c) { return c.transaksiId === t.id; })
      .map(function(c) { return c.isi; }).join('; ');
    baris.push([
      selCSV(t.tanggal), selCSV(t.jenis), t.jumlah,
      selCSV(kategoriOf(t)), selCSV(notes)
    ].join(','));
  });
  return baris.join('\r\n');
}

function unduhCSV(userId, elHasil) {
  const csv = bangunCSV(userId);
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
