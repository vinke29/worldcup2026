import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { after } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

// Step 2 of 2: after the browser round-trip from /auth/callback, the session
// cookies are now in the request. We can safely call getUser() and DB queries.
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", origin));
  }

  // Welcome email for brand-new signups (account < 5 min old), non-blocking.
  if (Date.now() - new Date(user.created_at).getTime() < 5 * 60 * 1000) {
    const name =
      (user.user_metadata?.name as string | undefined) ?? user.email ?? "";
    after(() => sendWelcomeEmail(user.email!, name).catch(() => {}));
  }

  // Already in a league (e.g. re-confirming email) — go straight there.
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

  // Read the intent stored in metadata at signup time.
  // For Google OAuth, metadata won't have these — fall back to query params
  // (persisted via localStorage → callback page).
  const meta = user.user_metadata ?? {};
  const qs = new URL(request.url).searchParams;
  const intent = (meta.pending_intent as string) ?? qs.get("intent") ?? "create";
  const joinCode = ((meta.pending_join_code as string) ?? qs.get("code") ?? "").trim().toUpperCase();
  const leagueName = ((meta.pending_league_name as string) ?? qs.get("leagueName") ?? "").trim();
  const mode = (meta.pending_league_mode as string) ?? qs.get("mode") ?? "entire_tournament";

  // ── Join flow ──────────────────────────────────────────────────────────────
  if (intent === "join" && joinCode) {
    const { data: league } = await supabase
      .from("leagues")
      .select("id, code")
      .eq("code", joinCode)
      .maybeSingle();

    if (league) {
      await supabase
        .from("league_members")
        .upsert({ league_id: league.id, user_id: user.id });
      return NextResponse.redirect(new URL(`/league/${league.code}`, origin));
    }

    // Code not found — send to setup with join tab open and code pre-filled.
    const params = new URLSearchParams({ intent: "join", code: joinCode });
    return NextResponse.redirect(new URL(`/auth/setup?${params}`, origin));
  }

  // ── Create flow ────────────────────────────────────────────────────────────
  if (leagueName) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase
        .from("leagues")
        .select("code")
        .eq("code", code)
        .maybeSingle();
      if (!data) break;
      code = Array.from({ length: 6 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join("");
    }
    const safeMode = ["phase_by_phase", "entire_tournament"].includes(mode)
      ? mode
      : "entire_tournament";
    const { data: league } = await supabase
      .from("leagues")
      .insert({ name: leagueName, code, created_by: user.id, mode: safeMode })
      .select("id, code")
      .single();
    if (league) {
      await supabase
        .from("league_members")
        .insert({ league_id: league.id, user_id: user.id });
      return NextResponse.redirect(new URL(`/league/${league.code}`, origin));
    }
  }

  // Fallback: send to setup with params pre-filled if available.
  const setupParams = new URLSearchParams();
  if (intent && intent !== "create") setupParams.set("intent", intent);
  if (joinCode) setupParams.set("code", joinCode);
  if (leagueName) setupParams.set("leagueName", leagueName);
  if (mode && mode !== "entire_tournament") setupParams.set("mode", mode);
  const qs = setupParams.toString();
  return NextResponse.redirect(
    new URL(`/auth/setup${qs ? `?${qs}` : ""}`, origin)
  );
}
