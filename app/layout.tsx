import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { SwRegister } from "@/components/sw-register";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Keuangan Keluarga",
  description: "Catatan pendapatan & pengeluaran keluarga.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`h-full antialiased ${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="min-h-full bg-canvas text-ink">
        <SwRegister />
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
