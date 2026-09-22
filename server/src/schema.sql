-- Skema awal Fase A-1: database + users + sessions.
-- Jalankan sekali: mysql -u root < src/schema.sql
-- (UNIQUE + collation ci = email/username unik case-insensitive,
--  sama seperti aturan simulasi auth.js.)
CREATE DATABASE IF NOT EXISTS keuangan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE keuangan;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('pribadi', 'keluarga') NOT NULL DEFAULT 'pribadi',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_email (email),
  UNIQUE KEY uq_username (username)
);

CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
