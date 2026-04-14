"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const supabase = createClient();
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    // Email confirmation (token_hash) — works across browsers/devices
    if (tokenHash && type) {
      supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "signup" | "email",
      }).then(({ error }) => {
        if (!error) {
          navigateAfterAuth(supabase);
        } else {
          window.location.href = "/auth/login?error=Email+confirmation+failed.+Try+again.";
        }
      });
      return;
    }

    // OAuth (Google) / PKCE code exchange:
    // The browser client auto-detects ?code= and exchanges it using the
    // PKCE verifier it stored earlier. We listen for the SIGNED_IN event
    // which fires after the exchange completes and cookies are set.
    let done = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (done) return;
      if (event === "SIGNED_IN") {
        done = true;
        subscription.unsubscribe();
        clearTimeout(timeout);
        navigateAfterAuth(supabase);
      }
    });

    const timeout = setTimeout(() => {
      if (done) return;
      done = true;
      subscription.unsubscribe();
      window.location.href = "/auth/login?error=Authentication+failed.+Try+again.";
    }, 8000);
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

async function navigateAfterAuth(supabase: ReturnType<typeof createClient>) {
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
