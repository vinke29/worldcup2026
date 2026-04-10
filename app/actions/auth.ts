"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function login(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) return error.message;

  // Look up the user's league to redirect them there
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Authentication failed.";

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
    if (league?.code) redirect(`/league/${league.code}`);
  }

  // No league yet — forward any invite params so they can join
  const setupQuery = (formData.get("setupQuery") as string | null) ?? "";
  redirect(setupQuery ? `/auth/setup?${setupQuery}` : "/auth/setup");
}

export async function signup(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient();

  const name = (formData.get("name") as string).trim();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name) return "Name is required.";
  if (password.length < 6) return "Password must be at least 6 characters.";

  // Derive avatar initials from name
  const words = name.split(/\s+/);
  const avatar =
    words.length >= 2
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

  // Parse setup info so we can store it in user metadata and read it back in the callback.
  // We can't put it in emailRedirectTo (Supabase PKCE validates the redirect URI strictly).
  const setupQuery = (formData.get("setupQuery") as string | null) ?? "";
  const sp = new URLSearchParams(setupQuery);

  // Pass name + avatar as user metadata — a DB trigger picks this up and
  // creates the profiles row (security definer, so it bypasses RLS).
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        avatar,
        // Stash setup params so the callback can auto-create/join the league
        pending_intent:       sp.get("intent")      ?? "create",
        pending_league_name:  sp.get("leagueName")  ?? "",
        pending_league_mode:  sp.get("mode")        ?? "entire_tournament",
        pending_join_code:    sp.get("code")        ?? "",
      },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });
  if (error) return error.message;
  if (!data.user) return "Signup failed — please try again.";

  if (!data.session) {
    // No session yet — Supabase sent a confirmation email
    redirect(`/auth/confirm?email=${encodeURIComponent(email)}`);
  }

  redirect(setupQuery ? `/auth/setup?${setupQuery}` : "/auth/setup");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function forgotPassword(
  _prevState: { ok: boolean } | null,
  formData: FormData
): Promise<{ ok: boolean }> {
  const email = (formData.get("email") as string).trim();
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset-callback`,
  });

  // Always succeed — don't reveal whether the email exists
  return { ok: true };
}

export async function resetPassword(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const password = formData.get("password") as string;
  if (password.length < 6) return "Password must be at least 6 characters.";

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return error.message;

  redirect("/auth/login?message=Password+updated.+Sign+in+with+your+new+password.");
}
