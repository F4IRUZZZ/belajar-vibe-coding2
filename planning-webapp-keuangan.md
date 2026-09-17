# Planning Webapp Keuangan — Catatan Pendapatan & Pengeluaran Keluarga

> Proyek pertama Fairuz (Tahap 4: Vibe Engineer Proyek Sendiri).
> Pola: simulasi dulu (`array + localStorage`, warisan `auth.js` / `items.js`),
> MySQL + desktop `customtkinter` belakangan setelah webapp lulus total.

## 1. Ringkasan
- **Nama sementara:** Catatan Keuangan Keluarga.
- **Masalah:** pendapatan keluarga datang tiap minggu tidak tentu
  (contoh: Rp200, Rp300, dan lain-lain) dan pengeluaran rumah
  (pangan, mandi, dan lain-lain) tidak tercatat → tidak tahu sisa uang.
- **User:** Fairuz (pribadi) + anggota keluarga (akun bersama).
- **Target tahap 1:** catat masuk/keluar + lihat sisa saldo, klik-klik, rapi di HP.

## 2. Role & Scope Data
- `users` punya kolom `role`: `pribadi` atau `keluarga`.
- Akun `keluarga` = **1 email dipakai rame-rame serumah**.
  Semua yang login email itu melihat + mencatat data yang sama
  (data milik `userId` akun tersebut). Tanpa grup/anggota lanjutan di tahap 1.
- Aturan:
  - Data `pribadi` hanya terlihat pemiliknya.
  - Data `keluarga` terlihat semua yang login akun keluarga itu.

## 3. Model Data (simulasi, belum DB beneran)
- `users[]`: `{id, email, password, role}` — reuse `auth.js` + tambah `role`.
  Password polos dulu (bcrypt Tahap 4 lanjutan).
- `sessions{}`: `token -> userId` — reuse `auth.js` + persist `localStorage('authDB')`.
- `produk[]`: `{id, nama, kategori}` — daftar kebutuhan/barang.
  Contoh: `{id: 1, nama: 'Beras', kategori: 'pangan'}`,
  `{id: 2, nama: 'Sabun', kategori: 'mandi'}`.
- `transaksi[]`: `{id, userId, jenis, jumlah, produkId, tanggal, catatanId}`.
  - `jenis`: cuma `'masuk'` atau `'keluar'`.
  - `jumlah`: angka Rupiah, contoh `200` (= Rp200). Harus `> 0`.
  - `tanggal`: string `YYYY-MM-DD` (default hari ini).
- `catatan[]`: `{id, transaksiId, isi}` — keterangan tambahan per transaksi.
- Persist browser: `localStorage('keuanganDB')` untuk
  `produk/transaksi/catatan` (pola sama kayak `itemsDB`).

## 4. Spesifikasi
### 4.1 Auth (tetap, reuse `auth.js`)
| Fungsi | Sukses | Gagal |
|---|---|---|
| `register(email, password, role)` | 201 + `{id, email, role}` | 400 email dipakai / validasi |
| `login(email, password)` | 200 + `{token}` | 401 salah |
| `getProfile(token)` | 200 + `{id, email, role}` | 401 tanpa/palsu/hangus |
| `logout(token)` | 200 sukses | 401 sesi tidak ada |

### 4.2 CRUD (baru, `keuangan.js`)
| Fungsi | Aturan |
|---|---|
| `addProduk(nama, kategori)` | nama wajib → return item / `{error, code: 400}` |
| `addTransaksi({jenis, jumlah, produkId, tanggal})` | `jenis` cuma masuk/keluar, `jumlah > 0`, wajib login (token valid) |
| `updateTransaksi(id, patch)` | id tidak ada → `null` (404); milik user lain → 401 |
| `deleteTransaksi(id)` | id tidak ada → `false`; milik user lain → tolak |
| `addCatatan(transaksiId, isi)` | transaksi harus milik sendiri/keluarga |
| `getSaldo(userId)` | `total masuk − total keluar` (dalam Rp) |

### 4.3 Validasi & Error
- `jumlah <= 0` atau bukan angka → tolak 400.
- Tanpa token / token hangus → 401 + redirect ke login.
- Bentuk error selalu `{ error: '...', code: ... }` (konsisten dengan Auth).

> Lokasi proyek: `D:\Projek Developments\Webapp Keuangan\`
> (mandiri, di luar folder belajar `RoadMap VibeCoding`).

## 5. Struktur File (usulan awal, mulai kecil)
- `js/keuangan.js` — 1 file dulu: data + semua fungsi CRUD +
  `getSaldo()` + persist `localStorage`. (Pisah `js/produk.js`/`js/transaksi.js`
  nanti kalau file kepanjangan.)
- `js/auth.js` — salinan adaptasi dari `BELAJAR JS/auth.js` + kolom `role`.
- `css/style.css` — 1 file gaya rapi (variabel + kartu).
- Halaman (2 dulu, tambah setelah lulus):
  - `index.html` — dashboard: tampil saldo + total masuk/keluar + link.
  - `transaksi.html` — form tambah (jenis, jumlah Rp, produk, tanggal) + daftar.
- Nanti: `register.html`, `login.html`, `profile.html`, `produk.html`,
  halaman daftar per kategori.

## 6. Sub-task (3–5, ala `issue.md`) — STATUS: backend tuntas 17 Sep 2026
- (a) [x] `keuangan.js` lulus di Node (PR #3: CRUD + saldo Rp100, 404/401 rapi).
- (b) [x] Auth + dashboard: role, register/login/profile... (posisi: register/login/index jadi; profile.html BELUM — lihat catatan).
- (c) [x] Halaman transaksi: form + daftar + ubah/hapus inline + persist (PR #7).
- (d) [x] Test orang awam end-to-end: daftar → login → tambah → saldo → logout → hangus.
- (+) [x] `produk.html` CRUD shared (PR #10).
- (+) [x] Hardening: tolak minus + tanggal lokal (PR #11).
- (+) [x] Otorisasi ubah/hapus transaksi 401 (PR #8, tindak lanjut review).

CATATAN GAP (sadar, bukan lupa):
- `profile.html` belum ada di proyek ini (baru di folder belajar). Perlu sebelum fase frontend polish.
- `addCatatan` belum ada UI (fungsi ada). Masuk bagian 8 bila diminta.
- Utang sadar: password polos (nanti bcrypt/MySQL), 404-vs-401 enumeration, `confirm()` webview.

## 7. Testing
- Node: `node "js/keuangan.js"` (dari root `Webapp Keuangan`) → urut tambah → ubah → hapus →
  404/401 rapi → saldo benar.
- Browser: alur (d) di atas mulus, Console bersih tanpa error merah.
- Responsif: dashboard + form rapi di HP (90%) dan laptop.

## 8. Pengembangan Lanjut (kosong — diisi Fairuz sesuai permintaan nanti)
- (contoh: kategori custom, grafik per minggu, export CSV, MySQL beneran,
  anggota keluarga terpisah dengan hak akses, dst.)
- Pengembangan Profile lanjutan (detail menyusul dari Fairuz; versi sekarang cukup).
-

## 9. Catatan Porting Desktop `customtkinter` (NANTI — setelah webapp lulus total)
- Konsep yang dipakai ulang: Auth (register/login/logout + token/sesi),
  CRUD + validasi, bentuk error `{error, code}`, alur layered
  Route → Service → DB → Response.
- Detail implementasi desktop (Python + `customtkinter` + penyimpanan lokal)
  ditulis di sini setelah webapp dinyatakan lulus.
