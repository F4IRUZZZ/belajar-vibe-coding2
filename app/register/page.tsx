import { redirect } from "next/navigation";

// Pendaftaran menyatu dengan login Google (akun dibuat otomatis).
export default function RegisterPage() {
  redirect("/login");
}
