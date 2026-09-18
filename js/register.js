const formRegister = document.getElementById('form-register');
const btnRegister = document.getElementById('btn-register');
const hasilRegister = document.getElementById('hasil-register');

formRegister.addEventListener('submit', function(e) {
  e.preventDefault();
  btnRegister.textContent = 'Loading...';
  const email = document.getElementById('reg-email').value;
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;
  const res = register(email, username, password, role);
  btnRegister.textContent = 'Daftar';
  if (res.code === 201) {
    hasilRegister.textContent = 'Daftar sukses (' + res.data.role + ')! Silakan login.';
    setTimeout(function() {
      window.location.href = 'login.html';
    }, 800);
  } else {
    hasilRegister.textContent = 'Gagal (' + res.code + '): ' + res.error;
  }
});
