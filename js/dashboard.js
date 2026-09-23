const infoUser = document.getElementById('info-user');
const totalMasuk = document.getElementById('total-masuk');
const totalKeluar = document.getElementById('total-keluar');
const saldoEl = document.getElementById('saldo');
const boxKategori = document.getElementById('ringkasan-kategori');

pasangToggleTema(); // dark mode ikut sistem, manual menang via localStorage
pasangIkonMenu(); // ikon SVG di sidebar menu

// Guard: harus login — baca token, 401 = redirect ke login.
// (Logout hanya ada di profile.html — dashboard fokus angka.)
const token = window.localStorage.getItem('token');
let user = null;

async function init() {
  const resProfile = await getProfile(token);
  if (resProfile.code === 503) {
    infoUser.textContent = 'Server tidak terjangkau. Jalankan server: cd server, lalu bun run index.ts (MySQL wajib hidup).';
    return;
  }
  if (resProfile.code !== 200) {
    infoUser.textContent = 'Belum login, redirect ke halaman login...';
    setTimeout(function() {
      window.location.href = 'login';
    }, 800);
    return;
  }
  user = resProfile.data;
  infoUser.textContent = 'Login sebagai: ' + (user.username || user.email) + ' (' + user.role + ')';
  const pilihPeriode = document.getElementById('periode');

  // Token anti-balapan: ganti filter cepat 2x -> respons lambat yang datang
  // belakangan dibuang (chart tak kembali ke data basi).
  let nomorRequest = 0;

  async function muatRingkasan() {
    const requestKu = ++nomorRequest;
    let filter = null;
    if (pilihPeriode.value === 'minggu') {
      filter = { dari: awalMingguIni(), sampai: akhirMingguIni() };
    } else if (pilihPeriode.value === 'bulan') {
      filter = { dari: awalBulanIni(), sampai: akhirBulanIni() };
    }
    // Paralel: 3 request jalan bareng (±1x RTT, bukan 3x).
    const [ringkasan, dataKat, daftar] = await Promise.all([
      getSaldo(user.id, filter),
      getRingkasanKategori(user.id, filter),
      getTransaksi()
    ]);
    if (requestKu !== nomorRequest) return; // basi: user sudah ganti filter
    totalMasuk.textContent = 'Rp' + formatRupiah(ringkasan.masuk);
    totalKeluar.textContent = 'Rp' + formatRupiah(ringkasan.keluar);
    saldoEl.textContent = 'Rp' + formatRupiah(ringkasan.saldo);
    saldoEl.classList.remove('saldo-minus');
    if (ringkasan.saldo < 0) saldoEl.classList.add('saldo-minus'); // kas minus = merah
    muatKategori(dataKat);
    await gambarGrafik(ringkasan, filter, dataKat, daftar);
  }

  let grafikArus = null;
  let grafikKategori = null;
  let grafikMinggu = null;

  const NAMA_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  // '2026-09-22' -> indeks Senin=0..Minggu=6 (Date lokal, bukan UTC).
  function indeksHari(tanggal) {
    const p = String(tanggal).split('-');
    const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return (d.getDay() + 6) % 7;
  }

  // Warna grid/label grafik ikut tema (manual menang, default ikut OS).
  function warnaGrafik() {
    const gelap = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.getAttribute('data-theme') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    return { grid: gelap ? '#1e3a2f' : '#d7e5dd', ticks: gelap ? '#93a89e' : '#6b7280' };
  }

  function labelRp(ctx) {
    return ' Rp' + formatRupiah(ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed);
  }

  // Grafik Chart.js (CDN): batang masuk-vs-keluar + donat kategori.
  // CDN gagal (offline) = grafik dilewati, angka + tabel tetap jalan.
  // Total nol = grafik disembunyikan + pesan ajakan (bukan kanvas kosong).
  async function gambarGrafik(ringkasan, filter, dataKat, daftar) {
    const infoGrafik = document.getElementById('info-grafik');
    const blokGrafik = document.getElementById('blok-grafik');
    if (typeof window.Chart === 'undefined') {
      if (infoGrafik) infoGrafik.textContent = 'Grafik butuh internet (CDN Chart.js). Angka di atas tetap akurat.';
      return;
    }
    if (ringkasan.masuk === 0 && ringkasan.keluar === 0) {
      if (grafikArus) { grafikArus.destroy(); grafikArus = null; }
      if (grafikKategori) { grafikKategori.destroy(); grafikKategori = null; }
      if (grafikMinggu) { grafikMinggu.destroy(); grafikMinggu = null; }
      if (blokGrafik) blokGrafik.hidden = true;
      if (infoGrafik) infoGrafik.textContent = 'Silakan input data terlebih dahulu untuk menampilkan grafik.';
      return;
    }
    if (blokGrafik) blokGrafik.hidden = false;
    if (infoGrafik) infoGrafik.textContent = '';
    const w = warnaGrafik();
    if (grafikArus) grafikArus.destroy();
    if (grafikKategori) grafikKategori.destroy();
    if (grafikMinggu) grafikMinggu.destroy();
    grafikArus = new window.Chart(document.getElementById('grafik-arus'), {
      type: 'bar',
      data: {
        labels: ['Masuk', 'Keluar'],
        datasets: [{
          data: [ringkasan.masuk, ringkasan.keluar],
          backgroundColor: ['#059669', '#dc2626'],
          borderRadius: 8
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: labelRp } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: w.grid }, ticks: { color: w.ticks } },
          x: { grid: { display: false }, ticks: { color: w.ticks } }
        }
      }
    });
    // Grafik mingguan: agregat per nama hari (Senin..Minggu) dalam filter
    // periode aktif. Selalu digambar (kosong = batang nol, bukan error).
    const dari = filter && filter.dari ? filter.dari : null;
    const sampai = filter && filter.sampai ? filter.sampai : null;
    const masukHari = [0, 0, 0, 0, 0, 0, 0];
    const keluarHari = [0, 0, 0, 0, 0, 0, 0];
    daftar.forEach(function(t) { // dari Promise.all di muatRingkasan
      if (dari && t.tanggal < dari) return;
      if (sampai && t.tanggal > sampai) return;
      const i = indeksHari(t.tanggal);
      if (t.jenis === 'masuk') {
        masukHari[i] += t.jumlah;
      } else {
        keluarHari[i] += t.jumlah;
      }
    });
    grafikMinggu = new window.Chart(document.getElementById('grafik-minggu'), {
      type: 'bar',
      data: {
        labels: NAMA_HARI,
        datasets: [
          { label: 'Masuk', data: masukHari, backgroundColor: '#059669', borderRadius: 6 },
          { label: 'Keluar', data: keluarHari, backgroundColor: '#dc2626', borderRadius: 6 }
        ]
      },
      options: {
        plugins: {
          legend: { position: 'bottom', labels: { color: w.ticks, boxWidth: 12 } },
          tooltip: { callbacks: { label: labelRp } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: w.grid }, ticks: { color: w.ticks } },
          x: { grid: { display: false }, ticks: { color: w.ticks } }
        }
      }
    });
    if (dataKat.length === 0) return; // pesan kosong sudah di tabel kategori
    const palet = ['#059669', '#10b981', '#34d399', '#f59e0b', '#fbbf24', '#0d9488', '#3b82f6', '#a78bfa'];
    grafikKategori = new window.Chart(document.getElementById('grafik-kategori'), {
      type: 'doughnut',
      data: {
        labels: dataKat.map(function(r) { return r.kategori; }),
        datasets: [{
          data: dataKat.map(function(r) { return r.total; }),
          backgroundColor: dataKat.map(function(_, i) { return palet[i % palet.length]; })
        }]
      },
      options: {
        plugins: {
          legend: { position: 'bottom', labels: { color: w.ticks, boxWidth: 12 } },
          tooltip: { callbacks: { label: labelRp } }
        }
      }
    });
  }

  function muatKategori(data) {
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

  pilihPeriode.addEventListener('change', async function() { await muatRingkasan(); });
  await muatRingkasan();
}
init();
