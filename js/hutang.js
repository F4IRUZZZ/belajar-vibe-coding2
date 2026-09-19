const infoUser = document.getElementById('info-user');
const form = document.getElementById('form-hutang');
const btnTambah = document.getElementById('btn-tambah-hutang');
const hasil = document.getElementById('hasil');
const listEl = document.getElementById('list-hutang');

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
  document.getElementById('tanggal-hutang').value = tanggalHariIni(); // lokal, bukan UTC
  tampil();
}

function lewatJatuhTempo(h) {
  return h.status === 'belum' && h.jatuhTempo && h.jatuhTempo < tanggalHariIni();
}

function tampil() {
  const data = hutang.filter(function(h) { return h.userId === userId; });
  listEl.innerHTML = '';
  if (data.length === 0) {
    listEl.innerHTML = '<li>Belum ada hutang/piutang. Yuk catat yang pertama di form atas.</li>';
    return;
  }
  data.forEach(function(h, i) {
    const nomor = i + 1; // nomor tampil — bukan id
    const li = document.createElement('li');
    let teks = nomor + '. ' + h.arah + ' ' + h.pihak + ' Rp' + formatRupiah(h.jumlah) +
      ' (' + h.tanggal + ')' + (h.jatuhTempo ? ' tempo ' + h.jatuhTempo : '') +
      (h.keterangan ? ' — ' + h.keterangan : '') + ' [' + h.status + ']';
    if (lewatJatuhTempo(h)) teks += ' LEWAT TEMPO!';
    li.textContent = teks + ' ';

    if (h.status === 'belum') {
      const btnLunas = document.createElement('button');
      btnLunas.textContent = 'Lunaskan';
      btnLunas.addEventListener('click', function() {
        if (!window.confirm('Lunaskan + catat ke kas?')) return;
        const out = lunaskanHutang(h.id, userId);
        if (!out) {
          pesanError(hasil, 'Gagal: data tidak ditemukan.');
          tampil();
          return;
        }
        if (out.error) {
          pesanError(hasil, 'Gagal (' + out.code + '): ' + out.error);
          return;
        }
        pesanOk(hasil, 'Lunas + tercatat di kas.');
        tampil();
      });
      li.appendChild(btnLunas);
      li.appendChild(document.createTextNode(' '));
    }

    const btnHapus = document.createElement('button');
    btnHapus.textContent = 'Hapus';
    btnHapus.classList.add('btn-danger');
    btnHapus.addEventListener('click', function() {
      if (!window.confirm('Hapus catatan ini?')) return;
      const outDel = deleteHutang(h.id, userId);
      if (outDel && outDel.error) {
        pesanError(hasil, 'Gagal (' + outDel.code + '): ' + outDel.error);
        return;
      }
      if (!outDel) {
        pesanError(hasil, 'Gagal: data tidak ditemukan.');
        tampil();
        return;
      }
      pesanOk(hasil, 'Catatan dihapus.');
      tampil();
    });
    li.appendChild(btnHapus);
    listEl.appendChild(li);
  });
}

form.addEventListener('submit', function(e) {
  e.preventDefault();
  if (!userId) {
    pesanError(hasil, 'Belum login. Redirect ke halaman login...');
    return;
  }
  const res = addHutang({
    userId: userId,
    arah: document.getElementById('arah').value,
    pihak: document.getElementById('pihak').value,
    jumlah: parseRupiah(document.getElementById('jumlah-hutang').value),
    tanggal: document.getElementById('tanggal-hutang').value,
    jatuhTempo: document.getElementById('jatuh-tempo').value,
    keterangan: document.getElementById('keterangan').value
  });
  if (res.code === 201) {
    document.getElementById('pihak').value = '';
    document.getElementById('jumlah-hutang').value = '';
    document.getElementById('jatuh-tempo').value = '';
    document.getElementById('keterangan').value = '';
    pesanOk(hasil, res.data.arah + ' ' + res.data.pihak + ' Rp' + formatRupiah(res.data.jumlah) + ' tercatat!');
    tampil();
  } else {
    pesanError(hasil, 'Gagal (' + res.code + '): ' + res.error);
  }
});
