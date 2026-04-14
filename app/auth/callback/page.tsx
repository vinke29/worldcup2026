"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    // Create a dedicated client with auto-detection disabled so we control
    // exactly when the code exchange happens (no double-exchange race).
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { detectSessionInUrl: false } }
    );

    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const code = searchParams.get("code");

    async function handle() {
      // Email confirmation (token_hash) — works across browsers/devices
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "signup" | "email",
        });
        if (!error) return navigateAfterAuth(supabase);
        window.location.href = "/auth/login?error=Email+confirmation+failed.+Try+again.";
        return;
      }

      // OAuth (Google) or PKCE email — exchange code explicitly
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) return navigateAfterAuth(supabase);
      }

      window.location.href = "/auth/login?error=Authentication+failed.+Try+again.";
    }

    handle();
  }, [searchParams]);

  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#0B1E0D" }}
    >
      <p className="text-sm" style={{ color: "#7A9B84" }}>
        Signing you in…
      </p>
    </main>
  );
}

async function navigateAfterAuth(supabase: ReturnType<typeof createBrowserClient>) {
  // Restore setup params (intent, join code) saved before OAuth redirect
  const setup = localStorage.getItem("quiniela_setup");
  localStorage.removeItem("quiniela_setup");

  // Check if user is already in a league
  const { data: { user } } = await supabase.auth.getUser();
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
        window.location.href = `/league/${league.code}`;
        return;
      }
    }
  }

  // Not in a league yet — send to setup with any join params
  const url = setup ? `/auth/setup?${setup}` : "/auth/setup";
  window.location.href = url;
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
