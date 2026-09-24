import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { prisma } from "./prisma";

// Google OAuth only (tanpa password). Kredensial asli diisi di env;
// string kosong agar build tetap jalan (login Google baru hidup saat runtime).
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
});

export type SesiUser = {
  id: string;
  email: string;
  username: string;
  role: "pribadi" | "keluarga";
};

export async function ambilUser(): Promise<SesiUser | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s?.user) return null;
  return {
    id: s.user.id,
    email: s.user.email,
    username: s.user.name,
    role: "keluarga",
  };
}

export async function wajibUser(): Promise<SesiUser> {
  const u = await ambilUser();
  if (!u) throw new Error("Masuk dulu untuk mengakses halaman ini");
  return u;
}
