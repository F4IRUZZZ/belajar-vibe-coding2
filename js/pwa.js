// Daftarkan service worker (Fase C). Browser lama / gagal = diam,
// app tetap jalan online seperti biasa (progresif, bukan wajib).
if ('serviceWorker' in window.navigator) {
  window.addEventListener('load', function() {
    window.navigator.serviceWorker.register('sw.js').catch(function() {});
  });
}
