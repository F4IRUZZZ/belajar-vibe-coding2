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
    listEl.innerHTML = '<p>Belum ada hutang/piutang. Yuk catat yang pertama di form atas.</p>';
    return;
  }
  renderSeksiHutang('Hutang', data.filter(function(h) { return h.arah === 'hutang'; }));
  renderSeksiHutang('Piutang', data.filter(function(h) { return h.arah === 'piutang'; }));
}

// Akordeon: tutup SEMUA panel bayar di seluruh list (pola transaksi).
// querySelectorAll = snapshot, aman dihapus dalam loop.
function tutupPanelHutang() {
  const semua = listEl.querySelectorAll('.baris-bayar');
  for (let i = 0; i < semua.length; i++) {
    semua[i].parentNode.removeChild(semua[i]);
  }
}

// Satu seksi = h3 + table (No | Pihak | Jumlah | Sisa | Status | Aksi) + subtotal SISA.
function renderSeksiHutang(judul, rows) {
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
  ['No', 'Pihak', 'Jumlah', 'Sisa', 'Status', 'Aksi'].forEach(function(nama) {
    const th = document.createElement('th');
    th.textContent = nama;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  let subtotalSisa = 0;
  rows.forEach(function(h, i) {
    subtotalSisa += h.jumlah - h.dibayar;
    tbody.appendChild(bangunBarisHutang(tbody, h, i + 1));
  });
  table.appendChild(tbody);

  const tfoot = document.createElement('tfoot');
  const trFoot = document.createElement('tr');
  const tdLabel = document.createElement('td');
  tdLabel.colSpan = 3;
  tdLabel.textContent = 'Sisa ' + judul.toLowerCase();
  const tdTotal = document.createElement('td');
  tdTotal.textContent = 'Rp' + formatRupiah(subtotalSisa);
  const tdKosong = document.createElement('td');
  tdKosong.colSpan = 2;
  trFoot.appendChild(tdLabel);
  trFoot.appendChild(tdTotal);
  trFoot.appendChild(tdKosong);
  tfoot.appendChild(trFoot);
  table.appendChild(tfoot);

  listEl.appendChild(table);
}

function bangunBarisHutang(tbody, h, nomor) {
  const tr = document.createElement('tr');
  const tdNo = document.createElement('td');
  tdNo.textContent = nomor;
  const tdPihak = document.createElement('td');
  let teksPihak = h.pihak + ' (' + h.tanggal + ')' +
    (h.jatuhTempo ? ' tempo ' + h.jatuhTempo : '') +
    (h.keterangan ? ' — ' + h.keterangan : '');
  if (lewatJatuhTempo(h)) teksPihak += ' LEWAT TEMPO!';
  tdPihak.textContent = teksPihak;
  const tdJumlah = document.createElement('td');
  tdJumlah.textContent = 'Rp' + formatRupiah(h.jumlah);
  const tdSisa = document.createElement('td');
  tdSisa.textContent = 'Rp' + formatRupiah(h.jumlah - h.dibayar);
  const tdStatus = document.createElement('td');
  tdStatus.textContent = h.status;
  const tdAksi = document.createElement('td');

  if (h.status === 'belum') {
    const btnBayar = document.createElement('button');
    btnBayar.textContent = 'Bayar';
    btnBayar.addEventListener('click', function() {
      // Panel bayar di bawah baris (pola panel transaksi): baris asli tetap.
      const lama = tr.nextSibling;
      if (lama && lama.className === 'baris-bayar') {
        tbody.removeChild(lama);
        return;
      }
      tutupPanelHutang();
      const panelTr = document.createElement('tr');
      panelTr.className = 'baris-bayar';
      const panelTd = document.createElement('td');
      panelTd.colSpan = 6;
      const infoRef = document.createElement('p');
      infoRef.textContent = 'Bayar: ' + h.pihak +
        ' (sisa Rp' + formatRupiah(h.jumlah - h.dibayar) + ')';
      panelTd.appendChild(infoRef);
      const inputBayar = document.createElement('input');
      inputBayar.type = 'text';
      inputBayar.inputMode = 'numeric';
      inputBayar.name = 'nominal-bayar';
      inputBayar.setAttribute('aria-label', 'Nominal bayar');
      inputBayar.placeholder = 'contoh: 50000';
      panelTd.appendChild(inputBayar);
      panelTd.appendChild(document.createTextNode(' '));

      const btnSimpanB = document.createElement('button');
      btnSimpanB.textContent = 'Simpan';
      btnSimpanB.addEventListener('click', function() {
        const out = bayarHutang(h.id, parseRupiah(inputBayar.value), userId);
        if (!out) {
          pesanError(hasil, 'Gagal: data tidak ditemukan.');
          tampil();
          return;
        }
        if (out.error) {
          pesanError(hasil, 'Gagal (' + out.code + '): ' + out.error);
          return;
        }
        pesanOk(hasil, out.data.status === 'lunas' ? 'Lunas + tercatat di kas.' : 'Bayaran tercatat, sisa Rp' + formatRupiah(out.data.jumlah - out.data.dibayar) + '.');
        tampil();
      });
      panelTd.appendChild(btnSimpanB);
      panelTd.appendChild(document.createTextNode(' '));

      const btnBatalB = document.createElement('button');
      btnBatalB.textContent = 'Batal';
      btnBatalB.classList.add('btn-soft');
      btnBatalB.addEventListener('click', function() {
        tbody.removeChild(panelTr);
      });
      panelTd.appendChild(btnBatalB);
      panelTr.appendChild(panelTd);
      tbody.insertBefore(panelTr, tr.nextSibling);
    });
    tdAksi.appendChild(btnBayar);
    tdAksi.appendChild(document.createTextNode(' '));

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
    tdAksi.appendChild(btnLunas);
    tdAksi.appendChild(document.createTextNode(' '));
  }

  // Hapus HANYA bila belum lunas (yang lunas = jejak audit, tanpa tombol).
  // Guard model tetap sebagai pertahanan lapis dua.
  if (h.status === 'belum') {
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
    tdAksi.appendChild(btnHapus);
  }

    tr.appendChild(tdNo);
    tr.appendChild(tdPihak);
    tr.appendChild(tdJumlah);
    tr.appendChild(tdSisa);
    tr.appendChild(tdStatus);
    tr.appendChild(tdAksi);
    return tr;
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
