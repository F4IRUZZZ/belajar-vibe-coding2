import { redirect } from "next/navigation";
import { ambilUser } from "@/lib/auth";
import { getJadwalSaya } from "@/lib/actions/jadwal";
import { PageHeader } from "@/components/ui/field";
import { JadwalClient } from "./_client";

export default async function JadwalPage() {
  const user = await ambilUser();
  if (!user) redirect("/login");
  const rows = await getJadwalSaya();
  return (
    <div>
      <PageHeader
        title="Rutin"
        description="gaji, langganan, iuran — tercatat otomatis"
      />
      <JadwalClient initial={JSON.parse(JSON.stringify(rows))} />
    </div>
  );
}
