import { redirect } from "next/navigation";
import { ambilUser } from "@/lib/auth";
import { getTargets } from "@/lib/store";
import { PageHeader } from "@/components/ui/field";
import { TargetClient } from "./_client";

export default async function TargetPage() {
  const user = await ambilUser();
  if (!user) redirect("/login");
  const rows = await getTargets(user.id);
  return (
    <div>
      <PageHeader
        title="Target"
        description="nabung bertahap, progres dari pemasukan bertanda"
      />
      <TargetClient initial={JSON.parse(JSON.stringify(rows))} />
    </div>
  );
}
