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

pasangToggleTema(); // dark mode ikut sistem, manual menang via localStorage
pasangIkonMenu(); // ikon SVG di sidebar menu

// Bulk: id terpilih lintas render ulang. Reset tiap tampil() (predictable).
const terpilih = new Set();

// Tab Riwayat: semua = gabungan kronologis; masuk/keluar = seksi lama.
// Filter teks: kategori + isi catatan + tanggal + nominal.
let tabAktif = 'semua';
let kataCari = '';

document.querySelectorAll('.tab-riwayat').forEach(function(btn) {
  btn.addEventListener('click', async function() {
    tabAktif = btn.getAttribute('data-tab');
    document.querySelectorAll('.tab-riwayat').forEach(function(b) {
      b.classList.toggle('tab-aktif', b === btn);
    });
    await tampil();
  });
});

document.getElementById('cari-riwayat').addEventListener('input', async function(e) {
  kataCari = e.target.value.trim().toLowerCase();
  await tampil(); // input di luar listEl = fokus tidak hilang
});

function cocokCari(t) {
  if (!kataCari) return true;
  const kat = kategoriOf(t).toLowerCase();
  const notes = cacheCatatan.filter(function(c) { return c.transaksiId === t.id; })
    .map(function(c) { return c.isi.toLowerCase(); }).join(' ');
  return kat.indexOf(kataCari) !== -1 || notes.indexOf(kataCari) !== -1 ||
    String(t.jumlah).indexOf(kataCari) !== -1 || t.tanggal.indexOf(kataCari) !== -1;
}

function perbaruiBar() {
  if (terpilih.size === 0) {
    bulkBar.hidden = true;
    return;
  }
  bulkBar.hidden = false;
  bulkCount.textContent = terpilih.size + ' terpilih. ';
}

btnBulkHapus.addEventListener('click', async function() {
  if (terpilih.size === 0) {
    pesanError(hasil, 'Pilih dulu minimal 1 transaksi.');
    return;
  }
  const n = terpilih.size;
  if (!window.confirm('Hapus ' + n + ' transaksi terpilih?')) return; // 1x confirm global
  let ok = 0;
  const gagal = [];
  for (const id of Array.from(terpilih)) {
    const out = await deleteTransaksi(id, userId); // cascade catatan otomatis
    if (out === true) {
      ok++;
    } else {
      gagal.push(id);
    }
  }
  terpilih.clear();
  await tampil();
  if (gagal.length === 0) {
    pesanOk(hasil, ok + ' transaksi dihapus.');
  } else {
    pesanError(hasil, ok + ' dihapus, ' + gagal.length + ' gagal (bukan milikmu/hilang).');
  }
});
// CSV pindah ke js/format.js + tombol pindah ke profile.html (PR-8).

// Guard: harus login — baca token, 401 = redirect ke login
const token = window.localStorage.getItem('token');
let userId = null;
let cacheCatatan = []; // semua catatan milik user (panel + cari)

async function init() {
  const resProfile = await getProfile(token);
  if (resProfile.code === 503) {
    infoUser.textContent = 'Server tidak terjangkau.';
    tampilkanModal('Server tidak terjangkau', pesanServerMati());
    return;
  }
  if (resProfile.code !== 200) {
    infoUser.textContent = 'Belum login, redirect ke halaman login...';
    setTimeout(function() {
      window.location.href = 'login';
    }, 800);
    return;
  }
  userId = resProfile.data.id;
  infoUser.textContent = 'Login sebagai: ' + (resProfile.data.username || resProfile.data.email) + ' (' + resProfile.data.role + ')';
  document.getElementById('tanggal').value = tanggalHariIni(); // lokal, bukan UTC
  pasangFormatRupiahLive(document.getElementById('jumlah'));
  await isiPilihProduk();
  aturUntuk();
  await tampil();
}
init();

