// Fase A-3: CRUD + penyimpanan pindah ke server (js/api.js via fetch).
// File ini tersisa helper tanggal/period LOKAL (murni, tanpa penyimpanan).
// Simulasi localStorage (authDB/keuanganDB) pensiun — data hidup di MySQL.

// Tanggal hari ini versi LOKAL (YYYY-MM-DD). Bukan toISOString (UTC)
// yang bisa mundur 1 hari di malam WIB.
function tanggalHariIni() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

// Batas periode versi LOKAL (Senin-Minggu, awal-akhir bulan). YYYY-MM-DD.
function awalMingguIni() {
  const d = new Date();
  const mundur = (d.getDay() + 6) % 7; // Senin=0 ... Minggu=6
  d.setDate(d.getDate() - mundur);
  return potongTanggal(d);
}

function akhirMingguIni() {
  const d = new Date();
  const maju = (7 - d.getDay()) % 7; // Minggu=0 sisa
  d.setDate(d.getDate() + maju);
  return potongTanggal(d);
}

function awalBulanIni() {
  const d = new Date();
  return potongTanggal(new Date(d.getFullYear(), d.getMonth(), 1));
}

function akhirBulanIni() {
  const d = new Date();
  return potongTanggal(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

function potongTanggal(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}
