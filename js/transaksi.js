const infoUser = document.getElementById('info-user');
const form = document.getElementById('form-transaksi');
const btnTambah = document.getElementById('btn-tambah');
const hasil = document.getElementById('hasil');
const listEl = document.getElementById('list-transaksi');

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
  infoUser.textContent = 'Login sebagai: ' + resProfile.data.email + ' (' + resProfile.data.role + ')';
  document.getElementById('tanggal').value = new Date().toISOString().slice(0, 10);
  tampil();
}

function tampil() {
  const data = transaksi.filter(function(t) { return t.userId === userId; });
  listEl.innerHTML = '';
  if (data.length === 0) {
    listEl.innerHTML = '<li>Belum ada transaksi.</li>';
    return;
  }
  data.forEach(function(t) {
    const li = document.createElement('li');
    li.textContent = '[' + t.id + '] ' + t.jenis + ' Rp' + t.jumlah + ' (' + t.tanggal + ') ';

    const btnUbah = document.createElement('button');
    btnUbah.textContent = 'Ubah';
    btnUbah.addEventListener('click', function() {
      // Mode edit inline (tanpa prompt): input jumlah baru + Simpan/Batal
      li.innerHTML = '';
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.value = t.jumlah;

      const btnSimpan = document.createElement('button');
      btnSimpan.textContent = 'Simpan';
      btnSimpan.addEventListener('click', function() {
        const baru = Number(input.value);
        const out = updateTransaksi(t.id, { jumlah: baru });
        if (!out) {
          hasil.textContent = 'Gagal: transaksi tidak ditemukan.';
          tampil();
          return;
        }
        if (out.error) {
          hasil.textContent = 'Gagal (' + out.code + '): ' + out.error;
          return;
        }
        hasil.textContent = 'Transaksi id ' + t.id + ' diubah jadi Rp' + baru + '.';
        tampil();
      });

      const btnBatal = document.createElement('button');
      btnBatal.textContent = 'Batal';
      btnBatal.addEventListener('click', function() {
        tampil();
      });

      li.appendChild(document.createTextNode('[' + t.id + '] ' + t.jenis + ' '));
      li.appendChild(input);
      li.appendChild(document.createTextNode(' '));
      li.appendChild(btnSimpan);
      li.appendChild(document.createTextNode(' '));
      li.appendChild(btnBatal);
    });

    const btnHapus = document.createElement('button');
    btnHapus.textContent = 'Hapus';
    btnHapus.addEventListener('click', function() {
      if (!window.confirm('Hapus transaksi Rp' + t.jumlah + '?')) return;
      deleteTransaksi(t.id);
      hasil.textContent = 'Transaksi id ' + t.id + ' dihapus.';
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
  if (!userId) {
    hasil.textContent = 'Belum login. Redirect ke halaman login...';
    return;
  }
  const jenis = document.getElementById('jenis').value;
  const jumlah = Number(document.getElementById('jumlah').value);
  const tanggal = document.getElementById('tanggal').value;
  btnTambah.textContent = 'Loading...';
  const res = addTransaksi({ userId: userId, jenis: jenis, jumlah: jumlah, tanggal: tanggal });
  btnTambah.textContent = 'Catat';
  if (res.code === 201) {
    document.getElementById('jumlah').value = '';
    hasil.textContent = res.data.jenis + ' Rp' + res.data.jumlah + ' tercatat!';
    tampil();
  } else {
    hasil.textContent = 'Gagal (' + res.code + '): ' + res.error;
  }
});
