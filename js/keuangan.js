// Sub-task (a): model + CRUD keuangan (produk/transaksi/catatan) + getSaldo
// Adaptasi BELAJAR JS/items.js. Persist browser via localStorage('keuanganDB')
// (pola auth.js); di Node dilewati, data tetap di memori.

let produk = [];
let transaksi = [];
let catatan = [];
let hutang = []; // {id, userId, arah: hutang|piutang, pihak, jumlah, tanggal, jatuhTempo, keterangan, status, transaksiIdLunas}
let nextProdukId = 1;
let nextTransaksiId = 1;
let nextCatatanId = 1;
let nextHutangId = 1;

function loadKeuanganDB() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem('keuanganDB');
    if (raw) {
      const db = JSON.parse(raw);
      produk = db.produk || [];
      transaksi = db.transaksi || [];
      catatan = db.catatan || [];
      hutang = db.hutang || [];
      nextProdukId = db.nextProdukId || 1;
      nextTransaksiId = db.nextTransaksiId || 1;
      nextCatatanId = db.nextCatatanId || 1;
      nextHutangId = db.nextHutangId || 1;
      if (migrasiKapitalKategori(db)) {
        produk = db.produk || [];
        saveKeuanganDB(); // simpan hasil migrasi + penanda versi sekaligus
      }
      if (migrasiKategoriTransaksi(db)) {
        transaksi = db.transaksi || [];
        saveKeuanganDB(); // simpan hasil migrasi + penanda versi sekaligus
      }
    }
  } catch (e) { /* pakai memori default */ }
}

function saveKeuanganDB() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem('keuanganDB', JSON.stringify({
    produk: produk, transaksi: transaksi, catatan: catatan, hutang: hutang,
    nextProdukId: nextProdukId, nextTransaksiId: nextTransaksiId, nextCatatanId: nextCatatanId,
    nextHutangId: nextHutangId,
    kategoriCapsV1: true, // penanda migrasi kapitalisasi sudah jalan
    kategoriTxV1: true // penanda migrasi field kategori transaksi sudah jalan
  }));
}

// Kapitalisasi per kata: 'listrik' -> 'Listrik', 'UANG SAKU' -> 'Uang Saku'.
function kapitalisasi(teks) {
  return String(teks).trim().split(/\s+/).map(function(kata) {
    return kata.charAt(0).toUpperCase() + kata.slice(1).toLowerCase();
  }).join(' ');
}

// Migrasi 1x: isi field kategori transaksi lama (dari produk / 'Lainnya').
// Isi lain utuh; bertanda versi agar tidak jalan ulang.
function migrasiKategoriTransaksi(db) {
  if (!db || db.kategoriTxV1) return false;
  let berubah = false;
  (db.transaksi || []).forEach(function(t) {
    if (t.kategori === undefined || t.kategori === null) {
      t.kategori = kategoriDariProduk(t.produkId) || 'Lainnya';
      berubah = true;
    }
  });
  return berubah;
}

// Migrasi 1x: rapikan ejaan kategori lama (pangan/MANDI -> Pangan/Mandi).
// Isi lain utuh; bertanda versi agar tidak jalan ulang.
function migrasiKapitalKategori(db) {
  if (!db || db.kategoriCapsV1) return false;
  let berubah = false;
  (db.produk || []).forEach(function(p) {
    const rapi = kapitalisasi(p.kategori);
    if (p.kategori !== rapi) {
      p.kategori = rapi;
      berubah = true;
    }
  });
  return berubah;
}

loadKeuanganDB();

// Tanggal hari ini versi LOKAL (YYYY-MM-DD). Bukan toISOString (UTC)
// yang bisa mundur 1 hari di malam WIB.
function tanggalHariIni() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

// Normalisasi kategori varian A + kapitalisasi: bandingkan huruf-kecil
// (anti-dobel utuh), simpan versi kapital per kata. 'pangan' saat 'Pangan'
// ada -> pakai 'Pangan'; 'listrik' baru -> simpan 'Listrik'.
// Beda kata ('Makanan' vs 'Pangan') TIDAK digabung: butuh manajemen
// kategori (bagian 8 planning).
function normalisasiKategori(nama) {
  const bersih = String(nama || '').trim();
  if (!bersih) return 'Lainnya';
  const ada = produk.find(function(p) { return p.kategori.toLowerCase() === bersih.toLowerCase(); });
  if (ada) return ada.kategori; // pakai ejaan yang sudah ada
  return kapitalisasi(bersih); // kategori benar-benar baru -> kapitalisasi
}