// Isi dropdown produk + opsi tulis-sendiri. Dipanggil tiap tampil()
// agar produk baru langsung muncul tanpa refresh halaman.
async function isiPilihProduk() {
  await segarkanCacheProduk(); // via API (Fase A-3)
  const simpan = pilihProduk.value;
  pilihProduk.innerHTML = '';
  const kosong = document.createElement('option');
  kosong.value = '';
  kosong.textContent = '— Pilih —';
  pilihProduk.appendChild(kosong);
  cacheProduk.forEach(function(p) {
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

async function tampil() {
  // Paralel: 2 request jalan bareng (±1x RTT, bukan 2x).
  const [semua, notes] = await Promise.all([getTransaksi(), muatSemuaCatatan()]);
  cacheCatatan = notes; // panel + cari
  const data = semua.filter(cocokCari); // server sudah filter milik user
  // Prune (bukan clear): buang id yang sudah tidak ada, pertahankan pilihan
  // valid — biar pilih-semua / pilihan satuan selamat dari render ulang.
  Array.from(terpilih).forEach(function(id) {
    const masihAda = data.some(function(t) { return t.id === id; });
    if (!masihAda) terpilih.delete(id);
  });
  perbaruiBar();
  listEl.innerHTML = '';
  if (data.length === 0) {
    listEl.innerHTML = kataCari || tabAktif !== 'semua'
      ? '<p>Tidak ada yang cocok dengan filter.</p>'
      : '<p>Belum ada transaksi. Yuk catat yang pertama di form atas.</p>';
    return;
  }
  if (tabAktif === 'semua') {
    // Riwayat gabungan: terbaru dulu (tanggal desc, id desc).
    const urut = data.slice().sort(function(a, b) {
      if (a.tanggal < b.tanggal) return 1;
      if (a.tanggal > b.tanggal) return -1;
      return b.id - a.id;
    });
    renderSeksi('Semua', urut, true);
    return;
  }
  // Tab tunggal: cukup seksi pilihannya saja (bukan keduanya).
  if (tabAktif === 'masuk') {
    renderSeksi('Pemasukan', data.filter(function(t) { return t.jenis === 'masuk'; }), false);
    return;
  }
  renderSeksi('Pengeluaran', data.filter(function(t) { return t.jenis === 'keluar'; }), false);
}

// Satu seksi = h3 + table beneran + subtotal. modeSemua = tambah kolom
// Jenis (badge) + footer selisih (masuk − keluar).
function renderSeksi(judul, rows, modeSemua) {
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
  cekSemua.addEventListener('change', async function() {
    rows.forEach(function(t) {
      if (cekSemua.checked) {
        terpilih.add(t.id);
      } else {
        terpilih.delete(t.id);
      }
    });
    await tampil();
  });
  thCek.appendChild(cekSemua);
  trHead.appendChild(thCek);
  const kolom = modeSemua ? ['No', 'Tanggal', 'Jenis', 'Jumlah', 'Aksi'] : ['No', 'Tanggal', 'Jumlah', 'Aksi'];
  kolom.forEach(function(nama) {
    const th = document.createElement('th');
    th.textContent = nama;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  let subtotal = 0;
  let totalMasuk = 0;
  let totalKeluar = 0;
  rows.forEach(function(t, i) {
    subtotal += t.jumlah;
    if (t.jenis === 'masuk') {
      totalMasuk += t.jumlah;
    } else {
      totalKeluar += t.jumlah;
    }
    tbody.appendChild(bangunBaris(tbody, t, i + 1, modeSemua));
  });
  table.appendChild(tbody);

  const tfoot = document.createElement('tfoot');
  const trFoot = document.createElement('tr');
  const tdLabel = document.createElement('td');
  tdLabel.colSpan = modeSemua ? 4 : 3;
  tdLabel.textContent = modeSemua ? 'Selisih (masuk − keluar)' : 'Subtotal ' + judul.toLowerCase();
  const tdTotal = document.createElement('td');
  tdTotal.textContent = 'Rp' + formatRupiah(modeSemua ? totalMasuk - totalKeluar : subtotal);
  const tdKosong = document.createElement('td');
  trFoot.appendChild(tdLabel);
  trFoot.appendChild(tdTotal);
  trFoot.appendChild(tdKosong);
  tfoot.appendChild(trFoot);
  table.appendChild(tfoot);

  const scroll = document.createElement('div');
  scroll.className = 'tabel-scroll';
  scroll.appendChild(table);
  listEl.appendChild(scroll);
}

// Akordeon: tutup SEMUA panel (edit + catatan) di SELURUH list (semua
// seksi/tbody) — bukan cuma tbody sendiri. Dipanggil tiap handler SEBELUM
// toggle milik sendiri: maksimal 1 panel hidup per saat, lintas seksi.
// querySelectorAll = snapshot (bukan live list), aman dihapus dalam loop.
function tutupSemuaPanel() {
  const semua = listEl.querySelectorAll('.baris-edit, .baris-catatan');
  for (let i = 0; i < semua.length; i++) {
    semua[i].parentNode.removeChild(semua[i]);
  }
}

function bangunBaris(tbody, t, nomor, modeSemua) {  const tr = document.createElement('tr');

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
  // Sel Jenis (modeSemua): dibuat di sini, di-append di blok akhir agar
  // urutan kolom tetap (appendChild memindah node bila dipanggil 2x).
  let tdJenis = null;
  if (modeSemua) {
    tdJenis = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = t.jenis === 'masuk' ? 'badge-masuk' : 'badge-keluar';
    badge.textContent = t.jenis === 'masuk' ? 'Masuk' : 'Keluar';
    tdJenis.appendChild(badge);
  }
  const tdJumlah = document.createElement('td');
  tdJumlah.textContent = 'Rp' + formatRupiah(t.jumlah);
  const tdAksi = document.createElement('td');

    const btnUbah = document.createElement('button');
    pasangIkon(btnUbah, 'ubah', 'Ubah');
    btnUbah.addEventListener('click', function() {
      // Akordeon per baris: maksimal 1 panel hidup. Klik saat milik sendiri
      // terbuka = tutup; klik saat panel lain terbuka = ganti.
      const terbuka = tr.nextSibling;
      const milikku = terbuka && terbuka.className === 'baris-edit';
      tutupSemuaPanel();
      if (milikku) return;
      // Mode edit = baris panel di bawah baris (pola panel catatan):
      // baris asli tetap tampil sebagai referensi, form vertikal ber-label.
      const panelTr = document.createElement('tr');
      panelTr.className = 'baris-edit';
      const panelTd = document.createElement('td');
      panelTd.colSpan = modeSemua ? 6 : 5;
      const panel = document.createElement('div');
      panel.className = 'panel-catatan';

      function fieldEdit(labelText, inputEl) {
        // Label membungkus input (asosiasi implisit): lolos cek aksesibilitas
        // tanpa butuh id unik per baris.
        const wrap = document.createElement('div');
        wrap.className = 'field';
        const lab = document.createElement('label');
        lab.appendChild(document.createTextNode(labelText + ' '));
        if (inputEl.name === 'jumlah-baru') {
          // Prefix Rp visual + format live (pola form utama)
          const box = document.createElement('div');
          box.className = 'input-rp';
          const rp = document.createElement('span');
          rp.textContent = 'Rp';
          box.appendChild(rp);
          box.appendChild(inputEl);
          lab.appendChild(box);
        } else {
          lab.appendChild(inputEl);
        }
        wrap.appendChild(lab);
        panel.appendChild(wrap);
        return inputEl;
      }

      const infoRef = document.createElement('p');
      infoRef.textContent = 'Ubah: ' + t.jenis + ' Rp' + formatRupiah(t.jumlah) + ' (' + t.tanggal + ')';
      panel.appendChild(infoRef);

      const inputTgl = document.createElement('input');
      inputTgl.type = 'date';
      inputTgl.name = 'tanggal-baru';
      inputTgl.value = t.tanggal;
      fieldEdit('Tanggal baru:', inputTgl);

      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.name = 'jumlah-baru';
      input.value = formatRupiah(t.jumlah); // prefill sudah berformat
      pasangFormatRupiahLive(input); // format tiap ketikan berikutnya
      fieldEdit('Jumlah baru:', input);

      // Kategori hanya relevan untuk pengeluaran (pemasukan tetap sederhana)
      let inputKat = null;
      if (t.jenis === 'keluar') {
        inputKat = document.createElement('input');
        inputKat.type = 'text';
        inputKat.name = 'kategori-baru';
        inputKat.placeholder = 'Kategori';
        inputKat.value = kategoriOf(t);
        fieldEdit('Kategori baru:', inputKat);
      }

      const btnSimpan = document.createElement('button');
      pasangIkon(btnSimpan, 'simpan', 'Simpan');
      btnSimpan.addEventListener('click', async function() {
        const baru = parseRupiah(input.value);
        const patch = { jumlah: baru, tanggal: inputTgl.value };
        if (inputKat) patch.kategori = inputKat.value;
        const out = await updateTransaksi(t.id, patch, userId);
        if (!out) {
          pesanError(hasil, 'Gagal: transaksi tidak ditemukan.');
          await tampil();
          return;
        }
        if (out.error) {
          pesanError(hasil, 'Gagal (' + out.code + '): ' + out.error);
          return;
        }
        pesanOk(hasil, 'Transaksi diubah jadi Rp' + formatRupiah(baru) + '.');
        await tampil();
      });

      const btnBatal = document.createElement('button');
      pasangIkon(btnBatal, 'batal', 'Batal');
      btnBatal.classList.add('btn-soft');
      btnBatal.addEventListener('click', function() {
        tbody.removeChild(panelTr);
      });

      panel.appendChild(btnSimpan);
      panel.appendChild(document.createTextNode(' '));
      panel.appendChild(btnBatal);
      panelTd.appendChild(panel);
      panelTr.appendChild(panelTd);
      tbody.insertBefore(panelTr, tr.nextSibling);
    });

    const btnHapus = document.createElement('button');
    pasangIkon(btnHapus, 'hapus', 'Hapus transaksi Rp' + formatRupiah(t.jumlah));
    btnHapus.classList.add('btn-danger');
    btnHapus.addEventListener('click', async function() {
      if (!window.confirm('Hapus transaksi Rp' + formatRupiah(t.jumlah) + '?')) return;
      const outDel = await deleteTransaksi(t.id, userId);
      if (outDel && outDel.error) {
        pesanError(hasil, 'Gagal (' + outDel.code + '): ' + outDel.error);
        return;
      }
      if (!outDel) {
        pesanError(hasil, 'Gagal: transaksi tidak ditemukan.');
        await tampil();
        return;
      }
      pesanOk(hasil, 'Transaksi Rp' + formatRupiah(t.jumlah) + ' dihapus.');
      await tampil();
    });

    const btnCatatan = document.createElement('button');
    pasangIkon(btnCatatan, 'catatan', 'Catatan');
    btnCatatan.addEventListener('click', function() {
      // Akordeon per baris: sama kayak Ubah (lihat atas). Klik saat milik
      // sendiri terbuka = tutup; klik saat panel lain terbuka = ganti.
      const terbuka = tr.nextSibling;
      const milikku = terbuka && terbuka.className === 'baris-catatan';
      tutupSemuaPanel();
      if (milikku) return;
      const panelTr = document.createElement('tr');
      panelTr.className = 'baris-catatan';
      const panelTd = document.createElement('td');
      panelTd.colSpan = modeSemua ? 6 : 5;
      const panel = document.createElement('div');
      panel.className = 'panel-catatan';

      const daftar = cacheCatatan.filter(function(c) { return c.transaksiId === t.id; });
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
          pasangIkon(btnUbahC, 'ubah', 'Ubah catatan');
          btnUbahC.addEventListener('click', function() {
            // Mode edit inline (tanpa prompt): input isi baru + Simpan/Batal
            item.innerHTML = '';
            const inputUbah = document.createElement('input');
            inputUbah.type = 'text';
            inputUbah.name = 'isi-catatan-baru';
            inputUbah.setAttribute('aria-label', 'Isi catatan baru');
            inputUbah.value = c.isi;

            const btnSimpanU = document.createElement('button');
            pasangIkon(btnSimpanU, 'simpan', 'Simpan catatan');
            btnSimpanU.addEventListener('click', async function() {
              const baru = inputUbah.value.trim();
              if (!baru) return; // kosong = abaikan diam-diam
              const out = await updateCatatan(c.id, baru, userId);
              if (!out) {
                pesanError(hasil, 'Gagal: catatan tidak ditemukan.');
                await tampil();
                return;
              }
              if (out.error) {
                pesanError(hasil, 'Gagal (' + out.code + '): ' + out.error);
                return;
              }
              pesanOk(hasil, 'Catatan diubah.');
              await tampil();
            });

            const btnBatalU = document.createElement('button');
            pasangIkon(btnBatalU, 'batal', 'Batal');
            btnBatalU.classList.add('btn-soft');
            btnBatalU.addEventListener('click', async function() {
              await tampil();
            });

            item.appendChild(inputUbah);
            item.appendChild(document.createTextNode(' '));
            item.appendChild(btnSimpanU);
            item.appendChild(document.createTextNode(' '));
            item.appendChild(btnBatalU);
          });

          const btnHapusC = document.createElement('button');
          pasangIkon(btnHapusC, 'hapus', 'Hapus catatan');
          btnHapusC.classList.add('btn-danger');
          btnHapusC.addEventListener('click', async function() {
            if (!window.confirm('Hapus catatan ini?')) return;
            const outDel = await deleteCatatan(c.id, userId);
            if (outDel && outDel.error) {
              pesanError(hasil, 'Gagal (' + outDel.code + '): ' + outDel.error);
              return;
            }
            if (!outDel) {
              pesanError(hasil, 'Gagal: catatan tidak ditemukan.');
              await tampil();
              return;
            }
            pesanOk(hasil, 'Catatan dihapus.');
            await tampil();
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
      pasangIkon(btnSimpanCatatan, 'simpan', 'Simpan catatan');
      btnSimpanCatatan.addEventListener('click', async function() {
        if (!inputCatatan.value.trim()) return; // kosong = abaikan diam-diam
        const res = await addCatatan(t.id, inputCatatan.value, userId);
        if (res.code === 201) {
          pesanOk(hasil, 'Catatan tersimpan.');
          await tampil();
        } else {
          pesanError(hasil, 'Gagal (' + res.code + '): ' + res.error);
        }
      });
      panel.appendChild(btnSimpanCatatan);
      panel.appendChild(document.createTextNode(' '));

      const btnTutup = document.createElement('button');
      pasangIkon(btnTutup, 'batal', 'Tutup');
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
    if (tdJenis) tr.appendChild(tdJenis);
    tr.appendChild(tdJumlah);
    tr.appendChild(tdAksi);
    return tr;
}

form.addEventListener('submit', async function(e) {
  e.preventDefault();
  if (!userId) {
    pesanError(hasil, 'Belum login. Redirect ke halaman login...');
    return;
  }
  const jenis = document.getElementById('jenis').value;
  bersihkanGagal(form);
  const elJumlah = document.getElementById('jumlah');
  const jumlah = parseRupiah(elJumlah.value);
  if (!(jumlah > 0)) {
    tandaiGagal(elJumlah, true);
    pesanError(hasil, 'Gagal (400): Jumlah harus angka > 0 (Rp).');
    return;
  }
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
  const res = await addTransaksi({ userId: userId, jenis: jenis, jumlah: jumlah, produkId: produkId, kategori: kategori, tanggal: tanggal });
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
      const rc = await addCatatan(res.data.id, catatanAwal, userId);
      if (rc.code === 201) {
        pesan += ' Catatan tersimpan.';
      } else {
        pesan += ' (Catatan gagal: ' + rc.error + ')';
      }
    }
    pesanOk(hasil, pesan);
    await tampil();
  } else {
    pesanError(hasil, 'Gagal (' + res.code + '): ' + res.error);
  }
});
