"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeftRight,
  CalendarClock,
  FlaskConical,
  Goal,
  HandCoins,
  LayoutDashboard,
  Package,
  PiggyBank,
  Plus,
  Settings,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transaksi", label: "Transaksi", icon: ArrowLeftRight },
  { href: "/produk", label: "Produk", icon: Package },
  { href: "/hutang", label: "Hutang", icon: HandCoins },
  { href: "/anggaran", label: "Anggaran", icon: PiggyBank },
  { href: "/target", label: "Target", icon: Goal },
  { href: "/jadwal", label: "Rutin", icon: CalendarClock },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Halaman publik (login) tampil fullscreen tanpa chrome aplikasi.
  if (pathname === "/login" || pathname === "/register") {
    return (
      <main className="min-h-full">
        <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      </main>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4 md:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-glow/60"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-irish-deep text-white">
              <Wallet className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
            <span className="leading-tight">
              <span className="block font-mono text-[13px] font-bold tracking-wide">
                KEUANGAN<span className="text-irish-soft">_KELUARGA</span>
              </span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Catatan kas harian
              </span>
            </span>
          </Link>
          <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-glow/25 bg-glow/10 px-3 py-1 font-mono text-[11px] text-irish-soft sm:inline-flex">
            <FlaskConical className="h-3.5 w-3.5" />
            DATA PER AKUN
          </span>
          <Link
            href="/transaksi"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-irish-deep px-3.5 text-sm font-semibold text-white outline-none transition-colors hover:bg-irish focus-visible:ring-2 focus-visible:ring-glow/60 sm:hidden"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Catat
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 p-4 pr-0 md:block" aria-label="Sidebar">
          <div className="flex h-full flex-col rounded-2xl border border-line/70 bg-panel/70 p-3">
            <Link
              href="/transaksi"
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-irish-deep text-sm font-semibold text-white outline-none transition-colors hover:bg-irish focus-visible:ring-2 focus-visible:ring-glow/60"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Catat transaksi
            </Link>

            <p className="px-2 pt-4 pb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted/80">
              Menu
            </p>

            <nav className="flex flex-col gap-0.5" aria-label="Navigasi utama">
              {NAV.map((n) => {
                const active = isActive(pathname, n.href);
                const Icon = n.icon;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-glow/60",
                      active ? "bg-glow/[0.12] font-semibold text-ink" : "text-muted hover:bg-accent hover:text-ink",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-rail"
                        transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        className="absolute top-2 bottom-2 left-0 w-1 rounded-full bg-irish"
                      />
                    )}
                    <Icon
                      className={cn("h-4 w-4 shrink-0", active ? "text-glow" : "text-muted")}
                      strokeWidth={active ? 2.4 : 2}
                    />
                    {n.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-line/70 pt-3">
              <div className="flex items-center gap-2 px-2">
                <span className="h-2 w-2 rounded-full bg-ok" />
                <span className="font-mono text-[11px] text-muted">Data lokal · tersimpan</span>
              </div>
              <p className="px-2 pt-1 font-mono text-[10px] text-muted/60">v0.2 · per akun</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-8">
          <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-30 md:hidden" aria-label="Navigasi seluler">
        <div className="flex items-stretch gap-1 rounded-2xl border border-line/80 bg-panel/95 p-1.5 shadow-overlay backdrop-blur-md">
          {NAV.map((n) => {
            const active = isActive(pathname, n.href);
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href} className="min-w-0 flex-1" aria-current={active ? "page" : undefined}>
                <span
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 outline-none focus-visible:ring-2 focus-visible:ring-glow/60",
                    active ? "text-ink" : "text-muted",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="mobile-active"
                      transition={{ type: "spring", stiffness: 480, damping: 36 }}
                      className="absolute inset-0 rounded-xl border border-glow/30 bg-glow/15"
                    />
                  )}
                  <Icon className={cn("relative h-5 w-5", active && "text-glow")} strokeWidth={active ? 2.4 : 2} />
                  <span className="relative truncate font-mono text-[9px] uppercase tracking-wider">
                    {n.label}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