// --- Produk ---
function addProduk(nama, kategori) {
  if (!nama || !nama.trim()) {
    return { error: 'Nama produk wajib', code: 400 };
  }
  // Nama tampil = identitas: tolak kembar beda-case beda-kategori.
  // (Preseden: username + kategori. 'Beras' vs 'beras' = kembar.)
  const kembar = produk.some(function(p) { return p.nama.toLowerCase() === nama.trim().toLowerCase(); });
  if (kembar) {
    return { error: 'Produk sudah ada', code: 400 };
  }
  const item = { id: nextProdukId++, nama: nama.trim(), kategori: normalisasiKategori(kategori) };
  produk.push(item);
  saveKeuanganDB();
  return { data: item, code: 201 };
}

function updateProduk(id, patch) {
  const i = produk.findIndex(function(p) { return p.id === id; });
  if (i === -1) {
    return null; // simulasi 404
  }
  if (patch.nama !== undefined) {
    if (!patch.nama || !patch.nama.trim()) {
      return { error: 'Nama produk wajib', code: 400 };
    }
    const kembarNama = produk.some(function(p) {
      return p.id !== id && p.nama.toLowerCase() === patch.nama.trim().toLowerCase();
    });
    if (kembarNama) {
      return { error: 'Produk sudah ada', code: 400 };
    }
    produk[i].nama = patch.nama.trim();
  }
  if (patch.kategori !== undefined) {
    produk[i].kategori = normalisasiKategori(patch.kategori);
  }
  saveKeuanganDB();
  return produk[i];
}

function deleteProduk(id) {
  const i = produk.findIndex(function(p) { return p.id === id; });
  if (i === -1) {
    return false; // simulasi 404
  }
  produk.splice(i, 1);
  saveKeuanganDB();
  return true;
}

// --- Transaksi ---
// Kategori milik sebuah produk (atau null bila tak ada / tak ketemu).
function kategoriDariProduk(produkId) {
  if (produkId === null || produkId === undefined) return null;
  const p = produk.find(function(x) { return x.id === produkId; });
  return p ? p.kategori : null;
}
function addTransaksi(input) {
  const jenis = input.jenis;
  const jumlah = input.jumlah;
  if (jenis !== 'masuk' && jenis !== 'keluar') {
    return { error: 'Jenis harus masuk/keluar', code: 400 };
  }
  if (typeof jumlah !== 'number' || !(jumlah > 0)) {
    return { error: 'Jumlah harus angka > 0 (Rp)', code: 400 };
  }
  const item = {
    id: nextTransaksiId++,
    userId: input.userId || 1,
    jenis: jenis,
    jumlah: jumlah,
    produkId: input.produkId || null,
    // Snapshot kategori saat dicatat (bukan referensi hidup): histori tidak
    // ikut berubah bila kategori produk diubah nanti. Bila kosong, salin
    // dari produk terpilih; bila tetap kosong -> 'Lainnya' saat dibaca.
    kategori: input.kategori !== undefined && input.kategori !== null
      ? normalisasiKategori(input.kategori)
      : kategoriDariProduk(input.produkId),
    tanggal: input.tanggal || tanggalHariIni()
  };
  transaksi.push(item);
  saveKeuanganDB();
  return { data: item, code: 201 };
}

