import { ambilUser } from "@/lib/auth";
import { getDompetSaya } from "@/lib/actions/dompet";
import { PageHeader } from "@/components/ui/field";
import { DompetManager } from "@/components/dompet-manager";
import { PengaturanClient } from "./_client";

export default async function PengaturanPage() {
  const user = await ambilUser();
  const dompets = user ? await getDompetSaya() : [];
  return (
    <div className="space-y-3">
      <PageHeader
        title="Pengaturan"
        description="akun, dompet, export, tema"
      />
      <PengaturanClient csvHref="/api/export" user={user} />
      <DompetManager initial={dompets} />
    </div>
  );
}
