// Format tampil Rupiah versi bulat (pasangan parseRupiah di transaksi.js).
// 20000 -> '20.000', 1250000 -> '1.250.000', 300 -> '300'.
// Sengaja tanpa prefix 'Rp': tulis di kalimat ('Rp' + formatRupiah(x)).
function formatRupiah(angka) {
  return String(angka).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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
