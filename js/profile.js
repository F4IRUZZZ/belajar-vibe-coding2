const info = document.getElementById('info');
const btnLogout = document.getElementById('btn-logout');
const hasil = document.getElementById('hasil');
const formUsername = document.getElementById('form-username');
const btnUsername = document.getElementById('btn-username');
const hasilUsername = document.getElementById('hasil-username');
const btnEditUsername = document.getElementById('btn-edit-username');
pasangIkon(btnEditUsername, 'ubah', 'Ubah username');
pasangToggleTema(); // dark mode ikut sistem, manual menang via localStorage
pasangIkonMenu(); // ikon SVG di sidebar menu

btnEditUsername.addEventListener('click', function() {
  formUsername.hidden = !formUsername.hidden;
});

// Install PWA (Fase C): Chrome Android kirim beforeinstallprompt -> tombol
// muncul. iOS tidak ada prompt -> tampilkan petunjuk manual. Browser lain
// yang tak dukung = tombol tetap sembunyi (app web biasa).
let promptInstall = null;
const btnInstall = document.getElementById('btn-install');
const infoInstall = document.getElementById('info-install');
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  promptInstall = e;
  btnInstall.hidden = false;
});
btnInstall.addEventListener('click', async function() {
  if (!promptInstall) return;
  promptInstall.prompt();
  await promptInstall.userChoice;
  promptInstall = null;
  btnInstall.hidden = true;
});
if (/iphone|ipad|ipod/i.test(window.navigator.userAgent)) {
  infoInstall.textContent = 'iPhone: buka menu Share > Add to Home Screen untuk install.';
}

// Saat halaman dibuka: baca token, minta profile (via API Fase A-3)
const token = window.localStorage.getItem('token');

async function muatProfil() {
  const res = await getProfile(token);
  if (res.code === 503) {
    info.textContent = 'Server tidak terjangkau. Jalankan server: cd server, lalu bun run index.ts (MySQL wajib hidup).';
    return;
  }
  if (res.code === 200) {
    info.textContent = 'Username: ' + (res.data.username || res.data.email) + ' (' + res.data.role + ')';
    document.getElementById('username-baru').value = res.data.username || '';
    document.getElementById('btn-unduh-profile').addEventListener('click', async function() {
      await unduhCSV(res.data.id, document.getElementById('hasil-unduh'));
    });
  } else {
    // 401 = tanpa token / palsu / hangus -> redirect ke login
    info.textContent = 'Belum login, redirect ke halaman login...';
    setTimeout(function() {
      window.location.href = 'login';
    }, 800);
  }
}
muatProfil();

btnLogout.addEventListener('click', async function() {
  if (!window.confirm('Yakin mau logout?')) return; // anti klik tidak sengaja
  const t = window.localStorage.getItem('token');
  const out = await logout(t);
  if (out.code === 200) {
    window.localStorage.removeItem('token'); // buang token = sesi hangus
    pesanOk(hasil, 'Logout sukses! Redirect ke login...');
    setTimeout(function() {
      window.location.href = 'login';
    }, 800);
  } else {
    pesanError(hasil, 'Gagal (' + out.code + '): ' + out.error);
  }
});

formUsername.addEventListener('submit', async function(e) {
  e.preventDefault();
  btnUsername.textContent = 'Loading...';
  const baru = document.getElementById('username-baru').value;
  const out = await updateUsername(window.localStorage.getItem('token'), baru);
  btnUsername.textContent = 'Simpan';
  if (out.code === 200) {
    info.textContent = 'Username: ' + out.data.username + ' (' + out.data.role + ')';
    pesanOk(hasilUsername, 'Username diubah jadi "' + out.data.username + '".');
  } else {
    pesanError(hasilUsername, 'Gagal (' + out.code + '): ' + out.error);
  }
});
