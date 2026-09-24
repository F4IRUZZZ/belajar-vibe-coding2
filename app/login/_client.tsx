"use client";
import { useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      await login({ email, password });
    } catch (e) {
      // redirect() Next melempar; selain itu = error asli
      if (e instanceof Error && !e.message.startsWith("NEXT_REDIRECT")) {
        setErr(e.message);
        setBusy(false);
      }
    }
  };

  return (
    <Card className="mx-auto mt-10 max-w-sm">
      <CardContent className="space-y-3 p-5">
        <h1 className="text-lg font-semibold">Masuk</h1>
        <p className="text-sm text-muted">Satu email dipakai rame-rame serumah untuk role keluarga.</p>
        <Field label="Email" htmlFor="in-email">
          <Input
            id="in-email"
            type="email"
            autoComplete="email"
            placeholder="ibu@contoh.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="in-password">
          <Input
            id="in-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </Field>
        {err && <p role="alert" className="text-sm text-bad">{err}</p>}
        <Button onClick={submit} disabled={busy} className="w-full">
          <LogIn className="h-4 w-4" />
          {busy ? "Memeriksa…" : "Masuk"}
        </Button>
        <p className="text-center text-sm text-muted">
          Belum punya akun?{" "}
          <Link href="/register" className="text-irish-soft hover:text-ink">
            Daftar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
