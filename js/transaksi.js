const infoUser = document.getElementById('info-user');
const form = document.getElementById('form-transaksi');
const btnTambah = document.getElementById('btn-tambah');
const hasil = document.getElementById('hasil');
const listEl = document.getElementById('list-transaksi');
const bulkBar = document.getElementById('bulk-bar');
const bulkCount = document.getElementById('bulk-count');
const btnBulkHapus = document.getElementById('btn-bulk-hapus');
const pilihJenis = document.getElementById('jenis');
const fieldUntuk = document.getElementById('field-untuk');
const pilihProduk = document.getElementById('untuk-produk');
const fieldKategoriBebas = document.getElementById('field-kategori-bebas');
const inputKategoriBebas = document.getElementById('kategori-bebas');

// Bulk: id terpilih lintas render ulang. Reset tiap tampil() (predictable).
const terpilih = new Set();

function perbaruiBar() {
  if (terpilih.size === 0) {
    bulkBar.hidden = true;
    return;
  }
  bulkBar.hidden = false;
  bulkCount.textContent = terpilih.size + ' terpilih. ';
}

btnBulkHapus.addEventListener('click', function() {
  if (terpilih.size === 0) {
    pesanError(hasil, 'Pilih dulu minimal 1 transaksi.');
    return;
  }
  const n = terpilih.size;
  if (!window.confirm('Hapus ' + n + ' transaksi terpilih?')) return; // 1x confirm global
  let ok = 0;
  const gagal = [];
  Array.from(terpilih).forEach(function(id) {
    const out = deleteTransaksi(id, userId); // cascade catatan otomatis
    if (out === true) {
      ok++;
    } else {
      gagal.push(id);
    }
  });
  terpilih.clear();
  tampil();
  if (gagal.length === 0) {
    pesanOk(hasil, ok + ' transaksi dihapus.');
  } else {
    pesanError(hasil, ok + ' dihapus, ' + gagal.length + ' gagal (bukan milikmu/hilang).');
  }
});
const btnUnduh = document.getElementById('btn-unduh');

// CSV: tanggal, jenis, jumlah murni, kategori, catatan gabungan ';'.
// Selalu quote-wrap (aman koma/quote/enter). Data milik sendiri saja.
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

function bangunCSV() {
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

btnUnduh.addEventListener('click', function() {
  const csv = bangunCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'keuangan-' + tanggalHariIni() + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  pesanOk(hasil, 'CSV diunduh.');
});

// Parse nominal Rupiah versi bulat + allowlist ketat (bukan strip-buta).
// Lolos: digit + titik ribuan + awalan Rp + spasi. Selain itu -> NaN (400).
// '20.000' -> 20000; 'Rp 20.000' -> 20000; 'ssss2000sss'/'-5000'/kosong -> NaN.
function parseRupiah(teks) {
  let s = String(teks).trim();
  s = s.replace(/^rp\s*/i, '');
  s = s.replace(/\s+/g, '');
  if (!/^[0-9.]+$/.test(s)) return NaN;
  const digit = s.replace(/\./g, '');
  if (!digit) return NaN;
  return Number(digit);
}

// Guard: harus login — baca token, 401 = redirect ke login
const token = window.localStorage.getItem('token');
const resProfile = getProfile(token);
let userId = null;

if (resProfile.code !== 200) {
  infoUser.textContent = 'Belum login, redirect ke halaman login...';
  setTimeout(function() {
    window.location.href = 'login.html';
  }, 800);
} else {
  userId = resProfile.data.id;
  infoUser.textContent = 'Login sebagai: ' + (resProfile.data.username || resProfile.data.email) + ' (' + resProfile.data.role + ')';
  document.getElementById('tanggal').value = tanggalHariIni(); // lokal, bukan UTC
  isiPilihProduk();
  aturUntuk();
  tampil();
}

// Isi dropdown produk + opsi tulis-sendiri. Dipanggil tiap tampil()
// agar produk baru langsung muncul tanpa refresh halaman.
function isiPilihProduk() {
  const simpan = pilihProduk.value;
  pilihProduk.innerHTML = '';
  const kosong = document.createElement('option');
  kosong.value = '';
  kosong.textContent = '— Pilih —';
  pilihProduk.appendChild(kosong);
  produk.forEach(function(p) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nama + ' (' + p.kategori + ')';
    pilihProduk.appendChild(opt);
  });
  const baru = document.createElement('option');
  baru.value = '__baru__';
  baru.textContent = 'Tulis sendiri...';
  pilihProduk.appendChild(baru);
  pilihProduk.value = simpan;
  aturUntuk();
}