function updateTransaksi(id, patch, userId) {
  const i = transaksi.findIndex(function(t) { return t.id === id; });
  if (i === -1) {
    return null; // simulasi 404
  }
  if (userId !== undefined && transaksi[i].userId !== userId) {
    return { error: 'Bukan milikmu', code: 401 }; // otorisasi: milik user lain
  }
  if (patch.jumlah !== undefined) {
    if (typeof patch.jumlah !== 'number' || !(patch.jumlah > 0)) {
      return { error: 'Jumlah harus angka > 0 (Rp)', code: 400 };
    }
    transaksi[i].jumlah = patch.jumlah;
  }
  if (patch.jenis !== undefined) {
    if (patch.jenis !== 'masuk' && patch.jenis !== 'keluar') {
      return { error: 'Jenis harus masuk/keluar', code: 400 };
    }
    transaksi[i].jenis = patch.jenis;
  }
  if (patch.tanggal !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(patch.tanggal))) {
      return { error: 'Tanggal harus YYYY-MM-DD', code: 400 };
    }
    transaksi[i].tanggal = patch.tanggal;
  }
  if (patch.kategori !== undefined) {
    transaksi[i].kategori = normalisasiKategori(patch.kategori);
  }
  saveKeuanganDB();
  return transaksi[i];
}

function deleteTransaksi(id, userId) {
  const i = transaksi.findIndex(function(t) { return t.id === id; });
  if (i === -1) {
    return false; // simulasi 404
  }
  if (userId !== undefined && transaksi[i].userId !== userId) {
    return { error: 'Bukan milikmu', code: 401 }; // otorisasi: milik user lain
  }
  transaksi.splice(i, 1);
  // Cascade: catatan milik transaksi ikut terhapus (hindari yatim)
  catatan = catatan.filter(function(c) { return c.transaksiId !== id; });
  saveKeuanganDB();
  return true;
}

// --- Catatan ---
function addCatatan(transaksiId, isi, userId) {
  const ada = transaksi.find(function(t) { return t.id === transaksiId; });
  if (!ada) {
    return { error: 'Transaksi tidak ditemukan', code: 404 };
  }
  if (userId !== undefined && ada.userId !== userId) {
    return { error: 'Bukan milikmu', code: 401 }; // otorisasi: milik user lain
  }
  if (!isi || !isi.trim()) {
    return { error: 'Isi catatan wajib', code: 400 };
  }
  const item = { id: nextCatatanId++, transaksiId: transaksiId, isi: isi.trim() };
  catatan.push(item);
  saveKeuanganDB();
  return { data: item, code: 201 };
}

function updateCatatan(id, isi, userId) {
  const i = catatan.findIndex(function(c) { return c.id === id; });
  if (i === -1) {
    return null; // simulasi 404
  }
  const induk = transaksi.find(function(t) { return t.id === catatan[i].transaksiId; });
  if (userId !== undefined && (!induk || induk.userId !== userId)) {
    return { error: 'Bukan milikmu', code: 401 }; // otorisasi via transaksi induk
  }
  if (!isi || !isi.trim()) {
    return { error: 'Isi catatan wajib', code: 400 };
  }
  catatan[i].isi = isi.trim();
  saveKeuanganDB();
  return catatan[i];
}

function deleteCatatan(id, userId) {
  const i = catatan.findIndex(function(c) { return c.id === id; });
  if (i === -1) {
    return false; // simulasi 404
  }
  const induk = transaksi.find(function(t) { return t.id === catatan[i].transaksiId; });
  if (userId !== undefined && (!induk || induk.userId !== userId)) {
    return { error: 'Bukan milikmu', code: 401 }; // otorisasi via transaksi induk
  }
  catatan.splice(i, 1);
  saveKeuanganDB();
  return true;
}

// --- Hutang-piutang ---
// arah 'hutang' = kita berutang ke pihak; 'piutang' = pihak berutang ke kita.
// status 'belum' -> 'lunas'. Pelunasan OTOMATIS catat transaksi kas
// (hutang->keluar, piutang->masuk) + simpan transaksiIdLunas. Idempoten:
// yang sudah lunas ditolak. Hapus hanya yang belum lunas (jejak audit).
function addHutang(input) {
  const arah = input.arah;
  const jumlah = input.jumlah;
  if (arah !== 'hutang' && arah !== 'piutang') {
    return { error: 'Arah harus hutang/piutang', code: 400 };
  }
  if (!input.pihak || !String(input.pihak).trim()) {
    return { error: 'Pihak wajib diisi', code: 400 };
  }
  if (typeof jumlah !== 'number' || !(jumlah > 0)) {
    return { error: 'Jumlah harus angka > 0 (Rp)', code: 400 };
  }
  if (input.jatuhTempo !== undefined && input.jatuhTempo !== null && input.jatuhTempo !== '') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.jatuhTempo))) {
      return { error: 'Jatuh tempo harus YYYY-MM-DD', code: 400 };
    }
  }
  const item = {
    id: nextHutangId++,
    userId: input.userId || 1,
    arah: arah,
    pihak: String(input.pihak).trim(),
    jumlah: jumlah,
    dibayar: 0, // total cicilan masuk (<= jumlah). Lunas saat dibayar >= jumlah.
    tanggal: input.tanggal || tanggalHariIni(),
    jatuhTempo: input.jatuhTempo || null,
    keterangan: input.keterangan ? String(input.keterangan).trim() : '',
    status: 'belum',
    transaksiIdLunas: null
  };
  hutang.push(item);
  saveKeuanganDB();
  return { data: item, code: 201 };
}

