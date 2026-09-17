const infoUser = document.getElementById('info-user');
const totalMasuk = document.getElementById('total-masuk');
const totalKeluar = document.getElementById('total-keluar');
const saldoEl = document.getElementById('saldo');
const hasil = document.getElementById('hasil');
const btnLogout = document.getElementById('btn-logout');

// Guard: harus login — baca token, 401 = redirect ke login
const token = window.localStorage.getItem('token');
const resProfile = getProfile(token);

if (resProfile.code !== 200) {
  infoUser.textContent = 'Belum login, redirect ke halaman login...';
  setTimeout(function() {
    window.location.href = 'login.html';
  }, 800);
} else {
  const user = resProfile.data;
  infoUser.textContent = 'Login sebagai: ' + user.email + ' (' + user.role + ')';
  const ringkasan = getSaldo(user.id);
  totalMasuk.textContent = 'Rp' + formatRupiah(ringkasan.masuk);
  totalKeluar.textContent = 'Rp' + formatRupiah(ringkasan.keluar);
  saldoEl.textContent = 'Rp' + formatRupiah(ringkasan.saldo);
}

btnLogout.addEventListener('click', function() {
  const t = window.localStorage.getItem('token');
  const out = logout(t);
  if (out.code === 200) {
    window.localStorage.removeItem('token');
    hasil.textContent = 'Logout sukses! Redirect ke login...';
    setTimeout(function() {
      window.location.href = 'login.html';
    }, 800);
  } else {
    hasil.textContent = 'Gagal (' + out.code + '): ' + out.error;
  }
});
