import type { Match, Member, Outcome } from "./mock-data";

function actualOutcome(match: Match): Outcome | null {
  if (match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return "home";
  if (match.awayScore > match.homeScore) return "away";
  return "draw";
}

function pointsForPick(
  match: Match,
  prediction: Outcome,
  scorePick?: { home: number; away: number }
): number {
  const actual = actualOutcome(match);
  if (!actual || prediction !== actual) return 0;
  if (scorePick && scorePick.home === match.homeScore && scorePick.away === match.awayScore) return 3;
  return 1;
}

export function computeStandings(
  matches: Match[],
  members: Member[],
  currentUserId: string,
  livePredictions: Record<string, Outcome>,
  liveScorePicks: Record<string, { home: number; away: number }>
): Member[] {
  const finished = matches.filter((m) => m.homeScore !== null && m.awayScore !== null);

  return members.map((member) => {
    const isCurrentUser = member.id === currentUserId;
    const predictions = isCurrentUser ? livePredictions : member.predictions;
    const scorePicks   = isCurrentUser ? liveScorePicks  : (member.scorePicks ?? {});

    let points = 0, correct = 0, total = 0;

    for (const match of finished) {
      const pred = predictions[match.id];
      if (!pred) continue;
      total++;
      const pts = pointsForPick(match, pred, scorePicks[match.id]);
      if (pts > 0) correct++;
      points += pts;
    }

    return { ...member, points, correct, total };
  });
}
