"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buatSesi, hapusSesi, hashPassword, verifyPassword } from "@/lib/auth";

const emailZ = z.string().trim().toLowerCase().email("Email tidak valid").max(150);
const usernameZ = z.string().trim().min(3, "Username minimal 3 huruf").max(50);
const passwordZ = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(200)
  .refine((s) => /[A-Za-z]/.test(s) && /[0-9]/.test(s), "Password wajib ada huruf + angka");

const registerSchema = z.object({
  email: emailZ,
  username: usernameZ,
  password: passwordZ,
  role: z.enum(["pribadi", "keluarga"]),
});

export async function register(input: z.infer<typeof registerSchema>) {
  const p = registerSchema.parse(input);
  const emailLower = p.email.toLowerCase();
  const usernameLower = p.username.toLowerCase();
  if (await prisma.user.findUnique({ where: { emailLower } })) {
    throw new Error("Email sudah terdaftar, langsung masuk saja");
  }
  if (await prisma.user.findUnique({ where: { usernameLower } })) {
    throw new Error("Username sudah dipakai");
  }
  const user = await prisma.user.create({
    data: {
      email: p.email,
      emailLower,
      username: p.username,
      usernameLower,
      passwordHash: await hashPassword(p.password),
      role: p.role,
    },
  });
  await buatSesi(user.id);
  redirect("/");
}

const loginSchema = z.object({ email: emailZ, password: z.string().min(1, "Password wajib") });

export async function login(input: z.infer<typeof loginSchema>) {
  const p = loginSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { emailLower: p.email.toLowerCase() } });
  if (!user || !(await verifyPassword(p.password, user.passwordHash))) {
    throw new Error("Email/password salah");
  }
  await buatSesi(user.id);
  redirect("/");
}

export async function logout() {
  await hapusSesi();
  redirect("/login");
}
