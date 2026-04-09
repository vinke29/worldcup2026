import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { after } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

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
        // Send welcome email for brand-new signups (account < 5 min old).
        // Runs after the response is sent so it doesn't block the redirect.
        if (Date.now() - new Date(user.created_at).getTime() < 5 * 60 * 1000) {
          const name = (user.user_metadata?.name as string | undefined) ?? user.email ?? "";
          after(() => sendWelcomeEmail(user.email!, name).catch(() => {}));
        }

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

        // Auto-create or auto-join using setup info stored in user metadata at signup
        const meta = user.user_metadata ?? {};
        const intent      = (meta.pending_intent      as string) ?? "create";
        const leagueName  = ((meta.pending_league_name as string) ?? "").trim();
        const mode        = (meta.pending_league_mode  as string) ?? "entire_tournament";
        const joinCode    = ((meta.pending_join_code   as string) ?? "").trim().toUpperCase();

        if (intent === "join" && joinCode) {
          const { data: league } = await supabase
            .from("leagues").select("id, code").eq("code", joinCode).maybeSingle();
          if (league) {
            await supabase.from("league_members").upsert({ league_id: league.id, user_id: user.id });
            return NextResponse.redirect(new URL(`/league/${league.code}`, origin));
          }
        } else if (leagueName) {
          const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
          for (let i = 0; i < 5; i++) {
            const { data } = await supabase.from("leagues").select("code").eq("code", code).maybeSingle();
            if (!data) break;
            code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
          }
          const safeMode = ["phase_by_phase", "entire_tournament"].includes(mode) ? mode : "entire_tournament";
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

      // Fallback: send to setup page
      return NextResponse.redirect(new URL("/auth/setup", origin));
    }
  }

  return NextResponse.redirect(
    new URL("/auth/login?error=Email+confirmation+failed.+Try+signing+in.", origin)
  );
}
