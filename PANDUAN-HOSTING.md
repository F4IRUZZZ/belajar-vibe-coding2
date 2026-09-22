# Panduan Hosting Gratis Fase B: TiDB + Render + Cloudflare Pages

> Kode sudah deploy-ready (PR Fase B). Yang tersisa = klik di 3 dashboard.
> Estimasi: ±45 menit. Hasil: API + database + webapp online, HTTPS, $0.

## 0. Yang kamu butuhkan

- Akun GitHub (sudah ada: repo `belajar-vibe-coding2`, branch `main` sudah merge PR Fase B)
- Email untuk daftar TiDB Cloud, Render, Cloudflare (boleh sama semua)

## 1. Database — TiDB Serverless (gratis, MySQL-compatible)

1. Daftar di https://tidbcloud.com → buat cluster **Serverless** (region Asia, mis. Singapore).
2. Buat database `keuangan` + user + password. Centang **Allow Access from Anywhere** (atau koneksi Render gagal).
3. Salin **connection string** (format `mysql://user:pass@host:4000/keuangan`). Simpan — dipakai di langkah 2.
4. Import skema SEKALI (dari laptop, MySQL client ada):
   ```
   mysql --host=HOST_TIDB --port=4000 --user=USER -p keuangan < server/src/schema.sql
   mysql --host=HOST_TIDB --port=4000 --user=USER -p keuangan < server/src/schema-keuangan.sql
   ```
   (Ganti HOST_TIDB/USER; password diminta interaktif. Tambah `--ssl-mode=REQUIRED` bila ditolak.)

## 2. Backend — Render (gratis, Bun native)

1. Daftar di https://render.com (lanjutkan dengan GitHub) → **New → Blueprint** → pilih repo `belajar-vibe-coding2` (file `render.yaml` di root terdeteksi otomatis; paket `free`, region `singapore` sudah terkunci di file).
2. Isi env var (dashboard Render → service `keuangan-api` → Environment):
   - `DATABASE_URL` = connection string TiDB langkah 1
   - `DB_SSL` = `true`
   - `FRONTEND_URL` = `https://KEUANGANMU.pages.dev` (isi setelah langkah 3, lalu **Manual Deploy** ulang sekali)
3. Deploy → tunggu hijau → test: buka `https://keuangan-api.onrender.com/kesehatan` → harus `{ "ok": true }`.
4. Catat URL backend (mis. `https://keuangan-api.onrender.com`) — dipakai langkah 3.
5. Catatan jujur: paket gratis **tidur setelah 15 menit tak dipakai**; request pertama membangunkan ±30 detik. Keluarga cukup tahu: "bukanya tunggu setengah menit kalau lama tak dibuka".

## 3. Frontend — Cloudflare Pages (gratis)

1. Edit `js/config.prod.js`: ganti `https://keuangan-api.onrender.com` dengan URL backend-mu dari langkah 2 (commit — aman, URL backend memang publik; yang melindungi data = token + CORS).
2. Daftar di https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git** → repo `belajar-vibe-coding2`.
3. Build settings: **Framework preset = None**, Build command = `cp js/config.prod.js js/config.js`, Output directory = `/` (file HTML di root repo).
4. Deploy → dapat URL `https://xxx.pages.dev` → buka di HP → daftar akun keluarga → catat 1 transaksi → cek saldo.
5. Kembali ke Render: isi `FRONTEND_URL` = URL pages (CORS ketat) → **Manual Deploy** ulang backend sekali.

## 4. Test akhir (HP keluarga)

1. Buka URL frontend di 2 HP → login akun keluarga yang SAMA → catat di HP A → refresh HP B → data muncul (bukti data bersama).
2. Matikan WiFi → buka → pesan 503 tampil (bukan bisu) → nyalakan lagi → normal.

## Masalah umum

| Gejala | Penyebab | Obat |
|---|---|---|
| `kesehatan` 404/sleep | Render sleep / deploy gagal | Dashboard Render → Logs; request ulang tunggu 30 dtk |
| Frontend 503 terus | `js/config.js` masih localhost | Ganti ke URL Render (langkah 3) |
| Backend 500 semua | TiDB IP diblokir / skema belum import | Allow Access from Anywhere + import 2 file SQL |
| CORS error di Console | FRONTEND_URL salah | Samakan dengan URL pages persis (tanpa `/` akhir) |
