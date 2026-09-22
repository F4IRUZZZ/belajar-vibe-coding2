# Panduan Hosting Gratis Fase B: TiDB + Back4app + Cloudflare Pages

> Kode sudah deploy-ready (PR Fase B). Yang tersisa = klik di 3 dashboard.
> Estimasi: ±45 menit. Hasil: API + database + webapp online, HTTPS, $0.

## 0. Yang kamu butuhkan

- Akun GitHub (sudah ada: repo `belajar-vibe-coding2`, branch `main` sudah merge PR Fase B)
- Email untuk daftar TiDB Cloud, Back4app, Cloudflare (boleh sama semua)

## 1. Database — TiDB Serverless (gratis, MySQL-compatible)

1. Daftar di https://tidbcloud.com → buat cluster **Serverless** (region Asia, mis. Singapore).
2. Buat database `keuangan` + user + password. Centang **Allow Access from Anywhere** (atau koneksi backend gagal).
3. Salin **connection string** (format `mysql://user:pass@host:4000/keuangan`). Simpan — dipakai di langkah 2.
4. Import skema SEKALI (dari laptop, MySQL client ada):
   ```
   mysql --host=HOST_TIDB --port=4000 --user=USER -p keuangan < server/src/schema.sql
   mysql --host=HOST_TIDB --port=4000 --user=USER -p keuangan < server/src/schema-keuangan.sql
   ```
   (Ganti HOST_TIDB/USER; password diminta interaktif. Tambah `--ssl-mode=REQUIRED` bila ditolak.)

## 2. Backend — Back4app Containers (gratis, tanpa kartu, via Dockerfile)

> Render gugur (wajib kartu). Koyeb gugur (diakuisisi Mistral, gratis dihapus).
> Pengganti = Back4app: 1 container gratis selamanya, tanpa kartu, deploy
> GitHub otomatis. Tidur saat lama idle (bangun otomatis saat dibuka).

1. Daftar di https://www.back4app.com via **GitHub** (tanpa kartu).
2. Dashboard → **My Apps** → **Build a new app** → pilih **Containers as a Service**.
3. Hubungkan GitHub (authorized bila pertama kali) → pilih repo `belajar-vibe-coding2` → **Select**.
4. Konfigurasi: App name `keuangan-api`, Branch `main`, Root directory biarkan root (file `Dockerfile` wajib di root — sudah ada ✓), Autodeploy **Yes**.
5. Environment variables (nama WAJIB huruf besar semua — sudah sesuai):
   - `DATABASE_URL` = connection string TiDB langkah 1
   - `DB_SSL` = `true`
   - `FRONTEND_URL` = kosongkan dulu (diisi setelah langkah 3)
   - `PORT` = `3000` (samakan dengan `EXPOSE` di Dockerfile)
6. **Create App** → tab deploy/logs: tunggu build image + `Server jalan...` (build pertama ±5–8 menit).
7. Ambil URL publik: sidebar → **Actions** (mis. `https://keuangan-api-xxx.back4app.app`).
8. Test di browser: `URL_MILIKMU/kesehatan` → harus `{ "ok": true }`.
9. Catat URL backend — dipakai langkah 3.

## 3. Frontend — Cloudflare Pages (gratis)

1. Edit `js/config.prod.js`: ganti URL contoh dengan URL backend Back4app-mu dari langkah 2 (commit — aman, URL backend memang publik; yang melindungi data = token + CORS).
2. Daftar di https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git** → repo `belajar-vibe-coding2`.
3. Build settings: **Framework preset = None**, Build command = `cp js/config.prod.js js/config.js`, Output directory = `/` (file HTML di root repo).
4. Deploy → dapat URL `https://xxx.pages.dev` → buka di HP → daftar akun keluarga → catat 1 transaksi → cek saldo.
5. Kembali ke Back4app: tambah `FRONTEND_URL` = URL pages (CORS ketat) → **Redeploy** backend sekali.

## 4. Test akhir (HP keluarga)

1. Buka URL frontend di 2 HP → login akun keluarga yang SAMA → catat di HP A → refresh HP B → data muncul (bukti data bersama).
2. Matikan WiFi → buka → pesan 503 tampil (bukan bisu) → nyalakan lagi → normal.

## Masalah umum

| Gejala | Penyebab | Obat |
|---|---|---|
| `kesehatan` 404/sleep | Back4app sleep / deploy gagal | Dashboard Back4app → Logs; request ulang tunggu 30 dtk |
| Deploy sukses tapi halaman error | Port mismatch (kasus #1 Back4app) | Pastikan env `PORT=3000` + Dockerfile `EXPOSE 3000` + server bind `0.0.0.0` (sudah di kode) |
| Frontend 503 terus | `js/config.js` masih localhost | Ganti ke URL Back4app (langkah 3) |
| Backend 500 semua | TiDB IP diblokir / skema belum import | Allow Access from Anywhere + import 2 file SQL |
| CORS error di Console | FRONTEND_URL salah | Samakan dengan URL pages persis (tanpa `/` akhir) |
