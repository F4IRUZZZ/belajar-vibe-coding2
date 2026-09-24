import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "sesi";
const MASA_SESI_HARI = 30;

export type SesiUser = {
  id: string;
  email: string;
  username: string;
  role: "pribadi" | "keluarga";
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Buat sesi tunggal: login baru menghanguskan sesi lama user ini.
export async function buatSesi(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MASA_SESI_HARI * 24 * 3600 * 1000);
  await prisma.session.deleteMany({ where: { userId } });
  await prisma.session.create({ data: { token, userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    secure: process.env.NODE_ENV === "production",
  });
  return token;
}

export async function ambilUser(): Promise<SesiUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const sesi = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!sesi || sesi.expiresAt.getTime() < Date.now()) {
    if (sesi) await prisma.session.delete({ where: { token } });
    return null;
  }
  return {
    id: sesi.user.id,
    email: sesi.user.email,
    username: sesi.user.username,
    role: sesi.user.role,
  };
}

export async function wajibUser(): Promise<SesiUser> {
  const u = await ambilUser();
  if (!u) throw new Error("Masuk dulu untuk mengakses halaman ini");
  return u;
}

export async function hapusSesi(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  jar.delete(SESSION_COOKIE);
}
