"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Profil = { nama: string; email: string; image: string | null } | null;

function inisial(nama: string): string {
  const huruf = nama.trim().charAt(0).toUpperCase();
  return huruf || "?";
}

export function AvatarProfil() {
  const pathname = usePathname();
  const [profil, setProfil] = useState<Profil>(null);

  useEffect(() => {
    let batal = false;
    fetch("/api/profil")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!batal && j && typeof j.nama === "string") {
          setProfil({ nama: j.nama, email: j.email ?? "", image: j.image ?? null });
        }
      })
      .catch(() => {});
    return () => {
      batal = true;
    };
  }, [pathname]);

  if (!profil) return null;
  return (
    <Link
      href="/pengaturan"
      aria-label={`Akun ${profil.nama}`}
      title={profil.email}
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-accent font-semibold outline-none transition-colors hover:border-muted focus-visible:ring-2 focus-visible:ring-glow/60"
    >
      {profil.image ? (
        // img biasa: URL Google eksternal, tak perlu remotePatterns next/image
        <img src={profil.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span aria-hidden className="text-sm text-irish-soft">
          {inisial(profil.nama)}
        </span>
      )}
    </Link>
  );
}
