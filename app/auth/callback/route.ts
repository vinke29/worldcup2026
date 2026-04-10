import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Step 1 of 2: exchange the PKCE code for a session and redirect to /auth/onboard.
// We intentionally do NOT query the database here — the session cookies set by
// exchangeCodeForSession live in the *response* headers and aren't readable by the
// same supabase client instance within this request. The browser delivers them on
// the next request (/auth/onboard), where getUser() and DB queries work correctly.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/auth/onboard", origin));
    }
  }

  return NextResponse.redirect(
    new URL("/auth/login?error=Email+confirmation+failed.+Try+signing+in.", origin)
  );
}
