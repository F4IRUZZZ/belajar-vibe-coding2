const infoUser = document.getElementById('info-user');
const form = document.getElementById('form-transaksi');
const btnTambah = document.getElementById('btn-tambah');
const hasil = document.getElementById('hasil');
const listEl = document.getElementById('list-transaksi');

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
  tampil();
}

function tampil() {
  const data = transaksi.filter(function(t) { return t.userId === userId; });
  listEl.innerHTML = '';
  if (data.length === 0) {
    listEl.innerHTML = '<li>Belum ada transaksi.</li>';
    return;
  }
  data.forEach(function(t, i) {
    const nomor = i + 1; // nomor tampil (1,2,3...) — bukan id, rapat otomatis
    const li = document.createElement('li');
    li.textContent = nomor + '. ' + t.jenis + ' Rp' + formatRupiah(t.jumlah) + ' (' + t.tanggal + ') ';

    const btnUbah = document.createElement('button');
    btnUbah.textContent = 'Ubah';
    btnUbah.addEventListener('click', function() {
      // Mode edit inline (tanpa prompt): input jumlah baru + Simpan/Batal
      li.innerHTML = '';
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.setAttribute('aria-label', 'Jumlah baru');
      input.value = formatRupiah(t.jumlah); // tampilkan format 20.000 (parse saat Simpan)

      const btnSimpan = document.createElement('button');
      btnSimpan.textContent = 'Simpan';
      btnSimpan.addEventListener('click', function() {
        const baru = parseRupiah(input.value);
        const out = updateTransaksi(t.id, { jumlah: baru }, userId);
        if (!out) {
          hasil.textContent = 'Gagal: transaksi tidak ditemukan.';
          tampil();
          return;
        }
        if (out.error) {
          hasil.textContent = 'Gagal (' + out.code + '): ' + out.error;
          return;
        }
        hasil.textContent = 'Transaksi diubah jadi Rp' + formatRupiah(baru) + '.';
        tampil();
      });

      const btnBatal = document.createElement('button');
      btnBatal.textContent = 'Batal';
      btnBatal.addEventListener('click', function() {
        tampil();
      });

      li.appendChild(document.createTextNode(nomor + '. ' + t.jenis + ' '));
      li.appendChild(input);
      li.appendChild(document.createTextNode(' '));
      li.appendChild(btnSimpan);
      li.appendChild(document.createTextNode(' '));
      li.appendChild(btnBatal);
    });

    const btnHapus = document.createElement('button');
    btnHapus.textContent = 'Hapus';
    btnHapus.addEventListener('click', function() {
      if (!window.confirm('Hapus transaksi Rp' + formatRupiah(t.jumlah) + '?')) return;
      const outDel = deleteTransaksi(t.id, userId);
      if (outDel && outDel.error) {
        hasil.textContent = 'Gagal (' + outDel.code + '): ' + outDel.error;
        return;
      }
      if (!outDel) {
        hasil.textContent = 'Gagal: transaksi tidak ditemukan.';
        tampil();
        return;
      }
      hasil.textContent = 'Transaksi Rp' + formatRupiah(t.jumlah) + ' dihapus.';
      tampil();
    });

    const btnCatatan = document.createElement('button');
    btnCatatan.textContent = 'Catatan';
    btnCatatan.addEventListener('click', function() {
      // Kembangkan/tutup panel catatan di bawah baris ini
      const lama = li.querySelector('.panel-catatan');
      if (lama) {
        li.removeChild(lama);
        return;
      }
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
            inputUbah.setAttribute('aria-label', 'Isi catatan baru');
            inputUbah.value = c.isi;

            const btnSimpanU = document.createElement('button');
            btnSimpanU.textContent = 'Simpan';
            btnSimpanU.addEventListener('click', function() {
              const baru = inputUbah.value.trim();
              if (!baru) return; // kosong = abaikan diam-diam
              const out = updateCatatan(c.id, baru, userId);
              if (!out) {
                hasil.textContent = 'Gagal: catatan tidak ditemukan.';
                tampil();
                return;
              }
              if (out.error) {
                hasil.textContent = 'Gagal (' + out.code + '): ' + out.error;
                return;
              }
              hasil.textContent = 'Catatan diubah.';
              tampil();
            });

            const btnBatalU = document.createElement('button');
            btnBatalU.textContent = 'Batal';
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
          btnHapusC.addEventListener('click', function() {
            if (!window.confirm('Hapus catatan ini?')) return;
            const outDel = deleteCatatan(c.id, userId);
            if (outDel && outDel.error) {
              hasil.textContent = 'Gagal (' + outDel.code + '): ' + outDel.error;
              return;
            }
            if (!outDel) {
              hasil.textContent = 'Gagal: catatan tidak ditemukan.';
              tampil();
              return;
            }
            hasil.textContent = 'Catatan dihapus.';
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
          hasil.textContent = 'Catatan tersimpan.';
          tampil();
        } else {
          hasil.textContent = 'Gagal (' + res.code + '): ' + res.error;
        }
      });
      panel.appendChild(btnSimpanCatatan);
      panel.appendChild(document.createTextNode(' '));

      const btnTutup = document.createElement('button');
      btnTutup.textContent = 'Tutup';
      btnTutup.addEventListener('click', function() {
        li.removeChild(panel);
      });
      panel.appendChild(btnTutup);

      li.appendChild(panel);
    });

    li.appendChild(btnUbah);
    li.appendChild(document.createTextNode(' '));
    li.appendChild(btnHapus);
    li.appendChild(document.createTextNode(' '));
    li.appendChild(btnCatatan);
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
  const jumlah = parseRupiah(document.getElementById('jumlah').value);
  const tanggal = document.getElementById('tanggal').value;
  const catatanAwal = document.getElementById('catatan-awal').value;
  btnTambah.textContent = 'Loading...';
  const res = addTransaksi({ userId: userId, jenis: jenis, jumlah: jumlah, tanggal: tanggal });
  btnTambah.textContent = 'Catat';
  if (res.code === 201) {
    document.getElementById('jumlah').value = '';
    document.getElementById('catatan-awal').value = '';
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
    hasil.textContent = pesan;
    tampil();
  } else {
    hasil.textContent = 'Gagal (' + res.code + '): ' + res.error;
  }
});