function lunaskanHutang(id, userId) {
  const i = hutang.findIndex(function(h) { return h.id === id; });
  if (i === -1) {
    return null; // simulasi 404
  }
  if (userId !== undefined && hutang[i].userId !== userId) {
    return { error: 'Bukan milikmu', code: 401 };
  }
  if (hutang[i].status === 'lunas') {
    return { error: 'Sudah lunas', code: 400 }; // idempoten: tolak dobel
  }
  // Shortcut: lunasi = bayar sisa sekaligus
  return bayarHutang(id, hutang[i].jumlah - hutang[i].dibayar, userId);
}

// Cicilan: bayar sebagian/penuh. Nominal > sisa -> 400 (tolak, tanpa
// kembalian/plus-minus logika). Tiap bayaran auto-catat transaksi kas
// + catatan (konsisten pelunasan). Lunas otomatis saat dibayar >= jumlah.
function bayarHutang(id, nominal, userId) {
  const i = hutang.findIndex(function(h) { return h.id === id; });
  if (i === -1) {
    return null; // simulasi 404
  }
  if (userId !== undefined && hutang[i].userId !== userId) {
    return { error: 'Bukan milikmu', code: 401 };
  }
  if (hutang[i].status === 'lunas') {
    return { error: 'Sudah lunas', code: 400 }; // idempoten: tolak dobel
  }
  if (typeof nominal !== 'number' || !(nominal > 0)) {
    return { error: 'Nominal harus angka > 0 (Rp)', code: 400 };
  }
  const sisa = hutang[i].jumlah - hutang[i].dibayar;
  if (nominal > sisa) {
    return { error: 'Nominal melebihi sisa Rp' + formatRupiah(sisa), code: 400 };
  }
  const h = hutang[i];
  const jenisKas = h.arah === 'hutang' ? 'keluar' : 'masuk';
  const res = addTransaksi({
    userId: h.userId,
    jenis: jenisKas,
    jumlah: nominal,
    tanggal: tanggalHariIni(),
    kategori: null
  });
  if (res.code !== 201) {
    return { error: res.error, code: res.code }; // gagal di tengah: jangan ubah apa pun
  }
  const idCatatan = 'Bayar ' + (h.arah === 'hutang' ? 'hutang ke ' : 'piutang ') + h.pihak + ' Rp' + formatRupiah(nominal);
  addCatatan(res.data.id, idCatatan, h.userId);
  h.dibayar += nominal;
  if (h.dibayar >= h.jumlah) {
    h.status = 'lunas';
    h.transaksiIdLunas = res.data.id;
  }
  saveKeuanganDB();
  return { data: h, code: 200 };
}

function deleteHutang(id, userId) {
  const i = hutang.findIndex(function(h) { return h.id === id; });
  if (i === -1) {
    return false; // simulasi 404
  }
  if (userId !== undefined && hutang[i].userId !== userId) {
    return { error: 'Bukan milikmu', code: 401 };
  }
  if (hutang[i].status === 'lunas') {
    return { error: 'Sudah lunas, tidak boleh dihapus', code: 400 }; // jejak audit
  }
  hutang.splice(i, 1);
  saveKeuanganDB();
  return true;
}

