const infoUser = document.getElementById('info-user');
const totalMasuk = document.getElementById('total-masuk');
const totalKeluar = document.getElementById('total-keluar');
const saldoEl = document.getElementById('saldo');
const boxKategori = document.getElementById('ringkasan-kategori');

// Guard: harus login — baca token, 401 = redirect ke login.
// (Logout hanya ada di profile.html — dashboard fokus angka.)
const token = window.localStorage.getItem('token');
const resProfile = getProfile(token);

if (resProfile.code !== 200) {
  infoUser.textContent = 'Belum login, redirect ke halaman login...';
  setTimeout(function() {
    window.location.href = 'login.html';
  }, 800);
} else {
  const user = resProfile.data;
  infoUser.textContent = 'Login sebagai: ' + (user.username || user.email) + ' (' + user.role + ')';
  const pilihPeriode = document.getElementById('periode');

  function muatRingkasan() {
    let filter = null;
    if (pilihPeriode.value === 'minggu') {
      filter = { dari: awalMingguIni(), sampai: akhirMingguIni() };
    } else if (pilihPeriode.value === 'bulan') {
      filter = { dari: awalBulanIni(), sampai: akhirBulanIni() };
    }
    const ringkasan = getSaldo(user.id, filter);
    totalMasuk.textContent = 'Rp' + formatRupiah(ringkasan.masuk);
    totalKeluar.textContent = 'Rp' + formatRupiah(ringkasan.keluar);
    saldoEl.textContent = 'Rp' + formatRupiah(ringkasan.saldo);
    saldoEl.classList.remove('saldo-minus');
    if (ringkasan.saldo < 0) saldoEl.classList.add('saldo-minus'); // kas minus = merah
    muatKategori(filter);
  }

  function muatKategori(filter) {
    const data = getRingkasanKategori(user.id, filter);
    boxKategori.innerHTML = '';
    if (data.length === 0) {
      boxKategori.textContent = 'Belum ada pengeluaran pada periode ini.';
      return;
    }
    const table = document.createElement('table');
    table.className = 'tabel-kategori';
    data.forEach(function(r) {
      const tr = document.createElement('tr');
      const tdKat = document.createElement('td');
      tdKat.textContent = r.kategori;
      const tdBar = document.createElement('td');
      const bar = document.createElement('div');
      bar.className = 'bar-mini';
      const isi = document.createElement('div');
      isi.className = 'bar-mini-isi';
      isi.style.width = r.persen + '%';
      bar.appendChild(isi);
      tdBar.appendChild(bar);
      const tdTotal = document.createElement('td');
      tdTotal.textContent = 'Rp' + formatRupiah(r.total) + ' (' + r.persen + '%)';
      tr.appendChild(tdKat);
      tr.appendChild(tdBar);
      tr.appendChild(tdTotal);
      table.appendChild(tr);
    });
    boxKategori.appendChild(table);
  }

  pilihPeriode.addEventListener('change', muatRingkasan);
  muatRingkasan();
}
