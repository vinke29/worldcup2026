import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MOCK_LEAGUE, type Outcome, type Member } from "@/lib/mock-data";
import LeagueClient from "./LeagueClient";

const PREVIEW_CODE = "BANDA26";

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  // ── Preview mode — no auth required ─────────────────────────────────────────
  if (code === PREVIEW_CODE) {
    return (
      <LeagueClient
        code={code}
        leagueName={MOCK_LEAGUE.name}
        currentUserId="u1"
        initialPredictions={{ "a1-1": "home", "a1-2": "draw", "j1-1": "home", "i1-1": "home" }}
        initialScorePicks={{ "a1-1": { home: 2, away: 0 }, "j1-1": { home: 2, away: 0 } }}
        members={MOCK_LEAGUE.members}
        isPreview
      />
    );
  }

  // ── Authenticated routes ─────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=/league/${code}`);
  }

  // Fetch the league by code
  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, code")
    .eq("code", code)
    .maybeSingle();

  if (!league) redirect("/auth/setup");

  // Fetch current user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar")
    .eq("id", user.id)
    .maybeSingle();

  // Fetch all league members + their profiles
  const { data: memberRows } = await supabase
    .from("league_members")
    .select("user_id, profiles(name, avatar)")
    .eq("league_id", league.id);

  const memberIds = (memberRows ?? []).map((r) => r.user_id);

  // Fetch all predictions and score picks for this league in two queries
  const [{ data: allPredictions }, { data: allScorePicks }] = await Promise.all([
    supabase
      .from("predictions")
      .select("user_id, match_id, outcome")
      .in("user_id", memberIds),
    supabase
      .from("score_picks")
      .select("user_id, match_id, home_score, away_score")
      .in("user_id", memberIds),
  ]);

  // Build Member[] objects for the leaderboard
  const members: Member[] = (memberRows ?? []).map((row) => {
    const preds: Record<string, Outcome> = {};
    const picks: Record<string, { home: number; away: number }> = {};

    for (const p of allPredictions ?? []) {
      if (p.user_id === row.user_id) preds[p.match_id] = p.outcome as Outcome;
    }
    for (const sp of allScorePicks ?? []) {
      if (sp.user_id === row.user_id) {
        picks[sp.match_id] = { home: sp.home_score, away: sp.away_score };
      }
    }

    // Supabase returns the joined row as an object or array depending on cardinality
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.user_id,
      name: p?.name ?? "Unknown",
      avatar: p?.avatar ?? "?",
      points: 0,
      correct: 0,
      total: 0,
      predictions: preds,
      scorePicks: picks,
    };
  });

  // Extract current user's predictions from the member list (already fetched above)
  const myMember = members.find((m) => m.id === user.id);

  return (
    <LeagueClient
      code={code}
      leagueName={league.name}
      currentUserId={user.id}
      initialPredictions={myMember?.predictions ?? {}}
      initialScorePicks={myMember?.scorePicks ?? {}}
      members={members}
    />
  );
}
