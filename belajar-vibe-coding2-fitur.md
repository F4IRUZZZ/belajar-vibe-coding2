# Webapp Catatan Keuangan Keluarga — Fitur & Kegunaan

> Sumber: https://github.com/F4IRUZZZ/belajar-vibe-coding2
> Jenis: Webapp Catatan Keuangan (DEMO) — pencatatan pendapatan & pengeluaran pribadi + keluarga.
> Status: frontend + backend + PWA + deploy-ready.

## 1. Ringkasan Kegunaan

Masalah yang diselesaikan: pendapatan keluarga tidak tentu tiap minggu (mis. Rp200, Rp300) dan pengeluaran (pangan, mandi, dll) tidak tercatat → tidak tahu sisa uang.

Web ini dipakai untuk:
1. Daftar / login akun `pribadi` atau `keluarga` (1 email dipakai rame-rame serumah, data milik userId yang sama).
2. Catat transaksi `masuk` (pendapatan) dan `keluar` (pengeluaran) dalam Rupiah + tanggal + catatan.
3. Lihat saldo (`total masuk − total keluar`), ringkasan per periode & per kategori, dan grafik.
4. Kelola daftar `produk/kebutuhan` (mis. Beras - Pangan, Sabun - Mandi) + kategori custom.
5. Catat `hutang/piutang`, cicilan sebagian, pelunasan otomatis ke kas, dan penanda lewat tempo.
6. Install sebagai aplikasi HP (PWA), dark mode, export CSV.

## 2. Tech Stack

- **Frontend:** HTML vanilla di root (`index.html`, `transaksi.html`, `produk.html`, `hutang.html`, `profile.html`, `login.html`, `register.html`) + `css/style.css` + `js/*.js` (api, dashboard, transaksi, produk, hutang, profile, login, register, format, keuangan, pwa, config).
- **Backend:** Bun + ElysiaJS + MySQL (`server/index.ts`, `server/src/auth.ts`, `server/src/keuangan.ts`, `server/src/db.ts`, `server/src/guard.ts`, `schema.sql`, `schema-keuangan.sql`). Password di-hash `Bun.password` bcrypt cost 8, token acak di tabel `sessions`, CORS ketat via `FRONTEND_URL`, bind `0.0.0.0`, warmup `SELECT 1`.
- **PWA:** `manifest.json` (nama Keuangan Keluarga, tema `#059669`) + `sw.js` versi `keuangan-v3` (cache app-shell, API/CDN network-only, install toleran per-file) + tombol install di Profile.
- **Deploy:** `Dockerfile` (oven/bun:1, EXPOSE 3000) + `render.yaml` + `PANDUAN-HOSTING.md`: TiDB Serverless (MySQL-compatible) + Back4app Containers + Cloudflare Pages. Health check `GET /kesehatan → {ok:true}`.

## 3. Daftar Fitur per Halaman

### 3.1 Auth — `register.html` / `login.html`
- Register: email, username (min 3, unik case-insensitive), password (min 8 + huruf + angka + meter + konfirmasi + toggle mata), role `pribadi` / `keluarga`.
- Login: validasi 401 `Email/password salah`, simpan token di `localStorage('token')`.
- Kegunaan: bedakan data sendiri vs data bersama serumah.
- API: `POST /api/register (201/400)`, `POST /api/login (200/401)`, `GET /api/profile`, `POST /api/logout`, `PUT /api/username`.

### 3.2 Dashboard — `index.html` + `js/dashboard.js`
- Kartu Total masuk / Total keluar + hero Saldo (merah bila minus).
- Filter periode: Semua Waktu / Minggu Ini / Bulan Ini (request paralel, anti-balapan via nomor request).
- Tabel Keluar per Kategori: kategori, bar progres, `RpX (Y%)`.
- Grafik Chart.js (CDN): batang Masuk-vs-Keluar, batang harian Senin–Minggu, donat kategori. Offline/CDN gagal = angka tetap jalan + pesan jujur. Data kosong = ajakan input, bukan kanvas kosong.
- API: `GET /api/saldo?dari&sampai`, `GET /api/ringkasan-kategori`, `GET /api/transaksi`.
- Kegunaan: jawab "sisa uang berapa, bocor di kategori apa, minggu/bulan ini bagaimana" dalam 1 layar.

### 3.3 Transaksi — `transaksi.html` + `js/transaksi.js`
- Form: jenis masuk/keluar, jumlah dengan live prefix `Rp` + auto-format (`pasangFormatRupiahLive`, `parseRupiah`), tanggal default hari ini (lokal, bukan UTC), untuk pengeluaran: dropdown produk (`Nama (Kategori)`) atau `Tulis sendiri...` → kategori bebas, catatan opsional inline.
- Validasi: `jumlah > 0`, `jenis` hanya masuk/keluar, `tanggal YYYY-MM-DD`, tanpa token → 401 redirect login.
- Daftar: tab Semua / Masuk / Keluar, search (kategori/catatan/tanggal/nominal), urut terbaru dulu, tabel + subtotal (+ selisih masuk−keluar di mode Semua), checkbox bulk + hapus massal (1x confirm), edit inline (jumlah/tanggal/kategori), hapus (confirm, cascade catatan via FK).
- Catatan per transaksi: tambah/ubah/hapus inline (akordeon, maks 1 panel terbuka), `GET /api/catatan/semua` 1 request (anti N+1).
- Kegunaan: operasional harian — catat gaji mingguan, belanja, koreksi salah ketik, bersih-bersih data lama.

