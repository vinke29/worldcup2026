"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

export async function saveScore(matchId: string, homeScore: number, awayScore: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== ADMIN_USER_ID) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase.from("match_scores").upsert(
    { match_id: matchId, home_score: homeScore, away_score: awayScore, updated_at: new Date().toISOString() },
    { onConflict: "match_id" }
  );
  if (error) throw error;

  // Invalidate all league pages so the next load picks up the new score
  revalidatePath("/league", "layout");
}

export async function getActualScores(): Promise<Record<string, { home: number; away: number }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_scores")
    .select("match_id, home_score, away_score");

  const result: Record<string, { home: number; away: number }> = {};
  for (const row of data ?? []) {
    result[row.match_id] = { home: row.home_score, away: row.away_score };
  }
  return result;
}
