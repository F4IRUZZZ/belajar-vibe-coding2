import { redirect } from "next/navigation";
import { ambilUser } from "@/lib/auth";
import { getHutang } from "@/lib/store";
import { PageHeader } from "@/components/ui/field";
import { HutangClient } from "./_client";

export default async function HutangPage() {
  const user = await ambilUser();
  if (!user) redirect("/login");
  const { hutang, piutang } = await getHutang(user.id);
  return (
    <div>
      <PageHeader
        title="Hutang"
        description="cicil sebagian, lunaskan → otomatis ke kas"
      />
      <HutangClient hutang={JSON.parse(JSON.stringify(hutang))} piutang={JSON.parse(JSON.stringify(piutang))} />
    </div>
  );
}