// Seksi "Untuk apa?" hanya untuk pengeluaran; input bebas hanya bila
// pilih "Tulis sendiri...". Pemasukan sembunyikan (tetap sederhana).
function aturUntuk() {
  const isKeluar = pilihJenis.value === 'keluar';
  fieldUntuk.hidden = !isKeluar;
  fieldKategoriBebas.hidden = !isKeluar || pilihProduk.value !== '__baru__';
}

pilihJenis.addEventListener('change', aturUntuk);
pilihProduk.addEventListener('change', aturUntuk);

function tampil() {
  const data = transaksi.filter(function(t) { return t.userId === userId; });
  // Prune (bukan clear): buang id yang sudah tidak ada, pertahankan pilihan
  // valid — biar pilih-semua / pilihan satuan selamat dari render ulang.
  Array.from(terpilih).forEach(function(id) {
    const masihAda = data.some(function(t) { return t.id === id; });
    if (!masihAda) terpilih.delete(id);
  });
  perbaruiBar();
  listEl.innerHTML = '';
  if (data.length === 0) {
    listEl.innerHTML = '<p>Belum ada transaksi. Yuk catat yang pertama di form atas.</p>';
    return;
  }
  renderSeksi('Pemasukan', data.filter(function(t) { return t.jenis === 'masuk'; }));
  renderSeksi('Pengeluaran', data.filter(function(t) { return t.jenis === 'keluar'; }));
}

