const formLogin = document.getElementById('form-login');
const btnLogin = document.getElementById('btn-login');
const hasilLogin = document.getElementById('hasil-login');
const formRegister = document.getElementById('form-register');
const btnRegister = document.getElementById('btn-register');
const hasilRegister = document.getElementById('hasil-register');

formLogin.addEventListener('submit', function(e) {
  e.preventDefault();
  btnLogin.textContent = 'Loading...';
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const res = login(email, password);
  btnLogin.textContent = 'Masuk';
  if (res.code === 200) {
    window.localStorage.setItem('token', res.data.token);
    hasilLogin.textContent = 'Login sukses! Lanjut ke Dashboard.';
    setTimeout(function() {
      window.location.href = 'index.html';
    }, 800);
  } else {
    hasilLogin.textContent = 'Gagal (' + res.code + '): ' + res.error;
  }
});

formRegister.addEventListener('submit', function(e) {
  e.preventDefault();
  btnRegister.textContent = 'Loading...';
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;
  const res = register(email, password, role);
  btnRegister.textContent = 'Daftar';
  if (res.code === 201) {
    hasilRegister.textContent = 'Daftar sukses (' + res.data.role + ')! Silakan login di atas.';
  } else {
    hasilRegister.textContent = 'Gagal (' + res.code + '): ' + res.error;
  }
});