// --- Saldo: total masuk - total keluar (Rp) ---
// filter opsional {dari, sampai} = string YYYY-MM-DD inklusif.
// Tanpa filter = perilaku lama (semua waktu), mundur kompatibel.
function getSaldo(userId, filter) {
  let masuk = 0;
  let keluar = 0;
  const dari = filter && filter.dari ? filter.dari : null;
  const sampai = filter && filter.sampai ? filter.sampai : null;
  transaksi.forEach(function(t) {
    if (userId !== undefined && t.userId !== userId) return;
    if (dari && t.tanggal < dari) return;
    if (sampai && t.tanggal > sampai) return;
    if (t.jenis === 'masuk') masuk += t.jumlah;
    if (t.jenis === 'keluar') keluar += t.jumlah;
  });
  return { masuk: masuk, keluar: keluar, saldo: masuk - keluar };
}

// --- Ringkasan pengeluaran per kategori (Rp + persen dari total keluar) ---
// Ikut filter periode yang sama kayak getSaldo. Kategori dari produk
// (kapital rapi via normalisasi); tanpa produk -> 'Lainnya'. Urut terbesar.
function getRingkasanKategori(userId, filter) {
  const dari = filter && filter.dari ? filter.dari : null;
  const sampai = filter && filter.sampai ? filter.sampai : null;
  const total = {};
  let keluarSemua = 0;
  transaksi.forEach(function(t) {
    if (userId !== undefined && t.userId !== userId) return;
    if (t.jenis !== 'keluar') return;
    if (dari && t.tanggal < dari) return;
    if (sampai && t.tanggal > sampai) return;
    let kat = t.kategori || kategoriDariProduk(t.produkId) || 'Lainnya';
    total[kat] = (total[kat] || 0) + t.jumlah;
    keluarSemua += t.jumlah;
  });
  const hasil = Object.keys(total).map(function(kat) {
    return {
      kategori: kat,
      total: total[kat],
      persen: keluarSemua > 0 ? Math.round(total[kat] / keluarSemua * 100) : 0
    };
  });
  hasil.sort(function(a, b) { return b.total - a.total; });
  return hasil;
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

async function main() {
  console.log('----- TAMBAH produk -----');
  console.log(await addProduk('Beras', 'pangan'));
  console.log(await addProduk('Sabun', 'mandi'));
  console.log(await addProduk('', 'pangan')); // 400

  console.log('\n----- CATAT masuk Rp300 -----');
  console.log(await addTransaksi({ jenis: 'masuk', jumlah: 300, produkId: null, tanggal: '2026-09-17' }));

  console.log('\n----- CATAT keluar Rp200 (Beras) -----');
  console.log(await addTransaksi({ jenis: 'keluar', jumlah: 200, produkId: 1, tanggal: '2026-09-17' }));

  console.log('\n----- CATAT invalid (400) -----');
  console.log(await addTransaksi({ jenis: 'masuk', jumlah: 0 }));
  console.log(await addTransaksi({ jenis: 'hadiah', jumlah: 50 }));

  console.log('\n----- SALDO (harap 100) -----');
  console.log(await getSaldo(1));

  console.log('\n----- CATATAN -----');
  console.log(await addCatatan(2, 'Belanja mingguan'));

  console.log('\n----- UBAH transaksi 2 jadi Rp150 (user 1) -----');
  console.log(await updateTransaksi(2, { jumlah: 150 }, 1));

  console.log('\n----- SALDO setelah ubah (harap 150) -----');
  console.log(await getSaldo(1));

  console.log('\n----- UBAH milik user lain (401) -----');
  console.log(await updateTransaksi(2, { jumlah: 10 }, 2));

  console.log('\n----- HAPUS milik user lain (401) -----');
  console.log(await deleteTransaksi(2, 2));

  console.log('\n----- UBAH id 99 (null) -----');
  console.log(await updateTransaksi(99, { jumlah: 10 }));

  console.log('\n----- HAPUS transaksi 1 (true) -----');
  console.log(await deleteTransaksi(1, 1));

  console.log('\n----- HAPUS id 99 (false) -----');
  console.log(await deleteTransaksi(99));

  console.log('\n----- SALDO akhir (harap -150) -----');
  console.log(await getSaldo(1));
}

if (typeof window === 'undefined') {
  main();
}
