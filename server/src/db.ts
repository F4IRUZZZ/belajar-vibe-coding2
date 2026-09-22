// Koneksi MySQL via pool (mysql2/promise).
// Lokal: DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME (.env).
// Hosting (TiDB Serverless): DATABASE_URL=mysql://user:pass@host:4000/db
// + DB_SSL=true (TiDB wajib TLS). DATABASE_URL menang bila ada.
import mysql from 'mysql2/promise';

function opsiKoneksi(): Record<string, unknown> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const u = new URL(url);
    const opsi: Record<string, unknown> = {
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
      waitForConnections: true,
      connectionLimit: 5
    };
    if (process.env.DB_SSL === 'true' || u.hostname.includes('tidbcloud.com')) {
      opsi.ssl = { minVersion: 'TLSv1.2' };
    }
    return opsi;
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'keuangan',
    waitForConnections: true,
    connectionLimit: 5
  };
}

export const pool = mysql.createPool(opsiKoneksi() as Parameters<typeof mysql.createPool>[0]);
