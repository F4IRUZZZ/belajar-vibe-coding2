import { redirect } from "next/navigation";
import { ambilUser } from "@/lib/auth";
import { LoginClient } from "./_client";

export default async function LoginPage() {
  if (await ambilUser()) redirect("/");
  return (
    <div>
      <LoginClient />
    </div>
  );
}
