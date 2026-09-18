// Auth Webapp Keuangan - salinan adaptasi BELAJAR JS/auth.js + kolom role.
// register = POST /register, login = POST /login,
// getProfile = GET /profile (kirim token), logout = DELETE /session.
// Role: 'pribadi' (data sendiri) atau 'keluarga' (1 email dipakai bersama).

let users = [];      // {id, email, username, password, role} - password polos dulu
let sessions = {};   // token -> userId
let nextUserId = 1;

// Turunkan username sementara dari email (dipakai migrasi user lama).
// 'tatata@gmail.com' -> 'Tatata'; tambah angka bila kembar/pendek.
function turunkanUsername(email, abaikanId) {
  let dasar = String(email).split('@')[0] || 'User';
  dasar = dasar.charAt(0).toUpperCase() + dasar.slice(1);
  let nama = dasar;
  let n = 2;
  while (nama.length < 3 || users.some(function(u) { return u.id !== abaikanId && u.username === nama; })) {
    nama = dasar + n;
    n++;
  }
  return nama;
}

// Migrasi 1x: user lama tanpa username diisi turunan email + tandai versi.
// Berjalan di array users global (sudah diisi dari db) agar cek kembar benar.
function migrasiUsername(db) {
  if (!db || db.usernameV1) return false;
  let berubah = false;
  users.forEach(function(u) {
    if (!u.username) {
      u.username = turunkanUsername(u.email, u.id);
      berubah = true;
    }
  });
  return berubah;
}

function loadDB() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const raw = window.localStorage.getItem('authDB');
    if (raw) {
      const db = JSON.parse(raw);
      users = db.users || [];
      sessions = db.sessions || {};
      nextUserId = db.nextUserId || 1;
      if (migrasiUsername(db)) {
        saveDB(); // simpan hasil migrasi + penanda versi sekaligus
      }
    }
  } catch (e) { /* pakai memori kosong */ }
}

function saveDB() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  window.localStorage.setItem('authDB', JSON.stringify({ users: users, sessions: sessions, nextUserId: nextUserId, usernameV1: true }));
}

loadDB();

function register(email, username, password, role) {
  if (!email) {
    return { error: 'Email wajib', code: 400 };
  }
  if (!username || username.trim().length < 3) {
    return { error: 'Username wajib min 3 karakter', code: 400 };
  }
  if (!password || password.length < 4) {
    return { error: 'Password min 4 karakter', code: 400 };
  }
  if (role !== 'pribadi' && role !== 'keluarga') {
    return { error: 'Role harus pribadi/keluarga', code: 400 };
  }
  const ada = users.find(function(u) { return u.email === email; });
  if (ada) {
    return { error: 'Email sudah dipakai', code: 400 };
  }
  const namaAda = users.find(function(u) { return u.username === username.trim(); });
  if (namaAda) {
    return { error: 'Username sudah dipakai', code: 400 };
  }
  const user = { id: nextUserId++, email: email, username: username.trim(), password: password, role: role };
  users.push(user);
  saveDB();
  return { data: { id: user.id, email: user.email, username: user.username, role: user.role }, code: 201 };
}

function login(email, password) {
  const user = users.find(function(u) { return u.email === email; });
  if (!user || user.password !== password) {
    return { error: 'Email/password salah', code: 401 };
  }
  const token = 'tok_' + user.id + '_' + Date.now();
  sessions[token] = user.id;
  saveDB();
  return { data: { token: token }, code: 200 };
}

function getProfile(token) {
  if (!token || !sessions[token]) {
    return { error: 'Unauthorized', code: 401 };
  }
  const user = users.find(function(u) { return u.id === sessions[token]; });
  return { data: { id: user.id, email: user.email, username: user.username || user.email, role: user.role }, code: 200 };
}

function logout(token) {
  if (!token || !sessions[token]) {
    return { error: 'Sesi tidak ditemukan', code: 401 };
  }
  delete sessions[token];
  saveDB();
  return { data: 'Logout sukses', code: 200 };
}

async function main() {
  console.log('----- REGISTER pribadi -----');
  console.log(await register('aku@mail.com', 'Aku', '1234', 'pribadi'));

  console.log('\n----- REGISTER keluarga -----');
  console.log(await register('keluarga@mail.com', 'Akun Keluarga', '1234', 'keluarga'));

  console.log('\n----- REGISTER username pendek (400) -----');
  console.log(await register('x@mail.com', 'AB', '1234', 'pribadi'));

  console.log('\n----- REGISTER username kembar beda email (400) -----');
  console.log(await register('lain@mail.com', 'Aku', '1234', 'pribadi'));

  console.log('\n----- REGISTER role salah (400) -----');
  console.log(await register('x@mail.com', 'Xrole', '1234', 'admin'));

  console.log('\n----- REGISTER duplikat (400) -----');
  console.log(await register('aku@mail.com', 'Aku2', '1234', 'pribadi'));

  console.log('\n----- LOGIN + PROFILE (role + username kebawa) -----');
  const l = await login('keluarga@mail.com', '1234');
  console.log(l);
  console.log(await getProfile(l.data.token));
}

if (typeof window === 'undefined') {
  main();
}
