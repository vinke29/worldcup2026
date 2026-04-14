import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createClient();

  // Read setup params (intent, join code) stored as a cookie by GoogleButton
  const setupCookie = request.cookies.get("quiniela_setup")?.value;
  const setupQuery = setupCookie ? decodeURIComponent(setupCookie) : "";

  // Email confirmation (token_hash)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "email",
    });
    if (!error) {
      return redirectToOnboard(origin, setupQuery);
    }
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, origin)
    );
  }

  // OAuth / PKCE code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectToOnboard(origin, setupQuery);
    }
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, origin)
    );
  }

  return NextResponse.redirect(
    new URL("/auth/login?error=No+auth+code+found+in+callback", origin)
  );
}

function redirectToOnboard(origin: string, setupQuery: string) {
  const url = setupQuery
    ? new URL(`/auth/onboard?${setupQuery}`, origin)
    : new URL("/auth/onboard", origin);
  const response = NextResponse.redirect(url);
  // Clear the setup cookie
  response.cookies.set("quiniela_setup", "", { maxAge: 0, path: "/" });
  return response;
}
