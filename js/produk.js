const infoUser = document.getElementById('info-user');
const form = document.getElementById('form-produk');
const btnTambah = document.getElementById('btn-tambah-produk');
const hasil = document.getElementById('hasil');
const listEl = document.getElementById('list-produk');

// Semua const getElementById WAJIB di blok atas sebelum guard memanggil
// tampil() — pelajaran dari 2x bug TDZ (DEFAULT_KATEGORI, ddList).
const ddTombol = document.getElementById('dropdown-tombol');
const ddList = document.getElementById('dropdown-list');
const ddCari = document.getElementById('dropdown-cari');
const ddOpsi = document.getElementById('dropdown-opsi');
const ddHidden = document.getElementById('kategori-produk');

// Default kategori (wajib di atas sebelum dipakai tampil() — hindari TDZ).
const DEFAULT_KATEGORI = ['Pangan', 'Mandi', 'Lainnya'];

pasangToggleTema(); // dark mode ikut sistem, manual menang via localStorage
pasangIkonMenu(); // ikon SVG di sidebar menu

// Guard: harus login — baca token, 401 = redirect ke login.
// Tahap 1: list produk shared (tanpa cek pemilik), login wajib.
const token = window.localStorage.getItem('token');

async function init() {
  const resProfile = await getProfile(token);
  if (resProfile.code !== 200) {
    infoUser.textContent = 'Belum login, redirect ke halaman login...';
    setTimeout(function() {
      window.location.href = 'login.html';
    }, 800);
    return;
  }
  infoUser.textContent = 'Login sebagai: ' + (resProfile.data.username || resProfile.data.email) + ' (' + resProfile.data.role + ')';
  await tampil();
}
init();

