"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function CallbackHandler() {
  const router = useRouter();
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
          router.replace("/auth/onboard");
        } else {
          router.replace("/auth/login?error=Email+confirmation+failed.+Try+again.");
        }
      });
      return;
    }

    // OAuth (Google) / PKCE code exchange:
    // The browser client auto-detects ?code= in the URL on init and exchanges
    // it using the PKCE verifier it stored locally. We just listen for the result.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        cleanup();
        router.replace("/auth/onboard");
      }
    });

    // Race: session might already be established by the time the listener fires
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        cleanup();
        router.replace("/auth/onboard");
      }
    });

    // Timeout fallback
    const timeout = setTimeout(() => {
      cleanup();
      router.replace("/auth/login?error=Authentication+failed.+Try+again.");
    }, 5000);

    function cleanup() {
      subscription.unsubscribe();
      clearTimeout(timeout);
    }
  }, [router, searchParams]);

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

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
