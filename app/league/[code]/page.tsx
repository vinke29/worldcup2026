import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MOCK_LEAGUE, type Outcome, type Member } from "@/lib/mock-data";
import { getActualScores } from "@/app/actions/scores";
import LeagueClient from "./LeagueClient";
import type { LeagueMode } from "@/lib/mock-data";

const PREVIEW_CODE = "BANDA26";

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  // ── Auth check first — authenticated users always get real data ─────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Preview mode — unauthenticated visitors only ──────────────────────────────
  if (!user && code === PREVIEW_CODE) {
    const actualScores = await getActualScores();
    return (
      <LeagueClient
        code={code}
        leagueName={MOCK_LEAGUE.name}
        currentUserId="u1"
        initialPredictions={{}}
        initialScorePicks={{}}
        members={MOCK_LEAGUE.members}
        actualScores={actualScores}
        mode="phase_by_phase"
        isPreview
      />
    );
  }

  if (!user) {
    redirect(`/auth/login?next=/league/${code}`);
  }

  // Fetch the league by code
  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, code, mode")
    .eq("code", code)
    .maybeSingle();

  if (!league) redirect("/auth/setup");

  // Fetch league members, predictions, score picks, actual scores, and current user profile in parallel
  const [memberIdsResult, predictionsResult, scorePicksResult, actualScores, profileResult] = await Promise.all([
    supabase
      .from("league_members")
      .select("user_id")
      .eq("league_id", league.id),
    supabase
      .from("predictions")
      .select("user_id, match_id, outcome"),
    supabase
      .from("score_picks")
      .select("user_id, match_id, home_score, away_score, pens_winner"),
    getActualScores(),
    supabase
      .from("profiles")
      .select("id, name, avatar")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  // Ensure current user is always in the member list (safety fallback if join/insert lagged)
  const memberIdsRaw = (memberIdsResult.data ?? []).map((r) => r.user_id);
  const memberIds = memberIdsRaw.includes(user.id)
    ? memberIdsRaw
    : [...memberIdsRaw, user.id];

  // Fetch all profiles for league members in one query
  const { data: profileRows } = await supabase
    .from("profiles")
    .select("id, name, avatar")
    .in("id", memberIds);

  const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]));
  // Ensure current user's profile is always available
  if (profileResult.data) {
    profileMap.set(user.id, profileResult.data);
  }

  // Filter predictions/picks to league members
  const allPredictions = (predictionsResult.data ?? []).filter(p => memberIds.includes(p.user_id));
  const allScorePicks  = (scorePicksResult.data  ?? []).filter(p => memberIds.includes(p.user_id));

  // Build Member[] objects for the leaderboard
  const members: Member[] = memberIds.map((userId) => {
    const preds: Record<string, Outcome> = {};
    const picks: Record<string, { home: number; away: number }> = {};

    for (const p of allPredictions) {
      if (p.user_id === userId) preds[p.match_id] = p.outcome as Outcome;
    }
    for (const sp of allScorePicks) {
      if (sp.user_id === userId) {
        picks[sp.match_id] = {
          home: sp.home_score,
          away: sp.away_score,
          ...(sp.pens_winner ? { pens: sp.pens_winner as "home" | "away" } : {}),
        };
      }
    }

    const profile = profileMap.get(userId);
    return {
      id: userId,
      name: profile?.name ?? "Unknown",
      avatar: profile?.avatar ?? "?",
      points: 0,
      correct: 0,
      exact: 0,
      total: 0,
      picked: 0,
      predictions: preds,
      scorePicks: picks,
    };
  });

  const myMember = members.find((m) => m.id === user.id);
  const leagueMode = (league.mode ?? "phase_by_phase") as LeagueMode;

  return (
    <LeagueClient
      code={code}
      leagueName={league.name}
      currentUserId={user.id}
      initialPredictions={myMember?.predictions ?? {}}
      initialScorePicks={myMember?.scorePicks ?? {}}
      members={members}
      actualScores={actualScores}
      mode={leagueMode}
    />
  );
}