async function tampil() {
  await segarkanCacheProduk(); // via API (Fase A-3)
  if (!ddList.hidden) renderOpsiDropdown(); // segarkan saran bila dropdown terbuka
  listEl.innerHTML = '';
  if (cacheProduk.length === 0) {
    listEl.innerHTML = '<p>Belum ada produk. Yuk tambah kebutuhan pertama di form atas.</p>';
    return;
  }
  // Daftar = tabel beneran (No | Nama | Kategori | Aksi), reuse gaya transaksi.
  const table = document.createElement('table');
  table.className = 'tabel-transaksi';
  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  ['No', 'Nama', 'Kategori', 'Aksi'].forEach(function(namaKol) {
    const th = document.createElement('th');
    th.textContent = namaKol;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  cacheProduk.forEach(function(p, i) {
    tbody.appendChild(bangunBarisProduk(p, i + 1)); // nomor tampil — bukan id
  });
  table.appendChild(tbody);
  const scroll = document.createElement('div');
  scroll.className = 'tabel-scroll';
  scroll.appendChild(table);
  listEl.appendChild(scroll);
}

// Satu baris produk + panel edit di bawah baris (maks 1 terbuka).
function bangunBarisProduk(p, nomor) {
  const tr = document.createElement('tr');
  const tdNo = document.createElement('td');
  tdNo.textContent = nomor;
  const tdNama = document.createElement('td');
  tdNama.textContent = p.nama;
  const tdKat = document.createElement('td');
  tdKat.textContent = p.kategori;
  const tdAksi = document.createElement('td');

    const btnUbah = document.createElement('button');
    pasangIkon(btnUbah, 'ubah', 'Ubah produk');
    btnUbah.addEventListener('click', function() {
      // Akordeon antar-baris: klik saat panel sendiri terbuka = tutup;
      // klik saat panel lain terbuka = ganti. Maksimal 1 per saat.
      const terbuka = tr.nextSibling;
      const milikku = terbuka && terbuka.className === 'baris-edit';
      tutupPanelProduk();
      if (milikku) return;
      // Mode edit = baris panel di bawah baris (pola transaksi).
      const panelTr = document.createElement('tr');
      panelTr.className = 'baris-edit';
      const panelTd = document.createElement('td');
      panelTd.colSpan = 4;
      const panel = document.createElement('div');
      panel.className = 'panel-catatan';
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'nama-produk-baru';
      input.setAttribute('aria-label', 'Nama produk baru');
      input.value = p.nama;
      wrap.appendChild(input);
      panel.appendChild(wrap);

      const btnSimpan = document.createElement('button');
      pasangIkon(btnSimpan, 'simpan', 'Simpan produk');
      btnSimpan.addEventListener('click', async function() {
        const baru = input.value.trim();
        if (!baru) return; // kosong = abaikan
        const out = await updateProduk(p.id, { nama: baru });
        if (!out) {
          pesanError(hasil, 'Gagal: produk tidak ditemukan.');
          await tampil();
          return;
        }
        if (out.error) {
          pesanError(hasil, 'Gagal (' + out.code + '): ' + out.error);
          return;
        }
        pesanOk(hasil, 'Produk diubah jadi "' + baru + '".');
        await tampil();
      });

      const btnBatal = document.createElement('button');
      pasangIkon(btnBatal, 'batal', 'Batal');
      btnBatal.classList.add('btn-soft');
      btnBatal.addEventListener('click', function() {
        tutupPanelProduk();
      });

      panel.appendChild(btnSimpan);
      panel.appendChild(document.createTextNode(' '));
      panel.appendChild(btnBatal);
      panelTd.appendChild(panel);
      panelTr.appendChild(panelTd);
      tr.parentNode.insertBefore(panelTr, tr.nextSibling);
    });

    const btnHapus = document.createElement('button');
    pasangIkon(btnHapus, 'hapus', 'Hapus produk ' + p.nama);
    btnHapus.classList.add('btn-danger');
    btnHapus.addEventListener('click', async function() {
      if (!window.confirm('Hapus produk "' + p.nama + '"?')) return;
      const outDel = await deleteProduk(p.id);
      if (!outDel) {
        pesanError(hasil, 'Gagal: produk tidak ditemukan.');
        await tampil();
        return;
      }
      pesanOk(hasil, 'Produk "' + p.nama + '" dihapus.');
      await tampil();
    });

    tdAksi.appendChild(btnUbah);
    tdAksi.appendChild(document.createTextNode(' '));
    tdAksi.appendChild(btnHapus);
    tr.appendChild(tdNo);
    tr.appendChild(tdNama);
    tr.appendChild(tdKat);
    tr.appendChild(tdAksi);
    return tr;
}

// Tutup panel edit produk yang terbuka (maks 1 per saat).
function tutupPanelProduk() {
  const terbuka = listEl.querySelectorAll('.baris-edit');
  for (let i = 0; i < terbuka.length; i++) {
    terbuka[i].parentNode.removeChild(terbuka[i]);
  }
}

// Dropdown kategori custom milik webapp (pengganti datalist bawaan browser
// yang tak bisa di-styling). Opsi = default + existing (distinct, banding
// lowercase). Ketik yang tak cocok -> baris "+ Tambah" (nama baru lewat
// normalisasiKategori di addProduk). Nilai terpilih disimpan di hidden input.
let kategoriTerpilih = '';

function daftarKategoriUnik() {
  const sudah = [];
  const hasil = [];
  function tambah(nama) {
    const kunci = String(nama).toLowerCase();
    if (sudah.indexOf(kunci) !== -1) return;
    sudah.push(kunci);
    hasil.push(nama);
  }
  DEFAULT_KATEGORI.forEach(tambah);
  cacheProduk.forEach(function(p) { tambah(p.kategori); });
  return hasil;
}

function renderOpsiDropdown() {
  const filter = ddCari.value.trim().toLowerCase();
  ddOpsi.innerHTML = '';
  const semua = daftarKategoriUnik();
  const cocok = semua.filter(function(nama) {
    return nama.toLowerCase().indexOf(filter) !== -1;
  });
  cocok.forEach(function(nama) {
    const baris = document.createElement('div');
    baris.className = 'dropdown-item';
    baris.textContent = nama;
    baris.addEventListener('click', function() {
      pilihKategori(nama);
    });
    ddOpsi.appendChild(baris);
  });
  const ketik = ddCari.value.trim();
  const sudahAda = semua.some(function(nama) { return nama.toLowerCase() === ketik.toLowerCase(); });
  if (ketik && !sudahAda) {
    const tambah = document.createElement('div');
    tambah.className = 'dropdown-item dropdown-tambah';
    tambah.textContent = '+ Tambah "' + ketik + '"';
    tambah.addEventListener('click', function() {
      pilihKategori(ketik);
    });
    ddOpsi.appendChild(tambah);
  }
  if (cocok.length === 0 && !ketik) {
    const kosong = document.createElement('div');
    kosong.className = 'dropdown-item dropdown-kosong';
    kosong.textContent = 'Belum ada kategori. Ketik untuk buat baru.';
    ddOpsi.appendChild(kosong);
  }
}

function pilihKategori(nama) {
  kategoriTerpilih = nama;
  ddHidden.value = nama;
  document.getElementById('dropdown-label').textContent = nama || 'Pilih kategori';
  ddList.hidden = true;
}

function bukaDropdown() {
  ddList.hidden = false;
  ddCari.value = '';
  renderOpsiDropdown();
}

if (ddTombol) {
  ddTombol.addEventListener('click', function(e) {
    e.stopPropagation();
    if (ddList.hidden) {
      bukaDropdown();
    } else {
      ddList.hidden = true;
    }
  });
  ddCari.addEventListener('input', renderOpsiDropdown);
  ddCari.addEventListener('click', function(e) { e.stopPropagation(); });
  document.addEventListener('click', function() {
    ddList.hidden = true;
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') ddList.hidden = true;
  });
}

form.addEventListener('submit', async function(e) {
  e.preventDefault();
  const nama = document.getElementById('nama-produk').value;
  const kategori = ddHidden.value; // dari dropdown custom (kosong = 'lainnya' via normalisasi)
  btnTambah.textContent = 'Loading...';
  const res = await addProduk(nama, kategori);
  btnTambah.textContent = 'Tambah';
  if (res.code === 201) {
    document.getElementById('nama-produk').value = '';
    kategoriTerpilih = '';
    ddHidden.value = '';
    document.getElementById('dropdown-label').textContent = 'Pilih kategori'; // reset pilihan
    pesanOk(hasil, 'Produk "' + res.data.nama + '" ditambah!');
    await tampil();
  } else {
    pesanError(hasil, 'Gagal (' + res.code + '): ' + res.error);
  }
});
