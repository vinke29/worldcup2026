import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createClient();

  // Email confirmation (token_hash)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "email",
    });
    if (!error) {
      return NextResponse.redirect(new URL("/auth/onboard", origin));
    }
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, origin)
    );
  }

  // OAuth / PKCE code exchange
  if (code) {
    // Debug: list cookie names to diagnose PKCE verifier issue
    const cookieNames = request.cookies.getAll().map(c => c.name).join(", ");

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/auth/onboard", origin));
    }
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(error.message + " [cookies: " + cookieNames + "]")}`, origin)
    );
  }

  return NextResponse.redirect(
    new URL("/auth/login?error=No+auth+code+found+in+callback", origin)
  );
}
