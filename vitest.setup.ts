// Test integrasi memakai database Postgres terpisah agar tidak mengotori data dev.
// Set DATABASE_URL_TEST bila perlu; default: catatan_keuangan_test di localhost.
if (!process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL_TEST =
    "postgresql://postgres:postgres@localhost:5432/catatan_keuangan_test?schema=public";
}
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
// better-auth butuh secret saat init; Google creds dummy (tak dipakai di test).
process.env.BETTER_AUTH_SECRET ??= "test-secret-32-byte-untuk-vitest-saja";
process.env.GOOGLE_CLIENT_ID ??= "test-client-id";
process.env.GOOGLE_CLIENT_SECRET ??= "test-client-secret";
