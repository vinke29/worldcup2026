"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handle() {
      const supabase = createClient();
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const code = searchParams.get("code");

      // Email confirmation (token_hash) — works across browsers/devices
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "signup" | "email",
        });
        if (!error) {
          router.replace("/auth/onboard");
          return;
        }
      }

      // OAuth (Google) or PKCE email — exchange code using the browser client
      // which has access to the PKCE verifier it stored locally
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace("/auth/onboard");
          return;
        }
      }

      router.replace("/auth/login?error=Authentication+failed.+Try+again.");
    }

    handle();
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
