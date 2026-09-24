"use client";
import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export function InstallButton() {
  const [tunda, setTunda] = useState<PromptEvent | null>(null);
  const [terpasang, setTerpasang] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) setTerpasang(true);
    const siap = (e: Event) => {
      e.preventDefault();
      setTunda(e as PromptEvent);
    };
    const sudah = () => {
      setTerpasang(true);
      setTunda(null);
    };
    window.addEventListener("beforeinstallprompt", siap);
    window.addEventListener("appinstalled", sudah);
    return () => {
      window.removeEventListener("beforeinstallprompt", siap);
      window.removeEventListener("appinstalled", sudah);
    };
  }, []);

  if (terpasang) return <span className="shrink-0 font-mono text-[12px] text-ok">Terpasang</span>;
  if (!tunda) {
    return (
      <span className="max-w-64 shrink-0 text-right text-[12px] text-muted">
        Buka di Chrome Android lalu menu ⋮, “Add to Home screen”.
      </span>
    );
  }
  return (
    <Button
      variant="secondary"
      className="shrink-0"
      onClick={async () => {
        await tunda.prompt();
        const { outcome } = await tunda.userChoice;
        if (outcome === "accepted") setTunda(null);
      }}
    >
      <Smartphone className="h-4 w-4" />
      Install
    </Button>
  );
}
