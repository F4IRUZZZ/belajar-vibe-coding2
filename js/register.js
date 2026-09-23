const formRegister = document.getElementById('form-register');
const btnRegister = document.getElementById('btn-register');
const hasilRegister = document.getElementById('hasil-register');
const inputPassword = document.getElementById('reg-password');
const inputPassword2 = document.getElementById('reg-password2');
const cocokPassword = document.getElementById('konfirmasi-cocok');
const meterPassword = document.getElementById('meter-password');

pasangTogglePassword(inputPassword, document.getElementById('lihat-reg-password'));
pasangTogglePassword(inputPassword2, document.getElementById('lihat-reg-password2'));
document.getElementById('lihat-reg-password').innerHTML = ikon('mata');
document.getElementById('lihat-reg-password2').innerHTML = ikon('mata');
pasangToggleTema(); // dark mode ikut sistem, manual menang via localStorage

// Indikator live: kosong = diam, cocok = hijau, beda = merah.
// Submit tetap divalidasi seperti sekarang (informatif, bukan pengganti cek).
function perbaruiCocok() {
  if (!inputPassword.value && !inputPassword2.value) {
    cocokPassword.textContent = '';
    cocokPassword.classList.remove('msg-ok', 'msg-err');
    return;
  }
  if (inputPassword.value === inputPassword2.value) {
    pesanOk(cocokPassword, 'Sudah cocok.');
  } else {
    pesanError(cocokPassword, 'Belum cocok.');
  }
}

inputPassword2.addEventListener('input', perbaruiCocok);
inputPassword.addEventListener('input', perbaruiCocok);

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

formRegister.addEventListener('submit', async function(e) {
  e.preventDefault();
  btnRegister.textContent = 'Loading...';
  bersihkanGagal(formRegister);
  const email = document.getElementById('reg-email').value;
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;
  const password2 = document.getElementById('reg-password2').value;
  const role = document.getElementById('reg-role').value;
  if (password !== password2) {
    tandaiGagal(inputPassword2, true);
    btnRegister.textContent = 'Daftar';
    pesanError(hasilRegister, 'Gagal (400): Konfirmasi password tidak sama.');
    return;
  }
  const res = await register(email, username, password, role); // via API (Fase A-3)
  btnRegister.textContent = 'Daftar';
  if (res.code === 201) {
    pesanOk(hasilRegister, 'Daftar sukses (' + res.data.role + ')! Silakan login.');
    setTimeout(function() {
      window.location.href = 'login';
    }, 800);
  } else {
    pesanError(hasilRegister, 'Gagal (' + res.code + '): ' + res.error);
  }
});
