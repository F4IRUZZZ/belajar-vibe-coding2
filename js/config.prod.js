// PRODUKSI — dipakai saat deploy (disalin menimpa js/config.js oleh build).
// Aman di-commit: URL backend publik memang harus terlihat browser;
// yang melindungi data = token login + CORS, bukan kerahasiaan URL.
// URL Back4app per 2026-09-22 ~21:15 (temporary URL, dapat berubah —
// bila 503 lagi, cek URL aktif di dashboard lalu update file ini).
window.API_BASE = 'https://keuanganapi1-4xony10p.b4a.run';
