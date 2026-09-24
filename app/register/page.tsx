import { redirect } from "next/navigation";
import { ambilUser } from "@/lib/auth";
import { RegisterClient } from "./_client";

export default async function RegisterPage() {
  if (await ambilUser()) redirect("/");
  return (
    <div>
      <RegisterClient />
    </div>
  );
}
