"use server";

import { createClient } from "@/lib/supabase/server";
import { getActualScores } from "@/app/actions/scores";
import { isWriteLocked } from "@/lib/lock";
import type { Outcome, LeagueMode } from "@/lib/mock-data";

export type SaveResult = { ok: true } | { ok: false; reason: "unauthenticated" | "locked" | "error" };

async function leagueMode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  leagueCode: string,
): Promise<LeagueMode> {
  const { data } = await supabase
    .from("leagues")
    .select("mode")
    .eq("code", leagueCode)
    .single();
  return (data?.mode ?? "entire_tournament") as LeagueMode;
}

export async function savePrediction(
  matchId: string,
  outcome: Outcome,
  leagueCode: string,
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const [mode, actualScores] = await Promise.all([
    leagueMode(supabase, leagueCode),
    getActualScores(),
  ]);
  if (isWriteLocked(mode, matchId, actualScores)) return { ok: false, reason: "locked" };

  const { error } = await supabase.from("predictions").upsert({
    user_id: user.id,
    match_id: matchId,
    outcome,
  });
  if (error) return { ok: false, reason: "error" };
  return { ok: true };
}

export async function saveScorePick(
  matchId: string,
  homeScore: number,
  awayScore: number,
  leagueCode: string,
  pensWinner?: "home" | "away",
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const [mode, actualScores] = await Promise.all([
    leagueMode(supabase, leagueCode),
    getActualScores(),
  ]);
  if (isWriteLocked(mode, matchId, actualScores)) return { ok: false, reason: "locked" };

  const { error } = await supabase.from("score_picks").upsert({
    user_id: user.id,
    match_id: matchId,
    home_score: homeScore,
    away_score: awayScore,
    pens_winner: pensWinner ?? null,
  });
  if (error) return { ok: false, reason: "error" };
  return { ok: true };
}
