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
const resProfile = getProfile(token);

if (resProfile.code !== 200) {
  infoUser.textContent = 'Belum login, redirect ke halaman login...';
  setTimeout(function() {
    window.location.href = 'login.html';
  }, 800);
} else {
  infoUser.textContent = 'Login sebagai: ' + (resProfile.data.username || resProfile.data.email) + ' (' + resProfile.data.role + ')';
  tampil();
}

function tampil() {
  if (!ddList.hidden) renderOpsiDropdown(); // segarkan saran bila dropdown terbuka
  listEl.innerHTML = '';
  if (produk.length === 0) {
    listEl.innerHTML = '<li>Belum ada produk. Yuk tambah kebutuhan pertama di form atas.</li>';
    return;
  }
  produk.forEach(function(p, i) {
    const nomor = i + 1; // nomor tampil — bukan id
    const li = document.createElement('li');
    li.textContent = nomor + '. ' + p.nama + ' (' + p.kategori + ') ';

    const btnUbah = document.createElement('button');
    pasangIkon(btnUbah, 'ubah', 'Ubah produk');
    btnUbah.addEventListener('click', function() {
      // Akordeon antar-baris: bila baris ini sedang diedit -> tutup;
      // bila tidak -> render ulang bersih (tutup semua) baru buka yang ini.
      // Maksimal 1 form edit hidup per saat. (tampil() membuat li BARU,
      // jadi baris dipegang ulang via children[i], bukan li lama.)
      if (li.classList.contains('sedang-edit')) {
        tampil();
        return;
      }
      tampil();
      const liBaru = listEl.children[i];
      // Mode edit inline (tanpa prompt): input nama baru + Simpan/Batal
      liBaru.innerHTML = '';
      liBaru.classList.add('sedang-edit');
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'nama-produk-baru';
      input.setAttribute('aria-label', 'Nama produk baru');
      input.value = p.nama;

      const btnSimpan = document.createElement('button');
      pasangIkon(btnSimpan, 'simpan', 'Simpan produk');
      btnSimpan.addEventListener('click', function() {
        const baru = input.value.trim();
        if (!baru) return; // kosong = abaikan
        const out = updateProduk(p.id, { nama: baru });
        if (!out) {
          pesanError(hasil, 'Gagal: produk tidak ditemukan.');
          tampil();
          return;
        }
        if (out.error) {
          pesanError(hasil, 'Gagal (' + out.code + '): ' + out.error);
          return;
        }
        pesanOk(hasil, 'Produk diubah jadi "' + baru + '".');
        tampil();
      });

      const btnBatal = document.createElement('button');
      pasangIkon(btnBatal, 'batal', 'Batal');
      btnBatal.classList.add('btn-soft');
      btnBatal.addEventListener('click', function() {
        tampil();
      });

      liBaru.appendChild(document.createTextNode(nomor + '. '));
      liBaru.appendChild(input);
      liBaru.appendChild(document.createTextNode(' '));
      liBaru.appendChild(btnSimpan);
      liBaru.appendChild(document.createTextNode(' '));
      liBaru.appendChild(btnBatal);
    });

    const btnHapus = document.createElement('button');
    pasangIkon(btnHapus, 'hapus', 'Hapus produk ' + p.nama);
    btnHapus.classList.add('btn-danger');
    btnHapus.addEventListener('click', function() {
      if (!window.confirm('Hapus produk "' + p.nama + '"?')) return;
      const outDel = deleteProduk(p.id);
      if (!outDel) {
        pesanError(hasil, 'Gagal: produk tidak ditemukan.');
        tampil();
        return;
      }
      pesanOk(hasil, 'Produk "' + p.nama + '" dihapus.');
      tampil();
    });

    li.appendChild(btnUbah);
    li.appendChild(document.createTextNode(' '));
    li.appendChild(btnHapus);
    listEl.appendChild(li);
  });
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
  produk.forEach(function(p) { tambah(p.kategori); });
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

form.addEventListener('submit', function(e) {
  e.preventDefault();
  const nama = document.getElementById('nama-produk').value;
  const kategori = ddHidden.value; // dari dropdown custom (kosong = 'lainnya' via normalisasi)
  btnTambah.textContent = 'Loading...';
  const res = addProduk(nama, kategori);
  btnTambah.textContent = 'Tambah';
  if (res.code === 201) {
    document.getElementById('nama-produk').value = '';
    kategoriTerpilih = '';
    ddHidden.value = '';
    document.getElementById('dropdown-label').textContent = 'Pilih kategori'; // reset pilihan
    pesanOk(hasil, 'Produk "' + res.data.nama + '" ditambah!');
    tampil();
  } else {
    pesanError(hasil, 'Gagal (' + res.code + '): ' + res.error);
  }
});
