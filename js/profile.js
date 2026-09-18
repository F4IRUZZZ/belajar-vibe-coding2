const info = document.getElementById('info');
const btnLogout = document.getElementById('btn-logout');
const hasil = document.getElementById('hasil');

// Saat halaman dibuka: baca token, minta profile
const token = window.localStorage.getItem('token');
const res = getProfile(token);

if (res.code === 200) {
  info.textContent = 'Username: ' + (res.data.username || res.data.email) + ' (' + res.data.role + ')';
} else {
  // 401 = tanpa token / palsu / hangus -> redirect ke login
  info.textContent = 'Belum login, redirect ke halaman login...';
  setTimeout(function() {
    window.location.href = 'login.html';
  }, 800);
}

btnLogout.addEventListener('click', function() {
  const t = window.localStorage.getItem('token');
  const out = logout(t);
  if (out.code === 200) {
    window.localStorage.removeItem('token'); // buang token = sesi hangus
    hasil.textContent = 'Logout sukses! Redirect ke login...';
    setTimeout(function() {
      window.location.href = 'login.html';
    }, 800);
  } else {
    hasil.textContent = 'Gagal (' + out.code + '): ' + out.error;
  }
});
