const infoUser = document.getElementById('info-user');
const form = document.getElementById('form-produk');
const btnTambah = document.getElementById('btn-tambah-produk');
const hasil = document.getElementById('hasil');
const listEl = document.getElementById('list-produk');

// Default kategori (wajib di atas sebelum dipakai tampil() — hindari TDZ).
const DEFAULT_KATEGORI = ['pangan', 'mandi', 'lainnya'];

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
  infoUser.textContent = 'Login sebagai: ' + resProfile.data.email + ' (' + resProfile.data.role + ')';
  tampil();
}

function tampil() {
  if (!ddList.hidden) renderOpsiDropdown(); // segarkan saran bila dropdown terbuka
  listEl.innerHTML = '';
  if (produk.length === 0) {
    listEl.innerHTML = '<li>Belum ada produk.</li>';
    return;
  }
  produk.forEach(function(p, i) {
    const nomor = i + 1; // nomor tampil — bukan id
    const li = document.createElement('li');
    li.textContent = nomor + '. ' + p.nama + ' (' + p.kategori + ') ';

    const btnUbah = document.createElement('button');
    btnUbah.textContent = 'Ubah';
    btnUbah.addEventListener('click', function() {
      // Mode edit inline (tanpa prompt): input nama baru + Simpan/Batal
      li.innerHTML = '';
      const input = document.createElement('input');
      input.type = 'text';
      input.value = p.nama;

      const btnSimpan = document.createElement('button');
      btnSimpan.textContent = 'Simpan';
      btnSimpan.addEventListener('click', function() {
        const baru = input.value.trim();
        if (!baru) return; // kosong = abaikan
        const out = updateProduk(p.id, { nama: baru });
        if (!out) {
          hasil.textContent = 'Gagal: produk tidak ditemukan.';
          tampil();
          return;
        }
        if (out.error) {
          hasil.textContent = 'Gagal (' + out.code + '): ' + out.error;
          return;
        }
        hasil.textContent = 'Produk diubah jadi "' + baru + '".';
        tampil();
      });

      const btnBatal = document.createElement('button');
      btnBatal.textContent = 'Batal';
      btnBatal.addEventListener('click', function() {
        tampil();
      });

      li.appendChild(document.createTextNode(nomor + '. '));
      li.appendChild(input);
      li.appendChild(document.createTextNode(' '));
      li.appendChild(btnSimpan);
      li.appendChild(document.createTextNode(' '));
      li.appendChild(btnBatal);
    });

    const btnHapus = document.createElement('button');
    btnHapus.textContent = 'Hapus';
    btnHapus.addEventListener('click', function() {
      if (!window.confirm('Hapus produk "' + p.nama + '"?')) return;
      const outDel = deleteProduk(p.id);
      if (!outDel) {
        hasil.textContent = 'Gagal: produk tidak ditemukan.';
        tampil();
        return;
      }
      hasil.textContent = 'Produk "' + p.nama + '" dihapus.';
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

const ddTombol = document.getElementById('dropdown-tombol');
const ddList = document.getElementById('dropdown-list');
const ddCari = document.getElementById('dropdown-cari');
const ddOpsi = document.getElementById('dropdown-opsi');
const ddHidden = document.getElementById('kategori-produk');

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
  ddTombol.textContent = nama + ' ▾';
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
    ddTombol.textContent = 'Pilih kategori ▾'; // reset pilihan
    hasil.textContent = 'Produk "' + res.data.nama + '" ditambah!';
    tampil();
  } else {
    hasil.textContent = 'Gagal (' + res.code + '): ' + res.error;
  }
});
