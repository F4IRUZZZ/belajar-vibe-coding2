const formRegister = document.getElementById('form-register');
const btnRegister = document.getElementById('btn-register');
const hasilRegister = document.getElementById('hasil-register');
const inputPassword = document.getElementById('reg-password');
const meterPassword = document.getElementById('meter-password');

// Meter kekuatan informatif (tidak memblokir): Lemah / Sedang / Kuat.
function skorPassword(pw) {
  let skor = 0;
  if (pw.length >= 8) skor++;
  if (pw.length >= 12) skor++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) skor++;
  if (/[0-9]/.test(pw)) skor++;
  if (/[^A-Za-z0-9]/.test(pw)) skor++;
  return skor;
}

inputPassword.addEventListener('input', function() {
  const pw = inputPassword.value;
  if (!pw) {
    meterPassword.textContent = '';
    return;
  }
  const skor = skorPassword(pw);
  if (skor <= 2) meterPassword.textContent = 'Kekuatan: Lemah';
  else if (skor === 3) meterPassword.textContent = 'Kekuatan: Sedang';
  else meterPassword.textContent = 'Kekuatan: Kuat';
});

formRegister.addEventListener('submit', function(e) {
  e.preventDefault();
  btnRegister.textContent = 'Loading...';
  const email = document.getElementById('reg-email').value;
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const password2 = document.getElementById('reg-password2').value;
  const role = document.getElementById('reg-role').value;
  if (password !== password2) {
    pesanError(hasilRegister, 'Gagal (400): Konfirmasi password tidak sama.');
    return;
  }
  const res = register(email, username, password, role);
  btnRegister.textContent = 'Daftar';
  if (res.code === 201) {
    pesanOk(hasilRegister, 'Daftar sukses (' + res.data.role + ')! Silakan login.');
    setTimeout(function() {
      window.location.href = 'login.html';
    }, 800);
  } else {
    pesanError(hasilRegister, 'Gagal (' + res.code + '): ' + res.error);
  }
});
