import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HomeClient from "./HomeClient";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Find the user's league and redirect there
    const { data: membership } = await supabase
      .from("league_members")
      .select("league_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membership?.league_id) {
      const { data: league } = await supabase
        .from("leagues")
        .select("code")
        .eq("id", membership.league_id)
        .maybeSingle();

      if (league?.code) {
        redirect(`/league/${league.code}`);
      }
    }

    redirect("/auth/setup");
  }

  return <HomeClient />;
}
