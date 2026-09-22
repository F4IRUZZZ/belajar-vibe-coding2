-- Skema Fase A-2: produk + transaksi + catatan + hutang.
-- Jalankan: mysql -u root keuangan < src/schema-keuangan.sql
-- Kontrak mirror js/keuangan.js:
-- - produk SHARED global (tanpa user_id), nama unik ci
-- - transaksi/catatan/hutang milik user (user_id)
-- - transaksi.kategori = snapshot (bukan referensi hidup)
-- - hapus transaksi -> catatan ikut (CASCADE, anti yatim)
USE keuangan;

CREATE TABLE IF NOT EXISTS produk (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(150) NOT NULL,
  kategori VARCHAR(100) NOT NULL DEFAULT 'Lainnya',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_nama (nama)
);

CREATE TABLE IF NOT EXISTS transaksi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  jenis ENUM('masuk', 'keluar') NOT NULL,
  jumlah INT NOT NULL,
  produk_id INT NULL,
  kategori VARCHAR(100) NULL,
  tanggal DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (produk_id) REFERENCES produk(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS catatan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaksi_id INT NOT NULL,
  isi TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaksi_id) REFERENCES transaksi(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hutang (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  arah ENUM('hutang', 'piutang') NOT NULL,
  pihak VARCHAR(150) NOT NULL,
  jumlah INT NOT NULL,
  dibayar INT NOT NULL DEFAULT 0,
  tanggal DATE NOT NULL,
  jatuh_tempo DATE NULL,
  keterangan VARCHAR(255) NOT NULL DEFAULT '',
  status ENUM('belum', 'lunas') NOT NULL DEFAULT 'belum',
  transaksi_id_lunas INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
