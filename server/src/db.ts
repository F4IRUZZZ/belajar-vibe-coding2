// Koneksi MySQL via pool (mysql2/promise). Kredensial dari .env
// (Bun memuat .env otomatis). DB dibuat via src/schema.sql.
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'keuangan',
  waitForConnections: true,
  connectionLimit: 5
});
