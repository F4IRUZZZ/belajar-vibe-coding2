import { ambilUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/field";
import { PengaturanClient } from "./_client";

export default async function PengaturanPage() {
  const user = await ambilUser();
  return (
    <div>
      <PageHeader
        title="Pengaturan"
        description="akun, export, tema"
      />
      <PengaturanClient csvHref="/api/export" user={user} />
    </div>
  );
}
