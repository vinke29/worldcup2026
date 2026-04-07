"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ADMIN_USER_ID = process.env.ADMIN_USER_ID;

export async function saveScore(
  matchId: string,
  homeScore: number,
  awayScore: number,
  pensWinner?: "home" | "away" | null,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== ADMIN_USER_ID) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase.from("match_scores").upsert(
    {
      match_id: matchId,
      home_score: homeScore,
      away_score: awayScore,
      pens_winner: pensWinner ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "match_id" }
  );
  if (error) throw error;

  revalidatePath("/league", "layout");
}

export async function getActualScores(): Promise<Record<string, { home: number; away: number; pens?: "home" | "away" }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_scores")
    .select("match_id, home_score, away_score, pens_winner");

  const result: Record<string, { home: number; away: number; pens?: "home" | "away" }> = {};
  for (const row of data ?? []) {
    result[row.match_id] = {
      home: row.home_score,
      away: row.away_score,
      ...(row.pens_winner ? { pens: row.pens_winner as "home" | "away" } : {}),
    };
  }
  return result;
}
