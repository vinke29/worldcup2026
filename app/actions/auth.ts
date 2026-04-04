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

  redirect("/auth/setup");
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

  // Pass name + avatar as user metadata — a DB trigger picks this up and
  // creates the profiles row (security definer, so it bypasses RLS).
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, avatar } },
  });
  if (error) return error.message;
  if (!data.user) return "Signup failed — please try again.";

  redirect("/auth/setup");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
