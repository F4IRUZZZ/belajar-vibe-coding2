import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Sama dengan SESSION_COOKIE di lib/auth.ts; sengaja inline agar bundle
// middleware tidak menarik prisma/bcrypt (Edge).
const SESSION_COOKIE = "sesi";

const PUBLIK = ["/login", "/register", "/api/kesehatan", "/manifest.json"];

// Cek cepat keberadaan cookie; validitas + kedaluwarsa dicek di server via ambilUser().
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIK.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  if (!req.cookies.get(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
