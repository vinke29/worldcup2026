"use server";

import { createClient } from "@/lib/supabase/server";
import type { Outcome } from "@/lib/mock-data";

export async function savePrediction(
  matchId: string,
  outcome: Outcome
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("predictions").upsert({
    user_id: user.id,
    match_id: matchId,
    outcome,
  });
}

export async function saveScorePick(
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("score_picks").upsert({
    user_id: user.id,
    match_id: matchId,
    home_score: homeScore,
    away_score: awayScore,
  });
}
