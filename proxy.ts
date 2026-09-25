import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIK = ["/login", "/api/auth", "/api/kesehatan", "/manifest.json", "/icon-192.png", "/icon-512.png", "/sw.js"];

// Cek sesi asli (Node runtime) — bukan sekadar keberadaan cookie.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIK.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  if (pathname === "/register") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const sesi = await auth.api.getSession({ headers: req.headers });
  if (!sesi) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
