const formLogin = document.getElementById('form-login');
const btnLogin = document.getElementById('btn-login');
const hasilLogin = document.getElementById('hasil-login');

pasangTogglePassword(document.getElementById('password'), document.getElementById('lihat-password'));
document.getElementById('lihat-password').innerHTML = ikon('mata');
pasangToggleTema(); // dark mode ikut sistem, manual menang via localStorage

formLogin.addEventListener('submit', async function(e) {
  e.preventDefault();
  btnLogin.textContent = 'Loading...';
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const res = await login(email, password); // via API (Fase A-3)
  btnLogin.textContent = 'Masuk';
  if (res.code === 200) {
    window.localStorage.setItem('token', res.data.token);
    pesanOk(hasilLogin, 'Login sukses! Lanjut ke Dashboard.');
    setTimeout(function() {
      window.location.href = '/';
    }, 800);
  } else {
    pesanError(hasilLogin, 'Gagal (' + res.code + '): ' + res.error);
  }
});
