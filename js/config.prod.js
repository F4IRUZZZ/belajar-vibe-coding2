// PRODUKSI — dipakai saat deploy (disalin menimpa js/config.js oleh build).
// Aman di-commit: URL backend publik memang harus terlihat browser;
// yang melindungi data = token login + CORS, bukan kerahasiaan URL.
// URL SnapDeploy per 2026-09-23 (stabil, ganti Back4app yang rotasi).
window.API_BASE = 'https://keuangan-api-12d61.containers.snapdeploy.app';
