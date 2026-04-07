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
        // If they already have a league (e.g. re-confirming), go straight there
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

        // Auto-create or auto-join using the setup params from signup
        const setup = searchParams.get("setup");
        if (setup) {
          const sp = new URLSearchParams(setup);
          const intent = sp.get("intent") ?? "create";

          if (intent === "join") {
            const inviteCode = sp.get("code")?.trim().toUpperCase();
            if (inviteCode) {
              const { data: league } = await supabase
                .from("leagues").select("id, code").eq("code", inviteCode).maybeSingle();
              if (league) {
                await supabase.from("league_members").upsert({ league_id: league.id, user_id: user.id });
                return NextResponse.redirect(new URL(`/league/${league.code}`, origin));
              }
            }
          } else {
            // Create
            const leagueName = sp.get("leagueName")?.trim();
            const mode = sp.get("mode") ?? "phase_by_phase";
            if (leagueName) {
              const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
              let code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
              for (let i = 0; i < 5; i++) {
                const { data } = await supabase.from("leagues").select("code").eq("code", code).maybeSingle();
                if (!data) break;
                code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
              }
              const safeMode = ["phase_by_phase", "entire_tournament"].includes(mode) ? mode : "phase_by_phase";
              const { data: league } = await supabase
                .from("leagues")
                .insert({ name: leagueName, code, created_by: user.id, mode: safeMode })
                .select("id, code").single();
              if (league) {
                await supabase.from("league_members").insert({ league_id: league.id, user_id: user.id });
                return NextResponse.redirect(new URL(`/league/${league.code}`, origin));
              }
            }
          }
        }
      }

      // Fallback: send to setup page (preserving any setup params)
      const setup = searchParams.get("setup");
      const setupDest = setup ? `/auth/setup?${setup}` : "/auth/setup";
      return NextResponse.redirect(new URL(setupDest, origin));
    }
  }

  return NextResponse.redirect(
    new URL("/auth/login?error=Email+confirmation+failed.+Try+signing+in.", origin)
  );
}
