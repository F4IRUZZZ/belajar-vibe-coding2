"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Download, LogOut, Monitor, Moon, Smartphone, Sun, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { InstallButton } from "@/components/install-button";
import { CsvImpor } from "@/components/csv-impor";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented";
import { Sk } from "@/components/skeletons";
import { cn } from "@/lib/utils";

function SettingRow({
  icon,
  title,
  description,
  control,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  control?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-accent text-muted">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-muted">{description}</div>
        </div>
        {control}
      </CardContent>
    </Card>
  );
}

export function PengaturanClient({
  csvHref,
  hutangHref,
  user,
}: {
  csvHref: string;
  hutangHref: string;
  user: { email: string; username: string; role: string } | null;
}) {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const value = theme === "light" || theme === "dark" || theme === "system" ? theme : "dark";
  const desc = !mounted
    ? "Gelap — bawaan aplikasi ini."
    : value === "system"
      ? `Mengikuti sistem (${resolvedTheme === "light" ? "terang" : "gelap"} saat ini).`
      : value === "light"
        ? "Terang."
        : "Gelap — bawaan aplikasi ini.";

  return (
    <div className="space-y-3">
      <SettingRow
        icon={<UserRound className="h-4 w-4" />}
        title={user ? `${user.username} · ${user.role}` : "Akun"}
        description={user ? user.email : "Belum masuk"}
        control={
          <Button
            variant="secondary"
            className="shrink-0"
            onClick={async () => {
              if (!confirm("Keluar dari akun ini?")) return;
              await authClient.signOut();
              router.push("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            Keluar
          </Button>
        }
      />
      <SettingRow
        icon={<Download className="h-4 w-4" />}
        title="Export CSV"
        description="Unduh transaksi lengkap + hutang untuk spreadsheet."
        control={
          <span className="flex shrink-0 gap-1">
            <a href={csvHref} className={cn(buttonVariants({ variant: "secondary" }))}>
              <Download className="h-4 w-4" />
              Transaksi
            </a>
            <a href={hutangHref} className={cn(buttonVariants({ variant: "secondary" }))}>
              <Download className="h-4 w-4" />
              Hutang
            </a>
          </span>
        }
      />
      <SettingRow
        icon={<Download className="h-4 w-4" />}
        title="Impor CSV"
        description="Format: tanggal,jenis,jumlah,kategori. Maks 1000 baris."
        control={<CsvImpor />}
      />
      <SettingRow
        icon={resolvedTheme === "light" && mounted ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        title="Tema"
        description={desc}
        control={
          mounted ? (
            <SegmentedControl
              id="tema"
              ariaLabel="Pilih tema"
              value={value}
              onChange={setTheme}
              options={[
                { value: "system", label: "Sistem", icon: Monitor },
                { value: "dark", label: "Gelap", icon: Moon },
                { value: "light", label: "Terang", icon: Sun },
              ]}
              className="w-64"
            />
          ) : (
            <Sk className="h-11 w-64 rounded-xl" />
          )
        }
      />
      <SettingRow
        icon={<Smartphone className="h-4 w-4" />}
        title="Install sebagai aplikasi HP"
        description="Bisa dibuka offline (menu + data terakhir). Data baru butuh internet."
        control={<InstallButton />}
      />
    </div>
  );
}
