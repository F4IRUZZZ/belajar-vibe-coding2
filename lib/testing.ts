// Helper khusus test: sesi better-auth ASLI di DB (bukan mock auth).
// Tiap file test: mock next/headers -> Headers berisi cookie sesi ini,
// sehingga wajibUser()/ambilUser() menempuh jalur produksi yang sesungguhnya.
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { prisma } from "./prisma";

export const COOKIE_SESI = "better-auth.session_token";

// Tandatangani token persis seperti better-auth (better-call):
// encodeURIComponent(token + "." + base64(HMAC-SHA256(secret, token))).
export function tandaiCookie(token: string): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? "";
  const sig = createHmac("sha256", secret).update(token).digest("base64");
  return encodeURIComponent(`${token}.${sig}`);
}

export async function buatSesiTest(
  email: string,
  name: string,
): Promise<{ userId: string; token: string; cookie: string }> {
  const user = await prisma.user.create({ data: { id: randomUUID(), name, email } });
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { id: randomUUID(), token, userId: user.id, expiresAt: new Date("2999-01-01") },
  });
  return { userId: user.id, token, cookie: tandaiCookie(token) };
}

export function headersSesi(cookie: string): Headers {
  return new Headers({ cookie: `${COOKIE_SESI}=${cookie}` });
}

export async function bersihSemua() {
  await prisma.session.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.catatan.deleteMany();
  await prisma.hutang.deleteMany();
  await prisma.transaksi.deleteMany();
  await prisma.produk.deleteMany();
  await prisma.anggaran.deleteMany();
  await prisma.target.deleteMany();
  await prisma.jadwal.deleteMany();
  await prisma.dompet.deleteMany();
}