// Satu seksi = h3 + table beneran (No | Tanggal | Jumlah | Aksi) + subtotal.
function renderSeksi(judul, rows) {
  const h3 = document.createElement('h3');
  h3.textContent = judul;
  listEl.appendChild(h3);

  if (rows.length === 0) {
    const kosong = document.createElement('p');
    kosong.textContent = 'Belum ada ' + judul.toLowerCase() + '.';
    listEl.appendChild(kosong);
    return;
  }

  const table = document.createElement('table');
  table.className = 'tabel-transaksi';
  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  const thCek = document.createElement('th');
  const cekSemua = document.createElement('input');
  cekSemua.type = 'checkbox';
  cekSemua.setAttribute('aria-label', 'Pilih semua ' + judul.toLowerCase());
  cekSemua.addEventListener('change', function() {
    rows.forEach(function(t) {
      if (cekSemua.checked) {
        terpilih.add(t.id);
      } else {
        terpilih.delete(t.id);
      }
    });
    tampil();
  });
  thCek.appendChild(cekSemua);
  trHead.appendChild(thCek);
  ['No', 'Tanggal', 'Jumlah', 'Aksi'].forEach(function(nama) {
    const th = document.createElement('th');
    th.textContent = nama;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  let subtotal = 0;
  rows.forEach(function(t, i) {
    subtotal += t.jumlah;
    tbody.appendChild(bangunBaris(tbody, t, i + 1));
  });
  table.appendChild(tbody);

  const tfoot = document.createElement('tfoot');
  const trFoot = document.createElement('tr');
  const tdLabel = document.createElement('td');
  tdLabel.colSpan = 3;
  tdLabel.textContent = 'Subtotal ' + judul.toLowerCase();
  const tdTotal = document.createElement('td');
  tdTotal.textContent = 'Rp' + formatRupiah(subtotal);
  const tdKosong = document.createElement('td');
  trFoot.appendChild(tdLabel);
  trFoot.appendChild(tdTotal);
  trFoot.appendChild(tdKosong);
  tfoot.appendChild(trFoot);
  table.appendChild(tfoot);

  listEl.appendChild(table);
}

function bangunBaris(tbody, t, nomor) {
  const tr = document.createElement('tr');

  const tdCek = document.createElement('td');
  const cek = document.createElement('input');
  cek.type = 'checkbox';
  cek.checked = terpilih.has(t.id);
  cek.setAttribute('aria-label', 'Pilih transaksi Rp' + formatRupiah(t.jumlah));
  cek.addEventListener('change', function() {
    if (cek.checked) {
      terpilih.add(t.id);
    } else {
      terpilih.delete(t.id);
    }
    perbaruiBar();
  });
  tdCek.appendChild(cek);
  const tdNo = document.createElement('td');
  tdNo.textContent = nomor;
  const tdTanggal = document.createElement('td');
  tdTanggal.textContent = t.tanggal;
  const tdJumlah = document.createElement('td');
  tdJumlah.textContent = 'Rp' + formatRupiah(t.jumlah);
  const tdAksi = document.createElement('td');

  const btnUbah = document.createElement('button');
  btnUbah.textContent = 'Ubah';
    btnUbah.addEventListener('click', function() {
      // Mode edit inline (tanpa prompt): tanggal + jumlah + kategori + Simpan/Batal
      tr.innerHTML = '';
      const tdNoE = document.createElement('td');
      tdNoE.textContent = nomor;
      const tdTglE = document.createElement('td');
      const inputTgl = document.createElement('input');
      inputTgl.type = 'date';
      inputTgl.name = 'tanggal-baru';
      inputTgl.setAttribute('aria-label', 'Tanggal baru');
      inputTgl.value = t.tanggal;
      tdTglE.appendChild(inputTgl);
      const tdJumlahE = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.name = 'jumlah-baru';
      input.setAttribute('aria-label', 'Jumlah baru');
      input.value = formatRupiah(t.jumlah); // tampilkan format 20.000 (parse saat Simpan)
      tdJumlahE.appendChild(input);
      // Kategori hanya relevan untuk pengeluaran (pemasukan tetap sederhana)
      let inputKat = null;
      if (t.jenis === 'keluar') {
        inputKat = document.createElement('input');
        inputKat.type = 'text';
        inputKat.name = 'kategori-baru';
        inputKat.setAttribute('aria-label', 'Kategori baru');
        inputKat.placeholder = 'Kategori';
        inputKat.value = kategoriOf(t);
        tdJumlahE.appendChild(inputKat);
      }
      const tdAksiE = document.createElement('td');

      const btnSimpan = document.createElement('button');
      btnSimpan.textContent = 'Simpan';
      btnSimpan.addEventListener('click', function() {
        const baru = parseRupiah(input.value);
        const patch = { jumlah: baru, tanggal: inputTgl.value };
        if (inputKat) patch.kategori = inputKat.value;
        const out = updateTransaksi(t.id, patch, userId);
        if (!out) {
          pesanError(hasil, 'Gagal: transaksi tidak ditemukan.');
          tampil();
          return;
        }
        if (out.error) {
          pesanError(hasil, 'Gagal (' + out.code + '): ' + out.error);
          return;
        }
        pesanOk(hasil, 'Transaksi diubah jadi Rp' + formatRupiah(baru) + '.');
        tampil();
      });

      const btnBatal = document.createElement('button');
      btnBatal.textContent = 'Batal';
      btnBatal.classList.add('btn-soft');
      btnBatal.addEventListener('click', function() {
        tampil();
      });

      tdAksiE.appendChild(btnSimpan);
      tdAksiE.appendChild(document.createTextNode(' '));
      tdAksiE.appendChild(btnBatal);
      tr.appendChild(tdNoE);
      tr.appendChild(tdTglE);
      tr.appendChild(tdJumlahE);
      tr.appendChild(tdAksiE);
    });

    const btnHapus = document.createElement('button');
    btnHapus.textContent = 'Hapus';
    btnHapus.classList.add('btn-danger');
    btnHapus.addEventListener('click', function() {
      if (!window.confirm('Hapus transaksi Rp' + formatRupiah(t.jumlah) + '?')) return;
      const outDel = deleteTransaksi(t.id, userId);
      if (outDel && outDel.error) {
        pesanError(hasil, 'Gagal (' + outDel.code + '): ' + outDel.error);
        return;
      }
      if (!outDel) {
        pesanError(hasil, 'Gagal: transaksi tidak ditemukan.');
        tampil();
        return;
      }
      pesanOk(hasil, 'Transaksi Rp' + formatRupiah(t.jumlah) + ' dihapus.');
      tampil();
    });

    const btnCatatan = document.createElement('button');
    btnCatatan.textContent = 'Catatan';
    btnCatatan.addEventListener('click', function() {
      // Kembangkan/tutup baris panel catatan di bawah baris ini
      const lama = tr.nextSibling;
      if (lama && lama.className === 'baris-catatan') {
        tbody.removeChild(lama);
        return;
      }
      const panelTr = document.createElement('tr');
      panelTr.className = 'baris-catatan';
      const panelTd = document.createElement('td');
      panelTd.colSpan = 5;
      const panel = document.createElement('div');
      panel.className = 'panel-catatan';

      const daftar = catatan.filter(function(c) { return c.transaksiId === t.id; });
      const ul = document.createElement('ul');
      if (daftar.length === 0) {
        const kosong = document.createElement('li');
        kosong.textContent = 'Belum ada catatan.';
        ul.appendChild(kosong);
      } else {
        daftar.forEach(function(c) {
          const item = document.createElement('li');
          item.appendChild(document.createTextNode(c.isi + ' '));

          const btnUbahC = document.createElement('button');
          btnUbahC.textContent = 'Ubah';
          btnUbahC.addEventListener('click', function() {
            // Mode edit inline (tanpa prompt): input isi baru + Simpan/Batal
            item.innerHTML = '';
            const inputUbah = document.createElement('input');
            inputUbah.type = 'text';
            inputUbah.name = 'isi-catatan-baru';
            inputUbah.setAttribute('aria-label', 'Isi catatan baru');
            inputUbah.value = c.isi;

            const btnSimpanU = document.createElement('button');
            btnSimpanU.textContent = 'Simpan';
            btnSimpanU.addEventListener('click', function() {
              const baru = inputUbah.value.trim();
              if (!baru) return; // kosong = abaikan diam-diam
              const out = updateCatatan(c.id, baru, userId);
              if (!out) {
                pesanError(hasil, 'Gagal: catatan tidak ditemukan.');
                tampil();
                return;
              }
              if (out.error) {
                pesanError(hasil, 'Gagal (' + out.code + '): ' + out.error);
                return;
              }
              pesanOk(hasil, 'Catatan diubah.');
              tampil();
            });

            const btnBatalU = document.createElement('button');
            btnBatalU.textContent = 'Batal';
            btnBatalU.classList.add('btn-soft');
            btnBatalU.addEventListener('click', function() {
              tampil();
            });

            item.appendChild(inputUbah);
            item.appendChild(document.createTextNode(' '));
            item.appendChild(btnSimpanU);
            item.appendChild(document.createTextNode(' '));
            item.appendChild(btnBatalU);
          });

          const btnHapusC = document.createElement('button');
          btnHapusC.textContent = 'Hapus';
          btnHapusC.classList.add('btn-danger');
          btnHapusC.addEventListener('click', function() {
            if (!window.confirm('Hapus catatan ini?')) return;
            const outDel = deleteCatatan(c.id, userId);
            if (outDel && outDel.error) {
              pesanError(hasil, 'Gagal (' + outDel.code + '): ' + outDel.error);
              return;
            }
            if (!outDel) {
              pesanError(hasil, 'Gagal: catatan tidak ditemukan.');
              tampil();
              return;
            }
            pesanOk(hasil, 'Catatan dihapus.');
            tampil();
          });

          item.appendChild(btnUbahC);
          item.appendChild(document.createTextNode(' '));
          item.appendChild(btnHapusC);
          ul.appendChild(item);
        });
      }
      panel.appendChild(ul);

      const inputCatatan = document.createElement('input');
      inputCatatan.type = 'text';
      inputCatatan.name = 'tulis-catatan';
      inputCatatan.setAttribute('aria-label', 'Tulis catatan');
      inputCatatan.placeholder = 'Tulis catatan...';
      panel.appendChild(inputCatatan);
      panel.appendChild(document.createTextNode(' '));

      const btnSimpanCatatan = document.createElement('button');
      btnSimpanCatatan.textContent = 'Simpan';
      btnSimpanCatatan.addEventListener('click', function() {
        if (!inputCatatan.value.trim()) return; // kosong = abaikan diam-diam
        const res = addCatatan(t.id, inputCatatan.value, userId);
        if (res.code === 201) {
          pesanOk(hasil, 'Catatan tersimpan.');
          tampil();
        } else {
          pesanError(hasil, 'Gagal (' + res.code + '): ' + res.error);
        }
      });
      panel.appendChild(btnSimpanCatatan);
      panel.appendChild(document.createTextNode(' '));

      const btnTutup = document.createElement('button');
      btnTutup.textContent = 'Tutup';
      btnTutup.classList.add('btn-soft');
      btnTutup.addEventListener('click', function() {
        tbody.removeChild(panelTr);
      });
      panel.appendChild(btnTutup);

      panelTd.appendChild(panel);
      panelTr.appendChild(panelTd);
      tbody.insertBefore(panelTr, tr.nextSibling);
    });

    tdAksi.appendChild(btnUbah);
    tdAksi.appendChild(document.createTextNode(' '));
    tdAksi.appendChild(btnHapus);
    tdAksi.appendChild(document.createTextNode(' '));
    tdAksi.appendChild(btnCatatan);
    tr.appendChild(tdCek);
    tr.appendChild(tdNo);
    tr.appendChild(tdTanggal);
    tr.appendChild(tdJumlah);
    tr.appendChild(tdAksi);
    return tr;
}

form.addEventListener('submit', function(e) {
  e.preventDefault();
  if (!userId) {
    pesanError(hasil, 'Belum login. Redirect ke halaman login...');
    return;
  }
  const jenis = document.getElementById('jenis').value;
  const jumlah = parseRupiah(document.getElementById('jumlah').value);
  const tanggal = document.getElementById('tanggal').value;
  const catatanAwal = document.getElementById('catatan-awal').value;
  // Untuk apa? (khusus keluar): produk terpilih -> produkId (+kategori
  // disalin model); tulis-sendiri -> kategori bebas; selain itu null.
  let produkId = null;
  let kategori = null;
  if (jenis === 'keluar') {
    if (pilihProduk.value === '__baru__') {
      kategori = inputKategoriBebas.value;
    } else if (pilihProduk.value !== '') {
      produkId = Number(pilihProduk.value);
    }
  }
  btnTambah.textContent = 'Loading...';
  const res = addTransaksi({ userId: userId, jenis: jenis, jumlah: jumlah, produkId: produkId, kategori: kategori, tanggal: tanggal });
  btnTambah.textContent = 'Catat';
  if (res.code === 201) {
    document.getElementById('jumlah').value = '';
    document.getElementById('catatan-awal').value = '';
    inputKategoriBebas.value = '';
    pilihProduk.value = '';
    aturUntuk();
    inputKategoriBebas.value = '';
    let pesan = res.data.jenis + ' Rp' + formatRupiah(res.data.jumlah) + ' tercatat!';
    // Catatan opsional: kosong = lewati diam-diam (transaksi tetap sukses)
    if (catatanAwal.trim()) {
      const rc = addCatatan(res.data.id, catatanAwal, userId);
      if (rc.code === 201) {
        pesan += ' Catatan tersimpan.';
      } else {
        pesan += ' (Catatan gagal: ' + rc.error + ')';
      }
    }
    pesanOk(hasil, pesan);
    tampil();
  } else {
    pesanError(hasil, 'Gagal (' + res.code + '): ' + res.error);
  }
});
