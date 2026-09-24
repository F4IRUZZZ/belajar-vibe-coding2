// Test integrasi memakai database Postgres terpisah agar tidak mengotori data dev.
// Set DATABASE_URL_TEST bila perlu; default: catatan_keuangan_test di localhost.
if (!process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL_TEST =
    "postgresql://postgres:postgres@localhost:5432/catatan_keuangan_test?schema=public";
}
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
