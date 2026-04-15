"use server";

import { createClient } from "@/lib/supabase/server";

/** Save the current user's answer for a bonus question. */
export async function saveBonusPick(questionKey: string, answer: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("bonus_picks").upsert(
    { user_id: user.id, question_key: questionKey, answer, updated_at: new Date().toISOString() },
    { onConflict: "user_id,question_key" },
  );
}

/** Get the current user's bonus picks. */
export async function getMyBonusPicks(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data } = await supabase
    .from("bonus_picks")
    .select("question_key, answer")
    .eq("user_id", user.id);

  return Object.fromEntries((data ?? []).map((r) => [r.question_key, r.answer]));
}

/** Get bonus picks for all specified users (used in page.tsx for standings). */
export async function getAllBonusPicks(
  userIds: string[],
): Promise<Record<string, Record<string, string>>> {
  if (userIds.length === 0) return {};
  const supabase = await createClient();

  const { data } = await supabase
    .from("bonus_picks")
    .select("user_id, question_key, answer")
    .in("user_id", userIds);

  const result: Record<string, Record<string, string>> = {};
  for (const row of data ?? []) {
    if (!result[row.user_id]) result[row.user_id] = {};
    result[row.user_id][row.question_key] = row.answer;
  }
  return result;
}

/** Get the admin-set correct answers for bonus questions. */
export async function getBonusAnswers(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bonus_answers")
    .select("question_key, answer");

  return Object.fromEntries((data ?? []).map((r) => [r.question_key, r.answer]));
}

/** Admin: set the correct answer for a bonus question. */
export async function saveBonusAnswer(questionKey: string, answer: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("bonus_answers").upsert(
    { question_key: questionKey, answer, updated_at: new Date().toISOString() },
    { onConflict: "question_key" },
  );
}
