"use client";
import { useState } from "react";
import { Chrome } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function LoginClient() {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const masukGoogle = async () => {
    setErr("");
    setBusy(true);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menghubungi Google");
      setBusy(false);
    }
  };

  return (
    <Card className="mx-auto mt-10 max-w-sm">
      <CardContent className="space-y-3 p-5">
        <h1 className="text-lg font-semibold">Masuk</h1>
        <p className="text-sm text-muted">
          Satu akun Google dipakai rame-rame serumah. Data lama yang emailnya sama tersambung otomatis.
        </p>
        {err && <p role="alert" className="text-sm text-bad">{err}</p>}
        <Button onClick={masukGoogle} disabled={busy} className="w-full">
          <Chrome className="h-4 w-4" />
          {busy ? "Membuka Google…" : "Masuk dengan Google"}
        </Button>
      </CardContent>
    </Card>
  );
}
