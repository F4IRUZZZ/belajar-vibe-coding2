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
// Teks tombol Lihat/Sembunyi (tanpa emoji), aria-label aksesibilitas.
function pasangTogglePassword(inputEl, tombolEl) {
  tombolEl.addEventListener('click', function() {
    const tampil = inputEl.type === 'password';
    inputEl.type = tampil ? 'text' : 'password';
    tombolEl.textContent = tampil ? 'Sembunyi' : 'Lihat';
    tombolEl.setAttribute('aria-label', tampil ? 'Sembunyikan password' : 'Tampilkan password');
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
