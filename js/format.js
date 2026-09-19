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
