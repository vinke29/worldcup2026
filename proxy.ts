import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not add any logic between createServerClient and getUser.
  // A simple mistake here can make it very hard to debug session issues.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Guard league pages (except the BANDA26 preview)
  if (
    pathname.startsWith("/league/") &&
    pathname !== "/league/BANDA26" &&
    !user
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Guard the setup page — send unauthenticated users to signup (not login)
  // because /auth/setup is only reached via a share link, so the visitor is new.
  if (pathname === "/auth/setup" && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signup";
    const qs = request.nextUrl.searchParams;
    const intent = qs.get("intent");
    const code   = qs.get("code");
    // Clear any stale params from the clone before re-setting
    url.search = "";
    if (intent) url.searchParams.set("intent", intent);
    if (code)   url.searchParams.set("code", code);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|woff2?)$).*)",
  ],
};
