"use client";
import { useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { register } from "@/lib/actions/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

function skorPassword(s: string): { label: string; n: number } {
  let n = 0;
  if (s.length >= 8) n++;
  if (/[A-Z]/.test(s)) n++;
  if (/[0-9]/.test(s)) n++;
  if (/[^A-Za-z0-9]/.test(s)) n++;
  if (s.length >= 12) n++;
  return { n, label: ["Sangat lemah", "Lemah", "Sedang", "Kuat", "Kuat", "Sangat kuat"][n] };
}

export function RegisterClient() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("keluarga");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const skor = skorPassword(password);

  const submit = async () => {
    setErr("");
    if (password !== confirm) {
      setErr("Konfirmasi password tidak sama");
      return;
    }
    setBusy(true);
    try {
      await register({ email, username, password, role: role === "pribadi" ? "pribadi" : "keluarga" });
    } catch (e) {
      if (e instanceof Error && !e.message.startsWith("NEXT_REDIRECT")) {
        setErr(e.message);
        setBusy(false);
      }
    }
  };

  return (
    <Card className="mx-auto mt-10 max-w-sm">
      <CardContent className="space-y-3 p-5">
        <h1 className="text-lg font-semibold">Daftar</h1>
        <p className="text-sm text-muted">Role keluarga = 1 email dipakai serumah.</p>
        <Field label="Email" htmlFor="rg-email">
          <Input
            id="rg-email"
            type="email"
            autoComplete="email"
            placeholder="ibu@contoh.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Username (min 3)" htmlFor="rg-username">
          <Input
            id="rg-username"
            autoComplete="username"
            placeholder="Ibu"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
        <Field label="Role" htmlFor="rg-role">
          <Select
            id="rg-role"
            ariaLabel="Role akun"
            value={role}
            onChange={setRole}
            options={[
              { value: "keluarga", label: "Keluarga (dipakai rame-rame)" },
              { value: "pribadi", label: "Pribadi (sendiri)" },
            ]}
          />
        </Field>
        <Field label="Password (min 8 + huruf + angka)" htmlFor="rg-password">
          <Input
            id="rg-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password && (
            <p className="mt-1 font-mono text-[11px] text-muted" aria-live="polite">
              Kekuatan: {skor.label} ({skor.n}/5)
            </p>
          )}
        </Field>
        <Field label="Ulangi password" htmlFor="rg-confirm">
          <Input
            id="rg-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </Field>
        {err && <p role="alert" className="text-sm text-bad">{err}</p>}
        <Button onClick={submit} disabled={busy} className="w-full">
          <UserPlus className="h-4 w-4" />
          {busy ? "Mendaftar…" : "Daftar"}
        </Button>
        <p className="text-center text-sm text-muted">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-irish-soft hover:text-ink">
            Masuk
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
