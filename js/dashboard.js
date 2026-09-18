const infoUser = document.getElementById('info-user');
const totalMasuk = document.getElementById('total-masuk');
const totalKeluar = document.getElementById('total-keluar');
const saldoEl = document.getElementById('saldo');

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
  const ringkasan = getSaldo(user.id);
  totalMasuk.textContent = 'Rp' + formatRupiah(ringkasan.masuk);
  totalKeluar.textContent = 'Rp' + formatRupiah(ringkasan.keluar);
  saldoEl.textContent = 'Rp' + formatRupiah(ringkasan.saldo);
}
