import { PageHeader } from "@/components/ui/field";
import { PengaturanClient } from "./_client";

export default function PengaturanPage() {
  return (
    <div>
      <PageHeader
        title="Pengaturan"
        description="administrasi, export, tema"
      />
      <PengaturanClient csvHref="/api/export" />
    </div>
  );
}
