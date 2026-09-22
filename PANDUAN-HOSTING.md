# Panduan Hosting Gratis Fase B: TiDB + Koyeb + Cloudflare Pages

> Kode sudah deploy-ready (PR Fase B). Yang tersisa = klik di 3 dashboard.
> Estimasi: ±45 menit. Hasil: API + database + webapp online, HTTPS, $0.

## 0. Yang kamu butuhkan

- Akun GitHub (sudah ada: repo `belajar-vibe-coding2`, branch `main` sudah merge PR Fase B)
- Email untuk daftar TiDB Cloud, Koyeb, Cloudflare (boleh sama semua)

## 1. Database — TiDB Serverless (gratis, MySQL-compatible)

1. Daftar di https://tidbcloud.com → buat cluster **Serverless** (region Asia, mis. Singapore).
2. Buat database `keuangan` + user + password. Centang **Allow Access from Anywhere** (atau koneksi Koyeb gagal).
3. Salin **connection string** (format `mysql://user:pass@host:4000/keuangan`). Simpan — dipakai di langkah 2.
4. Import skema SEKALI (dari laptop, MySQL client ada):
   ```
   mysql --host=HOST_TIDB --port=4000 --user=USER -p keuangan < server/src/schema.sql
   mysql --host=HOST_TIDB --port=4000 --user=USER -p keuangan < server/src/schema-keuangan.sql
   ```
   (Ganti HOST_TIDB/USER; password diminta interaktif. Tambah `--ssl-mode=REQUIRED` bila ditolak.)

## 2. Backend — Koyeb (gratis, tanpa kartu, via Dockerfile)

> Render gugur (wajib kartu kredit). Pengganti = Koyeb: 1 service gratis,
> deploy GitHub otomatis. Region cuma Frankfurt/Washington (±200ms dari
> Indonesia — layak untuk app keluarga). Tidur setelah 1 jam idle.

1. Daftar di https://koyeb.com via **GitHub** (biasanya tanpa kartu; bila diminta verifikasi kartu, kabari saya — ada cadangan lain).
2. **Create Web Service** → **GitHub** → pilih repo `belajar-vibe-coding2`, branch `main`.
3. Builder: pilih **Dockerfile** (file `Dockerfile` di root terdeteksi otomatis).
4. Instance: **Free** (512MB). Region: **Frankfurt** (terdekat dari 2 pilihan).
5. Ports: biarkan default (Koyeb mengisi `PORT` otomatis; server kita ikut).
6. Environment variables (**Service → Settings → Environment**):
   - `DATABASE_URL` = connection string TiDB langkah 1
   - `DB_SSL` = `true`
   - `FRONTEND_URL` = kosongkan dulu (diisi setelah langkah 3)
7. **Deploy** → tab Logs: tunggu `Server jalan...` + Status Healthy (build pertama ±5 menit).
8. Test: buka `https://keuangan-XXXX.koyeb.app/kesehatan` (URL ada di halaman service) → harus `{ "ok": true }`.
9. Catat URL backend — dipakai langkah 3.

## 3. Frontend — Cloudflare Pages (gratis)

1. Edit `js/config.prod.js`: ganti URL contoh dengan URL backend Koyeb-mu dari langkah 2 (commit — aman, URL backend memang publik; yang melindungi data = token + CORS).
2. Daftar di https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git** → repo `belajar-vibe-coding2`.
3. Build settings: **Framework preset = None**, Build command = `cp js/config.prod.js js/config.js`, Output directory = `/` (file HTML di root repo).
4. Deploy → dapat URL `https://xxx.pages.dev` → buka di HP → daftar akun keluarga → catat 1 transaksi → cek saldo.
5. Kembali ke Koyeb: isi `FRONTEND_URL` = URL pages (CORS ketat) → **Redeploy** backend sekali.

## 4. Test akhir (HP keluarga)

1. Buka URL frontend di 2 HP → login akun keluarga yang SAMA → catat di HP A → refresh HP B → data muncul (bukti data bersama).
2. Matikan WiFi → buka → pesan 503 tampil (bukan bisu) → nyalakan lagi → normal.

## Masalah umum

| Gejala | Penyebab | Obat |
|---|---|---|
| `kesehatan` 404/sleep | Koyeb sleep / deploy gagal | Dashboard Koyeb → Logs; request ulang tunggu 30 dtk |
| Frontend 503 terus | `js/config.js` masih localhost | Ganti ke URL Koyeb (langkah 3) |
| Backend 500 semua | TiDB IP diblokir / skema belum import | Allow Access from Anywhere + import 2 file SQL |
| CORS error di Console | FRONTEND_URL salah | Samakan dengan URL pages persis (tanpa `/` akhir) |