### 3.4 Produk — `produk.html` + `js/produk.js`
- CRUD shared global (tanpa user_id): nama unik case-insensitive (`uq_nama`), kategori dinormalisasi (ikut ejaan existing, baru → kapital, kosong → `Lainnya`).
- Dropdown kategori custom (pengganti datalist): default `Pangan, Mandi, Lainnya` + existing distinct + search + `+ Tambah "X"`.
- Tabel No | Nama | Kategori | Aksi + panel edit akordeon.
- Kegunaan: master data agar form transaksi tinggal pilih, ejaan kategori konsisten untuk ringkasan/grafik.

### 3.5 Hutang — `hutang.html` + `js/hutang.js`
- Form: arah hutang/piutang, pihak (wajib), jumlah Rp live-format, tanggal, jatuh tempo opsional, keterangan opsional.
- Daftar 2 seksi (Hutang / Piutang): No | Pihak (nama + tanggal + tempo + keterangan + flag `LEWAT TEMPO!`) | Jumlah | Sisa (`jumlah−dibayar`) | Status (`belum/lunas`) | Aksi + subtotal sisa.
- Bayar sebagian (panel nominal) & Lunaskan (confirm) → transaksional (`FOR UPDATE` + `BEGIN/COMMIT`): auto-catat ke kas (`hutang→keluar`, `piutang→masuk`) + catatan `Bayar/Pelunasan ... RpX`. Idempoten, tolak nominal > sisa, tolak bila sudah lunas.
- Hapus hanya bila `belum` (yang lunas = jejak audit, tanpa tombol).
- Kegunaan: pinjam-memiminjam tercatat + otomatis mengurangi/menambah kas, tidak perlu catat manual 2x.

### 3.6 Pengaturan — `profile.html` + `js/profile.js`
- Info akun (username/email/role), ubah username (min 3, unik), Ekspor CSV (transaksi, konsisten dengan tombol lama), toggle tema Gelap/Terang (ikut OS, manual menang via localStorage), tombol Install PWA, Logout 1 pintu (confirm + hanguskan sesi server).
- Kegunaan: administrasi akun, bawa data ke spreadsheet, nyaman di malam hari, jadi app HP.

### 3.7 Lintas Halaman (UX / Teknis)
- Sidebar: Dashboard / Transaksi / Produk / Hutang / Pengaturan + ikon SVG seragam (`pasangIkonMenu`), nav pil, hero gradient fintech hijau, sticky nav, pesan semantik ok/error, tombol merah solid untuk aksi bahaya.
- Rupiah 2 arah: ketik `20000` → tampil `20.000`, simpan angka murni.
- Offline jujur: API mati → 503 + modal `Server tidak terjangkau`, bukan bisu. Error 500 tampilkan teks server asli (max 200 char).
- Aksesibilitas: label terasosiasi, aria-label tombol ikon, autocomplete email/current/new-password.

## 4. Model Data & Kontrak API (ringkas)

- `users {id,email,username,password_hash,role}` — role `pribadi|keluarga`.
- `sessions {token,user_id}` — 1 login = 1 sesi.
- `produk {id,nama,kategori}` — shared, unik nama.
- `transaksi {id,user_id,jenis(masuk|keluar),jumlah,tanggal,kategori(snapshot),produk_id}`.
- `catatan {id,transaksi_id,isi}` — cascade on delete.
- `hutang {id,user_id,arah(hutang|piutang),pihak,jumlah,dibayar,tanggal,jatuh_tempo,keterangan,status,transaksi_id_lunas}`.
- Kode: `201` buat, `200` baca/ubah, `400` validasi, `401` bukan milikmu/tanpa token, `404` hilang, `503` server mati. Error selalu `{error,code}`.

## 5. Alur Pakai (HP Keluarga)

1. Buka URL Cloudflare Pages → Daftar role `keluarga` → Login di 2 HP dengan email yang sama.
2. Di Produk: tambah `Beras (Pangan)`, `Sabun (Mandi)`.
3. Di Transaksi: catat `masuk 300` + catatan `Gajian`, catat `keluar` pilih Beras.
4. Di Dashboard: cek Saldo + Keluar per Kategori + grafik, ganti periode Minggu/Bulan.
5. Di Hutang: catat `hutang ke Budi 50000 tempo ...` → bayar `20000` → cek sisa + kas otomatis berkurang → Lunaskan.
6. Di Pengaturan: Export CSV, aktifkan Dark, Install aplikasi, Logout bila ganti akun.

## 6. Hosting Gratis (dari `PANDUAN-HOSTING.md`)

1. TiDB Cloud Serverless (Singapore) → DB `keuangan` → import `schema.sql` + `schema-keuangan.sql` → `DATABASE_URL`.
2. Back4app Containers → repo ini → `Dockerfile` root → env `DATABASE_URL, DB_SSL=true, PORT=3000, FRONTEND_URL` (isi setelah step 3) → cek `/kesehatan`.
3. Cloudflare Pages → build `cp js/config.prod.js js/config.js` → output `/` → isi `config.prod.js` dengan URL Back4app → set `FRONTEND_URL` di backend → redeploy.
4. Uji: 2 HP login sama → catat di A → refresh B muncul; matikan WiFi → pesan 503 → nyalakan normal.

## 7. Batasan Demo yang Disadari

- Akun keluarga = 1 email bersama (belum anggota terpisah / hak akses granular).
- Produk shared global antar user.
- Grafik butuh internet (CDN Chart.js); PWA cache shell saja, data tetap network.
- Backend sleep saat idle lama di paket gratis (bangun ~30 detik).
