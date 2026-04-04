"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function createLeague(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Not authenticated.";

  const name = (formData.get("leagueName") as string).trim();
  if (!name) return "League name is required.";

  // Ensure the generated code is unique
  let code = generateCode();
  for (let i = 0; i < 5; i++) {
    const { data } = await supabase
      .from("leagues")
      .select("code")
      .eq("code", code)
      .maybeSingle();
    if (!data) break;
    code = generateCode();
  }

  const { data: league, error } = await supabase
    .from("leagues")
    .insert({ name, code, created_by: user.id })
    .select("id, code")
    .single();

  if (error) return error.message;

  const { error: memberError } = await supabase
    .from("league_members")
    .insert({ league_id: league.id, user_id: user.id });

  if (memberError) return memberError.message;

  redirect(`/league/${league.code}`);
}

export async function joinLeague(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Not authenticated.";

  const code = (formData.get("code") as string).trim().toUpperCase();
  if (!code) return "Invite code is required.";

  const { data: league, error } = await supabase
    .from("leagues")
    .select("id, code")
    .eq("code", code)
    .maybeSingle();

  if (error) return error.message;
  if (!league) return "League not found. Check the invite code and try again.";

  // Upsert in case they're already a member
  const { error: memberError } = await supabase
    .from("league_members")
    .upsert({ league_id: league.id, user_id: user.id });

  if (memberError) return memberError.message;

  redirect(`/league/${league.code}`);
}
