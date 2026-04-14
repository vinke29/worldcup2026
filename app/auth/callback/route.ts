import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Handles two flows:
// 1. token_hash (preferred): email template links directly here with ?token_hash=&type=signup
//    No PKCE verifier cookie needed — works across browsers/devices.
// 2. code (PKCE fallback): Supabase redirects here with ?code= after its own verify step.
//    Requires the verifier cookie from the original signup browser — can fail on mobile.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "email",
    });
    if (!error) {
      return NextResponse.redirect(new URL("/auth/onboard", origin));
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/auth/onboard", origin));
    }
  }

  return NextResponse.redirect(
    new URL("/auth/login?error=Email+confirmation+failed.+Try+signing+in.", origin)
  );
}
