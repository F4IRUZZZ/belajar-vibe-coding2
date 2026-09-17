const infoUser = document.getElementById('info-user');
const form = document.getElementById('form-produk');
const btnTambah = document.getElementById('btn-tambah-produk');
const hasil = document.getElementById('hasil');
const listEl = document.getElementById('list-produk');

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

form.addEventListener('submit', function(e) {
  e.preventDefault();
  const nama = document.getElementById('nama-produk').value;
  const kategori = document.getElementById('kategori-produk').value;
  btnTambah.textContent = 'Loading...';
  const res = addProduk(nama, kategori);
  btnTambah.textContent = 'Tambah';
  if (res.code === 201) {
    document.getElementById('nama-produk').value = '';
    hasil.textContent = 'Produk "' + res.data.nama + '" ditambah!';
    tampil();
  } else {
    hasil.textContent = 'Gagal (' + res.code + '): ' + res.error;
  }
});
