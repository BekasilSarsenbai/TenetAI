import { redirect } from "next/navigation";
import { TenetApp } from "@/components/TenetApp";
import type { AppUser } from "@/lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_READY = url.startsWith("https://") && key.startsWith("eyJ");

const DEMO_USER: AppUser = {
  id: "demo",
  email: "demo@tenet.app",
  name: "Beka",
};

export default async function Page() {
  if (!SUPABASE_READY) {
    // Demo mode: Supabase not configured — show app with demo user.
    return <TenetApp user={DEMO_USER} />;
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const appUser: AppUser = {
    id: user.id,
    email: user.email ?? "",
    name:
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email?.split("@")[0] ??
      "User",
  };

  return <TenetApp user={appUser} />;
}
