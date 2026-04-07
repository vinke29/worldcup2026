import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if they already have a league
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
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
            .single();
          if (league?.code) {
            return NextResponse.redirect(new URL(`/league/${league.code}`, origin));
          }
        }
      }

      // Forward setupQuery that was embedded in the callback URL at signup time
      const setup = searchParams.get("setup");
      const setupDest = setup ? `/auth/setup?${setup}` : "/auth/setup";
      return NextResponse.redirect(new URL(setupDest, origin));
    }
  }

  return NextResponse.redirect(
    new URL("/auth/login?error=Email+confirmation+failed.+Try+signing+in.", origin)
  );
}
