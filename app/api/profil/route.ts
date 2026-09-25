import { ambilUser } from "@/lib/auth";

// Profil ringkas untuk avatar header (tanpa data sensitif).
export async function GET() {
  const user = await ambilUser();
  if (!user) return Response.json({ error: "Masuk dulu" }, { status: 401 });
  return Response.json({ nama: user.username, email: user.email, image: user.image });
}
