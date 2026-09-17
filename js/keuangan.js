// Sub-task (a): model + CRUD keuangan (produk/transaksi/catatan) + getSaldo
// Adaptasi BELAJAR JS/items.js. Persist browser via localStorage('keuanganDB')
// (pola auth.js); di Node dilewati, data tetap di memori.

let produk = [];
let transaksi = [];
let catatan = [];
let nextProdukId = 1;
let nextTransaksiId = 1;
let nextCatatanId = 1;

function loadKeuanganDB() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem('keuanganDB');
    if (raw) {
      const db = JSON.parse(raw);
      produk = db.produk || [];
      transaksi = db.transaksi || [];
      catatan = db.catatan || [];
      nextProdukId = db.nextProdukId || 1;
      nextTransaksiId = db.nextTransaksiId || 1;
      nextCatatanId = db.nextCatatanId || 1;
    }
  } catch (e) { /* pakai memori default */ }
}

function saveKeuanganDB() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem('keuanganDB', JSON.stringify({
    produk: produk, transaksi: transaksi, catatan: catatan,
    nextProdukId: nextProdukId, nextTransaksiId: nextTransaksiId, nextCatatanId: nextCatatanId
  }));
}

loadKeuanganDB();

// --- Produk ---
function addProduk(nama, kategori) {
  if (!nama || !nama.trim()) {
    return { error: 'Nama produk wajib', code: 400 };
  }
  const item = { id: nextProdukId++, nama: nama.trim(), kategori: kategori || 'lainnya' };
  produk.push(item);
  saveKeuanganDB();
  return { data: item, code: 201 };
}

// --- Transaksi ---
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
    tanggal: input.tanggal || new Date().toISOString().slice(0, 10)
  };
  transaksi.push(item);
  saveKeuanganDB();
  return { data: item, code: 201 };
}

function updateTransaksi(id, patch) {
  const i = transaksi.findIndex(function(t) { return t.id === id; });
  if (i === -1) {
    return null; // simulasi 404
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
  saveKeuanganDB();
  return transaksi[i];
}

function deleteTransaksi(id) {
  const i = transaksi.findIndex(function(t) { return t.id === id; });
  if (i === -1) {
    return false; // simulasi 404
  }
  transaksi.splice(i, 1);
  saveKeuanganDB();
  return true;
}

// --- Catatan ---
function addCatatan(transaksiId, isi) {
  const ada = transaksi.find(function(t) { return t.id === transaksiId; });
  if (!ada) {
    return { error: 'Transaksi tidak ditemukan', code: 404 };
  }
  if (!isi || !isi.trim()) {
    return { error: 'Isi catatan wajib', code: 400 };
  }
  const item = { id: nextCatatanId++, transaksiId: transaksiId, isi: isi.trim() };
  catatan.push(item);
  saveKeuanganDB();
  return { data: item, code: 201 };
}

// --- Saldo: total masuk - total keluar (Rp) ---
function getSaldo(userId) {
  let masuk = 0;
  let keluar = 0;
  transaksi.forEach(function(t) {
    if (userId !== undefined && t.userId !== userId) return;
    if (t.jenis === 'masuk') masuk += t.jumlah;
    if (t.jenis === 'keluar') keluar += t.jumlah;
  });
  return { masuk: masuk, keluar: keluar, saldo: masuk - keluar };
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

  console.log('\n----- UBAH transaksi 2 jadi Rp150 -----');
  console.log(await updateTransaksi(2, { jumlah: 150 }));

  console.log('\n----- SALDO setelah ubah (harap 150) -----');
  console.log(await getSaldo(1));

  console.log('\n----- UBAH id 99 (null) -----');
  console.log(await updateTransaksi(99, { jumlah: 10 }));

  console.log('\n----- HAPUS transaksi 1 (true) -----');
  console.log(await deleteTransaksi(1));

  console.log('\n----- HAPUS id 99 (false) -----');
  console.log(await deleteTransaksi(99));

  console.log('\n----- SALDO akhir (harap -150) -----');
  console.log(await getSaldo(1));
}

if (typeof window === 'undefined') {
  main();
}
